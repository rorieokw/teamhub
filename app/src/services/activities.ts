import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Activity } from '../types';

const COLLECTION = 'activities';

export function subscribeToActivities(
  callback: (activities: Activity[]) => void,
  activityLimit: number = 50
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(activityLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const activities: Activity[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Activity[];
    callback(activities);
  });
}

export function subscribeToProjectActivities(
  projectId: string,
  callback: (activities: Activity[]) => void,
  activityLimit: number = 20
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc'),
    limit(activityLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const activities: Activity[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Activity[];
    callback(activities);
  });
}

export async function logActivity(data: {
  type: Activity['type'];
  userId: string;
  userName: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  description: string;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Helper functions for common activities
export async function logTaskCreated(
  userId: string,
  userName: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  taskId: string
): Promise<void> {
  await logActivity({
    type: 'task-created',
    userId,
    userName,
    projectId,
    projectName,
    taskId,
    taskTitle,
    description: `${userName} created task "${taskTitle}" in ${projectName}`,
  });
}

export async function logTaskCompleted(
  userId: string,
  userName: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  taskId: string
): Promise<void> {
  await logActivity({
    type: 'task-completed',
    userId,
    userName,
    projectId,
    projectName,
    taskId,
    taskTitle,
    description: `${userName} completed "${taskTitle}" in ${projectName}`,
  });
}

export async function logProjectCreated(
  userId: string,
  userName: string,
  projectId: string,
  projectName: string
): Promise<void> {
  await logActivity({
    type: 'project-created',
    userId,
    userName,
    projectId,
    projectName,
    description: `${userName} created project "${projectName}"`,
  });
}

export async function logMemberJoined(
  userId: string,
  userName: string,
  projectId: string,
  projectName: string
): Promise<void> {
  await logActivity({
    type: 'member-joined',
    userId,
    userName,
    projectId,
    projectName,
    description: `${userName} joined ${projectName}`,
  });
}

export async function logCommentAdded(
  userId: string,
  userName: string,
  taskTitle: string,
  projectId: string,
  projectName: string,
  taskId: string
): Promise<void> {
  await logActivity({
    type: 'comment-added',
    userId,
    userName,
    projectId,
    projectName,
    taskId,
    taskTitle,
    description: `${userName} commented on "${taskTitle}"`,
  });
}
