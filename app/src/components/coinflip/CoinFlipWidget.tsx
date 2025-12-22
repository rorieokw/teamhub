import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  subscribeToUserCoinFlips,
  createCoinFlipChallenge,
  declineCoinFlip,
  completeCoinFlip,
} from '../../services/coinflip';
import type { CoinFlip, User } from '../../types';

// Retro pixel art coin component
function PixelCoin({ side, isFlipping, size = 64 }: { side: 'heads' | 'tails' | null; isFlipping: boolean; size?: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (isFlipping) {
      const interval = setInterval(() => {
        setFrame((f) => (f + 1) % 8);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [isFlipping]);

  return (
    <div
      className={`relative flex items-center justify-center ${isFlipping ? 'animate-bounce' : ''}`}
      style={{ width: size, height: size }}
    >
      {/* Coin circle with gradient */}
      <div
        className={`absolute inset-0 rounded-full shadow-lg transition-all duration-100 ${
          isFlipping
            ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600'
            : side === 'heads'
            ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600'
            : 'bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500'
        }`}
        style={{
          transform: isFlipping ? `scaleX(${Math.cos(frame * Math.PI / 4)})` : 'scaleX(1)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.3)',
        }}
      />

      {/* Inner design */}
      <div
        className="absolute inset-2 rounded-full border-2 border-yellow-600/50 flex items-center justify-center"
        style={{
          transform: isFlipping ? `scaleX(${Math.cos(frame * Math.PI / 4)})` : 'scaleX(1)',
        }}
      >
        {!isFlipping && (
          <span className="text-2xl font-bold text-yellow-800 select-none" style={{ textShadow: '1px 1px 0 rgba(255,255,255,0.5)' }}>
            {side === 'heads' ? 'H' : 'T'}
          </span>
        )}
      </div>

      {/* Shine effect */}
      <div
        className="absolute top-1 left-2 w-3 h-3 rounded-full bg-white/40"
        style={{
          transform: isFlipping ? `scaleX(${Math.cos(frame * Math.PI / 4)})` : 'scaleX(1)',
        }}
      />
    </div>
  );
}

export default function CoinFlipWidget() {
  const { currentUser } = useAuth();
  const [flips, setFlips] = useState<CoinFlip[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showChallenge, setShowChallenge] = useState(false);
  const [selectedCall, setSelectedCall] = useState<'heads' | 'tails'>('heads');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [flippingId, setFlippingId] = useState<string | null>(null);
  const [flipResult, setFlipResult] = useState<{ id: string; result: 'heads' | 'tails' } | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserCoinFlips(currentUser.uid, (data) => {
      setFlips(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Subscribe to all users
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
    if (!currentUser) return;
    try {
      await createCoinFlipChallenge(
        currentUser.uid,
        opponentId,
        selectedCall,
        reason.trim() || undefined
      );
      setShowChallenge(false);
      setReason('');
      setSelectedCall('heads');
    } catch (error) {
      console.error('Failed to create challenge:', error);
    }
  };

  const handleAcceptFlip = async (flip: CoinFlip) => {
    if (!currentUser) return;

    // Start the flip animation
    setFlippingId(flip.id);

    // Simulate the dramatic flip
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Determine result
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';

    // Show result
    setFlipResult({ id: flip.id, result });
    setFlippingId(null);

    // Save to database after showing result
    await completeCoinFlip(
      flip.id,
      result,
      flip.challengerId,
      flip.opponentId,
      flip.challengerCall!
    );
  };

  const handleDecline = async (flipId: string) => {
    try {
      await declineCoinFlip(flipId);
    } catch (error) {
      console.error('Failed to decline:', error);
    }
  };

  const getUser = (userId: string): User | undefined => {
    return users.find((u) => u.id === userId);
  };

  const isPendingChallenge = (flip: CoinFlip): boolean => {
    return flip.status === 'pending' && flip.opponentId === currentUser?.uid;
  };

  const pendingChallenges = flips.filter(isPendingChallenge);
  const myPendingChallenges = flips.filter(
    (f) => f.status === 'pending' && f.challengerId === currentUser?.uid
  );
  const recentResults = flips.filter((f) => f.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show flip animation
  if (flippingId) {
    const flip = flips.find((f) => f.id === flippingId);
    const challenger = getUser(flip?.challengerId || '');

    return (
      <div className="flex flex-col items-center justify-center py-4">
        <p className="text-sm text-gray-400 mb-4">Flipping...</p>
        <PixelCoin side={null} isFlipping={true} size={80} />
        <p className="text-xs text-gray-500 mt-4">
          {challenger?.displayName} called {flip?.challengerCall}
        </p>
      </div>
    );
  }

  // Show result briefly
  if (flipResult) {
    const flip = flips.find((f) => f.id === flipResult.id);
    const winner = flipResult.result === flip?.challengerCall
      ? getUser(flip?.challengerId || '')
      : getUser(flip?.opponentId || '');

    setTimeout(() => setFlipResult(null), 3000);

    return (
      <div className="flex flex-col items-center justify-center py-4">
        <PixelCoin side={flipResult.result} isFlipping={false} size={80} />
        <p className="text-lg font-bold text-white mt-3 uppercase">{flipResult.result}!</p>
        <p className="text-sm text-green-400 mt-1">
          {winner?.displayName} wins!
        </p>
      </div>
    );
  }

  // Show challenge selection
  if (showChallenge) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-white">Challenge to Flip</h4>
          <button
            onClick={() => setShowChallenge(false)}
            className="text-gray-400 hover:text-white text-xs"
          >
            Cancel
          </button>
        </div>

        {/* Your call */}
        <div className="mb-3">
          <p className="text-xs text-gray-400 mb-2">Your call:</p>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedCall('heads')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCall === 'heads'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Heads
            </button>
            <button
              onClick={() => setSelectedCall('tails')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCall === 'tails'
                  ? 'bg-gray-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              Tails
            </button>
          </div>
        </div>

        {/* Reason (optional) */}
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What are you deciding? (optional)"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs placeholder-gray-500 mb-3"
        />

        {/* User selection */}
        <div className="space-y-2 max-h-32 overflow-y-auto">
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
                    : 'linear-gradient(135deg, #eab308, #ca8a04)',
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
      {/* New Flip Button */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowChallenge(true)}
          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
        >
          <span className="text-sm">🪙</span>
          Flip
        </button>
      </div>

      {/* Pending Challenges (from others) */}
      {pendingChallenges.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-yellow-400 font-medium mb-2">Incoming Challenges</p>
          {pendingChallenges.map((flip) => {
            const challenger = getUser(flip.challengerId);
            return (
              <div
                key={flip.id}
                className="flex items-center justify-between p-2 bg-yellow-500/10 rounded-lg mb-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🪙</span>
                  <div>
                    <span className="text-sm text-white">{challenger?.displayName}</span>
                    {flip.reason && (
                      <p className="text-xs text-gray-400">"{flip.reason}"</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleAcceptFlip(flip)}
                    className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30"
                  >
                    Flip!
                  </button>
                  <button
                    onClick={() => handleDecline(flip.id)}
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

      {/* My Pending Challenges */}
      {myPendingChallenges.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 font-medium mb-2">Waiting for response</p>
          {myPendingChallenges.map((flip) => {
            const opponent = getUser(flip.opponentId);
            return (
              <div
                key={flip.id}
                className="flex items-center gap-2 p-2 bg-white/5 rounded-lg mb-2"
              >
                <span className="text-lg">⏳</span>
                <div>
                  <span className="text-sm text-gray-400">{opponent?.displayName}</span>
                  <p className="text-xs text-gray-500">You called: {flip.challengerCall}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <div>
          <p className="text-xs text-green-400 font-medium mb-2">Recent Results</p>
          {recentResults.map((flip) => {
            const winner = getUser(flip.winnerId || '');
            const isWinner = flip.winnerId === currentUser?.uid;
            return (
              <div
                key={flip.id}
                className={`flex items-center justify-between p-2 rounded-lg mb-2 ${
                  isWinner ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <PixelCoin side={flip.result} isFlipping={false} size={32} />
                  <div>
                    <p className="text-xs text-white uppercase">{flip.result}</p>
                    <p className="text-xs text-gray-400">
                      {winner?.displayName} wins
                    </p>
                  </div>
                </div>
                <span className={`text-xs ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
                  {isWinner ? '🎉 Won!' : 'Lost'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {flips.length === 0 && (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">🪙</div>
          <p className="text-sm text-gray-400">No coin flips</p>
          <button
            onClick={() => setShowChallenge(true)}
            className="text-yellow-400 text-xs hover:text-yellow-300 mt-1"
          >
            Start a tie breaker!
          </button>
        </div>
      )}
    </div>
  );
}
