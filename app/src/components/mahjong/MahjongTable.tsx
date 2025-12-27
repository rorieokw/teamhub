import { useState } from 'react';
import type { MahjongGame, MahjongPlayer, MahjongAction } from '../../types/mahjong';
import { canCallPong, canCallKong, canDeclareMahjong, sortTiles } from '../../utils/mahjongLogic';
import MahjongTile from './MahjongTile';

interface MahjongTableProps {
  game: MahjongGame;
  currentUserId: string;
  onAction: (action: MahjongAction, tileId?: string) => void;
  onStartRound: () => void;
  onLeave: () => void;
  onAddBot: () => void;
}

const WIND_NAMES = ['East', 'South', 'West', 'North'];
const WIND_CHARS = ['東', '南', '西', '北'];

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

  // Need to draw if it's my turn and I have 13 tiles
  const tilesInHand = currentPlayer?.hand.length || 0;
  const meldTiles = (currentPlayer?.melds || []).reduce((sum, m) => sum + m.tiles.length, 0);
  const expectedTiles = 14 - meldTiles + (currentPlayer?.melds.filter(m => m.type === 'kong').length || 0);
  const needToDraw = isMyTurn && tilesInHand < expectedTiles && game.phase === 'playing';
  const needToDiscard = isMyTurn && tilesInHand >= expectedTiles && game.phase === 'playing';

  const handleTileClick = (tileId: string) => {
    if (!needToDiscard) return;
    if (selectedTile === tileId) {
      onAction('discard', tileId);
      setSelectedTile(null);
    } else {
      setSelectedTile(tileId);
    }
  };

  // Get players in relative positions
  const getRelativePlayers = () => {
    const positions: (MahjongPlayer | null)[] = [null, null, null, null];
    game.players.forEach((p) => {
      const relativePos = (p.seatNumber - currentPlayerIndex + 4) % 4;
      positions[relativePos] = p;
    });
    return positions; // [you, right, across, left]
  };

  const [you, rightPlayer, acrossPlayer, leftPlayer] = getRelativePlayers();

  // Collect all discards for the center pool
  const allDiscards = game.players.flatMap(p => p.discards);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            game.phase === 'waiting' ? 'bg-yellow-500/20 text-yellow-400' :
            game.phase === 'finished' ? 'bg-purple-500/20 text-purple-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {game.phase === 'waiting' ? 'WAITING' : game.phase === 'finished' ? 'FINISHED' : 'PLAYING'}
          </span>
          <span className="text-gray-400 text-sm">
            Round {game.roundNumber} • {WIND_CHARS[['east', 'south', 'west', 'north'].indexOf(game.roundWind)]} Wind
          </span>
          <span className="text-gray-500 text-sm">
            Wall: {game.wall.length} tiles
          </span>
        </div>
        <button
          onClick={onLeave}
          className="px-4 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          Leave
        </button>
      </div>

      {/* Main game area */}
      <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">
        {/* Top player (across) */}
        <div className="flex justify-center">
          <OpponentArea
            player={acrossPlayer}
            position="top"
            isCurrentTurn={acrossPlayer ? game.currentPlayerIndex === acrossPlayer.seatNumber : false}
          />
        </div>

        {/* Middle row: Left player, Center (discard pool), Right player */}
        <div className="flex-1 flex items-center gap-4 min-h-0">
          {/* Left player */}
          <div className="flex-shrink-0">
            <OpponentArea
              player={leftPlayer}
              position="left"
              isCurrentTurn={leftPlayer ? game.currentPlayerIndex === leftPlayer.seatNumber : false}
            />
          </div>

          {/* Center - Discard Pool */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-emerald-900/50 rounded-xl p-4 border border-emerald-700/50 min-w-[280px] max-w-[400px]">
              {/* Last discard highlight */}
              {game.lastDiscard && game.phase === 'playing' && (
                <div className="flex items-center justify-center mb-3 pb-3 border-b border-emerald-700/50">
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 text-xs">Last Discard:</span>
                    <div className="ring-2 ring-yellow-400 rounded-md animate-pulse">
                      <MahjongTile tile={game.lastDiscard} size="md" />
                    </div>
                  </div>
                </div>
              )}

              {/* Discard pool grid */}
              <div className="flex flex-wrap gap-1 justify-center max-h-32 overflow-y-auto">
                {allDiscards.length === 0 ? (
                  <p className="text-emerald-600 text-sm py-4">No discards yet</p>
                ) : (
                  allDiscards.slice(0, -1).map((tile, i) => (
                    <MahjongTile key={`discard-${i}`} tile={tile} size="xs" />
                  ))
                )}
              </div>

              {/* Turn indicator */}
              {game.phase === 'playing' && (
                <div className="mt-3 pt-3 border-t border-emerald-700/50 text-center">
                  <span className={`text-sm font-medium ${isMyTurn ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {isMyTurn ? '🎯 Your Turn' : `${game.players[game.currentPlayerIndex]?.odlUserName}'s Turn`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right player */}
          <div className="flex-shrink-0">
            <OpponentArea
              player={rightPlayer}
              position="right"
              isCurrentTurn={rightPlayer ? game.currentPlayerIndex === rightPlayer.seatNumber : false}
            />
          </div>
        </div>

        {/* Bottom - Your hand */}
        {you && (
          <div className="flex-shrink-0">
            <PlayerHand
              player={you}
              isMyTurn={isMyTurn}
              needToDiscard={needToDiscard}
              selectedTile={selectedTile}
              onTileClick={handleTileClick}
            />
          </div>
        )}
      </div>

      {/* Action bar */}
      <ActionBar
        game={game}
        isHost={isHost}
        isMyTurn={isMyTurn}
        needToDraw={needToDraw}
        needToDiscard={needToDiscard}
        selectedTile={selectedTile}
        canPong={canPong || false}
        canKong={canKong || false}
        canMahjong={canMahjong || false}
        onAction={onAction}
        onStartRound={onStartRound}
        onAddBot={onAddBot}
        setSelectedTile={setSelectedTile}
      />
    </div>
  );
}

// Opponent display component
function OpponentArea({
  player,
  position,
  isCurrentTurn,
}: {
  player: MahjongPlayer | null;
  position: 'top' | 'left' | 'right';
  isCurrentTurn: boolean;
}) {
  if (!player) {
    return (
      <div className={`flex items-center justify-center ${position === 'top' ? 'h-24' : 'w-24 h-40'}`}>
        <div className="bg-white/5 rounded-lg p-4 text-gray-600 text-sm">
          Empty Seat
        </div>
      </div>
    );
  }

  const isBot = player.isBot || player.odlUser?.startsWith('bot_');
  const isVertical = position === 'left' || position === 'right';

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-col'} items-center gap-2`}>
      {/* Player info */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
        isCurrentTurn ? 'bg-yellow-500 text-black' :
        isBot ? 'bg-purple-600/80 text-white' :
        'bg-gray-700/80 text-white'
      }`}>
        <span className="text-xs font-bold">{WIND_CHARS[player.seatNumber]}</span>
        <span className="text-sm font-medium truncate max-w-[80px]">{player.odlUserName}</span>
        {isBot && <span className="text-xs opacity-70">🤖</span>}
      </div>

      <div className="text-gray-400 text-xs">{player.score.toLocaleString()} pts</div>

      {/* Exposed melds */}
      {player.melds.length > 0 && (
        <div className="flex gap-1 flex-wrap justify-center">
          {player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 bg-black/20 rounded p-0.5">
              {meld.tiles.map((tile, j) => (
                <MahjongTile key={j} tile={tile} size="xs" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hidden hand (face-down tiles) */}
      <div className={`flex gap-0.5 ${isVertical ? 'flex-col' : ''}`}>
        {Array(Math.min(player.hand.length, 13)).fill(0).map((_, i) => (
          <MahjongTile key={i} tile={{ id: `hidden-${i}`, suit: 'character', value: 1 }} size="xs" faceDown />
        ))}
      </div>
    </div>
  );
}

// Player's hand component
function PlayerHand({
  player,
  isMyTurn,
  needToDiscard,
  selectedTile,
  onTileClick,
}: {
  player: MahjongPlayer;
  isMyTurn: boolean;
  needToDiscard: boolean;
  selectedTile: string | null;
  onTileClick: (tileId: string) => void;
}) {
  const sortedHand = sortTiles(player.hand);

  return (
    <div className={`bg-black/30 rounded-xl p-4 border ${isMyTurn ? 'border-yellow-500/50' : 'border-white/10'}`}>
      {/* Player info bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-bold ${isMyTurn ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-white'}`}>
            {WIND_CHARS[player.seatNumber]} {WIND_NAMES[player.seatNumber]}
          </span>
          <span className="text-white font-medium">{player.odlUserName}</span>
          <span className="text-yellow-400 text-sm">({player.score.toLocaleString()} pts)</span>
        </div>
        {needToDiscard && (
          <span className="text-yellow-400 text-sm animate-pulse">
            Select a tile to discard (click twice)
          </span>
        )}
      </div>

      {/* Melds */}
      {player.melds.length > 0 && (
        <div className="flex gap-2 mb-3 pb-3 border-b border-white/10">
          <span className="text-gray-500 text-xs self-center">Melds:</span>
          {player.melds.map((meld, i) => (
            <div key={i} className="flex gap-0.5 bg-white/5 rounded p-1">
              {meld.tiles.map((tile, j) => (
                <MahjongTile key={j} tile={tile} size="sm" />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Hand tiles - grouped by suit */}
      <div className="flex gap-1 flex-wrap justify-center">
        {sortedHand.map((tile, index) => {
          // Add visual separator between suits
          const prevTile = sortedHand[index - 1];
          const showSeparator = prevTile && prevTile.suit !== tile.suit;

          return (
            <div key={tile.id} className="flex items-end">
              {showSeparator && <div className="w-2" />}
              <MahjongTile
                tile={tile}
                size="md"
                selected={selectedTile === tile.id}
                onClick={needToDiscard ? () => onTileClick(tile.id) : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Action bar component
function ActionBar({
  game,
  isHost,
  isMyTurn,
  needToDraw,
  needToDiscard,
  selectedTile,
  canPong,
  canKong,
  canMahjong,
  onAction,
  onStartRound,
  onAddBot,
  setSelectedTile,
}: {
  game: MahjongGame;
  isHost: boolean;
  isMyTurn: boolean;
  needToDraw: boolean;
  needToDiscard: boolean;
  selectedTile: string | null;
  canPong: boolean;
  canKong: boolean;
  canMahjong: boolean;
  onAction: (action: MahjongAction, tileId?: string) => void;
  onStartRound: () => void;
  onAddBot: () => void;
  setSelectedTile: (id: string | null) => void;
}) {
  // Waiting phase
  if (game.phase === 'waiting') {
    return (
      <div className="px-4 py-3 bg-black/40 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((seat) => {
              const player = game.players.find((p) => p.seatNumber === seat);
              const isBot = player?.isBot || player?.odlUser?.startsWith('bot_');
              return (
                <span
                  key={seat}
                  className={`px-2 py-1 rounded text-xs ${
                    player
                      ? isBot ? 'bg-purple-500/30 text-purple-400' : 'bg-green-500/30 text-green-400'
                      : 'bg-gray-700/50 text-gray-500'
                  }`}
                >
                  {WIND_CHARS[seat]}: {player?.odlUserName || 'Empty'}
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {game.players.length < 4 && isHost && (
              <button
                onClick={onAddBot}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-colors"
              >
                + Add Bot
              </button>
            )}
            {game.players.length === 4 && isHost && (
              <button
                onClick={onStartRound}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all"
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Finished phase
  if (game.phase === 'finished') {
    const winner = game.players.find((p) => p.odlUser === game.winner);
    return (
      <div className="px-4 py-3 bg-black/40 border-t border-white/10">
        <div className="flex items-center justify-between">
          <div className="text-yellow-400 font-bold">
            {winner ? `${winner.odlUserName} wins! 🎉` : 'Round Over'}
          </div>
          {isHost && (
            <button
              onClick={onStartRound}
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg font-bold text-sm transition-all"
            >
              New Round
            </button>
          )}
        </div>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="px-4 py-3 bg-black/40 border-t border-white/10">
      <div className="flex items-center justify-center gap-3">
        {/* Draw button */}
        {needToDraw && (
          <button
            onClick={() => onAction('draw')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all animate-pulse"
          >
            🀄 Draw Tile
          </button>
        )}

        {/* Discard button */}
        {needToDiscard && selectedTile && (
          <button
            onClick={() => {
              onAction('discard', selectedTile);
              setSelectedTile(null);
            }}
            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-lg transition-all"
          >
            Discard Selected
          </button>
        )}

        {/* Call buttons */}
        {canPong && (
          <button
            onClick={() => onAction('pong')}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg transition-all"
          >
            Pong!
          </button>
        )}

        {canKong && (
          <button
            onClick={() => onAction('kong')}
            className="px-5 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold shadow-lg transition-all"
          >
            Kong!
          </button>
        )}

        {canMahjong && (
          <button
            onClick={() => onAction('mahjong')}
            className="px-6 py-2.5 bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-white rounded-lg font-bold shadow-lg transition-all animate-pulse"
          >
            🀄 Mahjong!
          </button>
        )}

        {/* Waiting for others */}
        {!isMyTurn && !canPong && !canKong && !canMahjong && (
          <span className="text-gray-400 text-sm">
            Waiting for {game.players[game.currentPlayerIndex]?.odlUserName}...
          </span>
        )}
      </div>
    </div>
  );
}
