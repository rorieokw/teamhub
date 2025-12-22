import { useState, useEffect } from 'react';
import { useCall } from '../../contexts/CallContext';

// Phone icon SVG
function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

// Phone off icon SVG
function PhoneOffIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// Microphone icon SVG
function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Microphone off icon SVG
function MicOffIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// Users icon SVG
function UsersIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function ActiveCallBar() {
  const { activeCall, endCall, isMuted, toggleMute, isConnecting } = useCall();
  const [duration, setDuration] = useState(0);

  // Track call duration
  useEffect(() => {
    if (!activeCall?.startedAt) return;

    const startTime = activeCall.startedAt.toDate?.()
      ? activeCall.startedAt.toDate().getTime()
      : Date.now();

    const interval = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.startedAt]);

  // Reset duration when call ends
  useEffect(() => {
    if (!activeCall) {
      setDuration(0);
    }
  }, [activeCall]);

  if (!activeCall) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const participantCount = activeCall.participants.length;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-green-600 to-emerald-600 shadow-2xl rounded-2xl border border-white/20">
      <div className="px-6 py-4">
        <div className="flex items-center gap-6">
          {/* Call info */}
          <div className="flex items-center gap-4">
            {/* Pulsing call indicator */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <PhoneIcon size={24} />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-lg">
                  {isConnecting ? 'Connecting...' : formatDuration(duration)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-white/70 text-sm">
                <UsersIcon size={14} />
                <span>{participantCount} in call</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-white/20" />

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Mute button */}
            <button
              onClick={toggleMute}
              className={`
                w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center
                ${isMuted
                  ? 'bg-red-500 hover:bg-red-400 shadow-lg shadow-red-500/30'
                  : 'bg-white/20 hover:bg-white/30'}
              `}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <MicOffIcon size={22} />
              ) : (
                <MicIcon size={22} />
              )}
            </button>

            {/* End call button */}
            <button
              onClick={endCall}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full transition-all duration-200 shadow-lg hover:shadow-red-500/30 hover:scale-105"
            >
              <PhoneOffIcon size={20} />
              <span className="text-white font-semibold">End Call</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
