import { useState } from 'react';
import type { MahjongGame, MahjongPlayer, MahjongTile, MahjongAction } from '../../types/mahjong';
import { getTileDisplay, canCallPong, canCallKong, canDeclareMahjong } from '../../utils/mahjongLogic';

interface MahjongTableProps {
  game: MahjongGame;
  currentUserId: string;
  onAction: (action: MahjongAction, tileId?: string) => void;
  onStartRound: () => void;
  onLeave: () => void;
  onAddBot: () => void;
}

const WIND_NAMES = ['East', 'South', 'West', 'North'];

export default function MahjongTable({
  game,
  currentUserId,
  onAction,
  onStartRound,
  onLeave,
  onAddBot,
}: MahjongTableProps) {
  const currentPlayer = game.players.find((p) => p.odlUser === currentUserId);
  const currentPlayerIndex = game.players.findIndex((p) => p.odlUser === currentUserId);
  const isHost = game.createdBy === currentUserId;
  const isMyTurn = game.currentPlayerIndex === currentPlayerIndex;
  const [selectedTile, setSelectedTile] = useState<string | null>(null);

  // Check if player can make calls
  const canPong = game.lastDiscard && currentPlayer && !isMyTurn &&
    canCallPong(currentPlayer.hand, game.lastDiscard);
  const canKong = game.lastDiscard && currentPlayer && !isMyTurn &&
    canCallKong(currentPlayer.hand, game.lastDiscard);
  const canMahjong = currentPlayer &&
    canDeclareMahjong(currentPlayer.hand, currentPlayer.melds, isMyTurn ? undefined : game.lastDiscard);

  // Need to draw if it's my turn and I have 13 tiles (or fewer with melds)
  const tilesInHand = currentPlayer?.hand.length || 0;
  const meldTiles = (currentPlayer?.melds || []).reduce((sum, m) => sum + m.tiles.length, 0);
  const expectedTiles = 14 - meldTiles + (currentPlayer?.melds.filter(m => m.type === 'kong').length || 0);
  const needToDraw = isMyTurn && tilesInHand < expectedTiles && game.phase === 'playing';
  const needToDiscard = isMyTurn && tilesInHand >= expectedTiles && game.phase === 'playing';

  const handleTileClick = (tileId: string) => {
    if (!needToDiscard) return;

    if (selectedTile === tileId) {
      // Double click to discard
      onAction('discard', tileId);
      setSelectedTile(null);
    } else {
      setSelectedTile(tileId);
    }
  };

  const handleDiscard = () => {
    if (selectedTile && needToDiscard) {
      onAction('discard', selectedTile);
      setSelectedTile(null);
    }
  };

  // Get other players in order (relative to current player)
  const getOtherPlayers = () => {
    const others: (MahjongPlayer | null)[] = [null, null, null];
    game.players.forEach((p) => {
      if (p.odlUser !== currentUserId) {
        const relativePos = (p.seatNumber - currentPlayerIndex + 4) % 4;
        if (relativePos > 0 && relativePos <= 3) {
          others[relativePos - 1] = p;
        }
      }
    });
    return others;
  };

  const otherPlayers = getOtherPlayers();

  return (
    <div className="flex flex-col h-full min-h-[700px] bg-gradient-to-b from-gray-900 via-emerald-900/20 to-gray-900 rounded-2xl overflow-hidden p-4">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
          game.phase === 'waiting' ? 'bg-gray-600 text-gray-200' :
          game.phase === 'finished' ? 'bg-purple-600 text-white' :
          'bg-green-600 text-white'
        }`}>
          {game.phase === 'waiting' ? 'Waiting for Players' :
           game.phase === 'finished' ? 'Round Complete' : 'Playing'}
        </div>
        <div className="text-gray-400 text-sm">
          Round {game.roundNumber} • {game.roundWind.charAt(0).toUpperCase() + game.roundWind.slice(1)} Wind
        </div>
      </div>

      {/* Main table area */}
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-3xl aspect-square">
          {/* Table background */}
          <div className="absolute inset-8 bg-gradient-to-br from-emerald-800 to-emerald-900 rounded-2xl shadow-2xl border-8 border-amber-900/50">
            {/* Center info */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/40 rounded-xl p-4 text-center">
                {game.lastDiscard && (
                  <div className="mb-2">
                    <p className="text-gray-400 text-xs mb-1">Last Discard</p>
                    <MahjongTileDisplay tile={game.lastDiscard} size="large" />
                  </div>
                )}
                {game.phase === 'playing' && (
                  <p className="text-white text-sm">
                    {isMyTurn ? 'Your Turn' : `${game.players[game.currentPlayerIndex]?.odlUserName}'s Turn`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Player positions */}
          {/* Bottom - Current Player */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-xl">
            <PlayerArea
              player={currentPlayer}
              position="bottom"
              isCurrentUser={true}
              isCurrentTurn={isMyTurn}
              showHand={true}
              selectedTile={selectedTile}
              onTileClick={handleTileClick}
            />
          </div>

          {/* Right Player */}
          {otherPlayers[0] && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <PlayerArea
                player={otherPlayers[0]}
                position="right"
                isCurrentUser={false}
                isCurrentTurn={game.currentPlayerIndex === otherPlayers[0].seatNumber}
                showHand={false}
              />
            </div>
          )}

          {/* Top Player */}
          {otherPlayers[1] && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <PlayerArea
                player={otherPlayers[1]}
                position="top"
                isCurrentUser={false}
                isCurrentTurn={game.currentPlayerIndex === otherPlayers[1].seatNumber}
                showHand={false}
              />
            </div>
          )}

          {/* Left Player */}
          {otherPlayers[2] && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              <PlayerArea
                player={otherPlayers[2]}
                position="left"
                isCurrentUser={false}
                isCurrentTurn={game.currentPlayerIndex === otherPlayers[2].seatNumber}
                showHand={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {game.phase === 'playing' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-2 bg-gray-900/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 shadow-2xl">
            {needToDraw && (
              <button
                onClick={() => onAction('draw')}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Draw Tile
              </button>
            )}

            {needToDiscard && selectedTile && (
              <button
                onClick={handleDiscard}
                className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Discard Selected
              </button>
            )}

            {canPong && (
              <button
                onClick={() => onAction('pong')}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Pong!
              </button>
            )}

            {canKong && (
              <button
                onClick={() => onAction('kong')}
                className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                Kong!
              </button>
            )}

            {canMahjong && (
              <button
                onClick={() => onAction('mahjong')}
                className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-white rounded-xl font-bold shadow-lg transition-all animate-pulse"
              >
                Mahjong!
              </button>
            )}
          </div>
        </div>
      )}

      {/* Waiting state controls */}
      {game.phase === 'waiting' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3">
              {game.players.length === 4 && isHost && (
                <button
                  onClick={onStartRound}
                  className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  Start Game
                </button>
              )}
              {game.players.length < 4 && isHost && (
                <button
                  onClick={onAddBot}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all"
                >
                  + Add Bot
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              {[0, 1, 2, 3].map((seat) => {
                const player = game.players.find((p) => p.seatNumber === seat);
                const isBot = player?.isBot || player?.odlUser?.startsWith('bot_');
                return (
                  <div
                    key={seat}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      player
                        ? isBot
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-green-500/20 text-green-400'
                        : 'bg-gray-700/50 text-gray-500'
                    }`}
                  >
                    {WIND_NAMES[seat]}: {player?.odlUserName || 'Empty'}
                    {isBot && ' (Bot)'}
                  </div>
                );
              })}
            </div>
            <p className="text-gray-400 text-sm">
              {game.players.length}/4 players - {4 - game.players.length} more needed
            </p>
          </div>
        </div>
      )}

      {/* Game finished */}
      {game.phase === 'finished' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex flex-col items-center gap-3 bg-gray-900/95 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
            {game.winner && (
              <div className="text-center">
                <p className="text-yellow-400 font-bold text-lg">
                  {game.players.find((p) => p.odlUser === game.winner)?.odlUserName} wins!
                </p>
              </div>
            )}
            {isHost && (
              <button
                onClick={onStartRound}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                New Round
              </button>
            )}
          </div>
        </div>
      )}

      {/* Leave button */}
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

// Player area component
function PlayerArea({
  player,
  position,
  isCurrentUser,
  isCurrentTurn,
  showHand,
  selectedTile,
  onTileClick,
}: {
  player?: MahjongPlayer;
  position: 'top' | 'bottom' | 'left' | 'right';
  isCurrentUser: boolean;
  isCurrentTurn: boolean;
  showHand: boolean;
  selectedTile?: string | null;
  onTileClick?: (tileId: string) => void;
}) {
  if (!player) {
    return (
      <div className="p-4 bg-black/20 rounded-xl text-center">
        <p className="text-gray-500 text-sm">Waiting...</p>
      </div>
    );
  }

  const isVertical = position === 'left' || position === 'right';
  const isBot = player.isBot || player.odlUser?.startsWith('bot_');

  return (
    <div className={`flex flex-col items-center gap-2 ${isVertical ? 'w-24' : ''}`}>
      {/* Player info */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isCurrentTurn ? 'bg-yellow-500 text-black' :
        isBot ? 'bg-purple-600 text-white' :
        isCurrentUser ? 'bg-blue-600 text-white' :
        'bg-gray-800 text-white'
      }`}>
        <span className="text-xs font-medium">{WIND_NAMES[player.seatNumber]}</span>
        <span className="font-bold text-sm">{player.odlUserName}</span>
        {isCurrentUser && <span className="text-xs opacity-70">(You)</span>}
        {isBot && !isCurrentUser && <span className="text-xs opacity-70">(Bot)</span>}
      </div>

      <div className="text-gray-400 text-xs">
        {player.score.toLocaleString()} pts
      </div>

      {/* Melds */}
      {player.melds.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center">
          {player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5">
              {meld.tiles.map((tile, j) => (
                <MahjongTileDisplay key={j} tile={tile} size="small" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hand */}
      {showHand && player.hand.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center max-w-xl">
          {player.hand.map((tile) => (
            <div
              key={tile.id}
              onClick={() => onTileClick?.(tile.id)}
              className={`cursor-pointer transition-transform ${
                selectedTile === tile.id ? '-translate-y-2 ring-2 ring-yellow-400' : 'hover:-translate-y-1'
              }`}
            >
              <MahjongTileDisplay tile={tile} size="medium" />
            </div>
          ))}
        </div>
      )}

      {/* Hidden hand indicator */}
      {!showHand && player.hand.length > 0 && (
        <div className={`flex gap-0.5 ${isVertical ? 'flex-col' : ''}`}>
          {Array(Math.min(player.hand.length, 13)).fill(0).map((_, i) => (
            <div key={i} className="w-6 h-8 bg-gradient-to-br from-rose-700 to-rose-900 rounded border border-rose-600" />
          ))}
        </div>
      )}

      {/* Discards */}
      {player.discards.length > 0 && (
        <div className="flex gap-0.5 flex-wrap justify-center max-w-xs mt-1">
          {player.discards.slice(-8).map((tile, i) => (
            <MahjongTileDisplay key={i} tile={tile} size="tiny" />
          ))}
        </div>
      )}
    </div>
  );
}

// Mahjong tile display component
function MahjongTileDisplay({
  tile,
  size = 'medium',
}: {
  tile: MahjongTile;
  size?: 'tiny' | 'small' | 'medium' | 'large';
}) {
  const { char, color } = getTileDisplay(tile);

  const sizeClasses = {
    tiny: 'w-5 h-7 text-[8px]',
    small: 'w-6 h-8 text-xs',
    medium: 'w-8 h-11 text-sm',
    large: 'w-12 h-16 text-lg',
  };

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-b from-white to-gray-100 rounded border border-gray-300 shadow flex items-center justify-center font-bold ${color}`}>
      {char}
    </div>
  );
}
