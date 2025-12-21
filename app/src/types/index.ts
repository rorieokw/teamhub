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

export interface Activity {
  id: string;
  type: 'task-created' | 'task-completed' | 'task-updated' | 'project-created' | 'project-updated' | 'member-joined' | 'comment-added' | 'message-sent';
  userId: string;
  userName: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
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
} as const;
