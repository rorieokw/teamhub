import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToProjects } from '../../services/projects';
import { subscribeToAllAccessibleTasks } from '../../services/tasks';
import type { Project, Task } from '../../types';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href: string;
  trend?: { value: number; label: string };
}

function StatCard({ label, value, icon, color, href, trend }: StatCardProps) {
  return (
    <Link to={href} className="glass-card rounded-xl p-4 hover-lift cursor-pointer block group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-white/50 mb-1 group-hover:text-white/70 transition-colors">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              <span>{Math.abs(trend.value)}% {trend.label}</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </Link>
  );
}

export default function QuickStatsWidget() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data.filter((p) => p.members.includes(currentUser.uid)));
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  useEffect(() => {
    if (projects.length === 0) return;

    const projectIds = projects.map((p) => p.id);
    const unsubscribe = subscribeToAllAccessibleTasks(projectIds, setTasks);

    return unsubscribe;
  }, [projects]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-16 mb-2" />
            <div className="h-8 bg-white/10 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const pendingTasks = tasks.filter((t) => t.status !== 'done').length;
  const avgProgress = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
    : 0;

  // Calculate tasks completed this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const thisWeekCompleted = tasks.filter((t) => {
    if (t.status !== 'done') return false;
    const updatedAt = t.updatedAt?.toDate?.() || new Date();
    return updatedAt > weekAgo;
  }).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Active Projects"
        value={activeProjects}
        href="/projects"
        color="bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
        icon={
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        }
      />

      <StatCard
        label="Tasks Completed"
        value={completedTasks}
        href="/tasks?filter=done"
        color="bg-gradient-to-br from-green-500/20 to-emerald-500/20"
        trend={{ value: thisWeekCompleted, label: 'this week' }}
        icon={
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <StatCard
        label="Pending Tasks"
        value={pendingTasks}
        href="/tasks?filter=pending"
        color="bg-gradient-to-br from-orange-500/20 to-amber-500/20"
        icon={
          <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      <StatCard
        label="Avg. Progress"
        value={`${avgProgress}%`}
        href="/projects"
        color="bg-gradient-to-br from-purple-500/20 to-pink-500/20"
        icon={
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        }
      />
    </div>
  );
}
