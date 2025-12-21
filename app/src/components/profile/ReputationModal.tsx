import { REPUTATION_LEVELS, REPUTATION_GAINS, REPUTATION_PENALTIES, getReputationLevel } from '../../services/reputation';

interface ReputationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReputation: number;
}

const LEVEL_DETAILS = [
  { ...REPUTATION_LEVELS.HATED, color: 'text-red-500', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
  { ...REPUTATION_LEVELS.HOSTILE, color: 'text-orange-500', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/50' },
  { ...REPUTATION_LEVELS.UNFRIENDLY, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/50' },
  { ...REPUTATION_LEVELS.NEUTRAL, color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/50' },
  { ...REPUTATION_LEVELS.FRIENDLY, color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/50' },
  { ...REPUTATION_LEVELS.HONORED, color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50' },
  { ...REPUTATION_LEVELS.REVERED, color: 'text-purple-400', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/50' },
  { ...REPUTATION_LEVELS.EXALTED, color: 'text-yellow-300', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-400/50' },
];

export default function ReputationModal({ isOpen, onClose, currentReputation }: ReputationModalProps) {
  if (!isOpen) return null;

  const currentLevel = getReputationLevel(currentReputation);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative glass rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">Reputation Ranks</h2>
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
          {/* Current Status */}
          <div className={`p-4 rounded-xl ${currentLevel.bgColor} border ${currentLevel.label === 'Exalted' ? 'border-yellow-400/50' : 'border-white/10'} mb-6`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Your Current Standing</span>
              <span className="text-sm text-gray-300">{currentReputation.toLocaleString()} pts</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${currentLevel.color}`}>{currentLevel.label}</span>
              {currentLevel.nextLevel && (
                <span className="text-sm text-gray-400">
                  ({currentLevel.pointsToNext.toLocaleString()} to {currentLevel.nextLevel})
                </span>
              )}
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${currentLevel.progress}%`,
                  backgroundColor: currentLevel.textColor
                }}
              />
            </div>
          </div>

          {/* All Ranks */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">All Reputation Ranks</h3>
          <div className="space-y-2 mb-6">
            {LEVEL_DETAILS.map((level, index) => {
              const isCurrentLevel = currentReputation >= level.min && currentReputation <= level.max;
              const isAchieved = currentReputation >= level.min;

              return (
                <div
                  key={level.name}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isCurrentLevel
                      ? `${level.bgColor} ${level.borderColor} ring-1 ring-white/20`
                      : isAchieved
                        ? `${level.bgColor} border-white/5`
                        : 'bg-white/5 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg ${level.bgColor} flex items-center justify-center`}>
                      <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <span className={`font-semibold ${level.color}`}>{level.name}</span>
                      {isCurrentLevel && (
                        <span className="ml-2 text-xs bg-white/20 px-2 py-0.5 rounded text-white">Current</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">{level.min.toLocaleString()} pts</p>
                    {level.name !== 'Exalted' && (
                      <p className="text-xs text-gray-500">to {(level.max + 1).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* How to Earn */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">How to Earn Reputation</h3>
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-xs text-gray-400 mb-1">Complete Task</p>
              <p className="text-green-400 font-bold">+{REPUTATION_GAINS.TASK_COMPLETED} pts</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-xs text-gray-400 mb-1">Complete Project</p>
              <p className="text-green-400 font-bold">+{REPUTATION_GAINS.PROJECT_COMPLETED} pts</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <p className="text-xs text-gray-400 mb-1">Task On Time</p>
              <p className="text-blue-400 font-bold">+{REPUTATION_GAINS.TASK_ON_TIME} pts</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <p className="text-xs text-gray-400 mb-1">Project On Time</p>
              <p className="text-blue-400 font-bold">+{REPUTATION_GAINS.PROJECT_ON_TIME} pts</p>
            </div>
          </div>

          {/* Penalties */}
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Reputation Penalties</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <p className="text-xs text-gray-400 mb-1">Miss Task Deadline</p>
              <p className="text-red-400 font-bold">-{REPUTATION_PENALTIES.MISSED_TASK_DEADLINE} pts</p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
              <p className="text-xs text-gray-400 mb-1">Miss Project Deadline</p>
              <p className="text-red-400 font-bold">-{REPUTATION_PENALTIES.MISSED_PROJECT_DEADLINE} pts</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-xs text-gray-400 mb-1">Late Task</p>
              <p className="text-orange-400 font-bold">-{REPUTATION_PENALTIES.LATE_TASK_COMPLETION} pts</p>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20">
              <p className="text-xs text-gray-400 mb-1">Late Project</p>
              <p className="text-orange-400 font-bold">-{REPUTATION_PENALTIES.LATE_PROJECT_COMPLETION} pts</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
