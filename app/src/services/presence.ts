import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserPresence } from '../types';

const COLLECTION = 'presence';

// Update user's presence status
export async function updatePresence(
  userId: string,
  online: boolean
): Promise<void> {
  const presenceRef = doc(db, COLLECTION, userId);
  await setDoc(
    presenceRef,
    {
      online,
      lastSeen: serverTimestamp(),
    },
    { merge: true }
  );
}

// Subscribe to a single user's presence
export function subscribeToUserPresence(
  userId: string,
  callback: (presence: UserPresence | null) => void
): () => void {
  const presenceRef = doc(db, COLLECTION, userId);

  return onSnapshot(presenceRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserPresence);
    } else {
      callback(null);
    }
  });
}

// Subscribe to multiple users' presence
export function subscribeToUsersPresence(
  userIds: string[],
  callback: (presence: Record<string, UserPresence>) => void
): () => void {
  if (userIds.length === 0) {
    callback({});
    return () => {};
  }

  // Firestore 'in' queries are limited to 10 items
  // For simplicity, we'll handle up to 10 users (team of 3 should be fine)
  const q = query(
    collection(db, COLLECTION),
    where('__name__', 'in', userIds.slice(0, 10))
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const presence: Record<string, UserPresence> = {};
      snapshot.docs.forEach((doc) => {
        presence[doc.id] = doc.data() as UserPresence;
      });
      callback(presence);
    },
    (error) => {
      // Silently handle permission errors for presence
      console.debug('Presence subscription error:', error.message);
    }
  );
}

// Setup presence tracking for the current user
export function setupPresenceTracking(userId: string): () => void {
  // Mark user as online
  updatePresence(userId, true);

  // Mark user as offline when window closes
  const handleBeforeUnload = () => {
    updatePresence(userId, false);
  };

  // Mark user as offline/online based on visibility
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      updatePresence(userId, true);
    } else {
      // Don't immediately mark as offline when tab is hidden
      // Just update last seen
      updatePresence(userId, true);
    }
  };

  // Heartbeat to keep presence alive (every 60 seconds)
  const heartbeat = setInterval(() => {
    if (document.visibilityState === 'visible') {
      updatePresence(userId, true);
    }
  }, 60000);

  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    updatePresence(userId, false);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(heartbeat);
  };
}

// Check if user is considered online (seen within last 2 minutes)
export function isUserOnline(presence: UserPresence | null): boolean {
  if (!presence) return false;
  if (!presence.online) return false;

  const lastSeen = presence.lastSeen as Timestamp;
  if (!lastSeen) return false;

  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  return lastSeen.toMillis() > twoMinutesAgo;
}
