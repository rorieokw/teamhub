import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Project } from '../types';
import { awardProjectCreated } from './ranks';

const COLLECTION = 'projects';

export function subscribeToProjects(
  callback: (projects: Project[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const projects: Project[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
    callback(projects);
  });
}

export async function createProject(
  data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'deadline'> & { deadline?: Date }
): Promise<string> {
  const projectData: Record<string, unknown> = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Convert Date to Timestamp if provided
  if (data.deadline) {
    projectData.deadline = Timestamp.fromDate(data.deadline);
  }

  const docRef = await addDoc(collection(db, COLLECTION), projectData);

  // Award points for creating a project
  await awardProjectCreated(data.createdBy);

  return docRef.id;
}

export async function updateProject(
  id: string,
  data: Partial<Omit<Project, 'id' | 'createdAt' | 'deadline'>> & { deadline?: Date }
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);

  const updateData: Record<string, unknown> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // Convert Date to Timestamp if provided
  if (data.deadline) {
    updateData.deadline = Timestamp.fromDate(data.deadline);
  } else if (data.deadline === undefined && 'deadline' in data) {
    // If deadline was explicitly set to undefined, remove it
    updateData.deadline = null;
  }

  await updateDoc(docRef, updateData);
}

export async function deleteProject(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

// Join a project
export async function joinProject(projectId: string, userId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, projectId);
  const { arrayUnion } = await import('firebase/firestore');
  await updateDoc(docRef, {
    members: arrayUnion(userId),
    updatedAt: serverTimestamp(),
  });
}

// Leave a project
export async function leaveProject(projectId: string, userId: string): Promise<void> {
  const docRef = doc(db, COLLECTION, projectId);
  const { arrayRemove } = await import('firebase/firestore');
  await updateDoc(docRef, {
    members: arrayRemove(userId),
    updatedAt: serverTimestamp(),
  });
}
