export function sanitizeFilenamePart(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .trim()
    .slice(0, 80);
}

export function parsePersonName(fullName) {
  const parts = String(fullName || 'Your Name')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { first: 'Your', last: 'Name' };
  if (parts.length === 1) return { first: parts[0], last: 'Name' };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(' ');
  return { first, last };
}

export function buildPersonFilenamePrefix(fullName) {
  const { first, last } = parsePersonName(fullName);
  return sanitizeFilenamePart(`${first}_${last}`);
}

export function buildResumeFilename(data, role) {
  const namePart = buildPersonFilenamePrefix(data?.name);
  const rolePart = sanitizeFilenamePart(role || 'Position');
  return `${namePart}_Resume_${rolePart}.pdf`;
}

export function stripIncFromCompanyName(company) {
  return String(company || '')
    .replace(/(?:,\s*|\s+)Inc\.?$/i, '')
    .trim();
}

export function buildCoverLetterFilename(data, company) {
  const namePart = buildPersonFilenamePrefix(data?.name);
  const companyPart = sanitizeFilenamePart(stripIncFromCompanyName(company) || 'Company');
  return `${namePart}_CL_${companyPart}.pdf`;
}
