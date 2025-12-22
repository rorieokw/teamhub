// Notification sound service using Web Audio API

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

// Initialize audio context
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Unlock audio on first user interaction (required by browser autoplay policy)
function unlockAudio(): void {
  if (audioUnlocked) return;

  const ctx = getAudioContext();

  // Create and play a silent buffer to unlock audio
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  // Also resume context if suspended
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  audioUnlocked = true;
}

// Set up unlock listeners on first load
let listenersAdded = false;
export function initAudioUnlock(): void {
  if (listenersAdded) return;
  listenersAdded = true;

  const events = ['click', 'touchstart', 'keydown'];
  const unlock = () => {
    unlockAudio();
    // Remove listeners after first unlock
    events.forEach(event => {
      document.removeEventListener(event, unlock, true);
    });
  };

  events.forEach(event => {
    document.addEventListener(event, unlock, true);
  });
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

// Play a pleasant notification chime
export async function playNotificationSound(): Promise<void> {
  // Check if sound is enabled
  if (!isNotificationSoundEnabled()) return;

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // If still suspended, audio hasn't been unlocked yet - skip silently
    if (ctx.state === 'suspended') {
      console.log('Audio context still suspended - waiting for user interaction');
      return;
    }

    const now = ctx.currentTime;

    // Create a pleasant two-tone chime
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (major chord)

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      // Stagger the notes slightly for a pleasing arpeggio effect
      const startTime = now + index * 0.08;
      const duration = 0.3;

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

// User preference storage keys
const SOUND_ENABLED_KEY = 'teamhub_notification_sound_enabled';
const SOUND_VOLUME_KEY = 'teamhub_notification_sound_volume';

// Check if notification sound is enabled
export function isNotificationSoundEnabled(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  // Default to enabled if not set
  return stored === null ? true : stored === 'true';
}

// Set notification sound enabled/disabled
export function setNotificationSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

// Get notification sound volume (0-1)
export function getNotificationVolume(): number {
  const stored = localStorage.getItem(SOUND_VOLUME_KEY);
  return stored ? parseFloat(stored) : 0.5;
}

// Set notification sound volume
export function setNotificationVolume(volume: number): void {
  localStorage.setItem(SOUND_VOLUME_KEY, String(Math.max(0, Math.min(1, volume))));
}

// Preview the notification sound (for settings)
export function previewNotificationSound(): void {
  const wasEnabled = isNotificationSoundEnabled();
  // Temporarily enable to play preview
  setNotificationSoundEnabled(true);
  playNotificationSound();
  // Restore original setting
  if (!wasEnabled) {
    setNotificationSoundEnabled(false);
  }
}
