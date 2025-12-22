import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Notification } from '../types';

const COLLECTION = 'notifications';

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Notification[];
    callback(notifications);
  });
}

export async function createNotification(data: {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, unknown>;
}): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function markAsRead(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, { read: true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      unsubscribe();
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { read: true });
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

// Helper to create task assignment notification
export async function notifyTaskAssigned(
  assignedToUserId: string,
  taskTitle: string,
  projectName: string,
  assignedByName: string,
  taskId: string,
  projectId: string
): Promise<void> {
  await createNotification({
    userId: assignedToUserId,
    type: 'task-assigned',
    title: 'New Task Assigned',
    message: `${assignedByName} assigned you "${taskTitle}" in ${projectName}`,
    data: { taskId, projectId },
  });
}

// Helper to create mention notification
export async function notifyMention(
  mentionedUserId: string,
  mentionedByName: string,
  channelName: string,
  messagePreview: string,
  channelId: string
): Promise<void> {
  await createNotification({
    userId: mentionedUserId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mentionedByName} mentioned you in #${channelName}: "${messagePreview.slice(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
    data: { channelId },
  });
}

// Helper to create comment notification
export async function notifyComment(
  taskOwnerId: string,
  commenterName: string,
  taskTitle: string,
  commentPreview: string,
  taskId: string,
  projectId: string
): Promise<void> {
  await createNotification({
    userId: taskOwnerId,
    type: 'comment',
    title: 'New Comment',
    message: `${commenterName} commented on "${taskTitle}": "${commentPreview.slice(0, 40)}${commentPreview.length > 40 ? '...' : ''}"`,
    data: { taskId, projectId },
  });
}

// Helper to create direct message notification
export async function notifyDirectMessage(
  recipientUserId: string,
  senderName: string,
  messagePreview: string,
  channelId: string
): Promise<void> {
  await createNotification({
    userId: recipientUserId,
    type: 'direct-message',
    title: 'New Direct Message',
    message: `${senderName}: "${messagePreview.slice(0, 50)}${messagePreview.length > 50 ? '...' : ''}"`,
    data: { channelId, senderName },
  });
}

// Helper to create reaction notification
export async function notifyReaction(
  messageOwnerId: string,
  reactorName: string,
  emoji: string,
  messagePreview: string,
  channelId: string
): Promise<void> {
  await createNotification({
    userId: messageOwnerId,
    type: 'reaction',
    title: 'Reaction to your message',
    message: `${reactorName} reacted ${emoji} to "${messagePreview.slice(0, 40)}${messagePreview.length > 40 ? '...' : ''}"`,
    data: { channelId },
  });
}

// Helper to create poll closed notification
export async function notifyPollClosed(
  voterUserId: string,
  pollQuestion: string,
  closedByName: string,
  channelId: string,
  pollId: string
): Promise<void> {
  await createNotification({
    userId: voterUserId,
    type: 'poll-closed',
    title: 'Poll Closed',
    message: `${closedByName} closed the poll: "${pollQuestion.slice(0, 40)}${pollQuestion.length > 40 ? '...' : ''}"`,
    data: { channelId, pollId },
  });
}

// Helper to create project completion notification
export async function notifyProjectCompleted(
  memberIds: string[],
  projectName: string,
  completedByName: string,
  projectId: string
): Promise<void> {
  for (const memberId of memberIds) {
    await createNotification({
      userId: memberId,
      type: 'project-update',
      title: 'Project Completed!',
      message: `${completedByName} marked "${projectName}" as completed`,
      data: { projectId },
    });
  }
}

// Helper to create task reassignment notification
export async function notifyTaskReassigned(
  newAssigneeId: string,
  taskTitle: string,
  projectName: string,
  reassignedByName: string,
  taskId: string,
  projectId: string
): Promise<void> {
  await createNotification({
    userId: newAssigneeId,
    type: 'task-assigned',
    title: 'Task Reassigned to You',
    message: `${reassignedByName} assigned you "${taskTitle}" in ${projectName}`,
    data: { taskId, projectId },
  });
}

// Notify admin when a new user signs up
export async function notifyAdminNewUserSignup(
  adminUserId: string,
  newUserName: string,
  newUserEmail: string,
  newUserId: string
): Promise<void> {
  await createNotification({
    userId: adminUserId,
    type: 'new-user-signup',
    title: 'New User Signup',
    message: `${newUserName} (${newUserEmail}) just signed up and is waiting for approval`,
    data: { newUserId, newUserEmail },
  });
}
