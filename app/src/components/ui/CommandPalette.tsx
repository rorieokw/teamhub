import { useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Project, User, Task } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  users: User[];
  tasks: Task[];
}

interface CommandItem {
  id: string;
  type: 'page' | 'project' | 'task' | 'user' | 'action';
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action: () => void;
}

// Static pages
const PAGES = [
  { id: 'dashboard', title: 'Dashboard', path: '/', icon: '🏠' },
  { id: 'projects', title: 'Projects', path: '/projects', icon: '📁' },
  { id: 'tasks', title: 'Tasks', path: '/tasks', icon: '✅' },
  { id: 'chat', title: 'Chat', path: '/chat', icon: '💬' },
  { id: 'documents', title: 'Documents', path: '/documents', icon: '📄' },
  { id: 'calendar', title: 'Calendar', path: '/calendar', icon: '📅' },
  { id: 'settings', title: 'Settings', path: '/settings', icon: '⚙️' },
  { id: 'profile', title: 'Profile', path: '/profile', icon: '👤' },
];

export default function CommandPalette({ isOpen, onClose, projects, users, tasks }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items
  const buildCommands = useCallback((): CommandItem[] => {
    const commands: CommandItem[] = [];

    // Pages
    PAGES.forEach(page => {
      commands.push({
        id: `page-${page.id}`,
        type: 'page',
        title: page.title,
        subtitle: `Go to ${page.title}`,
        icon: <span className="text-lg">{page.icon}</span>,
        action: () => {
          navigate(page.path);
          onClose();
        },
      });
    });

    // Projects
    projects.forEach(project => {
      commands.push({
        id: `project-${project.id}`,
        type: 'project',
        title: project.name,
        subtitle: project.description?.slice(0, 50) || 'Project',
        icon: (
          <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
        ),
        action: () => {
          navigate(`/projects/${project.id}`);
          onClose();
        },
      });
    });

    // Tasks
    tasks.slice(0, 20).forEach(task => {
      const statusColors: Record<string, string> = {
        'todo': 'text-gray-400',
        'in-progress': 'text-blue-400',
        'done': 'text-green-400',
      };
      commands.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: task.status.replace('-', ' '),
        icon: (
          <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
            <svg className={`w-4 h-4 ${statusColors[task.status]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ),
        action: () => {
          navigate(`/projects/${task.projectId}?task=${task.id}`);
          onClose();
        },
      });
    });

    // Users
    users.forEach(user => {
      commands.push({
        id: `user-${user.id}`,
        type: 'user',
        title: user.displayName,
        subtitle: user.title || user.email,
        icon: (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
            {user.avatarUrl?.startsWith('http') ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              user.avatarUrl || user.displayName?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
        ),
        action: () => {
          navigate(`/chat?dm=${user.id}`);
          onClose();
        },
      });
    });

    // Quick actions
    commands.push({
      id: 'action-new-project',
      type: 'action',
      title: 'Create New Project',
      subtitle: 'Start a new project',
      icon: (
        <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      ),
      action: () => {
        navigate('/projects?new=true');
        onClose();
      },
    });

    return commands;
  }, [projects, users, tasks, navigate, onClose]);

  // Filter commands based on query
  const filteredCommands = useCallback(() => {
    const commands = buildCommands();
    if (!query.trim()) {
      // Show pages and recent items when no query
      return commands.filter(c => c.type === 'page' || c.type === 'action').slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(lowerQuery) ||
      cmd.subtitle?.toLowerCase().includes(lowerQuery)
    ).slice(0, 15);
  }, [query, buildCommands]);

  const items = filteredCommands();

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && items.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, items.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [items, selectedIndex, onClose]);

  if (!isOpen) return null;

  // Group items by type for display
  const groupedItems: { type: string; label: string; items: CommandItem[] }[] = [];
  const typeOrder = ['page', 'action', 'project', 'task', 'user'];
  const typeLabels: Record<string, string> = {
    page: 'Pages',
    action: 'Quick Actions',
    project: 'Projects',
    task: 'Tasks',
    user: 'Users',
  };

  typeOrder.forEach(type => {
    const typeItems = items.filter(i => i.type === type);
    if (typeItems.length > 0) {
      groupedItems.push({ type, label: typeLabels[type], items: typeItems });
    }
  });

  // Calculate flat index for each item
  let flatIndex = 0;
  const itemsWithIndex = groupedItems.map(group => ({
    ...group,
    items: group.items.map(item => ({ ...item, flatIndex: flatIndex++ })),
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl mx-4 animate-scale-in">
        <div className="glass rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, projects, tasks, users..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-gray-500 bg-white/5 rounded border border-white/10">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
            {items.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              itemsWithIndex.map((group) => (
                <div key={group.type} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(item.flatIndex)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        selectedIndex === item.flatIndex
                          ? 'bg-purple-500/20 text-white'
                          : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {selectedIndex === item.flatIndex && (
                        <kbd className="hidden sm:block px-2 py-0.5 text-xs text-gray-500 bg-white/5 rounded">
                          Enter
                        </kbd>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 rounded">Enter</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded">Ctrl</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/5 rounded">K</kbd>
              to open
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
