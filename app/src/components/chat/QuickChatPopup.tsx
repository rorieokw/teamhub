import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToAllUsers } from '../../services/users';
import {
  subscribeToMessages,
  sendMessage,
  getDMChannelId,
} from '../../services/messages';
import { notifyDirectMessage, subscribeToNotifications, markAsRead } from '../../services/notifications';
import type { MessageWithReactions, User, Notification } from '../../types';

interface QuickChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickChatPopup({ isOpen, onClose }: QuickChatPopupProps) {
  const { currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<MessageWithReactions[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dmNotifications, setDmNotifications] = useState<Notification[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to all users
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToAllUsers((allUsers) => {
      // Filter out current user
      setUsers(allUsers.filter((u) => u.id !== currentUser?.uid));
    });

    return () => unsubscribe();
  }, [isOpen, currentUser?.uid]);

  // Subscribe to DM notifications to track unread messages
  useEffect(() => {
    if (!currentUser?.uid) return;

    const unsubscribe = subscribeToNotifications(currentUser.uid, (notifications) => {
      // Filter only unread DM notifications
      const unreadDMs = notifications.filter((n) => n.type === 'direct-message' && !n.read);
      setDmNotifications(unreadDMs);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Subscribe to messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const channelId = getDMChannelId(currentUser.uid, selectedUser.id);
    const unsubscribe = subscribeToMessages(channelId, setMessages);

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when user is selected
  useEffect(() => {
    if (selectedUser) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedUser]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUser || sending) return;

    setSending(true);
    try {
      const channelId = getDMChannelId(currentUser.uid, selectedUser.id);
      const messageContent = newMessage.trim();
      await sendMessage(channelId, messageContent, currentUser.uid);
      setNewMessage('');

      // Send DM notification
      if (userProfile) {
        await notifyDirectMessage(
          selectedUser.id,
          userProfile.displayName,
          messageContent,
          channelId
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }

  function formatTime(timestamp: Timestamp | undefined) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  // Helper to get unread DM notifications from a specific user
  const getUnreadDMsFromUser = (userId: string): Notification[] => {
    return dmNotifications.filter((n) => {
      const data = n.data as Record<string, string> | undefined;
      // Check if the channelId contains this user's ID (DM channel format: dm_id1_id2)
      const channelId = data?.channelId || '';
      return channelId.includes(userId);
    });
  };

  // Check if a user has unread DMs
  const hasUnreadDM = (userId: string): boolean => {
    return getUnreadDMsFromUser(userId).length > 0;
  };

  // Get unread count from a specific user
  const getUnreadCount = (userId: string): number => {
    return getUnreadDMsFromUser(userId).length;
  };

  // Handle selecting a user - also marks their DM notifications as read
  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);

    // Mark all DM notifications from this user as read
    const unreadFromUser = getUnreadDMsFromUser(user.id);
    for (const notification of unreadFromUser) {
      await markAsRead(notification.id);
    }
  };

  // Filter and sort users - users with unread messages first, sorted by most recent notification
  const filteredUsers = useMemo(() => {
    const filtered = users.filter((user) =>
      user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort: users with unread DMs first, then alphabetically
    return filtered.sort((a, b) => {
      const aUnread = hasUnreadDM(a.id);
      const bUnread = hasUnreadDM(b.id);

      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      // If both have unreads, sort by notification time (most recent first)
      if (aUnread && bUnread) {
        const aNotifs = getUnreadDMsFromUser(a.id);
        const bNotifs = getUnreadDMsFromUser(b.id);
        const aTime = aNotifs[0]?.createdAt?.toMillis?.() || 0;
        const bTime = bNotifs[0]?.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      }

      return a.displayName.localeCompare(b.displayName);
    });
  }, [users, searchQuery, dmNotifications]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 w-80 h-[450px] glass rounded-2xl shadow-2xl z-[200] flex flex-col overflow-hidden animate-scale-in border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        {selectedUser ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-1 text-gray-400 hover:text-white rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white"
              style={{
                background: selectedUser.nameColor
                  ? `linear-gradient(135deg, ${selectedUser.nameColor}, ${selectedUser.nameColor}99)`
                  : 'linear-gradient(135deg, #8b5cf6, #d946ef)',
              }}
            >
              {selectedUser.avatarUrl?.startsWith('http') ? (
                <img src={selectedUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : selectedUser.avatarUrl ? (
                selectedUser.avatarUrl
              ) : (
                selectedUser.displayName.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-white font-medium text-sm">{selectedUser.displayName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-white font-medium">Quick Chat</span>
          </div>
        )}
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {selectedUser ? (
        // Chat view
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>No messages yet</p>
                <p className="text-xs mt-1">Say hi to {selectedUser.displayName}!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUser?.uid;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                        isOwn
                          ? 'bg-purple-600 text-white rounded-br-md'
                          : 'bg-white/10 text-white rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-purple-200' : 'text-gray-500'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </>
      ) : (
        // User list view
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team members..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No team members found
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => {
                  const unreadCount = getUnreadCount(user.id);
                  const hasUnread = unreadCount > 0;

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/10 transition-colors text-left ${
                        hasUnread ? 'bg-purple-500/10' : ''
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium text-white flex-shrink-0"
                          style={{
                            background: user.nameColor
                              ? `linear-gradient(135deg, ${user.nameColor}, ${user.nameColor}99)`
                              : 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                          }}
                        >
                          {user.avatarUrl?.startsWith('http') ? (
                            <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : user.avatarUrl ? (
                            user.avatarUrl
                          ) : (
                            user.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        {hasUnread && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full text-white text-xs flex items-center justify-center font-medium">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${hasUnread ? 'text-white' : 'text-white'}`}>
                          {user.displayName}
                        </p>
                        {user.title && (
                          <p className="text-gray-500 text-xs truncate">{user.title}</p>
                        )}
                      </div>
                      {hasUnread && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse flex-shrink-0"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
