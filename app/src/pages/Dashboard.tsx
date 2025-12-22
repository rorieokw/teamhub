import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardLayout } from '../hooks/useDashboardLayout';
import { subscribeToProjects } from '../services/projects';
import { subscribeToUserTasks } from '../services/tasks';

// Widgets
import AnnouncementBanner from '../components/announcements/AnnouncementBanner';
import TeamAvailabilityWidget from '../components/availability/TeamAvailabilityWidget';
import PinnedItemsWidget from '../components/pinned/PinnedItemsWidget';
import DashboardPollsWidget from '../components/polls/DashboardPollsWidget';
import CalendarWidget from '../components/calendar/CalendarWidget';
import QuickStatsWidget from '../components/stats/QuickStatsWidget';
import TaskCompletionChart from '../components/stats/TaskCompletionChart';
import ProjectProgressChart from '../components/stats/ProjectProgressChart';
import ActivityFeed from '../components/activity/ActivityFeed';
import UnreadMessagesWidget from '../components/dashboard/UnreadMessagesWidget';
import DueSoonWidget from '../components/dashboard/DueSoonWidget';
import StickyNotesWidget from '../components/notes/StickyNotesWidget';
import ChessWidget from '../components/chess/ChessWidget';
import CoinFlipWidget from '../components/coinflip/CoinFlipWidget';
import WidgetCard from '../components/dashboard/WidgetCard';
import WidgetSettingsModal from '../components/dashboard/WidgetSettingsModal';

import type { Project, Task, WidgetId } from '../types';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const {
    widgets,
    isEditMode,
    setIsEditMode,
    getVisibleWidgets,
    toggleWidget,
    reorderWidgets,
    resetLayout,
  } = useDashboardLayout();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      const userProjects = currentUser
        ? data.filter((p) => p.members.includes(currentUser.uid))
        : [];
      setProjects(userProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserTasks(currentUser.uid, setTasks);
    return () => unsubscribe();
  }, [currentUser]);

  const pendingTasks = tasks.filter((t) => t.status !== 'done');

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = userProfile?.displayName?.split(' ')[0] || 'there';

    if (hour < 12) {
      return { greeting: `Good morning, ${name}!`, subtitle: "Ready to tackle the day?" };
    } else if (hour < 17) {
      return { greeting: `Good afternoon, ${name}!`, subtitle: "Here's your progress so far" };
    } else if (hour < 21) {
      return { greeting: `Good evening, ${name}!`, subtitle: "Wrapping up for the day?" };
    } else {
      return { greeting: `Working late, ${name}?`, subtitle: "Here's what's still on your plate" };
    }
  };

  const { greeting, subtitle } = getGreeting();

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderWidgets(active.id as string, over.id as string);
  };

  // Render widget content by ID (just the inner content, not the card)
  const renderWidgetContent = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'quick-stats':
        return <QuickStatsWidget />;

      case 'sticky-notes':
        return <StickyNotesWidget />;

      case 'unread-messages':
        return <UnreadMessagesWidget />;

      case 'due-soon':
        return <DueSoonWidget />;

      case 'team-availability':
        return <TeamAvailabilityWidget />;

      case 'pinned-items':
        return <PinnedItemsWidget />;

      case 'activity-feed':
        return <ActivityFeed limit={5} />;

      case 'calendar':
        return <CalendarWidget />;

      case 'polls':
        return <DashboardPollsWidget />;

      case 'task-chart':
        return <TaskCompletionChart />;

      case 'project-chart':
        return <ProjectProgressChart />;

      case 'my-tasks':
        return (
          <div className="space-y-2">
            {pendingTasks.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">No pending tasks</p>
            ) : (
              pendingTasks.slice(0, 5).map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                return (
                  <Link
                    key={task.id}
                    to="/tasks"
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <p className="text-gray-500 text-xs truncate">{project?.name || 'Unknown'}</p>
                    </div>
                  </Link>
                );
              })
            )}
            {pendingTasks.length > 5 && (
              <Link to="/tasks" className="block text-center text-purple-400 text-xs hover:text-purple-300">
                +{pendingTasks.length - 5} more tasks
              </Link>
            )}
          </div>
        );

      case 'recent-projects':
        return (
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm">No projects yet</p>
                <Link to="/projects" className="text-purple-400 text-xs hover:text-purple-300">
                  Create one
                </Link>
              </div>
            ) : (
              projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm truncate">{project.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-gray-500 text-xs">{project.progress}%</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        );

      case 'chess':
        return <ChessWidget />;

      case 'coinflip':
        return <CoinFlipWidget />;

      default:
        return null;
    }
  };

  const visibleWidgets = getVisibleWidgets();

  return (
    <div className="animate-fade-in">
      {/* Announcements Banner */}
      <AnnouncementBanner />

      {/* Welcome Header with Edit Button */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{greeting}</h1>
          <p className="text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => setShowSettings(true)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Widgets
              </button>
              <button
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Done
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditMode(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Customize
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <div>
            <p className="text-white font-medium">Edit Mode</p>
            <p className="text-purple-300 text-sm">Drag widgets to rearrange, or click "Widgets" to show/hide</p>
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleWidgets.map((widget) => (
              <WidgetCard key={widget.id} id={widget.id} isEditMode={isEditMode}>
                {renderWidgetContent(widget.id)}
              </WidgetCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {visibleWidgets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </div>
          <h3 className="text-white font-medium mb-2">No widgets visible</h3>
          <p className="text-gray-400 text-sm mb-4">Click "Customize" to add widgets to your dashboard</p>
          <button
            onClick={() => {
              setIsEditMode(true);
              setShowSettings(true);
            }}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm"
          >
            Add Widgets
          </button>
        </div>
      )}

      {/* Widget Settings Modal */}
      <WidgetSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgets={widgets}
        onToggleWidget={toggleWidget}
        onResetLayout={resetLayout}
      />
    </div>
  );
}
