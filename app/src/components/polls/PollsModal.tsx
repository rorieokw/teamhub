import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToActivePolls,
  closePoll,
  reopenPoll,
  deletePoll,
  getTotalVotes,
} from '../../services/polls';
import PollCard from './PollCard';
import type { Poll } from '../../types';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface PollsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PollsModal({ isOpen, onClose }: PollsModalProps) {
  const { currentUser } = useAuth();
  const [activePolls, setActivePolls] = useState<Poll[]>([]);
  const [closedPolls, setClosedPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Subscribe to active polls
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribeActive = subscribeToActivePolls((polls) => {
      setActivePolls(polls);
      setLoading(false);
    });

    // Subscribe to closed polls
    const closedQuery = query(
      collection(db, 'polls'),
      where('closed', '==', true),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeClosed = onSnapshot(
      closedQuery,
      (snapshot) => {
        const polls: Poll[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Poll[];
        setClosedPolls(polls);
      },
      (error) => {
        console.error('Closed polls subscription error:', error.message);
      }
    );

    return () => {
      unsubscribeActive();
      unsubscribeClosed();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = async (pollId: string) => {
    try {
      await closePoll(pollId);
    } catch (error) {
      console.error('Failed to close poll:', error);
    }
  };

  const handleReopen = async (pollId: string) => {
    try {
      await reopenPoll(pollId);
    } catch (error) {
      console.error('Failed to reopen poll:', error);
    }
  };

  const handleDelete = async (pollId: string) => {
    try {
      await deletePoll(pollId);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Failed to delete poll:', error);
    }
  };

  const formatDate = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const displayedPolls = showClosed ? closedPolls : activePolls;
  const isOwner = (poll: Poll) => currentUser?.uid === poll.createdBy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] glass-card rounded-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">All Polls</h2>
              <p className="text-xs text-white/50">
                {activePolls.length} active · {closedPolls.length} closed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-white/10">
          <button
            onClick={() => setShowClosed(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              !showClosed
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Active ({activePolls.length})
          </button>
          <button
            onClick={() => setShowClosed(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              showClosed
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            Closed ({closedPolls.length})
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-180px)]">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-white/5 rounded-xl animate-pulse">
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="space-y-2">
                    <div className="h-10 bg-white/10 rounded" />
                    <div className="h-10 bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedPolls.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-white/70 font-medium mb-1">
                No {showClosed ? 'closed' : 'active'} polls
              </h3>
              <p className="text-white/40 text-sm">
                {showClosed
                  ? 'Closed polls will appear here'
                  : 'Create a poll in chat using /poll'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedPolls.map((poll) => (
                <div key={poll.id} className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
                  {/* Poll info header */}
                  <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-white/50">
                      <span>Created by {poll.createdByName}</span>
                      <span>·</span>
                      <span>{formatDate(poll.createdAt)}</span>
                      <span>·</span>
                      <span>{getTotalVotes(poll)} votes</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {isOwner(poll) && (
                        <>
                          {poll.closed ? (
                            <button
                              onClick={() => handleReopen(poll.id)}
                              className="px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                            >
                              Reopen
                            </button>
                          ) : (
                            <button
                              onClick={() => handleClose(poll.id)}
                              className="px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                            >
                              Close
                            </button>
                          )}

                          {confirmDelete === poll.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(poll.id)}
                                className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-3 py-1.5 text-xs text-white/50 hover:bg-white/10 rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(poll.id)}
                              className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Poll card */}
                  <div className="p-3">
                    <PollCard poll={poll} compact showActions={false} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
