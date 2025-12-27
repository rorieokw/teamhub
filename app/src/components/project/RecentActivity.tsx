import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { User } from '../../types';

interface Activity {
  id: string;
  type: 'task_created' | 'task_completed' | 'milestone_completed' | 'member_joined' | 'document_added';
  userId: string;
  description: string;
  createdAt: { toDate: () => Date };
}

interface RecentActivityProps {
  projectId: string;
  members: User[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function RecentActivity({
  projectId,
  members,
  collapsed = false,
  onToggleCollapse,
}: RecentActivityProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  // Subscribe to project activities
  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Activity[];
      setActivities(data);
    }, (error) => {
      // Collection might not exist yet
      console.log('Activities not available:', error.message);
      setActivities([]);
    });

    return () => unsubscribe();
  }, [projectId]);

  const getMember = (userId: string) => members.find((m) => m.id === userId);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'task_created':
        return '📋';
      case 'task_completed':
        return '✅';
      case 'milestone_completed':
        return '🎯';
      case 'member_joined':
        return '👋';
      case 'document_added':
        return '📄';
      default:
        return '📊';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-800/80 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="font-medium text-white text-sm">Recent Activity</h3>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-3">
          {activities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">No recent activity</p>
              <p className="text-gray-600 text-xs mt-1">
                Activity will appear as you work on this project
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activities.map((activity) => {
                const member = getMember(activity.userId);
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2 p-2 bg-gray-700/20 rounded-lg"
                  >
                    <span className="text-sm">{getActivityIcon(activity.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300">
                        <span className="text-white font-medium">
                          {member?.displayName || 'Someone'}
                        </span>{' '}
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatTime(activity.createdAt.toDate())}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
