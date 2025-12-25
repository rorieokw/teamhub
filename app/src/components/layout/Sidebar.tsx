import { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAdmin } from '../../hooks/useAdmin';
import { updateQuickActions } from '../../services/users';
import { subscribeToAppSettings } from '../../services/settings';
import QuickActionsEditor, { ALL_QUICK_ACTIONS, DEFAULT_QUICK_ACTIONS } from './QuickActionsEditor';
import type { AppSettings } from '../../types';

// Modern SVG icons as components
const icons = {
  dashboard: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  projects: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  ),
  tasks: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  calendar: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
    </svg>
  ),
  chat: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  documents: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  settings: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  admin: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  games: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4" />
      <path d="M8 10v4" />
      <circle cx="17" cy="10" r="1" />
      <circle cx="15" cy="12" r="1" />
    </svg>
  ),
};

const navItems = [
  { path: '/', label: 'Dashboard', icon: icons.dashboard, color: 'from-green-500 to-emerald-600' },
  { path: '/projects', label: 'Projects', icon: icons.projects, color: 'from-blue-500 to-cyan-600' },
  { path: '/tasks', label: 'Tasks', icon: icons.tasks, color: 'from-orange-500 to-amber-600' },
  { path: '/calendar', label: 'Calendar', icon: icons.calendar, color: 'from-indigo-500 to-violet-600' },
  { path: '/chat', label: 'Chat', icon: icons.chat, color: 'from-purple-500 to-pink-600' },
  { path: '/documents', label: 'Documents', icon: icons.documents, color: 'from-red-500 to-rose-600' },
  { path: '/settings', label: 'Settings', icon: icons.settings, color: 'from-gray-500 to-slate-600' },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const { isAdmin } = useAdmin();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showQuickActionsEditor, setShowQuickActionsEditor] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  // Subscribe to app settings
  useEffect(() => {
    const unsubscribe = subscribeToAppSettings(setAppSettings);
    return () => unsubscribe();
  }, []);

  // Get user's saved quick actions or use defaults
  const userQuickActionIds = userProfile?.quickActions || DEFAULT_QUICK_ACTIONS;

  // Close quick menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setShowQuickMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build quick actions from user's saved preferences
  const quickActions = userQuickActionIds
    .map((actionId) => {
      const action = ALL_QUICK_ACTIONS.find((a) => a.id === actionId);
      if (!action) return null;
      return {
        id: action.id,
        label: action.label,
        icon: action.icon,
        color: action.color,
        action: () => {
          navigate(action.path);
          setShowQuickMenu(false);
        },
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      label: string;
      icon: React.ReactNode;
      color: string;
      action: () => void;
    }>;

  // Handle saving quick actions
  const handleSaveQuickActions = async (actions: string[]) => {
    if (currentUser) {
      await updateQuickActions(currentUser.uid, actions);
    }
  };

  // Build nav items based on settings and permissions
  const allNavItems = [
    ...navItems,
    // Add games if enabled
    ...(appSettings?.gamesEnabled ?? true
      ? [{ path: '/games', label: 'Games', icon: icons.games, color: 'from-pink-500 to-rose-600' }]
      : []),
    // Add admin if user is admin
    ...(isAdmin
      ? [{ path: '/admin', label: 'Admin', icon: icons.admin, color: 'from-orange-500 to-red-600' }]
      : []),
  ];

  return (
    <div
      className="relative h-full"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Icon Rail - Always visible */}
      <div className="w-[72px] h-full sidebar-rail flex flex-col items-center py-3 gap-2">
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl mb-2 hover:rounded-xl transition-all duration-200 cursor-pointer">
          T
        </div>

        <div className="w-8 h-[2px] bg-gray-600 rounded-full mb-2"></div>

        {/* Nav Icons */}
        {allNavItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="group relative h-12 flex items-center justify-center"
            >
              <div
                className={`w-12 h-12 flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${item.color} rounded-xl text-white shadow-lg`
                    : 'nav-icon-bg rounded-full hover:rounded-xl text-gray-400 hover:text-white'
                }`}
              >
                {item.icon}
              </div>

              {/* Active indicator */}
              <div
                className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-1 rounded-r-full bg-white transition-all duration-200 ${
                  isActive ? 'h-10' : 'h-0 group-hover:h-5'
                }`}
              ></div>

              {/* Tooltip - only show when not expanded */}
              {!isExpanded && (
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-3 py-2 sidebar-tooltip text-sm font-medium rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 sidebar-tooltip rotate-45"></div>
                </div>
              )}
            </NavLink>
          );
        })}

        <div className="flex-1"></div>

        {/* Add New Button with Quick Menu */}
        <div className="relative" ref={quickMenuRef}>
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className={`w-12 h-12 rounded-full nav-icon-bg hover:bg-green-600 hover:rounded-xl flex items-center justify-center text-green-500 hover:text-white transition-all duration-200 ${
              showQuickMenu ? 'bg-green-600 rounded-xl text-white' : ''
            }`}
          >
            <svg
              className={`w-6 h-6 transition-transform duration-200 ${showQuickMenu ? 'rotate-45' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Quick Action Menu */}
          {showQuickMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-48 glass rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-scale-in z-50">
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quick Actions</p>
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-white/10 rounded-lg transition-colors group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      {action.icon}
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
                {/* Edit Quick Actions Button */}
                <div className="border-t border-white/10 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setShowQuickMenu(false);
                      setShowQuickActionsEditor(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span className="text-sm">Customize...</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="relative mt-2 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold cursor-pointer hover:rounded-xl transition-all duration-200">
            {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 status-online rounded-full border-4 border-theme"></div>
        </div>
      </div>

      {/* Expanded Panel - Shows on hover */}
      <div
        className={`absolute left-[72px] top-0 h-full w-44 sidebar-expanded backdrop-blur-xl z-40 transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
      >
        {/* Match the icon rail layout exactly */}
        <div className="flex flex-col py-3 gap-2 h-full">
          {/* Spacer for logo area */}
          <div className="h-12 flex items-center px-4 mb-2">
            <h1 className="text-lg font-bold text-theme-primary">TeamHub</h1>
          </div>

          {/* Spacer for divider */}
          <div className="h-[2px] mb-2"></div>

          {/* Nav Labels - aligned with icons */}
          {allNavItems.map((item) => {
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`h-12 flex items-center px-4 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-500/20 text-theme-primary'
                    : 'text-theme-secondary hover:bg-white/5 hover:text-theme-primary'
                }`}
              >
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                )}
              </NavLink>
            );
          })}

          <div className="flex-1"></div>

          {/* Spacer for add button */}
          <div className="h-12"></div>

          {/* User Info - aligned with avatar */}
          <div className="h-12 flex items-center px-4 mt-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-theme-primary truncate">
                {userProfile?.displayName || 'User'}
              </p>
              <span className="text-xs text-green-400">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Editor Modal */}
      <QuickActionsEditor
        isOpen={showQuickActionsEditor}
        onClose={() => setShowQuickActionsEditor(false)}
        selectedActions={userQuickActionIds}
        onSave={handleSaveQuickActions}
      />
    </div>
  );
}
