import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Chess } from 'chess.js';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToChessGame, makeChessMove, endChessGame } from '../../services/chess';
import { subscribeToUsers } from '../../services/users';
import type { ChessGame, User } from '../../types';

interface ChessGameModalProps {
  gameId: string;
  isOpen: boolean;
  onClose: () => void;
}

type Square = string;

const PIECE_SYMBOLS: Record<string, string> = {
  'w-k': '♔', 'w-q': '♕', 'w-r': '♖', 'w-b': '♗', 'w-n': '♘', 'w-p': '♙',
  'b-k': '♚', 'b-q': '♛', 'b-r': '♜', 'b-b': '♝', 'b-n': '♞', 'b-p': '♟',
};

export default function ChessGameModal({ gameId, isOpen, onClose }: ChessGameModalProps) {
  const { currentUser } = useAuth();
  const [game, setGame] = useState<ChessGame | null>(null);
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [validMoves, setValidMoves] = useState<Square[]>([]);
  const [players, setPlayers] = useState<Map<string, User>>(new Map());
  const [gameStatus, setGameStatus] = useState<string>('');

  useEffect(() => {
    if (!gameId) return;

    const unsubscribe = subscribeToChessGame(gameId, (data) => {
      setGame(data);
      if (data) {
        chess.load(data.fen);
        updateGameStatus();
      }
    });

    return () => unsubscribe();
  }, [gameId, chess]);

  useEffect(() => {
    if (!game) return;

    const playerIds = [game.whitePlayerId, game.blackPlayerId];
    const unsubscribe = subscribeToUsers(playerIds, setPlayers);

    return () => unsubscribe();
  }, [game?.whitePlayerId, game?.blackPlayerId]);

  const updateGameStatus = useCallback(() => {
    if (chess.isCheckmate()) {
      setGameStatus('Checkmate!');
    } else if (chess.isStalemate()) {
      setGameStatus('Stalemate!');
    } else if (chess.isDraw()) {
      setGameStatus('Draw!');
    } else if (chess.isCheck()) {
      setGameStatus('Check!');
    } else {
      setGameStatus('');
    }
  }, [chess]);

  const myColor = game?.whitePlayerId === currentUser?.uid ? 'white' : 'black';
  const isMyTurn = game?.currentTurn === myColor;
  const whitePlayer = players.get(game?.whitePlayerId || '');
  const blackPlayer = players.get(game?.blackPlayerId || '');

  const handleSquareClick = async (square: Square) => {
    if (!game || game.status !== 'active' || !isMyTurn) return;

    const piece = chess.get(square as Parameters<typeof chess.get>[0]);

    // If we have a selected square and clicked on a valid move
    if (selectedSquare && validMoves.includes(square)) {
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q', // Auto-promote to queen
        });

        if (move) {
          const newFen = chess.fen();
          const nextTurn = chess.turn() === 'w' ? 'white' : 'black';

          await makeChessMove(gameId, newFen, move.san, game.moves, nextTurn);

          // Check for game end
          if (chess.isGameOver()) {
            let result: 'white' | 'black' | 'draw' = 'draw';
            let winnerId: string | undefined;

            if (chess.isCheckmate()) {
              result = chess.turn() === 'w' ? 'black' : 'white';
              winnerId = result === 'white' ? game.whitePlayerId : game.blackPlayerId;
            }

            await endChessGame(gameId, result, winnerId);
          }
        }
      } catch (error) {
        console.error('Invalid move:', error);
      }

      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    // Select a piece of the current player's color
    if (piece && piece.color === (myColor === 'white' ? 'w' : 'b')) {
      setSelectedSquare(square);
      const moves = chess.moves({ square: square as Parameters<typeof chess.moves>[0]['square'], verbose: true });
      setValidMoves(moves.map((m) => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const renderSquare = (row: number, col: number) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    // Flip board if playing as black
    const displayRow = myColor === 'black' ? 7 - row : row;
    const displayCol = myColor === 'black' ? 7 - col : col;

    const square = `${files[displayCol]}${ranks[displayRow]}`;
    const piece = chess.get(square as Parameters<typeof chess.get>[0]);
    const isLight = (displayRow + displayCol) % 2 === 0;
    const isSelected = square === selectedSquare;
    const isValidMove = validMoves.includes(square);

    const pieceSymbol = piece
      ? PIECE_SYMBOLS[`${piece.color}-${piece.type}`]
      : null;

    // Style pieces for better visibility
    const pieceStyle = piece ? {
      textShadow: piece.color === 'w'
        ? '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8), 1px -1px 2px rgba(0,0,0,0.8), -1px 1px 2px rgba(0,0,0,0.8)'
        : '1px 1px 2px rgba(255,255,255,0.5), -1px -1px 2px rgba(255,255,255,0.5)',
      color: piece.color === 'w' ? '#ffffff' : '#1a1a1a',
    } : {};

    return (
      <button
        key={square}
        onClick={() => handleSquareClick(square)}
        className={`
          w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center text-2xl sm:text-3xl
          transition-colors relative font-bold
          ${isLight ? 'bg-amber-200' : 'bg-amber-700'}
          ${isSelected ? 'ring-2 ring-yellow-400 ring-inset' : ''}
          ${isValidMove ? 'after:absolute after:w-3 after:h-3 after:rounded-full after:bg-green-500/50' : ''}
          ${isMyTurn ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}
        `}
        style={pieceStyle}
        disabled={!isMyTurn || game?.status !== 'active'}
      >
        {pieceSymbol}
      </button>
    );
  };

  const handleResign = async () => {
    if (!game || !currentUser) return;
    const winnerId = myColor === 'white' ? game.blackPlayerId : game.whitePlayerId;
    const result = myColor === 'white' ? 'black' : 'white';
    await endChessGame(gameId, result, winnerId);
  };

  if (!isOpen || !game) return null;

  // Use portal to render at document body level, outside any parent stacking contexts
  return createPortal(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Chess</h2>
            <p className="text-xs text-gray-400">
              {whitePlayer?.displayName} vs {blackPlayer?.displayName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Game Status */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${myColor === 'white' ? 'bg-white' : 'bg-gray-800 border border-gray-600'}`} />
            <span className="text-sm text-white">You play {myColor}</span>
          </div>
          {game.status === 'active' && (
            <span className={`text-xs px-2 py-1 rounded ${isMyTurn ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {isMyTurn ? 'Your turn' : "Opponent's turn"}
            </span>
          )}
          {game.status === 'completed' && (
            <span className="text-xs px-2 py-1 rounded bg-purple-500/20 text-purple-400">
              {game.result === 'draw' ? 'Draw' : `${game.result?.charAt(0).toUpperCase()}${game.result?.slice(1)} wins`}
            </span>
          )}
        </div>

        {/* Status Message */}
        {gameStatus && (
          <div className="px-4 py-1">
            <p className="text-center text-yellow-400 text-sm font-medium">{gameStatus}</p>
          </div>
        )}

        {/* Chess Board */}
        <div className="p-4 flex justify-center">
          <div className="grid grid-cols-8 border-2 border-amber-900 rounded overflow-hidden shadow-lg">
            {Array.from({ length: 8 }, (_, row) =>
              Array.from({ length: 8 }, (_, col) => renderSquare(row, col))
            )}
          </div>
        </div>

        {/* Move History */}
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 mb-1">Moves: {game.moves.length}</p>
          <div className="text-xs text-gray-400 max-h-12 overflow-y-auto">
            {game.moves.length === 0 ? (
              <span className="italic">No moves yet</span>
            ) : (
              game.moves.map((move, i) => (
                <span key={i} className="mr-1">
                  {i % 2 === 0 && <span className="text-gray-600">{Math.floor(i / 2) + 1}.</span>}
                  {move}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          {game.status === 'active' && (
            <button
              onClick={handleResign}
              className="px-4 py-2 text-red-400 hover:text-red-300 text-sm"
            >
              Resign
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-medium"
          >
            {game.status === 'completed' ? 'Close' : 'Hide Game'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
