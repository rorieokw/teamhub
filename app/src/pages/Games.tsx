import { useState } from 'react';
import { PokerGame } from '../components/poker';
import BlackjackGame from '../components/blackjack/BlackjackGame';
import MahjongGame from '../components/mahjong/MahjongGame';
import { useAuth } from '../contexts/AuthContext';

type GameType = 'menu' | 'tictactoe' | 'memory' | 'snake' | 'poker' | 'blackjack' | 'mahjong';

export default function Games() {
  const [activeGame, setActiveGame] = useState<GameType>('menu');
  const { tokenBalance } = useAuth();

  const formatTokens = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return amount.toLocaleString();
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="text-gray-400 text-sm mt-1">Take a break and have some fun!</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Token Balance */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border border-yellow-500/30 rounded-xl">
            <span className="text-2xl">🪙</span>
            <div className="flex flex-col">
              <span className="text-yellow-400 font-bold text-lg leading-tight">{formatTokens(tokenBalance)}</span>
              <span className="text-yellow-500/70 text-xs">tokens</span>
            </div>
          </div>
          {activeGame !== 'menu' && (
            <button
              onClick={() => setActiveGame('menu')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Games
            </button>
          )}
        </div>
      </div>

      {activeGame === 'menu' && <GameMenu onSelectGame={setActiveGame} />}
      {activeGame === 'tictactoe' && <TicTacToe />}
      {activeGame === 'memory' && <MemoryGame />}
      {activeGame === 'snake' && <SnakeGame />}
      {activeGame === 'poker' && <PokerGame />}
      {activeGame === 'blackjack' && <BlackjackGame />}
      {activeGame === 'mahjong' && <MahjongGame />}
    </div>
  );
}

// Game Menu
function GameMenu({ onSelectGame }: { onSelectGame: (game: GameType) => void }) {
  const games = [
    {
      id: 'poker' as const,
      name: 'Texas Hold\'em',
      description: 'Multiplayer poker - up to 6 players',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L9 9H2l6 5-2 7 6-4 6 4-2-7 6-5h-7l-3-7z" />
        </svg>
      ),
      color: 'from-green-600 to-emerald-700',
      featured: true,
    },
    {
      id: 'blackjack' as const,
      name: 'Blackjack',
      description: 'Multiplayer blackjack - beat the dealer!',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="8" height="12" rx="1" />
          <rect x="13" y="8" width="8" height="12" rx="1" />
          <text x="5" y="12" fontSize="6" fill="currentColor" stroke="none">A</text>
          <text x="15" y="16" fontSize="6" fill="currentColor" stroke="none">K</text>
        </svg>
      ),
      color: 'from-yellow-600 to-amber-700',
      featured: true,
    },
    {
      id: 'mahjong' as const,
      name: 'Mahjong',
      description: '4-player tile matching game',
      icon: (
        <span className="text-3xl">🀄</span>
      ),
      color: 'from-rose-600 to-pink-700',
      featured: true,
    },
    {
      id: 'tictactoe' as const,
      name: 'Tic Tac Toe',
      description: 'Classic X and O game',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="9" x2="20" y2="9" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'memory' as const,
      name: 'Memory Match',
      description: 'Find matching pairs',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'snake' as const,
      name: 'Snake',
      description: 'Classic snake game',
      icon: (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path d="M8 15s1.5 2 4 2 4-2 4-2" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {games.map((game) => (
        <button
          key={game.id}
          onClick={() => onSelectGame(game.id)}
          className={`glass-card rounded-xl p-6 text-left hover:scale-[1.02] transition-transform group relative ${
            'featured' in game && game.featured ? 'ring-2 ring-yellow-500/50' : ''
          }`}
        >
          {'featured' in game && game.featured && (
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full">
              MULTIPLAYER
            </span>
          )}
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
            {game.icon}
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{game.name}</h3>
          <p className="text-gray-400 text-sm">{game.description}</p>
        </button>
      ))}
    </div>
  );
}

// Tic Tac Toe Game
function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const winner = calculateWinner(board);
  const isDraw = !winner && board.every(square => square !== null);

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="glass-card rounded-xl p-6">
        <div className="text-center mb-4">
          {winner ? (
            <p className="text-xl font-bold text-green-400">{winner} wins!</p>
          ) : isDraw ? (
            <p className="text-xl font-bold text-yellow-400">It's a draw!</p>
          ) : (
            <p className="text-lg text-gray-300">Next player: <span className="font-bold text-white">{isXNext ? 'X' : 'O'}</span></p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 w-fit mx-auto">
          {board.map((square, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={`w-20 h-20 rounded-xl text-3xl font-bold transition-all ${
                square ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
              } ${square === 'X' ? 'text-blue-400' : 'text-pink-400'}`}
            >
              {square}
            </button>
          ))}
        </div>
        {(winner || isDraw) && (
          <button
            onClick={resetGame}
            className="mt-4 w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

// Memory Match Game
function MemoryGame() {
  const emojis = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎪', '🎯'];
  const [cards, setCards] = useState(() => {
    const doubled = [...emojis, ...emojis];
    return doubled.sort(() => Math.random() - 0.5).map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));
  });
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const handleCardClick = (index: number) => {
    if (flippedCards.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(moves + 1);
      const [first, second] = newFlipped;
      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards];
          matchedCards[first].isMatched = true;
          matchedCards[second].isMatched = true;
          setCards(matchedCards);
          setFlippedCards([]);
        }, 500);
      } else {
        setTimeout(() => {
          const resetCards = [...cards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const isWon = cards.every(card => card.isMatched);

  const resetGame = () => {
    const doubled = [...emojis, ...emojis];
    setCards(doubled.sort(() => Math.random() - 0.5).map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    })));
    setFlippedCards([]);
    setMoves(0);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="glass-card rounded-xl p-6">
        <div className="text-center mb-4">
          <p className="text-lg text-gray-300">Moves: <span className="font-bold text-white">{moves}</span></p>
          {isWon && <p className="text-xl font-bold text-green-400 mt-2">You won!</p>}
        </div>
        <div className="grid grid-cols-4 gap-3 w-fit mx-auto">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={`w-16 h-16 rounded-xl text-2xl transition-all duration-300 ${
                card.isFlipped || card.isMatched
                  ? 'bg-purple-500/30 scale-100'
                  : 'bg-white/10 hover:bg-white/20 scale-95'
              } ${card.isMatched ? 'opacity-50' : ''}`}
            >
              {(card.isFlipped || card.isMatched) ? card.emoji : '?'}
            </button>
          ))}
        </div>
        {isWon && (
          <button
            onClick={resetGame}
            className="mt-4 w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}

// Snake Game
function SnakeGame() {
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snakeHighScore');
    return saved ? parseInt(saved) : 0;
  });

  const startGame = () => {
    setGameState('playing');
    setScore(0);
  };

  const endGame = (finalScore: number) => {
    setGameState('gameover');
    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('snakeHighScore', finalScore.toString());
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="glass-card rounded-xl p-6">
        <div className="flex justify-between items-center mb-4 min-w-[320px]">
          <p className="text-lg text-gray-300">Score: <span className="font-bold text-white">{score}</span></p>
          <p className="text-sm text-gray-400">High Score: <span className="font-bold text-yellow-400">{highScore}</span></p>
        </div>

        {gameState === 'ready' && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Use arrow keys or WASD to move</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold"
            >
              Start Game
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <SnakeCanvas onScore={setScore} onGameOver={endGame} />
        )}

        {gameState === 'gameover' && (
          <div className="text-center py-8">
            <p className="text-2xl font-bold text-red-400 mb-2">Game Over!</p>
            <p className="text-gray-400 mb-4">Final Score: {score}</p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-semibold"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Snake Canvas Component
function SnakeCanvas({ onScore, onGameOver }: { onScore: (score: number) => void; onGameOver: (score: number) => void }) {
  const canvasRef = useState<HTMLCanvasElement | null>(null);
  const [, forceUpdate] = useState({});

  useState(() => {
    const gridSize = 20;
    const tileCount = 16;
    let snake = [{ x: 8, y: 8 }];
    let food = { x: 12, y: 12 };
    let direction = { x: 0, y: 0 };
    let score = 0;
    let gameLoop: number;

    const placeFood = () => {
      food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount),
      };
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': case 'w': case 'W':
          if (direction.y !== 1) direction = { x: 0, y: -1 };
          break;
        case 'ArrowDown': case 's': case 'S':
          if (direction.y !== -1) direction = { x: 0, y: 1 };
          break;
        case 'ArrowLeft': case 'a': case 'A':
          if (direction.x !== 1) direction = { x: -1, y: 0 };
          break;
        case 'ArrowRight': case 'd': case 'D':
          if (direction.x !== -1) direction = { x: 1, y: 0 };
          break;
      }
    };

    const update = () => {
      if (direction.x === 0 && direction.y === 0) return;

      const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

      // Check wall collision
      if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        clearInterval(gameLoop);
        onGameOver(score);
        return;
      }

      // Check self collision
      if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        clearInterval(gameLoop);
        onGameOver(score);
        return;
      }

      snake.unshift(head);

      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        onScore(score);
        placeFood();
      } else {
        snake.pop();
      }

      forceUpdate({});
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
      // Clear
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, tileCount * gridSize, tileCount * gridSize);

      // Draw grid
      ctx.strokeStyle = '#ffffff10';
      for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, tileCount * gridSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(tileCount * gridSize, i * gridSize);
        ctx.stroke();
      }

      // Draw food
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
      ctx.fill();

      // Draw snake
      snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#22c55e' : '#4ade80';
        ctx.fillRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2);
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    gameLoop = window.setInterval(update, 150);

    // Animation frame for drawing
    const animate = () => {
      const canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) draw(ctx);
      }
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearInterval(gameLoop);
    };
  });

  return (
    <canvas
      id="snake-canvas"
      ref={(el) => { if (el && !canvasRef[0]) canvasRef[0] = el; }}
      width={320}
      height={320}
      className="rounded-lg"
    />
  );
}
