import { HELP_SECTIONS } from './help-content.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderMarkdownBold(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

function renderSection(section) {
  const promptBlock = section.prompt
    ? `
      <div class="help-prompt-block">
        <div class="help-prompt-header">
          <span class="help-prompt-label">${escapeHtml(section.promptLabel || 'Copy prompt')}</span>
          <button type="button" class="btn btn-secondary btn-sm help-copy-btn" data-section-id="${section.id}">
            Copy
          </button>
        </div>
        <pre class="help-prompt-text">${escapeHtml(section.prompt)}</pre>
      </div>
    `
    : '';

  return `
    <section class="help-section" id="help-${section.id}">
      <h3 class="help-section-title">${escapeHtml(section.title)}</h3>
      <p class="help-section-body">${renderMarkdownBold(section.body)}</p>
      ${promptBlock}
    </section>
  `;
}

async function copyToClipboard(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const original = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = original;
    }, 2000);
  } catch {
    button.textContent = 'Copy failed';
    setTimeout(() => {
      button.textContent = 'Copy';
    }, 2000);
  }
}

export function showHelpPanel() {
  const promptById = Object.fromEntries(
    HELP_SECTIONS.filter((s) => s.prompt).map((s) => [s.id, s.prompt])
  );

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal help-modal" role="dialog" aria-labelledby="help-modal-title">
      <div class="modal-header">
        <h2 id="help-modal-title" class="modal-title">Resume Builder Help</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body help-modal-body">
        <p class="help-intro">Tips for importing existing resumes, saving versions, and using templates.</p>
        ${HELP_SECTIONS.map(renderSection).join('')}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" data-action="close">Done</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
  }

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('[data-action="close"]').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelectorAll('.help-copy-btn').forEach((btn) => {
    const text = promptById[btn.dataset.sectionId];
    if (text) {
      btn.addEventListener('click', () => copyToClipboard(text, btn));
    }
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeyDown);
}
