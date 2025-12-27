import type { MahjongTile as MahjongTileType } from '../../types/mahjong';

interface MahjongTileProps {
  tile: MahjongTileType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
}

// Chinese numerals for character tiles
const CHINESE_NUMERALS: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九',
};

// Size configurations
const SIZES = {
  xs: { width: 'w-7', height: 'h-10', text: 'text-xs', subtext: 'text-[8px]' },
  sm: { width: 'w-9', height: 'h-12', text: 'text-sm', subtext: 'text-[9px]' },
  md: { width: 'w-12', height: 'h-16', text: 'text-lg', subtext: 'text-xs' },
  lg: { width: 'w-16', height: 'h-22', text: 'text-2xl', subtext: 'text-sm' },
};

export default function MahjongTile({
  tile,
  size = 'md',
  selected = false,
  onClick,
  faceDown = false,
}: MahjongTileProps) {
  const sizeConfig = SIZES[size];

  if (faceDown) {
    return (
      <div className={`${sizeConfig.width} ${sizeConfig.height} rounded-md bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-900 border-2 border-emerald-600 shadow-md`}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3/4 h-3/4 rounded border border-emerald-500/30 bg-emerald-700/50" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${sizeConfig.width} ${sizeConfig.height}
        rounded-md bg-gradient-to-b from-white via-gray-50 to-gray-100
        border-2 ${selected ? 'border-yellow-400 ring-2 ring-yellow-400/50' : 'border-gray-300'}
        shadow-md hover:shadow-lg transition-all
        flex flex-col items-center justify-center
        ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}
        ${selected ? '-translate-y-2' : ''}
        relative overflow-hidden
      `}
    >
      {/* 3D edge effect */}
      <div className="absolute inset-0 border-l-2 border-t-2 border-white/60 rounded-md pointer-events-none" />
      <div className="absolute inset-0 border-r-2 border-b-2 border-gray-400/40 rounded-md pointer-events-none" />

      <TileContent tile={tile} size={size} />
    </div>
  );
}

function TileContent({ tile, size }: { tile: MahjongTileType; size: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeConfig = SIZES[size];

  // Character tiles (萬)
  if (tile.suit === 'character') {
    const value = tile.value as number;
    return (
      <div className="flex flex-col items-center justify-center gap-0">
        <span className={`${sizeConfig.text} font-bold text-gray-800 leading-none`}>
          {CHINESE_NUMERALS[value]}
        </span>
        <span className={`${sizeConfig.subtext} font-bold text-red-600 leading-none`}>
          萬
        </span>
      </div>
    );
  }

  // Circle tiles (筒)
  if (tile.suit === 'circle') {
    return <CircleTile value={tile.value as number} size={size} />;
  }

  // Bamboo tiles (索)
  if (tile.suit === 'bamboo') {
    return <BambooTile value={tile.value as number} size={size} />;
  }

  // Wind tiles
  if (tile.suit === 'wind') {
    const windChars: Record<string, string> = {
      east: '東', south: '南', west: '西', north: '北',
    };
    return (
      <span className={`${sizeConfig.text} font-bold text-blue-800`}>
        {windChars[tile.value as string]}
      </span>
    );
  }

  // Dragon tiles
  if (tile.suit === 'dragon') {
    if (tile.value === 'red') {
      return (
        <span className={`${sizeConfig.text} font-bold text-red-600`}>
          中
        </span>
      );
    }
    if (tile.value === 'green') {
      return (
        <span className={`${sizeConfig.text} font-bold text-green-600`}>
          發
        </span>
      );
    }
    // White dragon - empty rectangle with border
    return (
      <div className={`
        ${size === 'xs' ? 'w-4 h-5' : size === 'sm' ? 'w-5 h-6' : size === 'md' ? 'w-7 h-9' : 'w-9 h-12'}
        border-2 border-blue-400 rounded-sm
      `} />
    );
  }

  return null;
}

// Circle patterns for 筒 tiles
function CircleTile({ value, size }: { value: number; size: 'xs' | 'sm' | 'md' | 'lg' }) {
  const circleSize = size === 'xs' ? 'w-2 h-2' : size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4';
  const smallCircle = size === 'xs' ? 'w-1.5 h-1.5' : size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-2.5 h-2.5' : 'w-3 h-3';

  const Circle = ({ className = '', small = false }: { className?: string; small?: boolean }) => (
    <div className={`${small ? smallCircle : circleSize} rounded-full border-2 border-teal-600 bg-gradient-to-br from-teal-400 to-teal-600 ${className}`}>
      <div className="w-full h-full rounded-full border border-white/30" />
    </div>
  );

  const RedCircle = ({ className = '' }: { className?: string }) => (
    <div className={`${circleSize} rounded-full border-2 border-red-600 bg-gradient-to-br from-red-400 to-red-600 ${className}`}>
      <div className="w-full h-full rounded-full border border-white/30" />
    </div>
  );

  // Layout patterns for each number
  const patterns: Record<number, React.ReactNode> = {
    1: (
      <div className="flex items-center justify-center">
        <RedCircle />
      </div>
    ),
    2: (
      <div className="flex flex-col items-center gap-0.5">
        <Circle small />
        <Circle small />
      </div>
    ),
    3: (
      <div className="flex flex-col items-center gap-0.5">
        <Circle small />
        <Circle small />
        <Circle small />
      </div>
    ),
    4: (
      <div className="grid grid-cols-2 gap-0.5">
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
      </div>
    ),
    5: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
        </div>
        <RedCircle />
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
        </div>
      </div>
    ),
    6: (
      <div className="grid grid-cols-2 gap-0.5">
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
      </div>
    ),
    7: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
          <Circle small />
        </div>
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
          <Circle small />
        </div>
        <Circle small />
      </div>
    ),
    8: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
          <Circle small />
        </div>
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
        </div>
        <div className="flex gap-0.5">
          <Circle small />
          <Circle small />
          <Circle small />
        </div>
      </div>
    ),
    9: (
      <div className="grid grid-cols-3 gap-0.5">
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
        <RedCircle />
        <Circle small />
        <Circle small />
        <Circle small />
        <Circle small />
      </div>
    ),
  };

  return patterns[value] || null;
}

// Bamboo patterns for 索 tiles
function BambooTile({ value, size }: { value: number; size: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizeConfig = SIZES[size];

  // 1 bamboo is traditionally a bird/sparrow
  if (value === 1) {
    return (
      <div className="flex flex-col items-center justify-center text-green-700">
        <span className={`${sizeConfig.text} leading-none`}>🐦</span>
      </div>
    );
  }

  const Bamboo = ({ className = '', red = false }: { className?: string; red?: boolean }) => (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`w-1 ${size === 'xs' ? 'h-2' : size === 'sm' ? 'h-2.5' : 'h-3'} ${red ? 'bg-red-500' : 'bg-green-600'} rounded-full relative`}>
        <div className="absolute top-0 left-0 right-0 h-1/4 bg-white/30 rounded-t-full" />
      </div>
    </div>
  );

  const patterns: Record<number, React.ReactNode> = {
    2: (
      <div className="flex flex-col items-center gap-0.5">
        <Bamboo />
        <Bamboo />
      </div>
    ),
    3: (
      <div className="flex flex-col items-center gap-0.5">
        <Bamboo />
        <Bamboo />
        <Bamboo />
      </div>
    ),
    4: (
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
      </div>
    ),
    5: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-1">
          <Bamboo />
          <Bamboo red />
          <Bamboo />
        </div>
        <div className="flex gap-1">
          <Bamboo />
          <Bamboo />
        </div>
      </div>
    ),
    6: (
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
      </div>
    ),
    7: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-1">
          <Bamboo />
          <Bamboo red />
          <Bamboo />
        </div>
        <div className="flex gap-1">
          <Bamboo />
          <Bamboo />
        </div>
        <div className="flex gap-1">
          <Bamboo />
          <Bamboo />
        </div>
      </div>
    ),
    8: (
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5">
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
        <Bamboo />
      </div>
    ),
    9: (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex gap-0.5">
          <Bamboo />
          <Bamboo />
          <Bamboo />
        </div>
        <div className="flex gap-0.5">
          <Bamboo red />
          <Bamboo red />
          <Bamboo red />
        </div>
        <div className="flex gap-0.5">
          <Bamboo />
          <Bamboo />
          <Bamboo />
        </div>
      </div>
    ),
  };

  return patterns[value] || null;
}
