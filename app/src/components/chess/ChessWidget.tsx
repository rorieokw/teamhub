import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  subscribeToUserChessGames,
  createChessChallenge,
  acceptChessChallenge,
  declineChessChallenge,
} from '../../services/chess';
import { notifyChessChallenge } from '../../services/notifications';
import ChessGameModal from './ChessGameModal';
import type { ChessGame, User } from '../../types';

export default function ChessWidget() {
  const { currentUser, userProfile } = useAuth();
  const [games, setGames] = useState<ChessGame[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserChessGames(currentUser.uid, (data) => {
      setGames(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to all users for challenge selection
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(allUsers.filter((u) => u.id !== currentUser?.uid));
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleChallenge = async (opponentId: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const gameId = await createChessChallenge(currentUser.uid, opponentId);
      // Send notification to opponent
      await notifyChessChallenge(
        opponentId,
        userProfile.displayName,
        currentUser.uid,
        gameId
      );
      setShowChallenge(false);
    } catch (error) {
      console.error('Failed to create challenge:', error);
    }
  };

  const handleAccept = async (gameId: string) => {
    try {
      await acceptChessChallenge(gameId);
    } catch (error) {
      console.error('Failed to accept challenge:', error);
    }
  };

  const handleDecline = async (gameId: string) => {
    try {
      await declineChessChallenge(gameId);
    } catch (error) {
      console.error('Failed to decline challenge:', error);
    }
  };

  const getOpponent = (game: ChessGame): User | undefined => {
    const opponentId = game.whitePlayerId === currentUser?.uid
      ? game.blackPlayerId
      : game.whitePlayerId;
    return users.find((u) => u.id === opponentId);
  };

  const getUserColor = (game: ChessGame): 'white' | 'black' => {
    return game.whitePlayerId === currentUser?.uid ? 'white' : 'black';
  };

  const isMyTurn = (game: ChessGame): boolean => {
    const myColor = getUserColor(game);
    return game.currentTurn === myColor;
  };

  const isPendingChallenge = (game: ChessGame): boolean => {
    return game.status === 'pending' && game.challengerId !== currentUser?.uid;
  };

  const pendingChallenges = games.filter(isPendingChallenge);
  const activeGames = games.filter((g) => g.status === 'active');
  const myPendingChallenges = games.filter(
    (g) => g.status === 'pending' && g.challengerId === currentUser?.uid
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show challenge selection
  if (showChallenge) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white">Challenge Player</h4>
          <button
            onClick={() => setShowChallenge(false)}
            className="text-gray-400 hover:text-white text-xs"
          >
            Cancel
          </button>
        </div>
        <div className="space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => handleChallenge(user.id)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
                style={{
                  background: user.nameColor
                    ? `linear-gradient(135deg, ${user.nameColor}, ${user.nameColor}99)`
                    : 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-white">{user.displayName}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* New Game Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowChallenge(true)}
          className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Challenge
        </button>
      </div>

      {/* Pending Challenges (from others) */}
      {pendingChallenges.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-orange-400 font-medium mb-2">Incoming Challenges</p>
          {pendingChallenges.map((game) => {
            const opponent = getOpponent(game);
            return (
              <div
                key={game.id}
                className="flex items-center justify-between p-2 bg-orange-500/10 rounded-lg mb-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">♟️</span>
                  <span className="text-sm text-white">{opponent?.displayName || 'Unknown'}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAccept(game.id)}
                    className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(game.id)}
                    className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30"
                  >
                    Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Active Games */}
      {activeGames.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-green-400 font-medium mb-2">Active Games</p>
          {activeGames.map((game) => {
            const opponent = getOpponent(game);
            const myTurn = isMyTurn(game);
            return (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className="w-full flex items-center justify-between p-2 bg-white/5 hover:bg-white/10 rounded-lg mb-2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getUserColor(game) === 'white' ? '♔' : '♚'}</span>
                  <div className="text-left">
                    <p className="text-sm text-white">vs {opponent?.displayName || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{game.moves.length} moves</p>
                  </div>
                </div>
                {myTurn ? (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs animate-pulse">
                    Your turn
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">
                    Waiting
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Challenges (sent by me) */}
      {myPendingChallenges.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">Waiting for response</p>
          {myPendingChallenges.map((game) => {
            const opponent = getOpponent(game);
            return (
              <div
                key={game.id}
                className="flex items-center gap-2 p-2 bg-white/5 rounded-lg mb-2"
              >
                <span className="text-lg">⏳</span>
                <span className="text-sm text-gray-400">{opponent?.displayName || 'Unknown'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {games.length === 0 && (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">♟️</div>
          <p className="text-sm text-gray-400">No active games</p>
          <button
            onClick={() => setShowChallenge(true)}
            className="text-purple-400 text-xs hover:text-purple-300 mt-1"
          >
            Challenge someone!
          </button>
        </div>
      )}

      {/* Chess Game Modal */}
      {selectedGameId && (
        <ChessGameModal
          gameId={selectedGameId}
          isOpen={!!selectedGameId}
          onClose={() => setSelectedGameId(null)}
        />
      )}
    </div>
  );
}
