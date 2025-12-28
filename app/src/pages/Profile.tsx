import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserRank } from '../hooks/useUserRank';
import { updateUserProfile, changeDisplayName } from '../services/users';
import { uploadProfilePicture, validateImageFile } from '../services/storage';
import { RANK_COLORS, RANK_NAMES, getPointsToNextRank } from '../services/ranks';
import { getReputationLevel } from '../services/reputation';
import ReputationModal from '../components/profile/ReputationModal';
import RankModal from '../components/profile/RankModal';
import ProfileBanner from '../components/profile/ProfileBanner';
import BannerSelector from '../components/profile/BannerSelector';
import PasswordVault from '../components/profile/PasswordVault';

// Preset avatar options - compact set
const AVATAR_OPTIONS = [
  '👨‍💻', '👩‍💻', '👨‍💼', '👩‍💼', '👨‍🔬', '👩‍🔬', '👨‍🎨', '👩‍🎨',
  '👨‍🏫', '👩‍🏫', '👨‍⚕️', '👩‍⚕️', '👨‍🍳', '👩‍🍳', '👨‍🔧', '👩‍🔧',
  '👨‍🚀', '👩‍🚀', '👷', '👮', '🕵️', '💂', '🦸', '🧙',
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
  const [selectedTitleColor, setSelectedTitleColor] = useState(userProfile?.titleColor || '');
  const [selectedBanner, setSelectedBanner] = useState(userProfile?.bannerId || 'default');
  const [title, setTitle] = useState(userProfile?.title || '');
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReputationModal, setShowReputationModal] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showBanners, setShowBanners] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (userProfile) {
      setSelectedAvatar(userProfile.avatarUrl || '');
      setSelectedColor(userProfile.nameColor || '');
      setSelectedTitleColor(userProfile.titleColor || '');
      setSelectedBanner(userProfile.bannerId || 'default');
      setTitle(userProfile.title || '');
      setDisplayName(userProfile.displayName || '');
    }
  }, [userProfile]);

  async function handleSave() {
    if (!currentUser || !userProfile) return;

    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, {
        avatarUrl: selectedAvatar,
        nameColor: selectedColor,
        titleColor: selectedTitleColor,
        title: title,
        bannerId: selectedBanner,
      });

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

  const repLevel = getReputationLevel(userProfile?.reputation ?? 3000);

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Your Profile</h1>
        <p className="text-gray-400 text-sm">Customize your appearance and view your progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Preview & Basic Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile Preview Card */}
          <div className="glass rounded-xl overflow-hidden">
            <ProfileBanner bannerId={selectedBanner} height="sm" rounded="none" />
            <div className="p-4 -mt-8 relative">
              <div className="flex items-end gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-3xl shadow-lg overflow-hidden ring-3 ring-[#2d2a4a] flex-shrink-0">
                  {isCustomPicture(selectedAvatar) ? (
                    <img src={selectedAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    selectedAvatar || userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-lg font-bold truncate" style={{ color: selectedColor || '#ffffff' }}>
                    {displayName || userProfile?.displayName}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    {title && <span style={{ color: selectedTitleColor || '#a78bfa' }}>{title}</span>}
                    {title && userStats && <span className="text-gray-600">•</span>}
                    {userStats && (
                      <span style={{ color: RANK_COLORS[userStats.rank.tier].primary }}>
                        {RANK_NAMES[userStats.rank.tier]} {userStats.rank.division || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info - Combined */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  maxLength={30}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Job Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Developer"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  maxLength={50}
                />
              </div>
            </div>
          </div>

          {/* Appearance - Avatar & Color Combined */}
          <div className="glass rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Appearance</h3>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Avatar Selection */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl overflow-hidden flex-shrink-0">
                    {isCustomPicture(selectedAvatar) ? (
                      <img src={selectedAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedAvatar || userProfile?.displayName?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-all"
                    >
                      {uploadingPicture ? '...' : 'Upload'}
                    </button>
                    {isCustomPicture(selectedAvatar) && (
                      <button
                        onClick={() => setSelectedAvatar('')}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium rounded-lg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                {uploadError && <p className="text-xs text-red-400 mb-2">{uploadError}</p>}

                {/* Avatar Grid - Compact */}
                <div className="grid grid-cols-8 gap-1.5">
                  <button
                    onClick={() => setSelectedAvatar('')}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all ${
                      !selectedAvatar ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                  </button>
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-base transition-all ${
                        selectedAvatar === avatar ? 'bg-purple-600 ring-2 ring-purple-400' : 'bg-white/10 hover:bg-white/20'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px bg-white/10" />

              {/* Colors */}
              <div className="sm:w-48 space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Name Colour</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {NAME_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSelectedColor(color.value)}
                        className={`h-7 rounded-md transition-all ${
                          selectedColor === color.value ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#1a1a2e]' : ''
                        }`}
                        style={{ backgroundColor: color.value || '#ffffff20' }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Title Colour</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {NAME_COLORS.map((color) => (
                      <button
                        key={`title-${color.name}`}
                        onClick={() => setSelectedTitleColor(color.value)}
                        className={`h-7 rounded-md transition-all ${
                          selectedTitleColor === color.value ? 'ring-2 ring-purple-400 ring-offset-1 ring-offset-[#1a1a2e]' : ''
                        }`}
                        style={{ backgroundColor: color.value || '#a78bfa' }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Selection - Collapsible */}
          {userStats && (
            <div className="glass rounded-xl overflow-hidden">
              <button
                onClick={() => setShowBanners(!showBanners)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-8 rounded-md overflow-hidden">
                    <ProfileBanner bannerId={selectedBanner} height="sm" rounded="all" className="h-full" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-white">Profile Banner</h3>
                    <p className="text-xs text-gray-500">Unlock banners by ranking up</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showBanners ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showBanners && (
                <div className="px-4 pb-4 border-t border-white/5">
                  <div className="pt-4">
                    <BannerSelector
                      selectedBannerId={selectedBanner}
                      onSelect={setSelectedBanner}
                      currentRankTier={userStats.rank.tier}
                      currentReputationLevel={repLevel.label}
                      unlockedBanners={userProfile?.unlockedBanners || []}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-500/25"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {/* Right Column - Stats & Progress */}
        <div className="space-y-5">
          {userStats && (
            <>
              {/* Rank & Progress Combined */}
              <div
                className="glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors group"
                onClick={() => setShowRankModal(true)}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      background: `linear-gradient(135deg, ${RANK_COLORS[userStats.rank.tier].primary}40, ${RANK_COLORS[userStats.rank.tier].secondary}40)`,
                      boxShadow: `0 0 20px ${RANK_COLORS[userStats.rank.tier].primary}30`,
                    }}
                  >
                    {userStats.rank.tier === 'iron' && '⚙️'}
                    {userStats.rank.tier === 'bronze' && '🥉'}
                    {userStats.rank.tier === 'silver' && '🥈'}
                    {userStats.rank.tier === 'gold' && '🥇'}
                    {userStats.rank.tier === 'platinum' && '💎'}
                    {userStats.rank.tier === 'emerald' && '💚'}
                    {userStats.rank.tier === 'diamond' && '💠'}
                    {userStats.rank.tier === 'master' && '👑'}
                    {userStats.rank.tier === 'grandmaster' && '🔥'}
                    {userStats.rank.tier === 'challenger' && '⚡'}
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold"
                      style={{ color: RANK_COLORS[userStats.rank.tier].primary }}
                    >
                      {RANK_NAMES[userStats.rank.tier]} {userStats.rank.division || ''}
                    </p>
                    <p className="text-xs text-gray-400">{userStats.rank.lp} LP • {userStats.totalPoints.toLocaleString()} total pts</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPercent}%`,
                        background: `linear-gradient(90deg, ${RANK_COLORS[userStats.rank.tier].primary}, ${RANK_COLORS[userStats.rank.tier].secondary})`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {pointsToNext > 0 ? `${pointsToNext} pts to next rank` : 'Max rank achieved!'}
                  </p>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">i</text>
                  </svg>
                </div>
              </div>

              {/* Reputation - Compact */}
              <div
                className="glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors group relative"
                onClick={() => setShowReputationModal(true)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-base font-bold ${repLevel.color}`}>{repLevel.label}</span>
                  <span className="text-sm text-gray-400">{(userProfile?.reputation ?? 3000).toLocaleString()} pts</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${repLevel.progress}%`, backgroundColor: repLevel.textColor }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {repLevel.nextLevel ? `${repLevel.pointsToNext.toLocaleString()} to ${repLevel.nextLevel}` : 'Max reputation!'}
                  </p>
                  <svg className="w-4 h-4 text-gray-500 group-hover:text-gray-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor">i</text>
                  </svg>
                </div>
              </div>

              {/* Stats - Compact Grid */}
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Stats</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-xl font-bold text-purple-400">{userStats.tasksCompleted}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Tasks Done</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-xl font-bold text-blue-400">{userStats.tasksCreated}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Created</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-xl font-bold text-green-400">{userStats.projectsCreated}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Projects</p>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded-lg">
                    <p className="text-xl font-bold text-pink-400">{userStats.messagesCount}</p>
                    <p className="text-[10px] text-gray-500 uppercase">Messages</p>
                  </div>
                </div>
              </div>

              {/* How to Earn - Compact */}
              <div className="glass rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Earn Points</h3>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-400">Complete task</span><span className="text-purple-400">+25</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Create task</span><span className="text-blue-400">+5</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Create project</span><span className="text-green-400">+50</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Send message</span><span className="text-pink-400">+1</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Milestone</span><span className="text-cyan-400">+15</span></div>
                </div>
              </div>
            </>
          )}

          {/* Password Vault */}
          <PasswordVault />
        </div>
      </div>

      <ReputationModal
        isOpen={showReputationModal}
        onClose={() => setShowReputationModal(false)}
        currentReputation={userProfile?.reputation ?? 3000}
      />

      {userStats && (
        <RankModal
          isOpen={showRankModal}
          onClose={() => setShowRankModal(false)}
          currentRank={userStats.rank}
          totalPoints={userStats.totalPoints}
        />
      )}
    </div>
  );
}
