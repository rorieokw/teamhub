import { useState, useEffect } from 'react';
import { subscribeToProjectSessions, formatSessionDuration, getSessionDisplayStatus } from '../../services/workSessions';
import type { WorkSession } from '../../types';

interface LiveSessionIndicatorProps {
  projectId: string;
  compact?: boolean; // For smaller displays like cards
  showDetails?: boolean; // Show activity and duration
}

export default function LiveSessionIndicator({
  projectId,
  compact = false,
  showDetails = true,
}: LiveSessionIndicatorProps) {
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToProjectSessions(projectId, setSessions);
    return () => unsubscribe();
  }, [projectId]);

  if (sessions.length === 0) {
    return null;
  }

  const primarySession = sessions[0];
  const displayStatus = getSessionDisplayStatus(primarySession);
  const isIdle = displayStatus === 'idle';

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={`relative flex h-2.5 w-2.5 ${
            isIdle ? '' : 'animate-pulse'
          }`}
        >
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isIdle ? 'bg-amber-400' : 'bg-red-500 animate-ping'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isIdle ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
        </span>
        <span className={`text-xs font-medium ${isIdle ? 'text-amber-400' : 'text-red-400'}`}>
          {sessions.length === 1
            ? primarySession.userName.split(' ')[0]
            : `${sessions.length} working`}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 ${
        isIdle
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-red-500/10 border-red-500/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`relative flex h-3 w-3 ${isIdle ? '' : 'animate-pulse'}`}
        >
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isIdle ? 'bg-amber-400' : 'bg-red-500 animate-ping'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-3 w-3 ${
              isIdle ? 'bg-amber-500' : 'bg-red-500'
            }`}
          />
        </span>
        <span
          className={`text-sm font-semibold ${
            isIdle ? 'text-amber-400' : 'text-red-400'
          }`}
        >
          {isIdle ? 'SESSION IDLE' : 'LIVE SESSION'}
        </span>
      </div>

      {sessions.map((session) => (
        <div key={session.id} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden flex-shrink-0">
            {session.userAvatar ? (
              session.userAvatar.startsWith('http') ? (
                <img
                  src={session.userAvatar}
                  alt={session.userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg">{session.userAvatar}</span>
              )
            ) : (
              session.userName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium text-sm">
                {session.userName}
              </span>
              <span className="text-gray-500 text-xs">
                is {isIdle ? 'was' : ''} coding
              </span>
            </div>
            {showDetails && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {session.activity && (
                  <>
                    <span className="truncate">"{session.activity}"</span>
                    <span>•</span>
                  </>
                )}
                <span>Started {formatSessionDuration(session.startedAt)} ago</span>
              </div>
            )}
          </div>
        </div>
      ))}

      {sessions.length > 1 && (
        <div className="mt-2 pt-2 border-t border-white/10">
          <span className="text-xs text-gray-400">
            +{sessions.length - 1} more {sessions.length - 1 === 1 ? 'person' : 'people'} working
          </span>
        </div>
      )}

      {!isIdle && (
        <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-300 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Avoid pushing to this project until session ends</span>
          </p>
        </div>
      )}
    </div>
  );
}
