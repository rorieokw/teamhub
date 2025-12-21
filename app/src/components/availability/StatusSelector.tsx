import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  updateUserStatus,
  STATUS_OPTIONS,
  getStatusColor,
} from '../../services/presence';
import type { UserStatus } from '../../types';

interface StatusSelectorProps {
  currentStatus: UserStatus;
  compact?: boolean;
}

export default function StatusSelector({ currentStatus, compact = false }: StatusSelectorProps) {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStatusChange = async (status: UserStatus) => {
    if (!currentUser) return;

    setIsUpdating(true);
    try {
      await updateUserStatus(currentUser.uid, status);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
      setIsOpen(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find((opt) => opt.value === currentStatus) || STATUS_OPTIONS[0];

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isUpdating}
          className={`
            w-3 h-3 rounded-full ${getStatusColor(currentStatus)}
            ring-2 ring-offset-2 ring-offset-gray-900 ring-white/20
            hover:ring-white/40 transition-all cursor-pointer
            ${isUpdating ? 'animate-pulse' : ''}
          `}
          title={`Status: ${currentOption.label}`}
        />

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-40 glass-card rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusChange(option.value)}
                className={`
                  w-full px-3 py-2 text-left flex items-center gap-2 text-sm
                  hover:bg-white/10 transition-colors
                  ${currentStatus === option.value ? 'bg-white/5' : ''}
                `}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(option.value)}`} />
                <span className="text-white/90">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          bg-white/5 hover:bg-white/10 border border-white/10
          transition-all text-sm
          ${isUpdating ? 'opacity-50' : ''}
        `}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(currentStatus)}`} />
        <span className="text-white/80">{currentOption.label}</span>
        <svg
          className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[140px] glass-card rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`
                w-full px-3 py-2 text-left flex items-center gap-2 text-sm
                hover:bg-white/10 transition-colors
                ${currentStatus === option.value ? 'bg-white/5' : ''}
              `}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(option.value)}`} />
              <span className="text-white/90">{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
