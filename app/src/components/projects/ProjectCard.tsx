import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToProjectSessions, getSessionDisplayStatus } from '../../services/workSessions';
import type { Project, WorkSession } from '../../types';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const statusConfig = {
  active: { color: 'bg-green-500', shadow: 'shadow-green-500/50', label: 'Active', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'on-hold': { color: 'bg-yellow-500', shadow: 'shadow-yellow-500/50', label: 'On Hold', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  completed: { color: 'bg-blue-500', shadow: 'shadow-blue-500/50', label: 'Completed', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
};

export default function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const status = statusConfig[project.status];
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToProjectSessions(project.id, setSessions);
    return () => unsubscribe();
  }, [project.id]);

  const hasActiveSession = sessions.length > 0;
  const primarySession = sessions[0];
  const isIdle = primarySession ? getSessionDisplayStatus(primarySession) === 'idle' : false;

  return (
    <div className={`glass-card rounded-xl hover-lift transition-all group overflow-hidden ${
      hasActiveSession && !isIdle ? 'ring-2 ring-red-500/50' : ''
    }`}>
      {/* LIVE SESSION BANNER */}
      {hasActiveSession && (
        <div className={`px-4 py-2.5 flex items-center gap-2 ${
          isIdle ? 'bg-amber-500/20' : 'bg-red-500/30'
        }`}>
          <span className={`relative flex h-3 w-3`}>
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isIdle ? 'bg-amber-400' : 'bg-red-500 animate-ping'
            }`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${
              isIdle ? 'bg-amber-500' : 'bg-red-500'
            }`} />
          </span>
          <span className={`text-xs font-bold uppercase tracking-wide ${
            isIdle ? 'text-amber-400' : 'text-red-400'
          }`}>
            {isIdle ? 'IDLE' : 'LIVE'} — {primarySession?.userName.split(' ')[0]} is {isIdle ? 'away' : 'coding'}
          </span>
        </div>
      )}

      <Link to={`/projects/${project.id}`} className="block p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/25">
              {project.name.charAt(0).toUpperCase()}
            </div>
            {/* Pulsing red dot on icon when live */}
            {hasActiveSession && !isIdle && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-gray-900" />
              </span>
            )}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${status.badge}`}>
            {status.label}
          </span>
        </div>

        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
          {project.name}
        </h3>

        {project.description && (
          <p className="text-gray-400 text-sm mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm font-medium text-white">{project.progress}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                project.progress === 100
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}
              style={{ width: `${project.progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {project.members && project.members.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {project.members.length} member{project.members.length !== 1 ? 's' : ''}
            </div>
          )}

          {project.deadline && (
            <div className={`flex items-center gap-2 text-xs ${
              project.status !== 'completed' && project.deadline.toDate() < new Date()
                ? 'text-red-400'
                : 'text-gray-500'
            }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {project.deadline.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {project.status !== 'completed' && project.deadline.toDate() < new Date() && (
                <span className="text-red-400 font-medium">Overdue</span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Action buttons - outside the link */}
      <div className="flex items-center justify-end gap-1 px-5 pb-4 pt-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project);
          }}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title="Edit project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(project);
          }}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Delete project"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
