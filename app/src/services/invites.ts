import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProjectInvite } from '../types';

const COLLECTION = 'invites';

export function subscribeToUserInvites(
  email: string,
  callback: (invites: ProjectInvite[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('invitedEmail', '==', email.toLowerCase()),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (snapshot) => {
    const invites: ProjectInvite[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProjectInvite[];
    callback(invites);
  });
}

export async function createInvite(data: {
  projectId: string;
  projectName: string;
  invitedEmail: string;
  invitedBy: string;
  invitedByName: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    invitedEmail: data.invitedEmail.toLowerCase(),
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function acceptInvite(
  inviteId: string,
  projectId: string,
  userId: string
): Promise<void> {
  // Update invite status
  const inviteRef = doc(db, COLLECTION, inviteId);
  await updateDoc(inviteRef, { status: 'accepted' });

  // Add user to project members
  const projectRef = doc(db, 'projects', projectId);
  await updateDoc(projectRef, {
    members: arrayUnion(userId),
  });
}

export async function declineInvite(inviteId: string): Promise<void> {
  const inviteRef = doc(db, COLLECTION, inviteId);
  await updateDoc(inviteRef, { status: 'declined' });
}
