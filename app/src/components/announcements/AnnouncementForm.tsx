import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createAnnouncement } from '../../services/announcements';
import type { AnnouncementPriority } from '../../types';

interface AnnouncementFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AnnouncementForm({ onClose, onSuccess }: AnnouncementFormProps) {
  const { currentUser, userProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [pinned, setPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    try {
      await createAnnouncement(
        title.trim(),
        content.trim(),
        currentUser.uid,
        userProfile.displayName,
        { priority, pinned }
      );
      onSuccess();
    } catch (error) {
      console.error('Failed to create announcement:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4 animate-scale-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/90">New Announcement</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Announcement title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
            required
          />
        </div>

        <div>
          <textarea
            placeholder="Write your announcement..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent resize-none"
            required
          />
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Priority:</span>
            <div className="flex gap-1">
              {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`
                    px-2.5 py-1 text-xs rounded-lg border transition-all
                    ${priority === p
                      ? p === 'urgent'
                        ? 'bg-red-500/20 border-red-500/50 text-red-400'
                        : p === 'important'
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-400'
                          : 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                    }
                  `}
                >
                  {p === 'urgent' ? '🚨' : p === 'important' ? '⚠️' : '📢'} {p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-xs text-white/60">Pin to top</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      </div>
    </form>
  );
}
