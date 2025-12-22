import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { playNotificationSound } from '../services/notificationSound';

// Hook to play sound when new notifications arrive
export function useNotificationSound(userId: string | undefined) {
  const lastNotificationIdRef = useRef<string | null>(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!userId) return;

    // Query for the most recent unread notification
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        isFirstLoadRef.current = false;
        return;
      }

      const latestNotification = snapshot.docs[0];
      const notificationId = latestNotification.id;

      // Skip playing sound on initial load
      if (isFirstLoadRef.current) {
        lastNotificationIdRef.current = notificationId;
        isFirstLoadRef.current = false;
        return;
      }

      // Play sound only if this is a new notification
      if (notificationId !== lastNotificationIdRef.current) {
        lastNotificationIdRef.current = notificationId;
        playNotificationSound();
      }
    });

    return () => {
      unsubscribe();
      isFirstLoadRef.current = true;
    };
  }, [userId]);
}
