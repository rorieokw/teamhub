import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToMonthEvents, getEventsForDay } from '../../services/events';
import { subscribeToProjects } from '../../services/projects';
import { subscribeToAllAccessibleTasks } from '../../services/tasks';
import EventModal from './EventModal';
import type { TeamEvent, Task, Project } from '../../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarWidget() {
  const { currentUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Subscribe to events for current month
  useEffect(() => {
    // Set loading false after a short delay even if subscription fails
    const timeout = setTimeout(() => setLoading(false), 1000);

    const unsubscribe = subscribeToMonthEvents(year, month, (data) => {
      setEvents(data);
      setLoading(false);
      clearTimeout(timeout);
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [year, month]);

  // Subscribe to projects for task filtering
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToProjects((data) => {
      setProjects(data.filter((p) => p.members.includes(currentUser.uid)));
    });

    return unsubscribe;
  }, [currentUser]);

  // Subscribe to tasks with due dates
  useEffect(() => {
    if (projects.length === 0) return;

    const projectIds = projects.map((p) => p.id);
    const unsubscribe = subscribeToAllAccessibleTasks(projectIds, (data) => {
      setTasks(data.filter((t) => t.dueDate));
    });

    return unsubscribe;
  }, [projects]);

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty slots for days before the first of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getDayEvents = (date: Date): TeamEvent[] => {
    return getEventsForDay(events, date);
  };

  const getDayTasks = (date: Date): Task[] => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    return tasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = task.dueDate.toDate();
      return dueDate >= dayStart && dueDate <= dayEnd;
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const calendarDays = getCalendarDays();

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📅</span>
          <h3 className="text-sm font-medium text-white/90">Calendar</h3>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-4 hover-lift">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📅</span>
          <h3 className="text-sm font-medium text-white/90">
            {MONTHS[month]} {year}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs text-white/60 hover:text-white/90 hover:bg-white/10 rounded transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToPrevMonth}
            className="p-1 text-white/60 hover:text-white/90 hover:bg-white/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1 text-white/60 hover:text-white/90 hover:bg-white/10 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-[10px] text-white/40 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayEvents = getDayEvents(date);
          const dayTasks = getDayTasks(date);
          const hasItems = dayEvents.length > 0 || dayTasks.length > 0;
          const today = isToday(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDayClick(date)}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center p-1
                transition-all text-sm relative group
                ${today
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold'
                  : 'hover:bg-white/10 text-white/80'
                }
              `}
            >
              <span className={today ? '' : ''}>{date.getDate()}</span>
              {hasItems && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.length > 0 && (
                    <span className="w-1 h-1 rounded-full bg-blue-400" />
                  )}
                  {dayTasks.length > 0 && (
                    <span className="w-1 h-1 rounded-full bg-orange-400" />
                  )}
                </div>
              )}

              {/* Tooltip on hover */}
              {hasItems && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {dayEvents.length > 0 && <span>{dayEvents.length} event(s)</span>}
                  {dayEvents.length > 0 && dayTasks.length > 0 && <span>, </span>}
                  {dayTasks.length > 0 && <span>{dayTasks.length} task(s)</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[10px] text-white/50">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          Events
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-white/50">
          <span className="w-2 h-2 rounded-full bg-orange-400" />
          Task Due
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedDate && (
        <EventModal
          date={selectedDate}
          events={getDayEvents(selectedDate)}
          tasks={getDayTasks(selectedDate)}
          onClose={() => {
            setShowEventModal(false);
            setSelectedDate(null);
          }}
        />
      )}
    </div>
  );
}
