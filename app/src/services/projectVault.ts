import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PasswordEntry } from '../types';

const COLLECTION = 'projectVault';

// Subscribe to project password entries
export function subscribeToProjectVault(
  projectId: string,
  callback: (entries: PasswordEntry[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const entries: PasswordEntry[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PasswordEntry[];
    callback(entries);
  }, (error) => {
    console.error('Error subscribing to vault:', error);
    callback([]);
  });
}

// Add a new password entry
export async function addPasswordEntry(
  projectId: string,
  title: string,
  username: string,
  password: string,
  addedBy: string,
  addedByName: string,
  url?: string,
  notes?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    title,
    username,
    password,
    addedBy,
    addedByName,
    ...(url && { url }),
    ...(notes && { notes }),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Delete a password entry
export async function deletePasswordEntry(entryId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, entryId));
}
