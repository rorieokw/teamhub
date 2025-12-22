import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserRank } from '../hooks/useUserRank';
import { updateUserProfile, changeDisplayName } from '../services/users';
import { uploadProfilePicture, validateImageFile } from '../services/storage';
import { RankCard } from '../components/ranks/RankBadge';
import { RANK_COLORS, RANK_NAMES, getPointsToNextRank } from '../services/ranks';
import { getReputationLevel } from '../services/reputation';
import ReputationModal from '../components/profile/ReputationModal';
import { RANK_POINTS } from '../types';

// Preset avatar options - people occupations
const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬',
  '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️',
  '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧', '👨‍🚀', '👩‍🚀',
  '👨‍✈️', '👩‍✈️', '👨‍🎤', '👩‍🎤', '👨‍⚖️', '👩‍⚖️',
  '👷', '👮', '🕵️', '💂', '🧑‍🚒', '🧑‍🌾',
  '🧑‍🏭', '🧑‍🎓', '🦸', '🦹', '🥷', '🧙',
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
  const [title, setTitle] = useState(userProfile?.title || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if avatar is a URL (custom picture) or emoji
  const isCustomPicture = (avatar: string) => avatar.startsWith('http');

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file');
      return;
    }

    setUploadError('');
    setUploadingPicture(true);

    try {
      const url = await uploadProfilePicture(file, currentUser.uid);
      setSelectedAvatar(url);
    } catch (err) {
      console.error('Failed to upload profile picture:', err);
      setUploadError('Failed to upload image. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  }

  // Sync local state with userProfile when it changes
  useEffect(() => {
    if (userProfile) {
      setSelectedAvatar(userProfile.avatarUrl || '');
      setSelectedColor(userProfile.nameColor || '');
      setTitle(userProfile.title || '');
      setDisplayName(userProfile.displayName || '');
    }
  }, [userProfile]);

  async function handleSave() {
    if (!currentUser || !userProfile) return;

    setSaving(true);
    try {
      // Update profile settings
      await updateUserProfile(currentUser.uid, {
        avatarUrl: selectedAvatar,
        nameColor: selectedColor,
        title: title,
      });

      // Handle name change separately to track history
      if (displayName.trim() && displayName !== userProfile.displayName) {
        await changeDisplayName(currentUser.uid, userProfile.displayName, displayName.trim());
      }

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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-4xl shadow-lg shadow-purple-500/25 overflow-hidden">
                {isCustomPicture(selectedAvatar) ? (
                  <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  selectedAvatar || userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
              <div>
                <p
                  className="text-xl font-bold"
                  style={{ color: selectedColor || '#ffffff' }}
                >
                  {displayName || userProfile?.displayName}
                </p>
                {title && (
                  <p className="text-purple-400 text-sm font-medium">{title}</p>
                )}
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

          {/* Display Name */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Display Name</h3>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={30}
            />
            <p className="text-xs text-gray-500 mt-2">This is the name other team members will see</p>
          </div>

          {/* Profile Picture / Avatar */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>

            {/* Current Selection Preview */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 overflow-hidden">
                {isCustomPicture(selectedAvatar) ? (
                  <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : selectedAvatar ? (
                  <span className="text-4xl">{selectedAvatar}</span>
                ) : (
                  <span className="text-3xl font-bold text-white">{userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">
                  {isCustomPicture(selectedAvatar) ? 'Custom Picture' : selectedAvatar ? 'Emoji Avatar' : 'Default Initial'}
                </p>
                <p className="text-gray-400 text-sm">This is shown across the app</p>
              </div>
            </div>

            {/* Upload Custom Picture */}
            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-3">Upload a custom picture</p>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPicture}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
                </button>
                {isCustomPicture(selectedAvatar) && (
                  <button
                    onClick={() => setSelectedAvatar('')}
                    className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">JPEG, PNG, GIF or WebP. Max 10MB.</p>
              {uploadError && (
                <p className="text-xs text-red-400 mt-1">{uploadError}</p>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">or choose an avatar</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Avatar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Default (initial) option */}
              <button
                onClick={() => setSelectedAvatar('')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                  !selectedAvatar || selectedAvatar === ''
                    ? 'bg-purple-600 ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e] text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
                title="Use initial"
              >
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </button>
              {AVATAR_OPTIONS.map((avatar) => (
                <button
                  key={avatar}
                  onClick={() => setSelectedAvatar(avatar)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all ${
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

          {/* Job Title */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Job Title</h3>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lead Developer, Designer, Project Manager"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-2">This will be displayed under your name</p>
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

              {/* Reputation */}
              <div
                className="glass rounded-xl p-6 cursor-pointer hover:bg-white/5 transition-colors group"
                onClick={() => setShowReputationModal(true)}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Reputation</h3>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                {(() => {
                  const reputation = userProfile?.reputation ?? 3000;
                  const repLevel = getReputationLevel(reputation);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-xl font-bold ${repLevel.color}`}>
                          {repLevel.label}
                        </span>
                        <span className="text-lg font-medium text-gray-300">
                          {reputation.toLocaleString()} pts
                        </span>
                      </div>
                      <div className="h-4 bg-white/10 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${repLevel.progress}%`,
                            backgroundColor: repLevel.textColor
                          }}
                        />
                      </div>
                      {repLevel.nextLevel ? (
                        <p className="text-xs text-gray-400 text-center">
                          {repLevel.pointsToNext.toLocaleString()} points to {repLevel.nextLevel}
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-300 text-center font-medium">
                          Maximum reputation achieved!
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-3 group-hover:text-gray-400 transition-colors">
                        Click to view all reputation ranks
                      </p>
                    </>
                  );
                })()}
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

      {/* Reputation Modal */}
      <ReputationModal
        isOpen={showReputationModal}
        onClose={() => setShowReputationModal(false)}
        currentReputation={userProfile?.reputation ?? 3000}
      />
    </div>
  );
}
