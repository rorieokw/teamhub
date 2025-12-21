import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project, Task } from '../types';

const USERS_COLLECTION = 'users';
const DEFAULT_REPUTATION = 3000; // Users start at Neutral
const MIN_REPUTATION = 0;
const MAX_REPUTATION = 999999; // Effectively unlimited

// WoW Reputation Levels (thresholds)
export const REPUTATION_LEVELS = {
  HATED: { min: 0, max: 499, name: 'Hated' },
  HOSTILE: { min: 500, max: 1499, name: 'Hostile' },
  UNFRIENDLY: { min: 1500, max: 2999, name: 'Unfriendly' },
  NEUTRAL: { min: 3000, max: 5999, name: 'Neutral' },
  FRIENDLY: { min: 6000, max: 11999, name: 'Friendly' },
  HONORED: { min: 12000, max: 20999, name: 'Honored' },
  REVERED: { min: 21000, max: 41999, name: 'Revered' },
  EXALTED: { min: 42000, max: 999999, name: 'Exalted' },
} as const;

// Reputation gains
export const REPUTATION_GAINS = {
  TASK_COMPLETED: 50,
  PROJECT_COMPLETED: 150,
  TASK_ON_TIME: 25,
  PROJECT_ON_TIME: 75,
  EARLY_COMPLETION: 15,
  MILESTONE_COMPLETED: 100,
  MESSAGE_SENT: 1,
  COMMENT_ADDED: 5,
} as const;

// Reputation penalties (for late completions)
export const REPUTATION_PENALTIES = {
  MISSED_PROJECT_DEADLINE: 100,
  MISSED_TASK_DEADLINE: 50,
  LATE_PROJECT_COMPLETION: 50,
  LATE_TASK_COMPLETION: 25,
} as const;

// Get reputation level info from points
export function getReputationLevel(reputation: number): {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  current: number;
  min: number;
  max: number;
  nextLevel: string | null;
  pointsToNext: number;
  progress: number;
} {
  const levels = [
    { ...REPUTATION_LEVELS.HATED, color: 'text-red-500', bgColor: 'bg-red-500/20', textColor: '#ef4444' },
    { ...REPUTATION_LEVELS.HOSTILE, color: 'text-orange-500', bgColor: 'bg-orange-500/20', textColor: '#f97316' },
    { ...REPUTATION_LEVELS.UNFRIENDLY, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', textColor: '#eab308' },
    { ...REPUTATION_LEVELS.NEUTRAL, color: 'text-gray-400', bgColor: 'bg-gray-500/20', textColor: '#9ca3af' },
    { ...REPUTATION_LEVELS.FRIENDLY, color: 'text-green-400', bgColor: 'bg-green-500/20', textColor: '#4ade80' },
    { ...REPUTATION_LEVELS.HONORED, color: 'text-blue-400', bgColor: 'bg-blue-500/20', textColor: '#60a5fa' },
    { ...REPUTATION_LEVELS.REVERED, color: 'text-purple-400', bgColor: 'bg-purple-500/20', textColor: '#c084fc' },
    { ...REPUTATION_LEVELS.EXALTED, color: 'text-yellow-300', bgColor: 'bg-yellow-500/20', textColor: '#fde047' },
  ];

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (reputation >= level.min && reputation <= level.max) {
      const nextLevel = i < levels.length - 1 ? levels[i + 1] : null;
      const pointsInLevel = reputation - level.min;
      const levelSize = level.max - level.min + 1;
      const progress = Math.min((pointsInLevel / levelSize) * 100, 100);

      return {
        label: level.name,
        color: level.color,
        bgColor: level.bgColor,
        textColor: level.textColor,
        current: reputation,
        min: level.min,
        max: level.max,
        nextLevel: nextLevel?.name || null,
        pointsToNext: nextLevel ? nextLevel.min - reputation : 0,
        progress,
      };
    }
  }

  // Fallback to Exalted if above max
  const exalted = levels[levels.length - 1];
  return {
    label: exalted.name,
    color: exalted.color,
    bgColor: exalted.bgColor,
    textColor: exalted.textColor,
    current: reputation,
    min: exalted.min,
    max: exalted.max,
    nextLevel: null,
    pointsToNext: 0,
    progress: 100,
  };
}

// Get user's reputation
export async function getUserReputation(userId: string): Promise<number> {
  const docRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return data.reputation ?? DEFAULT_REPUTATION;
  }

  return DEFAULT_REPUTATION;
}

// Set initial reputation for new users (Hated - 0)
export async function initializeReputation(userId: string): Promise<void> {
  const docRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(docRef, {
    reputation: DEFAULT_REPUTATION,
  });
}

// Increase reputation
export async function increaseReputation(
  userId: string,
  amount: number,
  reason?: string
): Promise<number> {
  const docRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return DEFAULT_REPUTATION;

  const currentReputation = docSnap.data().reputation ?? DEFAULT_REPUTATION;
  const newReputation = Math.min(MAX_REPUTATION, currentReputation + amount);

  await updateDoc(docRef, {
    reputation: newReputation,
  });

  const oldLevel = getReputationLevel(currentReputation);
  const newLevel = getReputationLevel(newReputation);

  console.log(
    `Reputation increased for user ${userId}: ${currentReputation} -> ${newReputation}${
      reason ? ` (${reason})` : ''
    }${oldLevel.label !== newLevel.label ? ` [RANK UP: ${oldLevel.label} -> ${newLevel.label}]` : ''}`
  );

  return newReputation;
}

// Decrease reputation
export async function decreaseReputation(
  userId: string,
  amount: number,
  reason?: string
): Promise<number> {
  const docRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return DEFAULT_REPUTATION;

  const currentReputation = docSnap.data().reputation ?? DEFAULT_REPUTATION;
  const newReputation = Math.max(MIN_REPUTATION, currentReputation - amount);

  await updateDoc(docRef, {
    reputation: newReputation,
  });

  const oldLevel = getReputationLevel(currentReputation);
  const newLevel = getReputationLevel(newReputation);

  console.log(
    `Reputation decreased for user ${userId}: ${currentReputation} -> ${newReputation}${
      reason ? ` (${reason})` : ''
    }${oldLevel.label !== newLevel.label ? ` [RANK DOWN: ${oldLevel.label} -> ${newLevel.label}]` : ''}`
  );

  return newReputation;
}

// Check for missed project deadlines and apply penalties
export async function checkProjectDeadlines(): Promise<void> {
  const now = Timestamp.now();

  const projectsQuery = query(
    collection(db, 'projects'),
    where('status', '==', 'active'),
    where('deadline', '<=', now)
  );

  const snapshot = await getDocs(projectsQuery);

  for (const projectDoc of snapshot.docs) {
    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

    // Apply penalty to all project members
    for (const memberId of project.members) {
      await decreaseReputation(
        memberId,
        REPUTATION_PENALTIES.MISSED_PROJECT_DEADLINE,
        `Missed deadline for project: ${project.name}`
      );
    }
  }
}

// Check for missed task deadlines and apply penalties to assignees
export async function checkTaskDeadlines(): Promise<void> {
  const now = Timestamp.now();

  const tasksQuery = query(
    collection(db, 'tasks'),
    where('status', '!=', 'done'),
    where('dueDate', '<=', now)
  );

  const snapshot = await getDocs(tasksQuery);

  for (const taskDoc of snapshot.docs) {
    const task = { id: taskDoc.id, ...taskDoc.data() } as Task;

    await decreaseReputation(
      task.assignedTo,
      REPUTATION_PENALTIES.MISSED_TASK_DEADLINE,
      `Missed deadline for task: ${task.title}`
    );
  }
}

// Award reputation for completing project on time
export async function rewardProjectCompletion(
  project: Project,
  completedBy: string
): Promise<void> {
  // Always give base completion reputation
  await increaseReputation(
    completedBy,
    REPUTATION_GAINS.PROJECT_COMPLETED,
    `Completed project: ${project.name}`
  );

  if (!project.deadline) return;

  const now = new Date();
  const deadline = project.deadline.toDate();

  if (now <= deadline) {
    // Bonus for completing on time
    await increaseReputation(
      completedBy,
      REPUTATION_GAINS.PROJECT_ON_TIME,
      `Completed project on time: ${project.name}`
    );
  } else {
    // Penalty for late completion
    await decreaseReputation(
      completedBy,
      REPUTATION_PENALTIES.LATE_PROJECT_COMPLETION,
      `Late completion of project: ${project.name}`
    );
  }
}

// Award reputation for completing task on time
export async function rewardTaskCompletion(
  task: Task,
  completedBy: string
): Promise<void> {
  // Always give base completion reputation
  await increaseReputation(
    completedBy,
    REPUTATION_GAINS.TASK_COMPLETED,
    `Completed task: ${task.title}`
  );

  if (!task.dueDate) return;

  const now = new Date();
  const deadline = task.dueDate.toDate();

  if (now <= deadline) {
    // Bonus for completing on time
    await increaseReputation(
      completedBy,
      REPUTATION_GAINS.TASK_ON_TIME,
      `Completed task on time: ${task.title}`
    );
  } else {
    // Penalty for late completion
    await decreaseReputation(
      completedBy,
      REPUTATION_PENALTIES.LATE_TASK_COMPLETION,
      `Late completion of task: ${task.title}`
    );
  }
}
