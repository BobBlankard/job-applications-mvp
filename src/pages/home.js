import { getAllResumes, getResume, createResume, deleteResume } from '../storage.js';
import { renderInlineNameEdit, mountInlineNameEdit } from '../inline-name-edit.js';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../templates/index.js';
import { navigate } from '../router.js';
import { mountResumePreview } from '../preview.js';
import { renderSidebar, initSidebar } from '../sidebar.js';
import { bindYamlFileInput } from '../yaml-import.js';

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
  root.querySelectorAll('[data-preview-resume-id]').forEach((el) => {
    const resume = getResume(el.dataset.previewResumeId);
    if (!resume) return;
    mountResumePreview(el, {
      yamlText: resume.yaml,
      templateId: resume.templateId,
      width: Number(el.dataset.previewWidth) || 200,
    });
  });

  root.querySelectorAll('[data-preview-template-id]').forEach((el) => {
    const template = TEMPLATES.find((t) => t.id === el.dataset.previewTemplateId);
    if (!template) return;
    mountResumePreview(el, {
      yamlText: template.defaultYaml,
      templateId: template.id,
      width: Number(el.dataset.previewWidth) || 200,
    });
  });
}

function renderResumeCard(resume, template) {
  const templateName = template?.name || resume.templateId;
  return `
    <article class="resume-card" data-id="${resume.id}">
      <div class="resume-card-main" data-action="open" role="button" tabindex="0">
        <div class="resume-card-preview" data-preview-resume-id="${escapeAttr(resume.id)}" data-preview-width="220"></div>
        <div class="resume-card-info">
          <div class="resume-card-name">${renderInlineNameEdit(resume.name, resume.id, 'card')}</div>
          <div class="resume-card-meta">Last edited ${formatDate(resume.updatedAt)}</div>
          <span class="resume-card-template">${escapeHtml(templateName)}</span>
        </div>
      </div>
      <div class="resume-card-actions">
        <button type="button" class="btn btn-danger btn-sm" data-action="delete">Delete</button>
      </div>
    </article>
  `;
}

function renderHomeView() {
  const resumes = getAllResumes();
  const cards =
    resumes.length > 0
      ? `<div class="resume-grid">${resumes
          .map((r) => {
            const template = TEMPLATES.find((t) => t.id === r.templateId);
            return renderResumeCard(r, template);
          })
          .join('')}</div>`
      : `
        <div class="empty-state">
          <div class="empty-state-title">No resumes yet</div>
          <p class="empty-state-text">Create your first ATS-friendly resume from one of ${TEMPLATES.length} professional templates in the Library.</p>
          <div class="page-header-actions">
            <button type="button" class="btn btn-secondary" id="empty-import-yaml-btn">Import YAML</button>
            <button type="button" class="btn btn-primary" id="empty-new-btn">Create Your First Resume</button>
          </div>
        </div>
      `;

  return `
    <div class="page-view">
      <div class="page-header">
        <div>
          <h2 class="page-title">Your Resumes</h2>
          <p class="page-subtitle">Create, edit, and export multiple one-page resumes. All templates use single-column ATS-friendly layouts.</p>
        </div>
        <div class="page-header-actions">
          <button type="button" class="btn btn-secondary" id="import-yaml-btn" title="Import a resume from a .yaml file">Import YAML</button>
          <input type="file" id="import-yaml-file" accept=".yaml,.yml,text/yaml,text/x-yaml,application/x-yaml" class="visually-hidden" />
          <button type="button" class="btn btn-primary" id="new-resume-btn">+ New Resume</button>
        </div>
      </div>
      ${cards}
    </div>
  `;
}

function renderLibraryTemplateCard(template) {
  return `
    <article class="library-card" data-template-id="${template.id}">
      <div class="library-card-preview" data-preview-template-id="${escapeAttr(template.id)}" data-preview-width="200"></div>
      <div class="library-card-body">
        <h3 class="library-card-name">${escapeHtml(template.name)}</h3>
        <p class="library-card-desc">${escapeHtml(template.description)}</p>
        <button type="button" class="btn btn-primary btn-sm library-use-btn" data-action="use-template">Use Template</button>
      </div>
    </article>
  `;
}

function renderLibraryView() {
  const sections = TEMPLATE_CATEGORIES.map((cat) => {
    const templates = TEMPLATES.filter((t) => t.category === cat.id);
    return `
      <section class="library-section">
        <h3 class="library-section-title">${escapeHtml(cat.label)}</h3>
        <div class="library-grid">
          ${templates.map(renderLibraryTemplateCard).join('')}
        </div>
      </section>
    `;
  }).join('');

  return `
    <div class="page-view">
      <div class="page-header">
        <div>
          <h2 class="page-title">Template Library</h2>
          <p class="page-subtitle">Browse ${TEMPLATES.length} ATS-friendly templates. Each preview uses sample content so you can see the real styling.</p>
        </div>
      </div>
      ${sections}
    </div>
  `;
}

function showTemplateModal(onCreate, preselectedId) {
  let selectedTemplateId = preselectedId || TEMPLATES[0].id;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="modal-title">
      <div class="modal-header">
        <h2 id="modal-title" class="modal-title">Create New Resume</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="new-resume-form">
          <label class="form-label" for="resume-name-input">Resume name</label>
          <input type="text" id="resume-name-input" class="form-input" value="My Resume" maxlength="80" />
        </div>
        <p class="modal-hint">Choose an ATS-friendly template. You can change it later in the editor.</p>
        ${TEMPLATE_CATEGORIES.map((cat) => {
          const templates = TEMPLATES.filter((t) => t.category === cat.id);
          if (!templates.length) return '';
          return `
            <h4 class="modal-template-group-title">${escapeHtml(cat.label)}</h4>
            <div class="template-grid modal-template-grid">
              ${templates
                .map(
                  (t) => `
                <button type="button" class="template-pick-card${t.id === selectedTemplateId ? ' selected' : ''}" data-template-id="${t.id}">
                  <div class="template-pick-preview" data-preview-template-id="${escapeAttr(t.id)}" data-preview-width="140"></div>
                  <div class="template-pick-name">${escapeHtml(t.name)}</div>
                </button>
              `
                )
                .join('')}
            </div>
          `;
        }).join('')}
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="create">Create Resume</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  mountPreviewsInContainer(overlay);

  const nameInput = overlay.querySelector('#resume-name-input');
  const templateGrid = overlay.querySelector('.modal-body');

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
    const name = nameInput.value.trim() || 'Untitled Resume';
    const template = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];
    onCreate({ name, templateId: template.id, yaml: template.defaultYaml });
    close();
  });

  nameInput.focus();
  nameInput.select();
}

function createFromTemplate(templateId) {
  const template = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0];
  const resume = createResume({
    name: `My ${template.name} Resume`,
    templateId: template.id,
    yaml: template.defaultYaml,
  });
  navigate(`/edit/${resume.id}`);
}

export function mountHomePage(container, initialView = 'home') {
  let currentView = initialView;
  let nameEditors = [];

  function bindEvents() {
    nameEditors.forEach((editor) => editor.destroy());
    nameEditors = [];
    function handleNewResume() {
      showTemplateModal(({ name, templateId, yaml }) => {
        const resume = createResume({ name, templateId, yaml });
        navigate(`/edit/${resume.id}`);
      });
    }

    const importYamlBtn = container.querySelector('#import-yaml-btn');
    const emptyImportYamlBtn = container.querySelector('#empty-import-yaml-btn');
    const importYamlFileInput = container.querySelector('#import-yaml-file');

    function handleImportYamlClick() {
      importYamlFileInput?.click();
    }

    function handleYamlImported({ yamlText, suggestedName }) {
      const resume = createResume({
        name: suggestedName,
        templateId: TEMPLATES[0].id,
        yaml: yamlText,
      });
      navigate(`/edit/${resume.id}`);
    }

    if (importYamlFileInput) {
      bindYamlFileInput(importYamlFileInput, {
        expectedType: 'resume',
        onImported: handleYamlImported,
        onError: (message) => alert(message),
      });
    }

    importYamlBtn?.addEventListener('click', handleImportYamlClick);
    emptyImportYamlBtn?.addEventListener('click', handleImportYamlClick);

    container.querySelector('#new-resume-btn')?.addEventListener('click', handleNewResume);
    container.querySelector('#empty-new-btn')?.addEventListener('click', handleNewResume);

    container.querySelectorAll('.resume-card').forEach((card) => {
      const id = card.dataset.id;

      nameEditors.push(mountInlineNameEdit(card, id));

      const openEl = card.querySelector('[data-action="open"]');
      const openResume = () => navigate(`/edit/${id}`);
      openEl?.addEventListener('click', openResume);
      openEl?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openResume();
        }
      });

      card.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const resume = getAllResumes().find((r) => r.id === id);
        const label = resume?.name || 'this resume';
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        deleteResume(id);
        render();
      });
    });

    container.querySelectorAll('.library-card').forEach((card) => {
      card.querySelector('[data-action="use-template"]')?.addEventListener('click', () => {
        createFromTemplate(card.dataset.templateId);
      });
    });
  }

  function render() {
    const mainContent = currentView === 'library' ? renderLibraryView() : renderHomeView();
    container.innerHTML = `
      <div class="app-shell">
        ${renderSidebar(currentView)}
        <div class="main-column">
          <main class="home-page">${mainContent}</main>
        </div>
      </div>
    `;
    initSidebar(container);
    mountPreviewsInContainer(container);
    bindEvents();
  }

  function setView(view) {
    currentView = view;
    render();
  }

  render();

  return {
    cleanup: () => {
      nameEditors.forEach((editor) => editor.destroy());
      nameEditors = [];
      container.innerHTML = '';
    },
    setView,
    getView: () => currentView,
  };
}
