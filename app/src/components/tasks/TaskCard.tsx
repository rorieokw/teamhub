import TaskComments from './TaskComments';
import type { Task, User, Project } from '../../types';

interface TaskCardProps {
  task: Task;
  assignee?: User;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, status: Task['status']) => void;
  showProject?: boolean;
  showComments?: boolean;
  isDragging?: boolean;
}

const priorityConfig = {
  low: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30', label: 'Low' },
  medium: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Medium' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: 'High' },
  urgent: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: 'Urgent' },
};

export default function TaskCard({
  task,
  assignee,
  project,
  onEdit,
  onDelete,
  onStatusChange,
  showProject = true,
  showComments = true,
  isDragging = false,
}: TaskCardProps) {
  const isOverdue =
    task.dueDate &&
    task.status !== 'done' &&
    task.dueDate.toDate() < new Date();

  const formatDate = (timestamp: { toDate: () => Date }) => {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div className={`glass-card rounded-xl p-4 hover:bg-white/5 transition-all group ${isDragging ? 'opacity-50 ring-2 ring-purple-500' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-white font-medium text-sm flex-1 group-hover:text-purple-300 transition-colors">
          {task.title}
        </h4>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Edit"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(task)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Delete"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {task.description && (
        <p className="text-gray-500 text-xs mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {showProject && project && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          {project.name}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priority.bg} ${priority.text} ${priority.border}`}
          >
            {priority.label}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-400' : 'text-gray-500'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Assignee */}
        {assignee && (
          <div
            className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow-lg shadow-purple-500/25"
            title={assignee.displayName}
          >
            {assignee.displayName?.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Quick Status Change */}
      <div className="pt-3 border-t border-white/10 flex gap-2">
        {task.status !== 'todo' && (
          <button
            onClick={() => onStatusChange(task, 'todo')}
            className="flex-1 px-2 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors font-medium"
          >
            To Do
          </button>
        )}
        {task.status !== 'in-progress' && (
          <button
            onClick={() => onStatusChange(task, 'in-progress')}
            className="flex-1 px-2 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors font-medium"
          >
            In Progress
          </button>
        )}
        {task.status !== 'done' && (
          <button
            onClick={() => onStatusChange(task, 'done')}
            className="flex-1 px-2 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors font-medium"
          >
            Done
          </button>
        )}
      </div>

      {/* Task Comments */}
      {showComments && project && (
        <TaskComments task={task} projectName={project.name} />
      )}
    </div>
  );
}
