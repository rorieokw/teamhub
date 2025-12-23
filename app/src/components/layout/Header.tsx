import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { signOut } from '../../services/auth';
import { subscribeToUserInvites, acceptInvite, declineInvite } from '../../services/invites';
import { subscribeToNotifications, markAsRead, markAllAsRead } from '../../services/notifications';
import QuickChatPopup from '../chat/QuickChatPopup';
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
  const [showQuickChat, setShowQuickChat] = useState(false);

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

  // Separate DM notifications from other notifications
  const dmNotifications = notifications.filter((n) => n.type === 'direct-message');
  const otherNotifications = notifications.filter((n) => n.type !== 'direct-message');

  const unreadDMs = dmNotifications.filter((n) => !n.read);
  const unreadOtherNotifications = otherNotifications.filter((n) => !n.read);
  const totalUnread = invites.length + unreadOtherNotifications.length;

  // Get icon for notification type
  function getNotificationIcon(type: Notification['type']): JSX.Element {
    const iconClass = "w-5 h-5 flex-shrink-0";

    switch (type) {
      case 'mention':
        return (
          <span className={`${iconClass} flex items-center justify-center text-blue-400 font-bold text-sm`}>@</span>
        );
      case 'chess-challenge':
        return (
          <svg className={`${iconClass} text-amber-400`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 22H5v-2h14v2M17.16 8.26A8.94 8.94 0 0 1 21 15c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2 0-3.25 1.5-6.17 3.84-8.26A4.97 4.97 0 0 0 7 6c0-2.21 1.79-4 4-4h2c2.21 0 4 1.79 4 4 0 .71-.21 1.39-.58 1.97l-.26.29M12 4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        );
      case 'coinflip-challenge':
        return (
          <svg className={`${iconClass} text-yellow-400`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/>
          </svg>
        );
      case 'task-assigned':
        return (
          <svg className={`${iconClass} text-green-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'comment':
        return (
          <svg className={`${iconClass} text-cyan-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
      case 'reaction':
        return (
          <svg className={`${iconClass} text-pink-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'poll-closed':
        return (
          <svg className={`${iconClass} text-indigo-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'project-update':
        return (
          <svg className={`${iconClass} text-orange-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'new-user-signup':
        return (
          <svg className={`${iconClass} text-emerald-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        );
    }
  }

  // Get the correct URL for a notification based on its type
  function getNotificationUrl(notification: Notification): string {
    const data = notification.data as Record<string, string> | undefined;

    switch (notification.type) {
      case 'mention':
      case 'direct-message':
      case 'reaction':
      case 'poll-closed':
        // Navigate to chat - the channelId is stored in data
        return '/chat';
      case 'task-assigned':
      case 'comment':
        // Navigate to tasks page
        return '/tasks';
      case 'project-update':
        // Navigate to the specific project
        if (data?.projectId) {
          return `/projects/${data.projectId}`;
        }
        return '/projects';
      case 'new-user-signup':
        // Navigate to admin panel security tab
        return '/admin';
      case 'chess-challenge':
      case 'coinflip-challenge':
        // Navigate to dashboard where games are displayed
        return '/dashboard';
      default:
        return '/';
    }
  }

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
            onClick={() => {
              // Dispatch Ctrl+K event to open command palette
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
            }}
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
                {unreadOtherNotifications.length > 0 && (
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

                {/* Task Notifications Section (excludes DMs - those show on Quick Chat) */}
                {otherNotifications.length > 0 && (
                  <div>
                    {invites.length > 0 && (
                      <div className="px-4 py-2 bg-white/5">
                        <p className="text-xs text-gray-400 uppercase font-medium">Notifications</p>
                      </div>
                    )}
                    {otherNotifications.slice(0, 10).map((notification) => (
                      <Link
                        key={notification.id}
                        to={getNotificationUrl(notification)}
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
                          {/* Notification type icon */}
                          <div className="relative flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                            {!notification.read && (
                              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-purple-500 rounded-full"></span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-purple-400/70 mt-1">
                              {notification.type === 'mention' && 'Go to Chat'}
                              {notification.type === 'reaction' && 'Go to Chat'}
                              {notification.type === 'poll-closed' && 'Go to Chat'}
                              {notification.type === 'task-assigned' && 'Go to Tasks'}
                              {notification.type === 'comment' && 'Go to Tasks'}
                              {notification.type === 'project-update' && 'Go to Project'}
                              {notification.type === 'new-user-signup' && 'Go to Admin Panel'}
                              {notification.type === 'chess-challenge' && 'Go to Dashboard'}
                              {notification.type === 'coinflip-challenge' && 'Go to Dashboard'}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {invites.length === 0 && otherNotifications.length === 0 && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-2xl mb-2">🔔</p>
                    <p>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Messages / Quick Chat */}
        <button
          onClick={() => {
            setShowQuickChat(!showQuickChat);
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
          className={`p-2 transition-colors rounded-lg relative ${
            showQuickChat
              ? 'text-purple-400 bg-purple-500/20'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
          title="Quick Chat"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadDMs.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
              {unreadDMs.length > 9 ? '9+' : unreadDMs.length}
            </span>
          )}
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
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-medium text-sm overflow-hidden">
                {userProfile?.avatarUrl?.startsWith('http') ? (
                  <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : userProfile?.avatarUrl ? (
                  <span className="text-base">{userProfile.avatarUrl}</span>
                ) : (
                  userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 status-online rounded-full border-2 border-[#2d2a4a]"></div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-2xl z-[100] animate-scale-in overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden">
                    {userProfile?.avatarUrl?.startsWith('http') ? (
                      <img src={userProfile.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : userProfile?.avatarUrl ? (
                      <span className="text-lg">{userProfile.avatarUrl}</span>
                    ) : (
                      userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-white font-medium">{userProfile?.displayName}</p>
                    {userProfile?.title && (
                      <p className="text-purple-400 text-xs font-medium">{userProfile.title}</p>
                    )}
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

      {/* Quick Chat Popup */}
      <QuickChatPopup isOpen={showQuickChat} onClose={() => setShowQuickChat(false)} />
    </header>
  );
}
