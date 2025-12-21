import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { globalSearch, type SearchResult } from '../../services/search';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToProjects } from '../../services/projects';
import { getGeneralChannelId, getProjectChannelId } from '../../services/messages';
import type { Project } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const resultIcons: Record<SearchResult['type'], React.ReactNode> = {
  project: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  task: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  message: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Subscribe to projects
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToProjects((data) => {
      const userProjects = data.filter((p) => p.members.includes(currentUser.uid));
      setProjects(userProjects);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Search when query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const projectIds = projects.map((p) => p.id);
    const channelIds = [
      getGeneralChannelId(),
      ...projects.map((p) => getProjectChannelId(p.id)),
    ];

    setLoading(true);
    const timeoutId = setTimeout(async () => {
      const searchResults = await globalSearch(query, projectIds, channelIds);
      setResults(searchResults);
      setLoading(false);
      setSelectedIndex(0);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, projects]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [results, selectedIndex, onClose]
  );

  function handleSelect(result: SearchResult) {
    switch (result.type) {
      case 'project':
        navigate(`/projects/${result.id}`);
        break;
      case 'task':
        navigate('/tasks');
        break;
      case 'message':
        navigate('/chat');
        break;
    }
    onClose();
    setQuery('');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 glass rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-slide-up">
        {/* Search input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, messages..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs text-gray-500 bg-white/5 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No results found for "{query}"
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    index === selectedIndex
                      ? 'bg-purple-500/20 text-white'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      result.type === 'project'
                        ? 'bg-purple-500/20 text-purple-400'
                        : result.type === 'task'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {resultIcons[result.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-gray-500 truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{result.type}</span>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length < 2 && (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">Type to search across your workspace</p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↑↓</kbd>
                  navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10">↵</kbd>
                  select
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
