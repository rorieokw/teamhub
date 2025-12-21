import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createEvent, deleteEvent, formatEventTime, EVENT_COLORS } from '../../services/events';
import type { TeamEvent, Task } from '../../types';

interface EventModalProps {
  date: Date;
  events: TeamEvent[];
  tasks: Task[];
  onClose: () => void;
}

export default function EventModal({ date, events, tasks, onClose }: EventModalProps) {
  const { currentUser, userProfile } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [time, setTime] = useState('09:00');
  const [color, setColor] = useState(EVENT_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile || !title.trim()) return;

    setIsSubmitting(true);
    try {
      let eventDate = new Date(date);
      if (!allDay) {
        const [hours, minutes] = time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);
      }

      await createEvent(title.trim(), eventDate, currentUser.uid, userProfile.displayName, {
        description: description.trim() || undefined,
        allDay,
        color,
      });

      setTitle('');
      setDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create event:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      await deleteEvent(eventId);
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-card rounded-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white">{formattedDate}</h3>
            <p className="text-xs text-white/50 mt-0.5">
              {events.length} event(s), {tasks.length} task(s) due
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Events */}
          {events.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Events</h4>
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-white/5 rounded-lg group"
                  >
                    <div
                      className="w-1 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: event.color || '#8b5cf6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90 truncate">{event.title}</p>
                      <p className="text-xs text-white/50">{formatEventTime(event)}</p>
                      {event.description && (
                        <p className="text-sm text-white/60 mt-1">{event.description}</p>
                      )}
                    </div>
                    {event.createdBy === currentUser?.uid && (
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-red-400 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Tasks Due</h4>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        task.priority === 'urgent' ? 'bg-red-500' :
                        task.priority === 'high' ? 'bg-orange-500' :
                        task.priority === 'medium' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white/90 truncate">{task.title}</p>
                      <p className="text-xs text-white/50 capitalize">{task.priority} priority</p>
                    </div>
                    <span className={`
                      px-2 py-0.5 text-[10px] rounded-full
                      ${task.status === 'done' ? 'bg-green-500/20 text-green-400' :
                        task.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }
                    `}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {events.length === 0 && tasks.length === 0 && !showCreateForm && (
            <div className="text-center py-6">
              <p className="text-white/50 mb-2">Nothing scheduled</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                Add an event
              </button>
            </div>
          )}

          {/* Create form */}
          {showCreateForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Event title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  autoFocus
                />
              </div>

              <div>
                <textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
                  />
                  <span className="text-sm text-white/70">All day</span>
                </label>

                {!allDay && (
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                )}
              </div>

              <div>
                <label className="text-xs text-white/50 mb-2 block">Color</label>
                <div className="flex gap-2">
                  {EVENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white/90 hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isSubmitting}
                  className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Creating...' : 'Add Event'}
                </button>
              </div>
            </form>
          ) : (events.length > 0 || tasks.length > 0) && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-white/50 hover:text-white/80 hover:bg-white/5 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Event
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
