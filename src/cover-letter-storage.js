const STORAGE_KEY = 'resume-builder-cover-letters';

function generateId() {
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(coverLetters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coverLetters));
  } catch {
    /* ignore quota errors */
  }
}

export function getAllCoverLetters() {
  return readStore().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getCoverLetter(id) {
  return readStore().find((cl) => cl.id === id) || null;
}

export function createCoverLetter({ name, templateId, yaml }) {
  const now = new Date().toISOString();
  const coverLetter = {
    id: generateId(),
    name: name || 'Untitled Cover Letter',
    templateId,
    yaml,
    createdAt: now,
    updatedAt: now,
  };
  const coverLetters = readStore();
  coverLetters.push(coverLetter);
  writeStore(coverLetters);
  return coverLetter;
}

export function updateCoverLetter(id, updates) {
  const coverLetters = readStore();
  const index = coverLetters.findIndex((cl) => cl.id === id);
  if (index === -1) return null;

  const updated = {
    ...coverLetters[index],
    ...updates,
    id: coverLetters[index].id,
    updatedAt: new Date().toISOString(),
  };
  coverLetters[index] = updated;
  writeStore(coverLetters);
  return updated;
}

export function deleteCoverLetter(id) {
  const coverLetters = readStore();
  const next = coverLetters.filter((cl) => cl.id !== id);
  if (next.length === coverLetters.length) return false;
  writeStore(next);
  return true;
}
