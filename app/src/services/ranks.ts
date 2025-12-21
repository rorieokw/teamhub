import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { UserRank, UserStats, RankTier, RankDivision } from '../types';
import { RANK_POINTS } from '../types';

const COLLECTION = 'userStats';

// Rank thresholds - points needed to reach each rank
// Each division within a tier is 100 LP
// Iron IV starts at 0, Iron III at 100, etc.
const RANK_THRESHOLDS: { tier: RankTier; basePoints: number; hasDivisions: boolean }[] = [
  { tier: 'iron', basePoints: 0, hasDivisions: true },
  { tier: 'bronze', basePoints: 400, hasDivisions: true },
  { tier: 'silver', basePoints: 800, hasDivisions: true },
  { tier: 'gold', basePoints: 1200, hasDivisions: true },
  { tier: 'platinum', basePoints: 1600, hasDivisions: true },
  { tier: 'emerald', basePoints: 2000, hasDivisions: true },
  { tier: 'diamond', basePoints: 2400, hasDivisions: true },
  { tier: 'master', basePoints: 2800, hasDivisions: false },
  { tier: 'grandmaster', basePoints: 3200, hasDivisions: false },
  { tier: 'challenger', basePoints: 3600, hasDivisions: false },
];

// Division order (IV is lowest, I is highest)
const DIVISIONS: RankDivision[] = ['IV', 'III', 'II', 'I'];

// Rank colors for UI
export const RANK_COLORS: Record<RankTier, { primary: string; secondary: string; glow: string }> = {
  iron: { primary: '#5c5c5c', secondary: '#8a8a8a', glow: 'rgba(92, 92, 92, 0.5)' },
  bronze: { primary: '#cd7f32', secondary: '#b87333', glow: 'rgba(205, 127, 50, 0.5)' },
  silver: { primary: '#c0c0c0', secondary: '#a8a8a8', glow: 'rgba(192, 192, 192, 0.5)' },
  gold: { primary: '#ffd700', secondary: '#daa520', glow: 'rgba(255, 215, 0, 0.5)' },
  platinum: { primary: '#00cec9', secondary: '#0984e3', glow: 'rgba(0, 206, 201, 0.5)' },
  emerald: { primary: '#00b894', secondary: '#00a085', glow: 'rgba(0, 184, 148, 0.5)' },
  diamond: { primary: '#74b9ff', secondary: '#a29bfe', glow: 'rgba(116, 185, 255, 0.5)' },
  master: { primary: '#9b59b6', secondary: '#8e44ad', glow: 'rgba(155, 89, 182, 0.5)' },
  grandmaster: { primary: '#e74c3c', secondary: '#c0392b', glow: 'rgba(231, 76, 60, 0.5)' },
  challenger: { primary: '#f39c12', secondary: '#e67e22', glow: 'rgba(243, 156, 18, 0.6)' },
};

// Rank display names
export const RANK_NAMES: Record<RankTier, string> = {
  iron: 'Iron',
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  challenger: 'Challenger',
};

// Calculate rank from total points
export function calculateRank(totalPoints: number): UserRank {
  let currentTier: RankTier = 'iron';
  let tierBasePoints = 0;
  let hasDivisions = true;

  // Find the appropriate tier
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANK_THRESHOLDS[i].basePoints) {
      currentTier = RANK_THRESHOLDS[i].tier;
      tierBasePoints = RANK_THRESHOLDS[i].basePoints;
      hasDivisions = RANK_THRESHOLDS[i].hasDivisions;
      break;
    }
  }

  // Calculate LP and division within the tier
  const pointsInTier = totalPoints - tierBasePoints;

  if (hasDivisions) {
    // Each division is 100 points
    const divisionIndex = Math.min(Math.floor(pointsInTier / 100), 3);
    const division = DIVISIONS[divisionIndex];
    const lp = pointsInTier % 100;

    return {
      tier: currentTier,
      division,
      points: totalPoints,
      lp,
    };
  } else {
    // Master+ have no divisions, LP can exceed 100
    return {
      tier: currentTier,
      points: totalPoints,
      lp: pointsInTier,
    };
  }
}

// Get default stats for a new user
export function getDefaultStats(): UserStats {
  return {
    tasksCompleted: 0,
    tasksCreated: 0,
    projectsCreated: 0,
    messagesCount: 0,
    commentsCount: 0,
    milestonesCompleted: 0,
    totalPoints: 0,
    rank: calculateRank(0),
  };
}

// Get user stats
export async function getUserStats(userId: string): Promise<UserStats> {
  const docRef = doc(db, COLLECTION, userId);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      ...data,
      rank: calculateRank(data.totalPoints || 0),
    } as UserStats;
  }

  return getDefaultStats();
}

// Subscribe to user stats changes
export function subscribeToUserStats(
  userId: string,
  callback: (stats: UserStats) => void
): () => void {
  const docRef = doc(db, COLLECTION, userId);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          ...data,
          rank: calculateRank(data.totalPoints || 0),
        } as UserStats);
      } else {
        callback(getDefaultStats());
      }
    },
    (error) => {
      // Silently handle permission errors
      console.debug('UserStats subscription error:', error.message);
      callback(getDefaultStats());
    }
  );
}

// Initialize or update user stats
async function ensureUserStats(userId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, userId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    await setDoc(docRef, {
      tasksCompleted: 0,
      tasksCreated: 0,
      projectsCreated: 0,
      messagesCount: 0,
      commentsCount: 0,
      milestonesCompleted: 0,
      totalPoints: 0,
    });
  }
}

// Award points for completing a task
export async function awardTaskCompleted(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    tasksCompleted: increment(1),
    totalPoints: increment(RANK_POINTS.TASK_COMPLETED),
  });
}

// Award points for creating a task
export async function awardTaskCreated(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    tasksCreated: increment(1),
    totalPoints: increment(RANK_POINTS.TASK_CREATED),
  });
}

// Award points for creating a project
export async function awardProjectCreated(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    projectsCreated: increment(1),
    totalPoints: increment(RANK_POINTS.PROJECT_CREATED),
  });
}

// Award points for sending a message
export async function awardMessageSent(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    messagesCount: increment(1),
    totalPoints: increment(RANK_POINTS.MESSAGE_SENT),
  });
}

// Award points for adding a comment
export async function awardCommentAdded(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    commentsCount: increment(1),
    totalPoints: increment(RANK_POINTS.COMMENT_ADDED),
  });
}

// Award points for completing a milestone
export async function awardMilestoneCompleted(userId: string): Promise<void> {
  await ensureUserStats(userId);
  const docRef = doc(db, COLLECTION, userId);
  await updateDoc(docRef, {
    milestonesCompleted: increment(1),
    totalPoints: increment(RANK_POINTS.MILESTONE_COMPLETED),
  });
}

// Get rank display string (e.g., "Gold II" or "Master 156 LP")
export function getRankDisplayString(rank: UserRank): string {
  const tierName = RANK_NAMES[rank.tier];

  if (rank.division) {
    return `${tierName} ${rank.division}`;
  }

  return `${tierName} ${rank.lp} LP`;
}

// Get points needed for next rank/division
export function getPointsToNextRank(rank: UserRank): number {
  const currentThresholdIndex = RANK_THRESHOLDS.findIndex(t => t.tier === rank.tier);

  if (rank.division) {
    // Has divisions - calculate points to next division or tier
    const divisionIndex = DIVISIONS.indexOf(rank.division);

    if (divisionIndex < 3) {
      // Points to next division within same tier
      return 100 - rank.lp;
    } else {
      // At division I, points to next tier
      if (currentThresholdIndex < RANK_THRESHOLDS.length - 1) {
        return 100 - rank.lp;
      }
    }
  } else {
    // Master+ - points to next tier
    if (currentThresholdIndex < RANK_THRESHOLDS.length - 1) {
      const nextThreshold = RANK_THRESHOLDS[currentThresholdIndex + 1];
      return nextThreshold.basePoints - rank.points;
    }
  }

  return 0; // Already at max rank
}
