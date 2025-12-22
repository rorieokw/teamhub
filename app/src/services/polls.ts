import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Poll, PollOption } from '../types';

const COLLECTION = 'polls';

// Generate a unique ID for poll options
function generateOptionId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Parse /poll command from chat message
// Format: /poll "Question?" "Option 1" "Option 2" "Option 3"
export function parsePollCommand(content: string): { question: string; options: string[] } | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith('/poll ')) return null;

  const pollContent = trimmed.substring(6).trim();
  const regex = /"([^"]+)"/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(pollContent)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length < 3) {
    // Need at least a question and 2 options
    return null;
  }

  return {
    question: matches[0],
    options: matches.slice(1),
  };
}

// Create a new poll
export async function createPoll(
  channelId: string,
  question: string,
  optionTexts: string[],
  createdBy: string,
  createdByName: string,
  projectId?: string,
  allowMultiple: boolean = false,
  expiresAt?: Date
): Promise<string> {
  const options: PollOption[] = optionTexts.map((text) => ({
    id: generateOptionId(),
    text,
    votes: [],
  }));

  const pollData: Omit<Poll, 'id'> = {
    channelId,
    question,
    options,
    createdBy,
    createdByName,
    closed: false,
    allowMultiple,
    createdAt: Timestamp.now(),
    ...(projectId && { projectId }),
    ...(expiresAt && { expiresAt: Timestamp.fromDate(expiresAt) }),
  };

  const docRef = await addDoc(collection(db, COLLECTION), pollData);
  return docRef.id;
}

// Subscribe to all active polls (for dashboard)
export function subscribeToActivePolls(
  callback: (polls: Poll[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('closed', '==', false),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const polls: Poll[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      callback(polls);
    },
    (error) => {
      console.debug('Polls subscription error:', error.message);
      callback([]); // Return empty array on error
    }
  );
}

// Subscribe to polls in a specific channel
export function subscribeToChannelPolls(
  channelId: string,
  callback: (polls: Poll[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('channelId', '==', channelId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const polls: Poll[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Poll[];
      callback(polls);
    },
    (error) => {
      console.error('Channel polls subscription error:', error.message);
      // If there's an index error, try without ordering
      if (error.message.includes('index')) {
        console.log('Falling back to unordered query...');
        const fallbackQuery = query(
          collection(db, COLLECTION),
          where('channelId', '==', channelId)
        );
        onSnapshot(fallbackQuery, (snapshot) => {
          const polls: Poll[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Poll[];
          // Sort manually
          polls.sort((a, b) => {
            const aTime = a.createdAt?.toMillis() || 0;
            const bTime = b.createdAt?.toMillis() || 0;
            return bTime - aTime;
          });
          callback(polls);
        });
      } else {
        callback([]);
      }
    }
  );
}

// Vote on a poll option
export async function votePoll(
  pollId: string,
  optionId: string,
  userId: string,
  poll: Poll
): Promise<void> {
  const pollRef = doc(db, COLLECTION, pollId);

  // Create a deep copy of options to modify
  const options = Array.isArray(poll.options) ? poll.options.map(opt => ({
    ...opt,
    votes: Array.isArray(opt.votes) ? [...opt.votes] : []
  })) : [];

  // Find the option index
  const optionIndex = options.findIndex((opt) => opt.id === optionId);
  if (optionIndex === -1) return;

  // If not allowing multiple votes, remove from other options first
  if (!poll.allowMultiple) {
    options.forEach((opt) => {
      const voteIndex = opt.votes.indexOf(userId);
      if (voteIndex !== -1) {
        opt.votes.splice(voteIndex, 1);
      }
    });
  }

  // Add vote to selected option if not already voted
  if (!options[optionIndex].votes.includes(userId)) {
    options[optionIndex].votes.push(userId);
  }

  // Update the entire options array
  await updateDoc(pollRef, { options });
}

// Remove vote from a poll option
export async function unvotePoll(
  pollId: string,
  optionId: string,
  userId: string,
  poll: Poll
): Promise<void> {
  const pollRef = doc(db, COLLECTION, pollId);

  // Create a deep copy of options to modify
  const options = Array.isArray(poll.options) ? poll.options.map(opt => ({
    ...opt,
    votes: Array.isArray(opt.votes) ? [...opt.votes] : []
  })) : [];

  const optionIndex = options.findIndex((opt) => opt.id === optionId);
  if (optionIndex === -1) return;

  // Remove vote from the option
  const voteIndex = options[optionIndex].votes.indexOf(userId);
  if (voteIndex !== -1) {
    options[optionIndex].votes.splice(voteIndex, 1);
  }

  // Update the entire options array
  await updateDoc(pollRef, { options });
}

// Toggle vote (vote if not voted, unvote if already voted)
export async function toggleVote(
  pollId: string,
  optionId: string,
  userId: string,
  poll: Poll
): Promise<void> {
  const options = Array.isArray(poll.options) ? poll.options : [];
  const option = options.find((opt) => opt.id === optionId);
  if (!option) return;

  const votes = Array.isArray(option.votes) ? option.votes : [];
  const hasVoted = votes.includes(userId);
  if (hasVoted) {
    await unvotePoll(pollId, optionId, userId, poll);
  } else {
    await votePoll(pollId, optionId, userId, poll);
  }
}

// Close a poll
export async function closePoll(pollId: string): Promise<void> {
  const pollRef = doc(db, COLLECTION, pollId);
  await updateDoc(pollRef, { closed: true });
}

// Close a poll and notify all voters
export async function closePollWithNotifications(
  poll: Poll,
  closedByName: string,
  notifyCallback: (voterId: string, question: string, closedByName: string, channelId: string, pollId: string) => Promise<void>
): Promise<void> {
  // Close the poll
  await closePoll(poll.id);

  // Get all unique voters
  const voters = new Set<string>();
  const options = Array.isArray(poll.options) ? poll.options : [];
  options.forEach((opt) => {
    const votes = Array.isArray(opt.votes) ? opt.votes : [];
    votes.forEach((userId) => voters.add(userId));
  });

  // Notify each voter (except the one who closed it)
  for (const voterId of voters) {
    try {
      await notifyCallback(voterId, poll.question, closedByName, poll.channelId, poll.id);
    } catch (err) {
      console.error('Failed to notify voter:', err);
    }
  }
}

// Reopen a poll
export async function reopenPoll(pollId: string): Promise<void> {
  const pollRef = doc(db, COLLECTION, pollId);
  await updateDoc(pollRef, { closed: false });
}

// Delete a poll
export async function deletePoll(pollId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, pollId));
}

// Ensure options is always an array
function ensureOptionsArray(poll: Poll): PollOption[] {
  if (!poll.options) return [];
  if (!Array.isArray(poll.options)) return [];
  return poll.options;
}

// Get total votes for a poll
export function getTotalVotes(poll: Poll): number {
  const options = ensureOptionsArray(poll);
  const voters = new Set<string>();
  options.forEach((opt) => {
    const votes = Array.isArray(opt.votes) ? opt.votes : [];
    votes.forEach((userId) => voters.add(userId));
  });
  return voters.size;
}

// Check if user has voted on a poll
export function hasUserVoted(poll: Poll, userId: string): boolean {
  const options = ensureOptionsArray(poll);
  return options.some((opt) => {
    const votes = Array.isArray(opt.votes) ? opt.votes : [];
    return votes.includes(userId);
  });
}

// Get percentage for an option
export function getOptionPercentage(poll: Poll, optionId: string): number {
  const options = ensureOptionsArray(poll);
  const totalVotes = options.reduce((sum, opt) => {
    const votes = Array.isArray(opt.votes) ? opt.votes : [];
    return sum + votes.length;
  }, 0);
  if (totalVotes === 0) return 0;

  const option = options.find((opt) => opt.id === optionId);
  if (!option) return 0;

  const optionVotes = Array.isArray(option.votes) ? option.votes : [];
  return Math.round((optionVotes.length / totalVotes) * 100);
}
