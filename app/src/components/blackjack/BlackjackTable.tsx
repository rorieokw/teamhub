import { useState } from 'react';
import type { BlackjackGame, BlackjackPlayer, BlackjackAction, Card } from '../../types/blackjack';
import { getHandValueDisplay, canSplit, canDoubleDown } from '../../utils/blackjackLogic';

interface BlackjackTableProps {
  game: BlackjackGame;
  currentUserId: string;
  onAction: (action: BlackjackAction) => void;
  onPlaceBet: (amount: number) => void;
  onStartRound: () => void;
  onLeave: () => void;
}

export default function BlackjackTable({
  game,
  currentUserId,
  onAction,
  onPlaceBet,
  onStartRound,
  onLeave,
}: BlackjackTableProps) {
  const currentPlayer = game.players.find((p) => p.odlUser === currentUserId);
  const isHost = game.createdBy === currentUserId;
  const isMyTurn = game.phase === 'playing' && game.players[game.currentPlayerIndex]?.odlUser === currentUserId;
  const isBettingPhase = game.phase === 'betting';
  const canBet = isBettingPhase && currentPlayer?.status === 'betting';

  const [betAmount, setBetAmount] = useState(game.minBet);

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'waiting': return 'Waiting for Players';
      case 'betting': return 'Place Your Bets';
      case 'dealing': return 'Dealing Cards';
      case 'playing': return 'Your Turn';
      case 'dealer-turn': return "Dealer's Turn";
      case 'payout': return 'Round Complete';
      case 'finished': return 'Round Complete';
      default: return phase;
    }
  };

  const myHand = currentPlayer?.hand || [];
  const canPlayerSplit = currentPlayer && canSplit(myHand, currentPlayer.chips, currentPlayer.currentBet);
  const canPlayerDouble = currentPlayer && canDoubleDown(myHand, currentPlayer.chips, currentPlayer.currentBet);

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-gradient-to-b from-gray-900 via-emerald-900/30 to-gray-900 rounded-2xl overflow-hidden p-4">
      {/* Top bar - Phase and Round number */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          game.phase === 'waiting' ? 'bg-gray-600 text-gray-200' :
          game.phase === 'betting' ? 'bg-yellow-600 text-white' :
          game.phase === 'playing' ? 'bg-green-600 text-white' :
          'bg-purple-600 text-white'
        }`}>
          {getPhaseLabel(game.phase)}
        </div>
        {game.roundNumber > 0 && (
          <div className="text-gray-500 text-sm">Round #{game.roundNumber}</div>
        )}
      </div>

      {/* Main table area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Dealer Area */}
        <div className="mb-8">
          <div className="text-center mb-2">
            <span className="text-gray-400 text-sm font-medium">Dealer</span>
            {game.dealerHand.length > 0 && game.dealerRevealed && (
              <span className="ml-2 text-white font-bold">
                {getHandValueDisplay(game.dealerHand)}
              </span>
            )}
          </div>
          <div className="flex gap-2 justify-center">
            {game.dealerHand.length > 0 ? (
              game.dealerHand.map((card, i) => (
                <BlackjackCard key={i} card={card} />
              ))
            ) : (
              <>
                <CardPlaceholder />
                <CardPlaceholder />
              </>
            )}
            {!game.dealerRevealed && game.dealerHand.length === 1 && (
              <BlackjackCard faceDown />
            )}
          </div>
        </div>

        {/* Table felt */}
        <div className="w-full max-w-4xl bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-[100px] py-12 px-8 shadow-2xl border-8 border-amber-900/50 relative">
          {/* Player seats */}
          <div className="flex justify-center gap-4 flex-wrap">
            {game.players.map((player, index) => (
              <PlayerSeat
                key={player.odlUser}
                player={player}
                isCurrentUser={player.odlUser === currentUserId}
                isCurrentTurn={game.phase === 'playing' && game.currentPlayerIndex === index}
                showCards={game.phase !== 'waiting' && game.phase !== 'betting'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Betting UI - fixed at bottom */}
      {canBet && currentPlayer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <p className="text-gray-400 text-sm">Place your bet (${game.minBet} - ${game.maxBet})</p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={game.minBet}
                max={Math.min(game.maxBet, currentPlayer.chips)}
                step={10}
                value={betAmount}
                onChange={(e) => setBetAmount(Number(e.target.value))}
                className="w-40 accent-yellow-500"
              />
              <span className="text-yellow-400 font-bold min-w-[70px]">${betAmount}</span>
            </div>
            <div className="flex gap-2">
              {[game.minBet, 50, 100, 200].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(Math.min(amount, currentPlayer.chips))}
                  disabled={amount > currentPlayer.chips}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-lg text-sm font-medium transition-all"
                >
                  ${amount}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPlaceBet(betAmount)}
              className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg transition-all"
            >
              Place Bet ${betAmount}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons - fixed at bottom */}
      {isMyTurn && currentPlayer?.status === 'playing' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="text-center mb-2">
              <p className="text-gray-400 text-sm">Your hand: <span className="text-white font-bold">{getHandValueDisplay(myHand)}</span></p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => onAction('hit')}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Hit
              </button>
              <button
                onClick={() => onAction('stand')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Stand
              </button>
              {canPlayerDouble && (
                <button
                  onClick={() => onAction('double')}
                  className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Double
                </button>
              )}
              {canPlayerSplit && (
                <button
                  onClick={() => onAction('split')}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Split
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting state controls */}
      {game.phase === 'waiting' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            {game.players.length >= 1 && isHost && (
              <button
                onClick={onStartRound}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Start Round
              </button>
            )}
            <p className="text-gray-400 text-sm">
              {game.players.length} player{game.players.length !== 1 ? 's' : ''} at the table
            </p>
          </div>
        </div>
      )}

      {/* Round complete - New Round button */}
      {(game.phase === 'finished' || game.phase === 'payout') && isHost && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={onStartRound}
            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            New Round
          </button>
        </div>
      )}

      {/* Leave button - fixed top right */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-gray-800/90 hover:bg-red-600/90 text-gray-400 hover:text-white rounded-xl text-sm transition-all border border-white/10"
        >
          Leave Table
        </button>
      </div>
    </div>
  );
}

// Card component for blackjack
function BlackjackCard({ card, faceDown }: { card?: Card; faceDown?: boolean }) {
  if (faceDown || !card) {
    return (
      <div className="w-16 h-24 rounded-lg bg-gradient-to-br from-blue-800 to-blue-900 border-2 border-blue-600 shadow-lg flex items-center justify-center">
        <div className="w-12 h-18 rounded border border-blue-500/50 bg-blue-700/50 flex items-center justify-center">
          <span className="text-blue-400 text-2xl">?</span>
        </div>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const suitSymbol = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit];

  return (
    <div className="w-16 h-24 rounded-lg bg-white shadow-lg flex flex-col items-center justify-between p-1.5 border border-gray-200">
      <div className={`text-sm font-bold ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </div>
      <div className={`text-2xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {suitSymbol}
      </div>
      <div className={`text-sm font-bold rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
      </div>
    </div>
  );
}

// Card placeholder
function CardPlaceholder() {
  return (
    <div className="w-16 h-24 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center">
      <span className="text-white/20 text-xs">Card</span>
    </div>
  );
}

// Player seat component
function PlayerSeat({
  player,
  isCurrentUser,
  isCurrentTurn,
  showCards,
}: {
  player: BlackjackPlayer;
  isCurrentUser: boolean;
  isCurrentTurn: boolean;
  showCards: boolean;
}) {
  const handValue = player.hand.length > 0 ? getHandValueDisplay(player.hand) : '';

  const statusColors: Record<string, string> = {
    waiting: 'text-gray-400',
    betting: 'text-yellow-400',
    playing: 'text-green-400',
    standing: 'text-blue-400',
    busted: 'text-red-400',
    blackjack: 'text-purple-400',
    won: 'text-green-400',
    lost: 'text-red-400',
    push: 'text-yellow-400',
  };

  return (
    <div className={`flex flex-col items-center p-4 rounded-xl ${
      isCurrentTurn ? 'bg-yellow-500/20 ring-2 ring-yellow-400' : 'bg-black/20'
    } ${isCurrentUser ? 'ring-2 ring-purple-500/50' : ''}`}>
      {/* Player cards */}
      {showCards && player.hand.length > 0 && (
        <div className="flex gap-1 mb-2 -mt-8">
          {player.hand.map((card, i) => (
            <BlackjackCard key={i} card={card} />
          ))}
        </div>
      )}

      {/* Split hand */}
      {showCards && player.splitHand && player.splitHand.length > 0 && (
        <div className="flex gap-1 mb-2">
          {player.splitHand.map((card, i) => (
            <BlackjackCard key={`split-${i}`} card={card} />
          ))}
        </div>
      )}

      {/* Player info */}
      <div className="text-center">
        <div className="flex items-center gap-2 mb-1">
          {player.odlUserAvatar ? (
            <img src={player.odlUserAvatar} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
              {player.odlUserName?.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-white font-medium text-sm">{player.odlUserName}</span>
          {isCurrentUser && <span className="text-purple-400 text-xs">(You)</span>}
        </div>

        <div className="text-gray-400 text-xs mb-1">
          ${player.chips.toLocaleString()} chips
        </div>

        {player.currentBet > 0 && (
          <div className="text-yellow-400 text-sm font-bold mb-1">
            Bet: ${player.currentBet}
          </div>
        )}

        {showCards && handValue && (
          <div className="text-white font-bold text-sm mb-1">
            {handValue}
          </div>
        )}

        <div className={`text-xs font-medium uppercase ${statusColors[player.status] || 'text-gray-400'}`}>
          {player.status === 'blackjack' ? 'BLACKJACK!' : player.status}
        </div>
      </div>
    </div>
  );
}
