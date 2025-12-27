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
  MahjongGame,
  MahjongPlayer,
  MahjongGameSummary,
  Meld,
} from '../types/mahjong';
import {
  createTileSet,
  shuffleTiles,
  dealTiles,
  sortTiles,
  canCallPong,
  canCallKong,
  canDeclareMahjong,
  tilesMatch,
} from '../utils/mahjongLogic';
import {
  generateBotPlayer,
  getBotDecision,
  isBotPlayer,
} from '../utils/mahjongAI';
import {
  getTokenBalance,
  deductTokens,
  creditTokens,
  incrementGamesPlayed,
} from './tokens';

const COLLECTION = 'mahjongGames';
const STARTING_SCORE = 25000;

// Subscribe to all active mahjong games (for lobby)
export function subscribeToMahjongGames(
  callback: (games: MahjongGameSummary[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const games: MahjongGameSummary[] = [];

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as MahjongGame;
      if (data.phase === 'finished') return;

      games.push({
        id: docSnap.id,
        name: data.name,
        playerCount: data.players?.length || 0,
        maxPlayers: 4,
        phase: data.phase,
        createdBy: data.createdBy,
      });
    });

    callback(games);
  });
}

// Subscribe to a specific mahjong game
export function subscribeToMahjongGame(
  gameId: string,
  odlUser: string,
  callback: (game: MahjongGame | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, gameId);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data() as MahjongGame;
    data.id = snapshot.id;

    // Hide other players' hands and the wall
    const sanitizedGame: MahjongGame = {
      ...data,
      wall: [], // Don't send wall to client
      players: data.players.map((p) => ({
        ...p,
        // Only show own hand
        hand: p.odlUser === odlUser ? sortTiles(p.hand) : [],
      })),
    };

    callback(sanitizedGame);
  });
}

// Minimum tokens required to play (covers potential loss)
const MIN_TOKENS_TO_PLAY = 8000;

// Create a new mahjong game
export async function createMahjongGame(
  creatorId: string,
  creatorName: string,
  creatorAvatar?: string,
  gameName?: string
): Promise<string> {
  // Get creator's current token balance
  const creatorBalance = await getTokenBalance(creatorId);

  // Check if they have enough to cover potential losses
  if (creatorBalance < MIN_TOKENS_TO_PLAY) {
    throw new Error(`You need at least ${MIN_TOKENS_TO_PLAY} tokens to play. Use daily reset to get more tokens.`);
  }

  const playerData: MahjongPlayer = {
    odlUser: creatorId,
    odlUserName: creatorName,
    ...(creatorAvatar && { odlUserAvatar: creatorAvatar }),
    seatNumber: 0,
    hand: [],
    melds: [],
    discards: [],
    score: creatorBalance, // Use actual token balance as score
    status: 'waiting',
    isDealer: true,
    joinedAt: Timestamp.now(),
  };

  const game: Omit<MahjongGame, 'id'> = {
    name: gameName || `${creatorName}'s Table`,
    maxPlayers: 4,
    phase: 'waiting',
    wall: [],
    currentPlayerIndex: 0,
    players: [playerData],
    dealerIndex: 0,
    roundNumber: 1,
    roundWind: 'east',
    turnCount: 0,
    createdBy: creatorId,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const docRef = await addDoc(collection(db, COLLECTION), game);
  return docRef.id;
}

// Join an existing mahjong game
export async function joinMahjongGame(
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

  const game = snapshot.data() as MahjongGame;

  if (game.players.some((p) => p.odlUser === odlUser)) {
    return;
  }

  if (game.players.length >= 4) {
    throw new Error('Game is full');
  }

  // Get user's token balance
  const userBalance = await getTokenBalance(odlUser);

  // Check if they have enough to cover potential losses
  if (userBalance < MIN_TOKENS_TO_PLAY) {
    throw new Error(`You need at least ${MIN_TOKENS_TO_PLAY} tokens to join. Use daily reset to get more tokens.`);
  }

  const takenSeats = game.players.map((p) => p.seatNumber);
  let seatNumber = 0;
  for (let i = 0; i < 4; i++) {
    if (!takenSeats.includes(i)) {
      seatNumber = i;
      break;
    }
  }

  const newPlayerData: Record<string, unknown> = {
    odlUser,
    odlUserName,
    seatNumber,
    hand: [],
    melds: [],
    discards: [],
    score: userBalance, // Use actual token balance as score
    status: 'waiting',
    isDealer: false,
    joinedAt: Timestamp.now(),
  };

  if (odlUserAvatar) {
    newPlayerData.odlUserAvatar = odlUserAvatar;
  }

  await updateDoc(docRef, {
    players: [...game.players, newPlayerData],
    updatedAt: serverTimestamp(),
  });
}

// Leave a mahjong game
export async function leaveMahjongGame(
  gameId: string,
  odlUser: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as MahjongGame;
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

// Start a new round
export async function startRound(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;

  if (game.players.length !== 4) {
    throw new Error('Need exactly 4 players to start');
  }

  // Refresh token balances for all human players
  const playerBalances = await Promise.all(
    game.players.map(async (p) => {
      if (isBotPlayer(p)) {
        return { odlUser: p.odlUser, balance: p.score }; // Bots keep their score
      }
      const balance = await getTokenBalance(p.odlUser);
      return { odlUser: p.odlUser, balance };
    })
  );
  const balanceMap = new Map(playerBalances.map((pb) => [pb.odlUser, pb.balance]));

  // Create and shuffle tiles
  let wall = shuffleTiles(createTileSet());

  // Deal 13 tiles to each player (dealer gets 14)
  const players = game.players.map((p, index) => {
    const tileCount = index === game.dealerIndex ? 14 : 13;
    const { dealt, remaining } = dealTiles(wall, tileCount);
    wall = remaining;
    const freshBalance = balanceMap.get(p.odlUser) ?? p.score;

    const playerData: Record<string, unknown> = {
      odlUser: p.odlUser,
      odlUserName: p.odlUserName,
      seatNumber: p.seatNumber,
      hand: dealt,
      melds: [],
      discards: [],
      score: freshBalance, // Use fresh token balance
      status: 'playing',
      isDealer: index === game.dealerIndex,
      joinedAt: p.joinedAt,
      ...(p.isBot && { isBot: true }),
    };

    if (p.odlUserAvatar) {
      playerData.odlUserAvatar = p.odlUserAvatar;
    }

    return playerData;
  });

  await updateDoc(docRef, {
    phase: 'playing',
    wall,
    players,
    currentPlayerIndex: game.dealerIndex,
    turnCount: 0,
    updatedAt: serverTimestamp(),
  });
}

// Draw a tile from the wall
export async function drawTile(gameId: string, odlUser: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  if (game.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  if (game.wall.length === 0) {
    // No more tiles - draw game
    await updateDoc(docRef, {
      phase: 'finished',
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const { dealt, remaining } = dealTiles(game.wall, 1);
  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    hand: [...updatedPlayers[playerIndex].hand, dealt[0]],
  };

  await updateDoc(docRef, {
    wall: remaining,
    players: updatedPlayers,
    updatedAt: serverTimestamp(),
  });
}

// Discard a tile
export async function discardTile(
  gameId: string,
  odlUser: string,
  tileId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  if (game.currentPlayerIndex !== playerIndex) {
    throw new Error('Not your turn');
  }

  const player = game.players[playerIndex];
  const tileIndex = player.hand.findIndex((t) => t.id === tileId);

  if (tileIndex === -1) {
    throw new Error('Tile not in hand');
  }

  const discardedTile = player.hand[tileIndex];
  const newHand = player.hand.filter((t) => t.id !== tileId);

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    discards: [...player.discards, discardedTile],
  };

  // Move to next player
  const nextPlayerIndex = (playerIndex + 1) % 4;

  await updateDoc(docRef, {
    players: updatedPlayers,
    lastDiscard: discardedTile,
    lastDiscardBy: playerIndex,
    currentPlayerIndex: nextPlayerIndex,
    turnCount: game.turnCount + 1,
    updatedAt: serverTimestamp(),
  });
}

// Call Pong (claim discarded tile to make 3 of a kind)
export async function callPong(gameId: string, odlUser: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || !game.lastDiscard) {
    throw new Error('Cannot call pong');
  }

  const player = game.players[playerIndex];

  if (!canCallPong(player.hand, game.lastDiscard)) {
    throw new Error('Cannot call pong - not enough matching tiles');
  }

  // Find two matching tiles in hand
  const matchingTiles = player.hand.filter((t) => tilesMatch(t, game.lastDiscard!));
  const pongTiles = [matchingTiles[0], matchingTiles[1], game.lastDiscard];

  // Remove tiles from hand
  const newHand = player.hand.filter(
    (t) => t.id !== matchingTiles[0].id && t.id !== matchingTiles[1].id
  );

  const newMeld: Meld = {
    type: 'pong',
    tiles: pongTiles,
    isConcealed: false,
  };

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    melds: [...player.melds, newMeld],
  };

  // Remove from discards of the player who discarded
  if (game.lastDiscardBy !== undefined) {
    const discardPlayer = updatedPlayers[game.lastDiscardBy];
    updatedPlayers[game.lastDiscardBy] = {
      ...discardPlayer,
      discards: discardPlayer.discards.slice(0, -1),
    };
  }

  await updateDoc(docRef, {
    players: updatedPlayers,
    currentPlayerIndex: playerIndex,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Call Kong (claim discarded tile to make 4 of a kind)
export async function callKong(gameId: string, odlUser: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || !game.lastDiscard) {
    throw new Error('Cannot call kong');
  }

  const player = game.players[playerIndex];

  if (!canCallKong(player.hand, game.lastDiscard)) {
    throw new Error('Cannot call kong - not enough matching tiles');
  }

  // Find three matching tiles in hand
  const matchingTiles = player.hand.filter((t) => tilesMatch(t, game.lastDiscard!));
  const kongTiles = [matchingTiles[0], matchingTiles[1], matchingTiles[2], game.lastDiscard];

  // Remove tiles from hand
  const newHand = player.hand.filter(
    (t) => !matchingTiles.slice(0, 3).some((m) => m.id === t.id)
  );

  const newMeld: Meld = {
    type: 'kong',
    tiles: kongTiles,
    isConcealed: false,
  };

  // Draw a replacement tile
  const { dealt, remaining } = dealTiles(game.wall, 1);
  const finalHand = [...newHand, ...dealt];

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: finalHand,
    melds: [...player.melds, newMeld],
  };

  // Remove from discards
  if (game.lastDiscardBy !== undefined) {
    const discardPlayer = updatedPlayers[game.lastDiscardBy];
    updatedPlayers[game.lastDiscardBy] = {
      ...discardPlayer,
      discards: discardPlayer.discards.slice(0, -1),
    };
  }

  await updateDoc(docRef, {
    wall: remaining,
    players: updatedPlayers,
    currentPlayerIndex: playerIndex,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Declare Mahjong (win)
export async function declareMahjong(gameId: string, odlUser: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }

  const player = game.players[playerIndex];

  // Check if claiming from discard or self-draw
  const isFromDiscard = game.lastDiscard && game.currentPlayerIndex !== playerIndex;
  const checkHand = isFromDiscard && game.lastDiscard ? [...player.hand, game.lastDiscard] : player.hand;

  if (!canDeclareMahjong(checkHand, player.melds)) {
    throw new Error('Not a winning hand');
  }

  // Calculate score (simplified - just transfer points)
  const winAmount = 8000; // Base win amount
  const totalWinnings = winAmount * 3; // Winner gets from all 3 losers

  // Update global tokens for all human players
  for (const p of game.players) {
    if (isBotPlayer(p)) continue;

    if (p.odlUser === odlUser) {
      // Winner - credit winnings
      await creditTokens(
        p.odlUser,
        p.odlUserName,
        totalWinnings,
        'mahjong',
        gameId,
        `Mahjong win - Round ${game.roundNumber}`
      );
    } else {
      // Loser - deduct loss
      await deductTokens(
        p.odlUser,
        p.odlUserName,
        winAmount,
        'mahjong',
        gameId,
        `Mahjong loss - Round ${game.roundNumber}`
      );
    }
    // Record games played
    await incrementGamesPlayed(p.odlUser);
  }

  const updatedPlayers = game.players.map((p, i) => {
    if (i === playerIndex) {
      return {
        ...p,
        hand: checkHand,
        score: p.score + totalWinnings,
        status: 'won' as const,
      };
    }
    return {
      ...p,
      score: p.score - winAmount,
      status: 'lost' as const,
    };
  });

  await updateDoc(docRef, {
    phase: 'finished',
    players: updatedPlayers,
    winner: odlUser,
    winningHand: checkHand,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Delete a mahjong game
export async function deleteMahjongGame(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  await deleteDoc(docRef);
}

// Clean up stale mahjong games
export async function cleanupStaleMahjongGames(force = false): Promise<number> {
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

        const data = d.data() as MahjongGame;
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

// Add a bot to the game
export async function addBotToGame(gameId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    throw new Error('Game not found');
  }

  const game = snapshot.data() as MahjongGame;

  if (game.players.length >= 4) {
    throw new Error('Game is full');
  }

  // Find available seat
  const takenSeats = game.players.map((p) => p.seatNumber);
  let seatNumber = 0;
  for (let i = 0; i < 4; i++) {
    if (!takenSeats.includes(i)) {
      seatNumber = i;
      break;
    }
  }

  const bot = generateBotPlayer();
  const botPlayer: Record<string, unknown> = {
    odlUser: bot.odlUser,
    odlUserName: bot.odlUserName,
    seatNumber,
    hand: [],
    melds: [],
    discards: [],
    score: STARTING_SCORE,
    status: 'waiting',
    isDealer: false,
    isBot: true,
    joinedAt: Timestamp.now(),
  };

  await updateDoc(docRef, {
    players: [...game.players, botPlayer],
    updatedAt: serverTimestamp(),
  });
}

// Remove a bot from the game
export async function removeBotFromGame(gameId: string, botId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return;

  const game = snapshot.data() as MahjongGame;
  const updatedPlayers = game.players.filter((p) => p.odlUser !== botId);

  await updateDoc(docRef, {
    players: updatedPlayers,
    updatedAt: serverTimestamp(),
  });
}

// Execute a bot's turn
export async function executeBotTurn(gameId: string): Promise<boolean> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return false;
  }

  const game = snapshot.data() as MahjongGame;
  game.id = gameId;

  if (game.phase !== 'playing') {
    return false;
  }

  const currentPlayer = game.players[game.currentPlayerIndex];

  // Check if it's a bot's turn
  if (!currentPlayer || !isBotPlayer(currentPlayer)) {
    // Also check if any bot can claim the last discard
    if (game.lastDiscard) {
      for (let i = 0; i < game.players.length; i++) {
        const player = game.players[i];
        if (isBotPlayer(player) && i !== game.currentPlayerIndex) {
          const decision = getBotDecision(game, i);

          if (decision.action === 'mahjong') {
            await declareMahjongForBot(gameId, player.odlUser, game);
            return true;
          }
          if (decision.action === 'kong') {
            await callKongForBot(gameId, player.odlUser, game);
            return true;
          }
          if (decision.action === 'pong') {
            await callPongForBot(gameId, player.odlUser, game);
            return true;
          }
        }
      }
    }
    return false;
  }

  // Get bot's decision
  const decision = getBotDecision(game, game.currentPlayerIndex);

  switch (decision.action) {
    case 'mahjong':
      await declareMahjongForBot(gameId, currentPlayer.odlUser, game);
      return true;

    case 'draw':
      await drawTileForBot(gameId, currentPlayer.odlUser, game);
      return true;

    case 'discard':
      if (decision.tileId) {
        await discardTileForBot(gameId, currentPlayer.odlUser, decision.tileId, game);
      }
      return true;

    default:
      return false;
  }
}

// Helper: Draw tile for bot (uses actual game data, not refetch)
async function drawTileForBot(gameId: string, odlUser: string, game: MahjongGame): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || game.currentPlayerIndex !== playerIndex) {
    return;
  }

  if (game.wall.length === 0) {
    await updateDoc(docRef, {
      phase: 'finished',
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const { dealt, remaining } = dealTiles(game.wall, 1);
  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...updatedPlayers[playerIndex],
    hand: [...updatedPlayers[playerIndex].hand, dealt[0]],
  };

  await updateDoc(docRef, {
    wall: remaining,
    players: updatedPlayers,
    updatedAt: serverTimestamp(),
  });
}

// Helper: Discard tile for bot
async function discardTileForBot(
  gameId: string,
  odlUser: string,
  tileId: string,
  game: MahjongGame
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || game.currentPlayerIndex !== playerIndex) {
    return;
  }

  const player = game.players[playerIndex];
  const tileIndex = player.hand.findIndex((t) => t.id === tileId);

  if (tileIndex === -1) {
    return;
  }

  const discardedTile = player.hand[tileIndex];
  const newHand = player.hand.filter((t) => t.id !== tileId);

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    discards: [...player.discards, discardedTile],
  };

  const nextPlayerIndex = (playerIndex + 1) % 4;

  await updateDoc(docRef, {
    players: updatedPlayers,
    lastDiscard: discardedTile,
    lastDiscardBy: playerIndex,
    currentPlayerIndex: nextPlayerIndex,
    turnCount: game.turnCount + 1,
    updatedAt: serverTimestamp(),
  });
}

// Helper: Call pong for bot
async function callPongForBot(gameId: string, odlUser: string, game: MahjongGame): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || !game.lastDiscard) {
    return;
  }

  const player = game.players[playerIndex];

  if (!canCallPong(player.hand, game.lastDiscard)) {
    return;
  }

  const matchingTiles = player.hand.filter((t) => tilesMatch(t, game.lastDiscard!));
  const pongTiles = [matchingTiles[0], matchingTiles[1], game.lastDiscard];

  const newHand = player.hand.filter(
    (t) => t.id !== matchingTiles[0].id && t.id !== matchingTiles[1].id
  );

  const newMeld: Meld = {
    type: 'pong',
    tiles: pongTiles,
    isConcealed: false,
  };

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: newHand,
    melds: [...player.melds, newMeld],
  };

  if (game.lastDiscardBy !== undefined) {
    const discardPlayer = updatedPlayers[game.lastDiscardBy];
    updatedPlayers[game.lastDiscardBy] = {
      ...discardPlayer,
      discards: discardPlayer.discards.slice(0, -1),
    };
  }

  await updateDoc(docRef, {
    players: updatedPlayers,
    currentPlayerIndex: playerIndex,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Helper: Call kong for bot
async function callKongForBot(gameId: string, odlUser: string, game: MahjongGame): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1 || !game.lastDiscard) {
    return;
  }

  const player = game.players[playerIndex];

  if (!canCallKong(player.hand, game.lastDiscard)) {
    return;
  }

  const matchingTiles = player.hand.filter((t) => tilesMatch(t, game.lastDiscard!));
  const kongTiles = [matchingTiles[0], matchingTiles[1], matchingTiles[2], game.lastDiscard];

  const newHand = player.hand.filter(
    (t) => !matchingTiles.slice(0, 3).some((m) => m.id === t.id)
  );

  const newMeld: Meld = {
    type: 'kong',
    tiles: kongTiles,
    isConcealed: false,
  };

  const { dealt, remaining } = dealTiles(game.wall, 1);
  const finalHand = [...newHand, ...dealt];

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = {
    ...player,
    hand: finalHand,
    melds: [...player.melds, newMeld],
  };

  if (game.lastDiscardBy !== undefined) {
    const discardPlayer = updatedPlayers[game.lastDiscardBy];
    updatedPlayers[game.lastDiscardBy] = {
      ...discardPlayer,
      discards: discardPlayer.discards.slice(0, -1),
    };
  }

  await updateDoc(docRef, {
    wall: remaining,
    players: updatedPlayers,
    currentPlayerIndex: playerIndex,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Helper: Declare mahjong for bot
async function declareMahjongForBot(
  gameId: string,
  odlUser: string,
  game: MahjongGame
): Promise<void> {
  const docRef = doc(db, COLLECTION, gameId);
  const playerIndex = game.players.findIndex((p) => p.odlUser === odlUser);

  if (playerIndex === -1) {
    return;
  }

  const player = game.players[playerIndex];
  const isFromDiscard = game.lastDiscard && game.currentPlayerIndex !== playerIndex;
  const checkHand = isFromDiscard && game.lastDiscard ? [...player.hand, game.lastDiscard] : player.hand;

  if (!canDeclareMahjong(checkHand, player.melds)) {
    return;
  }

  const winAmount = 8000;
  const totalWinnings = winAmount * 3;

  // Update global tokens for human players (bot won, humans lost)
  for (const p of game.players) {
    if (isBotPlayer(p)) continue;

    // All human players lose (since bot won)
    await deductTokens(
      p.odlUser,
      p.odlUserName,
      winAmount,
      'mahjong',
      gameId,
      `Mahjong loss - Round ${game.roundNumber}`
    );
    await incrementGamesPlayed(p.odlUser);
  }

  const updatedPlayers = game.players.map((p, i) => {
    if (i === playerIndex) {
      return {
        ...p,
        hand: checkHand,
        score: p.score + totalWinnings,
        status: 'won' as const,
      };
    }
    return {
      ...p,
      score: p.score - winAmount,
      status: 'lost' as const,
    };
  });

  await updateDoc(docRef, {
    phase: 'finished',
    players: updatedPlayers,
    winner: odlUser,
    winningHand: checkHand,
    lastDiscard: null,
    lastDiscardBy: null,
    updatedAt: serverTimestamp(),
  });
}

// Get full game data (for bot turns - includes wall)
export async function getFullGameData(gameId: string): Promise<MahjongGame | null> {
  const docRef = doc(db, COLLECTION, gameId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data() as MahjongGame;
  data.id = snapshot.id;
  return data;
}
