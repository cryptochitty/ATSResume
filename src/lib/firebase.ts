import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import firebaseConfig from '@/../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // On mobile webviews (APKs), popups are often blocked or fail.
    // Redirect is generally more stable for Capacitor apps.
    if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error('Sign-in Error Detail:', error);
    if (error && typeof error === 'object' && 'code' in error) {
      const authError = error as { code: string; message: string };
      if (authError.code === 'auth/unauthorized-domain') {
        alert('Domain Not Authorized: Please add "http://localhost" and "https://localhost" to your Firebase Console > Authentication > Settings > Authorized Domains.');
      } else if (authError.code === 'auth/internal-error') {
        alert('Internal Auth Error: This often happens in APKs if the SHA-1 fingerprint is not added to Firebase Console.');
      } else {
        alert(`Login Error (${authError.code}): ${authError.message}`);
      }
    }
    throw error;
  }
};

export const getAuthResult = () => getRedirectResult(auth);
export const logout = () => signOut(auth);

// Types for Resume
export interface ResumeData {
  id?: string;
  userId: string;
  title: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    website?: string;
    linkedin?: string;
    github?: string;
  };
  summary: string;
  experience: {
    id: string;
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    description: string;
    bullets: string[];
  }[];
  education: {
    id: string;
    school: string;
    degree: string;
    field: string;
    location: string;
    startDate: string;
    endDate: string;
  }[];
  skills: {
    category: string;
    items: string[];
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    link?: string;
    bullets: string[];
  }[];
  isPaid?: boolean;
  updatedAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
