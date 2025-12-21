import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToProjects } from '../../services/projects';
import type { Project } from '../../types';

interface StatusData {
  status: string;
  count: number;
  color: string;
}

export default function ProjectProgressChart() {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data.filter((p) => p.members.includes(currentUser.uid)));
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="h-4 bg-white/10 rounded w-32 mb-4 animate-pulse" />
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const statusCounts: StatusData[] = [
    { status: 'active', count: projects.filter((p) => p.status === 'active').length, color: '#22c55e' },
    { status: 'on-hold', count: projects.filter((p) => p.status === 'on-hold').length, color: '#eab308' },
    { status: 'completed', count: projects.filter((p) => p.status === 'completed').length, color: '#3b82f6' },
  ];

  const total = statusCounts.reduce((sum, s) => sum + s.count, 0);

  // Calculate the donut chart segments
  const getDonutSegments = () => {
    let currentAngle = 0;
    const segments: { startAngle: number; endAngle: number; color: string; status: string }[] = [];

    statusCounts.forEach((status) => {
      if (status.count === 0) return;
      const angle = (status.count / total) * 360;
      segments.push({
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: status.color,
        status: status.status,
      });
      currentAngle += angle;
    });

    return segments;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  };

  const segments = getDonutSegments();

  return (
    <div className="glass-card rounded-xl p-4 hover-lift">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-white/90">Project Status</h3>
          <p className="text-xs text-white/50">{total} total projects</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative w-24 h-24 flex-shrink-0">
          {total === 0 ? (
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {segments.map((segment, index) => (
                <path
                  key={index}
                  d={describeArc(50, 50, 40, segment.startAngle, segment.endAngle - 0.5)}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="12"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              ))}
            </svg>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold text-white">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {statusCounts.map((status) => (
            <div key={status.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="text-xs text-white/70 capitalize">{status.status}</span>
              </div>
              <span className="text-xs font-medium text-white/90">{status.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bars for active projects */}
      {projects.filter((p) => p.status === 'active').length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-white/50 mb-2">Active Project Progress</p>
          <div className="space-y-2">
            {projects
              .filter((p) => p.status === 'active')
              .slice(0, 3)
              .map((project) => (
                <div key={project.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70 truncate max-w-[120px]">{project.name}</span>
                    <span className="text-white/50">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
