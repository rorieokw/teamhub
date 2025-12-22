import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToProjects } from '../../services/projects';
import { subscribeToAllAccessibleTasks } from '../../services/tasks';
import type { Project, Task } from '../../types';

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
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/5 rounded-xl p-3 animate-pulse">
            <div className="h-3 bg-white/10 rounded w-12 mb-2" />
            <div className="h-6 bg-white/10 rounded w-8" />
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

  const stats = [
    { label: 'Projects', value: activeProjects, color: 'text-blue-400', href: '/projects' },
    { label: 'Done', value: completedTasks, color: 'text-green-400', href: '/tasks' },
    { label: 'Pending', value: pendingTasks, color: 'text-orange-400', href: '/tasks' },
    { label: 'Progress', value: `${avgProgress}%`, color: 'text-purple-400', href: '/projects' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Link
          key={stat.label}
          to={stat.href}
          className="bg-white/5 hover:bg-white/10 rounded-xl p-3 transition-colors group"
        >
          <p className="text-stat-label mb-1">{stat.label}</p>
          <p className={`text-stat ${stat.color}`}>{stat.value}</p>
        </Link>
      ))}
    </div>
  );
}
