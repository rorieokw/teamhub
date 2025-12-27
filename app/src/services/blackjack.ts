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
import {
  getTokenBalance,
  deductTokens,
  creditTokens,
  recordLoss,
  incrementGamesPlayed,
} from './tokens';

const COLLECTION = 'blackjackGames';

// Default values
const DEFAULT_MIN_BET = 10;
const DEFAULT_MAX_BET = 500;
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
  // Get creator's current token balance
  const creatorBalance = await getTokenBalance(creatorId);

  // Check if they have enough for minimum bet
  if (creatorBalance < DEFAULT_MIN_BET) {
    throw new Error(`You need at least ${DEFAULT_MIN_BET} tokens to play. Use daily reset to get more tokens.`);
  }

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
      ...(creatorAvatar && { odlUserAvatar: creatorAvatar }),
      seatNumber: 0,
      chips: creatorBalance, // Use actual token balance
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

  // Get user's token balance
  const userBalance = await getTokenBalance(odlUser);

  // Check if they have enough for minimum bet
  if (userBalance < game.minBet) {
    throw new Error(`You need at least ${game.minBet} tokens to join. Use daily reset to get more tokens.`);
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
    ...(odlUserAvatar && { odlUserAvatar }),
    seatNumber,
    chips: userBalance, // Use actual token balance
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
  // Build clean player objects to avoid undefined field issues
  const updatedPlayers = game.players
    .filter((p) => p.odlUser !== odlUser)
    .map((p) => ({
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      ...(p.odlUserAvatar && { odlUserAvatar: p.odlUserAvatar }),
      seatNumber: p.seatNumber,
      chips: p.chips,
      currentBet: p.currentBet,
      hand: [...p.hand],
      ...(p.splitHand && { splitHand: [...p.splitHand] }),
      status: p.status,
      ...(p.hasDoubledDown && { hasDoubledDown: p.hasDoubledDown }),
      ...(p.hasSplit && { hasSplit: p.hasSplit }),
      joinedAt: p.joinedAt,
    }));

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

  // Refresh token balances for all players from their user profiles
  const playerBalances = await Promise.all(
    game.players.map(async (p) => {
      const balance = await getTokenBalance(p.odlUser);
      return { odlUser: p.odlUser, balance };
    })
  );

  // Create a map for quick lookup
  const balanceMap = new Map(playerBalances.map((pb) => [pb.odlUser, pb.balance]));

  // Reset players for new round with fresh token balances
  const players: BlackjackPlayer[] = game.players.map((p) => {
    const freshBalance = balanceMap.get(p.odlUser) ?? p.chips;

    const resetPlayer: BlackjackPlayer = {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      ...(p.odlUserAvatar && { odlUserAvatar: p.odlUserAvatar }),
      seatNumber: p.seatNumber,
      chips: freshBalance, // Use fresh token balance from user profile
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
  odlUserName: string,
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

  if (amount < game.minBet || amount > game.maxBet) {
    throw new Error(`Bet must be between $${game.minBet} and $${game.maxBet}`);
  }

  // Deduct tokens from global balance
  const deductResult = await deductTokens(
    odlUser,
    odlUserName,
    amount,
    'blackjack',
    gameId,
    `Blackjack bet - Round ${game.roundNumber + 1}`
  );

  if (!deductResult.success) {
    throw new Error(deductResult.error || 'Not enough tokens');
  }

  // Build clean player objects to avoid undefined field issues
  const updatedPlayers = game.players.map((p, i) => {
    const base = {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      ...(p.odlUserAvatar && { odlUserAvatar: p.odlUserAvatar }),
      seatNumber: p.seatNumber,
      chips: i === playerIndex ? deductResult.newBalance : p.chips, // Update with new balance
      currentBet: p.currentBet,
      hand: [...p.hand],
      status: p.status,
      joinedAt: p.joinedAt,
    };

    if (i === playerIndex) {
      return {
        ...base,
        currentBet: amount,
        status: 'waiting' as const,
      };
    }
    return base;
  });

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

  // Deal 2 cards to each player - explicitly build clean player objects
  const players = game.players.map((p) => {
    const { dealt, remaining } = dealCards(deck, 2);
    deck = remaining;
    return {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      ...(p.odlUserAvatar && { odlUserAvatar: p.odlUserAvatar }),
      seatNumber: p.seatNumber,
      chips: p.chips,
      currentBet: p.currentBet,
      hand: dealt,
      status: isBlackjack(dealt) ? 'blackjack' as const : 'playing' as const,
      hasDoubledDown: false,
      hasSplit: false,
      joinedAt: p.joinedAt,
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

  // Helper to build clean player object
  const buildCleanPlayer = (p: BlackjackPlayer) => ({
    odlUser: p.odlUser,
    odlUserName: p.odlUserName,
    ...(p.odlUserAvatar && { odlUserAvatar: p.odlUserAvatar }),
    seatNumber: p.seatNumber,
    chips: p.chips,
    currentBet: p.currentBet,
    hand: [...p.hand],
    ...(p.splitHand && { splitHand: [...p.splitHand] }),
    status: p.status,
    ...(p.insuranceBet && { insuranceBet: p.insuranceBet }),
    ...(p.hasDoubledDown === true && { hasDoubledDown: true as const }),
    ...(p.hasSplit === true && { hasSplit: true as const }),
    joinedAt: p.joinedAt,
  });

  // Deep clone all players to ensure proper serialization
  let updatedPlayers = game.players.map(buildCleanPlayer);
  const clonedPlayer = updatedPlayers[playerIndex];
  let deck = [...game.deck];

  switch (action) {
    case 'hit': {
      const { dealt, remaining } = dealCards(deck, 1);
      deck = remaining;
      const newHand = [...currentHand, ...dealt];

      if (game.currentHandIndex === 0) {
        updatedPlayers[playerIndex] = {
          ...clonedPlayer,
          hand: newHand,
          status: isBusted(newHand) ? 'busted' : 'playing',
        };
      } else {
        updatedPlayers[playerIndex] = {
          ...clonedPlayer,
          splitHand: newHand,
          status: isBusted(newHand) ? 'busted' : 'playing',
        };
      }
      break;
    }

    case 'stand': {
      updatedPlayers[playerIndex] = {
        ...clonedPlayer,
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
          ...clonedPlayer,
          hand: newHand,
          chips: player.chips - player.currentBet,
          currentBet: player.currentBet * 2,
          hasDoubledDown: true as const,
          status: isBusted(newHand) ? 'busted' : 'standing',
        };
      } else {
        updatedPlayers[playerIndex] = {
          ...clonedPlayer,
          splitHand: newHand,
          chips: player.chips - player.currentBet,
          hasDoubledDown: true as const,
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
        ...clonedPlayer,
        hand: [currentHand[0], ...card1],
        splitHand: [currentHand[1], ...card2],
        chips: player.chips - player.currentBet,
        hasSplit: true as const,
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

  // Process each player's payout asynchronously
  const payoutPromises = game.players.map(async (player) => {
    // Build clean player object
    const cleanPlayer = {
      odlUser: player.odlUser,
      odlUserName: player.odlUserName,
      ...(player.odlUserAvatar && { odlUserAvatar: player.odlUserAvatar }),
      seatNumber: player.seatNumber,
      chips: player.chips,
      currentBet: player.currentBet,
      hand: [...player.hand],
      ...(player.splitHand && { splitHand: [...player.splitHand] }),
      status: player.status,
      ...(player.hasDoubledDown && { hasDoubledDown: player.hasDoubledDown }),
      ...(player.hasSplit && { hasSplit: player.hasSplit }),
      joinedAt: player.joinedAt,
    };

    if (player.status === 'waiting' || player.status === 'betting') {
      return cleanPlayer;
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
    let totalBet = player.currentBet * (player.hasDoubledDown ? 2 : 1);
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
      totalBet += player.currentBet; // Additional bet for split hand

      // Update status if split hand won
      if (splitResult.result === 'win' || splitResult.result === 'blackjack') {
        status = 'won';
      }
    }

    // Update global token balance based on result
    let newBalance = player.chips;

    if (totalPayout > 0) {
      // Player won - credit the payout (includes original bet + winnings)
      const creditResult = await creditTokens(
        player.odlUser,
        player.odlUserName,
        totalPayout,
        'blackjack',
        gameId,
        `Blackjack ${status === 'push' ? 'push' : 'win'} - Round ${game.roundNumber}`
      );
      newBalance = creditResult.newBalance;
    } else {
      // Player lost - record the loss (tokens already deducted)
      await recordLoss(player.odlUser, totalBet, 'blackjack', gameId);
      // Fetch updated balance
      newBalance = await getTokenBalance(player.odlUser);
    }

    // Increment games played counter
    await incrementGamesPlayed(player.odlUser);

    return {
      ...cleanPlayer,
      chips: newBalance,
      status,
    };
  });

  // Wait for all payouts to process
  const updatedPlayers = await Promise.all(payoutPromises);

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
