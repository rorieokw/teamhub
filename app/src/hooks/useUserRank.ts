import { useState, useEffect } from 'react';
import { subscribeToUserStats, getDefaultStats } from '../services/ranks';
import type { UserStats } from '../types';

// Hook to subscribe to a single user's rank
export function useUserRank(userId: string | undefined): UserStats | null {
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }

    const unsubscribe = subscribeToUserStats(userId, setStats);
    return () => unsubscribe();
  }, [userId]);

  return stats;
}

// Hook to subscribe to multiple users' ranks
export function useUsersRanks(userIds: string[]): Map<string, UserStats> {
  const [statsMap, setStatsMap] = useState<Map<string, UserStats>>(new Map());

  useEffect(() => {
    if (userIds.length === 0) {
      setStatsMap(new Map());
      return;
    }

    const unsubscribes: (() => void)[] = [];

    userIds.forEach((userId) => {
      const unsubscribe = subscribeToUserStats(userId, (stats) => {
        setStatsMap((prev) => {
          const newMap = new Map(prev);
          newMap.set(userId, stats);
          return newMap;
        });
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [userIds.join(',')]); // Re-run when user IDs change

  return statsMap;
}

// Get default stats for display when loading
export { getDefaultStats };
