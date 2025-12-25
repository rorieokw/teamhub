import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToMahjongGames,
  subscribeToMahjongGame,
  createMahjongGame,
  joinMahjongGame,
  leaveMahjongGame,
  startRound,
  drawTile,
  discardTile,
  callPong,
  callKong,
  declareMahjong,
  cleanupStaleMahjongGames,
  addBotToGame,
  executeBotTurn,
} from '../../services/mahjong';
import { isBotPlayer } from '../../utils/mahjongAI';
import type { MahjongGame as MahjongGameType, MahjongGameSummary, MahjongAction } from '../../types/mahjong';
import MahjongTable from './MahjongTable';

export default function MahjongGame() {
  const { currentUser, userProfile } = useAuth();
  const [games, setGames] = useState<MahjongGameSummary[]>([]);
  const [currentGame, setCurrentGame] = useState<MahjongGameType | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableName, setTableName] = useState('');
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cleaning, setCleaning] = useState(false);

  // Subscribe to game list
  useEffect(() => {
    const unsubscribe = subscribeToMahjongGames((data) => {
      setGames(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to current game
  useEffect(() => {
    if (!currentGameId || !currentUser?.uid) {
      setCurrentGame(null);
      return;
    }

    const unsubscribe = subscribeToMahjongGame(currentGameId, currentUser.uid, (game) => {
      if (!game) {
        setCurrentGame(null);
        setCurrentGameId(null);
        return;
      }
      setCurrentGame(game);

      const stillInGame = game.players.some((p) => p.odlUser === currentUser.uid);
      if (!stillInGame) {
        setCurrentGame(null);
        setCurrentGameId(null);
      }
    });

    return () => unsubscribe();
  }, [currentGameId, currentUser?.uid]);

  async function handleCreateGame() {
    if (!currentUser?.uid || !userProfile) return;

    setCreating(true);
    setError('');

    try {
      const customName = tableName.trim() || undefined;
      const gameId = await createMahjongGame(
        currentUser.uid,
        userProfile.displayName,
        userProfile.avatarUrl,
        customName
      );
      setCurrentGameId(gameId);
      setShowCreateModal(false);
      setTableName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoinGame(gameId: string) {
    if (!currentUser?.uid || !userProfile) return;

    setJoining(gameId);
    setError('');

    try {
      await joinMahjongGame(
        gameId,
        currentUser.uid,
        userProfile.displayName,
        userProfile.avatarUrl
      );
      setCurrentGameId(gameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join game');
    } finally {
      setJoining(null);
    }
  }

  async function handleLeaveGame() {
    if (!currentGameId || !currentUser?.uid) return;

    try {
      await leaveMahjongGame(currentGameId, currentUser.uid);
      setCurrentGame(null);
      setCurrentGameId(null);
    } catch (err) {
      console.error('Failed to leave game:', err);
    }
  }

  async function handleStartRound() {
    if (!currentGameId) return;

    try {
      await startRound(currentGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start round');
    }
  }

  async function handleAction(action: MahjongAction, tileId?: string) {
    if (!currentGameId || !currentUser?.uid) return;

    try {
      switch (action) {
        case 'draw':
          await drawTile(currentGameId, currentUser.uid);
          break;
        case 'discard':
          if (tileId) await discardTile(currentGameId, currentUser.uid, tileId);
          break;
        case 'pong':
          await callPong(currentGameId, currentUser.uid);
          break;
        case 'kong':
          await callKong(currentGameId, currentUser.uid);
          break;
        case 'mahjong':
          await declareMahjong(currentGameId, currentUser.uid);
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make action');
    }
  }

  async function handleCleanup(force = false) {
    setCleaning(true);
    try {
      const count = await cleanupStaleMahjongGames(force);
      if (count > 0) {
        setError(`Cleaned up ${count} stale game(s)`);
      } else {
        setError('No stale games found.');
      }
      setTimeout(() => setError(''), 4000);
    } catch (err) {
      console.error('Cleanup failed:', err);
    } finally {
      setCleaning(false);
    }
  }

  async function handleAddBot() {
    if (!currentGameId) return;
    try {
      await addBotToGame(currentGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add bot');
    }
  }

  // Auto-execute bot turns
  useEffect(() => {
    if (!currentGame || !currentGameId || currentGame.phase !== 'playing') {
      return;
    }

    const currentPlayer = currentGame.players[currentGame.currentPlayerIndex];
    const hasBots = currentGame.players.some(p => isBotPlayer(p));

    if (!hasBots) return;

    // Check if it's a bot's turn or if a bot can claim a discard
    const isBotTurn = currentPlayer && isBotPlayer(currentPlayer);
    const botCanClaim = currentGame.lastDiscard && currentGame.players.some(
      (p, i) => isBotPlayer(p) && i !== currentGame.currentPlayerIndex
    );

    if (isBotTurn || botCanClaim) {
      const timer = setTimeout(async () => {
        try {
          await executeBotTurn(currentGameId);
        } catch (err) {
          console.error('Bot turn failed:', err);
        }
      }, 800); // Small delay to make bot actions visible

      return () => clearTimeout(timer);
    }
  }, [currentGame, currentGameId]);

  // Show game table if in a game
  if (currentGame && currentUser?.uid) {
    return (
      <div className="h-full flex flex-col">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm mb-4">
            {error}
            <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
          </div>
        )}
        <MahjongTable
          game={currentGame}
          currentUserId={currentUser.uid}
          onAction={handleAction}
          onStartRound={handleStartRound}
          onLeave={handleLeaveGame}
          onAddBot={handleAddBot}
        />
      </div>
    );
  }

  // Show lobby
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Mahjong</h2>
          <p className="text-gray-400 text-sm">Join a table or create your own (4 players)</p>
        </div>
        <div className="flex items-center gap-2">
          {games.length > 0 && (
            <>
              <button
                onClick={() => handleCleanup(false)}
                disabled={cleaning}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 hover:text-white rounded-xl font-medium transition-all text-sm"
              >
                {cleaning ? 'Cleaning...' : 'Clean Up'}
              </button>
              <button
                onClick={() => handleCleanup(true)}
                disabled={cleaning}
                className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-800 text-white rounded-xl font-medium transition-all text-sm"
              >
                Delete All
              </button>
            </>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl font-medium shadow-lg shadow-rose-500/25 transition-all"
          >
            Create Table
          </button>
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-xl text-sm mb-4 ${
          error.includes('Cleaned up')
            ? 'bg-green-500/20 border border-green-500/30 text-green-400'
            : error.includes('No stale games')
            ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
            <span className="text-4xl">🀄</span>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Tables Available</h3>
          <p className="text-gray-400 mb-4">Create a table and invite 3 others to play!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                  <span className="text-white text-xl">🀄</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{game.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{game.playerCount}/4 players</span>
                    <span>•</span>
                    <span className={`capitalize ${
                      game.phase === 'waiting' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {game.phase === 'waiting' ? 'Waiting' : 'In Progress'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleJoinGame(game.id)}
                disabled={joining === game.id || game.playerCount >= 4}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {joining === game.id ? 'Joining...' : game.playerCount >= 4 ? 'Full' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Game rules */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
        <ul className="text-gray-400 text-sm space-y-2">
          <li>• 4 players required - form melds to complete your hand</li>
          <li>• Draw a tile, then discard one each turn</li>
          <li>• Call "Pong" (3 of a kind) or "Kong" (4 of a kind) on discards</li>
          <li>• First to complete 4 melds + 1 pair wins!</li>
          <li>• Tiles: Bamboo, Circle, Character (1-9), Winds, Dragons</li>
        </ul>
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create Mahjong Table</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setTableName('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Table Name
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder={`${userProfile?.displayName || 'My'}'s Table`}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50"
                  maxLength={30}
                  autoFocus
                />
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 mb-3">Table Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Players</p>
                    <p className="text-white font-semibold">4 Required</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Starting Score</p>
                    <p className="text-white font-semibold">25,000 pts</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setTableName('');
                }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGame}
                disabled={creating}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium shadow-lg shadow-rose-500/25 transition-all"
              >
                {creating ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
