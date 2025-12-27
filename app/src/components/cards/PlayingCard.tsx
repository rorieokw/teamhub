interface PlayingCardProps {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  dealDelay?: number; // Delay in ms for deal animation
  animate?: boolean; // Whether to animate the card appearing
}

// Suit symbols and colors
const SUITS = {
  hearts: { symbol: '♥', color: 'text-red-600' },
  diamonds: { symbol: '♦', color: 'text-red-600' },
  clubs: { symbol: '♣', color: 'text-gray-900' },
  spades: { symbol: '♠', color: 'text-gray-900' },
};

// Size configurations
const SIZES = {
  xs: { width: 'w-10', height: 'h-14', corner: 'text-[9px]', pip: 'text-[10px]', face: 'text-lg' },
  sm: { width: 'w-12', height: 'h-[68px]', corner: 'text-[10px]', pip: 'text-xs', face: 'text-xl' },
  md: { width: 'w-16', height: 'h-[88px]', corner: 'text-xs', pip: 'text-sm', face: 'text-2xl' },
  lg: { width: 'w-20', height: 'h-28', corner: 'text-sm', pip: 'text-base', face: 'text-3xl' },
};

export default function PlayingCard({
  suit,
  rank,
  size = 'md',
  faceDown = false,
  selected = false,
  onClick,
  className = '',
  dealDelay = 0,
  animate = false,
}: PlayingCardProps) {
  const sizeConfig = SIZES[size];
  const suitInfo = SUITS[suit];

  const animationStyle = animate ? {
    animation: 'dealCard 0.4s ease-out forwards',
    animationDelay: `${dealDelay}ms`,
    opacity: 0,
    transform: 'translateY(-100px) rotateY(180deg) scale(0.5)',
  } : {};

  // Card back
  if (faceDown) {
    return (
      <div
        onClick={onClick}
        style={animationStyle}
        className={`
          ${sizeConfig.width} ${sizeConfig.height}
          rounded-lg bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900
          border-2 border-blue-500/50 shadow-lg
          flex items-center justify-center relative overflow-hidden
          ${onClick ? 'cursor-pointer hover:scale-105' : ''}
          ${animate ? 'deal-card' : ''}
          ${className}
        `}
      >
        {/* Pattern */}
        <div className="absolute inset-1.5 rounded-md border border-white/20 bg-blue-800/50">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 6px)`
          }} />
        </div>
        {/* Center decoration */}
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20 z-10">
          <span className="text-white/40 text-xl">♠</span>
        </div>
      </div>
    );
  }

  const isFaceCard = ['J', 'Q', 'K'].includes(rank);
  const isAce = rank === 'A';

  return (
    <div
      onClick={onClick}
      style={animationStyle}
      className={`
        ${sizeConfig.width} ${sizeConfig.height}
        rounded-lg bg-white border-2 ${selected ? 'border-yellow-400 ring-2 ring-yellow-400/50 -translate-y-2' : 'border-gray-300'}
        shadow-lg relative overflow-hidden
        ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl' : ''}
        transition-all
        ${animate ? 'deal-card' : ''}
        ${className}
      `}
    >
      {/* Card shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-transparent pointer-events-none" />

      {/* Top-left corner */}
      <div className={`absolute top-1 left-1 flex flex-col items-center leading-none ${suitInfo.color}`}>
        <span className={`${sizeConfig.corner} font-bold ${(rank === '6' || rank === '9') ? 'underline decoration-1' : ''}`}>{rank}</span>
        <span className={`${sizeConfig.corner}`}>{suitInfo.symbol}</span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className={`absolute bottom-1 right-1 flex flex-col items-center leading-none rotate-180 ${suitInfo.color}`}>
        <span className={`${sizeConfig.corner} font-bold ${(rank === '6' || rank === '9') ? 'underline decoration-1' : ''}`}>{rank}</span>
        <span className={`${sizeConfig.corner}`}>{suitInfo.symbol}</span>
      </div>

      {/* Card center */}
      <div className="absolute inset-0 flex items-center justify-center p-3">
        {isAce && <AcePips suit={suit} size={size} />}
        {isFaceCard && <FaceCard rank={rank} suit={suit} size={size} />}
        {!isAce && !isFaceCard && <NumberPips rank={rank} suit={suit} size={size} />}
      </div>
    </div>
  );
}

// Ace - single large centered pip
function AcePips({ suit, size }: { suit: string; size: string }) {
  const suitInfo = SUITS[suit as keyof typeof SUITS];
  const aceSize = size === 'xs' ? 'text-3xl' : size === 'sm' ? 'text-4xl' : size === 'md' ? 'text-5xl' : 'text-6xl';

  return (
    <span className={`${aceSize} ${suitInfo.color}`}>
      {suitInfo.symbol}
    </span>
  );
}

// Face cards (J, Q, K)
function FaceCard({ rank, suit, size }: { rank: string; suit: string; size: string }) {
  const suitInfo = SUITS[suit as keyof typeof SUITS];
  const sizeConfig = SIZES[size as keyof typeof SIZES];

  // Simplified face card - shows letter and suit
  return (
    <div className={`flex flex-col items-center gap-1 ${suitInfo.color}`}>
      <span className={`${sizeConfig.face} font-bold`}>{rank}</span>
      <span className={`${sizeConfig.pip}`}>{suitInfo.symbol}</span>
    </div>
  );
}

// Number cards (2-10) with proper pip layouts
function NumberPips({ rank, suit, size }: { rank: string; suit: string; size: string }) {
  const suitInfo = SUITS[suit as keyof typeof SUITS];
  const value = parseInt(rank);
  const pipSize = SIZES[size as keyof typeof SIZES].pip;

  const Pip = ({ rotated = false, className = '' }: { rotated?: boolean; className?: string }) => (
    <span className={`${pipSize} ${suitInfo.color} ${rotated ? 'rotate-180' : ''} ${className}`}>
      {suitInfo.symbol}
    </span>
  );

  // Pip layouts based on card value
  const layouts: Record<number, React.ReactNode> = {
    2: (
      <div className="flex flex-col justify-between h-full py-2">
        <Pip />
        <Pip rotated />
      </div>
    ),
    3: (
      <div className="flex flex-col justify-between items-center h-full py-2">
        <Pip />
        <Pip />
        <Pip rotated />
      </div>
    ),
    4: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-2">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip rotated />
        </div>
      </div>
    ),
    5: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-2 relative">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip rotated />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Pip />
        </div>
      </div>
    ),
    6: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-2">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
        </div>
      </div>
    ),
    7: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-2 relative">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
        </div>
        <div className="absolute inset-0 flex items-start justify-center pt-[30%]">
          <Pip />
        </div>
      </div>
    ),
    8: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-2 relative">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
      </div>
    ),
    9: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-1 relative">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Pip />
        </div>
      </div>
    ),
    10: (
      <div className="grid grid-cols-2 gap-x-4 h-full py-1 relative">
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
        <div className="flex flex-col justify-between">
          <Pip />
          <Pip />
          <Pip rotated />
          <Pip rotated />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-between py-[20%]">
          <Pip />
          <Pip rotated />
        </div>
      </div>
    ),
  };

  return layouts[value] || null;
}

// Wrapper component that accepts Card type from poker/blackjack
export function GameCard({
  card,
  size = 'md',
  faceDown = false,
  selected = false,
  onClick,
  className = '',
  dealDelay = 0,
  animate = false,
}: {
  card?: { suit: string; rank: string };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  dealDelay?: number;
  animate?: boolean;
}) {
  if (!card || faceDown) {
    return (
      <PlayingCard
        suit="spades"
        rank="A"
        size={size}
        faceDown={true}
        onClick={onClick}
        className={className}
        dealDelay={dealDelay}
        animate={animate}
      />
    );
  }

  return (
    <PlayingCard
      suit={card.suit as 'hearts' | 'diamonds' | 'clubs' | 'spades'}
      rank={card.rank as '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'}
      size={size}
      faceDown={false}
      selected={selected}
      onClick={onClick}
      className={className}
      dealDelay={dealDelay}
      animate={animate}
    />
  );
}
