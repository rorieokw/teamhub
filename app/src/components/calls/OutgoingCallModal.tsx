import { useCall } from '../../contexts/CallContext';

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

// Phone icon SVG (ringing animation)
function PhoneRingingIcon() {
  return (
    <div className="relative">
      <svg
        width={48}
        height={48}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-white animate-pulse"
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      {/* Ringing waves */}
      <div className="absolute -top-1 -right-1">
        <div className="flex gap-0.5">
          <div className="w-1 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-4 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export function OutgoingCallModal() {
  const { outgoingCall, cancelCall, isConnecting } = useCall();

  if (!outgoingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-sm w-full mx-4">
        {/* Calling animation */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
              <PhoneRingingIcon />
            </div>
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-green-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse opacity-40" />
          </div>

          <h2 className="text-xl font-semibold text-white">
            Calling...
          </h2>
          <p className="text-gray-400 mt-1">
            {isConnecting ? 'Connecting...' : 'Waiting for answer...'}
          </p>

          {/* Audio indicator */}
          <div className="flex items-center gap-1 mt-4">
            <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" />
            <div className="w-1 h-5 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '100ms' }} />
            <div className="w-1 h-4 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-1 h-6 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>

        {/* Cancel button */}
        <div className="flex justify-center">
          <button
            onClick={cancelCall}
            className="group flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-red-500/30 group-hover:scale-105">
              <PhoneOffIcon size={28} />
            </div>
            <span className="mt-2 text-sm text-gray-400">Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
