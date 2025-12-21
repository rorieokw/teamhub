import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Announcement, AnnouncementPriority } from '../types';

const COLLECTION = 'announcements';

// Create a new announcement
export async function createAnnouncement(
  title: string,
  content: string,
  createdBy: string,
  createdByName: string,
  options?: {
    priority?: AnnouncementPriority;
    pinned?: boolean;
    projectId?: string;
    expiresAt?: Date;
  }
): Promise<string> {
  const announcementData: Omit<Announcement, 'id'> = {
    title,
    content,
    priority: options?.priority ?? 'normal',
    pinned: options?.pinned ?? false,
    createdBy,
    createdByName,
    dismissedBy: [],
    createdAt: Timestamp.now(),
    ...(options?.projectId && { projectId: options.projectId }),
    ...(options?.expiresAt && { expiresAt: Timestamp.fromDate(options.expiresAt) }),
  };

  const docRef = await addDoc(collection(db, COLLECTION), announcementData);
  return docRef.id;
}

// Subscribe to active announcements for a user
export function subscribeToAnnouncements(
  userId: string,
  callback: (announcements: Announcement[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Timestamp.now();
      const announcements: Announcement[] = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((ann) => {
          const announcement = ann as Announcement;
          // Filter out expired announcements
          if (announcement.expiresAt && announcement.expiresAt.toMillis() < now.toMillis()) {
            return false;
          }
          // Filter out dismissed announcements (unless pinned)
          if (!announcement.pinned && announcement.dismissedBy?.includes(userId)) {
            return false;
          }
          return true;
        }) as Announcement[];

      // Sort: pinned first, then by priority, then by date
      announcements.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        const priorityOrder = { urgent: 0, important: 1, normal: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      callback(announcements);
    },
    (error) => {
      console.debug('Announcements subscription error:', error.message);
      callback([]); // Return empty array on error
    }
  );
}

// Dismiss an announcement for a user
export async function dismissAnnouncement(
  announcementId: string,
  userId: string
): Promise<void> {
  const announcementRef = doc(db, COLLECTION, announcementId);
  await updateDoc(announcementRef, {
    dismissedBy: arrayUnion(userId),
  });
}

// Update announcement
export async function updateAnnouncement(
  announcementId: string,
  updates: Partial<Pick<Announcement, 'title' | 'content' | 'priority' | 'pinned' | 'expiresAt'>>
): Promise<void> {
  const announcementRef = doc(db, COLLECTION, announcementId);
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.expiresAt instanceof Date) {
    updateData.expiresAt = Timestamp.fromDate(updates.expiresAt);
  }

  await updateDoc(announcementRef, updateData);
}

// Toggle pin status
export async function toggleAnnouncementPin(
  announcementId: string,
  pinned: boolean
): Promise<void> {
  const announcementRef = doc(db, COLLECTION, announcementId);
  await updateDoc(announcementRef, { pinned });
}

// Delete an announcement
export async function deleteAnnouncement(announcementId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, announcementId));
}

// Get priority badge color
export function getPriorityColor(priority: AnnouncementPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'important':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'normal':
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}

// Get priority icon
export function getPriorityIcon(priority: AnnouncementPriority): string {
  switch (priority) {
    case 'urgent':
      return '🚨';
    case 'important':
      return '⚠️';
    case 'normal':
    default:
      return '📢';
  }
}

// Format relative time for announcements
export function formatAnnouncementTime(timestamp: Timestamp): string {
  const now = Date.now();
  const time = timestamp.toMillis();
  const diff = now - time;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
