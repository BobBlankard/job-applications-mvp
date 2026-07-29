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

const STORAGE_KEY = 'resume-builder-resumes';
const LEGACY_KEY = 'resume-builder-yaml';

function generateId() {
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useCloud() {
  return isFirebaseConfigured();
}

function resumesCol(uid) {
  return collection(getFirestoreDb(), 'users', uid, 'resumes');
}

function resumeRef(uid, id) {
  return doc(getFirestoreDb(), 'users', uid, 'resumes', id);
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

function writeLocalStore(resumes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  } catch {
    /* ignore quota errors */
  }
}

function sortByUpdatedAtDesc(items) {
  return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getAllResumes() {
  if (!useCloud()) {
    return sortByUpdatedAtDesc([...readLocalStore()]);
  }
  const user = requireAuth();
  const snap = await getDocs(resumesCol(user.uid));
  return sortByUpdatedAtDesc(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
}

export async function getResume(id) {
  if (!useCloud()) {
    return readLocalStore().find((r) => r.id === id) || null;
  }
  const user = requireAuth();
  const snap = await getDoc(resumeRef(user.uid, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createResume({ name, templateId, yaml }) {
  const now = new Date().toISOString();
  const resume = {
    id: generateId(),
    name: name || 'Untitled Resume',
    templateId,
    yaml,
    createdAt: now,
    updatedAt: now,
  };

  if (!useCloud()) {
    const resumes = readLocalStore();
    resumes.push(resume);
    writeLocalStore(resumes);
    return resume;
  }

  const user = requireAuth();
  await setDoc(resumeRef(user.uid, resume.id), resume);
  return resume;
}

export async function updateResume(id, updates) {
  if (!useCloud()) {
    const resumes = readLocalStore();
    const index = resumes.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated = {
      ...resumes[index],
      ...updates,
      id: resumes[index].id,
      createdAt: resumes[index].createdAt,
      updatedAt: new Date().toISOString(),
    };
    resumes[index] = updated;
    writeLocalStore(resumes);
    return updated;
  }

  const user = requireAuth();
  const ref = resumeRef(user.uid, id);
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

export async function deleteResume(id) {
  if (!useCloud()) {
    const resumes = readLocalStore();
    const next = resumes.filter((r) => r.id !== id);
    if (next.length === resumes.length) return false;
    writeLocalStore(next);
    return true;
  }
  const user = requireAuth();
  const ref = resumeRef(user.uid, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await deleteDoc(ref);
  return true;
}

/**
 * Local-only legacy migration. Does not seed Jane Doe / default resumes in cloud mode.
 * Also skips auto-creating a starter resume when local store is empty.
 */
export async function migrateLegacyStorage(defaultTemplateId, _defaultYaml) {
  if (useCloud()) return;
  if (readLocalStore().length > 0) return;

  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    await createResume({
      name: 'My Resume',
      templateId: defaultTemplateId,
      yaml: legacy,
    });
  } catch {
    /* ignore */
  }
}
