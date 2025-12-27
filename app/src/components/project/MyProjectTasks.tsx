import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Task, User } from '../../types';

interface MyProjectTasksProps {
  tasks: Task[];
  currentUserId: string;
  members: User[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function MyProjectTasks({
  tasks,
  currentUserId,
  members,
  collapsed = false,
  onToggleCollapse,
}: MyProjectTasksProps) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  // Filter tasks based on selection
  const filteredTasks = filter === 'mine'
    ? tasks.filter((task) => {
        const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
        return assignees.includes(currentUserId);
      })
    : tasks;

  // Group by status
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in-progress');

  const getMember = (id: string) => members.find((m) => m.id === id);

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-500/20';
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  const totalActive = todoTasks.length + inProgressTasks.length;

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800/80 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-medium text-white text-sm">
            {filter === 'mine' ? 'My Tasks' : 'All Tasks'}
          </h3>
          {totalActive > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
              {totalActive}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3">
          {/* Filter Toggle */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setFilter('mine')}
              className={`flex-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                filter === 'mine'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              Mine
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Task List */}
          {totalActive === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                {filter === 'mine' ? 'No tasks assigned to you' : 'No active tasks'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* In Progress */}
              {inProgressTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate('/tasks')}
                  className="w-full text-left p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {filter === 'all' && (
                          <div className="flex -space-x-1">
                            {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
                              .slice(0, 2)
                              .map((id) => {
                                const member = getMember(id);
                                return member ? (
                                  <div
                                    key={id}
                                    className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px] text-white border border-gray-800"
                                    title={member.displayName}
                                  >
                                    {member.displayName?.charAt(0).toUpperCase()}
                                  </div>
                                ) : null;
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {/* To Do */}
              {todoTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => navigate('/tasks')}
                  className="w-full text-left p-2 bg-gray-700/30 border border-gray-600/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 bg-gray-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {filter === 'all' && (
                          <div className="flex -space-x-1">
                            {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
                              .slice(0, 2)
                              .map((id) => {
                                const member = getMember(id);
                                return member ? (
                                  <div
                                    key={id}
                                    className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center text-[8px] text-white border border-gray-800"
                                    title={member.displayName}
                                  >
                                    {member.displayName?.charAt(0).toUpperCase()}
                                  </div>
                                ) : null;
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
