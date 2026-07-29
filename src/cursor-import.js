import yaml from 'js-yaml';
import { normalizeApplicationStatus } from './application-storage.js';

export const FIT_RATINGS = {
  highly_qualified: { label: 'Highly qualified', color: '#3b82f6' },
  good_match: { label: 'Good match', color: '#14b8a6' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  stretch: { label: 'Stretch', color: '#f97316' },
  big_stretch: { label: 'Big stretch', color: '#b91c1c' },
  skip: { label: 'Skip', color: '#9aa0a6' },
};

const LEGACY_RECOMMENDATION_TO_RATING = {
  strong: 'highly_qualified',
  apply: 'good_match',
  moderate: 'moderate',
  weak: 'stretch',
  skip: 'skip',
  unknown: 'moderate',
};

const DELIMITERS = {
  application: /^---APPLICATION---\s*$/im,
  fit: /^---FIT---\s*$/im,
  resume: /^---RESUME\s*YAML---\s*$/im,
  cover: /^---COVER\s*LETTER\s*YAML---\s*$/im,
};

const FIT_HEADING = /^#{1,3}\s*FIT(\s*ASSESSMENT)?\b/im;
const RESUME_HEADING = /^#{1,3}\s*RESUME\s*YAML\b/im;
const COVER_HEADING = /^#{1,3}\s*COVER\s*LETTER\s*YAML\b/im;

function extractFencedYamlBlocks(text) {
  const blocks = [];
  const fence = /```(?:yaml|yml)?\s*([\s\S]*?)```/gi;
  let match;
  while ((match = fence.exec(text)) !== null) {
    if (match[1]?.trim()) blocks.push(match[1].trim());
  }
  return blocks;
}

function extractBetweenDelimiters(text, startPattern, endPatterns) {
  const startMatch = startPattern.exec(text);
  if (!startMatch) return '';
  const start = startMatch.index + startMatch[0].length;
  const rest = text.slice(start);
  let end = rest.length;
  for (const endPattern of endPatterns) {
    const endMatch = endPattern.exec(rest);
    if (endMatch && endMatch.index < end) end = endMatch.index;
  }
  return rest.slice(0, end).replace(/^[\s:]+/, '').trim();
}

function extractSection(text, startPattern, endPattern) {
  const startMatch = startPattern.exec(text);
  if (!startMatch) return '';
  const start = startMatch.index + startMatch[0].length;
  const rest = text.slice(start);
  const endMatch = endPattern ? endPattern.exec(rest) : null;
  const body = endMatch ? rest.slice(0, endMatch.index) : rest;
  return body.replace(/^[\s:]+/, '').trim();
}

function stripFences(yamlText) {
  const trimmed = String(yamlText || '').trim();
  const fenced = trimmed.match(/^```(?:yaml|yml)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function normalizeFitRating(raw) {
  const value = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (!value) return '';

  const aliases = {
    highly_qualified: 'highly_qualified',
    highlyqualified: 'highly_qualified',
    strong: 'highly_qualified',
    strong_fit: 'highly_qualified',
    good_match: 'good_match',
    goodmatch: 'good_match',
    good_fit: 'good_match',
    apply: 'good_match',
    moderate: 'moderate',
    moderate_fit: 'moderate',
    maybe: 'moderate',
    stretch: 'stretch',
    reach: 'stretch',
    weak: 'stretch',
    weak_fit: 'stretch',
    big_stretch: 'big_stretch',
    bigstretch: 'big_stretch',
    poor_fit: 'big_stretch',
    skip: 'skip',
    pass: 'skip',
  };

  const normalized = aliases[value] || value;
  return FIT_RATINGS[normalized] ? normalized : '';
}

function parseFitScore(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const num = Number(String(raw).trim());
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function parseApplicationBlock(text) {
  const meta = {
    company: '',
    title: '',
    location: '',
    role_number: '',
    asks_for_linkedin: false,
    status: 'applied',
    fit_rating: '',
    fit_score: null,
  };
  if (!text?.trim()) return meta;

  for (const line of text.split('\n')) {
    const match = line.match(/^\s*([a-z_]+)\s*:\s*(.+)\s*$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'company') meta.company = value;
    else if (key === 'title' || key === 'role' || key === 'position') meta.title = value;
    else if (key === 'location') meta.location = value;
    else if (
      key === 'role_number' ||
      key === 'rolenumber' ||
      key === 'requisition' ||
      key === 'job_id' ||
      key === 'jobid'
    ) {
      meta.role_number = value;
    } else if (key === 'asks_for_linkedin' || key === 'linkedin_required') {
      meta.asks_for_linkedin = /^(true|yes|1)$/i.test(value);
    } else if (key === 'status') meta.status = value;
    else if (key === 'fit_rating' || key === 'fitrating' || key === 'rating') {
      meta.fit_rating = normalizeFitRating(value);
    } else if (key === 'fit_score' || key === 'fitscore' || key === 'score') {
      meta.fit_score = parseFitScore(value);
    }
  }
  return meta;
}

function looksLikeResume(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      (Array.isArray(data.experience) || Array.isArray(data.skills)) &&
      !data.body &&
      !data.recipient
  );
}

function looksLikeCoverLetter(data) {
  return Boolean(
    data &&
      typeof data === 'object' &&
      (typeof data.body === 'string' || data.recipient || data.salutation)
  );
}

function classifyYamlBlock(yamlText) {
  try {
    const data = yaml.load(yamlText);
    if (looksLikeCoverLetter(data)) return { type: 'cover', data, yaml: yamlText };
    if (looksLikeResume(data)) return { type: 'resume', data, yaml: yamlText };
  } catch {
    /* invalid yaml */
  }
  return { type: 'unknown', data: null, yaml: yamlText };
}

function inferMetadataFromDocuments(resumeData, coverLetterData) {
  const meta = { company: '', title: '', location: '', status: 'applied' };

  if (coverLetterData?.recipient) {
    meta.company = coverLetterData.recipient.company || meta.company;
    meta.title = coverLetterData.recipient.title || meta.title;
  }

  if (resumeData?.contact?.location) {
    meta.location = resumeData.contact.location;
  }

  const body = coverLetterData?.body || '';
  const roleMatch = body.match(
    /(?:applying for|interest in|position of)\s+(?:the\s+)?([^\n.,]+?)(?:\s+(?:role|position|at)\b|\s+at\s+|\s*[.,]|$)/i
  );
  if (roleMatch && !meta.title) {
    meta.title = roleMatch[1].trim();
  }

  return meta;
}

function parseFitRecommendation(text) {
  const upper = text.toUpperCase();
  if (/\bSKIP\b/.test(upper) && !/\b(APPLY|MAYBE|GOOD\s+MATCH)\b/.test(upper.slice(-80))) return 'skip';
  if (/\bHIGHLY\s+QUALIFIED\b/.test(upper) || /\bSTRONG\s+FIT\b/.test(upper) || /\bRECOMMEND\s+APPLY\b/.test(upper)) {
    return 'strong';
  }
  if (/\bGOOD\s+MATCH\b/.test(upper) || /\bAPPLY\b/.test(upper)) return 'apply';
  if (/\bMAYBE\b/.test(upper) || /\bMODERATE\b/.test(upper) || /\bMODERATE\s+FIT\b/.test(upper)) return 'moderate';
  if (/\bBIG\s+STRETCH\b/.test(upper) || /\bPOOR\s+FIT\b/.test(upper)) return 'weak';
  if (/\bSTRETCH\b/.test(upper) || /\bWEAK\s+FIT\b/.test(upper)) return 'weak';
  return 'unknown';
}

function resolveFitRating({ fitRating, fitRecommendation }) {
  if (fitRating && FIT_RATINGS[fitRating]) return fitRating;
  return LEGACY_RECOMMENDATION_TO_RATING[fitRecommendation] || 'moderate';
}

function summarizeFit(text, recommendation) {
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);
  const first = lines[0] || '';
  const gapLine = lines.find((l) => /gap|missing|lack|without|no\s+\w+\s+experience/i.test(l));
  const short = first.length > 120 ? `${first.slice(0, 117)}…` : first;
  if (gapLine && gapLine !== first) {
    const gapShort = gapLine.length > 80 ? `${gapLine.slice(0, 77)}…` : gapLine;
    return `${short || 'Fit assessed'} — ${gapShort}`;
  }
  const rating = resolveFitRating({ fitRecommendation: recommendation });
  const label = FIT_RATINGS[rating]?.label || 'Fit assessed';
  return short || label;
}

function usesDelimiterFormat(text) {
  return DELIMITERS.application.test(text) || DELIMITERS.resume.test(text);
}

function parseDelimiterFormat(raw) {
  const applicationBlock = extractBetweenDelimiters(raw, DELIMITERS.application, [
    DELIMITERS.fit,
    DELIMITERS.resume,
    DELIMITERS.cover,
  ]);
  const fitAssessment = extractBetweenDelimiters(raw, DELIMITERS.fit, [
    DELIMITERS.resume,
    DELIMITERS.cover,
  ]);
  const resumeBlock = extractBetweenDelimiters(raw, DELIMITERS.resume, [DELIMITERS.cover]);
  const coverBlock = extractBetweenDelimiters(raw, DELIMITERS.cover, []);

  const resumeYaml = stripFences(resumeBlock);
  const coverLetterYaml = stripFences(coverBlock);

  let resumeData = null;
  let coverLetterData = null;
  try {
    if (resumeYaml) resumeData = yaml.load(resumeYaml);
  } catch {
    /* handled below */
  }
  try {
    if (coverLetterYaml) coverLetterData = yaml.load(coverLetterYaml);
  } catch {
    /* handled below */
  }

  const applicationMeta = parseApplicationBlock(applicationBlock);
  const inferred = inferMetadataFromDocuments(resumeData, coverLetterData);

  return {
    applicationMeta: {
      company: applicationMeta.company || inferred.company,
      title: applicationMeta.title || inferred.title,
      location: applicationMeta.location || inferred.location,
      status: normalizeApplicationStatus(applicationMeta.status || inferred.status),
      fit_rating: applicationMeta.fit_rating || '',
      fit_score: applicationMeta.fit_score,
    },
    fitAssessment,
    resumeYaml,
    coverLetterYaml,
    resumeData,
    coverLetterData,
  };
}

function parseMarkdownFormat(raw) {
  const fitAssessment =
    extractSection(raw, FIT_HEADING, RESUME_HEADING) ||
    extractSection(raw, /^FIT\s*ASSESSMENT\s*:?\s*$/im, RESUME_HEADING);

  const fenced = extractFencedYamlBlocks(raw);
  const classified = fenced.map(classifyYamlBlock);

  let resumeYaml = '';
  let coverLetterYaml = '';
  let resumeData = null;
  let coverLetterData = null;

  for (const block of classified) {
    if (block.type === 'resume' && !resumeYaml) {
      resumeYaml = block.yaml;
      resumeData = block.data;
    } else if (block.type === 'cover' && !coverLetterYaml) {
      coverLetterYaml = block.yaml;
      coverLetterData = block.data;
    }
  }

  if (!resumeYaml && fenced.length >= 1) {
    const first = classifyYamlBlock(fenced[0]);
    if (first.type !== 'cover') {
      resumeYaml = fenced[0];
      resumeData = first.data;
    }
  }
  if (!coverLetterYaml && fenced.length >= 2) {
    coverLetterYaml = fenced[1];
    coverLetterData = classifyYamlBlock(fenced[1]).data;
  } else if (!coverLetterYaml && fenced.length === 1) {
    const only = classifyYamlBlock(fenced[0]);
    if (only.type === 'cover') {
      coverLetterYaml = fenced[0];
      coverLetterData = only.data;
    }
  }

  const inferred = inferMetadataFromDocuments(resumeData, coverLetterData);

  return {
    applicationMeta: inferred,
    fitAssessment,
    resumeYaml,
    coverLetterYaml,
    resumeData,
    coverLetterData,
  };
}

/**
 * Parse a single Cursor paste into application metadata + fit + resume/cover letter YAML.
 */
export function parseCursorResponse(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    throw new Error('Paste the full Cursor response first.');
  }

  const parsed = usesDelimiterFormat(raw) ? parseDelimiterFormat(raw) : parseMarkdownFormat(raw);
  const { applicationMeta, fitAssessment, resumeYaml, coverLetterYaml, resumeData, coverLetterData } =
    parsed;

  if (!resumeYaml && !coverLetterYaml) {
    throw new Error(
      'No YAML found. Use ---RESUME YAML--- and ---COVER LETTER YAML--- sections, or ```yaml``` fences.'
    );
  }

  if (resumeYaml) {
    try {
      yaml.load(resumeYaml);
    } catch (err) {
      throw new Error(`Resume YAML is invalid: ${err.message}`);
    }
  }
  if (coverLetterYaml) {
    try {
      yaml.load(coverLetterYaml);
    } catch (err) {
      throw new Error(`Cover letter YAML is invalid: ${err.message}`);
    }
  }

  const fitRecommendation = parseFitRecommendation(fitAssessment);
  const fitRating = resolveFitRating({
    fitRating: applicationMeta.fit_rating,
    fitRecommendation,
  });
  const fitScore = applicationMeta.fit_score ?? null;
  const fitSummary = summarizeFit(fitAssessment, fitRecommendation);

  return {
    company: applicationMeta.company || 'Company',
    title: applicationMeta.title || 'Position',
    location: applicationMeta.location || '',
    roleNumber: applicationMeta.role_number || '',
    asksForLinkedin: Boolean(applicationMeta.asks_for_linkedin),
    status: normalizeApplicationStatus(applicationMeta.status),
    fitAssessment,
    fitRecommendation,
    fitRating,
    fitScore,
    fitSummary,
    resumeYaml,
    coverLetterYaml,
    resumeData,
    coverLetterData,
  };
}

export function getFitBadgeMeta(ratingOrRecommendation) {
  if (FIT_RATINGS[ratingOrRecommendation]) {
    return FIT_RATINGS[ratingOrRecommendation];
  }
  const mapped = LEGACY_RECOMMENDATION_TO_RATING[ratingOrRecommendation];
  if (mapped && FIT_RATINGS[mapped]) {
    return FIT_RATINGS[mapped];
  }
  return { label: 'Pending', color: '#9aa0a6' };
}
