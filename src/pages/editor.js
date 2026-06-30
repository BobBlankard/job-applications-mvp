import yaml from 'js-yaml';
import { createEditor } from '../editor.js';
import { renderResume } from '../renderer.js';
import { downloadResumePdf } from '../pdf-export.js';
import { importPdfFile } from '../pdf-import.js';
import { bindYamlFileInput } from '../yaml-import.js';
import { getResume, updateResume } from '../storage.js';
import { renderInlineNameEdit, mountInlineNameEdit } from '../inline-name-edit.js';
import { TEMPLATES, getTemplateById } from '../templates/index.js';
import { navigate } from '../router.js';
import { showHelpPanel } from '../help-panel.js';

const LETTER_HEIGHT_PX = 11 * 96;
const LETTER_WIDTH_PX = 8.5 * 96;
/** Allow minor subpixel / margin rounding before warning */
const OVERFLOW_TOLERANCE_PX = 16;
const PAGE_WARNING_DEFAULT = 'Content exceeds one page — shorten bullets or remove sections';
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const DEFAULT_ZOOM = 80;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderToolbar(resume) {
  const templateOptions = TEMPLATES.map(
    (t) =>
      `<option value="${t.id}"${t.id === resume.templateId ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
  ).join('');

  return `
    <header class="toolbar">
      <div class="toolbar-left">
        <button type="button" class="toolbar-btn-back" id="back-btn" title="Back to home">← Home</button>
        <a href="#/" class="app-title-link"><h1 class="app-title">Resume Builder</h1></a>
        ${renderInlineNameEdit(resume.name, resume.id, 'toolbar')}
      </div>
      <div class="toolbar-right">
        <label class="visually-hidden" for="template-select">Template</label>
        <select id="template-select" class="template-select" title="Change template">
          ${templateOptions}
        </select>
        <span id="page-warning" class="page-warning hidden" role="alert">
          Content exceeds one page — shorten bullets or remove sections
        </span>
        <span id="import-notice" class="import-notice hidden" role="status"></span>
        <span id="parse-error" class="parse-error hidden" role="alert"></span>
        <button type="button" id="reset-btn" class="btn btn-secondary" title="Reset YAML to template default">
          Reset
        </button>
        <button type="button" id="import-yaml-btn" class="btn btn-secondary" title="Import resume from YAML file">
          Import YAML
        </button>
        <input type="file" id="import-yaml-file" accept=".yaml,.yml,text/yaml,text/x-yaml,application/x-yaml" class="visually-hidden" />
        <button type="button" id="import-btn" class="btn btn-secondary" title="Import resume from PDF">
          Import PDF
        </button>
        <input type="file" id="import-file" accept=".pdf,application/pdf" class="visually-hidden" />
        <button type="button" id="save-btn" class="btn btn-secondary" title="Save to your resume library">
          Save Resume
        </button>
        <span id="save-notice" class="save-notice hidden" role="status"></span>
        <button type="button" id="download-btn" class="btn btn-primary">
          Download PDF
        </button>
      </div>
    </header>
  `;
}

function showSaveResumeModal(currentName, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal save-resume-modal" role="dialog" aria-labelledby="save-modal-title">
      <div class="modal-header">
        <h2 id="save-modal-title" class="modal-title">Save Resume</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="new-resume-form">
          <label class="form-label" for="save-resume-name-input">Resume name</label>
          <input type="text" id="save-resume-name-input" class="form-input" maxlength="80" />
          <p class="modal-hint save-modal-hint">This name appears on your home page. The YAML <code>name:</code> field controls the header on the PDF.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const nameInput = overlay.querySelector('#save-resume-name-input');
  nameInput.value = currentName;

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
  }

  function submit() {
    const name = nameInput.value.trim() || 'Untitled Resume';
    onSave(name);
    close();
  }

  overlay.querySelector('[data-action="cancel"]').addEventListener('click', close);
  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('[data-action="save"]').addEventListener('click', submit);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  function onKeyDown(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKeyDown);

  nameInput.focus();
  nameInput.select();
}

function renderWorkspace() {
  return `
    <main class="workspace">
      <section class="panel editor-panel" aria-label="Resume source editor">
        <div class="panel-header">
          <div class="panel-header-left">
            <span class="panel-label">Source</span>
            <button type="button" id="help-btn" class="help-btn" title="Help &amp; import guide" aria-label="Open help">?</button>
          </div>
          <span class="panel-hint">YAML</span>
        </div>
        <div id="editor" class="editor-container"></div>
      </section>

      <div id="divider" class="divider" role="separator" aria-orientation="vertical" aria-label="Resize panels"></div>

      <section class="panel preview-panel" aria-label="Resume preview">
        <div class="panel-header">
          <span class="panel-label">Preview</span>
          <div class="panel-header-actions">
            <div class="zoom-controls" aria-label="Preview zoom">
              <button type="button" id="zoom-out-btn" class="zoom-btn" title="Zoom out" aria-label="Zoom out">−</button>
              <span id="zoom-label" class="zoom-label" aria-live="polite">${DEFAULT_ZOOM}%</span>
              <button type="button" id="zoom-in-btn" class="zoom-btn" title="Zoom in" aria-label="Zoom in">+</button>
            </div>
            <span class="panel-hint">US Letter (8.5″ × 11″)</span>
          </div>
        </div>
        <div class="preview-scroll">
          <div id="preview-zoom-container" class="preview-zoom-container">
            <div id="preview-page" class="resume-page">
              <div id="resume-content" class="resume-content"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function mountEditorPage(container, resumeId) {
  const resume = getResume(resumeId);
  if (!resume) {
    container.innerHTML = `
      <header class="toolbar">
        <div class="toolbar-left">
          <a href="#/" class="app-title-link"><h1 class="app-title">Resume Builder</h1></a>
        </div>
      </header>
      <main class="home-page">
        <div class="home-content">
          <div class="empty-state">
            <div class="empty-state-title">Resume not found</div>
            <p class="empty-state-text">This resume may have been deleted.</p>
            <a href="#/" class="btn btn-primary">Back to Home</a>
          </div>
        </div>
      </main>
    `;
    return () => {
      container.innerHTML = '';
    };
  }

  let currentResume = { ...resume };
  let lastValidData = null;
  let previewZoom = DEFAULT_ZOOM;
  let editor = null;
  let saveTimer = null;
  let pendingUpdates = {};
  let nameEditor = null;

  container.innerHTML = renderToolbar(currentResume) + renderWorkspace();

  const editorEl = container.querySelector('#editor');
  const resumeContentEl = container.querySelector('#resume-content');
  const previewPageEl = container.querySelector('#preview-page');
  const previewZoomContainerEl = container.querySelector('#preview-zoom-container');
  const pageWarningEl = container.querySelector('#page-warning');
  const parseErrorEl = container.querySelector('#parse-error');
  const importNoticeEl = container.querySelector('#import-notice');
  const downloadBtn = container.querySelector('#download-btn');
  const saveBtn = container.querySelector('#save-btn');
  const saveNoticeEl = container.querySelector('#save-notice');
  const resetBtn = container.querySelector('#reset-btn');
  const importBtn = container.querySelector('#import-btn');
  const importYamlBtn = container.querySelector('#import-yaml-btn');
  const importFileInput = container.querySelector('#import-file');
  const importYamlFileInput = container.querySelector('#import-yaml-file');
  const dividerEl = container.querySelector('#divider');
  const editorPanel = container.querySelector('.editor-panel');
  const zoomInBtn = container.querySelector('#zoom-in-btn');
  const zoomOutBtn = container.querySelector('#zoom-out-btn');
  const zoomLabelEl = container.querySelector('#zoom-label');
  const templateSelect = container.querySelector('#template-select');
  const backBtn = container.querySelector('#back-btn');

  nameEditor = mountInlineNameEdit(container, currentResume.id, {
    onSaved: (saved) => {
      currentResume = { ...currentResume, name: saved.name };
    },
  });

  function applyTemplateClass(templateId) {
    const t = getTemplateById(templateId);
    previewPageEl.className = `resume-page ${t.cssClass}`;
  }

  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (Object.keys(pendingUpdates).length === 0) return null;
    const updates = pendingUpdates;
    pendingUpdates = {};
    const saved = updateResume(currentResume.id, updates);
    if (saved) currentResume = saved;
    return saved;
  }

  function scheduleSave(updates) {
    pendingUpdates = { ...pendingUpdates, ...updates };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 300);
  }

  let saveNoticeTimer = null;

  function showSaveNotice(message = 'Resume saved') {
    clearTimeout(saveNoticeTimer);
    saveNoticeEl.textContent = message;
    saveNoticeEl.classList.remove('hidden');
    saveNoticeTimer = setTimeout(() => {
      saveNoticeEl.classList.add('hidden');
    }, 2500);
  }

  function saveResume() {
    showSaveResumeModal(currentResume.name, (name) => {
      const yamlText = editor.state.doc.toString();
      const templateId = templateSelect.value;

      pendingUpdates = { yaml: yamlText, templateId, name };
      const saved = flushSave();
      if (saved) {
        currentResume = saved;
        nameEditor?.setName(saved.name);
        showSaveNotice('Resume saved');
      }
    });
  }

  function showParseError(message) {
    parseErrorEl.textContent = message;
    parseErrorEl.classList.remove('hidden');
  }

  function hideParseError() {
    parseErrorEl.classList.add('hidden');
  }

  let importNoticeTimer = null;

  function showImportNotice(message) {
    clearTimeout(importNoticeTimer);
    importNoticeEl.textContent = message;
    importNoticeEl.classList.remove('hidden');
    importNoticeTimer = setTimeout(() => {
      importNoticeEl.classList.add('hidden');
    }, 8000);
  }

  function hideImportNotice() {
    clearTimeout(importNoticeTimer);
    importNoticeEl.classList.add('hidden');
  }

  function setImportLoading(loading) {
    importBtn.disabled = loading;
    importBtn.textContent = loading ? 'Importing…' : 'Import PDF';
    resetBtn.disabled = loading;
    downloadBtn.disabled = loading || !lastValidData;
  }

  function getMaxContentHeight() {
    const styles = getComputedStyle(previewPageEl);
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    return LETTER_HEIGHT_PX - paddingTop - paddingBottom;
  }

  function checkPageOverflow() {
    const pageHeight = previewPageEl.offsetHeight;
    const contentHeight = resumeContentEl.scrollHeight;
    const maxHeight = getMaxContentHeight();
    const pageOverflowPx = Math.max(0, pageHeight - LETTER_HEIGHT_PX);
    const contentOverflowPx = Math.max(0, contentHeight - maxHeight);
    const overflowPx = Math.max(pageOverflowPx, contentOverflowPx);
    const overflows = overflowPx > OVERFLOW_TOLERANCE_PX;

    pageWarningEl.classList.toggle('hidden', !overflows);
    previewPageEl.classList.toggle('page-overflow', overflows);

    if (overflows) {
      const overflowIn = (overflowPx / 96).toFixed(1);
      pageWarningEl.textContent = `Content exceeds one page by ~${overflowIn}" — shorten bullets or remove sections`;
    } else {
      pageWarningEl.textContent = PAGE_WARNING_DEFAULT;
    }

    return overflows;
  }

  function applyPreviewZoom() {
    const scale = previewZoom / 100;
    previewPageEl.style.transform = `scale(${scale})`;
    previewPageEl.style.transformOrigin = 'top left';
    previewZoomContainerEl.style.width = `${LETTER_WIDTH_PX * scale}px`;
    previewZoomContainerEl.style.minHeight = `${LETTER_HEIGHT_PX * scale}px`;
    zoomLabelEl.textContent = `${previewZoom}%`;
    zoomOutBtn.disabled = previewZoom <= ZOOM_MIN;
    zoomInBtn.disabled = previewZoom >= ZOOM_MAX;
  }

  function setPreviewZoom(nextZoom) {
    previewZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, nextZoom));
    applyPreviewZoom();
    requestAnimationFrame(checkPageOverflow);
  }

  function updatePreview(yamlText) {
    scheduleSave({ yaml: yamlText });
    try {
      const data = yaml.load(yamlText);
      lastValidData = data;
      hideParseError();
      downloadBtn.disabled = false;
      resumeContentEl.innerHTML = renderResume(data);
      requestAnimationFrame(checkPageOverflow);
    } catch (err) {
      lastValidData = null;
      downloadBtn.disabled = true;
      showParseError(`YAML error: ${err.message}`);
    }
  }

  async function downloadPdf() {
    if (!lastValidData) {
      showParseError('Fix YAML errors before downloading.');
      return;
    }
    hideParseError();
    const previousLabel = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generating…';
    try {
      await downloadResumePdf(previewPageEl);
    } catch (err) {
      showParseError(err.message || 'Failed to generate PDF.');
    } finally {
      downloadBtn.disabled = !lastValidData;
      downloadBtn.textContent = previousLabel;
    }
  }

  function setupDivider() {
    let dragging = false;

    dividerEl.addEventListener('mousedown', (e) => {
      dragging = true;
      document.body.classList.add('resizing');
      e.preventDefault();
    });

    const onMouseMove = (e) => {
      if (!dragging) return;
      const workspace = container.querySelector('.workspace');
      const rect = workspace.getBoundingClientRect();
      const minWidth = 280;
      const maxWidth = rect.width - minWidth - 6;
      let width = e.clientX - rect.left;
      width = Math.max(minWidth, Math.min(maxWidth, width));
      editorPanel.style.flex = `0 0 ${width}px`;
    };

    const onMouseUp = () => {
      dragging = false;
      document.body.classList.remove('resizing');
      checkPageOverflow();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }

  applyTemplateClass(currentResume.templateId);
  applyPreviewZoom();
  editor = createEditor(editorEl, currentResume.yaml, updatePreview);
  updatePreview(currentResume.yaml);

  const teardownDivider = setupDivider();

  backBtn.addEventListener('click', () => {
    flushSave();
    navigate('/');
  });
  downloadBtn.addEventListener('click', downloadPdf);
  saveBtn.addEventListener('click', saveResume);
  container.querySelector('#help-btn')?.addEventListener('click', showHelpPanel);

  importBtn.addEventListener('click', () => importFileInput.click());
  importYamlBtn?.addEventListener('click', () => importYamlFileInput?.click());

  if (importYamlFileInput) {
    bindYamlFileInput(importYamlFileInput, {
      expectedType: 'resume',
      onLoading: setImportLoading,
      onError: (message) => showParseError(message),
      onImported: ({ yamlText, suggestedName }) => {
        hideParseError();
        editor.dispatch({
          changes: { from: 0, to: editor.state.doc.length, insert: yamlText },
        });
        updatePreview(yamlText);
        if (suggestedName && suggestedName !== currentResume.name) {
          scheduleSave({ name: suggestedName });
          currentResume = { ...currentResume, name: suggestedName };
          nameEditor?.setName(suggestedName);
        }
        showImportNotice('YAML imported — review sections before downloading.');
      },
    });
  }

  importFileInput.addEventListener('change', async () => {
    const file = importFileInput.files?.[0];
    importFileInput.value = '';
    if (!file) return;

    hideImportNotice();
    hideParseError();
    setImportLoading(true);

    try {
      const { yaml: importedYaml } = await importPdfFile(file);
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: importedYaml },
      });
      updatePreview(importedYaml);
      showImportNotice('Imported — review and adjust sections as needed.');
    } catch (err) {
      showParseError(err.message || 'Failed to import PDF.');
    } finally {
      setImportLoading(false);
    }
  });

  resetBtn.addEventListener('click', () => {
    const t = getTemplateById(currentResume.templateId);
    if (!confirm('Reset YAML to this template\'s default content? Your current edits will be lost.')) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: t.defaultYaml },
    });
    updatePreview(t.defaultYaml);
  });

  templateSelect.addEventListener('change', () => {
    const newTemplateId = templateSelect.value;
    applyTemplateClass(newTemplateId);
    scheduleSave({ templateId: newTemplateId });
    currentResume = { ...currentResume, templateId: newTemplateId };
    requestAnimationFrame(checkPageOverflow);
  });

  zoomInBtn.addEventListener('click', () => setPreviewZoom(previewZoom + ZOOM_STEP));
  zoomOutBtn.addEventListener('click', () => setPreviewZoom(previewZoom - ZOOM_STEP));

  const onResize = () => requestAnimationFrame(checkPageOverflow);
  window.addEventListener('resize', onResize);

  return () => {
    flushSave();
    clearTimeout(saveNoticeTimer);
    clearTimeout(importNoticeTimer);
    window.removeEventListener('resize', onResize);
    teardownDivider();
    nameEditor?.destroy();
    nameEditor = null;
    editor?.destroy();
    editor = null;
    document.body.classList.remove('resizing');
    container.innerHTML = '';
  };
}
