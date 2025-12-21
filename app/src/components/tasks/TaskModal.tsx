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
  }) => Promise<void>;
  task?: Task | null;
  projects: Project[];
  members: User[];
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
    }
    setError('');
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
                    {member.displayName}
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
