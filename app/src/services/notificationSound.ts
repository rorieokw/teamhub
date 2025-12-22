// Notification sound service using Web Audio API

let audioContext: AudioContext | null = null;

// Initialize audio context (must be called from user interaction first time)
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Play a pleasant notification chime
export function playNotificationSound(): void {
  // Check if sound is enabled
  if (!isNotificationSoundEnabled()) return;

  try {
    const ctx = getAudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
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
