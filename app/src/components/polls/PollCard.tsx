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

export default function PollCard({ poll, compact = false, showActions = true }: PollCardProps) {
  const { currentUser } = useAuth();
  const [isVoting, setIsVoting] = useState(false);

  // Ensure options is an array
  const options = Array.isArray(poll.options) ? poll.options : [];

  const totalVotes = getTotalVotes(poll);
  const userHasVoted = currentUser ? hasUserVoted(poll, currentUser.uid) : false;
  const isOwner = currentUser?.uid === poll.createdBy;

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
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm">
              📊
            </div>
            <div>
              <h4 className={`font-medium text-white/90 ${compact ? 'text-sm' : ''}`}>
                {poll.question}
              </h4>
              <p className="text-xs text-white/40">
                by {poll.createdByName} · {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {poll.closed && (
            <span className="px-2 py-0.5 text-[10px] bg-white/10 text-white/50 rounded-full">
              CLOSED
            </span>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          {options.map((option) => {
            const percentage = getOptionPercentage(poll, option.id);
            const votes = Array.isArray(option.votes) ? option.votes : [];
            const hasVoted = currentUser ? votes.includes(currentUser.uid) : false;
            const isWinner = poll.closed && percentage === Math.max(...options.map((o) => getOptionPercentage(poll, o.id)));

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={poll.closed || isVoting}
                className={`
                  relative w-full text-left rounded-lg overflow-hidden
                  ${poll.closed ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'}
                  ${hasVoted ? 'ring-2 ring-purple-500/50' : ''}
                  transition-all
                `}
              >
                {/* Background bar */}
                <div
                  className={`
                    absolute inset-0 transition-all duration-500
                    ${hasVoted ? 'bg-purple-500/30' : isWinner ? 'bg-green-500/20' : 'bg-white/10'}
                  `}
                  style={{ width: userHasVoted || poll.closed ? `${percentage}%` : '0%' }}
                />

                {/* Content */}
                <div className={`relative flex items-center justify-between ${compact ? 'px-3 py-2' : 'px-4 py-2.5'}`}>
                  <div className="flex items-center gap-2">
                    {hasVoted && (
                      <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    <span className={`text-white/90 ${compact ? 'text-sm' : ''}`}>{option.text}</span>
                  </div>

                  {(userHasVoted || poll.closed) && (
                    <span className="text-sm text-white/60 font-medium">
                      {percentage}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

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
        {!poll.closed && !userHasVoted && (
          <p className="mt-3 text-xs text-white/40 text-center">
            Click an option to vote
          </p>
        )}
      </div>
    </div>
  );
}
