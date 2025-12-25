import { Timestamp } from 'firebase/firestore';

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'waiting' | 'betting' | 'playing' | 'standing' | 'busted' | 'blackjack' | 'won' | 'lost' | 'push';
export type GamePhase = 'waiting' | 'betting' | 'dealing' | 'playing' | 'dealer-turn' | 'payout' | 'finished';

export interface BlackjackPlayer {
  odlUser: string;
  odlUserName: string;
  odlUserAvatar?: string;
  seatNumber: number;
  chips: number;
  currentBet: number;
  hand: Card[];
  splitHand?: Card[]; // For splitting pairs
  status: PlayerStatus;
  insuranceBet?: number;
  hasDoubledDown?: boolean;
  hasSplit?: boolean;
  joinedAt: Timestamp;
}

export interface BlackjackGame {
  id: string;
  name: string;
  minBet: number;
  maxBet: number;
  maxPlayers: number;
  phase: GamePhase;
  deck: Card[];
  dealerHand: Card[];
  dealerRevealed: boolean; // Whether dealer's hole card is revealed
  players: BlackjackPlayer[];
  currentPlayerIndex: number;
  currentHandIndex: number; // 0 = main hand, 1 = split hand
  roundNumber: number;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BlackjackGameSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  minBet: number;
  maxBet: number;
  phase: GamePhase;
  createdBy: string;
}

export type BlackjackAction = 'hit' | 'stand' | 'double' | 'split' | 'insurance';
