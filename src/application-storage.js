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

const STORAGE_KEY = 'resume-builder-applications';
export const DEFAULT_APPLICATION_RESUME_TEMPLATE_ID = 'compact-minimal';
export const DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID = 'classic';

export const APPLICATION_STATUSES = [
  { id: 'applied', label: 'Applied', color: '#4a9eff' },
  { id: 'no_response', label: 'No Response', color: '#f59e0b' },
  { id: 'interview', label: 'Interview', color: '#a855f7' },
  { id: 'rejected', label: 'Rejected', color: '#ef4444' },
  { id: 'offer', label: 'Offer', color: '#22c55e' },
];

export function normalizeApplicationStatus(status) {
  const raw = String(status || '').trim().toLowerCase();
  if (!raw || raw === 'draft' || raw === 'sent') return 'applied';
  return APPLICATION_STATUSES.some((s) => s.id === raw) ? raw : 'applied';
}

function generateId() {
  return `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function useCloud() {
  return isFirebaseConfigured();
}

function applicationsCol(uid) {
  return collection(getFirestoreDb(), 'users', uid, 'applications');
}

function applicationRef(uid, id) {
  return doc(getFirestoreDb(), 'users', uid, 'applications', id);
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

function writeLocalStore(applications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    /* ignore quota errors */
  }
}

function buildApplication(fields, id = generateId(), now = new Date().toISOString()) {
  return {
    id,
    company: fields.company || 'Company',
    title: fields.title || 'Position',
    location: fields.location || '',
    roleNumber: fields.roleNumber || '',
    jobDescription: fields.jobDescription || '',
    asksForLinkedin: Boolean(fields.asksForLinkedin),
    status: normalizeApplicationStatus(fields.status),
    resumeYaml: fields.resumeYaml || '',
    coverLetterYaml: fields.coverLetterYaml || '',
    resumeTemplateId: fields.resumeTemplateId || DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
    coverLetterTemplateId:
      fields.coverLetterTemplateId || DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
    baseResumeId: fields.baseResumeId || null,
    resumeId: fields.resumeId || null,
    coverLetterId: fields.coverLetterId || null,
    fitAssessment: fields.fitAssessment || '',
    fitRecommendation: fields.fitRecommendation || '',
    fitRating: fields.fitRating || '',
    fitScore: fields.fitScore ?? null,
    fitSummary: fields.fitSummary || '',
    createdAt: fields.createdAt || now,
    appliedAt: fields.appliedAt || now,
    updatedAt: fields.updatedAt || now,
  };
}

function sortByUpdatedAtDesc(items) {
  return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function getAllApplications() {
  if (!useCloud()) {
    return sortByUpdatedAtDesc([...readLocalStore()]);
  }
  const user = requireAuth();
  const snap = await getDocs(applicationsCol(user.uid));
  const apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortByUpdatedAtDesc(apps);
}

export async function getApplication(id) {
  if (!useCloud()) {
    return readLocalStore().find((app) => app.id === id) || null;
  }
  const user = requireAuth();
  const snap = await getDoc(applicationRef(user.uid, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createApplication(fields) {
  const application = buildApplication(fields);
  if (!useCloud()) {
    const applications = readLocalStore();
    applications.push(application);
    writeLocalStore(applications);
    return application;
  }
  const user = requireAuth();
  await setDoc(applicationRef(user.uid, application.id), application);
  return application;
}

export async function updateApplication(id, updates) {
  if (!useCloud()) {
    const applications = readLocalStore();
    const index = applications.findIndex((app) => app.id === id);
    if (index === -1) return null;

    const previous = applications[index];
    const nextStatus = normalizeApplicationStatus(updates.status ?? previous.status);
    const appliedAt =
      updates.appliedAt ??
      (nextStatus === 'applied' && previous.status !== 'applied'
        ? new Date().toISOString()
        : previous.appliedAt);

    const updated = {
      ...previous,
      ...updates,
      status: nextStatus,
      id: previous.id,
      createdAt: previous.createdAt,
      appliedAt: appliedAt || previous.createdAt,
      updatedAt: new Date().toISOString(),
    };
    applications[index] = updated;
    writeLocalStore(applications);
    return updated;
  }

  const user = requireAuth();
  const ref = applicationRef(user.uid, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const previous = { id: snap.id, ...snap.data() };
  const nextStatus = normalizeApplicationStatus(updates.status ?? previous.status);
  const appliedAt =
    updates.appliedAt ??
    (nextStatus === 'applied' && previous.status !== 'applied'
      ? new Date().toISOString()
      : previous.appliedAt);

  const updated = {
    ...previous,
    ...updates,
    status: nextStatus,
    id: previous.id,
    createdAt: previous.createdAt,
    appliedAt: appliedAt || previous.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(ref, updated);
  return updated;
}

export async function deleteApplication(id) {
  if (!useCloud()) {
    const applications = readLocalStore();
    const next = applications.filter((app) => app.id !== id);
    if (next.length === applications.length) return false;
    writeLocalStore(next);
    return true;
  }
  const user = requireAuth();
  const ref = applicationRef(user.uid, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;
  await deleteDoc(ref);
  return true;
}

export function getStatusMeta(statusId) {
  return (
    APPLICATION_STATUSES.find((s) => s.id === normalizeApplicationStatus(statusId)) ||
    APPLICATION_STATUSES[0]
  );
}
