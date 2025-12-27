import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { ProjectLink } from '../types';

const COLLECTION = 'projectLinks';

// Subscribe to project links
export function subscribeToProjectLinks(
  projectId: string,
  callback: (links: ProjectLink[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const links: ProjectLink[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProjectLink[];
    callback(links);
  });
}

// Add a new project link
export async function addProjectLink(
  projectId: string,
  title: string,
  url: string,
  addedBy: string,
  addedByName: string,
  icon?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    title,
    url,
    addedBy,
    addedByName,
    ...(icon && { icon }),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Delete a project link
export async function deleteProjectLink(linkId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, linkId));
}

// Get favicon URL for a link
export function getFaviconUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
  } catch {
    return '';
  }
}
