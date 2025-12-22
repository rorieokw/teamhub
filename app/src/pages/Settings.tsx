import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useUserRank } from '../hooks/useUserRank';
import { RankCard } from '../components/ranks/RankBadge';
import { RANK_POINTS } from '../types';
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  previewNotificationSound,
} from '../services/notificationSound';

type SettingsTab = 'shortcuts' | 'appearance' | 'account';

const shortcutCategories = [
  {
    name: 'Navigation',
    shortcuts: [
      { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
      { keys: ['Ctrl', 'P'], description: 'Go to Projects' },
      { keys: ['Ctrl', 'T'], description: 'Go to Tasks' },
      { keys: ['Ctrl', 'M'], description: 'Go to Chat' },
      { keys: ['Ctrl', 'F'], description: 'Go to Documents' },
      { keys: ['Ctrl', ','], description: 'Go to Settings' },
    ],
  },
  {
    name: 'Search & Actions',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open global search' },
      { keys: ['Esc'], description: 'Close modal / Cancel' },
      { keys: ['?'], description: 'Show keyboard shortcuts help' },
    ],
  },
  {
    name: 'Chat',
    shortcuts: [
      { keys: ['@'], description: 'Mention a team member' },
      { keys: ['Enter'], description: 'Send message' },
      { keys: ['Shift', 'Enter'], description: 'New line in message' },
    ],
  },
  {
    name: 'Tasks',
    shortcuts: [
      { keys: ['Drag'], description: 'Move task between columns' },
      { keys: ['Click'], description: 'Expand task comments' },
    ],
  },
];

export default function Settings() {
  const { currentUser, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('shortcuts');
  const userStats = useUserRank(currentUser?.uid);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load sound preference on mount
  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled());
  }, []);

  // Toggle notification sound
  const toggleNotificationSound = () => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    setNotificationSoundEnabled(newValue);
    // Play a preview when enabling
    if (newValue) {
      previewNotificationSound();
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'shortcuts',
      label: 'Keyboard Shortcuts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'account',
      label: 'Account',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your preferences and keyboard shortcuts</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="md:w-56 flex-shrink-0">
          <div className="glass rounded-xl p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'shortcuts' && (
            <div className="space-y-6">
              {shortcutCategories.map((category) => (
                <div key={category.name} className="glass rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {category.shortcuts.map((shortcut, index) => (
                      <div
                        key={index}
                        className="px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <span className="text-gray-300">{shortcut.description}</span>
                        <div className="flex gap-1.5">
                          {shortcut.keys.map((key, i) => (
                            <kbd
                              key={i}
                              className="px-2.5 py-1.5 bg-white/10 border border-white/20 rounded-lg text-sm text-gray-300 font-mono min-w-[32px] text-center"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Pro Tip</h4>
                    <p className="text-gray-400 text-sm">
                      Press <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded text-xs mx-1">?</kbd>
                      anywhere in the app to quickly view keyboard shortcuts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="glass rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Theme</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Dark Mode</p>
                    <p className="text-gray-400 text-sm">Use dark theme for the interface</p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-purple-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-gray-400 text-sm">
                    More appearance options coming soon: custom accent colors, compact mode, and font size.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Rank Card */}
              {userStats && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Your Rank</h3>
                  <RankCard rank={userStats.rank} />

                  {/* Stats breakdown */}
                  <div className="glass rounded-xl p-5">
                    <h4 className="text-white font-medium mb-4">Stats</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-purple-400">{userStats.tasksCompleted}</p>
                        <p className="text-xs text-gray-500">Tasks Done</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.TASK_COMPLETED} pts each</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-blue-400">{userStats.tasksCreated}</p>
                        <p className="text-xs text-gray-500">Tasks Created</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.TASK_CREATED} pts each</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-green-400">{userStats.projectsCreated}</p>
                        <p className="text-xs text-gray-500">Projects Created</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.PROJECT_CREATED} pts each</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-pink-400">{userStats.messagesCount}</p>
                        <p className="text-xs text-gray-500">Messages Sent</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.MESSAGE_SENT} pt each</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-orange-400">{userStats.commentsCount}</p>
                        <p className="text-xs text-gray-500">Comments</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.COMMENT_ADDED} pts each</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 rounded-xl">
                        <p className="text-2xl font-bold text-cyan-400">{userStats.milestonesCompleted}</p>
                        <p className="text-xs text-gray-500">Milestones</p>
                        <p className="text-[10px] text-gray-600">+{RANK_POINTS.MILESTONE_COMPLETED} pts each</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Profile</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-purple-500/25">
                      {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-white text-lg font-semibold">{userProfile?.displayName}</p>
                      <p className="text-gray-400">{userProfile?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={userProfile?.displayName || ''}
                        disabled
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Email</label>
                      <input
                        type="email"
                        value={userProfile?.email || ''}
                        disabled
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <p className="text-gray-500 text-sm mt-4">
                    Profile editing coming soon.
                  </p>
                </div>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Notifications</h3>
                </div>
                <div className="p-5 space-y-4">
                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Notification Sound</p>
                      <p className="text-gray-400 text-sm">Play a sound when you receive notifications</p>
                    </div>
                    <button
                      onClick={toggleNotificationSound}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        soundEnabled ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                          soundEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Preview Sound Button */}
                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-white font-medium">Test Sound</p>
                      <p className="text-gray-400 text-sm">Preview the notification sound</p>
                    </div>
                    <button
                      onClick={previewNotificationSound}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      Play
                    </button>
                  </div>

                  <div className="border-t border-white/10 pt-4 mt-4">
                    <p className="text-xs text-gray-500">
                      You'll receive notifications for task assignments, @mentions, and project updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
