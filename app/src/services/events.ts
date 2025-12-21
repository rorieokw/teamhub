import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TeamEvent, Task } from '../types';

const COLLECTION = 'events';

// Create a new event
export async function createEvent(
  title: string,
  date: Date,
  createdBy: string,
  createdByName: string,
  options?: {
    description?: string;
    endDate?: Date;
    allDay?: boolean;
    projectId?: string;
    color?: string;
    attendees?: string[];
  }
): Promise<string> {
  const eventData: Omit<TeamEvent, 'id'> = {
    title,
    date: Timestamp.fromDate(date),
    allDay: options?.allDay ?? true,
    createdBy,
    createdByName,
    createdAt: Timestamp.now(),
    ...(options?.description && { description: options.description }),
    ...(options?.endDate && { endDate: Timestamp.fromDate(options.endDate) }),
    ...(options?.projectId && { projectId: options.projectId }),
    ...(options?.color && { color: options.color }),
    ...(options?.attendees && { attendees: options.attendees }),
  };

  const docRef = await addDoc(collection(db, COLLECTION), eventData);
  return docRef.id;
}

// Subscribe to events for a specific month
export function subscribeToMonthEvents(
  year: number,
  month: number, // 0-indexed (0 = January)
  callback: (events: TeamEvent[]) => void
): () => void {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', Timestamp.fromDate(startOfMonth)),
    where('date', '<=', Timestamp.fromDate(endOfMonth)),
    orderBy('date', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events: TeamEvent[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamEvent[];
      callback(events);
    },
    (error) => {
      console.debug('Events subscription error:', error.message);
      callback([]); // Return empty array on error
    }
  );
}

// Subscribe to upcoming events (for dashboard widget)
export function subscribeToUpcomingEvents(
  days: number,
  callback: (events: TeamEvent[]) => void
): () => void {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const q = query(
    collection(db, COLLECTION),
    where('date', '>=', Timestamp.fromDate(now)),
    where('date', '<=', Timestamp.fromDate(futureDate)),
    orderBy('date', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const events: TeamEvent[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TeamEvent[];
      callback(events);
    },
    (error) => {
      console.debug('Upcoming events subscription error:', error.message);
      callback([]); // Return empty array on error
    }
  );
}

// Update an event
export async function updateEvent(
  eventId: string,
  updates: Partial<Omit<TeamEvent, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  const eventRef = doc(db, COLLECTION, eventId);
  const updateData: Record<string, unknown> = { ...updates };

  // Convert dates to Timestamps
  if (updates.date instanceof Date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  if (updates.endDate instanceof Date) {
    updateData.endDate = Timestamp.fromDate(updates.endDate);
  }

  await updateDoc(eventRef, updateData);
}

// Delete an event
export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, eventId));
}

// Convert tasks with due dates to calendar events (for display only)
export function tasksToCalendarEvents(tasks: Task[]): TeamEvent[] {
  return tasks
    .filter((task) => task.dueDate && task.status !== 'done')
    .map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      date: task.dueDate!,
      allDay: true,
      taskId: task.id,
      projectId: task.projectId,
      createdBy: task.createdBy,
      createdByName: '',
      color: getPriorityColor(task.priority),
      createdAt: task.createdAt,
    }));
}

// Get color based on task priority
function getPriorityColor(priority: Task['priority']): string {
  switch (priority) {
    case 'urgent':
      return '#ef4444'; // red
    case 'high':
      return '#f97316'; // orange
    case 'medium':
      return '#3b82f6'; // blue
    case 'low':
      return '#6b7280'; // gray
    default:
      return '#8b5cf6'; // purple
  }
}

// Get events for a specific day
export function getEventsForDay(events: TeamEvent[], date: Date): TeamEvent[] {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  return events.filter((event) => {
    const eventDate = event.date.toDate();
    return eventDate >= dayStart && eventDate <= dayEnd;
  });
}

// Format event time for display
export function formatEventTime(event: TeamEvent): string {
  if (event.allDay) return 'All day';

  const date = event.date.toDate();
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Check if event is today
export function isEventToday(event: TeamEvent): boolean {
  const today = new Date();
  const eventDate = event.date.toDate();
  return (
    eventDate.getDate() === today.getDate() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  );
}

// Event colors for user selection
export const EVENT_COLORS = [
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];
