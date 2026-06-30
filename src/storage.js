const STORAGE_KEY = 'resume-builder-resumes';
const LEGACY_KEY = 'resume-builder-yaml';

function generateId() {
  return `resume-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

function writeStore(resumes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  } catch {
    /* ignore quota errors */
  }
}

export function getAllResumes() {
  return readStore().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export function getResume(id) {
  return readStore().find((r) => r.id === id) || null;
}

export function createResume({ name, templateId, yaml }) {
  const now = new Date().toISOString();
  const resume = {
    id: generateId(),
    name: name || 'Untitled Resume',
    templateId,
    yaml,
    createdAt: now,
    updatedAt: now,
  };
  const resumes = readStore();
  resumes.push(resume);
  writeStore(resumes);
  return resume;
}

export function updateResume(id, updates) {
  const resumes = readStore();
  const index = resumes.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const updated = {
    ...resumes[index],
    ...updates,
    id: resumes[index].id,
    updatedAt: new Date().toISOString(),
  };
  resumes[index] = updated;
  writeStore(resumes);
  return updated;
}

export function deleteResume(id) {
  const resumes = readStore();
  const next = resumes.filter((r) => r.id !== id);
  if (next.length === resumes.length) return false;
  writeStore(next);
  return true;
}

export function migrateLegacyStorage(defaultTemplateId, defaultYaml) {
  if (readStore().length > 0) return;

  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      createResume({
        name: 'My Resume',
        templateId: defaultTemplateId,
        yaml: legacy,
      });
      return;
    }
  } catch {
    /* ignore */
  }

  createResume({
    name: 'My Resume',
    templateId: defaultTemplateId,
    yaml: defaultYaml,
  });
}
