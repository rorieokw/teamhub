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
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Milestone } from '../types';
import { awardMilestoneCompleted } from './ranks';

const COLLECTION = 'milestones';

export function subscribeToMilestones(
  projectId: string,
  callback: (milestones: Milestone[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('order', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const milestones: Milestone[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Milestone[];
    callback(milestones);
  });
}

export async function createMilestone(
  projectId: string,
  title: string,
  order: number
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    title,
    completed: false,
    order,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function toggleMilestone(
  id: string,
  completed: boolean,
  userId?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, { completed });

  // Award points for completing a milestone
  if (completed && userId) {
    await awardMilestoneCompleted(userId);
  }
}

export async function updateMilestoneTitle(
  id: string,
  title: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, { title });
}

export async function deleteMilestone(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export async function deleteAllProjectMilestones(projectId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId)
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      unsubscribe();
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      try {
        await batch.commit();
        resolve();
      } catch (err) {
        reject(err);
      }
    }, reject);
  });
}

export function calculateProgress(milestones: Milestone[]): number {
  if (milestones.length === 0) return 0;
  const completed = milestones.filter((m) => m.completed).length;
  return Math.round((completed / milestones.length) * 100);
}
