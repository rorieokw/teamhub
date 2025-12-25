import React, { useState } from 'react';
import { toggleReaction, editMessage, deleteMessage } from '../../services/messages';
import { notifyReaction } from '../../services/notifications';
import { QuickReactions } from './EmojiPicker';
import EmojiPicker from './EmojiPicker';
import RankBadge from '../ranks/RankBadge';
import UserProfileModal from '../profile/UserProfileModal';
import { isGifUrl } from '../../services/tenor';
import { useAdmin } from '../../hooks/useAdmin';
import { useAuth } from '../../contexts/AuthContext';
import type { MessageWithReactions, User, UserStats } from '../../types';

interface ChatMessageProps {
  message: MessageWithReactions;
  sender?: User;
  currentUserId?: string;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  members?: User[];
  senderStats?: UserStats;
  onStartDM?: (userId: string) => void;
}

export default function ChatMessage({
  message,
  sender,
  currentUserId,
  isOwnMessage,
  showAvatar = true,
  members = [],
  senderStats,
  onStartDM,
}: ChatMessageProps) {
  const { isAdmin } = useAdmin();
  const { userProfile } = useAuth();
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Can delete if own message OR if admin
  const canDelete = isOwnMessage || isAdmin;

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

      // Send notification only when ADDING a reaction (not removing)
      // and only if it's not your own message
      if (!hasReacted && !isOwnMessage && userProfile && message.senderId) {
        await notifyReaction(
          message.senderId,
          userProfile.displayName,
          emoji,
          message.content || '[Image]',
          message.channelId
        );
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  }

  async function handleEdit() {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      setEditContent(message.content);
      return;
    }

    try {
      await editMessage(message.id, editContent.trim());
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  }

  async function handleDelete() {
    try {
      await deleteMessage(message.id);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content);
    }
  }

  // Get reaction counts
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, users]) => users.length > 0
  );

  return (
    <div
      className={`flex gap-3 px-5 hover:bg-white/5 transition-colors group relative ${
        showAvatar ? 'pt-3 pb-1' : 'py-0.5'
      } ${isOwnMessage ? 'bg-purple-500/5' : ''}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => {
        setShowReactions(false);
        setShowEmojiPicker(false);
      }}
    >
      {showAvatar ? (
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 overflow-hidden shadow-lg ${
            isOwnMessage
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/25'
              : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-blue-500/25'
          } flex items-center justify-center text-white font-bold cursor-pointer`}
          onClick={() => !isOwnMessage && setShowProfile(true)}
        >
          {sender?.avatarUrl ? (
            sender.avatarUrl.startsWith('http') ? (
              <img
                src={sender.avatarUrl}
                alt={sender.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">{sender.avatarUrl}</span>
            )
          ) : (
            sender?.displayName?.charAt(0).toUpperCase() || '?'
          )}
        </div>
      ) : (
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <span className="text-[10px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.createdAt).replace(' ', '')}
          </span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {showAvatar && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => !isOwnMessage && setShowProfile(true)}
              className={`font-semibold ${!isOwnMessage ? 'hover:underline cursor-pointer' : ''}`}
              style={{
                color: sender?.nameColor || (isOwnMessage ? '#a855f7' : '#ffffff'),
              }}
            >
              {sender?.title && (
                <span className="font-normal" style={{ color: sender.titleColor || '#9ca3af' }}>[{sender.title}] </span>
              )}
              {sender?.displayName || 'Unknown User'}
            </button>
            {senderStats && (
              <RankBadge rank={senderStats.rank} size="xs" />
            )}
            <span className="text-xs text-gray-600">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        {/* Message content - check if it's a GIF */}
        {isEditing ? (
          <div className="mt-1">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full px-3 py-2 bg-white/10 border border-purple-500/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>escape to <button onClick={() => { setIsEditing(false); setEditContent(message.content); }} className="text-purple-400 hover:underline">cancel</button></span>
              <span>•</span>
              <span>enter to <button onClick={handleEdit} className="text-purple-400 hover:underline">save</button></span>
            </div>
          </div>
        ) : isGifUrl(message.content) ? (
          <div className="mt-1 max-w-sm">
            <img
              src={message.content}
              alt="GIF"
              className="rounded-lg max-h-64 object-contain"
              loading="lazy"
            />
          </div>
        ) : (
          <>
            {message.content && (
              <p className="text-gray-300 break-words whitespace-pre-wrap mt-0.5 leading-relaxed">
                {renderContent(message.content)}
                {message.editedAt && (
                  <span className="text-xs text-gray-600 ml-1">(edited)</span>
                )}
              </p>
            )}
          </>
        )}

        {/* Display images */}
        {message.images && message.images.length > 0 && (
          <div className={`mt-2 grid gap-2 ${
            message.images.length === 1 ? 'grid-cols-1 max-w-md' :
            message.images.length === 2 ? 'grid-cols-2 max-w-lg' :
            'grid-cols-2 max-w-lg'
          }`}>
            {message.images.map((imageUrl, index) => (
              <a
                key={index}
                href={imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-white/10 hover:border-purple-500/50 transition-colors"
              >
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-full h-auto max-h-80 object-cover hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
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
      {showReactions && currentUserId && !isEditing && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-1 glass rounded-lg px-2 py-1 shadow-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
          <QuickReactions onSelect={handleReaction} />
          <div className="w-px h-5 bg-white/10 mx-1"></div>
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Add reaction"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Edit button for own messages */}
          {isOwnMessage && (
            <>
              <div className="w-px h-5 bg-white/10 mx-1"></div>
              <button
                onClick={() => setIsEditing(true)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Edit message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}

          {/* Delete button for own messages OR admin */}
          {canDelete && (
            <>
              {!isOwnMessage && <div className="w-px h-5 bg-white/10 mx-1"></div>}
              {showDeleteConfirm ? (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    onClick={handleDelete}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                  >
                    {isAdmin && !isOwnMessage ? 'Admin Delete' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-1 text-xs bg-white/10 text-gray-400 hover:bg-white/20 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                    isAdmin && !isOwnMessage
                      ? 'text-orange-400 hover:text-orange-300 hover:bg-orange-500/10'
                      : 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                  title={isAdmin && !isOwnMessage ? 'Admin: Delete message' : 'Delete message'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </>
          )}

          {showEmojiPicker && (
            <EmojiPicker
              onSelect={handleReaction}
              onClose={() => setShowEmojiPicker(false)}
            />
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {sender && (
        <UserProfileModal
          userId={sender.id}
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
          onStartDM={onStartDM}
        />
      )}
    </div>
  );
}
