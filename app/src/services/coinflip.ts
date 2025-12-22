import {
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  or,
} from 'firebase/firestore';
import { db } from './firebase';
import type { CoinFlip, CoinFlipStatus, CoinFlipResult } from '../types';

const COLLECTION = 'coinFlips';

// Create a new coin flip challenge
export async function createCoinFlipChallenge(
  challengerId: string,
  opponentId: string,
  challengerCall: 'heads' | 'tails',
  reason?: string
): Promise<string> {
  const flipData = {
    challengerId,
    opponentId,
    challengerCall,
    status: 'pending' as CoinFlipStatus,
    result: null as CoinFlipResult,
    reason: reason || null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), flipData);
  return docRef.id;
}

// Accept and execute the coin flip
export async function acceptCoinFlip(flipId: string): Promise<'heads' | 'tails'> {
  const flipRef = doc(db, COLLECTION, flipId);

  // Set to flipping state
  await updateDoc(flipRef, {
    status: 'flipping' as CoinFlipStatus,
  });

  // Simulate flip delay (handled in UI, but we do the actual flip here)
  const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';

  return result;
}

// Complete the flip with result
export async function completeCoinFlip(
  flipId: string,
  result: 'heads' | 'tails',
  challengerId: string,
  opponentId: string,
  challengerCall: 'heads' | 'tails'
): Promise<void> {
  const flipRef = doc(db, COLLECTION, flipId);

  // Challenger wins if their call matches the result
  const winnerId = challengerCall === result ? challengerId : opponentId;

  await updateDoc(flipRef, {
    status: 'completed' as CoinFlipStatus,
    result,
    winnerId,
    completedAt: serverTimestamp(),
  });
}

// Decline a coin flip challenge
export async function declineCoinFlip(flipId: string): Promise<void> {
  const flipRef = doc(db, COLLECTION, flipId);
  await updateDoc(flipRef, {
    status: 'declined' as CoinFlipStatus,
    completedAt: serverTimestamp(),
  });
}

// Subscribe to user's coin flips (pending and recent)
export function subscribeToUserCoinFlips(
  userId: string,
  callback: (flips: CoinFlip[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    or(
      where('challengerId', '==', userId),
      where('opponentId', '==', userId)
    )
  );

  return onSnapshot(q, (snapshot) => {
    const flips = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as CoinFlip[];

    // Filter to pending, flipping, or recent completed (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const relevantFlips = flips
      .filter((f) => {
        if (f.status === 'pending' || f.status === 'flipping') return true;
        if (f.status === 'completed' && f.completedAt) {
          const completedTime = f.completedAt.toMillis?.() || 0;
          return completedTime > fiveMinutesAgo;
        }
        return false;
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    callback(relevantFlips);
  });
}

// Subscribe to a specific flip
export function subscribeToCoinFlip(
  flipId: string,
  callback: (flip: CoinFlip | null) => void
): () => void {
  const flipRef = doc(db, COLLECTION, flipId);

  return onSnapshot(flipRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        id: snapshot.id,
        ...snapshot.data(),
      } as CoinFlip);
    } else {
      callback(null);
    }
  });
}
