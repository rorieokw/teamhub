import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../types';

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, 'displayName' | 'avatarUrl' | 'nameColor'>>
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, data);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const q = query(
    collection(db, 'users'),
    where('email', '==', email.toLowerCase())
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  return {
    id: snapshot.docs[0].id,
    ...snapshot.docs[0].data(),
  } as User;
}

export async function getUserById(userId: string): Promise<User | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as User;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  if (userIds.length === 0) return [];

  const users: User[] = [];

  for (const userId of userIds) {
    const user = await getUserById(userId);
    if (user) {
      users.push(user);
    }
  }

  return users;
}
