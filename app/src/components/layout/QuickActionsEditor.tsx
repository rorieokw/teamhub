import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// All available quick actions
export const ALL_QUICK_ACTIONS = [
  {
    id: 'new-project',
    label: 'New Project',
    description: 'Create a new project',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
        <path d="M12 11v4" />
        <path d="M10 13h4" />
      </svg>
    ),
    color: 'from-blue-500 to-cyan-500',
    path: '/projects?new=true',
  },
  {
    id: 'new-task',
    label: 'New Task',
    description: 'Create a new task',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-500',
    path: '/tasks?new=true',
  },
  {
    id: 'new-event',
    label: 'New Event',
    description: 'Add calendar event',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
        <path d="M12 14v4" />
        <path d="M10 16h4" />
      </svg>
    ),
    color: 'from-indigo-500 to-violet-500',
    path: '/calendar?new=true',
  },
  {
    id: 'new-document',
    label: 'New Document',
    description: 'Upload a document',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14,2 14,8 20,8" />
        <path d="M12 12v6" />
        <path d="M9 15h6" />
      </svg>
    ),
    color: 'from-red-500 to-rose-500',
    path: '/documents?new=true',
  },
  {
    id: 'new-poll',
    label: 'New Poll',
    description: 'Create a poll',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    color: 'from-purple-500 to-pink-500',
    path: '/chat?poll=true',
  },
  {
    id: 'open-chat',
    label: 'Open Chat',
    description: 'Go to team chat',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
    color: 'from-green-500 to-emerald-500',
    path: '/chat',
  },
  {
    id: 'view-calendar',
    label: 'View Calendar',
    description: 'Open calendar view',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </svg>
    ),
    color: 'from-teal-500 to-cyan-500',
    path: '/calendar',
  },
  {
    id: 'view-tasks',
    label: 'My Tasks',
    description: 'View your tasks',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    color: 'from-yellow-500 to-orange-500',
    path: '/tasks',
  },
  {
    id: 'view-projects',
    label: 'All Projects',
    description: 'View all projects',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      </svg>
    ),
    color: 'from-sky-500 to-blue-500',
    path: '/projects',
  },
  {
    id: 'view-profile',
    label: 'My Profile',
    description: 'View your profile',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-500',
    path: '/profile',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Open settings',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    color: 'from-gray-500 to-slate-500',
    path: '/settings',
  },
];

// Default quick actions for new users
export const DEFAULT_QUICK_ACTIONS = [
  'new-project',
  'new-task',
  'new-event',
  'new-document',
  'new-poll',
  'open-chat',
];

interface QuickActionsEditorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedActions: string[];
  onSave: (actions: string[]) => void;
}

export default function QuickActionsEditor({
  isOpen,
  onClose,
  selectedActions,
  onSave,
}: QuickActionsEditorProps) {
  const [selected, setSelected] = useState<string[]>(selectedActions);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  useEffect(() => {
    setSelected(selectedActions);
  }, [selectedActions, isOpen]);

  const handleToggle = (actionId: string) => {
    if (selected.includes(actionId)) {
      setSelected(selected.filter((id) => id !== actionId));
    } else if (selected.length < 8) {
      setSelected([...selected, actionId]);
    }
  };

  const handleDragStart = (e: React.DragEvent, actionId: string) => {
    setDraggedItem(actionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, actionId: string) => {
    e.preventDefault();
    if (draggedItem === actionId) return;

    const draggedIndex = selected.indexOf(draggedItem!);
    const targetIndex = selected.indexOf(actionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSelected = [...selected];
    newSelected.splice(draggedIndex, 1);
    newSelected.splice(targetIndex, 0, draggedItem!);
    setSelected(newSelected);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const moveItem = (actionId: string, direction: 'up' | 'down') => {
    const index = selected.indexOf(actionId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === selected.length - 1) return;

    const newSelected = [...selected];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [newSelected[index], newSelected[newIndex]] = [newSelected[newIndex], newSelected[index]];
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSave(selected);
    onClose();
  };

  const handleReset = () => {
    setSelected(DEFAULT_QUICK_ACTIONS);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
      <div className="glass-card rounded-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Customize Quick Actions</h2>
            <p className="text-sm text-gray-400">Select up to 8 actions and drag to reorder</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Selected Actions */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Your Quick Actions ({selected.length}/8)
            </h3>
            {selected.length === 0 ? (
              <p className="text-gray-500 text-sm p-4 text-center bg-white/5 rounded-lg">
                No actions selected. Choose from below.
              </p>
            ) : (
              <div className="space-y-2">
                {selected.map((actionId, index) => {
                  const action = ALL_QUICK_ACTIONS.find((a) => a.id === actionId);
                  if (!action) return null;
                  return (
                    <div
                      key={actionId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, actionId)}
                      onDragOver={(e) => handleDragOver(e, actionId)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10 cursor-move group transition-all ${
                        draggedItem === actionId ? 'opacity-50 scale-95' : ''
                      }`}
                    >
                      <div className="text-gray-500 cursor-grab active:cursor-grabbing">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                      </div>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{action.label}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveItem(actionId, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveItem(actionId, 'down')}
                          disabled={index === selected.length - 1}
                          className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggle(actionId)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Actions */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Available Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {ALL_QUICK_ACTIONS.filter((a) => !selected.includes(a.id)).map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleToggle(action.id)}
                  disabled={selected.length >= 8}
                  className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{action.label}</p>
                    <p className="text-xs text-gray-500 truncate">{action.description}</p>
                  </div>
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Reset to Default
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all text-sm"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
