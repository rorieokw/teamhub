import { Timestamp } from 'firebase/firestore';

export interface NameHistoryEntry {
  name: string;
  changedAt: Timestamp;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Token stats for casino games
export interface TokenStats {
  totalWagered: number;    // Sum of all bets placed
  totalWon: number;        // Sum of all winnings
  totalLost: number;       // Sum of all losses
  gamesPlayed: number;     // Completed game rounds
  lastDailyReset?: Timestamp; // For "broke" reset feature
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  title?: string;
  avatarUrl?: string;
  nameColor?: string;
  titleColor?: string;
  nameHistory?: NameHistoryEntry[];
  reputation?: number; // 0-100, starts at 100
  quickActions?: string[]; // User's customized quick action IDs
  approvalStatus?: ApprovalStatus; // For whitelist mode
  bannerId?: string; // Currently selected profile banner
  unlockedBanners?: string[]; // Persisted unlocked banner IDs
  // Casino tokens
  tokens?: number; // Current balance (default: 50000)
  tokenStats?: TokenStats; // Lifetime game statistics
  createdAt: Timestamp;
}

// App-wide settings (admin controlled)
export interface AppSettings {
  whitelistEnabled: boolean;
  gamesEnabled: boolean;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed';
  progress: number;
  members: string[];
  createdBy: string;
  deadline?: Timestamp;
  githubUrl?: string;
  hidden?: boolean; // Admin only - hides project from non-admin users
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description?: string;
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
  assignedTo: string[]; // Array of user IDs assigned to this task
  dueDate?: Timestamp;
  blockedBy?: string[]; // Array of task IDs that block this task
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
  editedAt?: Timestamp;
  images?: string[]; // Array of image URLs
}

export interface Notification {
  id: string;
  userId: string;
  type: 'task-assigned' | 'project-update' | 'mention' | 'new-user-signup' | 'direct-message' | 'reaction' | 'poll-closed' | 'comment' | 'chess-challenge' | 'coinflip-challenge';
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

// Admin activity log
export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
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

// ============================================
// WORK SESSIONS (Live Coding Indicator)
// ============================================

export type SessionStatus = 'active' | 'idle' | 'ended';

export interface WorkSession {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  activity?: string; // "Fixing auth bug", "Working on UI", etc.
  status: SessionStatus;
  startedAt: Timestamp;
  lastActiveAt: Timestamp;
  endedAt?: Timestamp;
}

// ============================================
// TASK BLOCKERS
// ============================================

export interface TaskBlocker {
  taskId: string;
  taskTitle: string;
  assignedTo: string;
  assignedToName?: string;
  status: 'todo' | 'in-progress' | 'done';
}

// ============================================
// STICKY NOTES
// ============================================

export type StickyNoteColor = 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

export interface StickyNote {
  id: string;
  userId: string;
  content: string;
  color: StickyNoteColor;
  position: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================
// DASHBOARD LAYOUT (Widget Customization)
// ============================================

export type WidgetId =
  | 'sticky-notes'
  | 'unread-messages'
  | 'due-soon'
  | 'team-availability'
  | 'pinned-items'
  | 'activity-feed'
  | 'quick-stats'
  | 'calendar'
  | 'polls'
  | 'task-chart'
  | 'project-chart'
  | 'my-tasks'
  | 'recent-projects'
  | 'chess'
  | 'coinflip';

export type WidgetColumn = 'left' | 'right';

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  position: number;
  column: WidgetColumn;
}

export interface DashboardLayout {
  userId: string;
  widgets: WidgetConfig[];
  updatedAt: Timestamp;
}

// ============================================
// CHESS GAMES
// ============================================

export type ChessGameStatus = 'pending' | 'active' | 'completed' | 'declined';
export type ChessGameResult = 'white' | 'black' | 'draw' | null;

export interface ChessGame {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  challengerId: string; // Who sent the challenge
  status: ChessGameStatus;
  fen: string; // Chess position in FEN notation
  moves: string[]; // Array of moves in algebraic notation
  currentTurn: 'white' | 'black';
  result: ChessGameResult;
  winner?: string; // Winner's user ID
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

// ============================================
// COIN FLIP (Tie Breaker)
// ============================================

export type CoinFlipStatus = 'pending' | 'flipping' | 'completed' | 'declined';
export type CoinFlipResult = 'heads' | 'tails' | null;

export interface CoinFlip {
  id: string;
  challengerId: string;
  challengerCall: CoinFlipResult; // What the challenger called (heads/tails)
  opponentId: string;
  status: CoinFlipStatus;
  result: CoinFlipResult;
  winnerId?: string;
  reason?: string; // Optional reason for the flip
  createdAt: Timestamp;
  completedAt?: Timestamp;
}

// ============================================
// AUDIO CALLS (WebRTC)
// ============================================

export type CallStatus = 'ringing' | 'active' | 'ended' | 'declined' | 'missed';

export interface Call {
  id: string;
  type: 'audio'; // Can extend to 'video' later
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  participants: string[]; // All participant user IDs
  status: CallStatus;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  createdAt: Timestamp;
}

// WebRTC signaling - stored in subcollection calls/{callId}/participants/{odlUser}
export interface CallParticipant {
  odlUser: string;
  odlUserName: string;
  joined: boolean;
  muted: boolean;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  updatedAt: Timestamp;
}

// ICE candidates - stored in subcollection calls/{callId}/participants/{odlUser}/candidates
export interface IceCandidate {
  odlUser: string;
  targetUser: string;
  candidate: RTCIceCandidateInit;
  createdAt: Timestamp;
}

// ============================================
// CASINO TOKEN TRANSACTIONS
// ============================================

export type GameType = 'blackjack' | 'poker' | 'mahjong';
export type TransactionType = 'bet' | 'win' | 'refund' | 'daily_reset';

export interface TokenTransaction {
  id: string;
  odlUser: string;
  odlUserName: string;
  type: TransactionType;
  amount: number;           // Positive for credit, negative for debit
  gameType?: GameType;
  gameId?: string;
  balanceAfter: number;
  description: string;
  createdAt: Timestamp;
}

// Default token amount for new users
export const DEFAULT_TOKENS = 50000;

// ============================================
// PROJECT PAGE WIDGETS
// ============================================

export type ProjectWidgetId =
  | 'my-tasks'
  | 'quick-notes'
  | 'pinned-links'
  | 'recent-activity'
  | 'team-status'
  | 'deadlines'
  | 'password-vault';

export type ProjectWidgetColumn = 'left' | 'right';

export interface ProjectWidgetConfig {
  id: ProjectWidgetId;
  visible: boolean;
  position: number;
  column: ProjectWidgetColumn;
  collapsed?: boolean;
}

export interface ProjectLayout {
  userId: string;
  projectId: string;
  leftWidgets: ProjectWidgetConfig[];
  rightWidgets: ProjectWidgetConfig[];
  updatedAt: Timestamp;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  updatedAt: Timestamp;
}

export interface ProjectLink {
  id: string;
  projectId: string;
  title: string;
  url: string;
  icon?: string;
  addedBy: string;
  addedByName: string;
  createdAt: Timestamp;
}

export interface PasswordEntry {
  id: string;
  projectId: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  addedBy: string;
  addedByName: string;
  createdAt: Timestamp;
}

// ============================================
// PERSONAL PASSWORD VAULT
// ============================================

export interface PersonalPassword {
  id: string;
  userId: string;
  title: string;
  username: string;
  password: string; // Encrypted
  url?: string;
  notes?: string;
  category?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
