import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToAnnouncements,
  dismissAnnouncement,
  deleteAnnouncement,
  getPriorityColor,
  formatAnnouncementTime,
} from '../../services/announcements';
import AnnouncementForm from './AnnouncementForm';
import type { Announcement } from '../../types';

export default function AnnouncementBanner() {
  const { currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToAnnouncements(currentUser.uid, (data) => {
      setAnnouncements(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const handleDismiss = async (announcementId: string) => {
    if (!currentUser) return;
    try {
      await dismissAnnouncement(announcementId, currentUser.uid);
    } catch (error) {
      console.error('Failed to dismiss announcement:', error);
    }
  };

  const handleDelete = async (announcementId: string) => {
    try {
      await deleteAnnouncement(announcementId);
    } catch (error) {
      console.error('Failed to delete announcement:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (announcements.length === 0 && !showForm) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Post an announcement
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-3">
      {showForm && (
        <AnnouncementForm
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {announcements.map((announcement) => {
        const isOwner = announcement.createdBy === currentUser?.uid;
        const isExpanded = expandedId === announcement.id;

        return (
          <div
            key={announcement.id}
            className={`
              relative overflow-hidden rounded-xl border
              ${announcement.priority === 'urgent'
                ? 'bg-red-500/10 border-red-500/30'
                : announcement.priority === 'important'
                  ? 'bg-orange-500/10 border-orange-500/30'
                  : 'bg-blue-500/10 border-blue-500/30'
              }
              animate-fade-in
            `}
          >
            {announcement.pinned && (
              <div className="absolute top-0 right-0 px-2 py-0.5 bg-white/10 text-[10px] text-white/60 rounded-bl-lg">
                PINNED
              </div>
            )}

            <div className="p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`
                    flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg
                    ${announcement.priority === 'urgent'
                      ? 'bg-red-500/20'
                      : announcement.priority === 'important'
                        ? 'bg-orange-500/20'
                        : 'bg-blue-500/20'
                    }
                  `}
                >
                  {announcement.priority === 'urgent' ? '🚨' : announcement.priority === 'important' ? '⚠️' : '📢'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-white/90">{announcement.title}</h4>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full border ${getPriorityColor(announcement.priority)}`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                  </div>

                  <p
                    className={`
                      mt-1 text-sm text-white/70
                      ${!isExpanded && announcement.content.length > 150 ? 'line-clamp-2' : ''}
                    `}
                  >
                    {announcement.content}
                  </p>

                  {announcement.content.length > 150 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                      className="mt-1 text-xs text-white/50 hover:text-white/70"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}

                  <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                    <span>By {announcement.createdByName}</span>
                    <span>·</span>
                    <span>{formatAnnouncementTime(announcement.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!announcement.pinned && (
                    <button
                      onClick={() => handleDismiss(announcement.id)}
                      className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add announcement
        </button>
      )}
    </div>
  );
}
