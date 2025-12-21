import { useState, useEffect } from 'react';
import { getUserById } from '../../services/users';
import { subscribeToUserStats } from '../../services/ranks';
import { RANK_COLORS, RANK_NAMES } from '../../services/ranks';
import { getReputationLevel } from '../../services/reputation';
import RankBadge from '../ranks/RankBadge';
import type { User, UserStats } from '../../types';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);

    // Fetch user data
    getUserById(userId).then((userData) => {
      setUser(userData);
      setLoading(false);
    });

    // Subscribe to user stats
    const unsubscribe = subscribeToUserStats(userId, setUserStats);
    return () => unsubscribe();
  }, [userId, isOpen]);

  if (!isOpen) return null;

  function formatDate(timestamp: { toDate: () => Date } | null): string {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : user ? (
          <div className="p-6 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
                style={{
                  background: user.nameColor
                    ? `linear-gradient(135deg, ${user.nameColor}, ${user.nameColor}99)`
                    : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                }}
              >
                {user.avatarUrl || user.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p
                  className="text-xl font-bold"
                  style={{ color: user.nameColor || '#ffffff' }}
                >
                  {user.displayName}
                </p>
                {user.title && (
                  <p className="text-purple-400 text-sm font-medium">{user.title}</p>
                )}
                {userStats && (
                  <div className="flex items-center gap-2 mt-1">
                    <RankBadge rank={userStats.rank} size="sm" />
                    <span
                      className="text-sm font-medium"
                      style={{ color: RANK_COLORS[userStats.rank.tier].primary }}
                    >
                      {RANK_NAMES[userStats.rank.tier]} {userStats.rank.division || ''}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reputation */}
            {(() => {
              const reputation = user.reputation ?? 3000;
              const repLevel = getReputationLevel(reputation);
              return (
                <div className={`p-3 rounded-xl ${repLevel.bgColor}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" style={{ color: repLevel.textColor }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                      <span className={`text-sm font-bold ${repLevel.color}`}>{repLevel.label}</span>
                    </div>
                    <span className="text-sm text-gray-300">{reputation.toLocaleString()} pts</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${repLevel.progress}%`,
                        backgroundColor: repLevel.textColor
                      }}
                    />
                  </div>
                  {repLevel.nextLevel && (
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {repLevel.pointsToNext.toLocaleString()} to {repLevel.nextLevel}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Stats */}
            {userStats && (
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-xl font-bold text-purple-400">{userStats.tasksCompleted}</p>
                  <p className="text-xs text-gray-500">Tasks Done</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-xl font-bold text-blue-400">{userStats.projectsCreated}</p>
                  <p className="text-xs text-gray-500">Projects</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-xl font-bold text-pink-400">{userStats.messagesCount}</p>
                  <p className="text-xs text-gray-500">Messages</p>
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Member since {formatDate(user.createdAt)}</span>
            </div>

            {/* Name History */}
            {user.nameHistory && user.nameHistory.length > 0 && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Previous Names
                </h3>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {[...user.nameHistory].reverse().map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm bg-white/5 rounded-lg px-3 py-2"
                    >
                      <span className="text-gray-300">{entry.name}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(entry.changedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            <p>User not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
