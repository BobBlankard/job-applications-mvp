import yaml from 'js-yaml';

const SECTION_PATTERNS = {
  summary: /^(professional\s+)?(summary|profile|objective|about(\s+me)?)$/i,
  experience: /^(work\s+)?(experience|employment|work\s+history|professional\s+experience|career\s+history)$/i,
  education: /^education$/i,
  skills: /^(technical\s+)?skills?(?:\s*[&/]\s*tools)?$/i,
  projects: /^projects?$/i,
  certifications: /^certifications?(?:\s*&?\s*licenses?)?$/i,
};

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE_RE =
  /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\+\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i;
const WEBSITE_RE = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s|]*)?/i;
const LOCATION_RE = /^[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5})?$|^[A-Za-z .'-]+,\s*[A-Za-z .'-]+$/;

const MONTH =
  'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?';
const MONTH_PATTERN = `(?:${MONTH})`;
const DATE_PART = `(?:${MONTH_PATTERN}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|(?<![A-Za-z])\\d{4}(?![A-Za-z]))`;
const DATE_RANGE_RE = new RegExp(
  `${DATE_PART}\\s*(?:[-–—]|\\s+to\\s+)\\s*(?:${DATE_PART}|Present|Current)`,
  'i'
);
const YEAR_RE = /^(?:19|20)\d{2}$/;
const DEGREE_RE =
  /\b(?:B\.?\s?(?:S\.|A\.|Eng\.|Sc\.|FA)?|M\.?\s?(?:S\.|A\.|Eng\.|Sc\.|BA|FA)?|Ph\.?\s?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Associate(?:'s)?|Doctor(?:ate)?|MBA|JD|MD)\b[^|]*/i;

function detectSection(line) {
  const normalized = line.replace(/[:|]/g, '').trim();
  for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
    if (pattern.test(normalized)) return section;
  }
  return null;
}

function extractEmail(text) {
  return text.match(EMAIL_RE)?.[0] || null;
}

function extractPhone(text) {
  return text.match(PHONE_RE)?.[0] || null;
}

function extractLinkedIn(text) {
  const match = text.match(LINKEDIN_RE)?.[0];
  if (!match) return null;
  return match.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
}

function extractWebsite(text) {
  const withoutEmail = text.replace(EMAIL_RE, '');
  const matches = withoutEmail.match(new RegExp(WEBSITE_RE, 'gi')) || [];
  for (const match of matches) {
    const lower = match.toLowerCase();
    if (lower.includes('linkedin.com') || lower.includes('mailto:')) continue;
    return match.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  }
  return null;
}

function extractLocation(text) {
  const cleaned = text
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(LINKEDIN_RE, '')
    .replace(WEBSITE_RE, '')
    .replace(/[|•·]/g, ' ')
    .trim();

  const parts = cleaned
    .split(/\s{2,}|,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (LOCATION_RE.test(part)) return part;
  }

  if (parts.length >= 2 && parts.length <= 4 && !DATE_RANGE_RE.test(cleaned)) {
    const joined = parts.join(', ');
    if (joined.length <= 60 && /[A-Za-z]/.test(joined)) return joined;
  }

  return null;
}

function parseDateRange(text) {
  const monthRangeRe = new RegExp(
    `(${MONTH_PATTERN}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4})\\s*(?:[-–—]|\\s+to\\s+)\\s*(?:${MONTH_PATTERN}\\.?\\s+\\d{4}|\\d{1,2}\\/\\d{4}|Present|Current)`,
    'i'
  );
  let match = text.match(monthRangeRe);

  if (!match) {
    match = text.match(DATE_RANGE_RE);
  }

  if (!match) return null;

  const [start, end] = match[0].split(/\s*(?:[-–—]|\s+to\s+)\s*/i);
  return {
    start: start?.trim() || '',
    end: end?.trim() || '',
    remainder: text.replace(match[0], '').replace(/[|,–—-]\s*$/, '').trim(),
  };
}

function isBulletLine(line) {
  return /^[\s]*(?:[•·▪◦‣●○■□▪▫\-*–—]|\d+[.)])\s+/.test(line);
}

function stripBullet(line) {
  return line.replace(/^[\s]*(?:[•·▪◦‣●○■□▪▫\-*–—]|\d+[.)])\s+/, '').trim();
}

function looksLikeName(line) {
  if (!line || line.length > 60) return false;
  if (EMAIL_RE.test(line) || PHONE_RE.test(line) || LINKEDIN_RE.test(line)) return false;
  if (detectSection(line)) return false;
  if (DATE_RANGE_RE.test(line)) return false;
  if (/^https?:\/\//i.test(line)) return false;
  const words = line.split(/\s+/);
  return words.length >= 1 && words.length <= 5 && /^[A-Za-z]/.test(line);
}

function parseContactBlock(lines) {
  const contact = {};
  const contactText = lines.slice(0, 8).join(' | ');

  const email = extractEmail(contactText);
  if (email) contact.email = email;

  const phone = extractPhone(contactText);
  if (phone) contact.phone = phone;

  const linkedin = extractLinkedIn(contactText);
  if (linkedin) contact.linkedin = linkedin;

  const website = extractWebsite(contactText);
  if (website) contact.website = website;

  for (const line of lines.slice(0, 6)) {
    const location = extractLocation(line);
    if (location && !contact.location) {
      contact.location = location;
      break;
    }
  }

  return contact;
}

function parseSkillsContent(lines) {
  const skills = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    if (isBulletLine(line)) {
      skills.push(stripBullet(line));
      continue;
    }

    if (line.includes(',')) {
      const segments = line.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
      if (segments.length > 2) {
        skills.push(...segments);
        continue;
      }
    }

    skills.push(line.trim());
  }

  return [...new Set(skills.filter(Boolean))];
}

function splitCompanyLocation(value) {
  if (!value || !value.includes('|')) return { company: value || '', location: '' };
  const parts = value.split(/\s*[|]\s*/);
  return {
    company: parts[0]?.trim() || '',
    location: parts.slice(1).join(', ').trim(),
  };
}

function applyCompanyLocation(entry, rawCompany) {
  const { company, location } = splitCompanyLocation(rawCompany);
  entry.company = company;
  if (location && !entry.location) entry.location = location;
}

function finalizeExperienceEntry(entry) {
  if (!entry) return null;
  if (!entry.title && !entry.company && entry.bullets.length === 0) return null;

  if (!entry.title && entry.company) {
    entry.title = entry.company;
    entry.company = '';
  }

  return entry;
}

function createExperienceEntry({ title = '', company = '', location = '', start = '', end = '', bullets = [] }) {
  const entry = { title, company: '', location, start, end, bullets };
  applyCompanyLocation(entry, company);
  return entry;
}

function parseExperienceContent(lines) {
  const entries = [];
  let current = null;
  let pendingTitle = null;
  let pendingCompany = null;

  const pushCurrent = () => {
    const finalized = finalizeExperienceEntry(current);
    if (finalized) entries.push(finalized);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isBulletLine(line)) {
      if (!current) {
        current = createExperienceEntry({
          title: pendingTitle || '',
          company: pendingCompany || '',
        });
        pendingTitle = null;
        pendingCompany = null;
      }
      current.bullets.push(stripBullet(line));
      continue;
    }

    const dates = parseDateRange(line);
    if (dates) {
      pushCurrent();
      current = createExperienceEntry({
        title: pendingTitle || dates.remainder || '',
        company: pendingCompany || '',
        start: dates.start,
        end: dates.end,
      });
      pendingTitle = null;
      pendingCompany = null;

      if (dates.remainder && !current.title) {
        const parts = dates.remainder.split(/\s*[|@]\s*|\s+at\s+/i);
        current.title = parts[0]?.trim() || '';
        applyCompanyLocation(current, parts[1]?.trim() || '');
      }
      continue;
    }

    if (current?.start && current.bullets.length === 0) {
      if (!current.company) {
        applyCompanyLocation(current, line);
        continue;
      }
    }

    if (!current) {
      if (!pendingTitle) {
        pendingTitle = line;
      } else if (!pendingCompany) {
        pendingCompany = line;
      } else {
        current = createExperienceEntry({
          title: pendingTitle,
          company: pendingCompany,
          bullets: [line],
        });
        pendingTitle = null;
        pendingCompany = null;
      }
      continue;
    }

    if (current.bullets.length > 0) {
      pushCurrent();
      pendingTitle = line;
      pendingCompany = null;
    } else if (!current.company) {
      applyCompanyLocation(current, line);
    } else {
      current.bullets.push(line);
    }
  }

  pushCurrent();

  if (entries.length === 0 && pendingTitle) {
    entries.push(
      finalizeExperienceEntry(
        createExperienceEntry({
          title: pendingTitle,
          company: pendingCompany || '',
        })
      )
    );
  }

  return entries.filter(Boolean);
}

function parseEducationContent(lines) {
  const entries = [];
  let current = null;

  const pushCurrent = () => {
    if (current && (current.degree || current.school)) entries.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (isBulletLine(line)) {
      if (!current) current = { degree: '', school: '', location: '', year: '', details: '' };
      const detail = stripBullet(line);
      current.details = current.details ? `${current.details}; ${detail}` : detail;
      continue;
    }

    const yearMatch = line.match(/\b((?:19|20)\d{2})\b/);
    const year = yearMatch?.[1] || (YEAR_RE.test(line) ? line : '');

    if (DEGREE_RE.test(line)) {
      pushCurrent();
      current = {
        degree: line.replace(/\b((?:19|20)\d{2})\b.*/, '').trim() || line,
        school: '',
        location: '',
        year,
        details: '',
      };
      continue;
    }

    if (year && current) {
      current.year = year;
      const withoutYear = line.replace(/\b((?:19|20)\d{2})\b/, '').replace(/[|,–—-]\s*$/, '').trim();
      if (withoutYear && !current.school) current.school = withoutYear;
      continue;
    }

    if (!current) {
      current = { degree: line, school: '', location: '', year: '', details: '' };
      continue;
    }

    if (!current.school) {
      current.school = line;
    } else if (!current.location && LOCATION_RE.test(line)) {
      current.location = line;
    } else {
      current.details = current.details ? `${current.details}; ${line}` : line;
    }
  }

  pushCurrent();
  return entries;
}

function collectSectionLines(lines, startIndex) {
  const content = [];
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i];
    if (detectSection(line)) break;
    content.push(line);
    i += 1;
  }

  return { content, nextIndex: i };
}

export function parseResumeText(rawLines) {
  const lines = rawLines
    .map((entry) => (typeof entry === 'string' ? entry : entry.text))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { name: 'Imported Resume', contact: {}, summary: '', experience: [], education: [], skills: [] };
  }

  let name = '';
  let startIndex = 0;

  if (looksLikeName(lines[0])) {
    name = lines[0];
    startIndex = 1;
  }

  const headerLines = [];
  while (startIndex < lines.length && startIndex < 8) {
    const line = lines[startIndex];
    if (detectSection(line)) break;
    if (DATE_RANGE_RE.test(line) && headerLines.length > 2) break;
    headerLines.push(line);
    startIndex += 1;
  }

  const contact = parseContactBlock(headerLines);
  const sections = {
    summary: [],
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    other: [],
  };

  let i = startIndex;
  while (i < lines.length) {
    const section = detectSection(lines[i]);
    if (section) {
      i += 1;
      const { content, nextIndex } = collectSectionLines(lines, i);
      sections[section].push(...content);
      i = nextIndex;
      continue;
    }

    sections.other.push(lines[i]);
    i += 1;
  }

  let summaryText = sections.summary.join('\n').trim();
  if (!summaryText && sections.other.length) {
    const preExperience = [];
    for (const line of sections.other) {
      if (DATE_RANGE_RE.test(line) || DEGREE_RE.test(line)) break;
      preExperience.push(line);
    }
    if (preExperience.length) {
      summaryText = preExperience.join('\n').trim();
      sections.other.splice(0, preExperience.length);
    }
  }

  const experience = parseExperienceContent(sections.experience.length ? sections.experience : sections.other);
  const projects = parseExperienceContent(sections.projects);
  const education = parseEducationContent(sections.education);
  const skills = parseSkillsContent(sections.skills);

  const unclassified = [
    ...sections.other.filter((line) => !experience.some((e) => e.title === line || e.company === line)),
    ...sections.certifications,
  ]
    .map((line) => line.trim())
    .filter(Boolean);

  if (unclassified.length && !summaryText) {
    summaryText = unclassified.join('\n');
  } else if (unclassified.length) {
    summaryText = `${summaryText}\n\n${unclassified.join('\n')}`.trim();
  }

  const result = {
    name: name || 'Imported Resume',
    contact,
    summary: summaryText,
    experience: experience.filter((e) => e.title || e.company || e.bullets.length),
    projects: projects.filter((e) => e.title || e.company || e.bullets.length),
    education,
    skills,
  };

  if (result.contact && Object.keys(result.contact).length === 0) delete result.contact;
  if (!result.summary) delete result.summary;
  if (result.experience.length === 0) delete result.experience;
  if (result.projects.length === 0) delete result.projects;
  if (result.education.length === 0) delete result.education;
  if (result.skills.length === 0) delete result.skills;

  return result;
}

export function resumeDataToYaml(data) {
  return yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  }).trimEnd() + '\n';
}
