import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { subscribeToProjects } from '../../services/projects';
import { subscribeToAllAccessibleTasks } from '../../services/tasks';
import type { Project, Task } from '../../types';

interface DayData {
  day: string;
  count: number;
}

export default function TaskCompletionChart() {
  const { currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    }, {
      userId: currentUser.uid,
      isAdmin,
    });

    return unsubscribe;
  }, [currentUser, isAdmin]);

  useEffect(() => {
    if (projects.length === 0) return;

    const projectIds = projects.map((p) => p.id);
    const unsubscribe = subscribeToAllAccessibleTasks(projectIds, setTasks);

    return unsubscribe;
  }, [projects]);

  // Generate last 7 days of task completion data
  const getLast7DaysData = (): DayData[] => {
    const days: DayData[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = tasks.filter((task) => {
        if (task.status !== 'done') return false;
        const updatedAt = task.updatedAt?.toDate?.();
        if (!updatedAt) return false;
        return updatedAt >= date && updatedAt < nextDate;
      }).length;

      days.push({
        day: dayNames[date.getDay()],
        count,
      });
    }

    return days;
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="h-4 bg-white/10 rounded w-32 mb-4 animate-pulse" />
        <div className="h-32 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  const data = getLast7DaysData();
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCompleted = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="glass-card rounded-xl p-4 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white/90">Tasks Completed</h3>
          <p className="text-xs text-white/50">Last 7 days</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">{totalCompleted}</p>
          <p className="text-xs text-green-400">completed</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex items-end justify-between gap-2 h-24">
        {data.map((item, index) => {
          const height = item.count > 0 ? (item.count / maxCount) * 100 : 5;
          const isToday = index === data.length - 1;

          return (
            <div key={item.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex justify-center group">
                <div
                  className={`
                    w-full max-w-[24px] rounded-t-md transition-all duration-300
                    ${isToday
                      ? 'bg-gradient-to-t from-purple-600 to-pink-500'
                      : item.count > 0
                        ? 'bg-gradient-to-t from-purple-600/60 to-pink-500/60'
                        : 'bg-white/10'
                    }
                  `}
                  style={{ height: `${height}%`, minHeight: '4px' }}
                />
                {item.count > 0 && (
                  <div className="absolute bottom-full mb-1 px-1.5 py-0.5 bg-gray-900 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.count}
                  </div>
                )}
              </div>
              <span className={`text-[10px] ${isToday ? 'text-white/90 font-medium' : 'text-white/40'}`}>
                {item.day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {totalCompleted === 0 && (
        <p className="text-center text-xs text-white/40 mt-2">
          No tasks completed this week
        </p>
      )}
    </div>
  );
}
