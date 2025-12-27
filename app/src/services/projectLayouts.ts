import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProjectWidgetConfig, ProjectWidgetId } from '../types';

// Widget metadata for display
export const PROJECT_WIDGET_REGISTRY: Record<ProjectWidgetId, { name: string; icon: string; description: string }> = {
  'my-tasks': { name: 'My Tasks', icon: '📋', description: 'Tasks assigned to you in this project' },
  'quick-notes': { name: 'Quick Notes', icon: '📝', description: 'Your personal notes for this project' },
  'pinned-links': { name: 'Pinned Links', icon: '🔗', description: 'Important links and resources' },
  'recent-activity': { name: 'Recent Activity', icon: '📊', description: 'Latest updates in this project' },
  'team-status': { name: 'Team Status', icon: '👥', description: 'Who\'s working on what' },
  'deadlines': { name: 'Deadlines', icon: '⏰', description: 'Upcoming due dates' },
  'password-vault': { name: 'Password Vault', icon: '🔐', description: 'Shared credentials and API keys' },
};

// Default layout for project pages
export const DEFAULT_PROJECT_LAYOUT: {
  leftWidgets: ProjectWidgetConfig[];
  rightWidgets: ProjectWidgetConfig[];
} = {
  leftWidgets: [
    { id: 'my-tasks', visible: true, position: 0, column: 'left' },
    { id: 'password-vault', visible: true, position: 1, column: 'left' },
    { id: 'recent-activity', visible: true, position: 2, column: 'left' },
  ],
  rightWidgets: [
    { id: 'quick-notes', visible: true, position: 0, column: 'right' },
    { id: 'pinned-links', visible: true, position: 1, column: 'right' },
    { id: 'deadlines', visible: true, position: 2, column: 'right' },
  ],
};

// Generate document ID for user's project layout
function getLayoutDocId(userId: string, projectId: string): string {
  return `${userId}_${projectId}`;
}

// Merge saved layout with defaults to include any new widgets
function mergeWithDefaults(
  savedLeft: ProjectWidgetConfig[],
  savedRight: ProjectWidgetConfig[]
): { leftWidgets: ProjectWidgetConfig[]; rightWidgets: ProjectWidgetConfig[] } {
  const savedLeftIds = new Set(savedLeft.map(w => w.id));
  const savedRightIds = new Set(savedRight.map(w => w.id));
  const allSavedIds = new Set([...savedLeftIds, ...savedRightIds]);

  const missingLeft: ProjectWidgetConfig[] = [];
  const missingRight: ProjectWidgetConfig[] = [];

  // Check left defaults
  for (const defaultWidget of DEFAULT_PROJECT_LAYOUT.leftWidgets) {
    if (!allSavedIds.has(defaultWidget.id)) {
      missingLeft.push({
        ...defaultWidget,
        position: savedLeft.length + missingLeft.length,
      });
    }
  }

  // Check right defaults
  for (const defaultWidget of DEFAULT_PROJECT_LAYOUT.rightWidgets) {
    if (!allSavedIds.has(defaultWidget.id)) {
      missingRight.push({
        ...defaultWidget,
        position: savedRight.length + missingRight.length,
      });
    }
  }

  return {
    leftWidgets: [...savedLeft, ...missingLeft],
    rightWidgets: [...savedRight, ...missingRight],
  };
}

// Get user's project layout
export async function getProjectLayout(
  userId: string,
  projectId: string
): Promise<{ leftWidgets: ProjectWidgetConfig[]; rightWidgets: ProjectWidgetConfig[] }> {
  const docRef = doc(db, 'projectLayouts', getLayoutDocId(userId, projectId));
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return mergeWithDefaults(
      data.leftWidgets as ProjectWidgetConfig[],
      data.rightWidgets as ProjectWidgetConfig[]
    );
  }

  return DEFAULT_PROJECT_LAYOUT;
}

// Subscribe to layout changes
export function subscribeToProjectLayout(
  userId: string,
  projectId: string,
  callback: (layout: { leftWidgets: ProjectWidgetConfig[]; rightWidgets: ProjectWidgetConfig[] }) => void
): () => void {
  const docRef = doc(db, 'projectLayouts', getLayoutDocId(userId, projectId));

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback(mergeWithDefaults(
        data.leftWidgets as ProjectWidgetConfig[],
        data.rightWidgets as ProjectWidgetConfig[]
      ));
    } else {
      callback(DEFAULT_PROJECT_LAYOUT);
    }
  });
}

// Save project layout
export async function saveProjectLayout(
  userId: string,
  projectId: string,
  leftWidgets: ProjectWidgetConfig[],
  rightWidgets: ProjectWidgetConfig[]
): Promise<void> {
  const docRef = doc(db, 'projectLayouts', getLayoutDocId(userId, projectId));
  await setDoc(docRef, {
    userId,
    projectId,
    leftWidgets,
    rightWidgets,
    updatedAt: serverTimestamp(),
  });
}

// Toggle widget visibility
export async function toggleProjectWidgetVisibility(
  userId: string,
  projectId: string,
  currentLayout: { leftWidgets: ProjectWidgetConfig[]; rightWidgets: ProjectWidgetConfig[] },
  widgetId: ProjectWidgetId
): Promise<void> {
  const updatedLeft = currentLayout.leftWidgets.map((w) =>
    w.id === widgetId ? { ...w, visible: !w.visible } : w
  );
  const updatedRight = currentLayout.rightWidgets.map((w) =>
    w.id === widgetId ? { ...w, visible: !w.visible } : w
  );
  await saveProjectLayout(userId, projectId, updatedLeft, updatedRight);
}

// Toggle widget collapsed state
export async function toggleProjectWidgetCollapsed(
  userId: string,
  projectId: string,
  currentLayout: { leftWidgets: ProjectWidgetConfig[]; rightWidgets: ProjectWidgetConfig[] },
  widgetId: ProjectWidgetId
): Promise<void> {
  const updatedLeft = currentLayout.leftWidgets.map((w) =>
    w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w
  );
  const updatedRight = currentLayout.rightWidgets.map((w) =>
    w.id === widgetId ? { ...w, collapsed: !w.collapsed } : w
  );
  await saveProjectLayout(userId, projectId, updatedLeft, updatedRight);
}

// Reset to default layout
export async function resetProjectLayout(userId: string, projectId: string): Promise<void> {
  await saveProjectLayout(
    userId,
    projectId,
    DEFAULT_PROJECT_LAYOUT.leftWidgets,
    DEFAULT_PROJECT_LAYOUT.rightWidgets
  );
}
