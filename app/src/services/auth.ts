import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { User, ApprovalStatus } from '../types';
import { getAppSettings } from './settings';
import { isAdminEmail } from './admin';

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(user, { displayName });

  // Check if whitelist mode is enabled
  const settings = await getAppSettings();
  const isAdmin = isAdminEmail(email);

  // Determine approval status
  let approvalStatus: ApprovalStatus | undefined;
  if (settings.whitelistEnabled && !isAdmin) {
    approvalStatus = 'pending';
  } else {
    approvalStatus = 'approved';
  }

  await setDoc(doc(db, 'users', user.uid), {
    id: user.uid,
    email: user.email,
    displayName,
    approvalStatus,
    createdAt: serverTimestamp(),
  });

  return user;
}

export async function signIn(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const docRef = doc(db, 'users', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as User;
  }

  return null;
}

export function subscribeToUserProfile(
  userId: string,
  callback: (profile: User | null) => void
): () => void {
  const docRef = doc(db, 'users', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as User);
    } else {
      callback(null);
    }
  });
}
