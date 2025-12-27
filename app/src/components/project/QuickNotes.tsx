import { useState, useEffect, useRef } from 'react';
import { subscribeToProjectNote, saveProjectNote } from '../../services/projectNotes';
import type { ProjectNote } from '../../types';

interface QuickNotesProps {
  projectId: string;
  userId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function QuickNotes({
  projectId,
  userId,
  collapsed = false,
  onToggleCollapse,
}: QuickNotesProps) {
  const [note, setNote] = useState<ProjectNote | null>(null);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to note updates
  useEffect(() => {
    const unsubscribe = subscribeToProjectNote(userId, projectId, (projectNote) => {
      setNote(projectNote);
      if (projectNote) {
        setContent(projectNote.content);
      }
    });

    return () => unsubscribe();
  }, [userId, projectId]);

  // Auto-save with debounce
  useEffect(() => {
    if (note === null && content === '') return; // Don't save empty initial state
    if (note?.content === content) return; // No changes

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await saveProjectNote(userId, projectId, content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save note:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000); // 1 second debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [content, userId, projectId, note]);

  // Auto-resize textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 300)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [content, collapsed]);

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800/80 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📝</span>
          <h3 className="font-medium text-white text-sm">Quick Notes</h3>
          {content && (
            <span className="w-2 h-2 bg-purple-500 rounded-full" title="Has notes" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-gray-500">Saving...</span>
          )}
          {!isSaving && lastSaved && (
            <span className="text-xs text-gray-500">Saved {formatLastSaved()}</span>
          )}
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
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              adjustHeight();
            }}
            placeholder="Write your notes here... Ideas, meeting notes, decisions, TODOs..."
            className="w-full min-h-[100px] max-h-[300px] px-3 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 resize-none"
          />
          <p className="text-xs text-gray-600 mt-2">
            Your notes are private and auto-saved
          </p>
        </div>
      )}
    </div>
  );
}
