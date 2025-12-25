import type { MahjongTile, MahjongPlayer, MahjongGame, Meld } from '../types/mahjong';
import {
  canCallPong,
  canCallKong,
  canDeclareMahjong,
  groupTiles,
  sortTiles,
} from './mahjongLogic';

// Bot names for variety
const BOT_NAMES = [
  'Dragon Bot', 'Wind Master', 'Tile Sage', 'Lucky Bot',
  'Phoenix AI', 'Jade Player', 'Bamboo Bot', 'Circle Master',
];

// Generate a bot player
export function generateBotPlayer(): { odlUser: string; odlUserName: string } {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    odlUser: `bot_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    odlUserName: name,
  };
}

// Evaluate how useful a tile is to the hand
function evaluateTileValue(tile: MahjongTile, hand: MahjongTile[]): number {
  let value = 0;
  const groups = groupTiles(hand);
  const key = `${tile.suit}-${tile.value}`;
  const sameCount = groups.get(key)?.length || 0;

  // Pairs and triplets are valuable
  if (sameCount >= 2) value += 30;
  if (sameCount >= 3) value += 50;

  // For suited tiles, check for sequence potential
  if (tile.suit !== 'wind' && tile.suit !== 'dragon') {
    const tileValue = tile.value as number;

    // Check for adjacent tiles (sequence potential)
    for (const [, tiles] of groups) {
      if (tiles[0].suit === tile.suit) {
        const otherValue = tiles[0].value as number;
        const diff = Math.abs(otherValue - tileValue);
        if (diff === 1) value += 15; // Adjacent
        if (diff === 2) value += 8;  // One gap
      }
    }

    // Middle tiles (3-7) are more flexible for sequences
    if (tileValue >= 3 && tileValue <= 7) value += 5;
  }

  // Honor tiles (winds/dragons) are valuable if paired
  if (tile.suit === 'wind' || tile.suit === 'dragon') {
    if (sameCount >= 2) value += 20;
  }

  return value;
}

// Choose which tile to discard
export function chooseTileToDiscard(hand: MahjongTile[]): MahjongTile {
  if (hand.length === 0) {
    throw new Error('No tiles to discard');
  }

  const sorted = sortTiles(hand);

  // Evaluate each tile and find the least valuable
  let worstTile = sorted[0];
  let worstValue = Infinity;

  for (const tile of sorted) {
    // Create hand without this tile to evaluate
    const handWithout = hand.filter(t => t.id !== tile.id);
    const value = evaluateTileValue(tile, handWithout);

    if (value < worstValue) {
      worstValue = value;
      worstTile = tile;
    }
  }

  return worstTile;
}

// Decide if bot should call Pong
export function shouldCallPong(
  hand: MahjongTile[],
  melds: Meld[],
  discardedTile: MahjongTile
): boolean {
  if (!canCallPong(hand, discardedTile)) return false;

  // Count how many melds we have
  const meldCount = melds.length;

  // If we have 3 melds already, definitely call pong to get closer to winning
  if (meldCount >= 3) return true;

  // For honor tiles (winds/dragons), always call pong - they're harder to complete
  if (discardedTile.suit === 'wind' || discardedTile.suit === 'dragon') {
    return true;
  }

  // For suited tiles, be more selective
  // Call pong if we have 2+ melds or if it's a terminal (1 or 9)
  const value = discardedTile.value as number;
  if (meldCount >= 2) return true;
  if (value === 1 || value === 9) return true;

  // Random chance to call (50%) for middle tiles
  return Math.random() > 0.5;
}

// Decide if bot should call Kong
export function shouldCallKong(
  hand: MahjongTile[],
  melds: Meld[],
  discardedTile: MahjongTile
): boolean {
  if (!canCallKong(hand, discardedTile)) return false;

  // Kong is usually good - gives bonus tile and points
  // But it also exposes the meld, so be slightly cautious
  const meldCount = melds.length;

  // If we have 2+ melds, definitely kong
  if (meldCount >= 2) return true;

  // For honor tiles, always kong
  if (discardedTile.suit === 'wind' || discardedTile.suit === 'dragon') {
    return true;
  }

  // 70% chance to call kong on suited tiles
  return Math.random() > 0.3;
}

// Main bot decision function
export interface BotDecision {
  action: 'draw' | 'discard' | 'pong' | 'kong' | 'mahjong' | 'pass';
  tileId?: string;
}

export function getBotDecision(
  game: MahjongGame,
  botIndex: number
): BotDecision {
  const bot = game.players[botIndex];
  if (!bot) return { action: 'pass' };

  const isMyTurn = game.currentPlayerIndex === botIndex;
  const hand = bot.hand;
  const melds = bot.melds;

  // Check if we can declare Mahjong first (highest priority)
  if (canDeclareMahjong(hand, melds, isMyTurn ? undefined : game.lastDiscard)) {
    return { action: 'mahjong' };
  }

  // If it's not our turn but there's a discard we can claim
  if (!isMyTurn && game.lastDiscard) {
    // Check for kong first (higher priority than pong)
    if (shouldCallKong(hand, melds, game.lastDiscard)) {
      return { action: 'kong' };
    }

    // Check for pong
    if (shouldCallPong(hand, melds, game.lastDiscard)) {
      return { action: 'pong' };
    }

    return { action: 'pass' };
  }

  // It's our turn
  if (isMyTurn) {
    // Calculate expected hand size
    const meldTiles = melds.reduce((sum, m) => sum + m.tiles.length, 0);
    const kongCount = melds.filter(m => m.type === 'kong').length;
    const expectedTiles = 14 - meldTiles + kongCount;

    // Need to draw
    if (hand.length < expectedTiles) {
      return { action: 'draw' };
    }

    // Need to discard
    if (hand.length >= expectedTiles) {
      const tileToDiscard = chooseTileToDiscard(hand);
      return { action: 'discard', tileId: tileToDiscard.id };
    }
  }

  return { action: 'pass' };
}

// Check if a player is a bot
export function isBotPlayer(player: MahjongPlayer): boolean {
  if (player.isBot === true) return true;
  if (player.odlUser && player.odlUser.startsWith('bot_')) return true;
  return false;
}
