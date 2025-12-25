import type { Card, Suit, Rank } from '../types/blackjack';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// Create a standard 52-card deck
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

// Create multiple decks (casinos typically use 6-8 decks)
export function createShoe(numDecks: number = 6): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    shoe.push(...createDeck());
  }
  return shuffleDeck(shoe);
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
    remaining: deck.slice(count),
  };
}

// Get the numeric value of a card
export function getCardValue(card: Card): number[] {
  switch (card.rank) {
    case 'A':
      return [1, 11]; // Ace can be 1 or 11
    case 'K':
    case 'Q':
    case 'J':
      return [10];
    default:
      return [parseInt(card.rank)];
  }
}

// Calculate all possible hand values (accounting for aces)
export function getHandValues(hand: Card[]): number[] {
  if (hand.length === 0) return [0];

  let values = [0];

  for (const card of hand) {
    const cardValues = getCardValue(card);
    const newValues: number[] = [];

    for (const value of values) {
      for (const cardValue of cardValues) {
        newValues.push(value + cardValue);
      }
    }

    // Remove duplicates and sort
    values = [...new Set(newValues)].sort((a, b) => a - b);
  }

  return values;
}

// Get the best hand value (highest value <= 21, or lowest if all bust)
export function getBestHandValue(hand: Card[]): number {
  const values = getHandValues(hand);

  // Find the highest value that doesn't bust
  const validValues = values.filter(v => v <= 21);
  if (validValues.length > 0) {
    return Math.max(...validValues);
  }

  // All values bust, return the lowest
  return Math.min(...values);
}

// Check if hand is a blackjack (21 with exactly 2 cards)
export function isBlackjack(hand: Card[]): boolean {
  return hand.length === 2 && getBestHandValue(hand) === 21;
}

// Check if hand is busted (all values > 21)
export function isBusted(hand: Card[]): boolean {
  return getBestHandValue(hand) > 21;
}

// Check if hand is soft (has an ace counting as 11)
export function isSoft(hand: Card[]): boolean {
  const hasAce = hand.some(card => card.rank === 'A');
  if (!hasAce) return false;

  // Check if we can count an ace as 11 without busting
  const withoutAces = hand.filter(card => card.rank !== 'A');
  const aceCount = hand.filter(card => card.rank === 'A').length;

  const baseValue = withoutAces.reduce((sum, card) => sum + getCardValue(card)[0], 0);

  // Can we use at least one ace as 11?
  return baseValue + 11 + (aceCount - 1) <= 21;
}

// Check if player can split (two cards of same rank)
export function canSplit(hand: Card[], chips: number, currentBet: number): boolean {
  if (hand.length !== 2) return false;
  if (chips < currentBet) return false; // Need enough chips to match bet
  return hand[0].rank === hand[1].rank;
}

// Check if player can double down
export function canDoubleDown(hand: Card[], chips: number, currentBet: number): boolean {
  if (hand.length !== 2) return false;
  if (chips < currentBet) return false; // Need enough chips to double
  return true;
}

// Check if player can take insurance (dealer shows Ace)
export function canTakeInsurance(dealerUpCard: Card, chips: number, currentBet: number): boolean {
  if (dealerUpCard.rank !== 'A') return false;
  return chips >= currentBet / 2; // Insurance costs half the original bet
}

// Determine the winner between player and dealer hands
export function determineOutcome(
  playerHand: Card[],
  dealerHand: Card[],
  playerBet: number,
  hasDoubledDown: boolean,
  insuranceBet: number = 0
): { result: 'win' | 'lose' | 'push' | 'blackjack'; payout: number } {
  const playerValue = getBestHandValue(playerHand);
  const dealerValue = getBestHandValue(dealerHand);
  const playerBJ = isBlackjack(playerHand);
  const dealerBJ = isBlackjack(dealerHand);

  const betMultiplier = hasDoubledDown ? 2 : 1;
  const totalBet = playerBet * betMultiplier;

  // Insurance payout (if dealer has blackjack)
  let insurancePayout = 0;
  if (dealerBJ && insuranceBet > 0) {
    insurancePayout = insuranceBet * 2; // Insurance pays 2:1
  }

  // Both have blackjack - push (player gets bet back)
  if (playerBJ && dealerBJ) {
    return { result: 'push', payout: totalBet + insurancePayout };
  }

  // Player has blackjack - pays 3:2
  if (playerBJ) {
    return { result: 'blackjack', payout: totalBet + Math.floor(totalBet * 1.5) };
  }

  // Dealer has blackjack - player loses (but might win insurance)
  if (dealerBJ) {
    return { result: 'lose', payout: insurancePayout };
  }

  // Player busted - loses
  if (playerValue > 21) {
    return { result: 'lose', payout: 0 };
  }

  // Dealer busted - player wins
  if (dealerValue > 21) {
    return { result: 'win', payout: totalBet * 2 };
  }

  // Compare values
  if (playerValue > dealerValue) {
    return { result: 'win', payout: totalBet * 2 };
  } else if (playerValue < dealerValue) {
    return { result: 'lose', payout: 0 };
  } else {
    return { result: 'push', payout: totalBet };
  }
}

// Get display string for a hand value
export function getHandValueDisplay(hand: Card[]): string {
  const values = getHandValues(hand).filter(v => v <= 21);

  if (values.length === 0) {
    return `${getBestHandValue(hand)} (Bust)`;
  }

  if (isBlackjack(hand)) {
    return 'Blackjack!';
  }

  if (values.length === 2) {
    return `${values[0]}/${values[1]}`;
  }

  return `${values[values.length - 1]}`;
}

// Check if dealer should hit (dealer must hit on soft 17 in most casinos)
export function shouldDealerHit(hand: Card[], hitOnSoft17: boolean = true): boolean {
  const value = getBestHandValue(hand);

  if (value < 17) return true;
  if (value > 17) return false;

  // Value is exactly 17
  if (hitOnSoft17 && isSoft(hand)) {
    return true;
  }

  return false;
}
