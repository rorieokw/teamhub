import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  nameColor?: string;
  createdAt: Timestamp;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed';
  progress: number;
  members: string[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  order: number;
  createdAt: Timestamp;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  projectName: string;
  invitedEmail: string;
  invitedBy: string;
  invitedByName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  dueDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  channelId: string;
  content: string;
  senderId: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task-assigned' | 'project-update' | 'mention';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface Document {
  id: string;
  projectId: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  storagePath: string;
  isLink?: boolean;
  createdAt: Timestamp;
}

export type ActivityType =
  | 'task-created'
  | 'task-completed'
  | 'task-updated'
  | 'project-created'
  | 'project-updated'
  | 'member-joined'
  | 'comment-added'
  | 'message-sent'
  | 'poll-created'
  | 'poll-voted'
  | 'poll-closed'
  | 'announcement-posted'
  | 'event-created';

export interface Activity {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  pollId?: string;
  pollQuestion?: string;
  announcementId?: string;
  eventId?: string;
  description: string;
  createdAt: Timestamp;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: Timestamp;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface UserPresence {
  online: boolean;
  lastSeen: Timestamp;
}

// Extended Message with reactions
export interface MessageWithReactions extends Message {
  reactions?: Record<string, string[]>; // emoji -> userIds
}

// League of Legends style ranking system
export type RankTier =
  | 'iron'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'emerald'
  | 'diamond'
  | 'master'
  | 'grandmaster'
  | 'challenger';

export type RankDivision = 'IV' | 'III' | 'II' | 'I';

export interface UserRank {
  tier: RankTier;
  division?: RankDivision; // Only for Iron-Diamond
  points: number; // Total points earned
  lp: number; // Points within current rank (0-100)
}

export interface UserStats {
  tasksCompleted: number;
  tasksCreated: number;
  projectsCreated: number;
  messagesCount: number;
  commentsCount: number;
  milestonesCompleted: number;
  totalPoints: number;
  rank: UserRank;
}

// Points earned for different actions
export const RANK_POINTS = {
  TASK_COMPLETED: 25,
  TASK_CREATED: 5,
  PROJECT_CREATED: 50,
  MESSAGE_SENT: 1,
  COMMENT_ADDED: 3,
  MILESTONE_COMPLETED: 15,
  POLL_CREATED: 10,
  POLL_VOTED: 2,
} as const;

// ============================================
// POLLS
// ============================================

export interface PollOption {
  id: string;
  text: string;
  votes: string[]; // Array of user IDs who voted for this option
}

export interface Poll {
  id: string;
  channelId: string;
  projectId?: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdByName: string;
  closed: boolean;
  allowMultiple: boolean;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// CALENDAR EVENTS
// ============================================

export interface TeamEvent {
  id: string;
  title: string;
  description?: string;
  date: Timestamp;
  endDate?: Timestamp;
  allDay: boolean;
  projectId?: string;
  taskId?: string;
  color?: string;
  createdBy: string;
  createdByName: string;
  attendees?: string[];
  createdAt: Timestamp;
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  pinned: boolean;
  projectId?: string;
  createdBy: string;
  createdByName: string;
  dismissedBy: string[];
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

// ============================================
// PINNED ITEMS
// ============================================

export type PinnedItemType = 'task' | 'message' | 'document' | 'poll';

export interface PinnedItem {
  id: string;
  userId: string;
  itemType: PinnedItemType;
  itemId: string;
  title: string;
  subtitle?: string;
  pinnedAt: Timestamp;
}

// ============================================
// USER PRESENCE (Extended)
// ============================================

export type UserStatus = 'online' | 'busy' | 'away' | 'offline';

export interface UserPresenceExtended extends UserPresence {
  status: UserStatus;
  statusMessage?: string;
}
