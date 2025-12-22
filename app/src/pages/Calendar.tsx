import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToMonthEvents, getEventsForDay, createEvent } from '../services/events';
import { subscribeToProjects } from '../services/projects';
import { subscribeToAllAccessibleTasks } from '../services/tasks';
import EventModal from '../components/calendar/EventModal';
import type { TeamEvent, Task, Project } from '../types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Calendar() {
  const { currentUser, userProfile } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<TeamEvent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Subscribe to events for current month
  useEffect(() => {
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

  // Subscribe to projects
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

  const getCalendarDays = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Fill remaining slots to complete the grid
    const remaining = 42 - days.length;
    for (let i = 0; i < remaining; i++) {
      days.push(null);
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

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month;
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
  };

  const handleCreateEvent = async () => {
    if (!currentUser || !userProfile || !selectedDate || !newEventTitle.trim()) return;

    try {
      await createEvent(
        newEventTitle.trim(),
        selectedDate,
        currentUser.uid,
        userProfile.displayName,
        {
          description: newEventDescription.trim(),
          allDay: true,
        }
      );

      setNewEventTitle('');
      setNewEventDescription('');
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendar</h1>
          <p className="text-gray-400">View and manage your team events</p>
        </div>
        <button
          onClick={() => {
            setSelectedDate(new Date());
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25"
        >
          + Add Event
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="glass rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">
              {MONTHS[month]} {year}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass rounded-xl flex-1 overflow-hidden flex flex-col">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-white/10">
          {DAYS.map((day, index) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-medium text-gray-400 border-r border-white/10 last:border-r-0"
            >
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{DAYS_SHORT[index]}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-7 flex-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="border-r border-b border-white/10 last:border-r-0 bg-white/5"
                  />
                );
              }

              const dayEvents = getDayEvents(date);
              const dayTasks = getDayTasks(date);
              const today = isToday(date);
              const currentMonthDay = isCurrentMonth(date);

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => handleDayClick(date)}
                  className={`
                    border-r border-b border-white/10 last:border-r-0 p-2 text-left
                    transition-colors hover:bg-white/5 min-h-[80px] md:min-h-[100px]
                    ${!currentMonthDay ? 'opacity-40' : ''}
                    ${today ? 'bg-purple-500/10' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`
                        w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                        ${today
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white'
                          : 'text-white/80'
                        }
                      `}
                    >
                      {date.getDate()}
                    </span>
                  </div>

                  {/* Events & Tasks */}
                  <div className="space-y-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className="text-[10px] md:text-xs px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 truncate"
                        style={{ backgroundColor: event.color ? `${event.color}30` : undefined }}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className="text-[10px] md:text-xs px-1.5 py-0.5 rounded bg-orange-500/30 text-orange-300 truncate"
                      >
                        {task.title}
                      </div>
                    ))}
                    {(dayEvents.length + dayTasks.length) > 2 && (
                      <div className="text-[10px] text-gray-500">
                        +{dayEvents.length + dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-3 h-3 rounded bg-blue-500/30" />
          Events
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="w-3 h-3 rounded bg-orange-500/30" />
          Task Due Dates
        </div>
      </div>

      {/* Event Detail Modal */}
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

      {/* Create Event Modal */}
      {showCreateModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
          <div className="relative glass rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Create Event</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-gray-400">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title
                </label>
                <input
                  type="text"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Enter event title"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newEventDescription}
                  onChange={(e) => setNewEventDescription(e.target.value)}
                  placeholder="Enter event description"
                  rows={3}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={!newEventTitle.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium"
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
