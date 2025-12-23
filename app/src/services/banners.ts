import type { RankTier } from '../types';

// Banner unlock requirement types
export type BannerUnlockType = 'rank' | 'reputation';

export interface Banner {
  id: string;
  name: string;
  gradient: string;
  unlockType: BannerUnlockType;
  unlockRequirement: RankTier | string;
  description: string;
  animation?: 'shimmer' | 'pulse-glow';
}

// Define all available banners
export const BANNERS: Banner[] = [
  // Default banner (always available)
  {
    id: 'default',
    name: 'Default',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    unlockType: 'rank',
    unlockRequirement: 'iron',
    description: 'The default banner',
  },

  // ============================================
  // RANK-BASED BANNERS (10 banners)
  // ============================================
  {
    id: 'iron-forge',
    name: 'Iron Forge',
    gradient: 'linear-gradient(135deg, #5c5c5c 0%, #3a3a3a 50%, #5c5c5c 100%)',
    unlockType: 'rank',
    unlockRequirement: 'iron',
    description: 'Reach Iron rank',
  },
  {
    id: 'bronze-dawn',
    name: 'Bronze Dawn',
    gradient: 'linear-gradient(135deg, #cd7f32 0%, #8b4513 50%, #cd7f32 100%)',
    unlockType: 'rank',
    unlockRequirement: 'bronze',
    description: 'Reach Bronze rank',
  },
  {
    id: 'silver-storm',
    name: 'Silver Storm',
    gradient: 'linear-gradient(135deg, #c0c0c0 0%, #808080 30%, #e8e8e8 60%, #c0c0c0 100%)',
    unlockType: 'rank',
    unlockRequirement: 'silver',
    description: 'Reach Silver rank',
  },
  {
    id: 'golden-glory',
    name: 'Golden Glory',
    gradient: 'linear-gradient(135deg, #ffd700 0%, #b8860b 50%, #ffd700 100%)',
    unlockType: 'rank',
    unlockRequirement: 'gold',
    description: 'Reach Gold rank',
    animation: 'shimmer',
  },
  {
    id: 'platinum-wave',
    name: 'Platinum Wave',
    gradient: 'linear-gradient(135deg, #00cec9 0%, #0984e3 50%, #00cec9 100%)',
    unlockType: 'rank',
    unlockRequirement: 'platinum',
    description: 'Reach Platinum rank',
    animation: 'shimmer',
  },
  {
    id: 'emerald-forest',
    name: 'Emerald Forest',
    gradient: 'linear-gradient(135deg, #00b894 0%, #006400 50%, #00b894 100%)',
    unlockType: 'rank',
    unlockRequirement: 'emerald',
    description: 'Reach Emerald rank',
    animation: 'shimmer',
  },
  {
    id: 'diamond-shine',
    name: 'Diamond Shine',
    gradient: 'linear-gradient(135deg, #74b9ff 0%, #a29bfe 30%, #74b9ff 60%, #dfe6e9 100%)',
    unlockType: 'rank',
    unlockRequirement: 'diamond',
    description: 'Reach Diamond rank',
    animation: 'shimmer',
  },
  {
    id: 'master-aura',
    name: 'Master Aura',
    gradient: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 30%, #6c3483 60%, #9b59b6 100%)',
    unlockType: 'rank',
    unlockRequirement: 'master',
    description: 'Reach Master rank',
    animation: 'pulse-glow',
  },
  {
    id: 'grandmaster-flame',
    name: 'Grandmaster Flame',
    gradient: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 25%, #ff6b6b 50%, #e74c3c 100%)',
    unlockType: 'rank',
    unlockRequirement: 'grandmaster',
    description: 'Reach Grandmaster rank',
    animation: 'pulse-glow',
  },
  {
    id: 'challenger-inferno',
    name: 'Challenger Inferno',
    gradient: 'linear-gradient(135deg, #f39c12 0%, #e67e22 25%, #ff9500 50%, #f39c12 75%, #ffd700 100%)',
    unlockType: 'rank',
    unlockRequirement: 'challenger',
    description: 'Reach Challenger rank',
    animation: 'pulse-glow',
  },

  // ============================================
  // REPUTATION-BASED BANNERS (8 banners)
  // ============================================
  {
    id: 'rep-hated',
    name: 'Outcast',
    gradient: 'linear-gradient(135deg, #1a0000 0%, #4a0000 50%, #1a0000 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Hated',
    description: 'Fall to Hated reputation',
  },
  {
    id: 'rep-hostile',
    name: 'Ember Spite',
    gradient: 'linear-gradient(135deg, #4a1c1c 0%, #6b2d2d 50%, #4a1c1c 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Hostile',
    description: 'Fall to Hostile reputation',
  },
  {
    id: 'rep-unfriendly',
    name: 'Caution',
    gradient: 'linear-gradient(135deg, #4a4a00 0%, #6b6b00 50%, #4a4a00 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Unfriendly',
    description: 'Fall to Unfriendly reputation',
  },
  {
    id: 'rep-neutral',
    name: 'Balance',
    gradient: 'linear-gradient(135deg, #2d2d2d 0%, #4a4a4a 50%, #2d2d2d 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Neutral',
    description: 'Start at Neutral reputation',
  },
  {
    id: 'rep-friendly',
    name: 'Verdant Trust',
    gradient: 'linear-gradient(135deg, #1a4a1a 0%, #2d6b2d 50%, #1a4a1a 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Friendly',
    description: 'Reach Friendly reputation',
  },
  {
    id: 'rep-honored',
    name: 'Azure Honor',
    gradient: 'linear-gradient(135deg, #1a3a6b 0%, #2d5a9b 50%, #1a3a6b 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Honored',
    description: 'Reach Honored reputation',
    animation: 'shimmer',
  },
  {
    id: 'rep-revered',
    name: 'Violet Prestige',
    gradient: 'linear-gradient(135deg, #4a1a6b 0%, #6b2d9b 50%, #4a1a6b 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Revered',
    description: 'Reach Revered reputation',
    animation: 'shimmer',
  },
  {
    id: 'rep-exalted',
    name: 'Exalted Radiance',
    gradient: 'linear-gradient(135deg, #ffd700 0%, #ffec8b 25%, #ffd700 50%, #daa520 75%, #ffd700 100%)',
    unlockType: 'reputation',
    unlockRequirement: 'Exalted',
    description: 'Reach Exalted reputation',
    animation: 'pulse-glow',
  },
];

// Rank tier order for comparison
const RANK_ORDER: RankTier[] = [
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'challenger',
];

// Reputation level order for comparison
const REPUTATION_ORDER = [
  'Hated',
  'Hostile',
  'Unfriendly',
  'Neutral',
  'Friendly',
  'Honored',
  'Revered',
  'Exalted',
];

// Get banner by ID
export function getBannerById(bannerId: string): Banner | undefined {
  return BANNERS.find((b) => b.id === bannerId);
}

// Get default banner
export function getDefaultBanner(): Banner {
  return BANNERS.find((b) => b.id === 'default')!;
}

// Check if a specific banner is unlocked based on current rank and reputation
export function isBannerUnlocked(
  banner: Banner,
  currentRankTier: RankTier,
  currentReputationLevel: string,
  unlockedBanners: string[] = []
): boolean {
  // If banner is in persisted unlocked list, it's unlocked
  if (unlockedBanners.includes(banner.id)) {
    return true;
  }

  // Default banner is always unlocked
  if (banner.id === 'default') {
    return true;
  }

  // Check based on unlock type
  if (banner.unlockType === 'rank') {
    const requiredRankIndex = RANK_ORDER.indexOf(banner.unlockRequirement as RankTier);
    const currentRankIndex = RANK_ORDER.indexOf(currentRankTier);
    return currentRankIndex >= requiredRankIndex;
  } else {
    const requiredRepIndex = REPUTATION_ORDER.indexOf(banner.unlockRequirement);
    const currentRepIndex = REPUTATION_ORDER.indexOf(currentReputationLevel);
    // For reputation, we check if they've ever reached that level
    // Lower rep levels (Hated, Hostile) are unlocked if current is at or below
    // Higher rep levels (Friendly+) are unlocked if current is at or above
    if (requiredRepIndex <= REPUTATION_ORDER.indexOf('Neutral')) {
      // Negative reputation banners - unlock if at or below
      return currentRepIndex <= requiredRepIndex;
    } else {
      // Positive reputation banners - unlock if at or above
      return currentRepIndex >= requiredRepIndex;
    }
  }
}

// Get all unlocked banners for a user
export function getUnlockedBanners(
  currentRankTier: RankTier,
  currentReputationLevel: string,
  persistedUnlockedBanners: string[] = []
): Banner[] {
  return BANNERS.filter((banner) =>
    isBannerUnlocked(banner, currentRankTier, currentReputationLevel, persistedUnlockedBanners)
  );
}

// Get newly unlocked banners (for notification/celebration)
export function getNewlyUnlockedBanners(
  currentRankTier: RankTier,
  currentReputationLevel: string,
  persistedUnlockedBanners: string[] = []
): Banner[] {
  return BANNERS.filter((banner) => {
    const isCurrentlyUnlocked = isBannerUnlocked(
      banner,
      currentRankTier,
      currentReputationLevel,
      []
    );
    const wasAlreadyPersisted = persistedUnlockedBanners.includes(banner.id);
    return isCurrentlyUnlocked && !wasAlreadyPersisted;
  });
}

// Get all rank banners (for UI grouping)
export function getRankBanners(): Banner[] {
  return BANNERS.filter((b) => b.unlockType === 'rank' && b.id !== 'default');
}

// Get all reputation banners (for UI grouping)
export function getReputationBanners(): Banner[] {
  return BANNERS.filter((b) => b.unlockType === 'reputation');
}
