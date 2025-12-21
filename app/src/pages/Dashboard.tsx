import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToProjects } from '../services/projects';
import { subscribeToUserTasks } from '../services/tasks';
import ActivityFeed from '../components/activity/ActivityFeed';
import type { Project, Task } from '../types';

export default function Dashboard() {
  const { currentUser, userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToProjects((data) => {
      // Filter to only projects user is a member of
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

  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const avgProgress = projects.length
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  return (
    <div className="animate-fade-in">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {userProfile?.displayName?.split(' ')[0] || 'User'}!
        </h1>
        <p className="text-gray-400">Here's what's happening with your projects</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Projects Card */}
        <Link
          to="/projects"
          className="glass-card rounded-xl p-5 hover-lift group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {loading ? '-' : activeProjects.length}
          </div>
          <p className="text-gray-400 text-sm">Active Projects</p>
        </Link>

        {/* Tasks Card */}
        <Link
          to="/tasks"
          className="glass-card rounded-xl p-5 hover-lift group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <svg className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {pendingTasks.length}
          </div>
          <p className="text-gray-400 text-sm">Pending Tasks</p>
        </Link>

        {/* Progress Card */}
        <div className="glass-card rounded-xl p-5 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {loading ? '-' : `${avgProgress}%`}
          </div>
          <p className="text-gray-400 text-sm">Avg Progress</p>
        </div>

        {/* Team Card */}
        <div className="glass-card rounded-xl p-5 hover-lift">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {new Set(projects.flatMap((p) => p.members)).size || 1}
          </div>
          <p className="text-gray-400 text-sm">Team Members</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/projects"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl transition-all font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            + New Project
          </Link>
          <Link
            to="/tasks"
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-green-500/25 hover:shadow-green-500/40"
          >
            + New Task
          </Link>
          <Link
            to="/chat"
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl transition-all font-medium shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
          >
            Open Chat
          </Link>
        </div>
      </div>

      {/* My Tasks */}
      {pendingTasks.length > 0 && (
        <div className="mb-8">
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

      {/* Two Column Layout for Projects and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Activity Feed */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></span>
            Recent Activity
          </h2>
          <ActivityFeed limit={8} />
        </div>
      </div>
    </div>
  );
}
