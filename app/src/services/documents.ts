import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Document } from '../types';

const COLLECTION = 'documents';

export function subscribeToDocuments(
  callback: (documents: Document[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const documents: Document[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Document[];
    callback(documents);
  });
}

export function subscribeToProjectDocuments(
  projectId: string,
  callback: (documents: Document[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const documents: Document[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Document[];
    callback(documents);
  });
}

// Add a document link (Google Drive, Dropbox, etc.)
export async function addDocumentLink(
  projectId: string,
  name: string,
  fileUrl: string,
  fileType: string,
  uploadedBy: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    projectId,
    name,
    fileUrl,
    fileType,
    fileSize: 0,
    uploadedBy,
    storagePath: '', // No storage path for linked files
    isLink: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function deleteDocument(documentId: string): Promise<void> {
  // Just delete from Firestore (no storage to clean up for links)
  await deleteDoc(doc(db, COLLECTION, documentId));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return 'Link';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(fileType: string): string {
  if (fileType.includes('google') || fileType.includes('drive')) return '📁';
  if (fileType.includes('doc')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('slide') || fileType.includes('presentation')) return '📽️';
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('video')) return '🎬';
  if (fileType.includes('link')) return '🔗';
  return '📎';
}

export function detectFileType(url: string): string {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('docs.google.com/document')) return 'google-doc';
  if (lowerUrl.includes('docs.google.com/spreadsheets')) return 'google-sheet';
  if (lowerUrl.includes('docs.google.com/presentation')) return 'google-slides';
  if (lowerUrl.includes('drive.google.com')) return 'google-drive';
  if (lowerUrl.includes('dropbox.com')) return 'dropbox';
  if (lowerUrl.includes('onedrive.live.com') || lowerUrl.includes('sharepoint.com')) return 'onedrive';
  if (lowerUrl.includes('notion.so')) return 'notion';
  if (lowerUrl.includes('figma.com')) return 'figma';
  if (lowerUrl.includes('github.com')) return 'github';

  return 'link';
}
