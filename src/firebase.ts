import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import defaultFirebaseConfig from './firebase-applet-config.json';

// Define OperationType enum for structured error logging
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
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  };
}

// Robust config check helper
export function isValidFirebaseConfig(config: any): boolean {
  return !!(config && config.apiKey && config.projectId && config.apiKey !== "");
}

// Get active configuration (dynamic local override supported!)
export function getActiveFirebaseConfig() {
  try {
    const customConfigStr = localStorage.getItem('custom_firebase_config');
    if (customConfigStr) {
      const parsed = JSON.parse(customConfigStr);
      if (isValidFirebaseConfig(parsed)) {
        return { config: parsed, isCustom: true };
      }
    }
  } catch (e) {
    console.error('Error parsing custom firebase config from localStorage:', e);
  }

  if (isValidFirebaseConfig(defaultFirebaseConfig)) {
    return { config: defaultFirebaseConfig, isCustom: false };
  }

  return null;
}

let app: any = null;
let db: any = null;
let auth: any = null;

const activeInfo = getActiveFirebaseConfig();
if (activeInfo) {
  try {
    app = initializeApp(activeInfo.config);
    // Support custom firestore database instances safely
    const dbId = activeInfo.config.firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    auth = getAuth(app);
  } catch (e) {
    console.error('Failed to initialize Firebase App:', e);
  }
}

// Export initialised services
export { app, db, auth };

// Safe helper to determine if Firebase is loaded and reachable
export function isFirebaseReady(): boolean {
  return !!(app && db && auth);
}

// Standardised Firebase Error handler matching the skill requirements
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
    },
    operationType,
    path,
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Simplified Google Popup Login Handler
export async function loginWithGoogle() {
  if (!isFirebaseReady()) {
    throw new Error('Firebase is not initialized or configured.');
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google Auth Popup failed:', error);
    throw error;
  }
}

export async function logoutUser() {
  if (!isFirebaseReady()) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error('User signout failed:', error);
    throw error;
  }
}

async function testConnection() {
  if (!isFirebaseReady()) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
