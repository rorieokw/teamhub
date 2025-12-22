import type { WidgetConfig, WidgetId } from '../../types';
import { WIDGET_REGISTRY } from '../../services/dashboardLayout';

interface WidgetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  widgets: WidgetConfig[];
  onToggleWidget: (widgetId: WidgetId) => void;
  onResetLayout: () => void;
}

export default function WidgetSettingsModal({
  isOpen,
  onClose,
  widgets,
  onToggleWidget,
  onResetLayout,
}: WidgetSettingsModalProps) {
  if (!isOpen) return null;

  const sortedWidgets = [...widgets].sort((a, b) => a.position - b.position);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Dashboard Widgets</h2>
            <p className="text-gray-400 text-sm">Toggle widgets on or off</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Widget List */}
        <div className="p-4 overflow-y-auto max-h-[60vh] space-y-1">
          {sortedWidgets.map((widget) => {
            const info = WIDGET_REGISTRY[widget.id];
            return (
              <label
                key={widget.id}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <p className="text-white font-medium text-sm">{info.name}</p>
                    <p className="text-gray-500 text-xs">{info.description}</p>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={() => onToggleWidget(widget.id)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-gray-600 peer-checked:bg-purple-500 rounded-full transition-colors"></div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={onResetLayout}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            Reset to Default
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
