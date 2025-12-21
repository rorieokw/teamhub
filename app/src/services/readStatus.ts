import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'readStatus';

interface ReadStatus {
  [channelId: string]: Timestamp;
}

export function subscribeToReadStatus(
  userId: string,
  callback: (status: ReadStatus) => void
): () => void {
  const docRef = doc(db, COLLECTION, userId);

  return onSnapshot(docRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ReadStatus);
    } else {
      callback({});
    }
  });
}

export async function markChannelAsRead(
  userId: string,
  channelId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, userId);

  // Get existing data first
  const snapshot = await getDoc(docRef);
  const existingData = snapshot.exists() ? snapshot.data() : {};

  await setDoc(docRef, {
    ...existingData,
    [channelId]: serverTimestamp(),
  });
}

export function hasUnreadMessages(
  lastReadTime: Timestamp | undefined,
  latestMessageTime: Timestamp | undefined
): boolean {
  if (!latestMessageTime) return false;
  if (!lastReadTime) return true;

  return latestMessageTime.toMillis() > lastReadTime.toMillis();
}
