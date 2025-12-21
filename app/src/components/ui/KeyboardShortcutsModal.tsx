import { useEffect } from 'react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Open global search' },
  { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
  { keys: ['Ctrl', 'P'], description: 'Go to Projects' },
  { keys: ['Ctrl', 'T'], description: 'Go to Tasks' },
  { keys: ['Ctrl', 'M'], description: 'Go to Chat' },
  { keys: ['Ctrl', 'F'], description: 'Go to Documents' },
  { keys: ['Ctrl', ','], description: 'Go to Settings' },
  { keys: ['Esc'], description: 'Close modal / Cancel' },
  { keys: ['?'], description: 'Show this help' },
];

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-700 animate-scale-in">
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2"
              >
                <span className="text-gray-300">{shortcut.description}</span>
                <div className="flex gap-1">
                  {shortcut.keys.map((key, i) => (
                    <kbd
                      key={i}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-gray-300 font-mono"
                    >
                      {key}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-700 text-center">
          <p className="text-sm text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs">?</kbd> anywhere to show this help
          </p>
        </div>
      </div>
    </div>
  );
}
