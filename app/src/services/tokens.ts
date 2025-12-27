import {
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TokenTransaction, GameType, TokenStats } from '../types';
import { DEFAULT_TOKENS } from '../types';

const USERS_COLLECTION = 'users';
const TRANSACTIONS_COLLECTION = 'tokenTransactions';

// Get user's current token balance
export async function getTokenBalance(userId: string): Promise<number> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  return userDoc.data()?.tokens ?? DEFAULT_TOKENS;
}

// Get user's token stats
export async function getTokenStats(userId: string): Promise<TokenStats> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  return userDoc.data()?.tokenStats ?? {
    totalWagered: 0,
    totalWon: 0,
    totalLost: 0,
    gamesPlayed: 0,
  };
}

// Initialize tokens for a user (called when user doesn't have tokens yet)
export async function initializeTokens(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();
  if (userData?.tokens === undefined) {
    await updateDoc(userRef, {
      tokens: DEFAULT_TOKENS,
      tokenStats: {
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        gamesPlayed: 0,
      },
    });
  }
}

// Deduct tokens for a bet (atomic transaction)
export async function deductTokens(
  userId: string,
  userName: string,
  amount: number,
  gameType: GameType,
  gameId: string,
  description: string = 'Bet placed'
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentTokens = userDoc.data()?.tokens ?? DEFAULT_TOKENS;
      const currentStats = userDoc.data()?.tokenStats ?? {
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        gamesPlayed: 0,
      };

      if (currentTokens < amount) {
        throw new Error('Insufficient tokens');
      }

      const newBalance = currentTokens - amount;

      transaction.update(userRef, {
        tokens: newBalance,
        tokenStats: {
          ...currentStats,
          totalWagered: currentStats.totalWagered + amount,
        },
      });

      return newBalance;
    });

    // Log transaction (outside of main transaction for performance)
    await logTransaction(userId, userName, 'bet', -amount, result, gameType, gameId, description);

    return { success: true, newBalance: result };
  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Failed to deduct tokens',
    };
  }
}

// Credit tokens for winnings (atomic transaction)
export async function creditTokens(
  userId: string,
  userName: string,
  amount: number,
  gameType: GameType,
  gameId: string,
  description: string = 'Winnings credited'
): Promise<{ success: boolean; newBalance: number }> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  const result = await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentTokens = userDoc.data()?.tokens ?? DEFAULT_TOKENS;
    const currentStats = userDoc.data()?.tokenStats ?? {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
    };

    const newBalance = currentTokens + amount;

    transaction.update(userRef, {
      tokens: newBalance,
      tokenStats: {
        ...currentStats,
        totalWon: currentStats.totalWon + amount,
      },
    });

    return newBalance;
  });

  // Log transaction
  await logTransaction(userId, userName, 'win', amount, result, gameType, gameId, description);

  return { success: true, newBalance: result };
}

// Record a loss (just updates stats, tokens already deducted from bet)
export async function recordLoss(
  userId: string,
  amount: number,
  _gameType: GameType,
  _gameId: string
): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) return;

    const currentStats = userDoc.data()?.tokenStats ?? {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
    };

    transaction.update(userRef, {
      tokenStats: {
        ...currentStats,
        totalLost: currentStats.totalLost + amount,
        gamesPlayed: currentStats.gamesPlayed + 1,
      },
    });
  });
}

// Increment games played counter
export async function incrementGamesPlayed(userId: string): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) return;

    const currentStats = userDoc.data()?.tokenStats ?? {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
    };

    transaction.update(userRef, {
      tokenStats: {
        ...currentStats,
        gamesPlayed: currentStats.gamesPlayed + 1,
      },
    });
  });
}

// Refund tokens (for cancelled games)
export async function refundTokens(
  userId: string,
  userName: string,
  amount: number,
  gameType: GameType,
  gameId: string,
  description: string = 'Game cancelled - refund'
): Promise<{ success: boolean; newBalance: number }> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  const result = await runTransaction(db, async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentTokens = userDoc.data()?.tokens ?? DEFAULT_TOKENS;
    const currentStats = userDoc.data()?.tokenStats ?? {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
    };

    const newBalance = currentTokens + amount;

    // Subtract from wagered since bet was refunded
    transaction.update(userRef, {
      tokens: newBalance,
      tokenStats: {
        ...currentStats,
        totalWagered: Math.max(0, currentStats.totalWagered - amount),
      },
    });

    return newBalance;
  });

  // Log transaction
  await logTransaction(userId, userName, 'refund', amount, result, gameType, gameId, description);

  return { success: true, newBalance: result };
}

// Daily reset - top up to 50,000 if below (once per day)
export async function dailyReset(
  userId: string,
  userName: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const userRef = doc(db, USERS_COLLECTION, userId);

  try {
    const result = await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const currentTokens = userDoc.data()?.tokens ?? DEFAULT_TOKENS;
      const currentStats = userDoc.data()?.tokenStats ?? {
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        gamesPlayed: 0,
      };

      // Check if already at or above default
      if (currentTokens >= DEFAULT_TOKENS) {
        throw new Error('You already have enough tokens!');
      }

      // Check last reset time
      const lastReset = currentStats.lastDailyReset?.toDate();
      if (lastReset) {
        const now = new Date();
        const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
        if (hoursSinceReset < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceReset);
          throw new Error(`You can reset again in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`);
        }
      }

      // Top up to default amount
      const topUpAmount = DEFAULT_TOKENS - currentTokens;

      transaction.update(userRef, {
        tokens: DEFAULT_TOKENS,
        tokenStats: {
          ...currentStats,
          lastDailyReset: Timestamp.now(),
        },
      });

      return { newBalance: DEFAULT_TOKENS, topUpAmount };
    });

    // Log transaction
    await logTransaction(
      userId,
      userName,
      'daily_reset',
      result.topUpAmount,
      result.newBalance,
      undefined,
      undefined,
      'Daily token reset'
    );

    return { success: true, newBalance: result.newBalance };
  } catch (error) {
    return {
      success: false,
      newBalance: 0,
      error: error instanceof Error ? error.message : 'Failed to reset tokens',
    };
  }
}

// Log a transaction to the transactions collection
async function logTransaction(
  odlUser: string,
  odlUserName: string,
  type: 'bet' | 'win' | 'refund' | 'daily_reset',
  amount: number,
  balanceAfter: number,
  gameType?: GameType,
  gameId?: string,
  description: string = ''
): Promise<void> {
  try {
    await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
      odlUser,
      odlUserName,
      type,
      amount,
      balanceAfter,
      ...(gameType && { gameType }),
      ...(gameId && { gameId }),
      description,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log transaction:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// Subscribe to user's token balance (real-time updates)
export function subscribeToTokenBalance(
  userId: string,
  callback: (balance: number, stats: TokenStats) => void
): () => void {
  const userRef = doc(db, USERS_COLLECTION, userId);

  return onSnapshot(userRef, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.data();
    const balance = data?.tokens ?? DEFAULT_TOKENS;
    const stats = data?.tokenStats ?? {
      totalWagered: 0,
      totalWon: 0,
      totalLost: 0,
      gamesPlayed: 0,
    };

    callback(balance, stats);
  });
}

// Get recent transactions (for admin panel)
export function subscribeToRecentTransactions(
  limitCount: number,
  callback: (transactions: TokenTransaction[]) => void
): () => void {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const transactions: TokenTransaction[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as TokenTransaction[];

    callback(transactions);
  });
}

// Get transactions for a specific user
export function subscribeToUserTransactions(
  userId: string,
  limitCount: number,
  callback: (transactions: TokenTransaction[]) => void
): () => void {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(limitCount * 3) // Get more and filter client-side for simplicity
  );

  return onSnapshot(q, (snapshot) => {
    const transactions: TokenTransaction[] = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }) as TokenTransaction)
      .filter((t) => t.odlUser === userId)
      .slice(0, limitCount);

    callback(transactions);
  });
}

// Check if user has enough tokens to play
export async function canAffordBet(userId: string, minBet: number): Promise<boolean> {
  const balance = await getTokenBalance(userId);
  return balance >= minBet;
}
