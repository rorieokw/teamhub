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
  PokerGame,
  PokerPlayer,
  PokerGameSummary,
  GamePhase,
  PlayerAction,
  Card,
} from '../types/poker';
import {
  createDeck,
  dealCards,
  determineWinners,
} from '../utils/pokerLogic';
import { getBotDecision, generateBotPlayer } from '../utils/pokerAI';

const COLLECTION = 'pokerGames';

// Default values
const DEFAULT_SMALL_BLIND = 10;
const DEFAULT_BIG_BLIND = 20;
const DEFAULT_BUY_IN = 1000;

// Helper to identify bot players (handles old games without isBot field)
function isBotPlayer(player: PokerPlayer): boolean {
  // Check explicit isBot flag first
  if (player.isBot === true) return true;

  // Fallback: check if odlUser starts with 'bot_' prefix (for backwards compatibility)
  if (player.odlUser && player.odlUser.startsWith('bot_')) return true;

  return false;
}

// Subscribe to all active poker games (for lobby)
export function subscribeToPokerGames(
  callback: (games: PokerGameSummary[]) => void
): () => void {
  // Simple query without complex filters to avoid index requirements
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const games: PokerGameSummary[] = [];
    const now = Date.now();
    const STALE_THRESHOLD = 60 * 60 * 1000; // 1 hour in ms

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as PokerGame;

      // Count human players only (use helper for backwards compatibility)
      const humanPlayers = data.players?.filter((p) => !isBotPlayer(p)) || [];

      // Check if host is still in the game (if not, game is stale)
      const hostInGame = data.players?.some((p) => p.odlUser === data.createdBy) ?? false;

      // Check if game is stale based on last activity
      const lastActivity = data.lastActionAt?.toMillis?.() || data.updatedAt?.toMillis?.() || 0;
      const isStale = lastActivity > 0 && (now - lastActivity) > STALE_THRESHOLD;

      // Skip games with no human players, no host, or stale games (auto-cleanup)
      if (humanPlayers.length === 0 || !hostInGame || isStale) {
        // Delete this stale game
        deleteDoc(docSnap.ref).catch(console.error);
        return;
      }

      // Skip finished games
      if (data.phase === 'finished') return;

      games.push({
        id: docSnap.id,
        name: data.name,
        playerCount: humanPlayers.length, // Only count human players
        maxPlayers: data.maxPlayers,
        smallBlind: data.smallBlind,
        bigBlind: data.bigBlind,
        phase: data.phase,
        createdBy: data.createdBy,
      });
    });

    callback(games);
  });
}

// Subscribe to a specific poker game
export function subscribeToPokerGame(
  gameId: string,
  odlUser: string,
  callback: (game: PokerGame | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, gameId);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data() as PokerGame;
    data.id = snapshot.id;

    // Filter out other players' hole cards and the deck
    const sanitizedGame: PokerGame = {
      ...data,
      deck: [], // Never send deck to client
      players: data.players.map((p) => ({
        ...p,
        // Only show hole cards to the owner or during showdown
        holeCards: (p.odlUser === odlUser || data.phase === 'showdown')
          ? p.holeCards
          : [],
      })),
    };

    callback(sanitizedGame);
  });
}

// Create a new poker game
export async function createPokerGame(
  creatorId: string,
  creatorName: string,
  creatorAvatar?: string,
  gameName?: string
): Promise<string> {
  const game: Omit<PokerGame, 'id'> = {
    name: gameName || `${creatorName}'s Table`,
    smallBlind: DEFAULT_SMALL_BLIND,
    bigBlind: DEFAULT_BIG_BLIND,
    minBuyIn: DEFAULT_BUY_IN / 2,
    maxBuyIn: DEFAULT_BUY_IN * 2,
    maxPlayers: 6,
    phase: 'waiting',
    pot: 0,
    sidePots: [],
    communityCards: [],
    deck: [],
    players: [{
      odlUser: creatorId,
      odlUserName: creatorName,
      odlUserAvatar: creatorAvatar,
      seatNumber: 0,
      chips: DEFAULT_BUY_IN,
      currentBet: 0,
      totalBetThisHand: 0,
      holeCards: [],
      status: 'waiting',
      isDealer: true,
      isSmallBlind: false,
      isBigBlind: false,
      hasActedThisRound: false,
      joinedAt: Timestamp.now(),
    }],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    currentBet: 0,
    minRaise: DEFAULT_BIG_BLIND,
    lastRaiserIndex: -1,
    handNumber: 0,
    createdBy: creatorId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    lastActionAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTION), game);
  return docRef.id;
}

// Join an existing poker game
export async function joinPokerGame(
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

  const game = snapshot.data() as PokerGame;

  // Check if already in game
  if (game.players.some((p) => p.odlUser === odlUser)) {
    return; // Already in game
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

  const newPlayer: PokerPlayer = {
    odlUser,
    odlUserName,
    odlUserAvatar,
    seatNumber,
    chips: DEFAULT_BUY_IN,
    currentBet: 0,
    totalBetThisHand: 0,
    holeCards: [],
    status: 'waiting',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    hasActedThisRound: false,
    joinedAt: Timestamp.now(),
  };

  await updateDoc(docRef, {
    players: [...game.players, newPlayer],
    updatedAt: serverTimestamp(),
  });
}

// Leave a poker game
export async function leavePokerGame(
  gameId: string,
  odlUser: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as PokerGame;
  const updatedPlayers = game.players.filter((p) => p.odlUser !== odlUser);

  // Check if any human players remain (use helper for backwards compatibility)
  const humanPlayers = updatedPlayers.filter((p) => !isBotPlayer(p));

  if (updatedPlayers.length === 0 || humanPlayers.length === 0) {
    // Delete game if empty or only bots remain
    await deleteDoc(docRef);
  } else {
    // Check if the leaving player is the host
    const isHost = game.createdBy === odlUser;

    // If host is leaving, transfer to next human player (by join time)
    const newHost = isHost
      ? humanPlayers.sort((a, b) => a.joinedAt.toMillis() - b.joinedAt.toMillis())[0].odlUser
      : game.createdBy;

    await updateDoc(docRef, {
      players: updatedPlayers,
      createdBy: newHost,
      updatedAt: serverTimestamp(),
    });
  }
}

// Add a bot player to the game
export async function addBotToGame(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as PokerGame;

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

  const botInfo = generateBotPlayer();

  const newBot: PokerPlayer = {
    odlUser: botInfo.odlUser,
    odlUserName: botInfo.odlUserName,
    odlUserAvatar: botInfo.odlUserAvatar,
    seatNumber,
    chips: DEFAULT_BUY_IN,
    currentBet: 0,
    totalBetThisHand: 0,
    holeCards: [],
    status: 'waiting',
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    hasActedThisRound: false,
    isBot: true,
    joinedAt: Timestamp.now(),
  };

  await updateDoc(docRef, {
    players: [...game.players, newBot],
    updatedAt: serverTimestamp(),
  });
}

// Remove a bot from the game
export async function removeBotFromGame(gameId: string, botUserId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as PokerGame;
  const bot = game.players.find((p) => p.odlUser === botUserId);

  if (!bot || !bot.isBot) {
    throw new Error('Bot not found');
  }

  const updatedPlayers = game.players.filter((p) => p.odlUser !== botUserId);

  await updateDoc(docRef, {
    players: updatedPlayers,
    updatedAt: serverTimestamp(),
  });
}

// Execute bot turn with AI decision
export async function executeBotTurn(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    console.log('Bot turn: Game not found');
    return;
  }

  const game = { ...snapshot.data() as PokerGame, id: snapshot.id };

  // Check if it's a bot's turn
  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isBot) {
    console.log('Bot turn: Not a bot turn', { currentPlayer: currentPlayer?.odlUserName, isBot: currentPlayer?.isBot });
    return;
  }
  if (currentPlayer.status !== 'active') {
    console.log('Bot turn: Player not active', { status: currentPlayer.status });
    return;
  }
  if (game.phase === 'waiting' || game.phase === 'showdown' || game.phase === 'finished') {
    console.log('Bot turn: Invalid phase', { phase: game.phase });
    return;
  }

  console.log('Bot turn: Getting decision for', currentPlayer.odlUserName, 'with cards:', currentPlayer.holeCards);

  // Get bot decision
  const decision = getBotDecision(game, game.currentPlayerIndex);
  console.log('Bot turn: Decision is', decision);

  // Execute the action
  await makeAction(gameId, currentPlayer.odlUser, decision.action, decision.raiseAmount);
  console.log('Bot turn: Action executed successfully');
}

// Check if current player is a bot and execute their turn
export function checkAndExecuteBotTurn(game: PokerGame): void {
  if (!game || game.phase === 'waiting' || game.phase === 'showdown' || game.phase === 'finished') {
    return;
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (currentPlayer && currentPlayer.isBot && currentPlayer.status === 'active') {
    // Execute bot turn after a delay
    setTimeout(() => {
      executeBotTurn(game.id).catch(console.error);
    }, 1000 + Math.random() * 1000);
  }
}

// Start a new hand
export async function startHand(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as PokerGame;

  // Need at least 2 players
  if (game.players.length < 2) {
    throw new Error('Need at least 2 players to start');
  }

  // Create and shuffle deck
  let deck = createDeck();

  // Move dealer button
  const dealerIndex = (game.dealerIndex + 1) % game.players.length;

  // Assign blinds (heads-up rules: dealer is small blind)
  let smallBlindIndex: number;
  let bigBlindIndex: number;

  if (game.players.length === 2) {
    // Heads-up: dealer is small blind
    smallBlindIndex = dealerIndex;
    bigBlindIndex = (dealerIndex + 1) % game.players.length;
  } else {
    // 3+ players: normal rules
    smallBlindIndex = (dealerIndex + 1) % game.players.length;
    bigBlindIndex = (dealerIndex + 2) % game.players.length;
  }

  // Deal hole cards (2 per player)
  const players: PokerPlayer[] = game.players.map((p, i) => {
    const { dealt, remaining } = dealCards(deck, 2);
    deck = remaining;

    return {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      odlUserAvatar: p.odlUserAvatar,
      seatNumber: p.seatNumber,
      chips: p.chips,
      joinedAt: p.joinedAt,
      holeCards: dealt,
      currentBet: 0,
      totalBetThisHand: 0,
      status: 'active' as const,
      isDealer: i === dealerIndex,
      isSmallBlind: i === smallBlindIndex,
      isBigBlind: i === bigBlindIndex,
      hasActedThisRound: false, // No one has acted yet
    };
  });

  // Post blinds
  const sbAmount = Math.min(game.smallBlind, players[smallBlindIndex].chips);
  players[smallBlindIndex].currentBet = sbAmount;
  players[smallBlindIndex].totalBetThisHand = sbAmount;
  players[smallBlindIndex].chips -= sbAmount;
  if (players[smallBlindIndex].chips === 0) {
    players[smallBlindIndex].status = 'all-in';
  }

  const bbAmount = Math.min(game.bigBlind, players[bigBlindIndex].chips);
  players[bigBlindIndex].currentBet = bbAmount;
  players[bigBlindIndex].totalBetThisHand = bbAmount;
  players[bigBlindIndex].chips -= bbAmount;
  if (players[bigBlindIndex].chips === 0) {
    players[bigBlindIndex].status = 'all-in';
  }

  const pot = sbAmount + bbAmount;

  // First to act is after big blind (UTG)
  // In heads-up, small blind (dealer) acts first pre-flop
  let firstToAct: number;
  if (game.players.length === 2) {
    firstToAct = smallBlindIndex; // Dealer/SB acts first in heads-up pre-flop
  } else {
    firstToAct = (bigBlindIndex + 1) % players.length;
  }

  // Skip players who are all-in
  let attempts = 0;
  while (players[firstToAct].status !== 'active' && attempts < players.length) {
    firstToAct = (firstToAct + 1) % players.length;
    attempts++;
  }

  await updateDoc(docRef, {
    phase: 'pre-flop',
    deck,
    communityCards: [],
    players,
    pot,
    sidePots: [],
    currentBet: bbAmount,
    minRaise: game.bigBlind,
    currentPlayerIndex: firstToAct,
    dealerIndex,
    lastRaiserIndex: bigBlindIndex, // BB is the initial "raiser"
    lastAggressorIndex: bigBlindIndex,
    handNumber: game.handNumber + 1,
    winners: null,
    updatedAt: serverTimestamp(),
    lastActionAt: serverTimestamp(),
  });
}

// Make a player action (fold, check, call, raise, all-in)
export async function makeAction(
  gameId: string,
  odlUser: string,
  action: PlayerAction,
  raiseAmount?: number
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as PokerGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  if (game.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const player = game.players[playerIndex];

  if (player.status !== 'active') {
    throw new Error('You cannot act in your current state');
  }

  let updatedPlayers = [...game.players];
  let pot = game.pot;
  let currentBet = game.currentBet;
  let minRaise = game.minRaise;
  let lastAggressorIndex = game.lastAggressorIndex ?? game.lastRaiserIndex;

  // Calculate what player needs to call
  const toCall = currentBet - player.currentBet;

  switch (action) {
    case 'fold':
      updatedPlayers[playerIndex] = {
        ...player,
        status: 'folded',
        lastAction: 'fold',
        hasActedThisRound: true,
      };
      break;

    case 'check':
      // Can only check if you've already matched the current bet
      if (toCall > 0) {
        throw new Error(`Cannot check - you need to call $${toCall} or fold`);
      }
      updatedPlayers[playerIndex] = {
        ...player,
        lastAction: 'check',
        hasActedThisRound: true,
      };
      break;

    case 'call': {
      if (toCall <= 0) {
        throw new Error('Nothing to call - use check instead');
      }

      const actualCall = Math.min(toCall, player.chips);
      const isAllIn = actualCall >= player.chips;

      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: player.currentBet + actualCall,
        totalBetThisHand: player.totalBetThisHand + actualCall,
        chips: player.chips - actualCall,
        status: isAllIn ? 'all-in' : 'active',
        lastAction: isAllIn ? 'all-in' : 'call',
        hasActedThisRound: true,
      };
      pot += actualCall;
      break;
    }

    case 'raise': {
      if (raiseAmount === undefined) {
        throw new Error('Raise amount required');
      }

      // raiseAmount is the TOTAL amount player wants their bet to be
      const totalBetWanted = raiseAmount;
      const additionalChipsNeeded = totalBetWanted - player.currentBet;

      // Minimum raise: must be at least currentBet + minRaise
      const minimumTotal = currentBet + minRaise;

      if (totalBetWanted < minimumTotal && additionalChipsNeeded < player.chips) {
        throw new Error(`Minimum raise is to $${minimumTotal}`);
      }

      const actualBet = Math.min(additionalChipsNeeded, player.chips);
      const newPlayerBet = player.currentBet + actualBet;
      const isAllIn = actualBet >= player.chips;

      // Update min raise for next player (the raise size)
      if (newPlayerBet > currentBet) {
        const raiseSize = newPlayerBet - currentBet;
        minRaise = Math.max(minRaise, raiseSize);
        lastAggressorIndex = playerIndex;
      }

      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: newPlayerBet,
        totalBetThisHand: player.totalBetThisHand + actualBet,
        chips: player.chips - actualBet,
        status: isAllIn ? 'all-in' : 'active',
        lastAction: isAllIn ? 'all-in' : 'raise',
        hasActedThisRound: true,
      };

      pot += actualBet;
      currentBet = newPlayerBet;

      // Reset hasActedThisRound for other active players since there's a new bet to respond to
      updatedPlayers = updatedPlayers.map((p, i) => {
        if (i !== playerIndex && p.status === 'active') {
          return { ...p, hasActedThisRound: false };
        }
        return p;
      });
      break;
    }

    case 'all-in': {
      const allInAmount = player.chips;
      const newPlayerBet = player.currentBet + allInAmount;

      // If going all-in for more than current bet, it's a raise
      if (newPlayerBet > currentBet) {
        const raiseSize = newPlayerBet - currentBet;
        if (raiseSize >= minRaise) {
          minRaise = raiseSize;
        }
        currentBet = newPlayerBet;
        lastAggressorIndex = playerIndex;

        // Reset hasActedThisRound for other active players
        updatedPlayers = updatedPlayers.map((p, i) => {
          if (i !== playerIndex && p.status === 'active') {
            return { ...p, hasActedThisRound: false };
          }
          return p;
        });
      }

      updatedPlayers[playerIndex] = {
        ...player,
        currentBet: newPlayerBet,
        totalBetThisHand: player.totalBetThisHand + allInAmount,
        chips: 0,
        status: 'all-in',
        lastAction: 'all-in',
        hasActedThisRound: true,
      };
      pot += allInAmount;
      break;
    }
  }

  // Check if only one player remains (everyone else folded)
  const nonFoldedPlayers = updatedPlayers.filter(
    (p) => p.status !== 'folded' && p.status !== 'out'
  );

  if (nonFoldedPlayers.length === 1) {
    // Hand over - award pot to the remaining player
    const winner = nonFoldedPlayers[0];
    const winnerIndex = updatedPlayers.findIndex((p) => p.odlUser === winner.odlUser);
    updatedPlayers[winnerIndex] = {
      ...updatedPlayers[winnerIndex],
      chips: updatedPlayers[winnerIndex].chips + pot,
    };

    await updateDoc(docRef, {
      phase: 'finished',
      players: updatedPlayers,
      pot: 0,
      winners: [{
        odlUser: winner.odlUser,
        odlUserName: winner.odlUserName,
        amount: pot,
      }],
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
    return;
  }

  // Check if betting round is complete
  const bettingComplete = isBettingRoundComplete(updatedPlayers, currentBet);

  // Check if we should go to showdown (all remaining players are all-in or only one can act)
  const activePlayers = updatedPlayers.filter((p) => p.status === 'active');
  const allInOrFolded = activePlayers.length <= 1;

  if (bettingComplete) {
    if (allInOrFolded && game.phase !== 'river') {
      // Run out the remaining cards and go to showdown
      let { communityCards, deck } = runOutCards(game.phase, game.communityCards, game.deck);

      // Reset bets for showdown
      updatedPlayers = updatedPlayers.map((p) => {
        const { lastAction: _, hasActedThisRound: __, ...rest } = p;
        return { ...rest, currentBet: 0, hasActedThisRound: false };
      });

      // Determine winners
      const showdownPlayers = updatedPlayers
        .filter((p) => p.status !== 'folded' && p.status !== 'out')
        .map((p) => ({
          odlUser: p.odlUser,
          odlUserName: p.odlUserName,
          holeCards: p.holeCards,
        }));

      const winners = determineWinners(showdownPlayers, communityCards);
      const winAmount = Math.floor(pot / winners.length);

      // Award pot to winners
      for (const winner of winners) {
        const idx = updatedPlayers.findIndex((p) => p.odlUser === winner.odlUser);
        if (idx !== -1) {
          updatedPlayers[idx] = {
            ...updatedPlayers[idx],
            chips: updatedPlayers[idx].chips + winAmount,
          };
        }
      }

      await updateDoc(docRef, {
        phase: 'showdown',
        players: updatedPlayers,
        communityCards,
        deck,
        pot: 0,
        currentBet: 0,
        winners: winners.map((w) => ({
          odlUser: w.odlUser,
          odlUserName: w.odlUserName,
          amount: winAmount,
          hand: w.hand,
        })),
        updatedAt: serverTimestamp(),
        lastActionAt: serverTimestamp(),
      });
      return;
    }

    // Move to next phase
    const { phase, communityCards, deck } = advancePhase(
      game.phase,
      game.communityCards,
      game.deck
    );

    // Reset for new betting round
    updatedPlayers = updatedPlayers.map((p) => {
      const { lastAction: _, hasActedThisRound: __, ...rest } = p;
      return { ...rest, currentBet: 0, hasActedThisRound: false };
    });

    if (phase === 'showdown') {
      // Showdown - determine winner
      const showdownPlayers = updatedPlayers
        .filter((p) => p.status !== 'folded' && p.status !== 'out')
        .map((p) => ({
          odlUser: p.odlUser,
          odlUserName: p.odlUserName,
          holeCards: p.holeCards,
        }));

      const winners = determineWinners(showdownPlayers, communityCards);
      const winAmount = Math.floor(pot / winners.length);

      // Award pot to winners
      for (const winner of winners) {
        const idx = updatedPlayers.findIndex((p) => p.odlUser === winner.odlUser);
        if (idx !== -1) {
          updatedPlayers[idx] = {
            ...updatedPlayers[idx],
            chips: updatedPlayers[idx].chips + winAmount,
          };
        }
      }

      await updateDoc(docRef, {
        phase: 'showdown',
        players: updatedPlayers,
        communityCards,
        deck,
        pot: 0,
        currentBet: 0,
        winners: winners.map((w) => ({
          odlUser: w.odlUser,
          odlUserName: w.odlUserName,
          amount: winAmount,
          hand: w.hand,
        })),
        updatedAt: serverTimestamp(),
        lastActionAt: serverTimestamp(),
      });
      return;
    }

    // Find first active player after dealer for new betting round
    let nextPlayerIndex = findFirstToActPostFlop(updatedPlayers, game.dealerIndex);

    await updateDoc(docRef, {
      phase,
      communityCards,
      deck,
      players: updatedPlayers,
      pot,
      currentBet: 0,
      minRaise: game.bigBlind,
      currentPlayerIndex: nextPlayerIndex,
      lastRaiserIndex: -1,
      lastAggressorIndex: -1,
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
  } else {
    // Continue betting round - find next player
    const nextPlayerIndex = findNextActivePlayer(updatedPlayers, playerIndex);

    await updateDoc(docRef, {
      players: updatedPlayers,
      pot,
      currentBet,
      minRaise,
      currentPlayerIndex: nextPlayerIndex,
      lastRaiserIndex: lastAggressorIndex,
      lastAggressorIndex,
      updatedAt: serverTimestamp(),
      lastActionAt: serverTimestamp(),
    });
  }
}

// Helper: Find next active player who can act
function findNextActivePlayer(players: PokerPlayer[], fromIndex: number): number {
  let nextIndex = (fromIndex + 1) % players.length;
  let attempts = 0;

  while (attempts < players.length) {
    if (players[nextIndex].status === 'active') {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  return fromIndex;
}

// Helper: Find first to act post-flop (first active player after dealer)
function findFirstToActPostFlop(players: PokerPlayer[], dealerIndex: number): number {
  let index = (dealerIndex + 1) % players.length;
  let attempts = 0;

  while (attempts < players.length) {
    if (players[index].status === 'active') {
      return index;
    }
    index = (index + 1) % players.length;
    attempts++;
  }

  return dealerIndex;
}

// Helper: Check if betting round is complete
function isBettingRoundComplete(
  players: PokerPlayer[],
  currentBet: number
): boolean {
  const activePlayers = players.filter((p) => p.status === 'active');

  // All active players must have acted this round
  for (const player of activePlayers) {
    if (!player.hasActedThisRound) {
      return false;
    }
    // And matched the current bet
    if (player.currentBet < currentBet) {
      return false;
    }
  }

  return true;
}

// Helper: Advance to next phase
function advancePhase(
  currentPhase: GamePhase,
  communityCards: Card[],
  deck: Card[]
): { phase: GamePhase; communityCards: Card[]; deck: Card[] } {
  switch (currentPhase) {
    case 'pre-flop': {
      // Deal flop (3 cards)
      const { dealt, remaining } = dealCards(deck, 3);
      return {
        phase: 'flop',
        communityCards: dealt,
        deck: remaining,
      };
    }
    case 'flop': {
      // Deal turn (1 card)
      const { dealt, remaining } = dealCards(deck, 1);
      return {
        phase: 'turn',
        communityCards: [...communityCards, ...dealt],
        deck: remaining,
      };
    }
    case 'turn': {
      // Deal river (1 card)
      const { dealt, remaining } = dealCards(deck, 1);
      return {
        phase: 'river',
        communityCards: [...communityCards, ...dealt],
        deck: remaining,
      };
    }
    case 'river':
      // Go to showdown
      return {
        phase: 'showdown',
        communityCards,
        deck,
      };
    default:
      return {
        phase: currentPhase,
        communityCards,
        deck,
      };
  }
}

// Helper: Run out remaining community cards when players are all-in
function runOutCards(
  currentPhase: GamePhase,
  communityCards: Card[],
  deck: Card[]
): { communityCards: Card[]; deck: Card[] } {
  let cards = [...communityCards];
  let remainingDeck = [...deck];

  // Deal remaining cards based on current phase
  if (currentPhase === 'pre-flop') {
    // Deal flop, turn, river
    const flop = dealCards(remainingDeck, 3);
    cards = flop.dealt;
    remainingDeck = flop.remaining;

    const turn = dealCards(remainingDeck, 1);
    cards = [...cards, ...turn.dealt];
    remainingDeck = turn.remaining;

    const river = dealCards(remainingDeck, 1);
    cards = [...cards, ...river.dealt];
    remainingDeck = river.remaining;
  } else if (currentPhase === 'flop') {
    // Deal turn and river
    const turn = dealCards(remainingDeck, 1);
    cards = [...cards, ...turn.dealt];
    remainingDeck = turn.remaining;

    const river = dealCards(remainingDeck, 1);
    cards = [...cards, ...river.dealt];
    remainingDeck = river.remaining;
  } else if (currentPhase === 'turn') {
    // Deal river
    const river = dealCards(remainingDeck, 1);
    cards = [...cards, ...river.dealt];
    remainingDeck = river.remaining;
  }

  return { communityCards: cards, deck: remainingDeck };
}

// Delete a poker game
export async function deletePokerGame(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  await deleteDoc(docRef);
}

// Clean up all stale poker games (more aggressive - deletes old games)
// force=true will delete ALL games regardless of age
export async function cleanupStalePokerGames(force = false): Promise<number> {
  const q = query(collection(db, COLLECTION));
  const now = Date.now();
  const STALE_THRESHOLD = 10 * 60 * 1000; // 10 minutes for manual cleanup

  // Get all games
  const allGames = await new Promise<{ id: string; shouldDelete: boolean }[]>((resolve) => {
    const unsub = onSnapshot(q, (snap) => {
      unsub();
      const games = snap.docs.map((d) => {
        // Force delete all games if requested
        if (force) {
          return { id: d.id, shouldDelete: true };
        }

        const data = d.data() as PokerGame;
        // Use helper for backwards compatibility
        const humanPlayers = data.players?.filter((p) => !isBotPlayer(p)) || [];
        // Check if host is still in the game
        const hostInGame = data.players?.some((p) => p.odlUser === data.createdBy) ?? false;
        // Check last activity
        const lastActivity = data.lastActionAt?.toMillis?.() || data.updatedAt?.toMillis?.() || data.createdAt?.toMillis?.() || 0;
        const isStale = lastActivity > 0 && (now - lastActivity) > STALE_THRESHOLD;

        // Delete if: no humans, no host, or stale (10+ min inactive)
        const shouldDelete = humanPlayers.length === 0 || !hostInGame || isStale;
        return { id: d.id, shouldDelete };
      });
      resolve(games);
    });
  });

  // Delete stale games
  let deletedCount = 0;
  for (const game of allGames) {
    if (game.shouldDelete) {
      await deleteDoc(doc(db, COLLECTION, game.id));
      deletedCount++;
    }
  }

  return deletedCount;
}
