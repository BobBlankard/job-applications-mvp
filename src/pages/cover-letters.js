import {
  getAllCoverLetters,
  getCoverLetter,
  createCoverLetter,
  deleteCoverLetter,
  updateCoverLetter,
} from '../cover-letter-storage.js';
import { renderInlineNameEdit, mountInlineNameEdit } from '../inline-name-edit.js';
import { COVER_LETTER_TEMPLATES } from '../cover-letter-templates/index.js';
import { mountCoverLetterPreview } from '../cover-letter-preview.js';
import { renderSidebar } from '../sidebar.js';
import { navigate } from '../router.js';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function mountPreviewsInContainer(root) {
  root.querySelectorAll('[data-preview-cover-letter-id]').forEach((el) => {
    const letter = getCoverLetter(el.dataset.previewCoverLetterId);
    if (!letter) return;
    mountCoverLetterPreview(el, {
      yamlText: letter.yaml,
      templateId: letter.templateId,
      width: Number(el.dataset.previewWidth) || 200,
    });
  });

  root.querySelectorAll('[data-preview-cl-template-id]').forEach((el) => {
    const template = COVER_LETTER_TEMPLATES.find((t) => t.id === el.dataset.previewClTemplateId);
    if (!template) return;
    mountCoverLetterPreview(el, {
      yamlText: template.defaultYaml,
      templateId: template.id,
      width: Number(el.dataset.previewWidth) || 200,
    });
  });
}

function renderCoverLetterCard(letter, template) {
  const templateName = template?.name || letter.templateId;
  return `
    <article class="resume-card" data-id="${letter.id}">
      <div class="resume-card-main" data-action="open" role="button" tabindex="0">
        <div class="resume-card-preview" data-preview-cover-letter-id="${escapeAttr(letter.id)}" data-preview-width="220"></div>
        <div class="resume-card-info">
          <div class="resume-card-name">${renderInlineNameEdit(letter.name, letter.id, 'card', { entityType: 'cover-letter' })}</div>
          <div class="resume-card-meta">Last edited ${formatDate(letter.updatedAt)}</div>
          <span class="resume-card-template">${escapeHtml(templateName)}</span>
        </div>
      </div>
      <div class="resume-card-actions">
        <button type="button" class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </div>
    </article>
  `;
}

function renderCoverLettersView() {
  const letters = getAllCoverLetters();
  const cards =
    letters.length > 0
      ? `<div class="resume-grid">${letters
          .map((l) => {
            const template = COVER_LETTER_TEMPLATES.find((t) => t.id === l.templateId);
            return renderCoverLetterCard(l, template);
          })
          .join('')}</div>`
      : `
        <div class="empty-state">
          <div class="empty-state-title">No cover letters yet</div>
          <p class="empty-state-text">Create a professional cover letter from one of ${COVER_LETTER_TEMPLATES.length} templates. Edit in YAML with live preview and export to PDF.</p>
          <button type="button" class="btn btn-primary" id="empty-new-cl-btn">Create Your First Cover Letter</button>
        </div>
      `;

  return `
    <div class="page-view">
      <div class="page-header">
        <div>
          <h2 class="page-title">Cover Letters</h2>
          <p class="page-subtitle">Write, style, and export professional cover letters. Each letter includes a signature-style closing rendered in a script font.</p>
        </div>
        <button type="button" class="btn btn-primary" id="new-cover-letter-btn">+ New Cover Letter</button>
      </div>
      ${cards}
    </div>
  `;
}

function showTemplateModal(onCreate, preselectedId) {
  let selectedTemplateId = preselectedId || COVER_LETTER_TEMPLATES[0].id;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="cl-modal-title">
      <div class="modal-header">
        <h2 id="cl-modal-title" class="modal-title">Create New Cover Letter</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="new-resume-form">
          <label class="form-label" for="cl-name-input">Cover letter name</label>
          <input type="text" id="cl-name-input" class="form-input" value="My Cover Letter" maxlength="80" />
        </div>
        <p class="modal-hint">Choose a letter template. You can change it later in the editor.</p>
        <div class="template-grid modal-template-grid">
          ${COVER_LETTER_TEMPLATES.map(
            (t) => `
            <button type="button" class="template-pick-card${t.id === selectedTemplateId ? ' selected' : ''}" data-template-id="${t.id}">
              <div class="template-pick-preview" data-preview-cl-template-id="${escapeAttr(t.id)}" data-preview-width="140"></div>
              <div class="template-pick-name">${escapeHtml(t.name)}</div>
            </button>
          `
          ).join('')}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="create">Create Cover Letter</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  mountPreviewsInContainer(overlay);

  const nameInput = overlay.querySelector('#cl-name-input');
  const templateGrid = overlay.querySelector('.modal-template-grid');

  function close() {
    overlay.remove();
  }

  templateGrid.addEventListener('click', (e) => {
    const card = e.target.closest('[data-template-id]');
    if (!card) return;
    selectedTemplateId = card.dataset.templateId;
    overlay.querySelectorAll('.template-pick-card').forEach((el) => {
      el.classList.toggle('selected', el.dataset.templateId === selectedTemplateId);
    });
  });

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  overlay.querySelector('[data-action="create"]').addEventListener('click', () => {
    const name = nameInput.value.trim() || 'Untitled Cover Letter';
    const template = COVER_LETTER_TEMPLATES.find((t) => t.id === selectedTemplateId) || COVER_LETTER_TEMPLATES[0];
    onCreate({ name, templateId: template.id, yaml: template.defaultYaml });
    close();
  });

  nameInput.focus();
  nameInput.select();
}

export function mountCoverLettersPage(container) {
  let nameEditors = [];

  function bindEvents() {
    nameEditors.forEach((editor) => editor.destroy());
    nameEditors = [];

    function handleNew() {
      showTemplateModal(({ name, templateId, yaml }) => {
        const letter = createCoverLetter({ name, templateId, yaml });
        navigate(`/cover-letter/edit/${letter.id}`);
      });
    }

    container.querySelector('#new-cover-letter-btn')?.addEventListener('click', handleNew);
    container.querySelector('#empty-new-cl-btn')?.addEventListener('click', handleNew);

    container.querySelectorAll('.resume-card').forEach((card) => {
      const id = card.dataset.id;

      nameEditors.push(
        mountInlineNameEdit(card, id, {
          entityType: 'cover-letter',
          updateFn: updateCoverLetter,
          untitledLabel: 'Untitled Cover Letter',
          ariaLabel: 'Edit cover letter name',
        })
      );

      const openEl = card.querySelector('[data-action="open"]');
      const openLetter = () => navigate(`/cover-letter/edit/${id}`);
      openEl?.addEventListener('click', openLetter);
      openEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openLetter();
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const letter = getAllCoverLetters().find((l) => l.id === id);
        const label = letter?.name || 'this cover letter';
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        deleteCoverLetter(id);
        render();
      });
    });
  }

  function render() {
    container.innerHTML = `
      <div class="app-shell">
        ${renderSidebar('cover-letters')}
        <div class="main-column">
          <main class="home-page">${renderCoverLettersView()}</main>
        </div>
      </div>
    `;
    mountPreviewsInContainer(container);
    bindEvents();
  }

  render();

  return {
    cleanup: () => {
      nameEditors.forEach((editor) => editor.destroy());
      nameEditors = [];
      container.innerHTML = '';
    },
  };
}
