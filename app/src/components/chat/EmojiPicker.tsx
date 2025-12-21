import { useState } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Reactions': ['👍', '👎', '❤️', '🔥', '🎉', '😂', '😮', '😢'],
  'Faces': ['😀', '😊', '🤔', '😎', '🙄', '😅', '🥳', '😴'],
  'Gestures': ['👋', '🙌', '👏', '🤝', '✌️', '🤞', '💪', '🙏'],
  'Objects': ['💡', '⭐', '✅', '❌', '⚠️', '🚀', '💯', '🎯'],
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState('Reactions');

  return (
    <div className="absolute bottom-full right-0 mb-2 glass rounded-xl p-3 shadow-xl border border-white/10 z-50 animate-fade-in">
      {/* Category tabs */}
      <div className="flex gap-1 mb-2 pb-2 border-b border-white/10">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-2 py-1 text-xs rounded-lg transition-colors ${
              activeCategory === category
                ? 'bg-purple-500/30 text-purple-300'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-1">
        {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Close on outside click */}
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// Compact emoji reaction bar for quick reactions
export function QuickReactions({ onSelect }: { onSelect: (emoji: string) => void }) {
  const quickEmojis = ['👍', '❤️', '🔥', '🎉', '😂', '😮'];

  return (
    <div className="flex gap-1">
      {quickEmojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-7 h-7 flex items-center justify-center text-sm hover:bg-white/10 rounded-lg transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
