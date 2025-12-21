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
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Task } from '../types';
import { awardTaskCreated, awardTaskCompleted } from './ranks';

const COLLECTION = 'tasks';

// Subscribe to all tasks for a user (assigned to them)
export function subscribeToUserTasks(
  userId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('assignedTo', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

// Subscribe to all tasks in a project
export function subscribeToProjectTasks(
  projectId: string,
  callback: (tasks: Task[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

// Subscribe to all tasks the user can see (from projects they're a member of)
export function subscribeToAllAccessibleTasks(
  projectIds: string[],
  callback: (tasks: Task[]) => void
): () => void {
  if (projectIds.length === 0) {
    callback([]);
    return () => {};
  }

  // Firestore 'in' queries support up to 30 items
  const q = query(
    collection(db, COLLECTION),
    where('projectId', 'in', projectIds.slice(0, 30)),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    callback(tasks);
  });
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Award points for creating a task
  await awardTaskCreated(data.createdBy);

  return docRef.id;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateTaskStatus(
  id: string,
  status: Task['status'],
  completedByUserId?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);

  // If marking as done, check if it wasn't already done
  if (status === 'done' && completedByUserId) {
    const taskSnap = await getDoc(docRef);
    const taskData = taskSnap.data();

    // Only award points if task wasn't already done
    if (taskData && taskData.status !== 'done') {
      await awardTaskCompleted(completedByUserId);
    }
  }

  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}
