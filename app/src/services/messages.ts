import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './firebase';
import type { MessageWithReactions } from '../types';
import { awardMessageSent } from './ranks';

const COLLECTION = 'messages';

export function subscribeToMessages(
  channelId: string,
  callback: (messages: MessageWithReactions[]) => void,
  messageLimit: number = 100
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'asc'),
    limit(messageLimit)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: MessageWithReactions[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MessageWithReactions[];
    callback(messages);
  });
}

export async function sendMessage(
  channelId: string,
  content: string,
  senderId: string,
  mentions?: string[],
  images?: string[]
): Promise<string> {
  const messageData: Record<string, unknown> = {
    channelId,
    content,
    senderId,
    mentions: mentions || [],
    reactions: {},
    createdAt: Timestamp.now(),
  };

  // Add images if provided
  if (images && images.length > 0) {
    messageData.images = images;
  }

  const docRef = await addDoc(collection(db, COLLECTION), messageData);

  // Award points for sending a message
  await awardMessageSent(senderId);

  return docRef.id;
}

// Edit a message
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<void> {
  const messageRef = doc(db, COLLECTION, messageId);
  await updateDoc(messageRef, {
    content: newContent,
    editedAt: Timestamp.now(),
  });
}

// Delete a message
export async function deleteMessage(messageId: string): Promise<void> {
  const messageRef = doc(db, COLLECTION, messageId);
  await deleteDoc(messageRef);
}

// Add or remove a reaction from a message
export async function toggleReaction(
  messageId: string,
  emoji: string,
  userId: string,
  hasReacted: boolean
): Promise<void> {
  const messageRef = doc(db, COLLECTION, messageId);

  if (hasReacted) {
    // Remove reaction
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayRemove(userId),
    });
  } else {
    // Add reaction
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayUnion(userId),
    });
  }
}

// Parse mentions from message content
export function parseMentions(content: string, users: { id: string; displayName: string }[]): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const mentionName = match[1].toLowerCase();
    const user = users.find(
      (u) => u.displayName.toLowerCase().replace(/\s+/g, '') === mentionName ||
             u.displayName.toLowerCase().startsWith(mentionName)
    );
    if (user && !mentions.includes(user.id)) {
      mentions.push(user.id);
    }
  }

  return mentions;
}

// Channel helpers
export function getGeneralChannelId(): string {
  return 'general';
}

export function getProjectChannelId(projectId: string): string {
  return `project-${projectId}`;
}

// DM channel helpers - creates a consistent channel ID for two users
export function getDMChannelId(userId1: string, userId2: string): string {
  // Sort IDs to ensure same channel regardless of who initiates
  const sortedIds = [userId1, userId2].sort();
  return `dm-${sortedIds[0]}-${sortedIds[1]}`;
}

// Check if a channel is a DM
export function isDMChannel(channelId: string): boolean {
  return channelId.startsWith('dm-');
}

// Get the other user's ID from a DM channel
export function getOtherUserFromDM(channelId: string, currentUserId: string): string | null {
  if (!isDMChannel(channelId)) return null;

  const parts = channelId.replace('dm-', '').split('-');
  if (parts.length !== 2) return null;

  return parts[0] === currentUserId ? parts[1] : parts[0];
}

// Subscribe to latest message time for a channel (for unread indicators)
export function subscribeToLatestMessageTime(
  channelId: string,
  callback: (timestamp: Timestamp | null) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc'),
    limit(1)
  );

  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const data = snapshot.docs[0].data();
      callback(data.createdAt as Timestamp);
    }
  });
}
