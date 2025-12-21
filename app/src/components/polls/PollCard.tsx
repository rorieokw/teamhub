import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  toggleVote,
  closePoll,
  reopenPoll,
  deletePoll,
  getTotalVotes,
  hasUserVoted,
  getOptionPercentage,
} from '../../services/polls';
import type { Poll } from '../../types';

interface PollCardProps {
  poll: Poll;
  compact?: boolean;
  showActions?: boolean;
}

// Color palette for different options
const OPTION_COLORS = [
  { bg: 'from-purple-500 to-pink-500', bar: 'bg-gradient-to-r from-purple-500/40 to-pink-500/40', text: 'text-purple-300' },
  { bg: 'from-blue-500 to-cyan-500', bar: 'bg-gradient-to-r from-blue-500/40 to-cyan-500/40', text: 'text-blue-300' },
  { bg: 'from-green-500 to-emerald-500', bar: 'bg-gradient-to-r from-green-500/40 to-emerald-500/40', text: 'text-green-300' },
  { bg: 'from-orange-500 to-yellow-500', bar: 'bg-gradient-to-r from-orange-500/40 to-yellow-500/40', text: 'text-orange-300' },
  { bg: 'from-red-500 to-rose-500', bar: 'bg-gradient-to-r from-red-500/40 to-rose-500/40', text: 'text-red-300' },
  { bg: 'from-indigo-500 to-violet-500', bar: 'bg-gradient-to-r from-indigo-500/40 to-violet-500/40', text: 'text-indigo-300' },
];

export default function PollCard({ poll, compact = false, showActions = true }: PollCardProps) {
  const { currentUser } = useAuth();
  const [isVoting, setIsVoting] = useState(false);

  // Ensure options is an array
  const options = Array.isArray(poll.options) ? poll.options : [];

  const totalVotes = getTotalVotes(poll);
  const userHasVoted = currentUser ? hasUserVoted(poll, currentUser.uid) : false;
  const isOwner = currentUser?.uid === poll.createdBy;

  // Calculate total vote count (sum of all votes)
  const totalVoteCount = options.reduce((sum, opt) => {
    const votes = Array.isArray(opt.votes) ? opt.votes : [];
    return sum + votes.length;
  }, 0);

  const handleVote = async (optionId: string) => {
    if (!currentUser || poll.closed || isVoting) return;

    setIsVoting(true);
    try {
      await toggleVote(poll.id, optionId, currentUser.uid, poll);
    } catch (error) {
      console.error('Failed to vote:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleClose = async () => {
    try {
      if (poll.closed) {
        await reopenPoll(poll.id);
      } else {
        await closePoll(poll.id);
      }
    } catch (error) {
      console.error('Failed to toggle poll status:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this poll?')) return;
    try {
      await deletePoll(poll.id);
    } catch (error) {
      console.error('Failed to delete poll:', error);
    }
  };

  // Find the winning option(s)
  const maxVotes = Math.max(...options.map(o => {
    const votes = Array.isArray(o.votes) ? o.votes : [];
    return votes.length;
  }));

  return (
    <div
      className={`
        rounded-xl overflow-hidden
        ${compact ? 'bg-white/5 border border-white/10' : 'glass-card'}
        ${poll.closed ? 'opacity-80' : ''}
      `}
    >
      <div className={compact ? 'p-3' : 'p-4'}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h4 className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
                {poll.question}
              </h4>
              <p className="text-xs text-white/50">
                by {poll.createdByName} · {totalVotes} {totalVotes === 1 ? 'person' : 'people'} voted
              </p>
            </div>
          </div>

          {poll.closed && (
            <span className="px-2.5 py-1 text-[10px] font-medium bg-white/10 text-white/60 rounded-full uppercase tracking-wide">
              Closed
            </span>
          )}
        </div>

        {/* Options with visual bars */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const percentage = getOptionPercentage(poll, option.id);
            const votes = Array.isArray(option.votes) ? option.votes : [];
            const voteCount = votes.length;
            const hasVoted = currentUser ? votes.includes(currentUser.uid) : false;
            const isWinner = poll.closed && voteCount === maxVotes && maxVotes > 0;
            const colorScheme = OPTION_COLORS[index % OPTION_COLORS.length];

            return (
              <div key={option.id} className="space-y-1.5">
                <button
                  onClick={() => handleVote(option.id)}
                  disabled={poll.closed || isVoting}
                  className={`
                    relative w-full text-left rounded-xl overflow-hidden transition-all duration-200
                    ${poll.closed ? 'cursor-default' : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'}
                    ${hasVoted ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#1a1a2e]' : ''}
                    bg-white/5 hover:bg-white/10
                  `}
                >
                  {/* Animated background bar */}
                  <div
                    className={`
                      absolute inset-0 transition-all duration-700 ease-out
                      ${hasVoted ? colorScheme.bar : isWinner ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30' : 'bg-white/5'}
                    `}
                    style={{
                      width: `${percentage}%`,
                      opacity: totalVoteCount > 0 ? 1 : 0
                    }}
                  />

                  {/* Content */}
                  <div className={`relative flex items-center justify-between ${compact ? 'px-3 py-2.5' : 'px-4 py-3'}`}>
                    <div className="flex items-center gap-2.5">
                      {/* Checkbox/Radio indicator */}
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                        ${hasVoted
                          ? 'border-purple-400 bg-purple-500'
                          : 'border-white/30 bg-transparent'
                        }
                      `}>
                        {hasVoted && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-medium ${compact ? 'text-sm' : ''} ${hasVoted ? 'text-white' : 'text-white/80'}`}>
                        {option.text}
                      </span>
                      {isWinner && (
                        <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full font-medium">
                          Winner
                        </span>
                      )}
                    </div>

                    {/* Vote count and percentage */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${hasVoted ? colorScheme.text : 'text-white/70'}`}>
                        {percentage}%
                      </span>
                      <span className="text-xs text-white/40">
                        ({voteCount})
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Visual bar graph summary */}
        {totalVoteCount > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden bg-white/5">
              {options.map((option, index) => {
                const percentage = getOptionPercentage(poll, option.id);
                const colorScheme = OPTION_COLORS[index % OPTION_COLORS.length];

                if (percentage === 0) return null;

                return (
                  <div
                    key={option.id}
                    className={`h-full bg-gradient-to-r ${colorScheme.bg} transition-all duration-500 first:rounded-l-full last:rounded-r-full`}
                    style={{ width: `${percentage}%` }}
                    title={`${option.text}: ${percentage}%`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2">
              {options.map((option, index) => {
                const percentage = getOptionPercentage(poll, option.id);
                const colorScheme = OPTION_COLORS[index % OPTION_COLORS.length];

                return (
                  <div key={option.id} className="flex items-center gap-1.5 text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${colorScheme.bg}`} />
                    <span className="text-white/60 truncate max-w-[100px]">{option.text}</span>
                    <span className={`font-medium ${colorScheme.text}`}>{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && isOwner && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-xs text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
            >
              {poll.closed ? 'Reopen Poll' : 'Close Poll'}
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        )}

        {/* Help text */}
        {!poll.closed && !userHasVoted && totalVoteCount === 0 && (
          <p className="mt-3 text-xs text-white/40 text-center">
            Be the first to vote!
          </p>
        )}
        {!poll.closed && !userHasVoted && totalVoteCount > 0 && (
          <p className="mt-3 text-xs text-white/40 text-center">
            Click an option to cast your vote
          </p>
        )}
      </div>
    </div>
  );
}
