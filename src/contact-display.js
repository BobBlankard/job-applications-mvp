const LINKEDIN_REQUEST_RE =
  /\b(?:provide|include|submit|attach|share|enter|paste|add)\b[^.\n]{0,40}\blinkedin\b|\blinkedin\s*(?:profile|url|link|handle)\b/i;

/** Whether a job/application explicitly asks for a LinkedIn profile or URL. */
export function jobAsksForLinkedIn(context = {}) {
  if (context.asksForLinkedin === true || context.asks_for_linkedin === true) return true;

  const text = [
    context.jobDescription,
    context.rawText,
    context.requirementsSnippet,
  ]
    .filter(Boolean)
    .join('\n');

  if (!text) return false;
  return LINKEDIN_REQUEST_RE.test(text);
}

export function shouldIncludeLinkedIn(context = {}) {
  return jobAsksForLinkedIn(context);
}

export function contactDisplayParts(contact, includeLinkedin = false) {
  if (!contact || typeof contact !== 'object') return [];
  const parts = [];
  if (contact.email) parts.push(contact.email);
  if (contact.phone) parts.push(contact.phone);
  if (contact.location) parts.push(contact.location);
  if (includeLinkedin && contact.linkedin) parts.push(contact.linkedin);
  if (contact.website) parts.push(contact.website);
  return parts;
}

export function prepareDocumentDataForExport(data, context = {}) {
  if (!data || typeof data !== 'object') return data;
  if (shouldIncludeLinkedIn(context) || !data.contact?.linkedin) return data;

  const next = { ...data, contact: { ...data.contact } };
  delete next.contact.linkedin;
  return next;
}
