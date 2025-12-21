import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { togglePin, isItemPinned } from '../../services/pinnedItems';
import type { PinnedItemType } from '../../types';

interface PinButtonProps {
  itemType: PinnedItemType;
  itemId: string;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function PinButton({
  itemType,
  itemId,
  title,
  subtitle,
  size = 'sm',
  className = '',
}: PinButtonProps) {
  const { currentUser } = useAuth();
  const [isPinned, setIsPinned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // Check initial pin status
    isItemPinned(currentUser.uid, itemType, itemId).then(setIsPinned);
  }, [currentUser, itemType, itemId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!currentUser || isLoading) return;

    setIsLoading(true);
    try {
      const newState = await togglePin(currentUser.uid, itemType, itemId, title, subtitle);
      setIsPinned(newState);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const buttonClasses = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${buttonClasses} rounded-lg transition-all
        ${isPinned
          ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
          : 'text-white/40 hover:text-white/70 hover:bg-white/10'
        }
        ${isLoading ? 'animate-pulse' : ''}
        ${className}
      `}
      title={isPinned ? 'Unpin' : 'Pin'}
    >
      <svg
        className={sizeClasses}
        fill={isPinned ? 'currentColor' : 'none'}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
        />
      </svg>
    </button>
  );
}
