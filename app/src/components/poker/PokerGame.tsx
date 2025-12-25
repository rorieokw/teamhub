import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToPokerGames,
  subscribeToPokerGame,
  createPokerGame,
  joinPokerGame,
  leavePokerGame,
  startHand,
  makeAction,
  cleanupStalePokerGames,
} from '../../services/poker';
import type { PokerGame as PokerGameType, PokerGameSummary, PlayerAction } from '../../types/poker';
import PokerTable from './PokerTable';

export default function PokerGame() {
  const { currentUser, userProfile } = useAuth();
  const [games, setGames] = useState<PokerGameSummary[]>([]);
  const [currentGame, setCurrentGame] = useState<PokerGameType | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableName, setTableName] = useState('');
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cleaning, setCleaning] = useState(false);

  async function handleCleanup(force = false) {
    setCleaning(true);
    try {
      const count = await cleanupStalePokerGames(force);
      if (count > 0) {
        setError(`Cleaned up ${count} stale game(s)`);
      } else {
        setError('No stale games found. Try "Force Delete" to remove all games.');
      }
      setTimeout(() => setError(''), 4000);
    } catch (err) {
      console.error('Cleanup failed:', err);
    } finally {
      setCleaning(false);
    }
  }

  // Subscribe to game list
  useEffect(() => {
    const unsubscribe = subscribeToPokerGames((data) => {
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

    const unsubscribe = subscribeToPokerGame(currentGameId, currentUser.uid, (game) => {
      if (!game) {
        // Game was deleted
        setCurrentGame(null);
        setCurrentGameId(null);
        return;
      }
      setCurrentGame(game);

      // Check if we're still in the game
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
      const gameId = await createPokerGame(
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
      await joinPokerGame(
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
      await leavePokerGame(currentGameId, currentUser.uid);
      setCurrentGame(null);
      setCurrentGameId(null);
    } catch (err) {
      console.error('Failed to leave game:', err);
    }
  }

  async function handleStartHand() {
    if (!currentGameId) return;

    try {
      await startHand(currentGameId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start hand');
    }
  }

  async function handleAction(action: PlayerAction, amount?: number) {
    if (!currentGameId || !currentUser?.uid) return;

    try {
      await makeAction(currentGameId, currentUser.uid, action, amount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make action');
    }
  }

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
        <PokerTable
          game={currentGame}
          currentUserId={currentUser.uid}
          onAction={handleAction}
          onStartHand={handleStartHand}
          onLeave={handleLeaveGame}
        />
      </div>
    );
  }

  // Show lobby
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Texas Hold'em Poker</h2>
          <p className="text-gray-400 text-sm">Join a table or create your own</p>
        </div>
        <div className="flex items-center gap-2">
          {games.length > 0 && (
            <>
              <button
                onClick={() => handleCleanup(false)}
                disabled={cleaning}
                className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-gray-300 hover:text-white rounded-xl font-medium transition-all text-sm"
                title="Clean up stale games (10+ min old)"
              >
                {cleaning ? 'Cleaning...' : 'Clean Up'}
              </button>
              <button
                onClick={() => handleCleanup(true)}
                disabled={cleaning}
                className="px-4 py-2.5 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-800 text-white rounded-xl font-medium transition-all text-sm"
                title="Delete ALL games"
              >
                Delete All
              </button>
            </>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium shadow-lg shadow-green-500/25 transition-all"
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
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : games.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Tables Available</h3>
          <p className="text-gray-400 mb-4">Create a table and invite others to play!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="glass rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <span className="text-white text-xl">♠</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold">{game.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-400">
                    <span>{game.playerCount}/{game.maxPlayers} players</span>
                    <span>•</span>
                    <span>${game.smallBlind}/${game.bigBlind} blinds</span>
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
                disabled={joining === game.id || game.playerCount >= game.maxPlayers}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all"
              >
                {joining === game.id ? 'Joining...' : game.playerCount >= game.maxPlayers ? 'Full' : 'Join'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Game rules */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
        <ul className="text-gray-400 text-sm space-y-2">
          <li>• Texas Hold'em with up to 6 players</li>
          <li>• Each player starts with $1,000 in chips</li>
          <li>• Blinds are $10/$20</li>
          <li>• Create a table or join an existing one</li>
          <li>• The table creator starts each hand</li>
        </ul>
      </div>

      {/* Create Table Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create Poker Table</h3>
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
                  className="w-full px-4 py-3 bg-gray-700/50 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
                  maxLength={30}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">Leave blank for default name</p>
              </div>

              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400 mb-3">Table Settings</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Buy-in</p>
                    <p className="text-white font-semibold">$1,000</p>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Blinds</p>
                    <p className="text-white font-semibold">$10 / $20</p>
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
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-xl font-medium shadow-lg shadow-green-500/25 transition-all"
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
