import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  subscribeToUserSession,
  startSession,
  endSession,
  updateSessionActivity,
  formatSessionDuration,
} from '../../services/workSessions';
import type { WorkSession } from '../../types';

interface SessionControlProps {
  projectId: string;
  projectName: string;
}

export default function SessionControl({ projectId, projectName }: SessionControlProps) {
  const { currentUser, userProfile } = useAuth();
  const [userSession, setUserSession] = useState<WorkSession | null>(null);
  const [activity, setActivity] = useState('');
  const [showActivityInput, setShowActivityInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to current user's session
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToUserSession(currentUser.uid, setUserSession);
    return () => unsubscribe();
  }, [currentUser]);

  // Check if user is working on THIS project
  const isWorkingOnThisProject = userSession?.projectId === projectId;
  const isWorkingElsewhere = userSession && !isWorkingOnThisProject;

  const handleStartSession = async () => {
    if (!currentUser || !userProfile) {
      alert('Error: Not logged in');
      return;
    }
    setLoading(true);

    try {
      console.log('Starting session for project:', projectId);
      const sessionId = await startSession({
        projectId,
        userId: currentUser.uid,
        userName: userProfile.displayName || 'Unknown',
        userAvatar: userProfile.avatarUrl,
        activity: activity || undefined,
      });
      console.log('Session started with ID:', sessionId);
      setActivity('');
      setShowActivityInput(false);
    } catch (err: unknown) {
      console.error('Failed to start session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to start session: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!userSession) return;
    setLoading(true);

    try {
      await endSession(userSession.id);
    } catch (err) {
      console.error('Failed to end session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateActivity = async () => {
    if (!userSession || !activity.trim()) return;

    try {
      await updateSessionActivity(userSession.id, activity);
      setShowActivityInput(false);
    } catch (err) {
      console.error('Failed to update activity:', err);
    }
  };

  if (!currentUser) return null;

  // User is working on this project
  if (isWorkingOnThisProject) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-red-400 font-semibold text-sm">YOUR SESSION IS LIVE</span>
          </div>
          <span className="text-xs text-gray-400">
            {userSession?.startedAt && formatSessionDuration(userSession.startedAt)}
          </span>
        </div>

        {userSession?.activity && !showActivityInput && (
          <p className="text-sm text-gray-300 mb-3">
            Working on: "{userSession.activity}"
          </p>
        )}

        {showActivityInput ? (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="What are you working on?"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateActivity()}
            />
            <button
              onClick={handleUpdateActivity}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
            >
              Update
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowActivityInput(true)}
            className="text-xs text-gray-400 hover:text-gray-300 mb-3 block"
          >
            + Update what you're working on
          </button>
        )}

        <button
          onClick={handleEndSession}
          disabled={loading}
          className="w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Ending...' : 'End Session'}
        </button>
      </div>
    );
  }

  // User is working on a different project
  if (isWorkingElsewhere) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <p className="text-amber-400 text-sm mb-3">
          You have an active session on another project.
        </p>
        <button
          onClick={handleStartSession}
          disabled={loading}
          className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Switching...' : `Switch to ${projectName}`}
        </button>
      </div>
    );
  }

  // User has no active session
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span className="text-gray-400 text-sm font-medium">Start Coding Session</span>
      </div>

      {showActivityInput ? (
        <div className="space-y-3">
          <input
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="What are you working on? (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
            onKeyDown={(e) => e.key === 'Enter' && handleStartSession()}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowActivityInput(false)}
              className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSession}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Go Live'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowActivityInput(true)}
          className="w-full px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          Start Session
        </button>
      )}

      <p className="text-xs text-gray-500 mt-3">
        Let your team know you're actively coding on this project
      </p>
    </div>
  );
}
