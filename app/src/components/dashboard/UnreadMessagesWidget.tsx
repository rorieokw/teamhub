import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToReadStatus } from '../../services/readStatus';
import { subscribeToUsers } from '../../services/users';
import { getGeneralChannelId } from '../../services/messages';
import type { Message, User } from '../../types';

interface UnreadMessage extends Message {
  senderName?: string;
  senderAvatar?: string;
}

export default function UnreadMessagesWidget() {
  const { currentUser } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [readStatus, setReadStatus] = useState<Record<string, Timestamp>>({});
  const [readStatusLoaded, setReadStatusLoaded] = useState(false);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [senders, setSenders] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  // Subscribe to read status
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToReadStatus(currentUser.uid, (status) => {
      setReadStatus(status as Record<string, Timestamp>);
      setReadStatusLoaded(true);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to recent messages (last 50 across all channels)
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Message[];

      setAllMessages(messages);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Filter unread messages only after both messages AND readStatus have loaded
  useEffect(() => {
    if (!currentUser || !readStatusLoaded) return;

    const unread = allMessages.filter((msg) => {
      // Exclude own messages
      if (msg.senderId === currentUser.uid) return false;

      const lastRead = readStatus[msg.channelId];
      // If no read status for this channel, check if message is recent (last 24h)
      if (!lastRead) {
        if (!msg.createdAt) return false;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        return msg.createdAt.toMillis() > oneDayAgo;
      }
      if (!msg.createdAt) return false;
      return msg.createdAt.toMillis() > lastRead.toMillis();
    });

    setUnreadMessages(unread.slice(0, 5));
    setLoading(false);
  }, [currentUser, allMessages, readStatus, readStatusLoaded]);

  // Subscribe to sender info
  useEffect(() => {
    const senderIds = [...new Set(unreadMessages.map((m) => m.senderId))];
    if (senderIds.length === 0) return;

    const unsubscribe = subscribeToUsers(senderIds, setSenders);
    return () => unsubscribe();
  }, [unreadMessages.map(m => m.senderId).join(',')]);

  const formatTime = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const getChannelName = (channelId: string) => {
    if (channelId === getGeneralChannelId()) return 'general';
    if (channelId.startsWith('project-')) return channelId.replace('project-', '').slice(0, 8) + '...';
    if (channelId.startsWith('dm-')) return 'DM';
    return 'chat';
  };

  const totalUnread = unreadMessages.length;

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-purple-500/20 animate-pulse" />
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/90 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Unread Messages
        </h3>
        {totalUnread > 0 && (
          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full">
            {totalUnread}
          </span>
        )}
      </div>

      {unreadMessages.length === 0 ? (
        <div className="text-center py-4">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">All caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unreadMessages.map((msg) => {
            const sender = senders.get(msg.senderId);
            return (
              <Link
                key={msg.id}
                to="/chat"
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium overflow-hidden">
                    {sender?.avatarUrl ? (
                      sender.avatarUrl.startsWith('http') ? (
                        <img src={sender.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm">{sender.avatarUrl}</span>
                      )
                    ) : (
                      sender?.displayName?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-purple-500 rounded-full border-2 border-[#1e1b2e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">
                      {sender?.displayName || 'Unknown'}
                    </span>
                    <span className="text-xs text-gray-500">
                      #{getChannelName(msg.channelId)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">
                    {msg.content || '[Image]'}
                  </p>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(msg.createdAt)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {totalUnread > 0 && (
        <Link
          to="/chat"
          className="block text-center text-purple-400 hover:text-purple-300 mt-3 text-xs font-medium"
        >
          Open Chat →
        </Link>
      )}
    </div>
  );
}
