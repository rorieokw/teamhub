import { useState, useEffect } from 'react';
import { subscribeToActivePolls } from '../../services/polls';
import PollCard from './PollCard';
import PollsModal from './PollsModal';
import type { Poll } from '../../types';

export default function DashboardPollsWidget() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPollsModal, setShowPollsModal] = useState(false);

  useEffect(() => {
    // Set loading false after a short delay even if subscription fails
    const timeout = setTimeout(() => setLoading(false), 1000);

    const unsubscribe = subscribeToActivePolls((data) => {
      // Only show the 3 most recent active polls
      setPolls(data.slice(0, 3));
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-medium text-white/90">Active Polls</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-white/5 rounded-lg animate-pulse">
              <div className="h-4 bg-white/10 rounded w-3/4 mb-3" />
              <div className="space-y-2">
                <div className="h-8 bg-white/10 rounded" />
                <div className="h-8 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-medium text-white/90">Active Polls</h3>
        </div>
        <button
          onClick={() => setShowPollsModal(true)}
          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          View all
        </button>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-2xl opacity-50">📊</span>
          </div>
          <p className="text-sm text-white/50">No active polls</p>
          <p className="text-xs text-white/30 mt-1">
            Create one in chat with /poll
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} compact showActions={false} />
          ))}
        </div>
      )}

      {/* Polls Modal */}
      <PollsModal
        isOpen={showPollsModal}
        onClose={() => setShowPollsModal(false)}
      />
    </div>
  );
}
