import React, { useState } from 'react';
import { toggleReaction } from '../../services/messages';
import { QuickReactions } from './EmojiPicker';
import EmojiPicker from './EmojiPicker';
import RankBadge from '../ranks/RankBadge';
import { isGifUrl } from '../../services/tenor';
import type { MessageWithReactions, User, UserStats } from '../../types';

interface ChatMessageProps {
  message: MessageWithReactions;
  sender?: User;
  currentUserId?: string;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  members?: User[];
  senderStats?: UserStats;
}

export default function ChatMessage({
  message,
  sender,
  currentUserId,
  isOwnMessage,
  showAvatar = true,
  members = [],
  senderStats,
}: ChatMessageProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formatTime = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Render content with highlighted mentions
  function renderContent(content: string): React.ReactNode {
    const mentionRegex = /@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      const mentionName = match[1];
      const mentionedUser = members.find(
        (u) =>
          u.displayName.toLowerCase().replace(/\s+/g, '') === mentionName.toLowerCase() ||
          u.displayName.toLowerCase().startsWith(mentionName.toLowerCase())
      );

      // Add the mention with highlighting
      parts.push(
        <span
          key={match.index}
          className={`px-1 py-0.5 rounded ${
            mentionedUser
              ? 'bg-purple-500/30 text-purple-300 font-medium'
              : 'text-purple-400'
          }`}
        >
          @{mentionName}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  }

  async function handleReaction(emoji: string) {
    if (!currentUserId) return;

    const reactions = message.reactions || {};
    const hasReacted = reactions[emoji]?.includes(currentUserId) || false;

    try {
      await toggleReaction(message.id, emoji, currentUserId, hasReacted);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }

  // Get reaction counts
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, users]) => users.length > 0
  );

  return (
    <div
      className={`flex gap-4 py-2 px-5 hover:bg-white/5 transition-colors group relative ${
        isOwnMessage ? 'bg-purple-500/5' : ''
      }`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => {
        setShowReactions(false);
        setShowEmojiPicker(false);
      }}
    >
      {showAvatar && (
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg ${
            isOwnMessage
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/25'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
          }`}
        >
          {sender?.avatarUrl || sender?.displayName?.charAt(0).toUpperCase() || '?'}
        </div>
      )}
      {!showAvatar && <div className="w-10 flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold"
            style={{
              color: sender?.nameColor || (isOwnMessage ? '#a855f7' : '#ffffff'),
            }}
          >
            {sender?.displayName || 'Unknown User'}
          </span>
          {senderStats && (
            <RankBadge rank={senderStats.rank} size="xs" />
          )}
          <span className="text-xs text-gray-600">
            {formatTime(message.createdAt)}
          </span>
        </div>
        {/* Message content - check if it's a GIF */}
        {isGifUrl(message.content) ? (
          <div className="mt-1 max-w-sm">
            <img
              src={message.content}
              alt="GIF"
              className="rounded-lg max-h-64 object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <p className="text-gray-300 break-words whitespace-pre-wrap mt-0.5 leading-relaxed">
            {renderContent(message.content)}
          </p>
        )}

        {/* Reactions display */}
        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {reactionEntries.map(([emoji, users]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm transition-colors ${
                  users.includes(currentUserId || '')
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : 'bg-white/10 hover:bg-white/20 border border-transparent'
                }`}
              >
                <span>{emoji}</span>
                <span className="text-xs text-gray-400">{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick reactions toolbar */}
      {showReactions && currentUserId && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 glass rounded-lg px-2 py-1 shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <QuickReactions onSelect={handleReaction} />
          <div className="w-px h-5 bg-white/10 mx-1"></div>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleReaction}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
