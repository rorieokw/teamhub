import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    { key: 'd', ctrl: true, action: () => navigate('/'), description: 'Go to Dashboard' },
    { key: 'p', ctrl: true, action: () => navigate('/projects'), description: 'Go to Projects' },
    { key: 't', ctrl: true, action: () => navigate('/tasks'), description: 'Go to Tasks' },
    { key: 'm', ctrl: true, action: () => navigate('/chat'), description: 'Go to Chat' },
    { key: 'f', ctrl: true, action: () => navigate('/documents'), description: 'Go to Documents' },
    { key: ',', ctrl: true, action: () => navigate('/settings'), description: 'Go to Settings' },
  ];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;

        if (e.key.toLowerCase() === shortcut.key && ctrlMatch && altMatch && shiftMatch) {
          e.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

export function useEscapeKey(callback: () => void) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [callback]);
}
