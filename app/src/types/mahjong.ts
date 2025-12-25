import { Timestamp } from 'firebase/firestore';

// Tile suits
export type TileSuit = 'bamboo' | 'circle' | 'character' | 'wind' | 'dragon';
export type TileValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type WindValue = 'east' | 'south' | 'west' | 'north';
export type DragonValue = 'red' | 'green' | 'white';

export interface MahjongTile {
  id: string; // Unique identifier for each tile
  suit: TileSuit;
  value: TileValue | WindValue | DragonValue;
}

export type GamePhase = 'waiting' | 'playing' | 'finished';
export type PlayerStatus = 'waiting' | 'playing' | 'won' | 'lost';

// A meld is a set of tiles (pong, kong, or chow)
export type MeldType = 'pong' | 'kong' | 'chow';
export interface Meld {
  type: MeldType;
  tiles: MahjongTile[];
  isConcealed: boolean; // Hidden or exposed
}

export interface MahjongPlayer {
  odlUser: string;
  odlUserName: string;
  odlUserAvatar?: string;
  seatNumber: number; // 0=East, 1=South, 2=West, 3=North
  hand: MahjongTile[]; // Tiles in hand (hidden from others)
  melds: Meld[]; // Exposed melds
  discards: MahjongTile[]; // Tiles this player discarded
  score: number;
  status: PlayerStatus;
  isDealer: boolean;
  isBot?: boolean; // True if this player is an AI bot
  joinedAt: Timestamp;
}

export interface MahjongGame {
  id: string;
  name: string;
  maxPlayers: 4;
  phase: GamePhase;
  wall: MahjongTile[]; // Remaining tiles to draw
  currentPlayerIndex: number;
  lastDiscard?: MahjongTile;
  lastDiscardBy?: number;
  players: MahjongPlayer[];
  dealerIndex: number;
  roundNumber: number;
  roundWind: WindValue; // East, South, West, North round
  turnCount: number;
  winner?: string;
  winningHand?: MahjongTile[];
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MahjongGameSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  createdBy: string;
}

export type MahjongAction = 'draw' | 'discard' | 'pong' | 'kong' | 'chow' | 'mahjong';
