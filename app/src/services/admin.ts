// Admin configuration
// Add email addresses of users who should have admin privileges
const ADMIN_EMAILS = [
  'rorieokw@gmail.com',
];

// Check if a user email is an admin
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Get admin emails array (for querying)
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}

import { doc, deleteDoc, collection, getDocs, query, orderBy, updateDoc, addDoc, serverTimestamp, onSnapshot, limit as firestoreLimit, where } from 'firebase/firestore';
import { db } from './firebase';
import type { User, Message, Project, Task } from '../types';

// ==================== MESSAGE MANAGEMENT ====================

export async function adminDeleteMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'messages', messageId));
}

export async function adminBulkDeleteMessages(messageIds: string[]): Promise<void> {
  await Promise.all(messageIds.map(id => deleteDoc(doc(db, 'messages', id))));
}

export async function getRecentMessages(limitCount: number = 50): Promise<Message[]> {
  const q = query(
    collection(db, 'messages'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];
}

// ==================== POLL MANAGEMENT ====================

export async function adminDeletePoll(pollId: string): Promise<void> {
  await deleteDoc(doc(db, 'polls', pollId));
}

// ==================== USER MANAGEMENT ====================

export async function getAllUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('displayName'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as User[];
}

export async function adminUpdateUser(userId: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function adminSetUserTitle(userId: string, title: string): Promise<void> {
  await adminUpdateUser(userId, { title });
}

export async function adminSetUserRole(userId: string, role: string): Promise<void> {
  await adminUpdateUser(userId, { title: role }); // Use title field for role display
}

// ==================== PROJECT MANAGEMENT ====================

export async function getAllProjects(): Promise<Project[]> {
  const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Project[];
}

export async function adminDeleteProject(projectId: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', projectId));
}

export async function adminUpdateProject(projectId: string, data: { name?: string; description?: string; hidden?: boolean }): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), data);
}

export async function adminToggleProjectVisibility(projectId: string, hidden: boolean): Promise<void> {
  await updateDoc(doc(db, 'projects', projectId), { hidden });
}

// ==================== TASK MANAGEMENT ====================

export async function getAllTasks(): Promise<Task[]> {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Task[];
}

export async function adminDeleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
}

// ==================== ACTIVITY LOG ====================

export interface ActivityLog {
  id: string;
  type: 'message' | 'task' | 'project' | 'poll' | 'user' | 'login';
  action: string;
  userId: string;
  userName: string;
  adminName: string; // Alias for userName for display
  targetId?: string;
  targetName?: string;
  details?: string;
  createdAt: { toDate: () => Date } | null;
}

export async function logAdminAction(
  action: string,
  adminId: string,
  adminName: string,
  targetId?: string,
  targetName?: string,
  details?: string
): Promise<void> {
  await addDoc(collection(db, 'adminLogs'), {
    action,
    adminId,
    adminName,
    targetId,
    targetName,
    details,
    createdAt: serverTimestamp(),
  });
}

export function subscribeToAdminLogs(
  callback: (logs: ActivityLog[]) => void,
  limitCount: number = 100
) {
  const q = query(
    collection(db, 'adminLogs'),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limitCount)
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as ActivityLog[];
    callback(logs);
  });
}

// ==================== SYSTEM ANNOUNCEMENTS ====================

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  active: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: { toDate: () => Date } | null;
  expiresAt?: { toDate: () => Date } | null;
}

export async function createAnnouncement(
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error',
  createdBy: string,
  createdByName: string,
  expiresAt?: Date
): Promise<string> {
  const docRef = await addDoc(collection(db, 'systemAnnouncements'), {
    title,
    message,
    type,
    active: true,
    createdBy,
    createdByName,
    createdAt: serverTimestamp(),
    expiresAt: expiresAt || null,
  });
  return docRef.id;
}

export async function updateAnnouncement(id: string, updates: Partial<SystemAnnouncement>): Promise<void> {
  await updateDoc(doc(db, 'systemAnnouncements', id), updates);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, 'systemAnnouncements', id));
}

export function subscribeToAnnouncements(callback: (announcements: SystemAnnouncement[]) => void) {
  const q = query(
    collection(db, 'systemAnnouncements'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SystemAnnouncement[];
    callback(announcements);
  });
}

export function subscribeToActiveAnnouncements(callback: (announcements: SystemAnnouncement[]) => void) {
  const q = query(
    collection(db, 'systemAnnouncements'),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const announcements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SystemAnnouncement[];
    callback(announcements);
  });
}

// ==================== STATISTICS ====================

export interface AdminStats {
  totalUsers: number;
  totalMessages: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalPolls: number;
  activePolls: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [users, messages, projects, tasks, polls] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'messages')),
    getDocs(collection(db, 'projects')),
    getDocs(collection(db, 'tasks')),
    getDocs(collection(db, 'polls')),
  ]);

  const tasksData = tasks.docs.map(d => d.data());
  const pollsData = polls.docs.map(d => d.data());

  return {
    totalUsers: users.size,
    totalMessages: messages.size,
    totalProjects: projects.size,
    totalTasks: tasks.size,
    completedTasks: tasksData.filter(t => t.status === 'done').length,
    totalPolls: polls.size,
    activePolls: pollsData.filter(p => !p.closed).length,
  };
}
