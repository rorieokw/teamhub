import { useNavigate } from 'react-router-dom';
import { unpinItem, getPinnedItemIcon, getPinnedItemColor, getPinnedItemRoute } from '../../services/pinnedItems';
import type { PinnedItem } from '../../types';

interface PinnedItemCardProps {
  item: PinnedItem;
  onUnpin?: () => void;
}

export default function PinnedItemCard({ item, onUnpin }: PinnedItemCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    const route = getPinnedItemRoute(item);
    navigate(route);
  };

  const handleUnpin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await unpinItem(item.id);
      onUnpin?.();
    } catch (error) {
      console.error('Failed to unpin item:', error);
    }
  };

  const icon = getPinnedItemIcon(item.itemType);
  const gradientColor = getPinnedItemColor(item.itemType);

  return (
    <div
      onClick={handleClick}
      className="group flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-all"
    >
      <div
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center text-sm
          bg-gradient-to-br ${gradientColor}
        `}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-white/40 truncate">{item.subtitle}</p>
        )}
      </div>

      <button
        onClick={handleUnpin}
        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"
        title="Unpin"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
