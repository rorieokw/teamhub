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

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToReadStatus(currentUser.uid, (status) => {
      setReadStatus(status as Record<string, Timestamp>);
      setReadStatusLoaded(true);
    });
    return () => unsubscribe();
  }, [currentUser]);

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

  useEffect(() => {
    if (!currentUser || !readStatusLoaded) return;

    const unread = allMessages.filter((msg) => {
      if (msg.senderId === currentUser.uid) return false;

      const lastRead = readStatus[msg.channelId];
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

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (unreadMessages.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-green-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">All caught up!</p>
      </div>
    );
  }

  return (
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
      <Link
        to="/chat"
        className="block text-center text-purple-400 hover:text-purple-300 text-xs font-medium pt-1"
      >
        Open Chat
      </Link>
    </div>
  );
}
