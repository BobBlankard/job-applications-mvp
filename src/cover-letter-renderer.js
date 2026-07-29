import { contactDisplayParts, shouldIncludeLinkedIn } from './contact-display.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatRoleNumberLine(roleNumber) {
  const value = String(roleNumber || '').trim();
  if (!value) return '';
  if (/^(?:requisition|req\.?|job\s*id|role)\b/i.test(value)) return escapeHtml(value);
  return escapeHtml(`Requisition #${value}`);
}

function formatContact(contact, exportContext = {}) {
  if (!contact || typeof contact !== 'object') return '';
  const parts = contactDisplayParts(contact, shouldIncludeLinkedIn(exportContext)).map(escapeHtml);
  return parts.join('<span class="cl-contact-sep">·</span>');
}

function formatDate(dateValue) {
  if (!dateValue || dateValue === 'auto') {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return escapeHtml(String(dateValue).trim());
}

function stripGenericAddresseeSuffix(text) {
  return String(text || '')
    .replace(/\s+(?:Hiring|Recruiting)\s+(?:Team|Manager)\s*$/i, '')
    .trim();
}

function renderRecipientBlock(recipient) {
  if (!recipient || typeof recipient !== 'object') return '';

  const lines = [];
  const company = stripGenericAddresseeSuffix(recipient.company);
  if (company) {
    lines.push({ text: escapeHtml(company), class: 'cl-recipient-line cl-recipient-company' });
  }
  const roleNumberLine = formatRoleNumberLine(recipient.role_number);
  if (roleNumberLine) {
    lines.push({ text: roleNumberLine, class: 'cl-recipient-line' });
  }

  if (lines.length === 0) return '';

  return `
    <div class="cl-recipient">
      ${lines.map((line) => `<div class="${line.class}">${line.text}</div>`).join('')}
    </div>
  `;
}

function renderBodyParagraphs(body) {
  if (!body) return '';

  const text = String(body).trim();
  if (!text) return '';

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphs
    .map((p) => `<p class="cl-body-paragraph">${escapeHtml(p.trim())}</p>`)
    .join('');
}

export function renderCoverLetter(data, exportContext = {}) {
  if (!data || typeof data !== 'object') {
    return '<p class="cl-error">Invalid cover letter data</p>';
  }

  const name = escapeHtml(data.name || 'Your Name');
  const contact = formatContact(data.contact, exportContext);
  const date = formatDate(data.date);
  const salutation = data.salutation ? escapeHtml(String(data.salutation).trim()) : '';
  const closing = data.closing ? escapeHtml(String(data.closing).trim()) : 'Sincerely,';
  const signatureName = escapeHtml(data.signature_name || data.name || 'Your Name');

  return `
    <header class="cl-header">
      <div class="cl-sender-name">${name}</div>
      ${contact ? `<div class="cl-contact">${contact}</div>` : ''}
    </header>

    <div class="cl-date">${date}</div>

    ${renderRecipientBlock(data.recipient)}

    ${salutation ? `<div class="cl-salutation">${salutation}</div>` : ''}

    <div class="cl-body">
      ${renderBodyParagraphs(data.body)}
    </div>

    <div class="cl-closing-block">
      <div class="cl-closing">${closing}</div>
      <div class="cl-signature-wrap">
        <div class="cl-signature">${signatureName}</div>
      </div>
    </div>
  `;
}
