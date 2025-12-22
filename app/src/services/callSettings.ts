// Call settings stored in localStorage

export type VoiceMode = 'voice-activated' | 'push-to-talk';

export interface CallSettings {
  voiceMode: VoiceMode;
  pushToTalkKey: string;
  inputVolume: number; // 0-100
  outputVolume: number; // 0-100
}

const STORAGE_KEY = 'teamhub_call_settings';

const DEFAULT_SETTINGS: CallSettings = {
  voiceMode: 'voice-activated',
  pushToTalkKey: 'Space',
  inputVolume: 100,
  outputVolume: 100,
};

export function getCallSettings(): CallSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.error('Error reading call settings:', err);
  }
  return DEFAULT_SETTINGS;
}

export function saveCallSettings(settings: Partial<CallSettings>): void {
  try {
    const current = getCallSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error saving call settings:', err);
  }
}

export function getVoiceMode(): VoiceMode {
  return getCallSettings().voiceMode;
}

export function setVoiceMode(mode: VoiceMode): void {
  saveCallSettings({ voiceMode: mode });
}

export function getPushToTalkKey(): string {
  return getCallSettings().pushToTalkKey;
}

export function setPushToTalkKey(key: string): void {
  saveCallSettings({ pushToTalkKey: key });
}
