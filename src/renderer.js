function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatContact(contact) {
  if (!contact || typeof contact !== 'object') return '';
  const parts = [];
  if (contact.email) parts.push(escapeHtml(contact.email));
  if (contact.phone) parts.push(escapeHtml(contact.phone));
  if (contact.location) parts.push(escapeHtml(contact.location));
  if (contact.linkedin) parts.push(escapeHtml(contact.linkedin));
  if (contact.website) parts.push(escapeHtml(contact.website));
  return parts.join(' · ');
}

function formatDateRange(start, end) {
  return [start, end].filter(Boolean).map(escapeHtml).join(' – ');
}

/**
 * ATS-safe entry layout (verified via PDF copy-paste):
 *   Title
 *   company · location · dates   ← single inline line, DOM order left-to-right
 * Do not put dates in a separate right-aligned block; svg2pdf groups them by X position.
 */
function renderEntryBlock(titleHtml, metaParts) {
  const metaBits = metaParts.filter(Boolean);
  const metaLine = metaBits.length
    ? `<p class="resume-entry-line resume-entry-line-meta">${metaBits.join(
        '<span class="resume-entry-meta-sep"> · </span>'
      )}</p>`
    : '';

  return `
    <p class="resume-entry-line resume-entry-line-title"><span class="resume-entry-title">${titleHtml}</span></p>
    ${metaLine}`;
}

function renderExperience(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const entries = items
    .map((job) => {
      const title = escapeHtml(job.title || '');
      const company = job.company ? `<span class="resume-entry-org">${escapeHtml(job.company)}</span>` : '';
      const location = job.location
        ? `<span class="resume-entry-location">${escapeHtml(job.location)}</span>`
        : '';
      const dates = formatDateRange(job.start, job.end);
      const dateSpan = dates ? `<span class="resume-entry-dates">${dates}</span>` : '';
      const bullets = Array.isArray(job.bullets)
        ? job.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
        : '';
      return `
        <div class="resume-entry">
          ${renderEntryBlock(title, [company, location, dateSpan])}
          ${bullets ? `<ul class="resume-bullets">${bullets}</ul>` : ''}
        </div>`;
    })
    .join('');
  return `<section class="resume-section"><h2 class="resume-section-title">Experience</h2>${entries}</section>`;
}

function renderProjects(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const entries = items
    .map((project) => {
      const title = escapeHtml(project.title || '');
      const company = project.company
        ? `<span class="resume-entry-org">${escapeHtml(project.company)}</span>`
        : '';
      const location = project.location
        ? `<span class="resume-entry-location">${escapeHtml(project.location)}</span>`
        : '';
      const dates = formatDateRange(project.start, project.end);
      const dateSpan = dates ? `<span class="resume-entry-dates">${dates}</span>` : '';
      const bullets = Array.isArray(project.bullets)
        ? project.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')
        : '';
      return `
        <div class="resume-entry">
          ${renderEntryBlock(title, [company, location, dateSpan])}
          ${bullets ? `<ul class="resume-bullets">${bullets}</ul>` : ''}
        </div>`;
    })
    .join('');
  return `<section class="resume-section"><h2 class="resume-section-title">Projects</h2>${entries}</section>`;
}

function renderEducation(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const entries = items
    .map((edu) => {
      const degree = escapeHtml(edu.degree || '');
      const school = edu.school ? `<span class="resume-entry-org">${escapeHtml(edu.school)}</span>` : '';
      const location = edu.location
        ? `<span class="resume-entry-location">${escapeHtml(edu.location)}</span>`
        : '';
      const year = edu.year ? `<span class="resume-entry-dates">${escapeHtml(edu.year)}</span>` : '';
      const details = edu.details ? escapeHtml(edu.details) : '';
      return `
        <div class="resume-entry">
          ${renderEntryBlock(degree, [school, location, year])}
          ${details ? `<p class="resume-details">${details}</p>` : ''}
        </div>`;
    })
    .join('');
  return `<section class="resume-section"><h2 class="resume-section-title">Education</h2>${entries}</section>`;
}

function renderSkills(items) {
  if (!Array.isArray(items) || items.length === 0) return '';
  const lines = items.map((s) => `<p class="resume-skill-line">${escapeHtml(String(s))}</p>`).join('');
  return `<section class="resume-section"><h2 class="resume-section-title">Skills</h2>${lines}</section>`;
}

export function renderResume(data) {
  if (!data || typeof data !== 'object') {
    return '<p class="resume-error">Invalid resume data</p>';
  }

  const name = escapeHtml(data.name || 'Your Name');
  const contact = formatContact(data.contact);
  const summary = data.summary ? escapeHtml(String(data.summary).trim()) : '';

  return `
    <header class="resume-header">
      <h1 class="resume-name">${name}</h1>
      ${contact ? `<p class="resume-contact">${contact}</p>` : ''}
    </header>
    ${
      summary
        ? `<section class="resume-section"><h2 class="resume-section-title">Summary</h2><p class="resume-summary">${summary}</p></section>`
        : ''
    }
    ${renderExperience(data.experience)}
    ${renderProjects(data.projects)}
    ${renderEducation(data.education)}
    ${renderSkills(data.skills)}
  `;
}
