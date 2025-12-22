import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToUserTasks } from '../../services/tasks';
import { subscribeToUpcomingEvents } from '../../services/events';
import type { Task, TeamEvent } from '../../types';

interface DueItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  dueDate: Date;
  priority?: string;
  status?: string;
}

export default function DueSoonWidget() {
  const { currentUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeTasks = subscribeToUserTasks(currentUser.uid, (data) => {
      setTasks(data);
      setLoading(false);
    });

    return () => unsubscribeTasks();
  }, [currentUser]);

  useEffect(() => {
    const unsubscribeEvents = subscribeToUpcomingEvents(7, (data) => {
      setEvents(data);
    });

    return () => unsubscribeEvents();
  }, []);

  // Combine tasks and events, filter to upcoming items
  const getDueItems = (): DueItem[] => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const items: DueItem[] = [];

    // Add tasks with due dates
    tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .forEach((task) => {
        const dueDate = task.dueDate!.toDate();
        if (dueDate <= nextWeek) {
          items.push({
            id: task.id,
            title: task.title,
            type: 'task',
            dueDate,
            priority: task.priority,
            status: task.status,
          });
        }
      });

    // Add upcoming events
    events.forEach((event) => {
      const eventDate = event.date.toDate();
      if (eventDate >= now && eventDate <= nextWeek) {
        items.push({
          id: event.id,
          title: event.title,
          type: 'event',
          dueDate: eventDate,
        });
      }
    });

    // Sort by due date
    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5);
  };

  const formatDueDate = (date: Date): { text: string; urgent: boolean } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffMs = dueDay.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, urgent: true };
    }
    if (diffDays === 0) {
      return { text: 'Today', urgent: true };
    }
    if (diffDays === 1) {
      return { text: 'Tomorrow', urgent: true };
    }
    if (diffDays <= 3) {
      return { text: `${diffDays} days`, urgent: false };
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { text: dayNames[date.getDay()], urgent: false };
  };

  const dueItems = getDueItems();
  const urgentCount = dueItems.filter((i) => formatDueDate(i.dueDate).urgent).length;

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (dueItems.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">Nothing due this week</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {urgentCount > 0 && (
        <div className="flex justify-end mb-1">
          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full">
            {urgentCount} urgent
          </span>
        </div>
      )}
      {dueItems.map((item) => {
        const { text: dueText, urgent } = formatDueDate(item.dueDate);
        return (
          <Link
            key={`${item.type}-${item.id}`}
            to={item.type === 'task' ? '/tasks' : '/calendar'}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              urgent
                ? 'bg-orange-500 animate-pulse'
                : item.priority === 'high' || item.priority === 'urgent'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white truncate group-hover:text-purple-300 transition-colors">
                  {item.title}
                </span>
                {item.type === 'event' && (
                  <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-medium rounded">
                    Event
                  </span>
                )}
              </div>
            </div>
            <span className={`text-xs font-medium flex-shrink-0 ${
              urgent ? 'text-orange-400' : 'text-gray-500'
            }`}>
              {dueText}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
