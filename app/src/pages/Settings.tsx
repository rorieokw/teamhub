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
import {
  getCallSettings,
  saveCallSettings,
  type VoiceMode,
} from '../services/callSettings';
import { APP_VERSION, BUILD_DATE, CHANGELOG } from '../version';

type SettingsTab = 'general' | 'appearance' | 'accessibility' | 'calls' | 'chat' | 'notifications' | 'shortcuts' | 'language' | 'account';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const userStats = useUserRank(currentUser?.uid);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('voice-activated');
  const [pushToTalkKey, setPushToTalkKey] = useState('Space');
  const [isRecordingKey, setIsRecordingKey] = useState(false);

  // Accessibility settings
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [reduceMotion, setReduceMotion] = useState(false);

  // Chat settings
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [enterToSend, setEnterToSend] = useState(true);

  // Language & Time settings
  const [dateFormat, setDateFormat] = useState<'mdy' | 'dmy' | 'ymd'>('mdy');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');

  // Load preferences on mount
  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled());
    const callSettings = getCallSettings();
    setVoiceMode(callSettings.voiceMode);
    setPushToTalkKey(callSettings.pushToTalkKey);
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
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
      id: 'accessibility',
      label: 'Accessibility',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      id: 'calls',
      label: 'Voice & Video',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'shortcuts',
      label: 'Keybinds',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'language',
      label: 'Language & Time',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">About TeamHub</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Version</p>
                      <p className="text-gray-400 text-sm">Current application version</p>
                    </div>
                    <div className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl">
                      <span className="text-purple-300 font-mono font-medium">v{__APP_VERSION__}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">TeamHub</h4>
                    <p className="text-gray-400 text-sm">
                      A collaborative workspace for your team. Chat, manage projects, track tasks, and share documents all in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Version Info */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">About TeamHub</h3>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">TeamHub</h2>
                        <p className="text-gray-400 text-sm">Collaborative workspace for teams</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl">
                        <span className="text-purple-400 font-mono font-bold text-lg">v{APP_VERSION}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Version</p>
                      <p className="text-white font-mono font-bold">{APP_VERSION}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Build Date</p>
                      <p className="text-white font-mono font-bold">{BUILD_DATE}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Check this version on any computer to ensure you're running the latest build</span>
                  </div>
                </div>
              </div>

              {/* Recent Changes */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">What's New</h3>
                </div>
                <div className="p-5">
                  {CHANGELOG.map((release, i) => (
                    <div key={release.version} className={i > 0 ? 'mt-6 pt-6 border-t border-white/10' : ''}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-2.5 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-mono font-bold">
                          v{release.version}
                        </span>
                        <span className="text-gray-500 text-sm">{release.date}</span>
                      </div>
                      <ul className="space-y-2">
                        {release.changes.map((change, j) => (
                          <li key={j} className="flex items-start gap-2 text-gray-300 text-sm">
                            <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credits */}
              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Built with love</h4>
                    <p className="text-gray-400 text-sm">
                      TeamHub is designed for seamless team collaboration. Stay tuned for more features!
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
                    More appearance options coming soon: custom accent colors and themes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Text Size</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    Adjust the text size across the application.
                  </p>
                  <div className="flex gap-3">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                          fontSize === size
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        <span className={`text-white font-medium ${
                          size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                        }`}>
                          {size.charAt(0).toUpperCase() + size.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Motion</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Reduce Motion</p>
                      <p className="text-gray-400 text-sm">Minimize animations throughout the app</p>
                    </div>
                    <button
                      onClick={() => setReduceMotion(!reduceMotion)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        reduceMotion ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                          reduceMotion ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Accessibility</h4>
                    <p className="text-gray-400 text-sm">
                      These settings help make TeamHub more comfortable to use. Changes are saved automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="space-y-6">
              {/* Voice Mode */}
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Voice Mode</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    Choose how your microphone is activated during calls.
                  </p>

                  {/* Voice Activated Option */}
                  <button
                    onClick={() => {
                      setVoiceMode('voice-activated');
                      saveCallSettings({ voiceMode: 'voice-activated' });
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      voiceMode === 'voice-activated'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        voiceMode === 'voice-activated' ? 'bg-purple-500' : 'bg-white/10'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-medium">Voice Activated</p>
                        <p className="text-gray-400 text-sm">Microphone is always on during calls</p>
                      </div>
                      {voiceMode === 'voice-activated' && (
                        <div className="ml-auto">
                          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Push to Talk Option */}
                  <button
                    onClick={() => {
                      setVoiceMode('push-to-talk');
                      saveCallSettings({ voiceMode: 'push-to-talk' });
                    }}
                    className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                      voiceMode === 'push-to-talk'
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        voiceMode === 'push-to-talk' ? 'bg-purple-500' : 'bg-white/10'
                      }`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white font-medium">Push to Talk</p>
                        <p className="text-gray-400 text-sm">Hold a key to transmit your voice</p>
                      </div>
                      {voiceMode === 'push-to-talk' && (
                        <div className="ml-auto">
                          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Push to Talk Key Binding */}
              {voiceMode === 'push-to-talk' && (
                <div className="glass rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/10">
                    <h3 className="text-lg font-semibold text-white">Push to Talk Key</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-gray-400 text-sm mb-4">
                      Press a key while clicking the button below to set your push-to-talk key.
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setIsRecordingKey(true)}
                        onKeyDown={(e) => {
                          if (isRecordingKey) {
                            e.preventDefault();
                            const key = e.key === ' ' ? 'Space' : e.key;
                            setPushToTalkKey(key);
                            saveCallSettings({ pushToTalkKey: key });
                            setIsRecordingKey(false);
                          }
                        }}
                        className={`px-6 py-3 rounded-xl font-medium transition-all ${
                          isRecordingKey
                            ? 'bg-purple-600 text-white animate-pulse'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {isRecordingKey ? 'Press any key...' : 'Change Key'}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Current key:</span>
                        <kbd className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-mono">
                          {pushToTalkKey}
                        </kbd>
                      </div>
                    </div>
                    {isRecordingKey && (
                      <button
                        onClick={() => setIsRecordingKey(false)}
                        className="mt-3 text-sm text-gray-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Call Tips */}
              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Call Tips</h4>
                    <ul className="text-gray-400 text-sm space-y-1">
                      <li>• Use a headset for best audio quality</li>
                      <li>• Push-to-talk reduces background noise</li>
                      <li>• You can call teammates from their profile or the chat</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="space-y-6">
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Message Display</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Show Timestamps</p>
                      <p className="text-gray-400 text-sm">Display time next to each message</p>
                    </div>
                    <button
                      onClick={() => setShowTimestamps(!showTimestamps)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        showTimestamps ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                          showTimestamps ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <p className="text-white font-medium">Compact Mode</p>
                      <p className="text-gray-400 text-sm">Reduce spacing between messages</p>
                    </div>
                    <button
                      onClick={() => setCompactMode(!compactMode)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        compactMode ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                          compactMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Input Behavior</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Enter to Send</p>
                      <p className="text-gray-400 text-sm">Press Enter to send messages (Shift+Enter for new line)</p>
                    </div>
                    <button
                      onClick={() => setEnterToSend(!enterToSend)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        enterToSend ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform shadow-lg ${
                          enterToSend ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Sound</h3>
                </div>
                <div className="p-5 space-y-4">
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
                </div>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">What You'll Be Notified About</h3>
                </div>
                <div className="p-5">
                  <ul className="text-gray-400 text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Task assignments
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      @mentions in chat
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Project updates
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Incoming calls
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Date Format</h3>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-gray-400 text-sm mb-4">
                    Choose how dates are displayed throughout the app.
                  </p>
                  <div className="space-y-2">
                    {([
                      { id: 'mdy', label: 'MM/DD/YYYY', example: '12/23/2025' },
                      { id: 'dmy', label: 'DD/MM/YYYY', example: '23/12/2025' },
                      { id: 'ymd', label: 'YYYY-MM-DD', example: '2025-12-23' },
                    ] as const).map((format) => (
                      <button
                        key={format.id}
                        onClick={() => setDateFormat(format.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          dateFormat === format.id
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-white/20 bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{format.label}</p>
                            <p className="text-gray-400 text-sm">{format.example}</p>
                          </div>
                          {dateFormat === format.id && (
                            <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white">Time Format</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTimeFormat('12h')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        timeFormat === '12h'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <p className="text-white font-medium">12-Hour</p>
                      <p className="text-gray-400 text-sm">3:30 PM</p>
                    </button>
                    <button
                      onClick={() => setTimeFormat('24h')}
                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                        timeFormat === '24h'
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                      }`}
                    >
                      <p className="text-white font-medium">24-Hour</p>
                      <p className="text-gray-400 text-sm">15:30</p>
                    </button>
                  </div>
                </div>
              </div>

              <div className="glass rounded-xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Timezone</h4>
                    <p className="text-gray-400 text-sm">
                      Your timezone is automatically detected from your browser settings.
                    </p>
                  </div>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
