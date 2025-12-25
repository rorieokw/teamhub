import type { Card, Suit, Rank, HandEvaluation } from '../types/poker';

// All suits and ranks
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Rank values for comparison (2=2, ..., A=14)
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Create a new shuffled deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Deal cards from deck
export function dealCards(deck: Card[], count: number): { dealt: Card[]; remaining: Card[] } {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count)
  };
}

// Get card value
export function getCardValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

// Sort cards by value (descending)
function sortByValue(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getCardValue(b) - getCardValue(a));
}

// Get rank counts (e.g., { '14': 2, '11': 1, '7': 2 } for pair of aces and pair of 7s)
function getRankCounts(cards: Card[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const card of cards) {
    const value = getCardValue(card);
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

// Check if cards form a flush (5+ of same suit)
function getFlushCards(cards: Card[]): Card[] | null {
  const suitCounts = new Map<Suit, Card[]>();
  for (const card of cards) {
    const existing = suitCounts.get(card.suit) || [];
    existing.push(card);
    suitCounts.set(card.suit, existing);
  }
  for (const [, suitCards] of suitCounts) {
    if (suitCards.length >= 5) {
      return sortByValue(suitCards).slice(0, 5);
    }
  }
  return null;
}

// Check if cards form a straight (5 consecutive values)
function getStraightCards(cards: Card[]): Card[] | null {
  const uniqueValues = [...new Set(cards.map(c => getCardValue(c)))].sort((a, b) => b - a);

  // Check for A-2-3-4-5 (wheel)
  if (uniqueValues.includes(14) && uniqueValues.includes(2) &&
      uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
    const straightCards: Card[] = [];
    for (const val of [5, 4, 3, 2, 14]) {
      const card = cards.find(c => getCardValue(c) === val);
      if (card) straightCards.push(card);
    }
    return straightCards;
  }

  // Check for regular straight
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    const slice = uniqueValues.slice(i, i + 5);
    if (slice[0] - slice[4] === 4) {
      const straightCards: Card[] = [];
      for (const val of slice) {
        const card = cards.find(c => getCardValue(c) === val);
        if (card) straightCards.push(card);
      }
      return straightCards;
    }
  }
  return null;
}

// Check for straight flush
function getStraightFlush(cards: Card[]): Card[] | null {
  const suitGroups = new Map<Suit, Card[]>();
  for (const card of cards) {
    const existing = suitGroups.get(card.suit) || [];
    existing.push(card);
    suitGroups.set(card.suit, existing);
  }

  for (const [, suitCards] of suitGroups) {
    if (suitCards.length >= 5) {
      const straight = getStraightCards(suitCards);
      if (straight) return straight;
    }
  }
  return null;
}

// Evaluate a poker hand (5-7 cards)
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5) {
    throw new Error('Need at least 5 cards to evaluate a hand');
  }

  const sorted = sortByValue(cards);
  const rankCounts = getRankCounts(cards);

  // Get counts sorted by frequency then value
  const countEntries = [...rankCounts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  // Check for straight flush / royal flush
  const straightFlush = getStraightFlush(cards);
  if (straightFlush) {
    const highCard = getCardValue(straightFlush[0]);
    if (highCard === 14) {
      return {
        rank: 'royal-flush',
        rankValue: 9,
        highCards: straightFlush.map(c => getCardValue(c)),
        description: 'Royal Flush'
      };
    }
    return {
      rank: 'straight-flush',
      rankValue: 8,
      highCards: straightFlush.map(c => getCardValue(c)),
      description: `Straight Flush, ${straightFlush[0].rank} high`
    };
  }

  // Four of a kind
  const fourKind = countEntries.find(([, count]) => count === 4);
  if (fourKind) {
    const kicker = countEntries.find(([val]) => val !== fourKind[0]);
    return {
      rank: 'four-of-a-kind',
      rankValue: 7,
      highCards: [fourKind[0], kicker?.[0] || 0],
      description: `Four ${rankName(fourKind[0])}s`
    };
  }

  // Full house
  const threeKind = countEntries.find(([, count]) => count === 3);
  const pair = countEntries.find(([val, count]) => count >= 2 && val !== threeKind?.[0]);
  if (threeKind && pair) {
    return {
      rank: 'full-house',
      rankValue: 6,
      highCards: [threeKind[0], pair[0]],
      description: `Full House, ${rankName(threeKind[0])}s over ${rankName(pair[0])}s`
    };
  }

  // Flush
  const flush = getFlushCards(cards);
  if (flush) {
    return {
      rank: 'flush',
      rankValue: 5,
      highCards: flush.map(c => getCardValue(c)),
      description: `Flush, ${flush[0].rank} high`
    };
  }

  // Straight
  const straight = getStraightCards(cards);
  if (straight) {
    return {
      rank: 'straight',
      rankValue: 4,
      highCards: straight.map(c => getCardValue(c)),
      description: `Straight, ${straight[0].rank} high`
    };
  }

  // Three of a kind
  if (threeKind) {
    const kickers = countEntries
      .filter(([val]) => val !== threeKind[0])
      .slice(0, 2)
      .map(([val]) => val);
    return {
      rank: 'three-of-a-kind',
      rankValue: 3,
      highCards: [threeKind[0], ...kickers],
      description: `Three ${rankName(threeKind[0])}s`
    };
  }

  // Two pair
  const pairs = countEntries.filter(([, count]) => count === 2);
  if (pairs.length >= 2) {
    const kicker = countEntries.find(([val]) => val !== pairs[0][0] && val !== pairs[1][0]);
    return {
      rank: 'two-pair',
      rankValue: 2,
      highCards: [pairs[0][0], pairs[1][0], kicker?.[0] || 0],
      description: `Two Pair, ${rankName(pairs[0][0])}s and ${rankName(pairs[1][0])}s`
    };
  }

  // One pair
  if (pairs.length === 1) {
    const kickers = countEntries
      .filter(([val]) => val !== pairs[0][0])
      .slice(0, 3)
      .map(([val]) => val);
    return {
      rank: 'pair',
      rankValue: 1,
      highCards: [pairs[0][0], ...kickers],
      description: `Pair of ${rankName(pairs[0][0])}s`
    };
  }

  // High card
  return {
    rank: 'high-card',
    rankValue: 0,
    highCards: sorted.slice(0, 5).map(c => getCardValue(c)),
    description: `${sorted[0].rank} high`
  };
}

// Convert rank value back to name
function rankName(value: number): string {
  if (value === 14) return 'Ace';
  if (value === 13) return 'King';
  if (value === 12) return 'Queen';
  if (value === 11) return 'Jack';
  return value.toString();
}

// Compare two hands, returns positive if hand1 wins, negative if hand2 wins, 0 for tie
export function compareHands(hand1: HandEvaluation, hand2: HandEvaluation): number {
  // Compare hand rank first
  if (hand1.rankValue !== hand2.rankValue) {
    return hand1.rankValue - hand2.rankValue;
  }

  // Compare high cards for tiebreaker
  for (let i = 0; i < Math.min(hand1.highCards.length, hand2.highCards.length); i++) {
    if (hand1.highCards[i] !== hand2.highCards[i]) {
      return hand1.highCards[i] - hand2.highCards[i];
    }
  }

  return 0; // Exact tie
}

// Find the best 5-card hand from 7 cards (2 hole + 5 community)
export function findBestHand(holeCards: Card[], communityCards: Card[]): HandEvaluation {
  const allCards = [...holeCards, ...communityCards];

  if (allCards.length < 5) {
    throw new Error('Need at least 5 cards total');
  }

  // If exactly 5-7 cards, evaluate directly
  if (allCards.length <= 7) {
    return evaluateHand(allCards);
  }

  // Generate all 5-card combinations and find best
  let bestHand: HandEvaluation | null = null;
  const combinations = getCombinations(allCards, 5);

  for (const combo of combinations) {
    const hand = evaluateHand(combo);
    if (!bestHand || compareHands(hand, bestHand) > 0) {
      bestHand = hand;
    }
  }

  return bestHand!;
}

// Get all combinations of size k from array
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];

  function combine(start: number, combo: T[]) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

// Determine winners from active players
export function determineWinners(
  players: { odlUser: string; odlUserName: string; holeCards: Card[] }[],
  communityCards: Card[]
): { odlUser: string; odlUserName: string; hand: HandEvaluation }[] {
  if (players.length === 0) return [];
  if (players.length === 1) {
    return [{
      odlUser: players[0].odlUser,
      odlUserName: players[0].odlUserName,
      hand: findBestHand(players[0].holeCards, communityCards)
    }];
  }

  // Evaluate all hands
  const evaluated = players.map(p => ({
    odlUser: p.odlUser,
    odlUserName: p.odlUserName,
    hand: findBestHand(p.holeCards, communityCards)
  }));

  // Find best hand
  let bestHand = evaluated[0].hand;
  for (const p of evaluated) {
    if (compareHands(p.hand, bestHand) > 0) {
      bestHand = p.hand;
    }
  }

  // Return all players with the best hand (for split pots)
  return evaluated.filter(p => compareHands(p.hand, bestHand) === 0);
}

// Get card display info
export function getCardDisplay(card: Card): { symbol: string; color: string } {
  const symbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };
  const colors: Record<Suit, string> = {
    hearts: 'text-red-500',
    diamonds: 'text-red-500',
    clubs: 'text-gray-900',
    spades: 'text-gray-900'
  };
  return {
    symbol: symbols[card.suit],
    color: colors[card.suit]
  };
}
