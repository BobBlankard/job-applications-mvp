import yaml from 'js-yaml';
import { createEditor } from '../editor.js';
import { renderCoverLetter } from '../cover-letter-renderer.js';
import { downloadCoverLetterPdf } from '../pdf-export.js';
import { bindYamlFileInput } from '../yaml-import.js';
import { getCoverLetter, updateCoverLetter } from '../cover-letter-storage.js';
import { renderInlineNameEdit, mountInlineNameEdit } from '../inline-name-edit.js';
import { COVER_LETTER_TEMPLATES, getCoverLetterTemplateById } from '../cover-letter-templates/index.js';
import { navigate } from '../router.js';

const LETTER_HEIGHT_PX = 11 * 96;
const LETTER_WIDTH_PX = 8.5 * 96;
const OVERFLOW_TOLERANCE_PX = 16;
const PAGE_WARNING_DEFAULT = 'Content exceeds one page — shorten paragraphs';
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const DEFAULT_ZOOM = 80;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderToolbar(letter) {
  const templateOptions = COVER_LETTER_TEMPLATES.map(
    (t) =>
      `<option value="${t.id}"${t.id === letter.templateId ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
  ).join('');

  return `
    <header class="toolbar">
      <div class="toolbar-left">
        <button type="button" class="toolbar-btn-back" id="back-btn" title="Back to cover letters">← Cover Letters</button>
        <a href="#/cover-letters" class="app-title-link"><h1 class="app-title">Resume Builder</h1></a>
        ${renderInlineNameEdit(letter.name, letter.id, 'toolbar', { entityType: 'cover-letter' })}
      </div>
      <div class="toolbar-right">
        <label class="visually-hidden" for="template-select">Template</label>
        <select id="template-select" class="template-select" title="Change template">
          ${templateOptions}
        </select>
        <span id="page-warning" class="page-warning hidden" role="alert">
          Content exceeds one page — shorten paragraphs
        </span>
        <span id="parse-error" class="parse-error hidden" role="alert"></span>
        <span id="import-notice" class="import-notice hidden" role="status"></span>
        <button type="button" id="reset-btn" class="btn btn-secondary" title="Reset YAML to template default">
          Reset
        </button>
        <button type="button" id="import-yaml-btn" class="btn btn-secondary" title="Import cover letter from YAML file">
          Import YAML
        </button>
        <input type="file" id="import-yaml-file" accept=".yaml,.yml,text/yaml,text/x-yaml,application/x-yaml" class="visually-hidden" />
        <button type="button" id="save-btn" class="btn btn-secondary" title="Save cover letter">
          Save
        </button>
        <span id="save-notice" class="save-notice hidden" role="status"></span>
        <button type="button" id="download-btn" class="btn btn-primary">
          Download PDF
        </button>
      </div>
    </header>
  `;
}

function renderWorkspace() {
  return `
    <main class="workspace">
      <section class="panel editor-panel" aria-label="Cover letter source editor">
        <div class="panel-header">
          <div class="panel-header-left">
            <span class="panel-label">Source</span>
          </div>
          <span class="panel-hint">YAML</span>
        </div>
        <div id="editor" class="editor-container"></div>
      </section>

      <div id="divider" class="divider" role="separator" aria-orientation="vertical" aria-label="Resize panels"></div>

      <section class="panel preview-panel" aria-label="Cover letter preview">
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
            <div id="preview-page" class="cover-letter-page">
              <div id="cover-letter-content" class="cover-letter-content"></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  `;
}

function showSaveModal(currentName, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal save-resume-modal" role="dialog" aria-labelledby="save-modal-title">
      <div class="modal-header">
        <h2 id="save-modal-title" class="modal-title">Save Cover Letter</h2>
        <button type="button" class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="new-resume-form">
          <label class="form-label" for="save-name-input">Cover letter name</label>
          <input type="text" id="save-name-input" class="form-input" maxlength="80" />
          <p class="modal-hint save-modal-hint">This name appears in your cover letters list. The YAML <code>name:</code> field controls the letter header.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="button" class="btn btn-primary" data-action="save">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const nameInput = overlay.querySelector('#save-name-input');
  nameInput.value = currentName;

  function close() {
    document.removeEventListener('keydown', onKeyDown);
    overlay.remove();
  }

  function submit() {
    const name = nameInput.value.trim() || 'Untitled Cover Letter';
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

export function mountCoverLetterEditorPage(container, letterId) {
  const letter = getCoverLetter(letterId);
  if (!letter) {
    container.innerHTML = `
      <header class="toolbar">
        <div class="toolbar-left">
          <a href="#/cover-letters" class="app-title-link"><h1 class="app-title">Resume Builder</h1></a>
        </div>
      </header>
      <main class="home-page">
        <div class="page-view">
          <div class="empty-state">
            <div class="empty-state-title">Cover letter not found</div>
            <p class="empty-state-text">This cover letter may have been deleted.</p>
            <a href="#/cover-letters" class="btn btn-primary">Back to Cover Letters</a>
          </div>
        </div>
      </main>
    `;
    return () => {
      container.innerHTML = '';
    };
  }

  let currentLetter = { ...letter };
  let lastValidData = null;
  let previewZoom = DEFAULT_ZOOM;
  let editor = null;
  let saveTimer = null;
  let pendingUpdates = {};
  let nameEditor = null;

  container.innerHTML = renderToolbar(currentLetter) + renderWorkspace();

  const editorEl = container.querySelector('#editor');
  const contentEl = container.querySelector('#cover-letter-content');
  const previewPageEl = container.querySelector('#preview-page');
  const previewZoomContainerEl = container.querySelector('#preview-zoom-container');
  const pageWarningEl = container.querySelector('#page-warning');
  const parseErrorEl = container.querySelector('#parse-error');
  const importNoticeEl = container.querySelector('#import-notice');
  const importYamlBtn = container.querySelector('#import-yaml-btn');
  const importYamlFileInput = container.querySelector('#import-yaml-file');
  const downloadBtn = container.querySelector('#download-btn');
  const saveBtn = container.querySelector('#save-btn');
  const saveNoticeEl = container.querySelector('#save-notice');
  const resetBtn = container.querySelector('#reset-btn');
  const dividerEl = container.querySelector('#divider');
  const editorPanel = container.querySelector('.editor-panel');
  const zoomInBtn = container.querySelector('#zoom-in-btn');
  const zoomOutBtn = container.querySelector('#zoom-out-btn');
  const zoomLabelEl = container.querySelector('#zoom-label');
  const templateSelect = container.querySelector('#template-select');
  const backBtn = container.querySelector('#back-btn');

  nameEditor = mountInlineNameEdit(container, currentLetter.id, {
    entityType: 'cover-letter',
    updateFn: updateCoverLetter,
    untitledLabel: 'Untitled Cover Letter',
    ariaLabel: 'Edit cover letter name',
    onSaved: (saved) => {
      currentLetter = { ...currentLetter, name: saved.name };
    },
  });

  function applyTemplateClass(templateId) {
    const t = getCoverLetterTemplateById(templateId);
    previewPageEl.className = `cover-letter-page ${t.cssClass}`;
  }

  function flushSave() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (Object.keys(pendingUpdates).length === 0) return null;
    const updates = pendingUpdates;
    pendingUpdates = {};
    const saved = updateCoverLetter(currentLetter.id, updates);
    if (saved) currentLetter = saved;
    return saved;
  }

  function scheduleSave(updates) {
    pendingUpdates = { ...pendingUpdates, ...updates };
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 300);
  }

  let saveNoticeTimer = null;

  function showSaveNotice(message = 'Cover letter saved') {
    clearTimeout(saveNoticeTimer);
    saveNoticeEl.textContent = message;
    saveNoticeEl.classList.remove('hidden');
    saveNoticeTimer = setTimeout(() => {
      saveNoticeEl.classList.add('hidden');
    }, 2500);
  }

  function saveLetter() {
    showSaveModal(currentLetter.name, (name) => {
      const yamlText = editor.state.doc.toString();
      const templateId = templateSelect.value;

      pendingUpdates = { yaml: yamlText, templateId, name };
      const saved = flushSave();
      if (saved) {
        currentLetter = saved;
        nameEditor?.setName(saved.name);
        showSaveNotice('Cover letter saved');
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
    }, 3500);
  }

  function hideImportNotice() {
    clearTimeout(importNoticeTimer);
    importNoticeEl.classList.add('hidden');
  }

  function getMaxContentHeight() {
    const styles = getComputedStyle(previewPageEl);
    const paddingTop = parseFloat(styles.paddingTop) || 0;
    const paddingBottom = parseFloat(styles.paddingBottom) || 0;
    return LETTER_HEIGHT_PX - paddingTop - paddingBottom;
  }

  function checkPageOverflow() {
    const pageHeight = previewPageEl.offsetHeight;
    const contentHeight = contentEl.scrollHeight;
    const maxHeight = getMaxContentHeight();
    const pageOverflowPx = Math.max(0, pageHeight - LETTER_HEIGHT_PX);
    const contentOverflowPx = Math.max(0, contentHeight - maxHeight);
    const overflowPx = Math.max(pageOverflowPx, contentOverflowPx);
    const overflows = overflowPx > OVERFLOW_TOLERANCE_PX;

    pageWarningEl.classList.toggle('hidden', !overflows);
    previewPageEl.classList.toggle('page-overflow', overflows);

    if (overflows) {
      const overflowIn = (overflowPx / 96).toFixed(1);
      pageWarningEl.textContent = `Content exceeds one page by ~${overflowIn}" — shorten paragraphs`;
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
      contentEl.innerHTML = renderCoverLetter(data);
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
      const name = lastValidData.name || currentLetter.name || 'Cover Letter';
      await downloadCoverLetterPdf(previewPageEl, name);
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

  applyTemplateClass(currentLetter.templateId);
  applyPreviewZoom();
  editor = createEditor(editorEl, currentLetter.yaml, updatePreview);
  updatePreview(currentLetter.yaml);

  const teardownDivider = setupDivider();

  backBtn.addEventListener('click', () => {
    flushSave();
    navigate('/cover-letters');
  });
  downloadBtn.addEventListener('click', downloadPdf);
  saveBtn.addEventListener('click', saveLetter);

  importYamlBtn?.addEventListener('click', () => importYamlFileInput?.click());

  if (importYamlFileInput) {
    bindYamlFileInput(importYamlFileInput, {
      expectedType: 'cover-letter',
      onError: (message) => showParseError(message),
      onImported: ({ yamlText, suggestedName }) => {
        hideImportNotice();
        hideParseError();
        editor.dispatch({
          changes: { from: 0, to: editor.state.doc.length, insert: yamlText },
        });
        updatePreview(yamlText);
        if (suggestedName && suggestedName !== currentLetter.name) {
          scheduleSave({ name: suggestedName });
          currentLetter = { ...currentLetter, name: suggestedName };
          nameEditor?.setName(suggestedName);
        }
        showImportNotice('YAML imported — review before downloading.');
      },
    });
  }

  resetBtn.addEventListener('click', () => {
    const t = getCoverLetterTemplateById(currentLetter.templateId);
    if (!confirm("Reset YAML to this template's default content? Your current edits will be lost.")) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: t.defaultYaml },
    });
    updatePreview(t.defaultYaml);
  });

  templateSelect.addEventListener('change', () => {
    const newTemplateId = templateSelect.value;
    applyTemplateClass(newTemplateId);
    scheduleSave({ templateId: newTemplateId });
    currentLetter = { ...currentLetter, templateId: newTemplateId };
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
