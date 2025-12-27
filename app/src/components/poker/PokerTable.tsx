import { useState, useEffect, useRef } from 'react';
import type { PokerGame, PokerPlayer } from '../../types/poker';
import PokerCard from './PokerCard';
import { addBotToGame, removeBotFromGame, executeBotTurn } from '../../services/poker';

interface PokerTableProps {
  game: PokerGame;
  currentUserId: string;
  onAction: (action: 'fold' | 'check' | 'call' | 'raise' | 'all-in', amount?: number) => void;
  onStartHand: () => void;
  onLeave: () => void;
}

// Seat positions around the table - adjusted to fit better on screen
const seatPositions = [
  { top: '82%', left: '50%', transform: 'translate(-50%, -50%)' },   // Bottom center (seat 0 - you)
  { top: '65%', left: '-5%', transform: 'translate(0%, -50%)' },     // Left bottom (seat 1)
  { top: '25%', left: '-5%', transform: 'translate(0%, -50%)' },     // Left top (seat 2)
  { top: '5%', left: '50%', transform: 'translate(-50%, -50%)' },    // Top center (seat 3)
  { top: '25%', left: '105%', transform: 'translate(-100%, -50%)' }, // Right top (seat 4)
  { top: '65%', left: '105%', transform: 'translate(-100%, -50%)' }, // Right bottom (seat 5)
];

export default function PokerTable({
  game,
  currentUserId,
  onAction,
  onStartHand,
  onLeave,
}: PokerTableProps) {
  const currentPlayer = game.players.find((p) => p.odlUser === currentUserId);
  const isCurrentTurn = game.players[game.currentPlayerIndex]?.odlUser === currentUserId;
  const isHost = game.createdBy === currentUserId;
  const canAct = isCurrentTurn && currentPlayer?.status === 'active' &&
                 (game.phase !== 'waiting' && game.phase !== 'showdown' && game.phase !== 'finished');

  const callAmount = currentPlayer ? game.currentBet - currentPlayer.currentBet : 0;
  const canCheck = callAmount === 0;
  const minRaiseTotal = game.currentBet + game.minRaise;
  const maxRaiseTotal = currentPlayer ? currentPlayer.chips + currentPlayer.currentBet : 0;

  const [raiseTotal, setRaiseTotal] = useState(minRaiseTotal);
  const [addingBot, setAddingBot] = useState(false);
  const lastBotTurnKeyRef = useRef('');

  // Track card counts for animation
  const prevCommunityCount = useRef(0);
  const prevHoleCardCounts = useRef<Record<string, number>>({});
  const [animatingCommunity, setAnimatingCommunity] = useState<number[]>([]);
  const [animatingHoleCards, setAnimatingHoleCards] = useState<Record<string, number[]>>({});

  useEffect(() => {
    setRaiseTotal(minRaiseTotal);
  }, [minRaiseTotal, game.phase, game.currentPlayerIndex]);

  // Detect new cards for animation
  useEffect(() => {
    // Community cards - staggered delays for flop (3 cards), turn, river
    if (game.communityCards.length > prevCommunityCount.current) {
      const newIndices: number[] = [];
      for (let i = prevCommunityCount.current; i < game.communityCards.length; i++) {
        newIndices.push(i);
      }
      setAnimatingCommunity(newIndices);
      setTimeout(() => setAnimatingCommunity([]), 1500);
    }
    prevCommunityCount.current = game.communityCards.length;

    // Hole cards - animate all new cards with staggered delays
    const newAnimating: Record<string, number[]> = {};
    game.players.forEach(player => {
      const prevCount = prevHoleCardCounts.current[player.odlUser] || 0;
      if (player.holeCards.length > prevCount) {
        const newIndices: number[] = [];
        for (let i = prevCount; i < player.holeCards.length; i++) {
          newIndices.push(i);
        }
        newAnimating[player.odlUser] = newIndices;
      }
      prevHoleCardCounts.current[player.odlUser] = player.holeCards.length;
    });

    if (Object.keys(newAnimating).length > 0) {
      setAnimatingHoleCards(newAnimating);
      setTimeout(() => setAnimatingHoleCards({}), 1500);
    }
  }, [game.communityCards.length, game.players]);

  // Get current player info for bot turn detection
  const currentTurnPlayer = game.players[game.currentPlayerIndex];
  const currentTurnPlayerId = currentTurnPlayer?.odlUser || '';
  const currentTurnPlayerIsBot = currentTurnPlayer?.isBot || false;
  const currentTurnPlayerStatus = currentTurnPlayer?.status || 'waiting';

  // Handle bot turns
  useEffect(() => {
    // Skip if not in active phase
    if (game.phase === 'waiting' || game.phase === 'showdown' || game.phase === 'finished') {
      return;
    }

    // Skip if not a bot's turn
    if (!currentTurnPlayerIsBot || currentTurnPlayerStatus !== 'active') {
      return;
    }

    // Create a unique key for this bot turn to prevent duplicates
    const botTurnKey = `${game.handNumber}-${game.currentPlayerIndex}-${currentTurnPlayerId}`;
    if (botTurnKey === lastBotTurnKeyRef.current) {
      return; // Already processed this bot turn
    }

    console.log('Bot turn detected:', currentTurnPlayerId, 'key:', botTurnKey);

    // Mark this turn as being processed immediately (ref doesn't cause re-render)
    lastBotTurnKeyRef.current = botTurnKey;

    // Execute bot turn after a delay
    const timeout = setTimeout(async () => {
      try {
        console.log('Executing bot turn for:', currentTurnPlayerId);
        await executeBotTurn(game.id);
        console.log('Bot turn completed');
      } catch (err) {
        console.error('Bot turn error:', err);
      }
    }, 1500 + Math.random() * 1000);

    return () => clearTimeout(timeout);
  }, [game.id, game.phase, game.currentPlayerIndex, game.handNumber, currentTurnPlayerId, currentTurnPlayerIsBot, currentTurnPlayerStatus]);

  const handleAddBot = async () => {
    if (addingBot) return;
    setAddingBot(true);
    try {
      await addBotToGame(game.id);
    } catch (err) {
      console.error('Failed to add bot:', err);
    } finally {
      setAddingBot(false);
    }
  };

  const handleRemoveBot = async (botId: string) => {
    try {
      await removeBotFromGame(game.id, botId);
    } catch (err) {
      console.error('Failed to remove bot:', err);
    }
  };

  const getPlayerAtSeat = (seatNumber: number): PokerPlayer | undefined => {
    return game.players.find((p) => p.seatNumber === seatNumber);
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'pre-flop': return 'Pre-Flop';
      case 'flop': return 'Flop';
      case 'turn': return 'Turn';
      case 'river': return 'River';
      case 'showdown': return 'Showdown';
      case 'waiting': return 'Waiting';
      case 'finished': return 'Hand Complete';
      default: return phase;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-[500px] bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-2xl overflow-hidden p-2">
      {/* Top bar - Phase and Hand number */}
      <div className="flex items-center justify-between px-4 py-1 mb-1">
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          game.phase === 'waiting' ? 'bg-gray-600 text-gray-200' :
          game.phase === 'showdown' || game.phase === 'finished' ? 'bg-purple-600 text-white' :
          'bg-green-600 text-white'
        }`}>
          {getPhaseLabel(game.phase)}
        </div>
        {game.handNumber > 0 && (
          <div className="text-gray-500 text-sm">Hand #{game.handNumber}</div>
        )}
      </div>

      {/* Main table area */}
      <div className="flex-1 flex items-start justify-center px-8 pt-2 pb-16">
        <div className="relative w-full max-w-4xl" style={{ paddingBottom: '35%' }}>
          {/* Table container with padding for seats */}
          <div className="absolute inset-0" style={{ margin: '25px 80px' }}>
            {/* Table outer rim - wood effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-800 via-amber-900 to-amber-950 rounded-[50%] shadow-2xl" />

            {/* Table rail */}
            <div className="absolute inset-[6px] bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 rounded-[50%]" />

            {/* Felt surface */}
            <div className="absolute inset-[12px] bg-gradient-to-br from-green-600 via-green-700 to-green-800 rounded-[50%] shadow-inner">
              {/* Inner border line */}
              <div className="absolute inset-[20px] rounded-[50%] border-2 border-green-500/30" />
            </div>

            {/* Player seats - positioned relative to table */}
            {seatPositions.map((pos, seatNum) => {
              const player = getPlayerAtSeat(seatNum);
              return (
                <PlayerSeat
                  key={seatNum}
                  player={player}
                  position={pos}
                  isCurrentUser={player?.odlUser === currentUserId}
                  isCurrentTurn={game.players[game.currentPlayerIndex]?.seatNumber === seatNum}
                  isHost={player?.odlUser === game.createdBy}
                  animatingCards={player ? (animatingHoleCards[player.odlUser] || []) : []}
                  showCards={
                    player?.odlUser === currentUserId ||
                    game.phase === 'showdown'
                  }
                  gamePhase={game.phase}
                />
              );
            })}

            {/* Center content - Pot and Community Cards */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              {/* Pot display */}
              <div className="bg-black/40 backdrop-blur-sm rounded-xl px-5 py-2 border border-yellow-500/20">
                <p className="text-yellow-400/70 text-[10px] font-medium uppercase tracking-wider text-center">Pot</p>
                <p className="text-white text-xl font-bold text-center">${game.pot.toLocaleString()}</p>
              </div>

              {/* Community Cards */}
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <PokerCard
                    key={i}
                    card={game.communityCards[i]}
                    faceDown={!game.communityCards[i]}
                    small
                    animate={animatingCommunity.includes(i)}
                    dealDelay={animatingCommunity.indexOf(i) >= 0 ? animatingCommunity.indexOf(i) * 250 : 0}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deal New Hand button - fixed bottom left */}
      {(game.phase === 'showdown' || game.phase === 'finished') && isHost && (
        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={onStartHand}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-green-500/30 transition-all transform hover:scale-105 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Deal New Hand
          </button>
        </div>
      )}

      {/* Winners display - fixed bottom right */}
      {game.winners && game.winners.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-gray-900/95 backdrop-blur-md border border-yellow-500/30 rounded-xl shadow-2xl shadow-yellow-500/20 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-1.5">
              <p className="text-black text-xs font-bold uppercase tracking-wider">Winner!</p>
            </div>
            <div className="px-4 py-3">
              {game.winners.map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-black font-bold text-sm">
                    {w.odlUserName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{w.odlUserName}</p>
                    <p className="text-yellow-400 font-bold text-lg">${w.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {game.winners[0]?.hand && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-gray-400 text-xs">{game.winners[0].hand.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waiting state controls - centered at bottom */}
      {game.phase === 'waiting' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex gap-2 items-center">
              {game.players.length >= 2 && isHost && (
                <button
                  onClick={onStartHand}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105"
                >
                  Deal Cards
                </button>
              )}
              {isHost && game.players.length < game.maxPlayers && (
                <button
                  onClick={handleAddBot}
                  disabled={addingBot}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 disabled:scale-100 flex items-center gap-2"
                >
                  <span className="text-lg">🤖</span>
                  {addingBot ? 'Adding...' : 'Add Bot'}
                </button>
              )}
            </div>

            {game.players.length < 2 && (
              <p className="text-gray-400 text-sm">Waiting for more players to join... (or add a bot!)</p>
            )}
            {!isHost && game.players.length >= 2 && (
              <p className="text-gray-400 text-sm">Waiting for host to start...</p>
            )}

            {/* Bot list - only show if there are bots and user is host */}
            {isHost && game.players.filter(p => p.isBot).length > 0 && (
              <div className="flex gap-2 flex-wrap justify-center">
                {game.players.filter(p => p.isBot).map((bot) => (
                  <div key={bot.odlUser} className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 rounded-lg">
                    <span className="text-indigo-300 text-sm font-medium">{bot.odlUserName}</span>
                    <button
                      onClick={() => handleRemoveBot(bot.odlUser)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Action buttons - fixed at bottom center */}
      {canAct && currentPlayer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            {/* Raise slider */}
            {currentPlayer.chips > callAmount && (
              <div className="flex items-center gap-4 bg-white/5 px-5 py-2 rounded-xl border border-white/10">
                <span className="text-gray-400 text-sm">Raise to</span>
                <input
                  type="range"
                  min={minRaiseTotal}
                  max={maxRaiseTotal}
                  value={Math.min(Math.max(raiseTotal, minRaiseTotal), maxRaiseTotal)}
                  onChange={(e) => setRaiseTotal(Number(e.target.value))}
                  className="w-32 accent-green-500"
                />
                <span className="text-green-400 font-bold min-w-[70px]">${raiseTotal}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => onAction('fold')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Fold
              </button>

              {canCheck ? (
                <button
                  onClick={() => onAction('check')}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Check
                </button>
              ) : (
                <button
                  onClick={() => onAction('call')}
                  disabled={currentPlayer.chips < callAmount}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Call ${Math.min(callAmount, currentPlayer.chips)}
                </button>
              )}

              {currentPlayer.chips > callAmount && (
                <button
                  onClick={() => onAction('raise', raiseTotal)}
                  disabled={raiseTotal < minRaiseTotal}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Raise ${raiseTotal}
                </button>
              )}

              <button
                onClick={() => onAction('all-in')}
                className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold shadow-lg transition-all"
              >
                All In ${currentPlayer.chips}
              </button>
            </div>
          </div>
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

// Player seat component - compact design
function PlayerSeat({
  player,
  position,
  isCurrentUser,
  isCurrentTurn,
  isHost,
  showCards,
  gamePhase,
  animatingCards,
}: {
  player?: PokerPlayer;
  position: { top: string; left: string; transform: string };
  isCurrentUser: boolean;
  isCurrentTurn: boolean;
  isHost: boolean;
  showCards: boolean;
  gamePhase: string;
  animatingCards: number[];
}) {
  const isBot = player?.isBot;
  if (!player) {
    return (
      <div className="absolute" style={position}>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center bg-black/20">
          <span className="text-white/20 text-[10px]">Empty</span>
        </div>
      </div>
    );
  }

  const isFolded = player.status === 'folded';
  const isAllIn = player.status === 'all-in';
  const isActive = player.status === 'active' && gamePhase !== 'waiting';

  return (
    <div className="absolute" style={position}>
      <div className={`flex flex-col items-center ${isFolded ? 'opacity-40' : ''}`}>
        {/* Player cards */}
        {(isActive || isAllIn || isFolded) && (
          <div className="flex gap-0.5 mb-1">
            {player.holeCards.length > 0 ? (
              player.holeCards.map((card, i) => (
                <PokerCard
                  key={i}
                  card={showCards ? card : undefined}
                  animate={animatingCards.includes(i)}
                  dealDelay={animatingCards.indexOf(i) >= 0 ? animatingCards.indexOf(i) * 200 : 0}
                  faceDown={!showCards}
                  small
                />
              ))
            ) : (
              <>
                <PokerCard faceDown small />
                <PokerCard faceDown small />
              </>
            )}
          </div>
        )}

        {/* Player info box */}
        <div
          className={`relative px-3 py-1.5 rounded-lg text-center min-w-[80px] ${
            isCurrentTurn
              ? 'bg-yellow-500 text-black ring-2 ring-yellow-300 shadow-lg shadow-yellow-500/30'
              : isCurrentUser
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-white border border-gray-700'
          }`}
        >
          {/* Host crown */}
          {isHost && (
            <span className="absolute -top-2 -right-1 text-sm">👑</span>
          )}

          {/* Avatar + Name */}
          <div className="flex items-center justify-center gap-1.5">
            {isBot ? (
              <span className="text-sm">🤖</span>
            ) : player.odlUserAvatar ? (
              <img src={player.odlUserAvatar} alt="" className="w-4 h-4 rounded-full" />
            ) : (
              <div className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                isCurrentTurn ? 'bg-black/20' : 'bg-white/20'
              }`}>
                {player.odlUserName?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs font-bold truncate max-w-[60px]">{player.odlUserName}</span>
          </div>

          {/* Chips */}
          <div className={`text-xs font-medium ${isCurrentTurn ? 'text-black/70' : 'text-gray-400'}`}>
            ${player.chips.toLocaleString()}
          </div>

          {/* Role badges */}
          <div className="flex gap-0.5 justify-center mt-0.5">
            {player.isDealer && (
              <span className="px-1 py-0.5 bg-white text-black text-[8px] font-bold rounded">D</span>
            )}
            {player.isSmallBlind && (
              <span className="px-1 py-0.5 bg-blue-500 text-white text-[8px] font-bold rounded">SB</span>
            )}
            {player.isBigBlind && (
              <span className="px-1 py-0.5 bg-blue-700 text-white text-[8px] font-bold rounded">BB</span>
            )}
          </div>
        </div>

        {/* Current bet */}
        {player.currentBet > 0 && (
          <div className="mt-1 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded-full">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="text-yellow-400 text-[10px] font-bold">${player.currentBet}</span>
          </div>
        )}

        {/* Last action badge */}
        {player.lastAction && (
          <span className={`mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
            player.lastAction === 'fold' ? 'bg-red-500/20 text-red-400' :
            player.lastAction === 'check' ? 'bg-blue-500/20 text-blue-400' :
            player.lastAction === 'call' ? 'bg-blue-500/20 text-blue-400' :
            player.lastAction === 'raise' ? 'bg-green-500/20 text-green-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
            {player.lastAction}
          </span>
        )}

        {/* All-in indicator */}
        {isAllIn && !player.lastAction && (
          <span className="mt-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
            All In
          </span>
        )}

        {/* Bot thinking indicator */}
        {isBot && isCurrentTurn && player.status === 'active' && (
          <span className="mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 flex items-center gap-1">
            <span className="animate-pulse">Thinking...</span>
          </span>
        )}
      </div>
    </div>
  );
}
