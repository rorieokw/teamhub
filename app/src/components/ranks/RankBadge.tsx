import React from 'react';
import type { UserRank, RankTier } from '../../types';
import { RANK_COLORS, RANK_NAMES, getRankDisplayString } from '../../services/ranks';

interface RankBadgeProps {
  rank: UserRank;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showLP?: boolean;
  className?: string;
}

// SVG icons for each rank tier
const RankIcons: Record<RankTier, React.ReactNode> = {
  iron: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L4 7v10l8 5 8-5V7l-8-5zm0 2.5L17.5 8v8L12 19.5 6.5 16V8L12 4.5z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  bronze: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2l6.5 3.6v7.4L12 18.8l-6.5-3.6V7.8L12 4.2z" />
      <path d="M12 8l-3 2v4l3 2 3-2v-4l-3-2z" />
    </svg>
  ),
  silver: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L2 6v12l10 5 10-5V6L12 1zm0 2l7 3.5v9L12 19l-7-3.5v-9L12 3z" />
      <path d="M12 7l-4 2.5v5L12 17l4-2.5v-5L12 7z" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  gold: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1L2 6v12l10 5 10-5V6L12 1z" />
      <path d="M12 4l6 3v10l-6 3-6-3V7l6-3z" opacity="0.3" />
      <path d="M12 7l-4 2v6l4 2 4-2V9l-4-2z" />
      <polygon points="12,9 10.5,11 11,13 12,12 13,13 13.5,11" />
    </svg>
  ),
  platinum: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L1 5.5v13L12 24l11-5.5v-13L12 0zm0 2l8 4v12l-8 4-8-4V6l8-4z" />
      <path d="M12 5l-5 2.5v9L12 19l5-2.5v-9L12 5z" />
      <path d="M12 8l-3 1.5v5L12 16l3-1.5v-5L12 8z" opacity="0.5" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  emerald: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L2 5v14l10 5 10-5V5L12 0z" />
      <path d="M12 3l7 3.5v11L12 21l-7-3.5v-11L12 3z" opacity="0.3" />
      <path d="M12 6l-5 2.5v7L12 18l5-2.5v-7L12 6z" />
      <path d="M12 9l-3 1.5v3L12 15l3-1.5v-3L12 9z" opacity="0.6" />
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L0 8v8l12 8 12-8V8L12 0z" />
      <path d="M12 3l9 6v6l-9 6-9-6V9l9-6z" opacity="0.3" />
      <path d="M12 6l-6 4v4l6 4 6-4v-4l-6-4z" />
      <path d="M12 9l-3 2v2l3 2 3-2v-2l-3-2z" opacity="0.5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  ),
  master: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L0 6v12l12 6 12-6V6L12 0z" />
      <path d="M12 2l10 5v10l-10 5L2 17V7l10-5z" opacity="0.2" />
      <path d="M12 5l-7 3.5v7L12 19l7-3.5v-7L12 5z" />
      <path d="M12 8l-4 2v4l4 2 4-2v-4l-4-2z" opacity="0.4" />
      <polygon points="12,10 10,12 12,14 14,12" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  ),
  grandmaster: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L0 6v12l12 6 12-6V6L12 0z" />
      <path d="M12 1.5l10.5 5.25v10.5L12 22.5 1.5 17.25V6.75L12 1.5z" opacity="0.2" />
      <path d="M12 4l-8 4v8l8 4 8-4V8l-8-4z" />
      <path d="M12 7l-5 2.5v5L12 17l5-2.5v-5L12 7z" opacity="0.3" />
      <path d="M12 9l-3 1.5v3L12 15l3-1.5v-3L12 9z" />
      <polygon points="12,11 11,12 12,13 13,12" fill="white" opacity="0.8" />
    </svg>
  ),
  challenger: (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L0 6v12l12 6 12-6V6L12 0z" />
      <path d="M12 1l11 5.5v11L12 23 1 17.5v-11L12 1z" opacity="0.15" />
      <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" opacity="0.3" />
      <path d="M12 5l-7 3.5v7L12 19l7-3.5v-7L12 5z" />
      <path d="M12 7.5l-5 2.5v4L12 16.5l5-2.5v-4L12 7.5z" opacity="0.4" />
      <path d="M12 9.5l-3 1.5v2L12 14.5l3-1.5v-2L12 9.5z" opacity="0.6" />
      <circle cx="12" cy="12" r="1.5" fill="white" opacity="0.9" />
      <circle cx="12" cy="12" r="0.75" />
    </svg>
  ),
};

// Size configurations
const sizeConfig = {
  xs: { badge: 'w-4 h-4', text: 'text-[10px]', container: 'gap-0.5' },
  sm: { badge: 'w-5 h-5', text: 'text-xs', container: 'gap-1' },
  md: { badge: 'w-6 h-6', text: 'text-sm', container: 'gap-1.5' },
  lg: { badge: 'w-8 h-8', text: 'text-base', container: 'gap-2' },
};

export default function RankBadge({
  rank,
  size = 'sm',
  showLabel = false,
  showLP = false,
  className = '',
}: RankBadgeProps) {
  const colors = RANK_COLORS[rank.tier];
  const config = sizeConfig[size];
  const tierName = RANK_NAMES[rank.tier];

  return (
    <div className={`flex items-center ${config.container} ${className}`}>
      {/* Badge Icon */}
      <div
        className={`${config.badge} relative flex-shrink-0`}
        style={{
          color: colors.primary,
          filter: `drop-shadow(0 0 3px ${colors.glow})`,
        }}
        title={getRankDisplayString(rank)}
      >
        {RankIcons[rank.tier]}

        {/* Division indicator for tiered ranks */}
        {rank.division && size !== 'xs' && (
          <div
            className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold leading-none bg-gray-900 rounded px-0.5"
            style={{ color: colors.secondary }}
          >
            {rank.division}
          </div>
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <div className="flex flex-col">
          <span
            className={`font-semibold ${config.text} leading-tight`}
            style={{ color: colors.primary }}
          >
            {tierName} {rank.division || ''}
          </span>
          {showLP && (
            <span className="text-[10px] text-gray-500 leading-tight">
              {rank.lp} LP
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Compact inline badge for chat messages
export function RankBadgeInline({ rank }: { rank: UserRank }) {
  const colors = RANK_COLORS[rank.tier];

  return (
    <span
      className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-medium"
      style={{
        backgroundColor: `${colors.primary}20`,
        color: colors.primary,
        border: `1px solid ${colors.primary}40`,
      }}
      title={getRankDisplayString(rank)}
    >
      <span className="w-3 h-3">{RankIcons[rank.tier]}</span>
      {rank.division || (rank.lp > 0 ? `${rank.lp}LP` : '')}
    </span>
  );
}

// Full rank card for profile display
export function RankCard({ rank, className = '' }: { rank: UserRank; className?: string }) {
  const colors = RANK_COLORS[rank.tier];
  const tierName = RANK_NAMES[rank.tier];

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.secondary}20 100%)`,
        border: `1px solid ${colors.primary}40`,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex items-center gap-4">
        {/* Large rank icon */}
        <div
          className="w-16 h-16"
          style={{
            color: colors.primary,
            filter: `drop-shadow(0 0 8px ${colors.glow})`,
          }}
        >
          {RankIcons[rank.tier]}
        </div>

        <div className="flex-1">
          <h3
            className="text-xl font-bold"
            style={{ color: colors.primary }}
          >
            {tierName} {rank.division || ''}
          </h3>
          <p className="text-gray-400 text-sm">
            {rank.points.toLocaleString()} total points
          </p>
          {rank.division ? (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{rank.lp} LP</span>
                <span>100 LP</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${rank.lp}%`,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                  }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm mt-1" style={{ color: colors.secondary }}>
              {rank.lp} LP
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
