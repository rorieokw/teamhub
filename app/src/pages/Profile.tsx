import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserRank } from '../hooks/useUserRank';
import { updateUserProfile } from '../services/users';
import { RankCard } from '../components/ranks/RankBadge';
import { RANK_COLORS, RANK_NAMES, getPointsToNextRank } from '../services/ranks';
import { RANK_POINTS } from '../types';

// Preset avatar options
const AVATAR_OPTIONS = [
  '🦊', '🐺', '🦁', '🐯', '🐻', '🐼',
  '🐨', '🐸', '🐵', '🦄', '🐲', '🦅',
  '🦈', '🐬', '🦋', '🌟', '⚡', '🔥',
  '💎', '🎮', '🎯', '🚀', '👑', '🛡️',
];

// Name color options
const NAME_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Gold', value: '#ffd700' },
];

export default function Profile() {
  const { currentUser, userProfile } = useAuth();
  const userStats = useUserRank(currentUser?.uid);
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatarUrl || '');
  const [selectedColor, setSelectedColor] = useState(userProfile?.nameColor || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!currentUser) return;

    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        avatarUrl: selectedAvatar,
        nameColor: selectedColor,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  const pointsToNext = userStats ? getPointsToNextRank(userStats.rank) : 0;
  const progressPercent = userStats?.rank.division
    ? userStats.rank.lp
    : Math.min((userStats?.rank.lp || 0) / 100, 100);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>
        <p className="text-gray-400 mt-1">Customize your appearance and view your progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Customization */}
        <div className="space-y-6">
          {/* Current Profile Preview */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/25">
                {selectedAvatar || userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p
                  className="text-xl font-bold"
                  style={{ color: selectedColor || '#ffffff' }}
                >
                  {userProfile?.displayName}
                </p>
                <p className="text-gray-400 text-sm">{userProfile?.email}</p>
                {userStats && (
                  <div className="flex items-center gap-2 mt-1">
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
          </div>

          {/* Avatar Picker */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Choose Avatar</h3>
            <div className="grid grid-cols-6 gap-2">
              {/* Default (initial) option */}
              <button
                onClick={() => setSelectedAvatar('')}
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                  selectedAvatar === ''
                    ? 'bg-purple-600 ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e]'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </button>
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                    selectedAvatar === avatar
                      ? 'bg-purple-600 ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e]'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>

          {/* Name Color Picker */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Name Color</h3>
            <div className="grid grid-cols-5 gap-2">
              {NAME_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color.value)}
                  className={`h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e]'
                      : ''
                  }`}
                  style={{
                    backgroundColor: color.value || '#ffffff20',
                    color: color.value ? '#fff' : '#9ca3af',
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Right Column - Rank Progress */}
        <div className="space-y-6">
          {/* Current Rank */}
          {userStats && (
            <>
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Your Rank</h3>
                <RankCard rank={userStats.rank} />
              </div>

              {/* Progress to Next Rank */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Progress to Next Rank</h3>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">
                      {userStats.rank.division
                        ? `${RANK_NAMES[userStats.rank.tier]} ${userStats.rank.division}`
                        : RANK_NAMES[userStats.rank.tier]}
                    </span>
                    <span className="text-gray-400">
                      {pointsToNext > 0 ? `${pointsToNext} pts to next` : 'Max rank!'}
                    </span>
                  </div>
                  <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(90deg, ${RANK_COLORS[userStats.rank.tier].primary}, ${RANK_COLORS[userStats.rank.tier].secondary})`,
                      }}
                    />
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {userStats.rank.lp} LP
                  </p>
                </div>

                {/* How to earn points */}
                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">How to earn points:</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Complete a task</span>
                      <span className="text-purple-400 font-medium">+{RANK_POINTS.TASK_COMPLETED} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Create a task</span>
                      <span className="text-blue-400 font-medium">+{RANK_POINTS.TASK_CREATED} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Create a project</span>
                      <span className="text-green-400 font-medium">+{RANK_POINTS.PROJECT_CREATED} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Send a message</span>
                      <span className="text-pink-400 font-medium">+{RANK_POINTS.MESSAGE_SENT} pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Add a comment</span>
                      <span className="text-orange-400 font-medium">+{RANK_POINTS.COMMENT_ADDED} pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Complete a milestone</span>
                      <span className="text-cyan-400 font-medium">+{RANK_POINTS.MILESTONE_COMPLETED} pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="glass rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Your Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-2xl font-bold text-purple-400">{userStats.tasksCompleted}</p>
                    <p className="text-xs text-gray-500">Tasks Completed</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-2xl font-bold text-blue-400">{userStats.tasksCreated}</p>
                    <p className="text-xs text-gray-500">Tasks Created</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-2xl font-bold text-green-400">{userStats.projectsCreated}</p>
                    <p className="text-xs text-gray-500">Projects</p>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-xl">
                    <p className="text-2xl font-bold text-pink-400">{userStats.messagesCount}</p>
                    <p className="text-xs text-gray-500">Messages</p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl text-center">
                  <p className="text-3xl font-bold text-white">{userStats.totalPoints.toLocaleString()}</p>
                  <p className="text-sm text-gray-400">Total Points Earned</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
