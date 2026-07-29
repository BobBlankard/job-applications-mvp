import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from './firebase.js';
import { requireAuth } from './auth.js';

const STORAGE_KEY = 'resume-builder-cover-letters';

function generateId() {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useCloud() {
  return isFirebaseConfigured();
}

function coverLettersCol(uid) {
  return collection(getFirestoreDb(), 'users', uid, 'coverLetters');
}

function coverLetterRef(uid, id) {
  return doc(getFirestoreDb(), 'users', uid, 'coverLetters', id);
}

function readLocalStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStore(coverLetters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coverLetters));
  } catch {
    /* ignore quota errors */
  }
}

function sortByUpdatedAtDesc(items) {
  return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getAllCoverLetters() {
  if (!useCloud()) {
    return sortByUpdatedAtDesc([...readLocalStore()]);
  }
  const user = requireAuth();
  const snap = await getDocs(coverLettersCol(user.uid));
  return sortByUpdatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getCoverLetter(id) {
  if (!useCloud()) {
    return readLocalStore().find((cl) => cl.id === id) || null;
  }
  const user = requireAuth();
  const snap = await getDoc(coverLetterRef(user.uid, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createCoverLetter({ name, templateId, yaml }) {
  const now = new Date().toISOString();
  const coverLetter = {
    id: generateId(),
    name: name || 'Untitled Cover Letter',
    templateId,
    yaml,
    createdAt: now,
    updatedAt: now,
  };

  if (!useCloud()) {
    const coverLetters = readLocalStore();
    coverLetters.push(coverLetter);
    writeLocalStore(coverLetters);
    return coverLetter;
  }

  const user = requireAuth();
  await setDoc(coverLetterRef(user.uid, coverLetter.id), coverLetter);
  return coverLetter;
}

export async function updateCoverLetter(id, updates) {
  if (!useCloud()) {
    const coverLetters = readLocalStore();
    const index = coverLetters.findIndex((cl) => cl.id === id);
    if (index === -1) return null;

    const updated = {
      ...coverLetters[index],
      ...updates,
      id: coverLetters[index].id,
      createdAt: coverLetters[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    coverLetters[index] = updated;
    writeLocalStore(coverLetters);
    return updated;
  }

  const user = requireAuth();
  const ref = coverLetterRef(user.uid, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const previous = { id: snap.id, ...snap.data() };
  const updated = {
    ...previous,
    ...updates,
    id: previous.id,
    createdAt: previous.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, updated);
  return updated;
}

export async function deleteCoverLetter(id) {
  if (!useCloud()) {
    const coverLetters = readLocalStore();
    const next = coverLetters.filter((cl) => cl.id !== id);
    if (next.length === coverLetters.length) return false;
    writeLocalStore(next);
    return true;
  }
  const user = requireAuth();
  const ref = coverLetterRef(user.uid, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await deleteDoc(ref);
  return true;
}
