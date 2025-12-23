import { RANK_COLORS, RANK_NAMES } from '../../services/ranks';
import { RANK_POINTS } from '../../types';
import type { UserRank, RankTier } from '../../types';

interface RankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRank: UserRank;
  totalPoints: number;
}

const RANK_TIERS: { tier: RankTier; basePoints: number; hasDivisions: boolean; emoji: string }[] = [
  { tier: 'iron', basePoints: 0, hasDivisions: true, emoji: '⚙️' },
  { tier: 'bronze', basePoints: 400, hasDivisions: true, emoji: '🥉' },
  { tier: 'silver', basePoints: 800, hasDivisions: true, emoji: '🥈' },
  { tier: 'gold', basePoints: 1200, hasDivisions: true, emoji: '🥇' },
  { tier: 'platinum', basePoints: 1600, hasDivisions: true, emoji: '💎' },
  { tier: 'emerald', basePoints: 2000, hasDivisions: true, emoji: '💚' },
  { tier: 'diamond', basePoints: 2400, hasDivisions: true, emoji: '💠' },
  { tier: 'master', basePoints: 2800, hasDivisions: false, emoji: '👑' },
  { tier: 'grandmaster', basePoints: 3200, hasDivisions: false, emoji: '🔥' },
  { tier: 'challenger', basePoints: 3600, hasDivisions: false, emoji: '⚡' },
];

export default function RankModal({ isOpen, onClose, currentRank, totalPoints }: RankModalProps) {
  if (!isOpen) return null;

  const currentTierIndex = RANK_TIERS.findIndex(r => r.tier === currentRank.tier);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Rank Progression</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {/* Current Rank */}
          <div
            className="p-4 rounded-xl border mb-6"
            style={{
              backgroundColor: `${RANK_COLORS[currentRank.tier].primary}15`,
              borderColor: `${RANK_COLORS[currentRank.tier].primary}50`,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Your Current Rank</span>
              <span className="text-sm text-gray-300">{totalPoints.toLocaleString()} total pts</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{RANK_TIERS[currentTierIndex]?.emoji}</span>
              <div>
                <span
                  className="text-2xl font-bold"
                  style={{ color: RANK_COLORS[currentRank.tier].primary }}
                >
                  {RANK_NAMES[currentRank.tier]} {currentRank.division || ''}
                </span>
                <p className="text-sm text-gray-400">{currentRank.lp} LP</p>
              </div>
            </div>
          </div>

          {/* All Ranks */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">All Ranks</h3>
          <div className="space-y-2 mb-6">
            {RANK_TIERS.map((rank, index) => {
              const isCurrentTier = rank.tier === currentRank.tier;
              const isAchieved = totalPoints >= rank.basePoints;
              const nextRank = RANK_TIERS[index + 1];
              const maxPoints = nextRank ? nextRank.basePoints - 1 : '∞';

              return (
                <div
                  key={rank.tier}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrentTier
                      ? 'ring-1 ring-white/20'
                      : isAchieved
                        ? 'border-white/5'
                        : 'bg-white/5 border-white/5 opacity-50'
                  }`}
                  style={{
                    backgroundColor: isCurrentTier || isAchieved
                      ? `${RANK_COLORS[rank.tier].primary}15`
                      : undefined,
                    borderColor: isCurrentTier
                      ? `${RANK_COLORS[rank.tier].primary}50`
                      : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-8 text-center">{rank.emoji}</span>
                    <div>
                      <span
                        className="font-semibold"
                        style={{ color: RANK_COLORS[rank.tier].primary }}
                      >
                        {RANK_NAMES[rank.tier]}
                      </span>
                      {isCurrentTier && (
                        <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded text-white">Current</span>
                      )}
                      {rank.hasDivisions && (
                        <p className="text-xs text-gray-500">Divisions IV → I</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">{rank.basePoints.toLocaleString()} pts</p>
                    <p className="text-xs text-gray-500">
                      {typeof maxPoints === 'number' ? `to ${maxPoints.toLocaleString()}` : 'No limit'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* How to Earn Points */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">How to Earn Points</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-1">Complete Task</p>
              <p className="text-purple-400 font-bold">+{RANK_POINTS.TASK_COMPLETED} pts</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <p className="text-xs text-gray-400 mb-1">Create Task</p>
              <p className="text-blue-400 font-bold">+{RANK_POINTS.TASK_CREATED} pts</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-xs text-gray-400 mb-1">Create Project</p>
              <p className="text-green-400 font-bold">+{RANK_POINTS.PROJECT_CREATED} pts</p>
            </div>
            <div className="p-3 bg-pink-500/10 rounded-xl border border-pink-500/20">
              <p className="text-xs text-gray-400 mb-1">Send Message</p>
              <p className="text-pink-400 font-bold">+{RANK_POINTS.MESSAGE_SENT} pts</p>
            </div>
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <p className="text-xs text-gray-400 mb-1">Complete Milestone</p>
              <p className="text-cyan-400 font-bold">+{RANK_POINTS.MILESTONE_COMPLETED} pts</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-xs text-gray-400 mb-1">Add Comment</p>
              <p className="text-orange-400 font-bold">+{RANK_POINTS.COMMENT_ADDED} pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
