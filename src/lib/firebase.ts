import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import firebaseConfig from '@/../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Initialize Google Auth plugin
GoogleAuth.initialize({
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
});

/**
 * Google Sign-in via Capacitor plugin — works on Android, iOS and web
 */
export const signInWithGoogle = async (): Promise<User | null> => {
  try {
    const googleUser = await GoogleAuth.signIn();
    const credential = GoogleAuthProvider.credential(
      googleUser.authentication.idToken
    );
    const result = await signInWithCredential(auth, credential);
    return result.user;
  } catch (error) {
    console.error('Google Sign-in Error:', error);
    return null;
  }
};

export const logout = async () => {
  await GoogleAuth.signOut();
  return signOut(auth);
};

// Keep for backward compatibility — no longer needed with plugin approach
export const getAuthResult = async (): Promise<User | null> => null;

// --- TYPES & INTERFACES ---

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

/**
 * ERROR HANDLING
 */
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
