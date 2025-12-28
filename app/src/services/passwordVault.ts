import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PersonalPassword } from '../types';

const PASSWORDS_COLLECTION = 'personalPasswords';

// Simple encryption using Base64 + character shifting
// Note: For production, use a proper encryption library like crypto-js
function encrypt(text: string): string {
  const shifted = text.split('').map(char =>
    String.fromCharCode(char.charCodeAt(0) + 3)
  ).join('');
  return btoa(shifted);
}

function decrypt(encrypted: string): string {
  try {
    const shifted = atob(encrypted);
    return shifted.split('').map(char =>
      String.fromCharCode(char.charCodeAt(0) - 3)
    ).join('');
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
}

export async function createPassword(
  userId: string,
  data: {
    title: string;
    username: string;
    password: string;
    url?: string;
    notes?: string;
    category?: string;
  }
): Promise<string> {
  const docRef = await addDoc(collection(db, PASSWORDS_COLLECTION), {
    userId,
    title: data.title,
    username: data.username,
    password: encrypt(data.password),
    url: data.url || null,
    notes: data.notes || null,
    category: data.category || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updatePassword(
  passwordId: string,
  data: {
    title?: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
    category?: string;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.password !== undefined) updateData.password = encrypt(data.password);
  if (data.url !== undefined) updateData.url = data.url || null;
  if (data.notes !== undefined) updateData.notes = data.notes || null;
  if (data.category !== undefined) updateData.category = data.category || null;

  await updateDoc(doc(db, PASSWORDS_COLLECTION, passwordId), updateData);
}

export async function deletePassword(passwordId: string): Promise<void> {
  await deleteDoc(doc(db, PASSWORDS_COLLECTION, passwordId));
}

export function subscribeToPasswords(
  userId: string,
  callback: (passwords: PersonalPassword[]) => void
): () => void {
  const q = query(
    collection(db, PASSWORDS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const passwords = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        title: data.title,
        username: data.username,
        password: decrypt(data.password),
        url: data.url || undefined,
        notes: data.notes || undefined,
        category: data.category || undefined,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as PersonalPassword;
    });
    callback(passwords);
  });
}

export async function getPasswords(userId: string): Promise<PersonalPassword[]> {
  const q = query(
    collection(db, PASSWORDS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      title: data.title,
      username: data.username,
      password: decrypt(data.password),
      url: data.url || undefined,
      notes: data.notes || undefined,
      category: data.category || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as PersonalPassword;
  });
}
