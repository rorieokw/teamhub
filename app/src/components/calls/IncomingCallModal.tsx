import { useEffect } from 'react';
import { useCall } from '../../contexts/CallContext';

// Phone icon SVG
function PhoneIcon({ size = 28 }: { size?: number }) {
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
function PhoneOffIcon({ size = 28 }: { size?: number }) {
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

// User icon SVG
function UserIcon({ size = 40 }: { size?: number }) {
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
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall, isConnecting } = useCall();

  // Play ringtone when there's an incoming call
  useEffect(() => {
    if (incomingCall) {
      // Create a simple ringtone using Web Audio API
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      const playRing = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      };

      // Ring pattern: two short rings
      playRing();
      const timeout1 = setTimeout(playRing, 200);

      // Repeat every 2 seconds
      const interval = setInterval(() => {
        playRing();
        setTimeout(playRing, 200);
      }, 2000);

      return () => {
        clearTimeout(timeout1);
        clearInterval(interval);
        audioContext.close();
      };
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-sm w-full mx-4 animate-pulse-slow">
        {/* Caller avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {incomingCall.callerAvatar?.startsWith('http') ? (
                <img
                  src={incomingCall.callerAvatar}
                  alt=""
                  className="w-full h-full rounded-full object-cover"
                />
              ) : incomingCall.callerAvatar ? (
                <span>{incomingCall.callerAvatar}</span>
              ) : (
                <UserIcon size={40} />
              )}
            </div>
            {/* Ringing animation */}
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-30" />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-white">
            {incomingCall.callerName}
          </h2>
          <p className="text-gray-400 mt-1">Incoming audio call...</p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-8">
          {/* Decline */}
          <button
            onClick={() => declineCall(incomingCall.id)}
            disabled={isConnecting}
            className="group flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-red-500/30 group-hover:scale-105">
              <PhoneOffIcon size={28} />
            </div>
            <span className="mt-2 text-sm text-gray-400">Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={() => acceptCall(incomingCall.id)}
            disabled={isConnecting}
            className="group flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-green-500/30 group-hover:scale-105">
              {isConnecting ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PhoneIcon size={28} />
              )}
            </div>
            <span className="mt-2 text-sm text-gray-400">
              {isConnecting ? 'Connecting...' : 'Accept'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
