import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import type { WidgetId } from '../../types';
import { WIDGET_REGISTRY } from '../../services/dashboardLayout';

// SVG coin icon for consistent rendering
function CoinIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="url(#coinGradientWidget)" stroke="#b45309" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="7" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.5"/>
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#92400e">$</text>
      <defs>
        <linearGradient id="coinGradientWidget" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047"/>
          <stop offset="50%" stopColor="#facc15"/>
          <stop offset="100%" stopColor="#eab308"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

interface WidgetCardProps {
  id: WidgetId;
  children: ReactNode;
  isEditMode: boolean;
}

export default function WidgetCard({ id, children, isEditMode }: WidgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  const widgetInfo = WIDGET_REGISTRY[id];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      {/* The card container with fixed height */}
      <div
        className={`glass-card rounded-2xl h-[280px] flex flex-col overflow-hidden transition-all ${
          isEditMode ? 'ring-2 ring-purple-500/30 ring-dashed' : ''
        } ${isDragging ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-500/20' : ''}`}
      >
        {/* Header with title and drag handle */}
        <div
          className={`flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0 ${
            isEditMode ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
          {...(isEditMode ? { ...attributes, ...listeners } : {})}
        >
          <div className="flex items-center gap-2">
            {id === 'coinflip' ? (
              <CoinIcon className="w-5 h-5" />
            ) : (
              <span className="text-lg">{widgetInfo.icon}</span>
            )}
            <h3 className="text-sm font-semibold text-white">{widgetInfo.name}</h3>
          </div>
          {isEditMode && (
            <div className="flex items-center gap-1 text-purple-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}
        </div>

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 widget-scroll">
          {children}
        </div>
      </div>

      {/* Edit mode overlay animation */}
      {isEditMode && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none animate-pulse-subtle" />
      )}
    </div>
  );
}
