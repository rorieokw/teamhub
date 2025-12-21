import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PinnedItem, PinnedItemType } from '../types';

const COLLECTION = 'pinnedItems';

// Pin an item
export async function pinItem(
  userId: string,
  itemType: PinnedItemType,
  itemId: string,
  title: string,
  subtitle?: string
): Promise<string> {
  // Check if already pinned
  const existing = await isItemPinned(userId, itemType, itemId);
  if (existing) {
    throw new Error('Item is already pinned');
  }

  const pinnedData: Omit<PinnedItem, 'id'> = {
    userId,
    itemType,
    itemId,
    title,
    pinnedAt: Timestamp.now(),
    ...(subtitle && { subtitle }),
  };

  const docRef = await addDoc(collection(db, COLLECTION), pinnedData);
  return docRef.id;
}

// Unpin an item by pinned item ID
export async function unpinItem(pinnedItemId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, pinnedItemId));
}

// Unpin by item details (when you don't have the pinned item ID)
export async function unpinByItem(
  userId: string,
  itemType: PinnedItemType,
  itemId: string
): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('itemType', '==', itemType),
    where('itemId', '==', itemId)
  );

  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
}

// Toggle pin status
export async function togglePin(
  userId: string,
  itemType: PinnedItemType,
  itemId: string,
  title: string,
  subtitle?: string
): Promise<boolean> {
  const isPinned = await isItemPinned(userId, itemType, itemId);

  if (isPinned) {
    await unpinByItem(userId, itemType, itemId);
    return false;
  } else {
    await pinItem(userId, itemType, itemId, title, subtitle);
    return true;
  }
}

// Subscribe to user's pinned items
export function subscribeToPinnedItems(
  userId: string,
  callback: (items: PinnedItem[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    orderBy('pinnedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PinnedItem[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PinnedItem[];
      callback(items);
    },
    (error) => {
      console.debug('Pinned items subscription error:', error.message);
      callback([]); // Return empty array on error
    }
  );
}

// Check if an item is pinned
export async function isItemPinned(
  userId: string,
  itemType: PinnedItemType,
  itemId: string
): Promise<boolean> {
  const q = query(
    collection(db, COLLECTION),
    where('userId', '==', userId),
    where('itemType', '==', itemType),
    where('itemId', '==', itemId)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

// Get icon for pinned item type
export function getPinnedItemIcon(itemType: PinnedItemType): string {
  switch (itemType) {
    case 'task':
      return '✓';
    case 'message':
      return '💬';
    case 'document':
      return '📄';
    case 'poll':
      return '📊';
    default:
      return '📌';
  }
}

// Get route for pinned item
export function getPinnedItemRoute(item: PinnedItem): string {
  switch (item.itemType) {
    case 'task':
      return `/tasks?highlight=${item.itemId}`;
    case 'message':
      return `/chat?message=${item.itemId}`;
    case 'document':
      return `/documents?highlight=${item.itemId}`;
    case 'poll':
      return `/chat?poll=${item.itemId}`;
    default:
      return '/';
  }
}

// Get color for pinned item type
export function getPinnedItemColor(itemType: PinnedItemType): string {
  switch (itemType) {
    case 'task':
      return 'from-green-500 to-emerald-600';
    case 'message':
      return 'from-blue-500 to-cyan-600';
    case 'document':
      return 'from-orange-500 to-amber-600';
    case 'poll':
      return 'from-purple-500 to-pink-600';
    default:
      return 'from-gray-500 to-gray-600';
  }
}
