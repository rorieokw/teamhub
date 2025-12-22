import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { WidgetConfig, WidgetId } from '../types';

// Widget metadata for display
export const WIDGET_REGISTRY: Record<WidgetId, { name: string; icon: string; description: string }> = {
  'sticky-notes': { name: 'Sticky Notes', icon: '📝', description: 'Quick personal notes' },
  'unread-messages': { name: 'Messages', icon: '💬', description: 'Recent chat messages' },
  'due-soon': { name: 'Due Soon', icon: '⏰', description: 'Upcoming deadlines' },
  'team-availability': { name: 'Team', icon: '👥', description: 'Who\'s online' },
  'pinned-items': { name: 'Pinned', icon: '📌', description: 'Your pinned content' },
  'activity-feed': { name: 'Activity', icon: '📊', description: 'Recent team activity' },
  'quick-stats': { name: 'Stats', icon: '📈', description: 'Overview statistics' },
  'calendar': { name: 'Calendar', icon: '📅', description: 'Upcoming events' },
  'polls': { name: 'Polls', icon: '🗳️', description: 'Active polls' },
  'task-chart': { name: 'Task Chart', icon: '✅', description: 'Task completion' },
  'project-chart': { name: 'Projects', icon: '📁', description: 'Project progress' },
  'my-tasks': { name: 'My Tasks', icon: '📋', description: 'Your pending tasks' },
  'recent-projects': { name: 'Projects', icon: '🗂️', description: 'Recent projects' },
  'chess': { name: 'Chess', icon: '♟️', description: 'Challenge teammates' },
  'coinflip': { name: 'Coin Flip', icon: '🪙', description: 'Tie breaker flips' },
};

// Default layout - flat grid (position is order in grid)
export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'quick-stats', visible: true, position: 0, column: 'left' },
  { id: 'my-tasks', visible: true, position: 1, column: 'left' },
  { id: 'unread-messages', visible: true, position: 2, column: 'left' },
  { id: 'due-soon', visible: true, position: 3, column: 'left' },
  { id: 'calendar', visible: true, position: 4, column: 'left' },
  { id: 'team-availability', visible: true, position: 5, column: 'left' },
  { id: 'chess', visible: true, position: 6, column: 'left' },
  { id: 'coinflip', visible: true, position: 7, column: 'left' },
  { id: 'activity-feed', visible: true, position: 8, column: 'left' },
  { id: 'sticky-notes', visible: true, position: 9, column: 'left' },
  { id: 'polls', visible: true, position: 10, column: 'left' },
  { id: 'pinned-items', visible: true, position: 11, column: 'left' },
  { id: 'task-chart', visible: true, position: 12, column: 'left' },
  { id: 'project-chart', visible: true, position: 13, column: 'left' },
  { id: 'recent-projects', visible: false, position: 14, column: 'left' },
];

// Merge saved layout with default to include any new widgets
function mergeWithDefaults(savedWidgets: WidgetConfig[]): WidgetConfig[] {
  const savedIds = new Set(savedWidgets.map(w => w.id));
  const missingWidgets: WidgetConfig[] = [];

  // Find widgets in default that aren't in saved
  for (const defaultWidget of DEFAULT_LAYOUT) {
    if (!savedIds.has(defaultWidget.id)) {
      missingWidgets.push({
        ...defaultWidget,
        position: savedWidgets.length + missingWidgets.length,
      });
    }
  }

  // Return saved + any new widgets appended at the end
  return [...savedWidgets, ...missingWidgets];
}

// Get user's dashboard layout
export async function getDashboardLayout(userId: string): Promise<WidgetConfig[]> {
  const docRef = doc(db, 'dashboardLayouts', userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const saved = docSnap.data().widgets as WidgetConfig[];
    return mergeWithDefaults(saved);
  }

  return DEFAULT_LAYOUT;
}

// Subscribe to layout changes
export function subscribeToDashboardLayout(
  userId: string,
  callback: (widgets: WidgetConfig[]) => void
): () => void {
  const docRef = doc(db, 'dashboardLayouts', userId);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const saved = docSnap.data().widgets as WidgetConfig[];
      callback(mergeWithDefaults(saved));
    } else {
      callback(DEFAULT_LAYOUT);
    }
  });
}

// Save dashboard layout
export async function saveDashboardLayout(
  userId: string,
  widgets: WidgetConfig[]
): Promise<void> {
  const docRef = doc(db, 'dashboardLayouts', userId);
  await setDoc(docRef, {
    userId,
    widgets,
    updatedAt: serverTimestamp(),
  });
}

// Toggle widget visibility
export async function toggleWidgetVisibility(
  userId: string,
  currentLayout: WidgetConfig[],
  widgetId: WidgetId
): Promise<void> {
  const updatedWidgets = currentLayout.map((w) =>
    w.id === widgetId ? { ...w, visible: !w.visible } : w
  );
  await saveDashboardLayout(userId, updatedWidgets);
}

// Reorder widgets (swap positions)
export async function reorderWidgets(
  userId: string,
  currentLayout: WidgetConfig[],
  activeId: string,
  overId: string
): Promise<void> {
  const activeIndex = currentLayout.findIndex((w) => w.id === activeId);
  const overIndex = currentLayout.findIndex((w) => w.id === overId);

  if (activeIndex === -1 || overIndex === -1) return;

  const newWidgets = [...currentLayout];
  const [removed] = newWidgets.splice(activeIndex, 1);
  newWidgets.splice(overIndex, 0, removed);

  // Update positions
  const updatedWidgets = newWidgets.map((w, index) => ({
    ...w,
    position: index,
  }));

  await saveDashboardLayout(userId, updatedWidgets);
}

// Reset to default layout
export async function resetDashboardLayout(userId: string): Promise<void> {
  await saveDashboardLayout(userId, DEFAULT_LAYOUT);
}
