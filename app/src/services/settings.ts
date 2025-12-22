import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { AppSettings } from '../types';

const SETTINGS_DOC_ID = 'appSettings';

// Get current app settings
export async function getAppSettings(): Promise<AppSettings> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as AppSettings;
  }

  // Default settings if none exist
  return {
    whitelistEnabled: false,
  };
}

// Update app settings
export async function updateAppSettings(
  settings: Partial<AppSettings>,
  adminId: string
): Promise<void> {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
  await setDoc(docRef, {
    ...settings,
    updatedAt: serverTimestamp(),
    updatedBy: adminId,
  }, { merge: true });
}

// Subscribe to app settings changes
export function subscribeToAppSettings(
  callback: (settings: AppSettings) => void
): () => void {
  const docRef = doc(db, 'settings', SETTINGS_DOC_ID);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data() as AppSettings);
    } else {
      callback({ whitelistEnabled: false });
    }
  });
}
