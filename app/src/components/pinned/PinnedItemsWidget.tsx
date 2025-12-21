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

    // Set loading false after a short delay even if subscription fails
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
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="text-sm font-medium text-white/90">Pinned Items</h3>
        </div>
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
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <h3 className="text-sm font-medium text-white/90">Pinned Items</h3>
        </div>
        {pinnedItems.length > 0 && (
          <span className="text-xs text-white/40">{pinnedItems.length} pinned</span>
        )}
      </div>

      {pinnedItems.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-6 h-6 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <p className="text-sm text-white/50">No pinned items</p>
          <p className="text-xs text-white/30 mt-1">
            Pin tasks, messages, or documents for quick access
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
          {pinnedItems.map((item) => (
            <PinnedItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
