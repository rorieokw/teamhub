import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUserRank } from './useUserRank';
import { getReputationLevel } from '../services/reputation';
import { getNewlyUnlockedBanners } from '../services/banners';
import { addUnlockedBanners } from '../services/users';

/**
 * Hook that monitors user's rank and reputation changes
 * and persists newly unlocked banners to their profile.
 *
 * This ensures users keep all banners they've ever unlocked,
 * even if their rank decreases later.
 */
export function useBannerUnlockTracker(): void {
  const { currentUser, userProfile } = useAuth();
  const userStats = useUserRank(currentUser?.uid);

  useEffect(() => {
    if (!currentUser || !userProfile || !userStats) return;

    const currentRankTier = userStats.rank.tier;
    const repLevel = getReputationLevel(userProfile.reputation ?? 3000);
    const currentReputationLevel = repLevel.label;
    const persistedUnlocks = userProfile.unlockedBanners || [];

    // Check for newly unlocked banners
    const newlyUnlocked = getNewlyUnlockedBanners(
      currentRankTier,
      currentReputationLevel,
      persistedUnlocks
    );

    if (newlyUnlocked.length > 0) {
      // Persist the newly unlocked banners to Firestore
      addUnlockedBanners(currentUser.uid, newlyUnlocked.map((b) => b.id)).catch(
        (err) => console.error('Failed to persist unlocked banners:', err)
      );
    }
  }, [currentUser, userProfile, userStats]);
}
