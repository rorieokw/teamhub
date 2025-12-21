import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WorkSession } from '../types';

const COLLECTION = 'workSessions';

// How long before a session is considered "idle" (30 minutes)
const IDLE_THRESHOLD_MS = 30 * 60 * 1000;

// How long before a session auto-expires (2 hours)
const EXPIRE_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * Subscribe to active work sessions for a specific project
 */
export function subscribeToProjectSessions(
  projectId: string,
  callback: (sessions: WorkSession[]) => void
): () => void {
  // Simple query on projectId only - filter status client-side to avoid index requirements
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const allSessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkSession[];

      // Filter to active/idle sessions and check expiration client-side
      const now = Date.now();
      const activeSessions = allSessions
        .filter((session) => session.status === 'active' || session.status === 'idle')
        .filter((session) => {
          const lastActive = session.lastActiveAt?.toMillis() || session.startedAt?.toMillis();
          if (!lastActive) return true;
          const elapsed = now - lastActive;

          // Auto-end expired sessions
          if (elapsed > EXPIRE_THRESHOLD_MS) {
            endSession(session.id).catch(console.error);
            return false;
          }

          return true;
        })
        .sort((a, b) => (b.startedAt?.toMillis() || 0) - (a.startedAt?.toMillis() || 0));

      callback(activeSessions);
    },
    (error) => {
      console.error('Error subscribing to project sessions:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to all active work sessions across all projects
 */
export function subscribeToAllActiveSessions(
  callback: (sessions: WorkSession[]) => void
): () => void {
  // Query for sessions that are not ended (active or idle)
  // Using a simple inequality to avoid needing composite indexes
  const q = query(
    collection(db, COLLECTION),
    where('status', '!=', 'ended')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const allSessions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WorkSession[];

      // Filter and check expiration client-side
      const now = Date.now();
      const activeSessions = allSessions
        .filter((session) => session.status === 'active' || session.status === 'idle')
        .filter((session) => {
          const lastActive = session.lastActiveAt?.toMillis() || session.startedAt?.toMillis();
          if (!lastActive) return true;
          const elapsed = now - lastActive;

          if (elapsed > EXPIRE_THRESHOLD_MS) {
            endSession(session.id).catch(console.error);
            return false;
          }

          return true;
        })
        .sort((a, b) => (b.startedAt?.toMillis() || 0) - (a.startedAt?.toMillis() || 0));

      callback(activeSessions);
    },
    (error) => {
      console.error('Error subscribing to sessions:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to a specific user's active session
 */
export function subscribeToUserSession(
  userId: string,
  callback: (session: WorkSession | null) => void
): () => void {
  // Simple query on userId only - filter status client-side
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as WorkSession[];

      // Find active/idle session
      const activeSession = sessions.find(
        (s) => s.status === 'active' || s.status === 'idle'
      );

      callback(activeSession || null);
    },
    (error) => {
      console.error('Error subscribing to user session:', error);
      callback(null);
    }
  );
}

/**
 * Start a new work session
 */
export async function startSession(data: {
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  activity?: string;
}): Promise<string> {
  // Just create the session directly - don't query first to avoid listener conflicts
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'active',
    startedAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update session activity (keeps it "active" and updates lastActiveAt)
 */
export async function updateSessionActivity(
  sessionId: string,
  activity?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, sessionId);
  await updateDoc(docRef, {
    status: 'active',
    lastActiveAt: serverTimestamp(),
    ...(activity !== undefined && { activity }),
  });
}

/**
 * End a work session
 */
export async function endSession(sessionId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, sessionId);
  await updateDoc(docRef, {
    status: 'ended',
    endedAt: serverTimestamp(),
  });
}

/**
 * Delete a session completely
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, sessionId);
  await deleteDoc(docRef);
}

/**
 * Get the session status based on last activity
 */
export function getSessionDisplayStatus(session: WorkSession): 'active' | 'idle' {
  if (!session.lastActiveAt) return 'active';

  const now = Date.now();
  const lastActive = session.lastActiveAt.toMillis();
  const elapsed = now - lastActive;

  return elapsed > IDLE_THRESHOLD_MS ? 'idle' : 'active';
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(startedAt: Timestamp): string {
  const now = Date.now();
  const started = startedAt.toMillis();
  const elapsed = now - started;

  const minutes = Math.floor(elapsed / 60000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}
