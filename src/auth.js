import {
  onAuthStateChanged as firebaseOnAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from './firebase.js';

/** @typedef {{ uid: string, email: string | null }} AuthUser */

/** @type {AuthUser | null} */
let currentUser = null;
let authReadyResolve;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolve = resolve;
});
let authInitialized = false;

function toAuthUser(user) {
  if (!user) return null;
  return { uid: user.uid, email: user.email ?? null };
}

function emitAuthChanged(user) {
  window.dispatchEvent(
    new CustomEvent('auth:changed', {
      detail: { user },
    })
  );
}

function setCurrentUser(user) {
  currentUser = user;
  emitAuthChanged(user);
}

async function ensureUserProfile(user) {
  if (!user) return;
  const db = getFirestoreDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;
  await setDoc(ref, {
    email: user.email || '',
    createdAt: new Date().toISOString(),
  });
}

function initAuthListener() {
  if (authInitialized) return;
  authInitialized = true;

  if (!isFirebaseConfigured()) {
    currentUser = null;
    authReadyResolve(null);
    return;
  }

  const auth = getFirebaseAuth();
  firebaseOnAuthStateChanged(auth, async (firebaseUser) => {
    const user = toAuthUser(firebaseUser);
    if (user) {
      try {
        await ensureUserProfile(firebaseUser);
      } catch (err) {
        console.warn('Failed to ensure user profile:', err);
      }
    }
    setCurrentUser(user);
    authReadyResolve(user);
  });
}

initAuthListener();

/**
 * Wait until the first auth state is known (or immediately if Firebase is not configured).
 * @returns {Promise<AuthUser|null>}
 */
export function waitForAuthReady() {
  return authReadyPromise;
}

/**
 * Subscribe to auth changes. Returns unsubscribe.
 * @param {(user: AuthUser|null) => void} callback
 */
export function onAuthStateChanged(callback) {
  initAuthListener();
  callback(currentUser);
  const handler = (event) => callback(event.detail.user);
  window.addEventListener('auth:changed', handler);
  return () => window.removeEventListener('auth:changed', handler);
}

/** @returns {AuthUser|null} */
export function getCurrentUser() {
  return currentUser;
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
export async function signUp(email, password) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env vars.');
  }
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  const user = toAuthUser(credential.user);
  setCurrentUser(user);
  return user;
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<AuthUser>}
 */
export async function signIn(email, password) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Set VITE_FIREBASE_* env vars.');
  }
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  const user = toAuthUser(credential.user);
  setCurrentUser(user);
  return user;
}

/** @returns {Promise<void>} */
export async function signOut() {
  if (!isFirebaseConfigured()) {
    setCurrentUser(null);
    return;
  }
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
  setCurrentUser(null);
}

/**
 * @returns {AuthUser}
 */
export function requireAuth() {
  if (!isFirebaseConfigured()) {
    // Local fallback mode: no cloud user required.
    return { uid: 'local', email: null };
  }
  const user = getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export { isFirebaseConfigured };
