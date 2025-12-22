import { useState } from 'react';
import { useCall } from '../../contexts/CallContext';

interface CallButtonProps {
  participantIds: string[];
  participantName?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function CallButton({ participantIds, participantName, className = '', size = 'md' }: CallButtonProps) {
  const { startCall, activeCall, isConnecting, outgoingCall } = useCall();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async () => {
    if (activeCall || isConnecting || outgoingCall) return;
    await startCall(participantIds, participantName);
  };

  const isDisabled = !!activeCall || !!outgoingCall || isConnecting || participantIds.length === 0;

  const sizeClasses = size === 'sm'
    ? 'p-1.5'
    : 'p-2';

  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        relative rounded-full transition-all duration-200
        ${isDisabled
          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-500 text-white hover:shadow-lg hover:shadow-green-500/30'}
        ${sizeClasses}
        ${className}
      `}
      title={activeCall ? 'Already in a call' : isConnecting ? 'Connecting...' : 'Start audio call'}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isConnecting ? 'animate-pulse' : ''}
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>

      {isHovered && !isDisabled && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Audio Call
        </span>
      )}
    </button>
  );
}
