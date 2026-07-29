const SKILL_KEYWORDS = [
  'requirements', 'documentation', 'process', 'analytics', 'excel', 'reporting',
  'stakeholder', 'cross-functional', 'project management', 'communication',
  'python', 'javascript', 'typescript', 'react', 'node', 'sql', 'aws', 'docker',
  'design', 'ux', 'ui', 'research', 'prototyping', 'figma',
  'sales', 'business development', 'client', 'customer', 'operations',
  'data', 'metrics', 'google analytics', 'dashboard', 'workflow',
  'agile', 'scrum', 'jira', 'confluence', 'microsoft office', 'google workspace',
  'leadership', 'management', 'strategy', 'marketing', 'content',
  'financial', 'budget', 'forecast', 'compliance', 'confidentiality',
  'prospecting', 'cold calling', 'salesforce', 'crm', 'pipeline', 'outreach',
  'lead qualification', 'financial advisor', 'broker', 'wealth management',
];

const EMPLOYMENT_TYPES = /^(full-time|part-time|contract|internship|temporary|volunteer)$/i;

const LINKEDIN_NOISE_PATTERNS = [
  /^company logo for/i,
  /^for this role$/i,
  /^about the job$/i,
  /^show more$/i,
  /^see less$/i,
  /^show match details$/i,
  /^easy apply$/i,
  /^apply$/i,
  /^save$/i,
  /^message$/i,
  /^try premium/i,
  /^get personalized tips/i,
  /^people you can reach out to$/i,
  /^people in your network$/i,
  /^promoted by/i,
  /^responses managed off linkedin/i,
  /^your profile and resume/i,
  /^beta\s*·/i,
  /^is this information helpful/i,
  /^\d+\s+people clicked apply/i,
  /^\d+\s+applicants?$/i,
  /^reposted\s+\d+/i,
  /^posted\s+\d+/i,
  /^be an early applicant/i,
  /^over\s+\d+\s+applicants/i,
  /^actively reviewing/i,
  /^no longer accepting/i,
  /^viewed$/i,
  /^applied$/i,
  /^withdraw application$/i,
  /^share$/i,
  /^report this job$/i,
  /^see who/i,
  /^·\s*$/,
  /^off\s+site$/i,
  /^on\s+site$/i,
];

const JOB_META_LINE =
  /^(remote|hybrid|on-site|onsite|\d+\s+applicants?|\d+\s+employees?|\d+\s+connections?|\$\d)/i;

const LOCATION_LINE =
  /^([A-Za-z][A-Za-z .'-]{1,42}),\s*([A-Z]{2})(?:\s+\d{5})?(?:\s*[·|•-]\s*.+)?$/i;

const SECTION_HEADER =
  /^(job overview|responsibilit|requirements?|core competencies|preferences?|pay range|company overview|information on interviews|where ambition)/i;

const TAGLINE_LINE =
  /^(where ambition|build a career|join the\b|at lpl\b|for further information)/i;

const VALID_STATE_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
  'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
  'WI', 'WY', 'DC',
]);

function isValidLocationCity(city) {
  const value = cleanLine(city);
  if (value.length < 3 || value.length > 45) return false;
  if (/experience|requirement|microsoft|salesforce|powerpoint|outlook|excel|word\b|with\b/i.test(value)) {
    return false;
  }
  return true;
}

const TITLE_HINT =
  /\b(associate|analyst|coordinator|manager|director|specialist|engineer|developer|designer|representative|consultant|administrator|assistant|executive|intern|lead|architect|officer)\b/i;

function cleanLine(line) {
  return String(line || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanCompanyName(raw) {
  let name = cleanLine(raw);
  name = name.replace(/^company logo for[,:\s]*/i, '');
  name = name.replace(/\.$/, '');
  name = name.replace(/[,;]\s*$/, '');
  return cleanLine(name);
}

function isNoiseLine(line) {
  if (!line) return true;
  if (EMPLOYMENT_TYPES.test(line)) return true;
  if (JOB_META_LINE.test(line)) return true;
  if (LINKEDIN_NOISE_PATTERNS.some((pattern) => pattern.test(line))) return true;
  if (/^·/.test(line) && line.length < 4) return true;
  if (/^\d+\s+(hour|day|week|month)s?\s+ago$/i.test(line)) return true;
  if (/^[\d,]+\.\d{2}\s*-\s*[\d,]+\.\d{2}$/.test(line)) return true;
  return false;
}

function stripLocationSuffix(line) {
  const match = line.match(/^(.+?,\s*[A-Z]{2})\s*[·|•-]\s*.+$/);
  return match ? cleanLine(match[1]) : line;
}

function looksLikeTitle(line) {
  if (!line || line.length > 90) return false;
  if (isNoiseLine(line)) return false;
  if (SECTION_HEADER.test(line)) return false;
  if (TAGLINE_LINE.test(line)) return false;
  if (LOCATION_LINE.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  if (/^\d/.test(line)) return false;
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line)) return false;
  if (/:$/.test(line)) return false;
  return TITLE_HINT.test(line) || /^[A-Z][a-z]+(\s+[A-Z&][A-Za-z&./'-]+){0,6}$/.test(line);
}

function looksLikeCompany(line) {
  if (!line || line.length > 80) return false;
  if (isNoiseLine(line)) return false;
  if (SECTION_HEADER.test(line)) return false;
  if (TAGLINE_LINE.test(line)) return false;
  if (LOCATION_LINE.test(line)) return false;
  if (/:$/.test(line)) return false;
  if (looksLikeTitle(line) && !/\b(inc|llc|corp|ltd|financial|holdings|group|laboratories|research)\b/i.test(line)) {
    return false;
  }
  return /^[A-Z0-9]/.test(line);
}

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const keyword of SKILL_KEYWORDS) {
    if (lower.includes(keyword)) found.push(keyword);
  }
  return [...new Set(found)].slice(0, 16);
}

function extractRequirementsSnippet(text) {
  const aboutSplit = text.split(/about the job/i);
  const body = aboutSplit.length > 1 ? aboutSplit.slice(1).join('') : text;
  const sections = body.split(/\n\s*\n/);
  for (const section of sections) {
    if (/qualification|requirement|what you|you have|must have|ideal candidate|responsibilit|what are we looking|job overview/i.test(section)) {
      return cleanLine(section).slice(0, 500);
    }
  }
  const lines = body.split('\n').map(cleanLine).filter(Boolean);
  return lines.slice(0, 6).join(' ').slice(0, 400);
}

function getLinkedInCardHeader(lines) {
  const aboutIdx = lines.findIndex((line) => /^about the job$/i.test(line));
  return aboutIdx >= 0 ? lines.slice(0, aboutIdx) : lines.slice(0, 25);
}

function extractLocation(lines) {
  for (const line of lines) {
    const locationMatch = line.match(LOCATION_LINE);
    if (!locationMatch) continue;
    const city = cleanLine(locationMatch[1]);
    const state = locationMatch[2].toUpperCase();
    if (!isValidLocationCity(city)) continue;
    if (!VALID_STATE_CODES.has(state)) continue;
    return `${city}, ${state}`;
  }

  const text = lines.join('\n');
  const match = text.match(/\b([A-Z][a-zA-Z .'-]{2,40}),\s*([A-Z]{2})\b/);
  if (match && isValidLocationCity(match[1]) && VALID_STATE_CODES.has(match[2].toUpperCase())) {
    return `${match[1].trim()}, ${match[2].toUpperCase()}`;
  }
  return '';
}

function scoreCompanyCandidate(line, allLines) {
  const cleaned = cleanCompanyName(line);
  if (!cleaned || cleaned.length < 2) return -1;
  if (!looksLikeCompany(cleaned)) return -1;

  let score = 1;
  const repeats = allLines.filter((l) => cleanCompanyName(l) === cleaned).length;
  if (repeats > 1) score += 3;
  if (/\b(inc|llc|corp|ltd|financial|holdings|group|laboratories|research)\b/i.test(cleaned)) score += 2;
  if (/^company logo for/i.test(line)) score += 1;
  if (cleaned.split(/\s+/).length <= 5) score += 1;
  return score;
}

function extractCompany(lines) {
  const candidates = new Map();

  for (const line of lines) {
    const cleaned = cleanCompanyName(line);
    const score = scoreCompanyCandidate(line, lines);
    if (score < 0) continue;
    const prev = candidates.get(cleaned) || 0;
    candidates.set(cleaned, prev + score);
  }

  const atMatch = lines.join('\n').match(/\bat\s+([A-Z][A-Za-z0-9&.'\s-]{2,60})/);
  if (atMatch) {
    const fromAt = cleanCompanyName(atMatch[1]);
    candidates.set(fromAt, (candidates.get(fromAt) || 0) + 2);
  }

  const sorted = [...candidates.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || '';
}

function extractTitle(lines, company) {
  const meaningful = lines.filter((line) => !isNoiseLine(line));

  for (const line of meaningful) {
    const cleaned = cleanLine(line);
    if (cleaned === company) continue;
    if (cleanCompanyName(cleaned) === company) continue;
    if (LOCATION_LINE.test(cleaned)) continue;
    if (looksLikeTitle(cleaned) && TITLE_HINT.test(cleaned)) return cleaned;
  }

  for (const line of meaningful) {
    const cleaned = cleanLine(line);
    if (cleaned === company || cleanCompanyName(cleaned) === company) continue;
    if (LOCATION_LINE.test(cleaned)) continue;
    if (looksLikeTitle(cleaned)) return cleaned;
  }

  const bodyMatch = lines.join('\n').match(
    /(?:as (?:the |an )?|for (?:the |an )?)([A-Z][A-Za-z0-9&/.'\s-]{4,70}?)(?:\s*\([A-Z]{2,5}\))?(?:,|\s+you\s+will|\s+at\s+)/i
  );
  if (bodyMatch) return cleanLine(bodyMatch[1]);

  return meaningful[0] || 'Position';
}

function parseLinkedInHeader(lines) {
  const headerLines = getLinkedInCardHeader(lines);
  const company = extractCompany(headerLines);
  const title = extractTitle(headerLines, company);
  const location = extractLocation(headerLines);

  if (!title || title === 'Position' || TAGLINE_LINE.test(title)) {
    const bodyTitle = extractTitle(lines, company);
    if (bodyTitle && bodyTitle !== 'Position' && !TAGLINE_LINE.test(bodyTitle)) {
      return { title: bodyTitle, company: company || 'Company', location };
    }
  }

  return {
    title: title || 'Position',
    company: company || 'Company',
    location,
  };
}

function extractFromPatterns(text) {
  const titleMatch = text.match(/(?:^|\n)([A-Za-z0-9][^\n]{2,80}?)\n(?:[A-Z][^\n]{2,80}\n)/);
  const atMatch = text.match(/\bat\s+([A-Z][A-Za-z0-9&.'\s-]{2,60})/);
  const locationMatch = text.match(/\b([A-Z][a-zA-Z .'-]+,\s*[A-Z]{2})\b/);

  return {
    title: titleMatch?.[1]?.trim() || '',
    company: atMatch ? cleanCompanyName(atMatch[1]) : '',
    location: locationMatch?.[1]?.trim() || '',
  };
}

function extractRoleNumber(text) {
  const patterns = [
    /(?:requisition|req\.?|job)\s*(?:#|no\.?|number|id)\s*[:#]?\s*([A-Za-z0-9-]+)/i,
    /role\s*(?:#|no\.?|number|id)\s*[:#]?\s*([A-Za-z0-9-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match?.[1]) return cleanLine(match[1]);
  }
  return '';
}

/** Parse a pasted LinkedIn-style job description into structured fields. */
export function parseJobDescription(rawText, overrides = {}) {
  const text = String(rawText || '').replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n').map(cleanLine).filter(Boolean);

  const header = parseLinkedInHeader(lines);
  const patterns = extractFromPatterns(text);

  let title = overrides.title || header.title || patterns.title || 'Position';
  let company = overrides.company || header.company || patterns.company || 'Company';
  let location = overrides.location || header.location || patterns.location || '';

  company = cleanCompanyName(company);
  title = cleanLine(title);
  if (title === company) {
    title = extractTitle(lines, company) || patterns.title || 'Position';
  }
  if (/^company logo for/i.test(title)) {
    title = extractTitle(lines, company) || 'Position';
  }

  const roleNumber = overrides.roleNumber || overrides.role_number || extractRoleNumber(text);

  return {
    title,
    company,
    location,
    roleNumber,
    keywords: extractKeywords(text),
    requirementsSnippet: extractRequirementsSnippet(text),
    rawText: text,
    parseWarnings: buildParseWarnings({ title, company, location, lines }),
  };
}

function buildParseWarnings({ title, company, location, lines }) {
  const warnings = [];
  if (/company logo for/i.test(company) || company === 'Company') {
    warnings.push('Company name may be inaccurate — review before generating.');
  }
  if (title === 'Position' || title === company) {
    warnings.push('Job title may be inaccurate — review before generating.');
  }
  if (!location && lines.some((l) => LOCATION_LINE.test(l))) {
    warnings.push('Location detected but not parsed cleanly.');
  }
  return warnings;
}
