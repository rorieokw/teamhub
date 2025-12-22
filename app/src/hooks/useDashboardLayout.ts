import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeToDashboardLayout,
  saveDashboardLayout,
  DEFAULT_LAYOUT,
  WIDGET_REGISTRY,
} from '../services/dashboardLayout';
import type { WidgetConfig, WidgetId } from '../types';

export function useDashboardLayout() {
  const { currentUser } = useAuth();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_LAYOUT);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setWidgets(DEFAULT_LAYOUT);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToDashboardLayout(currentUser.uid, (layout) => {
      setWidgets(layout);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Get all visible widgets sorted by position
  const getVisibleWidgets = useCallback(() => {
    return widgets
      .filter((w) => w.visible)
      .sort((a, b) => a.position - b.position);
  }, [widgets]);

  // Toggle widget visibility
  const toggleWidget = useCallback(
    async (widgetId: WidgetId) => {
      if (!currentUser) return;

      const updatedWidgets = widgets.map((w) =>
        w.id === widgetId ? { ...w, visible: !w.visible } : w
      );
      setWidgets(updatedWidgets);
      await saveDashboardLayout(currentUser.uid, updatedWidgets);
    },
    [currentUser, widgets]
  );

  // Reorder widgets (for drag and drop)
  const reorderWidgets = useCallback(
    async (activeId: string, overId: string) => {
      if (!currentUser || activeId === overId) return;

      const activeIndex = widgets.findIndex((w) => w.id === activeId);
      const overIndex = widgets.findIndex((w) => w.id === overId);

      if (activeIndex === -1 || overIndex === -1) return;

      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(activeIndex, 1);
      newWidgets.splice(overIndex, 0, removed);

      // Update positions
      const updatedWidgets = newWidgets.map((w, index) => ({
        ...w,
        position: index,
      }));

      setWidgets(updatedWidgets);
      await saveDashboardLayout(currentUser.uid, updatedWidgets);
    },
    [currentUser, widgets]
  );

  // Reset to default layout
  const resetLayout = useCallback(async () => {
    if (!currentUser) return;
    setWidgets(DEFAULT_LAYOUT);
    await saveDashboardLayout(currentUser.uid, DEFAULT_LAYOUT);
  }, [currentUser]);

  return {
    widgets,
    loading,
    isEditMode,
    setIsEditMode,
    getVisibleWidgets,
    toggleWidget,
    reorderWidgets,
    resetLayout,
    widgetRegistry: WIDGET_REGISTRY,
  };
}
