import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { signOut } from '../../services/auth';
import { subscribeToUserInvites, acceptInvite, declineInvite } from '../../services/invites';
import { subscribeToNotifications, markAsRead, markAllAsRead } from '../../services/notifications';
import SearchModal from '../search/SearchModal';
import type { ProjectInvite, Notification } from '../../types';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { currentUser, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Keyboard shortcut for search (Ctrl/Cmd + K)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowSearch(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!userProfile?.email) return;

    const unsubscribe = subscribeToUserInvites(userProfile.email, setInvites);
    return () => unsubscribe();
  }, [userProfile?.email]);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToNotifications(currentUser.uid, setNotifications);
    return () => unsubscribe();
  }, [currentUser?.uid]);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  async function handleAcceptInvite(invite: ProjectInvite) {
    if (!currentUser) return;
    setProcessingInvite(invite.id);
    try {
      await acceptInvite(invite.id, invite.projectId, currentUser.uid);
    } catch (err) {
      console.error('Failed to accept invite:', err);
    } finally {
      setProcessingInvite(null);
    }
  }

  async function handleDeclineInvite(invite: ProjectInvite) {
    setProcessingInvite(invite.id);
    try {
      await declineInvite(invite.id);
    } catch (err) {
      console.error('Failed to decline invite:', err);
    } finally {
      setProcessingInvite(null);
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    await markAsRead(notificationId);
  }

  async function handleMarkAllAsRead() {
    if (!currentUser) return;
    await markAllAsRead(currentUser.uid);
  }

  const unreadNotifications = notifications.filter((n) => !n.read);
  const totalUnread = invites.length + unreadNotifications.length;

  return (
    <header className="h-14 glass-dark flex items-center justify-between px-4 md:px-6 border-b border-white/5 relative z-50">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full px-4 py-2 pl-10 bg-white/5 border border-white/10 rounded-full text-gray-500 text-left text-sm hover:bg-white/10 hover:border-white/20 transition-colors relative"
          >
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search...
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-xs bg-white/10 rounded border border-white/10 hidden md:inline">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Emoji Picker Button */}
        <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <span className="text-xl">😊</span>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5 relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                {totalUnread > 9 ? '9+' : totalUnread}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 glass rounded-xl shadow-2xl z-[100] animate-scale-in overflow-hidden">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <p className="text-white font-semibold">Notifications</p>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-auto">
                {/* Invites Section */}
                {invites.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-white/5">
                      <p className="text-xs text-gray-400 uppercase font-medium">Project Invites</p>
                    </div>
                    {invites.map((invite) => (
                      <div key={invite.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors">
                        <p className="text-white text-sm font-medium mb-1">
                          {invite.projectName}
                        </p>
                        <p className="text-gray-400 text-xs mb-3">
                          Invited by {invite.invitedByName}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(invite)}
                            disabled={processingInvite === invite.id}
                            className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(invite)}
                            disabled={processingInvite === invite.id}
                            className="flex-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Task Notifications Section */}
                {notifications.length > 0 && (
                  <div>
                    {invites.length > 0 && (
                      <div className="px-4 py-2 bg-white/5">
                        <p className="text-xs text-gray-400 uppercase font-medium">Notifications</p>
                      </div>
                    )}
                    {notifications.slice(0, 10).map((notification) => (
                      <Link
                        key={notification.id}
                        to="/tasks"
                        onClick={() => {
                          if (!notification.read) {
                            handleMarkAsRead(notification.id);
                          }
                          setShowNotifications(false);
                        }}
                        className={`block p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                          !notification.read ? 'bg-purple-500/10' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {!notification.read && (
                            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          )}
                          <div className={notification.read ? 'ml-5' : ''}>
                            <p className="text-white text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {invites.length === 0 && notifications.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">🔔</p>
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {/* User Menu */}
        <div className="relative ml-2">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 transition-colors"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-medium text-sm">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 status-online rounded-full border-2 border-[#2d2a4a]"></div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-2xl z-[100] animate-scale-in overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-white font-medium">{userProfile?.displayName}</p>
                    <p className="text-gray-400 text-xs truncate">{userProfile?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowUserMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  View Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Modal */}
      <SearchModal isOpen={showSearch} onClose={() => setShowSearch(false)} />
    </header>
  );
}
