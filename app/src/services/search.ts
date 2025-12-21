import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Task, Project, Message } from '../types';

export interface SearchResult {
  type: 'task' | 'project' | 'message';
  id: string;
  title: string;
  subtitle?: string;
  projectId?: string;
  channelId?: string;
}

// Search tasks by title
async function searchTasks(
  searchTerm: string,
  projectIds: string[]
): Promise<SearchResult[]> {
  if (projectIds.length === 0) return [];

  const results: SearchResult[] = [];
  const lowerSearch = searchTerm.toLowerCase();

  // Firestore doesn't support full-text search, so we fetch and filter client-side
  // For a small team app, this is acceptable
  for (const projectId of projectIds.slice(0, 10)) {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      const task = doc.data() as Task;
      if (
        task.title.toLowerCase().includes(lowerSearch) ||
        task.description?.toLowerCase().includes(lowerSearch)
      ) {
        results.push({
          type: 'task',
          id: doc.id,
          title: task.title,
          subtitle: task.description?.slice(0, 50),
          projectId: task.projectId,
        });
      }
    });
  }

  return results.slice(0, 10);
}

// Search projects by name
async function searchProjects(
  searchTerm: string,
  projectIds: string[]
): Promise<SearchResult[]> {
  if (projectIds.length === 0) return [];

  const results: SearchResult[] = [];
  const lowerSearch = searchTerm.toLowerCase();

  const q = query(
    collection(db, 'projects'),
    where('__name__', 'in', projectIds.slice(0, 10))
  );

  const snapshot = await getDocs(q);
  snapshot.docs.forEach((doc) => {
    const project = doc.data() as Project;
    if (
      project.name.toLowerCase().includes(lowerSearch) ||
      project.description?.toLowerCase().includes(lowerSearch)
    ) {
      results.push({
        type: 'project',
        id: doc.id,
        title: project.name,
        subtitle: project.description?.slice(0, 50),
        projectId: doc.id,
      });
    }
  });

  return results;
}

// Search messages by content
async function searchMessages(
  searchTerm: string,
  channelIds: string[]
): Promise<SearchResult[]> {
  if (channelIds.length === 0) return [];

  const results: SearchResult[] = [];
  const lowerSearch = searchTerm.toLowerCase();

  for (const channelId of channelIds.slice(0, 10)) {
    const q = query(
      collection(db, 'messages'),
      where('channelId', '==', channelId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    snapshot.docs.forEach((doc) => {
      const message = doc.data() as Message;
      if (message.content.toLowerCase().includes(lowerSearch)) {
        results.push({
          type: 'message',
          id: doc.id,
          title: message.content.slice(0, 60) + (message.content.length > 60 ? '...' : ''),
          channelId: message.channelId,
        });
      }
    });
  }

  return results.slice(0, 10);
}

// Combined search across all types
export async function globalSearch(
  searchTerm: string,
  projectIds: string[],
  channelIds: string[]
): Promise<SearchResult[]> {
  if (!searchTerm || searchTerm.length < 2) return [];

  const [tasks, projects, messages] = await Promise.all([
    searchTasks(searchTerm, projectIds),
    searchProjects(searchTerm, projectIds),
    searchMessages(searchTerm, channelIds),
  ]);

  // Combine and sort by relevance (projects first, then tasks, then messages)
  return [...projects, ...tasks, ...messages].slice(0, 20);
}
