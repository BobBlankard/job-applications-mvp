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
  if (contact.website) parts.push(escapeHtml(contact.website));
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

function renderRecipientBlock(recipient) {
  if (!recipient || typeof recipient !== 'object') return '';

  const lines = [];
  if (recipient.hiring_manager) {
    lines.push({ text: escapeHtml(recipient.hiring_manager), class: 'cl-recipient-line' });
  }
  if (recipient.company) {
    lines.push({ text: escapeHtml(recipient.company), class: 'cl-recipient-line cl-recipient-company' });
  }
  if (recipient.title) {
    lines.push({ text: escapeHtml(recipient.title), class: 'cl-recipient-line cl-recipient-title' });
  }
  if (recipient.address) {
    lines.push({ text: escapeHtml(recipient.address), class: 'cl-recipient-line' });
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

export function renderCoverLetter(data) {
  if (!data || typeof data !== 'object') {
    return '<p class="cl-error">Invalid cover letter data</p>';
  }

  const name = escapeHtml(data.name || 'Your Name');
  const contact = formatContact(data.contact);
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
