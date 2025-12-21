import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import type { Task, Project, User } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    projectId: string;
    assignedTo: string;
    priority: Task['priority'];
    status: Task['status'];
    dueDate?: Date;
    blockedBy?: string[];
  }) => Promise<void>;
  task?: Task | null;
  projects: Project[];
  members: User[];
  allTasks?: Task[]; // All tasks for blocking selection
  defaultProjectId?: string;
  title: string;
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  projects,
  members,
  allTasks = [],
  defaultProjectId,
  title,
}: TaskModalProps) {
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [dueDate, setDueDate] = useState('');
  const [blockedBy, setBlockedBy] = useState<string[]>([]);
  const [showBlockerSelector, setShowBlockerSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTaskTitle(task.title);
      setDescription(task.description || '');
      setProjectId(task.projectId);
      setAssignedTo(task.assignedTo);
      setPriority(task.priority);
      setStatus(task.status);
      setBlockedBy(task.blockedBy || []);
      if (task.dueDate) {
        const date = task.dueDate.toDate();
        setDueDate(date.toISOString().split('T')[0]);
      } else {
        setDueDate('');
      }
    } else {
      setTaskTitle('');
      setDescription('');
      setProjectId(defaultProjectId || (projects[0]?.id || ''));
      setAssignedTo(members[0]?.id || '');
      setPriority('medium');
      setStatus('todo');
      setDueDate('');
      setBlockedBy([]);
    }
    setError('');
    setShowBlockerSelector(false);
  }, [task, isOpen, projects, members, defaultProjectId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!taskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    if (!projectId) {
      setError('Please select a project');
      return;
    }

    if (!assignedTo) {
      setError('Please assign the task to someone');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        title: taskTitle,
        description,
        projectId,
        assignedTo,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        blockedBy: blockedBy.length > 0 ? blockedBy : undefined,
      });
      onClose();
    } catch (err) {
      setError('Failed to save task. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  // Filter members based on selected project
  const selectedProject = projects.find((p) => p.id === projectId);
  const projectMembers = selectedProject
    ? members.filter((m) => selectedProject.members.includes(m.id))
    : members;

  const inputClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all";
  const selectClasses = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 glass-dark">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Task Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className={inputClasses}
              placeholder="What needs to be done?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={`${inputClasses} resize-none`}
              placeholder="Add more details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project <span className="text-red-400">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setAssignedTo(''); // Reset assignee when project changes
                }}
                className={selectClasses}
              >
                <option value="" className="bg-[#2d2a4a]">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id} className="bg-[#2d2a4a]">
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign To <span className="text-red-400">*</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={selectClasses}
              >
                <option value="" className="bg-[#2d2a4a]">Select person</option>
                {projectMembers.map((member) => (
                  <option key={member.id} value={member.id} className="bg-[#2d2a4a]">
                    {member.displayName}{member.title ? ` (${member.title})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className={selectClasses}
              >
                <option value="low" className="bg-[#2d2a4a]">Low</option>
                <option value="medium" className="bg-[#2d2a4a]">Medium</option>
                <option value="high" className="bg-[#2d2a4a]">High</option>
                <option value="urgent" className="bg-[#2d2a4a]">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className={selectClasses}
              >
                <option value="todo" className="bg-[#2d2a4a]">To Do</option>
                <option value="in-progress" className="bg-[#2d2a4a]">In Progress</option>
                <option value="done" className="bg-[#2d2a4a]">Done</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClasses}
            />
          </div>

          {/* Blocked By Section */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Blocked By
            </label>

            {/* Show selected blockers */}
            {blockedBy.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {blockedBy.map((blockerId) => {
                  const blockerTask = allTasks.find((t) => t.id === blockerId);
                  const assignee = members.find((m) => m.id === blockerTask?.assignedTo);
                  return (
                    <div
                      key={blockerId}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-sm"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span className="text-red-300 truncate max-w-[150px]">
                        {blockerTask?.title || 'Unknown task'}
                      </span>
                      {assignee && (
                        <span className="text-red-400/60 text-xs">
                          ({assignee.displayName?.split(' ')[0]})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setBlockedBy(blockedBy.filter((id) => id !== blockerId))}
                        className="text-red-400 hover:text-red-300 ml-1"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Blocker selector dropdown */}
            {showBlockerSelector ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                {allTasks
                  .filter((t) => t.id !== task?.id && t.status !== 'done' && !blockedBy.includes(t.id))
                  .map((t) => {
                    const assignee = members.find((m) => m.id === t.assignedTo);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setBlockedBy([...blockedBy, t.id]);
                          setShowBlockerSelector(false);
                        }}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          t.priority === 'urgent' ? 'bg-red-500' :
                          t.priority === 'high' ? 'bg-orange-500' :
                          t.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{t.title}</p>
                          <p className="text-gray-500 text-xs">
                            {assignee?.displayName || 'Unassigned'} • {t.status.replace('-', ' ')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                {allTasks.filter((t) => t.id !== task?.id && t.status !== 'done' && !blockedBy.includes(t.id)).length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-2">No available tasks to block</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowBlockerSelector(false)}
                  className="w-full text-center text-gray-400 hover:text-gray-300 text-xs mt-2"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowBlockerSelector(true)}
                className="w-full px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-400 hover:text-white text-sm transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {blockedBy.length > 0 ? 'Add Another Blocker' : 'Add Blocker Task'}
              </button>
            )}

            {blockedBy.length > 0 && (
              <p className="text-xs text-red-400/70 mt-2 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                This task is blocked until the above tasks are completed
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg shadow-green-500/25 disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
