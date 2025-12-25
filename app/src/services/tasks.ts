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

// Subscribe to tasks assigned to a specific user
// Fetches from projects and filters client-side to handle both array and string assignedTo
export function subscribeToMyTasks(
  userId: string,
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
    const allTasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];

    // Filter to only tasks where user is assigned (handles both string and array)
    const myTasks = allTasks.filter(task => {
      const assignees = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : [task.assignedTo].filter(Boolean);
      return assignees.includes(userId);
    });

    callback(myTasks);
  }, (error) => {
    console.error('Error fetching tasks:', error);
    callback([]);
  });
}

// Subscribe to tasks created by the user and assigned to others (for tracking)
export function subscribeToAssignedByMe(
  userId: string,
  projectIds: string[],
  callback: (tasks: Task[]) => void
): () => void {
  if (projectIds.length === 0) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTION),
    where('projectId', 'in', projectIds.slice(0, 30)),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const allTasks: Task[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];

    // Filter to tasks created by user and assigned to at least one OTHER person
    const assignedByMe = allTasks.filter(task => {
      if (task.createdBy !== userId) return false;

      const assignees = Array.isArray(task.assignedTo)
        ? task.assignedTo
        : [task.assignedTo].filter(Boolean);

      // Check if at least one assignee is NOT the current user
      return assignees.some(id => id !== userId);
    });

    callback(assignedByMe);
  }, (error) => {
    console.error('Error fetching assigned tasks:', error);
    callback([]);
  });
}

// Remove a user from a task's assignees (or delete if last assignee)
export async function removeUserFromTask(
  taskId: string,
  userId: string
): Promise<'removed' | 'deleted'> {
  const docRef = doc(db, COLLECTION, taskId);
  const taskSnap = await getDoc(docRef);

  if (!taskSnap.exists()) {
    throw new Error('Task not found');
  }

  const taskData = taskSnap.data();
  const assignedTo: string[] = Array.isArray(taskData.assignedTo)
    ? taskData.assignedTo
    : [taskData.assignedTo].filter(Boolean);

  // If only one person assigned, delete the task entirely
  if (assignedTo.length <= 1) {
    await deleteDoc(docRef);
    return 'deleted';
  }

  // Otherwise, remove this user from assignees
  const newAssignees = assignedTo.filter(id => id !== userId);
  await updateDoc(docRef, {
    assignedTo: newAssignees,
    updatedAt: serverTimestamp(),
  });

  return 'removed';
}

export async function createTask(
  data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  // Filter out undefined values - Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Award points for creating a task (non-blocking - don't fail task creation if this fails)
  try {
    await awardTaskCreated(data.createdBy);
  } catch (err) {
    console.error('Failed to award points for task creation:', err);
  }

  return docRef.id;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'createdAt'>>
): Promise<void> {
  // Filter out undefined values - Firestore doesn't accept them
  const cleanData = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  );

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...cleanData,
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
