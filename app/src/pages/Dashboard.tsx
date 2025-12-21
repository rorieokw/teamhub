import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToProjects } from '../services/projects';
import { subscribeToUserTasks } from '../services/tasks';

// Widgets
import AnnouncementBanner from '../components/announcements/AnnouncementBanner';
import TeamAvailabilityWidget from '../components/availability/TeamAvailabilityWidget';
import PinnedItemsWidget from '../components/pinned/PinnedItemsWidget';
import DashboardPollsWidget from '../components/polls/DashboardPollsWidget';
import CalendarWidget from '../components/calendar/CalendarWidget';
import QuickStatsWidget from '../components/stats/QuickStatsWidget';
import TaskCompletionChart from '../components/stats/TaskCompletionChart';
import ProjectProgressChart from '../components/stats/ProjectProgressChart';
import ActivityFeed from '../components/activity/ActivityFeed';

import type { Project, Task } from '../types';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      const userProjects = currentUser
        ? data.filter((p) => p.members.includes(currentUser.uid))
        : [];
      setProjects(userProjects);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToUserTasks(currentUser.uid, setTasks);
    return () => unsubscribe();
  }, [currentUser]);

  const pendingTasks = tasks.filter((t) => t.status !== 'done');

  return (
    <div className="animate-fade-in">
      {/* Announcements Banner */}
      <AnnouncementBanner />

      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {userProfile?.displayName?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-gray-400">Here's what's happening with your team</p>
      </div>

      {/* Quick Stats */}
      <div className="mb-6">
        <QuickStatsWidget />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - 8 cols */}
        <div className="lg:col-span-8 space-y-6">
          {/* Calendar and Polls Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CalendarWidget />
            <DashboardPollsWidget />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TaskCompletionChart />
            <ProjectProgressChart />
          </div>

          {/* My Tasks */}
          {pendingTasks.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full"></span>
                My Pending Tasks
              </h2>
              <div className="glass rounded-xl overflow-hidden">
                {pendingTasks.slice(0, 5).map((task, index) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  return (
                    <Link
                      key={task.id}
                      to="/tasks"
                      className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                        index !== 0 ? 'border-t border-white/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          task.priority === 'urgent' ? 'bg-red-500' :
                          task.priority === 'high' ? 'bg-orange-500' :
                          task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                        }`}></div>
                        <div>
                          <p className="text-white font-medium">{task.title}</p>
                          <p className="text-gray-500 text-sm">{project?.name || 'Unknown project'}</p>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.priority === 'urgent'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : task.priority === 'high'
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {task.priority}
                      </span>
                    </Link>
                  );
                })}
              </div>
              {pendingTasks.length > 5 && (
                <Link
                  to="/tasks"
                  className="block text-center text-purple-400 hover:text-purple-300 mt-3 text-sm font-medium"
                >
                  View all {pendingTasks.length} tasks →
                </Link>
              )}
            </div>
          )}

          {/* Recent Projects */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
              Recent Projects
            </h2>
            {loading ? (
              <div className="glass rounded-xl p-8 text-center">
                <div className="inline-block w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-3">Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
                <p className="text-gray-400 mb-4">
                  Create your first project to get started
                </p>
                <Link
                  to="/projects"
                  className="inline-block px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-medium"
                >
                  Create Project
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.slice(0, 3).map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="glass-card rounded-xl p-5 hover-lift group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        project.status === 'on-hold' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-white mb-2 group-hover:text-purple-300 transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Progress</span>
                      <span className="text-sm text-white font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 4 cols */}
        <div className="lg:col-span-4 space-y-6">
          {/* Team Availability */}
          <TeamAvailabilityWidget />

          {/* Pinned Items */}
          <PinnedItemsWidget />

          {/* Quick Actions */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-medium text-white/90 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/projects"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm text-white/80 group-hover:text-white">New Project</span>
              </Link>
              <Link
                to="/tasks"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-sm text-white/80 group-hover:text-white">New Task</span>
              </Link>
              <Link
                to="/chat"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-sm text-white/80 group-hover:text-white">Open Chat</span>
              </Link>
            </div>
          </div>

          {/* Activity Feed */}
          <div>
            <h3 className="text-sm font-medium text-white/90 mb-3 flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
              Recent Activity
            </h3>
            <ActivityFeed limit={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
