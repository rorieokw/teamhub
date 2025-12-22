import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToPinnedItems } from '../../services/pinnedItems';
import PinnedItemCard from './PinnedItemCard';
import type { PinnedItem } from '../../types';

export default function PinnedItemsWidget() {
  const { currentUser } = useAuth();
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const timeout = setTimeout(() => setLoading(false), 1000);

    const unsubscribe = subscribeToPinnedItems(currentUser.uid, (items) => {
      setPinnedItems(items);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
            <div className="w-8 h-8 rounded-lg bg-white/10" />
            <div className="flex-1">
              <div className="h-3 bg-white/10 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (pinnedItems.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/5 flex items-center justify-center">
          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <p className="empty-state-title">No pinned items</p>
        <p className="empty-state-description">
          Pin tasks, messages, or documents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pinnedItems.slice(0, 5).map((item) => (
        <PinnedItemCard key={item.id} item={item} />
      ))}
      {pinnedItems.length > 5 && (
        <p className="text-center text-subtle mt-2">+{pinnedItems.length - 5} more</p>
      )}
    </div>
  );
}
