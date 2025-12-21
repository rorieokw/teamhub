import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { TaskComment } from '../types';
import { awardCommentAdded } from './ranks';

export function subscribeToTaskComments(
  taskId: string,
  callback: (comments: TaskComment[]) => void
): () => void {
  const q = query(
    collection(db, 'tasks', taskId, 'comments'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const comments: TaskComment[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      taskId,
      ...doc.data(),
    })) as TaskComment[];
    callback(comments);
  });
}

export async function addComment(
  taskId: string,
  userId: string,
  userName: string,
  content: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'tasks', taskId, 'comments'), {
    userId,
    userName,
    content,
    createdAt: serverTimestamp(),
  });

  // Award points for adding a comment
  await awardCommentAdded(userId);

  return docRef.id;
}

export async function deleteComment(
  taskId: string,
  commentId: string
): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId, 'comments', commentId));
}
