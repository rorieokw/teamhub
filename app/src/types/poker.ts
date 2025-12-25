import { Timestamp } from 'firebase/firestore';

// Card suits and ranks
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Hand rankings from lowest to highest
export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

export interface HandEvaluation {
  rank: HandRank;
  rankValue: number; // Numeric value for comparison (0-9)
  highCards: number[]; // For tiebreakers, sorted desc
  description: string; // e.g., "Pair of Kings"
}

// Player actions
export type PlayerAction = 'fold' | 'check' | 'call' | 'raise' | 'all-in';

// Game phases
export type GamePhase = 'waiting' | 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown' | 'finished';

// Player status at the table
export type PlayerStatus = 'waiting' | 'active' | 'folded' | 'all-in' | 'out';

// A player in the poker game
export interface PokerPlayer {
  odlUser: string;
  odlUserName: string;
  odlUserAvatar?: string;
  seatNumber: number; // 0-5 for 6 seats
  chips: number;
  currentBet: number; // Amount bet in current round
  totalBetThisHand: number; // Total bet this hand (for pot calculation)
  holeCards: Card[]; // The 2 private cards (empty for other players in client)
  status: PlayerStatus;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  lastAction?: PlayerAction;
  hasActedThisRound: boolean; // Track if player has acted in current betting round
  isBot?: boolean; // Whether this player is an AI bot
  joinedAt: Timestamp;
}

// The main poker game state
export interface PokerGame {
  id: string;

  // Game settings
  name: string;
  smallBlind: number;
  bigBlind: number;
  minBuyIn: number;
  maxBuyIn: number;
  maxPlayers: 6;

  // Current game state
  phase: GamePhase;
  pot: number;
  sidePots: SidePot[]; // For all-in situations
  communityCards: Card[]; // The 5 shared cards (0-5 depending on phase)
  deck: Card[]; // Remaining deck (server only, not sent to clients)

  // Player management
  players: PokerPlayer[];
  currentPlayerIndex: number; // Whose turn it is
  dealerIndex: number; // Button position

  // Betting round tracking
  currentBet: number; // Highest bet in current round
  minRaise: number; // Minimum raise amount
  lastRaiserIndex: number; // Who made the last raise
  lastAggressorIndex?: number; // Who made the last aggressive action (bet/raise)

  // Round tracking
  handNumber: number;

  // Winners (set after showdown)
  winners?: {
    odlUser: string;
    odlUserName: string;
    amount: number;
    hand?: HandEvaluation;
  }[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActionAt: Timestamp;

  // Creator
  createdBy: string;
}

// Side pot for all-in situations
export interface SidePot {
  amount: number;
  eligiblePlayers: string[]; // User IDs who can win this pot
}

// Action log entry
export interface PokerAction {
  odlUser: string;
  odlUserName: string;
  action: PlayerAction;
  amount?: number;
  timestamp: Timestamp;
}

// For the lobby - simplified game info
export interface PokerGameSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  phase: GamePhase;
  createdBy: string;
}

// Starting chips for new players
export const DEFAULT_BUY_IN = 1000;
export const DEFAULT_SMALL_BLIND = 10;
export const DEFAULT_BIG_BLIND = 20;
