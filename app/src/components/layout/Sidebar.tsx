import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '🏠', color: 'from-green-500 to-emerald-600' },
  { path: '/projects', label: 'Projects', icon: '📁', color: 'from-blue-500 to-cyan-600' },
  { path: '/tasks', label: 'Tasks', icon: '✓', color: 'from-orange-500 to-amber-600' },
  { path: '/chat', label: 'Chat', icon: '💬', color: 'from-purple-500 to-pink-600' },
  { path: '/documents', label: 'Documents', icon: '📄', color: 'from-red-500 to-rose-600' },
  { path: '/settings', label: 'Settings', icon: '⚙️', color: 'from-gray-500 to-slate-600' },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { userProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

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
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="group relative"
            >
              <div
                className={`w-12 h-12 flex items-center justify-center text-xl transition-all duration-200 ${
                  isActive
                    ? `bg-gradient-to-br ${item.color} rounded-xl`
                    : 'nav-icon-bg rounded-full hover:rounded-xl'
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

        {/* Add New Button */}
        <button className="w-12 h-12 rounded-full nav-icon-bg hover:bg-green-600 hover:rounded-xl flex items-center justify-center text-2xl text-green-500 hover:text-white transition-all duration-200">
          +
        </button>

        {/* User Avatar */}
        <div className="relative mt-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold cursor-pointer hover:rounded-xl transition-all duration-200">
            {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="absolute bottom-0 right-0 w-4 h-4 status-online rounded-full border-4 border-theme"></div>
        </div>
      </div>

      {/* Expanded Panel - Shows on hover */}
      <div
        className={`absolute left-[72px] top-0 h-full w-56 sidebar-expanded backdrop-blur-xl z-40 transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-theme-subtle">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-theme-primary">TeamHub</h1>
          </div>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="mb-4">
            <p className="px-3 py-2 text-xs font-semibold text-theme-muted uppercase tracking-wider">
              Navigation
            </p>
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500/20 text-theme-primary'
                          : 'text-theme-secondary hover:bg-white/5 hover:text-theme-primary'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-theme-subtle">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 status-online rounded-full border-2 border-theme"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-theme-primary truncate">
                {userProfile?.displayName || 'User'}
              </p>
              <p className="text-xs text-theme-muted">Online</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
