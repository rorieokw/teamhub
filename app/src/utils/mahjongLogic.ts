import type { MahjongTile, TileSuit, TileValue, WindValue, DragonValue, Meld } from '../types/mahjong';

// Create a complete set of Mahjong tiles (136 tiles)
export function createTileSet(): MahjongTile[] {
  const tiles: MahjongTile[] = [];
  let idCounter = 0;

  // Suited tiles: Bamboo, Circle, Character (1-9, 4 of each)
  const suits: TileSuit[] = ['bamboo', 'circle', 'character'];
  for (const suit of suits) {
    for (let value = 1; value <= 9; value++) {
      for (let copy = 0; copy < 4; copy++) {
        tiles.push({
          id: `${idCounter++}`,
          suit,
          value: value as TileValue,
        });
      }
    }
  }

  // Wind tiles (4 of each)
  const winds: WindValue[] = ['east', 'south', 'west', 'north'];
  for (const wind of winds) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `${idCounter++}`,
        suit: 'wind',
        value: wind,
      });
    }
  }

  // Dragon tiles (4 of each)
  const dragons: DragonValue[] = ['red', 'green', 'white'];
  for (const dragon of dragons) {
    for (let copy = 0; copy < 4; copy++) {
      tiles.push({
        id: `${idCounter++}`,
        suit: 'dragon',
        value: dragon,
      });
    }
  }

  return tiles;
}

// Shuffle tiles
export function shuffleTiles(tiles: MahjongTile[]): MahjongTile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal tiles from wall
export function dealTiles(wall: MahjongTile[], count: number): { dealt: MahjongTile[]; remaining: MahjongTile[] } {
  return {
    dealt: wall.slice(0, count),
    remaining: wall.slice(count),
  };
}

// Check if two tiles are the same type (for pong/kong)
export function tilesMatch(a: MahjongTile, b: MahjongTile): boolean {
  return a.suit === b.suit && a.value === b.value;
}

// Check if tiles form a valid sequence (chow) - only for suited tiles
export function isValidChow(tiles: MahjongTile[]): boolean {
  if (tiles.length !== 3) return false;

  // Must be suited tiles (not winds or dragons)
  if (tiles.some(t => t.suit === 'wind' || t.suit === 'dragon')) return false;

  // Must be same suit
  if (tiles[0].suit !== tiles[1].suit || tiles[1].suit !== tiles[2].suit) return false;

  // Sort by value and check sequence
  const values = tiles.map(t => t.value as number).sort((a, b) => a - b);
  return values[1] === values[0] + 1 && values[2] === values[1] + 1;
}

// Check if tiles form a valid pong (3 of same)
export function isValidPong(tiles: MahjongTile[]): boolean {
  if (tiles.length !== 3) return false;
  return tilesMatch(tiles[0], tiles[1]) && tilesMatch(tiles[1], tiles[2]);
}

// Check if tiles form a valid kong (4 of same)
export function isValidKong(tiles: MahjongTile[]): boolean {
  if (tiles.length !== 4) return false;
  return tilesMatch(tiles[0], tiles[1]) && tilesMatch(tiles[1], tiles[2]) && tilesMatch(tiles[2], tiles[3]);
}

// Check if tiles form a valid pair
export function isValidPair(tiles: MahjongTile[]): boolean {
  if (tiles.length !== 2) return false;
  return tilesMatch(tiles[0], tiles[1]);
}

// Sort tiles for display
export function sortTiles(tiles: MahjongTile[]): MahjongTile[] {
  const suitOrder: Record<TileSuit, number> = {
    character: 0,
    circle: 1,
    bamboo: 2,
    wind: 3,
    dragon: 4,
  };

  const windOrder: Record<WindValue, number> = {
    east: 0,
    south: 1,
    west: 2,
    north: 3,
  };

  const dragonOrder: Record<DragonValue, number> = {
    red: 0,
    green: 1,
    white: 2,
  };

  return [...tiles].sort((a, b) => {
    // First sort by suit
    if (suitOrder[a.suit] !== suitOrder[b.suit]) {
      return suitOrder[a.suit] - suitOrder[b.suit];
    }

    // Then by value
    if (a.suit === 'wind' && b.suit === 'wind') {
      return windOrder[a.value as WindValue] - windOrder[b.value as WindValue];
    }
    if (a.suit === 'dragon' && b.suit === 'dragon') {
      return dragonOrder[a.value as DragonValue] - dragonOrder[b.value as DragonValue];
    }

    return (a.value as number) - (b.value as number);
  });
}

// Group tiles by type for analysis
export function groupTiles(tiles: MahjongTile[]): Map<string, MahjongTile[]> {
  const groups = new Map<string, MahjongTile[]>();

  for (const tile of tiles) {
    const key = `${tile.suit}-${tile.value}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tile);
  }

  return groups;
}

// Check if player can call pong on a discarded tile
export function canCallPong(hand: MahjongTile[], discardedTile: MahjongTile): boolean {
  const matching = hand.filter(t => tilesMatch(t, discardedTile));
  return matching.length >= 2;
}

// Check if player can call kong on a discarded tile
export function canCallKong(hand: MahjongTile[], discardedTile: MahjongTile): boolean {
  const matching = hand.filter(t => tilesMatch(t, discardedTile));
  return matching.length >= 3;
}

// Check if player can call chow on a discarded tile (only from player to the left)
export function canCallChow(hand: MahjongTile[], discardedTile: MahjongTile): MahjongTile[][] {
  const possibleChows: MahjongTile[][] = [];

  // Can't chow winds or dragons
  if (discardedTile.suit === 'wind' || discardedTile.suit === 'dragon') {
    return possibleChows;
  }

  const value = discardedTile.value as number;
  const suit = discardedTile.suit;

  // Find tiles in hand of same suit
  const sameSuit = hand.filter(t => t.suit === suit);

  // Check for sequences: [value-2, value-1], [value-1, value+1], [value+1, value+2]
  const patterns = [
    [value - 2, value - 1],
    [value - 1, value + 1],
    [value + 1, value + 2],
  ];

  for (const [v1, v2] of patterns) {
    if (v1 >= 1 && v1 <= 9 && v2 >= 1 && v2 <= 9) {
      const tile1 = sameSuit.find(t => t.value === v1);
      const tile2 = sameSuit.find(t => t.value === v2 && t.id !== tile1?.id);

      if (tile1 && tile2) {
        possibleChows.push([tile1, tile2, discardedTile]);
      }
    }
  }

  return possibleChows;
}

// Check if a hand is a winning hand (simplified check)
// A winning hand needs: 4 melds (pong/kong/chow) + 1 pair = 14 tiles
export function isWinningHand(hand: MahjongTile[], melds: Meld[]): boolean {
  // Count tiles in melds
  const meldTileCount = melds.reduce((sum, m) => sum + m.tiles.length, 0);
  const totalTiles = hand.length + meldTileCount;

  // Must have 14 tiles total (or 18 with a kong)
  const kongCount = melds.filter(m => m.type === 'kong').length;
  const expectedTotal = 14 + kongCount;

  if (totalTiles !== expectedTotal) return false;

  // Try to form 4 melds + 1 pair from remaining hand tiles
  return canFormWinningCombination(hand);
}

// Recursive function to check if tiles can form winning combination
function canFormWinningCombination(tiles: MahjongTile[]): boolean {
  if (tiles.length === 0) return false;
  if (tiles.length === 2) return isValidPair(tiles);

  const sorted = sortTiles(tiles);

  // Try to find a pair first, then melds
  const groups = groupTiles(sorted);

  for (const [, groupTiles] of groups) {
    if (groupTiles.length >= 2) {
      // Try using this as the pair
      const remaining = [...sorted];
      const idx1 = remaining.findIndex(t => t.id === groupTiles[0].id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === groupTiles[1].id);
      remaining.splice(idx2, 1);

      if (canFormMelds(remaining)) {
        return true;
      }
    }
  }

  return false;
}

// Check if remaining tiles can all form melds
function canFormMelds(tiles: MahjongTile[]): boolean {
  if (tiles.length === 0) return true;
  if (tiles.length < 3) return false;

  const sorted = sortTiles(tiles);
  const first = sorted[0];

  // Try pong with first tile
  const matching = sorted.filter(t => tilesMatch(t, first));
  if (matching.length >= 3) {
    const remaining = [...sorted];
    for (let i = 0; i < 3; i++) {
      const idx = remaining.findIndex(t => tilesMatch(t, first));
      remaining.splice(idx, 1);
    }
    if (canFormMelds(remaining)) return true;
  }

  // Try chow with first tile (only for suited tiles)
  if (first.suit !== 'wind' && first.suit !== 'dragon') {
    const value = first.value as number;
    const second = sorted.find(t => t.suit === first.suit && t.value === value + 1);
    const third = sorted.find(t => t.suit === first.suit && t.value === value + 2 && t.id !== second?.id);

    if (second && third) {
      const remaining = [...sorted];
      const idx1 = remaining.findIndex(t => t.id === first.id);
      remaining.splice(idx1, 1);
      const idx2 = remaining.findIndex(t => t.id === second.id);
      remaining.splice(idx2, 1);
      const idx3 = remaining.findIndex(t => t.id === third.id);
      remaining.splice(idx3, 1);

      if (canFormMelds(remaining)) return true;
    }
  }

  return false;
}

// Check if player can declare mahjong
export function canDeclareMahjong(hand: MahjongTile[], melds: Meld[], newTile?: MahjongTile): boolean {
  const fullHand = newTile ? [...hand, newTile] : hand;
  return isWinningHand(fullHand, melds);
}

// Get tile display character
export function getTileDisplay(tile: MahjongTile): { char: string; color: string } {
  if (tile.suit === 'wind') {
    const windChars: Record<WindValue, string> = {
      east: '東',
      south: '南',
      west: '西',
      north: '北',
    };
    return { char: windChars[tile.value as WindValue], color: 'text-blue-600' };
  }

  if (tile.suit === 'dragon') {
    const dragonChars: Record<DragonValue, { char: string; color: string }> = {
      red: { char: '中', color: 'text-red-600' },
      green: { char: '發', color: 'text-green-600' },
      white: { char: '白', color: 'text-gray-400' },
    };
    return dragonChars[tile.value as DragonValue];
  }

  // Suited tiles
  const suitColors: Record<string, string> = {
    bamboo: 'text-green-600',
    circle: 'text-blue-600',
    character: 'text-red-600',
  };

  const suitSymbols: Record<string, string> = {
    bamboo: '竹',
    circle: '筒',
    character: '萬',
  };

  return {
    char: `${tile.value}${suitSymbols[tile.suit]}`,
    color: suitColors[tile.suit],
  };
}
