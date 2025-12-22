import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { User, NameHistoryEntry, ApprovalStatus } from '../types';

// Subscribe to all users (for showing member avatars, etc.)
export function subscribeToAllUsers(
  callback: (users: User[]) => void
): () => void {
  const q = query(collection(db, 'users'), orderBy('displayName'));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, 'avatarUrl' | 'nameColor' | 'title' | 'quickActions'>>
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, data);
}

// Update user's quick actions
export async function updateQuickActions(
  userId: string,
  quickActions: string[]
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { quickActions });
}

// Change display name and track history
export async function changeDisplayName(
  userId: string,
  currentName: string,
  newName: string
): Promise<void> {
  const docRef = doc(db, 'users', userId);

  // Add current name to history before changing
  const historyEntry: NameHistoryEntry = {
    name: currentName,
    changedAt: Timestamp.now(),
  };

  await updateDoc(docRef, {
    displayName: newName,
    nameHistory: arrayUnion(historyEntry),
  });
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

// Subscribe to real-time updates for multiple users
export function subscribeToUsers(
  userIds: string[],
  callback: (users: Map<string, User>) => void
): () => void {
  if (userIds.length === 0) {
    callback(new Map());
    return () => {};
  }

  const usersMap = new Map<string, User>();
  const unsubscribes: (() => void)[] = [];

  userIds.forEach((userId) => {
    const docRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        usersMap.set(userId, {
          id: docSnap.id,
          ...docSnap.data(),
        } as User);
      } else {
        usersMap.delete(userId);
      }
      callback(new Map(usersMap));
    });
    unsubscribes.push(unsubscribe);
  });

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

// ==================== USER APPROVAL (Whitelist) ====================

// Update user approval status (admin only)
export async function updateUserApprovalStatus(
  userId: string,
  status: ApprovalStatus
): Promise<void> {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, { approvalStatus: status });
}

// Subscribe to pending users (for admin panel)
export function subscribeToPendingUsers(
  callback: (users: User[]) => void
): () => void {
  const q = query(
    collection(db, 'users'),
    where('approvalStatus', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const users: User[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    callback(users);
  });
}
