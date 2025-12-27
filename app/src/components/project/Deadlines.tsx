import { useNavigate } from 'react-router-dom';
import type { Task } from '../../types';

interface DeadlinesProps {
  tasks: Task[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Deadlines({
  tasks,
  collapsed = false,
  onToggleCollapse,
}: DeadlinesProps) {
  const navigate = useNavigate();

  // Get tasks with due dates that aren't done, sorted by due date
  const upcomingTasks = tasks
    .filter((task) => task.dueDate && task.status !== 'done')
    .sort((a, b) => {
      const dateA = a.dueDate?.toDate?.() || new Date(0);
      const dateB = b.dueDate?.toDate?.() || new Date(0);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  const formatDueDate = (task: Task): { text: string; color: string } => {
    if (!task.dueDate) return { text: '', color: 'text-gray-400 bg-gray-500/20' };
    const date = task.dueDate.toDate?.() || new Date(task.dueDate as unknown as string);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / 86400000);

    if (days < 0) return { text: `${Math.abs(days)}d overdue`, color: 'text-red-400 bg-red-500/20' };
    if (days === 0) return { text: 'Due today', color: 'text-orange-400 bg-orange-500/20' };
    if (days === 1) return { text: 'Due tomorrow', color: 'text-yellow-400 bg-yellow-500/20' };
    if (days <= 7) return { text: `${days}d left`, color: 'text-blue-400 bg-blue-500/20' };
    return { text: date.toLocaleDateString(), color: 'text-gray-400 bg-gray-500/20' };
  };

  const overdueTasks = upcomingTasks.filter((task) => {
    if (!task.dueDate) return false;
    const date = task.dueDate.toDate?.() || new Date(task.dueDate as unknown as string);
    return date.getTime() < Date.now();
  });

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800/80 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <h3 className="font-medium text-white text-sm">Deadlines</h3>
          {overdueTasks.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {overdueTasks.length} overdue
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3">
          {upcomingTasks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No upcoming deadlines</p>
              <p className="text-gray-600 text-xs mt-1">
                Tasks with due dates will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingTasks.map((task) => {
                const dueInfo = formatDueDate(task);
                return (
                  <button
                    key={task.id}
                    onClick={() => navigate('/tasks')}
                    className="w-full text-left p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white truncate flex-1">{task.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${dueInfo.color}`}>
                        {dueInfo.text}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
