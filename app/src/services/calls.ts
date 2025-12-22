import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  setDoc,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Call, CallStatus } from '../types';

const COLLECTION = 'calls';

// Google's free STUN servers
export const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// Create a new call
export async function createCall(
  callerId: string,
  callerName: string,
  callerAvatar: string | undefined,
  participantIds: string[]
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    type: 'audio',
    callerId,
    callerName,
    callerAvatar: callerAvatar || null,
    participants: [callerId, ...participantIds],
    status: 'ringing',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// Update call status
export async function updateCallStatus(
  callId: string,
  status: CallStatus
): Promise<void> {
  const updates: Record<string, unknown> = { status };

  if (status === 'active') {
    updates.startedAt = serverTimestamp();
  } else if (status === 'ended' || status === 'declined' || status === 'missed') {
    updates.endedAt = serverTimestamp();
  }

  await updateDoc(doc(db, COLLECTION, callId), updates);
}

// Subscribe to a specific call
export function subscribeToCall(
  callId: string,
  callback: (call: Call | null) => void
): () => void {
  return onSnapshot(doc(db, COLLECTION, callId), (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Call);
    } else {
      callback(null);
    }
  });
}

// Subscribe to incoming calls for a user
export function subscribeToIncomingCalls(
  userId: string,
  callback: (calls: Call[]) => void
): () => void {
  console.log('Setting up incoming calls subscription for user:', userId);

  const q = query(
    collection(db, COLLECTION),
    where('participants', 'array-contains', userId),
    where('status', '==', 'ringing')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log('Incoming calls snapshot received, docs:', snapshot.docs.length);
      const calls = snapshot.docs
        .map((doc) => {
          console.log('Call doc:', doc.id, doc.data());
          return { id: doc.id, ...doc.data() } as Call;
        })
        .filter((call) => call.callerId !== userId); // Exclude calls we initiated
      console.log('Filtered incoming calls:', calls.length);
      callback(calls);
    },
    (error) => {
      console.error('Error in incoming calls subscription:', error);
      // If there's an index error, the error message will contain a link to create it
      if (error.message.includes('index')) {
        console.error('INDEX REQUIRED: Please create the composite index using the link in the error above');
      }
      callback([]);
    }
  );
}

// Subscribe to active calls for a user
export function subscribeToActiveCalls(
  userId: string,
  callback: (calls: Call[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('participants', 'array-contains', userId),
    where('status', '==', 'active')
  );

  return onSnapshot(q, (snapshot) => {
    const calls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Call));
    callback(calls);
  });
}

// ==================== WebRTC Signaling ====================

// Store offer for a peer connection
export async function storeOffer(
  callId: string,
  fromUserId: string,
  toUserId: string,
  offer: RTCSessionDescriptionInit
): Promise<void> {
  const signalId = `${fromUserId}_${toUserId}`;
  await setDoc(doc(db, COLLECTION, callId, 'signals', signalId), {
    type: 'offer',
    from: fromUserId,
    to: toUserId,
    sdp: offer,
    createdAt: serverTimestamp(),
  });
}

// Store answer for a peer connection
export async function storeAnswer(
  callId: string,
  fromUserId: string,
  toUserId: string,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  const signalId = `${toUserId}_${fromUserId}`; // Match the offer's signal ID
  await updateDoc(doc(db, COLLECTION, callId, 'signals', signalId), {
    answer: answer,
    answeredAt: serverTimestamp(),
  });
}

interface SignalData {
  id: string;
  type: 'offer';
  from: string;
  to: string;
  sdp: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
}

// Subscribe to signals for a user in a call
export function subscribeToSignals(
  callId: string,
  userId: string,
  callback: (signals: SignalData[]) => void
): () => void {
  const q = query(collection(db, COLLECTION, callId, 'signals'));

  return onSnapshot(q, (snapshot) => {
    const allSignals: SignalData[] = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<SignalData, 'id'>),
    }));
    const signals = allSignals.filter(
      (signal) => signal.to === userId || signal.from === userId
    );
    callback(signals);
  });
}

// Store ICE candidate
export async function storeIceCandidate(
  callId: string,
  fromUserId: string,
  toUserId: string,
  candidate: RTCIceCandidateInit
): Promise<void> {
  await addDoc(collection(db, COLLECTION, callId, 'candidates'), {
    from: fromUserId,
    to: toUserId,
    candidate,
    createdAt: serverTimestamp(),
  });
}

// Subscribe to ICE candidates for a user
export function subscribeToIceCandidates(
  callId: string,
  userId: string,
  callback: (candidates: Array<{ from: string; candidate: RTCIceCandidateInit }>) => void
): () => void {
  const q = query(
    collection(db, COLLECTION, callId, 'candidates'),
    where('to', '==', userId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const candidates = snapshot.docs.map((doc) => ({
      from: doc.data().from as string,
      candidate: doc.data().candidate as RTCIceCandidateInit,
    }));
    callback(candidates);
  });
}

// Clean up call signals and candidates
export async function cleanupCallSignaling(callId: string): Promise<void> {
  // Delete all signals
  const signalsSnapshot = await getDocs(collection(db, COLLECTION, callId, 'signals'));
  for (const doc of signalsSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete all candidates
  const candidatesSnapshot = await getDocs(collection(db, COLLECTION, callId, 'candidates'));
  for (const doc of candidatesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
}
