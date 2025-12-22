import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Call } from '../types';
import {
  createCall,
  updateCallStatus,
  subscribeToCall,
  subscribeToIncomingCalls,
  storeOffer,
  storeAnswer,
  subscribeToSignals,
  storeIceCandidate,
  subscribeToIceCandidates,
  cleanupCallSignaling,
  ICE_SERVERS,
} from '../services/calls';

interface CallContextType {
  // State
  incomingCall: Call | null;
  outgoingCall: Call | null; // New: for caller to see "Calling..." UI
  activeCall: Call | null;
  isMuted: boolean;
  isConnecting: boolean;
  callError: string | null;
  participants: Map<string, { muted: boolean; stream?: MediaStream }>;

  // Actions
  startCall: (participantIds: string[], participantName?: string) => Promise<void>;
  acceptCall: (callId: string) => Promise<void>;
  declineCall: (callId: string) => Promise<void>;
  endCall: () => Promise<void>;
  cancelCall: () => Promise<void>; // New: cancel outgoing call
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType>({
  incomingCall: null,
  outgoingCall: null,
  activeCall: null,
  isMuted: false,
  isConnecting: false,
  callError: null,
  participants: new Map(),
  startCall: async () => {},
  acceptCall: async () => {},
  declineCall: async () => {},
  endCall: async () => {},
  cancelCall: async () => {},
  toggleMute: () => {},
});

export function useCall() {
  return useContext(CallContext);
}

// Audio feedback utilities
function createRingbackTone(): { start: () => void; stop: () => void } {
  let audioContext: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let intervalId: number | null = null;

  const start = () => {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    const playTone = () => {
      if (!audioContext) return;

      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    };

    playTone();
    intervalId = window.setInterval(playTone, 3000);
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (oscillator) {
      try { oscillator.stop(); } catch {}
      oscillator = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return { start, stop };
}

function playConnectedTone() {
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  // Play two ascending tones
  [440, 554].forEach((freq, i) => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.value = freq;
    osc.type = 'sine';

    const startTime = audioContext.currentTime + (i * 0.15);
    gain.gain.setValueAtTime(0.3, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);

    osc.start(startTime);
    osc.stop(startTime + 0.15);
  });

  setTimeout(() => audioContext.close(), 500);
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { currentUser, userProfile } = useAuth();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [outgoingCall, setOutgoingCall] = useState<Call | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Map<string, { muted: boolean; stream?: MediaStream }>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const callIdRef = useRef<string | null>(null);
  const unsubscribersRef = useRef<Array<() => void>>([]);
  const ringbackRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const callingUserNameRef = useRef<string>('');

  // Use refs to track call state without causing re-subscriptions
  const activeCallRef = useRef<Call | null>(null);
  const outgoingCallRef = useRef<Call | null>(null);

  // Keep refs in sync with state
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  // Cleanup function
  const cleanup = useCallback(() => {
    // Stop ringback tone
    if (ringbackRef.current) {
      ringbackRef.current.stop();
      ringbackRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close peer connections
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    // Remove audio elements
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Unsubscribe from listeners
    unsubscribersRef.current.forEach((unsub) => unsub());
    unsubscribersRef.current = [];

    setParticipants(new Map());
    setIsConnecting(false);
    setOutgoingCall(null);
    callIdRef.current = null;
    callingUserNameRef.current = '';
  }, []);

  // Subscribe to incoming calls - use refs to avoid re-subscription on state changes
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up incoming calls subscription for:', currentUser.uid);

    const unsubscribe = subscribeToIncomingCalls(currentUser.uid, (calls) => {
      console.log('Received incoming calls:', calls.length, calls);
      // Show the first incoming call (if not already in a call)
      // Use refs to check current state without causing dependency changes
      if (calls.length > 0 && !activeCallRef.current && !outgoingCallRef.current) {
        console.log('Setting incoming call:', calls[0]);
        setIncomingCall(calls[0]);
      } else if (calls.length === 0) {
        setIncomingCall(null);
      }
    });

    return () => {
      console.log('Unsubscribing from incoming calls');
      unsubscribe();
    };
  }, [currentUser]); // Only depend on currentUser

  // Get local audio stream
  const getLocalStream = useCallback(async (): Promise<MediaStream> => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    localStreamRef.current = stream;
    return stream;
  }, []);

  // Create peer connection for a specific user
  const createPeerConnection = useCallback(
    (remoteUserId: string, callId: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && currentUser) {
          storeIceCandidate(callId, currentUser.uid, remoteUserId, event.candidate.toJSON());
        }
      };

      // Handle incoming tracks
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;

        // Create or update audio element
        let audioEl = audioElementsRef.current.get(remoteUserId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioElementsRef.current.set(remoteUserId, audioEl);
        }
        audioEl.srcObject = remoteStream;

        // Update participants
        setParticipants((prev) => {
          const next = new Map(prev);
          next.set(remoteUserId, { muted: false, stream: remoteStream });
          return next;
        });
      };

      pc.onconnectionstatechange = () => {
        console.log(`Connection state with ${remoteUserId}:`, pc.connectionState);
      };

      peerConnectionsRef.current.set(remoteUserId, pc);
      return pc;
    },
    [currentUser]
  );

  // Start a call
  const startCall = useCallback(
    async (participantIds: string[], participantName?: string) => {
      if (!currentUser || !userProfile) {
        setCallError('You must be logged in to make calls');
        return;
      }

      setCallError(null);
      setIsConnecting(true);
      callingUserNameRef.current = participantName || 'User';

      try {
        // Request microphone permission first
        console.log('Requesting microphone access...');
        await getLocalStream();
        console.log('Microphone access granted');

        // Create call in Firestore
        console.log('Creating call in Firestore...');
        const callId = await createCall(
          currentUser.uid,
          userProfile.displayName,
          userProfile.avatarUrl,
          participantIds
        );
        callIdRef.current = callId;
        console.log('Call created:', callId);

        // Set outgoing call state so UI shows "Calling..."
        setOutgoingCall({
          id: callId,
          type: 'audio',
          callerId: currentUser.uid,
          callerName: userProfile.displayName,
          callerAvatar: userProfile.avatarUrl,
          participants: [currentUser.uid, ...participantIds],
          status: 'ringing',
          createdAt: null as unknown as import('firebase/firestore').Timestamp,
        });

        // Start ringback tone for caller
        ringbackRef.current = createRingbackTone();
        ringbackRef.current.start();

        // Subscribe to call updates
        const unsubCall = subscribeToCall(callId, (call) => {
          console.log('Call update:', call?.status);
          if (call?.status === 'active') {
            // Call was answered!
            if (ringbackRef.current) {
              ringbackRef.current.stop();
              ringbackRef.current = null;
            }
            playConnectedTone();
            setActiveCall(call);
            setOutgoingCall(null);
            setIncomingCall(null);
            setIsConnecting(false);
          } else if (call?.status === 'ended' || call?.status === 'declined' || call?.status === 'missed') {
            setActiveCall(null);
            setOutgoingCall(null);
            cleanup();
          }
        });
        unsubscribersRef.current.push(unsubCall);

        // Create peer connections and offers for each participant
        for (const odlUser of participantIds) {
          const pc = createPeerConnection(odlUser, callId);

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await storeOffer(callId, currentUser.uid, odlUser, offer);
        }

        // Subscribe to answers and ICE candidates
        const unsubSignals = subscribeToSignals(callId, currentUser.uid, async (signals) => {
          for (const signal of signals) {
            if (signal.from === currentUser.uid && signal.answer) {
              // We sent an offer and got an answer back
              const pc = peerConnectionsRef.current.get(signal.to);
              if (pc && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(signal.answer);
              }
            }
          }
        });
        unsubscribersRef.current.push(unsubSignals);

        const unsubCandidates = subscribeToIceCandidates(callId, currentUser.uid, async (candidates) => {
          for (const { from, candidate } of candidates) {
            const pc = peerConnectionsRef.current.get(from);
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            }
          }
        });
        unsubscribersRef.current.push(unsubCandidates);

      } catch (err) {
        console.error('Error starting call:', err);

        // Provide user-friendly error messages
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setCallError('Microphone access denied. Please allow microphone access to make calls.');
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setCallError('No microphone found. Please connect a microphone to make calls.');
        } else {
          setCallError('Failed to start call. Please try again.');
        }

        cleanup();
      }
    },
    [currentUser, userProfile, getLocalStream, createPeerConnection, cleanup]
  );

  // Cancel outgoing call
  const cancelCall = useCallback(async () => {
    if (callIdRef.current) {
      await updateCallStatus(callIdRef.current, 'ended');
      await cleanupCallSignaling(callIdRef.current);
    }
    setOutgoingCall(null);
    cleanup();
  }, [cleanup]);

  // Accept an incoming call
  const acceptCall = useCallback(
    async (callId: string) => {
      if (!currentUser || !userProfile) return;

      setIsConnecting(true);
      callIdRef.current = callId;

      try {
        // Get local audio
        await getLocalStream();

        // Update call status to active
        await updateCallStatus(callId, 'active');

        // Play connected tone
        playConnectedTone();

        // Subscribe to call updates
        const unsubCall = subscribeToCall(callId, (call) => {
          if (call?.status === 'active') {
            setActiveCall(call);
            setIncomingCall(null);
          } else if (call?.status === 'ended') {
            setActiveCall(null);
            cleanup();
          }
        });
        unsubscribersRef.current.push(unsubCall);

        // Subscribe to signals (offers from others)
        const unsubSignals = subscribeToSignals(callId, currentUser.uid, async (signals) => {
          for (const signal of signals) {
            if (signal.to === currentUser.uid && !signal.answer) {
              // We received an offer, create answer
              let pc = peerConnectionsRef.current.get(signal.from);
              if (!pc) {
                pc = createPeerConnection(signal.from, callId);
              }

              if (pc.signalingState === 'stable') {
                await pc.setRemoteDescription(signal.sdp);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await storeAnswer(callId, currentUser.uid, signal.from, answer);
              }
            }
          }
        });
        unsubscribersRef.current.push(unsubSignals);

        // Subscribe to ICE candidates
        const unsubCandidates = subscribeToIceCandidates(callId, currentUser.uid, async (candidates) => {
          for (const { from, candidate } of candidates) {
            const pc = peerConnectionsRef.current.get(from);
            if (pc && pc.remoteDescription) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (err) {
                console.error('Error adding ICE candidate:', err);
              }
            }
          }
        });
        unsubscribersRef.current.push(unsubCandidates);

        setIsConnecting(false);
      } catch (err) {
        console.error('Error accepting call:', err);

        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setCallError('Microphone access denied. Please allow microphone access.');
        } else {
          setCallError('Failed to accept call. Please try again.');
        }

        setIsConnecting(false);
        cleanup();
      }
    },
    [currentUser, userProfile, getLocalStream, createPeerConnection, cleanup]
  );

  // Decline an incoming call
  const declineCall = useCallback(
    async (callId: string) => {
      await updateCallStatus(callId, 'declined');
      setIncomingCall(null);
    },
    []
  );

  // End the current call
  const endCall = useCallback(async () => {
    if (callIdRef.current) {
      await updateCallStatus(callIdRef.current, 'ended');
      await cleanupCallSignaling(callIdRef.current);
    }
    setActiveCall(null);
    cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (callError) {
      const timer = setTimeout(() => setCallError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [callError]);

  const value = {
    incomingCall,
    outgoingCall,
    activeCall,
    isMuted,
    isConnecting,
    callError,
    participants,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    cancelCall,
    toggleMute,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}
