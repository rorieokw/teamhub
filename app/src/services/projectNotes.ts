import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProjectNote } from '../types';

// Generate document ID for user's project note
function getNoteDocId(userId: string, projectId: string): string {
  return `${userId}_${projectId}`;
}

// Get user's note for a project
export async function getProjectNote(
  userId: string,
  projectId: string
): Promise<ProjectNote | null> {
  const docRef = doc(db, 'projectNotes', getNoteDocId(userId, projectId));
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ProjectNote;
  }

  return null;
}

// Subscribe to project note changes
export function subscribeToProjectNote(
  userId: string,
  projectId: string,
  callback: (note: ProjectNote | null) => void
): () => void {
  const docRef = doc(db, 'projectNotes', getNoteDocId(userId, projectId));

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as ProjectNote);
    } else {
      callback(null);
    }
  });
}

// Save user's note for a project
export async function saveProjectNote(
  userId: string,
  projectId: string,
  content: string
): Promise<void> {
  const docRef = doc(db, 'projectNotes', getNoteDocId(userId, projectId));
  await setDoc(docRef, {
    userId,
    projectId,
    content,
    updatedAt: serverTimestamp(),
  });
}

// Delete user's note for a project
export async function deleteProjectNote(
  userId: string,
  projectId: string
): Promise<void> {
  const docRef = doc(db, 'projectNotes', getNoteDocId(userId, projectId));
  await setDoc(docRef, {
    userId,
    projectId,
    content: '',
    updatedAt: serverTimestamp(),
  });
}
