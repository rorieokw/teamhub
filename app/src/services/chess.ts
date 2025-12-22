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
import type { ChessGame, ChessGameStatus } from '../types';

const COLLECTION = 'chessGames';

// Create a new chess challenge
export async function createChessChallenge(
  challengerId: string,
  opponentId: string
): Promise<string> {
  // Randomly assign colors
  const challengerIsWhite = Math.random() > 0.5;

  const gameData = {
    whitePlayerId: challengerIsWhite ? challengerId : opponentId,
    blackPlayerId: challengerIsWhite ? opponentId : challengerId,
    challengerId,
    status: 'pending' as ChessGameStatus,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', // Starting position
    moves: [],
    currentTurn: 'white' as const,
    result: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, COLLECTION), gameData);
  return docRef.id;
}

// Accept a chess challenge
export async function acceptChessChallenge(gameId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION, gameId);
  await updateDoc(gameRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

// Decline a chess challenge
export async function declineChessChallenge(gameId: string): Promise<void> {
  const gameRef = doc(db, COLLECTION, gameId);
  await updateDoc(gameRef, {
    status: 'declined',
    updatedAt: serverTimestamp(),
  });
}

// Make a move
export async function makeChessMove(
  gameId: string,
  newFen: string,
  move: string,
  currentMoves: string[],
  nextTurn: 'white' | 'black'
): Promise<void> {
  const gameRef = doc(db, COLLECTION, gameId);
  await updateDoc(gameRef, {
    fen: newFen,
    moves: [...currentMoves, move],
    currentTurn: nextTurn,
    updatedAt: serverTimestamp(),
  });
}

// End game (checkmate, stalemate, resignation)
export async function endChessGame(
  gameId: string,
  result: 'white' | 'black' | 'draw',
  winnerId?: string
): Promise<void> {
  const gameRef = doc(db, COLLECTION, gameId);
  await updateDoc(gameRef, {
    status: 'completed',
    result,
    winner: winnerId || null,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Subscribe to user's chess games (active and pending)
export function subscribeToUserChessGames(
  userId: string,
  callback: (games: ChessGame[]) => void
): () => void {
  // Query without orderBy to avoid needing composite index with or()
  const q = query(
    collection(db, COLLECTION),
    or(
      where('whitePlayerId', '==', userId),
      where('blackPlayerId', '==', userId)
    )
  );

  return onSnapshot(q, (snapshot) => {
    const games = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ChessGame[];

    // Filter to only show pending and active games (not old completed ones)
    // Sort client-side by updatedAt descending
    const relevantGames = games
      .filter((g) => g.status === 'pending' || g.status === 'active')
      .sort((a, b) => {
        const aTime = a.updatedAt?.toMillis?.() || 0;
        const bTime = b.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    callback(relevantGames);
  });
}

// Subscribe to a specific game
export function subscribeToChessGame(
  gameId: string,
  callback: (game: ChessGame | null) => void
): () => void {
  const gameRef = doc(db, COLLECTION, gameId);

  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback({
        id: snapshot.id,
        ...snapshot.data(),
      } as ChessGame);
    } else {
      callback(null);
    }
  });
}

// Get pending challenges for a user (where they need to respond)
export function subscribeToPendingChallenges(
  userId: string,
  callback: (games: ChessGame[]) => void
): () => void {
  // Query without orderBy to avoid needing composite index with or()
  const q = query(
    collection(db, COLLECTION),
    or(
      where('whitePlayerId', '==', userId),
      where('blackPlayerId', '==', userId)
    )
  );

  return onSnapshot(q, (snapshot) => {
    const games = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ChessGame[];

    // Filter to pending challenges where this user is NOT the challenger
    // Sort client-side by createdAt descending
    const pendingChallenges = games
      .filter((g) => g.status === 'pending' && g.challengerId !== userId)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

    callback(pendingChallenges);
  });
}
