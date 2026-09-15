import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDocFromServer,
  collection,
  addDoc
} from 'firebase/firestore';
import { UserProfile, SubscriptionTier, ManualPaymentRequest } from '../types';
import { getPlanLimits } from './authService';

// Dynamic Firebase configuration powered strictly by environment variables with fallback defaults
export const firebaseConfig = {
  apiKey: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) ||
    ''
  ).trim(),
  authDomain: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN) ||
    'premium-flash.firebaseapp.com'
  ),
  projectId: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
    'premium-flash'
  ),
  storageBucket: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET) ||
    'premium-flash.firebasestorage.app'
  ),
  messagingSenderId: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) ||
    '1085420561189'
  ),
  appId: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_APP_ID) ||
    '1:1085420561189:web:6e852df61272e2a27ff0cc'
  ),
  firestoreDatabaseId: (
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_DATABASE_ID) ||
    'ai-studio-kothaproaivoices-2648689c-40a3-49a5-83f1-18d4db5eaffd'
  )
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the project's specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

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
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
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
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline check:', error.message);
      return false;
    }
    // Non-fatal if test doc doesn't exist
    return true;
  }
}

// Sign In with Google Popup
export async function signInWithGoogle(): Promise<UserProfile> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const userDocRef = doc(db, 'users', fbUser.uid);
    let existingProfile: UserProfile | null = null;
    
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        existingProfile = snap.data() as UserProfile;
      }
    } catch (readErr) {
      console.warn('Initial profile read warning:', readErr);
    }

    if (existingProfile) {
      // Merge updated avatar and display name if changed
      const updatedProfile: UserProfile = {
        ...existingProfile,
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || existingProfile.name || 'Studio Creator',
        email: fbUser.email || existingProfile.email,
        avatar: fbUser.photoURL || existingProfile.avatar,
        isGoogleUser: true,
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, updatedProfile, { merge: true });
      return updatedProfile;
    } else {
      // Create new profile with default Free Tier limits
      const { limit, maxDuration } = getPlanLimits('free');
      const newProfile: UserProfile = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: fbUser.displayName || 'Studio Creator',
        email: fbUser.email || '',
        avatar: fbUser.photoURL || '',
        tier: 'free',
        monthlyLimit: limit,
        maxDurationSeconds: maxDuration,
        creditsUsed: 0,
        isGoogleUser: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, newProfile);
      return newProfile;
    }
  } catch (err: any) {
    console.error('Google Sign-in failed:', err);
    throw err;
  }
}

// Sign Out
export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}

export const logOutFirebase = signOutUser;

// Subscribe to real-time User Profile in Firestore
export function subscribeToUserProfile(
  uid: string, 
  onUpdate: (profile: UserProfile) => void,
  onError?: (err: any) => void
): () => void {
  const userDocRef = doc(db, 'users', uid);
  return onSnapshot(
    userDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as UserProfile);
      }
    },
    (error) => {
      console.error('Snapshot subscription error on user profile:', error);
      onError?.(error);
    }
  );
}

// Save/Update user profile in Firestore
export async function saveUserProfileToFirestore(profile: UserProfile): Promise<void> {
  if (!profile.uid) return;
  const userDocRef = doc(db, 'users', profile.uid);
  try {
    await setDoc(userDocRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${profile.uid}`);
  }
}

// Record a completed payment transaction
export async function recordTransaction(
  userId: string,
  tier: SubscriptionTier,
  amount: number,
  currency: string,
  provider: 'stripe' | 'sslcommerz',
  status: 'completed' | 'pending' | 'failed'
): Promise<void> {
  const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const txnDocRef = doc(db, `users/${userId}/transactions`, txnId);
  try {
    await setDoc(txnDocRef, {
      id: txnId,
      userId,
      tier,
      amount,
      currency,
      provider,
      status,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${userId}/transactions/${txnId}`);
  }
}

const LOCAL_PAYMENT_REQUESTS_KEY = 'kotha_manual_payment_requests';

export function getLocalPaymentRequests(): ManualPaymentRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENT_REQUESTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse local payment requests:', e);
    return [];
  }
}

export function saveLocalPaymentRequests(requests: ManualPaymentRequest[]): void {
  try {
    localStorage.setItem(LOCAL_PAYMENT_REQUESTS_KEY, JSON.stringify(requests));
  } catch (e) {
    console.warn('Failed to persist payment requests locally:', e);
  }
}

// Submit manual payment proof
export async function submitManualPaymentRequest(paymentReq: ManualPaymentRequest): Promise<void> {
  // 1. Save to local storage cache immediately
  const localList = getLocalPaymentRequests();
  const filtered = localList.filter(r => r.id !== paymentReq.id);
  filtered.unshift(paymentReq);
  saveLocalPaymentRequests(filtered);

  // 2. Persist to Firestore
  try {
    const reqDocRef = doc(db, 'payment_requests', paymentReq.id);
    await setDoc(reqDocRef, {
      ...paymentReq,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Firestore payment_requests submission warning:', err);
    // Non-fatal if offline: cached locally
  }
}

// Subscribe to all payment requests for Admin Panel
export function subscribeToPaymentRequests(
  onUpdate: (requests: ManualPaymentRequest[]) => void,
  onError?: (err: any) => void
): () => void {
  // Provide instant initial local data
  const initialLocal = getLocalPaymentRequests();
  if (initialLocal.length > 0) {
    onUpdate(initialLocal);
  }

  const colRef = collection(db, 'payment_requests');
  return onSnapshot(
    colRef,
    (snap) => {
      const firestoreItems: ManualPaymentRequest[] = [];
      snap.forEach((docSnap) => {
        firestoreItems.push(docSnap.data() as ManualPaymentRequest);
      });

      // Merge Firestore items with local items (prioritizing Firestore)
      const local = getLocalPaymentRequests();
      const map = new Map<string, ManualPaymentRequest>();
      
      local.forEach(item => map.set(item.id, item));
      firestoreItems.forEach(item => map.set(item.id, item));
      
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      saveLocalPaymentRequests(merged);
      onUpdate(merged);
    },
    (err) => {
      console.warn('Firestore payment_requests onSnapshot warning:', err);
      onError?.(err);
      // Fallback to local
      onUpdate(getLocalPaymentRequests());
    }
  );
}

// Admin: Approve payment request, upgrade user tier & reset credits
export async function approvePaymentRequest(paymentReq: ManualPaymentRequest): Promise<UserProfile | null> {
  const now = new Date().toISOString();
  const updatedReq: ManualPaymentRequest = {
    ...paymentReq,
    status: 'approved',
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: auth.currentUser?.email || 'admin@kotha.ai'
  };

  // 1. Update request in local storage
  const localList = getLocalPaymentRequests();
  const updatedList = localList.map(r => r.id === paymentReq.id ? updatedReq : r);
  saveLocalPaymentRequests(updatedList);

  // 2. Update request in Firestore
  try {
    const reqDocRef = doc(db, 'payment_requests', paymentReq.id);
    await setDoc(reqDocRef, updatedReq, { merge: true });
  } catch (err) {
    console.warn('Firestore payment_requests approval note:', err);
  }

  // 3. Upgrade user's tier & reset credits
  const { limit, maxDuration } = getPlanLimits(paymentReq.tier);
  let updatedUserProfile: UserProfile | null = null;

  if (paymentReq.userId) {
    try {
      const userDocRef = doc(db, 'users', paymentReq.userId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const existing = userSnap.data() as UserProfile;
        updatedUserProfile = {
          ...existing,
          tier: paymentReq.tier,
          creditsUsed: 0,
          monthlyLimit: limit,
          maxDurationSeconds: maxDuration,
          paymentStatus: 'none',
          pendingPaymentTier: undefined,
          pendingPaymentMethod: undefined,
          pendingPaymentTrxId: undefined,
          updatedAt: now
        };
        await setDoc(userDocRef, updatedUserProfile, { merge: true });
      } else {
        updatedUserProfile = {
          uid: paymentReq.userId,
          id: paymentReq.userId,
          name: paymentReq.userName || 'Studio User',
          email: paymentReq.userEmail,
          avatar: '',
          tier: paymentReq.tier,
          monthlyLimit: limit,
          maxDurationSeconds: maxDuration,
          creditsUsed: 0,
          isGoogleUser: true,
          paymentStatus: 'none',
          updatedAt: now
        };
        await setDoc(userDocRef, updatedUserProfile, { merge: true });
      }

      // Record transaction
      const priceMap: Record<SubscriptionTier, number> = {
        free: 0,
        basic: 2.99,
        plus: 9.99,
        pro: 19.99
      };
      await recordTransaction(
        paymentReq.userId,
        paymentReq.tier,
        priceMap[paymentReq.tier] || 0,
        paymentReq.method === 'bKash' ? 'BDT' : 'USD',
        paymentReq.method === 'bKash' ? 'sslcommerz' : 'stripe',
        'completed'
      );
    } catch (err) {
      console.warn('Firestore user profile upgrade note:', err);
    }
  }

  // Also check local current user profile
  try {
    const rawUser = localStorage.getItem('kotha_user_profile');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as UserProfile;
      if (parsed.uid === paymentReq.userId || parsed.id === paymentReq.userId || parsed.email === paymentReq.userEmail) {
        updatedUserProfile = {
          ...parsed,
          tier: paymentReq.tier,
          creditsUsed: 0,
          monthlyLimit: limit,
          maxDurationSeconds: maxDuration,
          paymentStatus: 'none',
          pendingPaymentTier: undefined,
          pendingPaymentMethod: undefined,
          pendingPaymentTrxId: undefined,
          updatedAt: now
        };
        localStorage.setItem('kotha_user_profile', JSON.stringify(updatedUserProfile));
      }
    }
  } catch (e) {
    console.warn('Local user profile update error:', e);
  }

  return updatedUserProfile;
}

// Admin: Reject payment request
export async function rejectPaymentRequest(paymentReq: ManualPaymentRequest): Promise<void> {
  const now = new Date().toISOString();
  const updatedReq: ManualPaymentRequest = {
    ...paymentReq,
    status: 'rejected',
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: auth.currentUser?.email || 'admin@kotha.ai'
  };

  // 1. Update in local storage
  const localList = getLocalPaymentRequests();
  const updatedList = localList.map(r => r.id === paymentReq.id ? updatedReq : r);
  saveLocalPaymentRequests(updatedList);

  // 2. Update in Firestore
  try {
    const reqDocRef = doc(db, 'payment_requests', paymentReq.id);
    await setDoc(reqDocRef, updatedReq, { merge: true });
  } catch (err) {
    console.warn('Firestore payment_requests rejection note:', err);
  }

  // 3. Update user status
  if (paymentReq.userId) {
    try {
      const userDocRef = doc(db, 'users', paymentReq.userId);
      await updateDoc(userDocRef, {
        paymentStatus: 'rejected',
        updatedAt: now
      });
    } catch (err) {
      console.warn('Firestore user rejection status note:', err);
    }
  }

  try {
    const rawUser = localStorage.getItem('kotha_user_profile');
    if (rawUser) {
      const parsed = JSON.parse(rawUser) as UserProfile;
      if (parsed.uid === paymentReq.userId || parsed.id === paymentReq.userId || parsed.email === paymentReq.userEmail) {
        parsed.paymentStatus = 'rejected';
        localStorage.setItem('kotha_user_profile', JSON.stringify(parsed));
      }
    }
  } catch (e) {
    console.warn('Local user rejection status error:', e);
  }
}

export const ADMIN_EMAIL = 'mohistudio95@gmail.com';

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

