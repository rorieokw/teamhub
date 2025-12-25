import type { Card, PokerGame, PlayerAction, Rank } from '../types/poker';
import { compareHands, findBestHand, getCardValue } from './pokerLogic';

// Pre-flop hand strength rankings (simplified Chen formula)
// Returns a score from 0-20, higher is better
export function getPreFlopStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;

  const [card1, card2] = holeCards;
  const val1 = getCardValue(card1);
  const val2 = getCardValue(card2);
  const high = Math.max(val1, val2);
  const low = Math.min(val1, val2);
  const isPair = val1 === val2;
  const isSuited = card1.suit === card2.suit;
  const gap = high - low - 1;

  let score = 0;

  // Base score from high card
  if (high === 14) score = 10; // Ace
  else if (high === 13) score = 8; // King
  else if (high === 12) score = 7; // Queen
  else if (high === 11) score = 6; // Jack
  else score = high / 2;

  // Pair bonus
  if (isPair) {
    score *= 2;
    if (score < 5) score = 5; // Minimum for pairs
  }

  // Suited bonus
  if (isSuited) {
    score += 2;
  }

  // Connector bonus (reduced by gap)
  if (!isPair) {
    if (gap === 0) score += 1; // Connected
    else if (gap === 1) score += 0; // One gap
    else if (gap === 2) score -= 1; // Two gap
    else if (gap === 3) score -= 2; // Three gap
    else score -= 4; // Four+ gap
  }

  // Low card penalty
  if (low < 10 && !isPair) {
    score -= 1;
  }

  return Math.max(0, Math.min(20, score));
}

// Monte Carlo simulation for post-flop hand strength
// Returns win probability (0-1)
export function simulateHandStrength(
  holeCards: Card[],
  communityCards: Card[],
  numOpponents: number,
  simulations: number = 500
): number {
  if (holeCards.length !== 2) return 0;

  const knownCards = new Set(
    [...holeCards, ...communityCards].map(c => `${c.rank}-${c.suit}`)
  );

  // Build remaining deck
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const remainingDeck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      if (!knownCards.has(`${rank}-${suit}`)) {
        remainingDeck.push({ suit, rank });
      }
    }
  }

  let wins = 0;
  let ties = 0;

  for (let sim = 0; sim < simulations; sim++) {
    // Shuffle remaining deck
    const shuffled = [...remainingDeck].sort(() => Math.random() - 0.5);
    let deckIndex = 0;

    // Complete community cards if needed
    const fullCommunity = [...communityCards];
    while (fullCommunity.length < 5) {
      fullCommunity.push(shuffled[deckIndex++]);
    }

    // Evaluate our hand
    const ourHand = findBestHand(holeCards, fullCommunity);

    // Simulate opponent hands
    let wonAgainstAll = true;
    let tiedWithBest = false;

    for (let opp = 0; opp < numOpponents; opp++) {
      const oppCards = [shuffled[deckIndex++], shuffled[deckIndex++]];
      const oppHand = findBestHand(oppCards, fullCommunity);
      const comparison = compareHands(ourHand, oppHand);

      if (comparison < 0) {
        wonAgainstAll = false;
        break;
      } else if (comparison === 0) {
        tiedWithBest = true;
      }
    }

    if (wonAgainstAll) {
      if (tiedWithBest) ties++;
      else wins++;
    }
  }

  // Ties count as half a win
  return (wins + ties * 0.5) / simulations;
}

// Calculate pot odds (how much to call vs potential win)
export function calculatePotOdds(pot: number, toCall: number): number {
  if (toCall === 0) return 1; // Free to check
  return pot / (pot + toCall);
}

// Calculate implied pot odds (considering future bets)
export function calculateImpliedOdds(
  pot: number,
  toCall: number,
  stackSize: number,
  phase: string
): number {
  if (toCall === 0) return 1;

  // Estimate additional bets we might win
  let impliedMultiplier = 1;
  switch (phase) {
    case 'pre-flop':
      impliedMultiplier = 2.5; // More streets to come
      break;
    case 'flop':
      impliedMultiplier = 2;
      break;
    case 'turn':
      impliedMultiplier = 1.5;
      break;
    case 'river':
      impliedMultiplier = 1;
      break;
  }

  const impliedPot = pot + Math.min(pot * impliedMultiplier, stackSize);
  return impliedPot / (impliedPot + toCall);
}

// Main AI decision function
export function getBotDecision(
  game: PokerGame,
  botIndex: number
): { action: PlayerAction; raiseAmount?: number } {
  const bot = game.players[botIndex];
  const holeCards = bot.holeCards;
  const communityCards = game.communityCards;
  const pot = game.pot;
  const toCall = game.currentBet - bot.currentBet;
  const chips = bot.chips;
  const bigBlind = game.bigBlind;

  // Safety check: if no hole cards, make a conservative decision
  if (!holeCards || holeCards.length !== 2) {
    console.warn('Bot has no hole cards, making conservative decision');
    if (toCall === 0) return { action: 'check' };
    if (toCall <= bigBlind) return { action: 'call' };
    return { action: 'fold' };
  }

  // Count active opponents
  const activeOpponents = game.players.filter(
    (p, i) => i !== botIndex && p.status !== 'folded' && p.status !== 'out'
  ).length;

  // Calculate hand strength
  let handStrength: number;

  if (game.phase === 'pre-flop') {
    // Use pre-flop rankings
    const preFlopScore = getPreFlopStrength(holeCards);
    handStrength = preFlopScore / 20; // Normalize to 0-1
  } else {
    // Use Monte Carlo simulation
    handStrength = simulateHandStrength(
      holeCards,
      communityCards,
      activeOpponents,
      300 // Reduced simulations for speed
    );
  }

  // Calculate pot odds
  const potOdds = calculatePotOdds(pot, toCall);
  const impliedOdds = calculateImpliedOdds(pot, toCall, chips, game.phase);

  // Add some randomness to avoid being too predictable
  const randomFactor = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
  const adjustedStrength = Math.min(1, handStrength * randomFactor);

  // Bluff factor - occasionally bluff with weak hands
  const bluffChance = Math.random();
  const isBluffing = bluffChance < 0.08 && adjustedStrength < 0.3; // 8% bluff rate

  // Position factor (later positions can play more hands)
  const positionBonus = botIndex >= game.dealerIndex ? 0.05 : 0;

  // Strong hand thresholds adjusted by position
  const veryStrongThreshold = 0.65 - positionBonus;
  const strongThreshold = 0.45 - positionBonus;
  const mediumThreshold = 0.25 - positionBonus;

  // Decision tree
  if (adjustedStrength >= veryStrongThreshold || isBluffing) {
    // Very strong hand (or bluff) - raise aggressively
    if (chips <= toCall) {
      return { action: 'all-in' };
    }

    // Calculate raise size based on strength
    let raiseMultiplier: number;
    if (adjustedStrength >= 0.8) {
      raiseMultiplier = 2.5 + Math.random(); // 2.5-3.5x pot
    } else if (adjustedStrength >= 0.65) {
      raiseMultiplier = 1.5 + Math.random() * 0.5; // 1.5-2x pot
    } else {
      raiseMultiplier = 0.5 + Math.random() * 0.5; // 0.5-1x pot (bluff)
    }

    const raiseSize = Math.floor(pot * raiseMultiplier);
    const minRaise = game.currentBet + game.minRaise;
    const raiseAmount = Math.max(minRaise, game.currentBet + raiseSize);

    if (raiseAmount >= chips + bot.currentBet) {
      return { action: 'all-in' };
    }

    return { action: 'raise', raiseAmount: Math.min(raiseAmount, chips + bot.currentBet) };
  }

  if (adjustedStrength >= strongThreshold) {
    // Strong hand - call or small raise
    if (toCall === 0) {
      // Check or bet
      if (Math.random() < 0.6) {
        // Bet for value
        const betAmount = Math.floor(pot * (0.4 + Math.random() * 0.3));
        const minRaise = game.currentBet + game.minRaise;
        return { action: 'raise', raiseAmount: Math.max(minRaise, betAmount) };
      }
      return { action: 'check' };
    }

    if (toCall <= pot * 0.5 || adjustedStrength >= potOdds) {
      return { action: 'call' };
    }

    // Calling too much, fold
    return { action: 'fold' };
  }

  if (adjustedStrength >= mediumThreshold) {
    // Medium hand - call small bets
    if (toCall === 0) {
      return { action: 'check' };
    }

    // Call if pot odds are good
    if (adjustedStrength >= (1 - impliedOdds) && toCall <= pot * 0.3) {
      return { action: 'call' };
    }

    return { action: 'fold' };
  }

  // Weak hand
  if (toCall === 0) {
    return { action: 'check' };
  }

  // Only call very small bets with weak hands (drawing odds)
  if (toCall <= bigBlind && adjustedStrength >= 0.15) {
    return { action: 'call' };
  }

  return { action: 'fold' };
}

// Bot names and avatars
const BOT_NAMES = [
  'DeepStack',
  'PokerBot',
  'CardShark',
  'AlphaBluff',
  'RoboRaise',
  'ChipMaster',
  'FoldEmUp',
  'BetWise',
  'StackAttack',
  'BluffKing'
];

const BOT_AVATARS = [
  '🤖', '🎰', '🃏', '♠️', '♦️', '♣️', '♥️', '🎲', '💰', '🏆'
];

export function generateBotPlayer(): {
  odlUser: string;
  odlUserName: string;
  odlUserAvatar: string;
  isBot: boolean;
} {
  const nameIndex = Math.floor(Math.random() * BOT_NAMES.length);
  const avatarIndex = Math.floor(Math.random() * BOT_AVATARS.length);
  const id = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    odlUser: id,
    odlUserName: BOT_NAMES[nameIndex],
    odlUserAvatar: BOT_AVATARS[avatarIndex],
    isBot: true,
  };
}
