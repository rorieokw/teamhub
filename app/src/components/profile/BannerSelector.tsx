import {
  getRankBanners,
  getReputationBanners,
  isBannerUnlocked,
  type Banner,
} from '../../services/banners';
import type { RankTier } from '../../types';

interface BannerSelectorProps {
  selectedBannerId: string;
  onSelect: (bannerId: string) => void;
  currentRankTier: RankTier;
  currentReputationLevel: string;
  unlockedBanners: string[];
}

export default function BannerSelector({
  selectedBannerId,
  onSelect,
  currentRankTier,
  currentReputationLevel,
  unlockedBanners,
}: BannerSelectorProps) {
  const rankBanners = getRankBanners();
  const repBanners = getReputationBanners();

  const renderBannerOption = (banner: Banner) => {
    const isUnlocked = isBannerUnlocked(
      banner,
      currentRankTier,
      currentReputationLevel,
      unlockedBanners
    );
    const isSelected = selectedBannerId === banner.id;

    const animationClass =
      banner.animation === 'shimmer'
        ? 'banner-shimmer'
        : banner.animation === 'pulse-glow'
        ? 'banner-pulse-glow'
        : '';

    return (
      <button
        key={banner.id}
        onClick={() => isUnlocked && onSelect(banner.id)}
        disabled={!isUnlocked}
        className={`relative rounded-lg overflow-hidden h-14 transition-all ${
          isSelected
            ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e]'
            : isUnlocked
            ? 'hover:ring-1 hover:ring-white/30 cursor-pointer'
            : 'opacity-40 cursor-not-allowed'
        }`}
        title={isUnlocked ? banner.name : `Unlock: ${banner.description}`}
      >
        <div
          className={`absolute inset-0 ${animationClass}`}
          style={{ background: banner.gradient }}
        />
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <svg
              className="w-4 h-4 text-white/70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}
        <div className="absolute bottom-0.5 left-1 right-1">
          <p className="text-[10px] text-white font-medium truncate drop-shadow-lg text-center">
            {banner.name}
          </p>
        </div>
        {isSelected && (
          <div className="absolute top-1 right-1">
            <svg
              className="w-4 h-4 text-white drop-shadow-lg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Rank Banners */}
      <div>
        <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          Rank Banners
        </h4>
        <div className="grid grid-cols-5 gap-2">
          {rankBanners.map(renderBannerOption)}
        </div>
      </div>

      {/* Reputation Banners */}
      <div>
        <h4 className="text-sm text-gray-400 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          Reputation Banners
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {repBanners.map(renderBannerOption)}
        </div>
      </div>

      {/* Info */}
      <p className="text-xs text-gray-500">
        Unlock banners by reaching higher ranks and reputation levels. Unlocked banners stay
        available forever!
      </p>
    </div>
  );
}
