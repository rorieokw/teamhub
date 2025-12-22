import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { StickyNote, StickyNoteColor } from '../types';

// Subscribe to user's sticky notes
export function subscribeToStickyNotes(
  userId: string,
  callback: (notes: StickyNote[]) => void
): () => void {
  const q = query(
    collection(db, 'stickyNotes'),
    where('userId', '==', userId),
    orderBy('position', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const notes: StickyNote[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as StickyNote[];
    callback(notes);
  });
}

// Create a new sticky note
export async function createStickyNote(
  userId: string,
  content: string,
  color: StickyNoteColor = 'yellow'
): Promise<string> {
  // Get the highest position to add new note at the end
  const q = query(
    collection(db, 'stickyNotes'),
    where('userId', '==', userId),
    orderBy('position', 'desc')
  );
  const snapshot = await getDocs(q);
  const highestPosition = snapshot.empty ? 0 : (snapshot.docs[0].data().position || 0) + 1;

  const docRef = await addDoc(collection(db, 'stickyNotes'), {
    userId,
    content,
    color,
    position: highestPosition,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

// Update a sticky note
export async function updateStickyNote(
  noteId: string,
  updates: Partial<Pick<StickyNote, 'content' | 'color' | 'position'>>
): Promise<void> {
  const noteRef = doc(db, 'stickyNotes', noteId);
  await updateDoc(noteRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Delete a sticky note
export async function deleteStickyNote(noteId: string): Promise<void> {
  await deleteDoc(doc(db, 'stickyNotes', noteId));
}

// Reorder sticky notes
export async function reorderStickyNotes(
  notes: { id: string; position: number }[]
): Promise<void> {
  await Promise.all(
    notes.map((note) =>
      updateDoc(doc(db, 'stickyNotes', note.id), {
        position: note.position,
        updatedAt: serverTimestamp(),
      })
    )
  );
}
