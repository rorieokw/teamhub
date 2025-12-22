import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscribeToProjectSessions, getSessionDisplayStatus } from '../../services/workSessions';
import type { Project, WorkSession, User } from '../../types';

interface ProjectCardProps {
  project: Project;
  users?: User[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
}

const statusConfig = {
  active: { color: 'bg-green-500', shadow: 'shadow-green-500/50', label: 'Active', badge: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'on-hold': { color: 'bg-yellow-500', shadow: 'shadow-yellow-500/50', label: 'On Hold', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  completed: { color: 'bg-blue-500', shadow: 'shadow-blue-500/50', label: 'Completed', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  hidden: { color: 'bg-gray-500', shadow: 'shadow-gray-500/50', label: 'Hidden', badge: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
};

export default function ProjectCard({ project, users = [], onEdit, onDelete }: ProjectCardProps) {
  // Show "Hidden" status if project is hidden, otherwise show actual status
  const displayStatus = project.hidden ? 'hidden' : project.status;
  const status = statusConfig[displayStatus];
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  // Get member users for this project
  const memberUsers = users.filter(u => project.members?.includes(u.id));

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

        {/* GitHub Link */}
        {project.githubUrl && (
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 mb-4 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group/github"
          >
            <svg className="w-4 h-4 text-gray-400 group-hover/github:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="text-xs text-gray-400 group-hover/github:text-white transition-colors truncate">
              {project.githubUrl.replace('https://github.com/', '')}
            </span>
            <svg className="w-3 h-3 text-gray-500 group-hover/github:text-white transition-colors ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}

        <div className="flex items-center justify-between">
          {/* Member Avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {memberUsers.slice(0, 4).map((member) => {
                const isCustomPicture = member.avatarUrl?.startsWith('http');
                return (
                  <div
                    key={member.id}
                    className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-medium ring-2 ring-gray-900 overflow-hidden"
                    title={member.displayName}
                  >
                    {isCustomPicture ? (
                      <img src={member.avatarUrl} alt={member.displayName} className="w-full h-full object-cover" />
                    ) : member.avatarUrl ? (
                      <span className="text-sm">{member.avatarUrl}</span>
                    ) : (
                      member.displayName?.charAt(0).toUpperCase()
                    )}
                  </div>
                );
              })}
              {memberUsers.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-gray-300 text-xs font-medium ring-2 ring-gray-900">
                  +{memberUsers.length - 4}
                </div>
              )}
            </div>
            {memberUsers.length === 0 && project.members && project.members.length > 0 && (
              <span className="text-xs text-gray-500">{project.members.length} member{project.members.length !== 1 ? 's' : ''}</span>
            )}
          </div>

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
