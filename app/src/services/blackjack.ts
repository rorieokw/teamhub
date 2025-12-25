import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  BlackjackGame,
  BlackjackPlayer,
  BlackjackGameSummary,
  BlackjackAction,
} from '../types/blackjack';
import {
  createShoe,
  dealCards,
  isBlackjack,
  isBusted,
  canSplit,
  canDoubleDown,
  shouldDealerHit,
  determineOutcome,
} from '../utils/blackjackLogic';

const COLLECTION = 'blackjackGames';

// Default values
const DEFAULT_MIN_BET = 10;
const DEFAULT_MAX_BET = 500;
const DEFAULT_BUY_IN = 1000;
const NUM_DECKS = 6;

// Subscribe to all active blackjack games (for lobby)
export function subscribeToBlackjackGames(
  callback: (games: BlackjackGameSummary[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const games: BlackjackGameSummary[] = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as BlackjackGame;

      // Skip finished games
      if (data.phase === 'finished') return;

      games.push({
        id: docSnap.id,
        name: data.name,
        playerCount: data.players?.length || 0,
        maxPlayers: data.maxPlayers,
        minBet: data.minBet,
        maxBet: data.maxBet,
        phase: data.phase,
        createdBy: data.createdBy,
      });
    });

    callback(games);
  });
}

// Subscribe to a specific blackjack game
export function subscribeToBlackjackGame(
  gameId: string,
  _odlUser: string,
  callback: (game: BlackjackGame | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, gameId);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data() as BlackjackGame;
    data.id = snapshot.id;

    // Hide deck and dealer's hole card (second card) until revealed
    const sanitizedGame: BlackjackGame = {
      ...data,
      deck: [], // Never send deck to client
      dealerHand: data.dealerRevealed
        ? data.dealerHand
        : data.dealerHand.slice(0, 1), // Only show first card
    };

    callback(sanitizedGame);
  });
}

// Create a new blackjack game
export async function createBlackjackGame(
  creatorId: string,
  creatorName: string,
  creatorAvatar?: string,
  gameName?: string
): Promise<string> {
  const game: Omit<BlackjackGame, 'id'> = {
    name: gameName || `${creatorName}'s Table`,
    minBet: DEFAULT_MIN_BET,
    maxBet: DEFAULT_MAX_BET,
    maxPlayers: 5,
    phase: 'waiting',
    deck: createShoe(NUM_DECKS),
    dealerHand: [],
    dealerRevealed: false,
    players: [{
      odlUser: creatorId,
      odlUserName: creatorName,
      odlUserAvatar: creatorAvatar,
      seatNumber: 0,
      chips: DEFAULT_BUY_IN,
      currentBet: 0,
      hand: [],
      status: 'waiting',
      joinedAt: Timestamp.now(),
    }],
    currentPlayerIndex: 0,
    currentHandIndex: 0,
    roundNumber: 0,
    createdBy: creatorId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTION), game);
  return docRef.id;
}

// Join an existing blackjack game
export async function joinBlackjackGame(
  gameId: string,
  odlUser: string,
  odlUserName: string,
  odlUserAvatar?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as BlackjackGame;

  // Check if already in game
  if (game.players.some((p) => p.odlUser === odlUser)) {
    return;
  }

  // Check if game is full
  if (game.players.length >= game.maxPlayers) {
    throw new Error('Game is full');
  }

  // Find available seat
  const takenSeats = game.players.map((p) => p.seatNumber);
  let seatNumber = 0;
  for (let i = 0; i < game.maxPlayers; i++) {
    if (!takenSeats.includes(i)) {
      seatNumber = i;
      break;
    }
  }

  const newPlayer: BlackjackPlayer = {
    odlUser,
    odlUserName,
    odlUserAvatar,
    seatNumber,
    chips: DEFAULT_BUY_IN,
    currentBet: 0,
    hand: [],
    status: 'waiting',
    joinedAt: Timestamp.now(),
  };

  await updateDoc(docRef, {
    players: [...game.players, newPlayer],
    updatedAt: serverTimestamp(),
  });
}

// Leave a blackjack game
export async function leaveBlackjackGame(
  gameId: string,
  odlUser: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as BlackjackGame;
  const updatedPlayers = game.players.filter((p) => p.odlUser !== odlUser);

  if (updatedPlayers.length === 0) {
    await deleteDoc(docRef);
  } else {
    const isHost = game.createdBy === odlUser;
    const newHost = isHost
      ? updatedPlayers.sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis())[0].odlUser
      : game.createdBy;

    await updateDoc(docRef, {
      players: updatedPlayers,
      createdBy: newHost,
      updatedAt: serverTimestamp(),
    });
  }
}

// Start betting phase
export async function startBettingPhase(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as BlackjackGame;

  if (game.players.length < 1) {
    throw new Error('Need at least 1 player to start');
  }

  // Reset players for new round - explicitly build without optional fields
  const players: BlackjackPlayer[] = game.players.map((p) => {
    // Create base player object without optional fields that should be cleared
    const resetPlayer: BlackjackPlayer = {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      odlUserAvatar: p.odlUserAvatar,
      seatNumber: p.seatNumber,
      chips: p.chips,
      currentBet: 0,
      hand: [],
      status: 'betting',
      hasDoubledDown: false,
      hasSplit: false,
      joinedAt: p.joinedAt,
    };
    return resetPlayer;
  });

  await updateDoc(docRef, {
    phase: 'betting',
    players,
    dealerHand: [],
    dealerRevealed: false,
    currentPlayerIndex: 0,
    currentHandIndex: 0,
    updatedAt: serverTimestamp(),
  });
}

// Place a bet
export async function placeBet(
  gameId: string,
  odlUser: string,
  amount: number
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as BlackjackGame;

  if (game.phase !== 'betting') {
    throw new Error('Not in betting phase');
  }

  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);
  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  const player = game.players[playerIndex];

  if (amount < game.minBet || amount > game.maxBet) {
    throw new Error(`Bet must be between $${game.minBet} and $${game.maxBet}`);
  }

  if (amount > player.chips) {
    throw new Error('Not enough chips');
  }

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    currentBet: amount,
    chips: player.chips - amount,
    status: 'waiting',
  };

  // Check if all players have bet
  const allBet = updatedPlayers.every((p) => p.currentBet > 0);

  await updateDoc(docRef, {
    players: updatedPlayers,
    phase: allBet ? 'dealing' : 'betting',
    updatedAt: serverTimestamp(),
  });

  // If all players bet, start dealing
  if (allBet) {
    await dealInitialCards(gameId);
  }
}

// Deal initial cards
async function dealInitialCards(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as BlackjackGame;
  let deck = [...game.deck];

  // Deal 2 cards to each player
  const players = game.players.map((p) => {
    const { dealt, remaining } = dealCards(deck, 2);
    deck = remaining;
    return {
      ...p,
      hand: dealt,
      status: isBlackjack(dealt) ? 'blackjack' as const : 'playing' as const,
    };
  });

  // Deal 2 cards to dealer
  const { dealt: dealerHand, remaining: finalDeck } = dealCards(deck, 2);

  // Find first player who can act (not blackjack)
  let currentPlayerIndex = players.findIndex((p) => p.status === 'playing');
  if (currentPlayerIndex === -1) {
    currentPlayerIndex = 0;
  }

  await updateDoc(docRef, {
    deck: finalDeck,
    dealerHand,
    players,
    phase: 'playing',
    currentPlayerIndex,
    currentHandIndex: 0,
    roundNumber: game.roundNumber + 1,
    updatedAt: serverTimestamp(),
  });

  // Check if all players have blackjack or if dealer might have blackjack
  const allDone = players.every((p) => p.status !== 'playing');
  if (allDone) {
    await processDealerTurn(gameId);
  }
}

// Player action (hit, stand, double, split)
export async function makeAction(
  gameId: string,
  odlUser: string,
  action: BlackjackAction
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as BlackjackGame;

  if (game.phase !== 'playing') {
    throw new Error('Not in playing phase');
  }

  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);
  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  if (game.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const player = game.players[playerIndex];
  const currentHand = game.currentHandIndex === 0 ? player.hand : player.splitHand || [];
  let updatedPlayers = [...game.players];
  let deck = [...game.deck];

  switch (action) {
    case 'hit': {
      const { dealt, remaining } = dealCards(deck, 1);
      deck = remaining;
      const newHand = [...currentHand, ...dealt];

      if (game.currentHandIndex === 0) {
        updatedPlayers[playerIndex] = {
          ...player,
          hand: newHand,
          status: isBusted(newHand) ? 'busted' : 'playing',
        };
      } else {
        updatedPlayers[playerIndex] = {
          ...player,
          splitHand: newHand,
          status: isBusted(newHand) ? 'busted' : 'playing',
        };
      }
      break;
    }

    case 'stand': {
      updatedPlayers[playerIndex] = {
        ...player,
        status: 'standing',
      };
      break;
    }

    case 'double': {
      if (!canDoubleDown(currentHand, player.chips, player.currentBet)) {
        throw new Error('Cannot double down');
      }

      const { dealt, remaining } = dealCards(deck, 1);
      deck = remaining;
      const newHand = [...currentHand, ...dealt];

      if (game.currentHandIndex === 0) {
        updatedPlayers[playerIndex] = {
          ...player,
          hand: newHand,
          chips: player.chips - player.currentBet,
          currentBet: player.currentBet * 2,
          hasDoubledDown: true,
          status: isBusted(newHand) ? 'busted' : 'standing',
        };
      } else {
        updatedPlayers[playerIndex] = {
          ...player,
          splitHand: newHand,
          chips: player.chips - player.currentBet,
          hasDoubledDown: true,
          status: isBusted(newHand) ? 'busted' : 'standing',
        };
      }
      break;
    }

    case 'split': {
      if (!canSplit(currentHand, player.chips, player.currentBet)) {
        throw new Error('Cannot split');
      }

      // Split the hand
      const { dealt: card1, remaining: deck1 } = dealCards(deck, 1);
      const { dealt: card2, remaining: deck2 } = dealCards(deck1, 1);
      deck = deck2;

      updatedPlayers[playerIndex] = {
        ...player,
        hand: [currentHand[0], ...card1],
        splitHand: [currentHand[1], ...card2],
        chips: player.chips - player.currentBet,
        hasSplit: true,
        status: 'playing',
      };
      break;
    }

    case 'insurance': {
      // Insurance is handled separately at the start of the round
      throw new Error('Insurance not available');
    }
  }

  // Check if this player is done
  const updatedPlayer = updatedPlayers[playerIndex];
  const isDone = updatedPlayer.status !== 'playing';

  // If player split and finished main hand, switch to split hand
  if (isDone && updatedPlayer.hasSplit && game.currentHandIndex === 0 && updatedPlayer.splitHand) {
    await updateDoc(docRef, {
      deck,
      players: updatedPlayers,
      currentHandIndex: 1,
      updatedAt: serverTimestamp(),
    });

    // Reset player status to playing for split hand
    updatedPlayers[playerIndex] = { ...updatedPlayers[playerIndex], status: 'playing' };
    await updateDoc(docRef, { players: updatedPlayers });
    return;
  }

  // Find next player who can act
  let nextPlayerIndex = game.currentPlayerIndex;
  let foundNext = false;

  for (let i = 1; i <= game.players.length; i++) {
    const idx = (game.currentPlayerIndex + i) % game.players.length;
    if (updatedPlayers[idx].status === 'playing') {
      nextPlayerIndex = idx;
      foundNext = true;
      break;
    }
  }

  // All players done, dealer's turn
  if (!foundNext || (isDone && nextPlayerIndex === game.currentPlayerIndex)) {
    await updateDoc(docRef, {
      deck,
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    });
    await processDealerTurn(gameId);
    return;
  }

  await updateDoc(docRef, {
    deck,
    players: updatedPlayers,
    currentPlayerIndex: nextPlayerIndex,
    currentHandIndex: 0,
    updatedAt: serverTimestamp(),
  });
}

// Process dealer's turn
async function processDealerTurn(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as BlackjackGame;
  let deck = [...game.deck];
  let dealerHand = [...game.dealerHand];

  // Check if any player is still in (not busted)
  const anyPlayerIn = game.players.some(
    (p) => p.status !== 'busted' && p.status !== 'betting' && p.status !== 'waiting'
  );

  // Dealer hits until 17 or busts (if any player is still in)
  if (anyPlayerIn) {
    while (shouldDealerHit(dealerHand)) {
      const { dealt, remaining } = dealCards(deck, 1);
      dealerHand = [...dealerHand, ...dealt];
      deck = remaining;
    }
  }

  // Reveal dealer's hand and process payouts
  await updateDoc(docRef, {
    deck,
    dealerHand,
    dealerRevealed: true,
    phase: 'payout',
    updatedAt: serverTimestamp(),
  });

  // Calculate payouts
  await processPayouts(gameId);
}

// Process payouts
async function processPayouts(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as BlackjackGame;

  const updatedPlayers = game.players.map((player) => {
    if (player.status === 'waiting' || player.status === 'betting') {
      return player;
    }

    // Main hand payout
    const mainResult = determineOutcome(
      player.hand,
      game.dealerHand,
      player.currentBet,
      player.hasDoubledDown || false,
      player.insuranceBet || 0
    );

    let totalPayout = mainResult.payout;
    let status = mainResult.result === 'win' || mainResult.result === 'blackjack'
      ? 'won' as const
      : mainResult.result === 'push'
      ? 'push' as const
      : 'lost' as const;

    // Split hand payout (if applicable)
    if (player.hasSplit && player.splitHand) {
      const splitResult = determineOutcome(
        player.splitHand,
        game.dealerHand,
        player.currentBet,
        false,
        0
      );
      totalPayout += splitResult.payout;

      // Update status if split hand won
      if (splitResult.result === 'win' || splitResult.result === 'blackjack') {
        status = 'won';
      }
    }

    return {
      ...player,
      chips: player.chips + totalPayout,
      status,
    };
  });

  await updateDoc(docRef, {
    players: updatedPlayers,
    phase: 'finished',
    updatedAt: serverTimestamp(),
  });
}

// Delete a blackjack game
export async function deleteBlackjackGame(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  await deleteDoc(docRef);
}

// Clean up stale blackjack games
export async function cleanupStaleBlackjackGames(force = false): Promise<number> {
  const q = query(collection(db, COLLECTION));
  const now = Date.now();
  const STALE_THRESHOLD = 10 * 60 * 1000;

  const allGames = await new Promise<{ id: string; shouldDelete: boolean }[]>((resolve) => {
    const unsub = onSnapshot(q, (snap) => {
      unsub();
      const games = snap.docs.map((d) => {
        if (force) {
          return { id: d.id, shouldDelete: true };
        }

        const data = d.data() as BlackjackGame;
        const lastActivity = data.updatedAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
        const isStale = lastActivity > 0 && (now - lastActivity) > STALE_THRESHOLD;
        const noPlayers = !data.players || data.players.length === 0;

        return { id: d.id, shouldDelete: noPlayers || isStale };
      });
      resolve(games);
    });
  });

  let deletedCount = 0;
  for (const game of allGames) {
    if (game.shouldDelete) {
      await deleteDoc(doc(db, COLLECTION, game.id));
      deletedCount++;
    }
  }

  return deletedCount;
}
