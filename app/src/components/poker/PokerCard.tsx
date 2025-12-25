import type { Card } from '../../types/poker';

interface PokerCardProps {
  card?: Card;
  faceDown?: boolean;
  small?: boolean;
  className?: string;
}

const suitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const suitColors: Record<string, { text: string; bg: string }> = {
  hearts: { text: 'text-red-600', bg: 'bg-red-50' },
  diamonds: { text: 'text-red-600', bg: 'bg-red-50' },
  clubs: { text: 'text-gray-900', bg: 'bg-gray-50' },
  spades: { text: 'text-gray-900', bg: 'bg-gray-50' },
};

export default function PokerCard({ card, faceDown = false, small = false, className = '' }: PokerCardProps) {
  const cardSize = small ? 'w-11 h-16' : 'w-16 h-24';
  const fontSize = small ? 'text-sm' : 'text-lg';
  const symbolSize = small ? 'text-xl' : 'text-3xl';
  const cornerSymbol = small ? 'text-[10px]' : 'text-xs';

  if (faceDown || !card) {
    return (
      <div
        className={`${cardSize} rounded-lg bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 border border-indigo-400/50 shadow-lg flex items-center justify-center relative overflow-hidden ${className}`}
      >
        {/* Card back pattern */}
        <div className="absolute inset-1 rounded-md border border-white/20" />
        <div className="absolute inset-2 rounded-sm bg-gradient-to-br from-indigo-500/30 to-purple-500/30">
          {/* Diamond pattern */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.1) 4px, rgba(255,255,255,0.1) 8px)`
          }} />
        </div>
        <div className="relative w-6 h-6 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
          <span className="text-white/60 text-lg">♠</span>
        </div>
      </div>
    );
  }

  const colors = suitColors[card.suit];
  const symbol = suitSymbols[card.suit];

  return (
    <div
      className={`${cardSize} rounded-lg bg-gradient-to-br from-white to-gray-100 border border-gray-300 shadow-lg flex flex-col relative overflow-hidden ${className}`}
    >
      {/* Subtle shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-transparent pointer-events-none" />

      {/* Top left corner */}
      <div className={`absolute top-1 left-1 flex flex-col items-center ${colors.text}`}>
        <span className={`${fontSize} font-bold leading-none`}>{card.rank}</span>
        <span className={`${cornerSymbol} leading-none`}>{symbol}</span>
      </div>

      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span className={`${symbolSize} ${colors.text} drop-shadow-sm`}>
          {symbol}
        </span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className={`absolute bottom-1 right-1 flex flex-col items-center rotate-180 ${colors.text}`}>
        <span className={`${fontSize} font-bold leading-none`}>{card.rank}</span>
        <span className={`${cornerSymbol} leading-none`}>{symbol}</span>
      </div>

      {/* Subtle card texture */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'
      }} />
    </div>
  );
}
