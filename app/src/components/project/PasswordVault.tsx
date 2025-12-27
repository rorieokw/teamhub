import { useState, useEffect } from 'react';
import {
  subscribeToProjectVault,
  addPasswordEntry,
  deletePasswordEntry,
} from '../../services/projectVault';
import type { PasswordEntry } from '../../types';

interface PasswordVaultProps {
  projectId: string;
  userId: string;
  userName: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function PasswordVault({
  projectId,
  userId,
  userName,
  collapsed = false,
  onToggleCollapse,
}: PasswordVaultProps) {
  const [entries, setEntries] = useState<PasswordEntry[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Subscribe to entries
  useEffect(() => {
    const unsubscribe = subscribeToProjectVault(projectId, setEntries);
    return () => unsubscribe();
  }, [projectId]);

  const handleAddEntry = async () => {
    if (!newTitle.trim() || !newUsername.trim() || !newPassword.trim()) return;

    setIsLoading(true);
    try {
      await addPasswordEntry(
        projectId,
        newTitle.trim(),
        newUsername.trim(),
        newPassword.trim(),
        userId,
        userName,
        newUrl.trim() || undefined,
        newNotes.trim() || undefined
      );
      // Reset form
      setNewTitle('');
      setNewUsername('');
      setNewPassword('');
      setNewUrl('');
      setNewNotes('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add entry:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deletePasswordEntry(entryId);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const toggleRevealPassword = (entryId: string) => {
    setRevealedPasswords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800/80 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔐</span>
          <h3 className="font-medium text-white text-sm">Password Vault</h3>
          {entries.length > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
              {entries.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAdding(!isAdding);
            }}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Add credential"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3">
          {/* Add Entry Form */}
          {isAdding && (
            <div className="mb-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (e.g., Database, AWS)"
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
                autoFocus
              />
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Username / Email"
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Password / API Key"
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
              />
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="URL (optional)"
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
              />
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                rows={2}
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddEntry}
                  disabled={isLoading || !newTitle.trim() || !newUsername.trim() || !newPassword.trim()}
                  className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
                >
                  {isLoading ? 'Adding...' : 'Add Entry'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewTitle('');
                    setNewUsername('');
                    setNewPassword('');
                    setNewUrl('');
                    setNewNotes('');
                  }}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Entries List */}
          {entries.length === 0 && !isAdding ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">No credentials yet</p>
              <button
                onClick={() => setIsAdding(true)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                + Add a credential
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {entries.map((entry) => {
                const isRevealed = revealedPasswords.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="group p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    {/* Title row */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{entry.title}</span>
                        {entry.url && (
                          <a
                            href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {entry.addedBy === userId && (
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                          title="Delete"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Username row */}
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="text-gray-500 w-16">User:</span>
                      <span className="text-gray-300 flex-1 truncate">{entry.username}</span>
                      <button
                        onClick={() => copyToClipboard(entry.username, `user-${entry.id}`)}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title="Copy username"
                      >
                        {copiedField === `user-${entry.id}` ? (
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Password row */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500 w-16">Pass:</span>
                      <span className="text-gray-300 flex-1 truncate font-mono">
                        {isRevealed ? entry.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => toggleRevealPassword(entry.id)}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title={isRevealed ? 'Hide' : 'Show'}
                      >
                        {isRevealed ? (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(entry.password, `pass-${entry.id}`)}
                        className="p-1 text-gray-500 hover:text-white transition-colors"
                        title="Copy password"
                      >
                        {copiedField === `pass-${entry.id}` ? (
                          <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Notes */}
                    {entry.notes && (
                      <p className="text-xs text-gray-500 mt-1 truncate" title={entry.notes}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-600 mt-2">
            Shared with all project members
          </p>
        </div>
      )}
    </div>
  );
}
