import { useState, useEffect } from 'react';
import {
  subscribeToProjectLinks,
  addProjectLink,
  deleteProjectLink,
  getFaviconUrl,
} from '../../services/projectLinks';
import type { ProjectLink } from '../../types';

interface PinnedLinksProps {
  projectId: string;
  userId: string;
  userName: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function PinnedLinks({
  projectId,
  userId,
  userName,
  collapsed = false,
  onToggleCollapse,
}: PinnedLinksProps) {
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to links
  useEffect(() => {
    const unsubscribe = subscribeToProjectLinks(projectId, setLinks);
    return () => unsubscribe();
  }, [projectId]);

  const handleAddLink = async () => {
    if (!newTitle.trim() || !newUrl.trim()) return;

    // Validate URL
    let url = newUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    setIsLoading(true);
    try {
      await addProjectLink(projectId, newTitle.trim(), url, userId, userName);
      setNewTitle('');
      setNewUrl('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add link:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await deleteProjectLink(linkId);
    } catch (error) {
      console.error('Failed to delete link:', error);
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
          <span className="text-lg">🔗</span>
          <h3 className="font-medium text-white text-sm">Pinned Links</h3>
          {links.length > 0 && (
            <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
              {links.length}
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
            title="Add link"
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
          {/* Add Link Form */}
          {isAdding && (
            <div className="mb-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Link title"
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
                autoFocus
              />
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-2 py-1.5 bg-gray-700/50 border border-gray-600/50 rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 mb-2"
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLink}
                  disabled={isLoading || !newTitle.trim() || !newUrl.trim()}
                  className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs rounded transition-colors"
                >
                  {isLoading ? 'Adding...' : 'Add Link'}
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewTitle('');
                    setNewUrl('');
                  }}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-300 text-xs rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Links List */}
          {links.length === 0 && !isAdding ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm mb-2">No links yet</p>
              <button
                onClick={() => setIsAdding(true)}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                + Add a link
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="group flex items-center gap-2 p-2 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                >
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    className="w-4 h-4 rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-sm text-white hover:text-purple-300 truncate"
                  >
                    {link.title}
                  </a>
                  {link.addedBy === userId && (
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-400 transition-all"
                      title="Delete"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-600 mt-2">
            Links are shared with all project members
          </p>
        </div>
      )}
    </div>
  );
}
