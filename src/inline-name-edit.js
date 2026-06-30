import { updateResume } from './storage.js';
import { updateCoverLetter } from './cover-letter-storage.js';

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

export function renderInlineNameEdit(name, entityId, variant = '', options = {}) {
  const { entityType = 'resume' } = options;
  const variantClass = variant ? ` inline-name-edit--${variant}` : '';
  const useSpan = variant === 'card';
  const tag = useSpan ? 'span' : 'button';
  const tagAttrs = useSpan
    ? ' role="button" tabindex="0"'
    : ' type="button"';
  const ariaLabel = entityType === 'cover-letter' ? 'Edit cover letter name' : 'Edit resume name';
  return `
    <span class="inline-name-edit${variantClass}" data-entity-id="${escapeAttr(entityId)}" data-entity-type="${escapeAttr(entityType)}">
      <${tag} class="inline-name-edit-btn"${tagAttrs} aria-label="${ariaLabel}" title="Click to rename">
        <span class="inline-name-edit-text">${escapeHtml(name)}</span>
        <span class="inline-name-edit-icon" aria-hidden="true">?</span>
      </${tag}>
      <input
        type="text"
        class="inline-name-edit-input"
        maxlength="80"
        aria-label="Resume name"
        hidden
      />
    </span>
  `;
}

export function mountInlineNameEdit(root, entityId, options = {}) {
  const el =
    root.querySelector(`.inline-name-edit[data-entity-id="${CSS.escape(entityId)}"]`) ||
    root.querySelector('.inline-name-edit');
  if (!el) return { setName: () => {}, destroy: () => {} };

  const btn = el.querySelector('.inline-name-edit-btn');
  const textEl = el.querySelector('.inline-name-edit-text');
  const input = el.querySelector('.inline-name-edit-input');
  const {
    onSaved,
    entityType = el.dataset.entityType || 'resume',
    updateFn,
    untitledLabel = entityType === 'cover-letter' ? 'Untitled Cover Letter' : 'Untitled Resume',
  } = options;

  const saveUpdate =
    updateFn ||
    (entityType === 'cover-letter'
      ? (id, updates) => updateCoverLetter(id, updates)
      : (id, updates) => updateResume(id, updates));

  function showLabel(name) {
    textEl.textContent = name;
    input.value = name;
    btn.hidden = false;
    input.hidden = true;
    el.classList.remove('is-editing');
  }

  function startEdit(e) {
    e.preventDefault();
    e.stopPropagation();
    btn.hidden = true;
    input.hidden = false;
    el.classList.add('is-editing');
    input.value = textEl.textContent;
    input.focus();
    input.select();
  }

  function commitEdit() {
    const trimmed = input.value.trim() || untitledLabel;
    const current = textEl.textContent;
    if (trimmed === current) {
      showLabel(current);
      return;
    }
    const saved = saveUpdate(entityId, { name: trimmed });
    if (saved) {
      showLabel(saved.name);
      onSaved?.(saved);
    } else {
      showLabel(current);
    }
  }

  function cancelEdit() {
    showLabel(textEl.textContent);
  }

  const onBtnClick = (e) => startEdit(e);
  const onBtnKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      startEdit(e);
    }
  };
  const onInputBlur = () => commitEdit();
  const onInputKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
      input.blur();
    }
  };
  const stopPropagation = (e) => e.stopPropagation();

  btn.addEventListener('click', onBtnClick);
  btn.addEventListener('keydown', onBtnKeyDown);
  btn.addEventListener('mousedown', stopPropagation);
  input.addEventListener('blur', onInputBlur);
  input.addEventListener('keydown', onInputKeyDown);
  input.addEventListener('click', stopPropagation);
  input.addEventListener('mousedown', stopPropagation);

  return {
    setName(name) {
      showLabel(name);
    },
    destroy() {
      btn.removeEventListener('click', onBtnClick);
      btn.removeEventListener('keydown', onBtnKeyDown);
      btn.removeEventListener('mousedown', stopPropagation);
      input.removeEventListener('blur', onInputBlur);
      input.removeEventListener('keydown', onInputKeyDown);
      input.removeEventListener('click', stopPropagation);
      input.removeEventListener('mousedown', stopPropagation);
    },
  };
}
