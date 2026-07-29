import yaml from 'js-yaml';
import {
  getAllApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  APPLICATION_STATUSES,
  getStatusMeta,
  normalizeApplicationStatus,
  DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
  DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
} from '../application-storage.js';
import { createResume, updateResume } from '../storage.js';
import { createCoverLetter, updateCoverLetter } from '../cover-letter-storage.js';
import { parseCursorResponse, getFitBadgeMeta } from '../cursor-import.js';
import {
  downloadResumePdfFromData,
  downloadCoverLetterPdfFromData,
} from '../pdf-text-export.js';
import { prepareDocumentDataForExport } from '../contact-display.js';
import { buildResumeFilename, buildCoverLetterFilename } from '../pdf-filenames.js';
import { cleanCompanyName } from '../job-parser.js';
import { mountAuthAwarePage } from '../auth-ui.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function displayCompany(name) {
  return cleanCompanyName(name) || 'Company';
}

function hasDocuments(app) {
  return Boolean(app.resumeYaml?.trim() && app.coverLetterYaml?.trim());
}

function renderStatusSelect(currentStatus, appId) {
  const options = APPLICATION_STATUSES.map((status) => {
    const selected = status.id === currentStatus ? ' selected' : '';
    return `<option value="${status.id}"${selected}>${escapeHtml(status.label)}</option>`;
  }).join('');

  const meta = getStatusMeta(currentStatus);
  return `
    <select
      class="application-status-select"
      data-app-id="${appId}"
      style="--status-color: ${meta.color}"
      aria-label="Application status"
    >
      ${options}
    </select>
  `;
}

function resolveRowFitRating(app) {
  if (app.fitRating) {
    return getFitBadgeMeta(app.fitRating);
  }
  if (app.fitRecommendation) {
    return getFitBadgeMeta(app.fitRecommendation);
  }
  return getFitBadgeMeta('moderate');
}

function getFitTooltipText(app) {
  return (app.fitAssessment || app.fitSummary || '').trim();
}

/** Render FIT text as section headers + bullet lists for the tooltip. */
function formatFitTooltipHtml(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';

  let html = '';
  let inList = false;

  const closeList = () => {
    if (inList) {
      html += '</ul>';
      inList = false;
    }
  };

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    const sectionMatch = trimmed.match(/^([A-Za-z][^:]{0,48}):\s*$/);
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);

    if (sectionMatch) {
      closeList();
      const sectionClass =
        /^why it might not work$/i.test(sectionMatch[1].trim())
          ? 'application-fit-tooltip-section is-gaps'
          : 'application-fit-tooltip-section';
      html += `<div class="${sectionClass}">${escapeHtml(sectionMatch[1])}</div>`;
    } else if (bulletMatch) {
      if (!inList) {
        html += '<ul class="application-fit-tooltip-list">';
        inList = true;
      }
      html += `<li>${escapeHtml(bulletMatch[1])}</li>`;
    } else {
      closeList();
      html += `<p class="application-fit-tooltip-p">${escapeHtml(trimmed)}</p>`;
    }
  }

  closeList();
  return html;
}

function renderFitBadge(app) {
  const fit = resolveRowFitRating(app);
  const tooltipText = getFitTooltipText(app);
  const score =
    app.fitScore !== null && app.fitScore !== undefined && app.fitScore !== ''
      ? `<span class="application-fit-score">${app.fitScore}</span>`
      : '';
  const tipId = app.id ? `fit-tip-${app.id}` : '';
  const a11yAttrs = tooltipText && tipId
    ? ` tabindex="0" aria-describedby="${tipId}"`
    : '';
  const badge = `
    <span class="application-fit-badge" style="--fit-color: ${fit.color}"${a11yAttrs}>
      <span class="application-fit-badge-dot" aria-hidden="true"></span>
      <span class="application-fit-badge-label">${escapeHtml(fit.label)}</span>
      ${score}
    </span>
  `;

  if (!tooltipText || !tipId) return badge;

  return `
    <span class="application-fit-badge-wrap">
      ${badge}
      <span class="application-fit-tooltip" id="${tipId}" role="tooltip" hidden>${formatFitTooltipHtml(tooltipText)}</span>
    </span>
  `;
}

function getWrapTooltip(wrap) {
  const badge = wrap.querySelector('.application-fit-badge');
  const tipId = badge?.getAttribute('aria-describedby');
  if (tipId) {
    return document.getElementById(tipId);
  }
  return wrap.querySelector('.application-fit-tooltip');
}

function portalFitTooltip(tooltip) {
  if (tooltip.parentElement !== document.body) {
    document.body.appendChild(tooltip);
  }
}

function restoreFitTooltip(wrap, tooltip) {
  if (tooltip?.parentElement === document.body) {
    wrap.appendChild(tooltip);
  }
}

function positionFitTooltip(wrap) {
  const badge = wrap.querySelector('.application-fit-badge');
  const tooltip = getWrapTooltip(wrap);
  if (!badge || !tooltip) return;

  portalFitTooltip(tooltip);

  tooltip.removeAttribute('hidden');
  tooltip.style.visibility = 'hidden';
  tooltip.style.top = '0';
  tooltip.style.left = '0';

  const badgeRect = badge.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const pad = 12;

  let top = badgeRect.top - tipRect.height - gap;
  const placeBelow = top < pad;
  if (placeBelow) {
    top = badgeRect.bottom + gap;
  }
  tooltip.classList.toggle('is-below', placeBelow);

  let left = badgeRect.left + badgeRect.width / 2 - tipRect.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - tipRect.width - pad));

  tooltip.style.top = `${Math.round(top)}px`;
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.visibility = '';
}

function hideFitTooltip(wrap) {
  const tooltip = getWrapTooltip(wrap);
  if (!tooltip) return;
  tooltip.setAttribute('hidden', '');
  tooltip.classList.remove('is-below');
  restoreFitTooltip(wrap, tooltip);
}

function bindFitBadgeTooltips(root) {
  const useTouchToggle = window.matchMedia('(hover: none)').matches;
  let activeWrap = null;

  function closeActive() {
    if (!activeWrap) return;
    hideFitTooltip(activeWrap);
    activeWrap = null;
  }

  root.querySelectorAll('.application-fit-badge-wrap').forEach((wrap) => {
    const badge = wrap.querySelector('.application-fit-badge');
    if (!badge) return;

    if (!useTouchToggle) {
      badge.addEventListener('mouseenter', () => {
        if (activeWrap && activeWrap !== wrap) hideFitTooltip(activeWrap);
        activeWrap = wrap;
        positionFitTooltip(wrap);
      });
      badge.addEventListener('mouseleave', () => {
        hideFitTooltip(wrap);
        if (activeWrap === wrap) activeWrap = null;
      });
    } else {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        const tooltip = getWrapTooltip(wrap);
        const isOpen = tooltip && !tooltip.hasAttribute('hidden');
        if (activeWrap && activeWrap !== wrap) hideFitTooltip(activeWrap);
        if (isOpen) {
          hideFitTooltip(wrap);
          activeWrap = null;
        } else {
          positionFitTooltip(wrap);
          activeWrap = wrap;
        }
      });
    }

    badge.addEventListener('focus', () => {
      if (!useTouchToggle) return;
      if (activeWrap && activeWrap !== wrap) hideFitTooltip(activeWrap);
      activeWrap = wrap;
      positionFitTooltip(wrap);
    });
    badge.addEventListener('blur', () => {
      if (activeWrap === wrap) closeActive();
    });
  });

  const onDocumentClick = (e) => {
    if (!useTouchToggle || !activeWrap) return;
    if (activeWrap.contains(e.target)) return;
    const tooltip = getWrapTooltip(activeWrap);
    if (tooltip?.contains(e.target)) return;
    closeActive();
  };

  const onScrollOrResize = () => closeActive();
  window.addEventListener('resize', onScrollOrResize);
  root.addEventListener('scroll', onScrollOrResize, true);
  document.addEventListener('click', onDocumentClick);

  return () => {
    window.removeEventListener('resize', onScrollOrResize);
    root.removeEventListener('scroll', onScrollOrResize, true);
    document.removeEventListener('click', onDocumentClick);
    closeActive();
    document.querySelectorAll('.application-fit-tooltip').forEach((tooltip) => {
      if (tooltip.parentElement === document.body) {
        tooltip.remove();
      }
    });
  };
}

function renderApplicationRow(app) {
  const status = getStatusMeta(app.status);
  const fit = resolveRowFitRating(app);
  const appliedDate = app.appliedAt || app.createdAt;
  const company = displayCompany(app.company);
  const ready = hasDocuments(app);

  return `
    <article class="application-row" data-id="${app.id}" style="--status-color: ${status.color}; --fit-color: ${fit.color}">
      <div class="application-row-accent" aria-hidden="true"></div>
      <div class="application-row-cell application-row-company" data-label="Company">
        <span class="application-row-company-text">${escapeHtml(company)}</span>
        ${renderFitBadge(app)}
      </div>
      <div class="application-row-cell application-row-title" data-label="Role">
        <span class="application-row-title-text">${escapeHtml(app.title)}</span>
      </div>
      <div class="application-row-cell application-row-date" data-label="Applied">
        <time datetime="${escapeHtml(appliedDate)}">${formatDate(appliedDate)}</time>
      </div>
      <div class="application-row-cell application-row-status" data-label="Status">
        ${renderStatusSelect(app.status, app.id)}
      </div>
      <div class="application-row-cell application-row-actions" data-label="Actions">
        <div class="application-row-actions-inner">
          <button type="button" class="btn btn-primary btn-sm" data-action="download-resume" ${ready ? '' : 'disabled'} title="${ready ? 'Download resume PDF' : 'Import documents first'}">Resume</button>
          <button type="button" class="btn btn-primary btn-sm" data-action="download-cover-letter" ${ready ? '' : 'disabled'} title="${ready ? 'Download cover letter PDF' : 'Import documents first'}">Cover Letter</button>
          <button type="button" class="btn btn-danger btn-sm" data-action="delete" title="Delete application">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function renderApplicationsTable(applications) {
  return `
    <div class="applications-table" role="table" aria-label="Application tracker">
      <div class="applications-table-header" role="row">
        <span class="applications-table-header-cell" role="columnheader">Company</span>
        <span class="applications-table-header-cell" role="columnheader">Role</span>
        <span class="applications-table-header-cell" role="columnheader">Applied</span>
        <span class="applications-table-header-cell" role="columnheader">Status</span>
        <span class="applications-table-header-cell applications-table-header-actions" role="columnheader">Actions <span class="applications-table-header-hint">(Download)</span></span>
      </div>
      <div class="applications-table-body" role="rowgroup">
        ${applications.map(renderApplicationRow).join('')}
      </div>
    </div>
  `;
}

function renderImportModal() {
  return `
    <div class="import-modal-overlay" id="import-modal" hidden>
      <div class="import-modal" role="dialog" aria-labelledby="import-modal-title" aria-modal="true">
        <div class="import-modal-header">
          <h3 id="import-modal-title">Import Application</h3>
          <button type="button" class="import-modal-close" id="import-modal-close" aria-label="Close">&times;</button>
        </div>
        <p class="import-modal-hint">Copy and paste AI YAML</p>
        <textarea
          id="import-paste-input"
          class="import-paste-input"
          rows="14"
          placeholder="---APPLICATION---&#10;company: ...&#10;title: ...&#10;---FIT---&#10;...&#10;---RESUME YAML---&#10;...&#10;---COVER LETTER YAML---&#10;..."
          spellcheck="false"
        ></textarea>
        <p class="import-modal-error" id="import-modal-error" role="alert" hidden></p>
        <div class="import-modal-actions">
          <button type="button" class="btn btn-secondary" id="import-modal-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="import-modal-confirm">Import</button>
        </div>
      </div>
    </div>
  `;
}

function renderApplicationsView(applications) {
  const list =
    applications.length > 0
      ? renderApplicationsTable(applications)
      : `<div class="applications-empty-board">
          <div class="empty-state applications-empty">
            <div class="applications-empty-icon" aria-hidden="true"></div>
            <div class="empty-state-title">No applications yet</div>
            <p class="empty-state-text">Follow the <a href="#/applications-how-to" class="applications-empty-link">Applications How To</a> to generate AI output, then import in one paste.</p>
          </div>
        </div>`;

  return `
    <div class="page-view applications-page">
      <div class="page-header applications-page-header">
        <div>
          <h2 class="page-title">Job Applications</h2>
          <p class="page-subtitle">Any AI tool -> one paste import -> download PDFs.</p>
          ${applications.length > 0 ? `<div class="applications-count"><span class="applications-count-num">${applications.length}</span> application${applications.length === 1 ? '' : 's'}</div>` : ''}
        </div>
        <div class="page-header-actions">
          <a href="#/applications-how-to" class="btn btn-secondary">How To</a>
        <button type="button" class="btn btn-primary" id="open-import-btn">Import Application</button>
        </div>
      </div>

      <section class="applications-tracker" aria-label="Application tracker">
        ${list}
      </section>

      ${renderImportModal()}
    </div>
  `;
}

function updateStatusSelectStyle(select) {
  const meta = getStatusMeta(select.value);
  select.style.setProperty('--status-color', meta.color);
}

function applicationExportContext(app) {
  return {
    jobDescription: app.jobDescription,
    asksForLinkedin: app.asksForLinkedin,
    asks_for_linkedin: app.asksForLinkedin,
  };
}

function prepareCoverLetterData(app, data) {
  const prepared = { ...data, recipient: { ...(data.recipient || {}) } };
  if (app.roleNumber && !prepared.recipient.role_number) {
    prepared.recipient.role_number = app.roleNumber;
  }
  return prepared;
}

async function saveImportedDocuments(app, parsed) {
  let resumeId = app?.resumeId;
  let coverLetterId = app?.coverLetterId;
  const company = displayCompany(parsed.company || app?.company);
  const title = parsed.title || app?.title || 'Position';

  if (parsed.resumeYaml) {
    if (resumeId) {
      await updateResume(resumeId, { yaml: parsed.resumeYaml });
    } else {
      const resume = await createResume({
        name: `${company} — ${title}`,
        templateId: app?.resumeTemplateId || DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
        yaml: parsed.resumeYaml,
      });
      resumeId = resume.id;
    }
  }

  if (parsed.coverLetterYaml) {
    if (coverLetterId) {
      await updateCoverLetter(coverLetterId, { yaml: parsed.coverLetterYaml });
    } else {
      const coverLetter = await createCoverLetter({
        name: `${company} Cover Letter`,
        templateId: app?.coverLetterTemplateId || DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
        yaml: parsed.coverLetterYaml,
      });
      coverLetterId = coverLetter.id;
    }
  }

  return { resumeId, coverLetterId };
}

async function importApplicationFromPaste(text) {
  const parsed = parseCursorResponse(text);
  const today = new Date().toISOString();
  const { resumeId, coverLetterId } = await saveImportedDocuments(null, parsed);

  return createApplication({
    company: parsed.company,
    title: parsed.title,
    location: parsed.location,
    roleNumber: parsed.roleNumber,
    asksForLinkedin: parsed.asksForLinkedin,
    status: normalizeApplicationStatus(parsed.status),
    appliedAt: today,
    resumeYaml: parsed.resumeYaml,
    coverLetterYaml: parsed.coverLetterYaml,
    fitAssessment: parsed.fitAssessment,
    fitRecommendation: parsed.fitRecommendation,
    fitRating: parsed.fitRating,
    fitScore: parsed.fitScore,
    fitSummary: parsed.fitSummary,
    resumeId,
    coverLetterId,
    resumeTemplateId: DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
    coverLetterTemplateId: DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
  });
}

async function normalizeApplicationTemplateIds(app) {
  if (!app) return null;
  const updates = {};
  if (!app.resumeTemplateId) {
    updates.resumeTemplateId = DEFAULT_APPLICATION_RESUME_TEMPLATE_ID;
  }
  if (!app.coverLetterTemplateId) {
    updates.coverLetterTemplateId = DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID;
  }
  if (Object.keys(updates).length === 0) return app;
  return (await updateApplication(app.id, updates)) || { ...app, ...updates };
}

export function mountApplicationsPage(container) {
  let unbindFitTooltips = null;
  let shell = null;

  function bindImportModal(refresh) {
    const modal = container.querySelector('#import-modal');
    const openBtn = container.querySelector('#open-import-btn');
    const closeBtn = container.querySelector('#import-modal-close');
    const cancelBtn = container.querySelector('#import-modal-cancel');
    const confirmBtn = container.querySelector('#import-modal-confirm');
    const textarea = container.querySelector('#import-paste-input');
    const errorEl = container.querySelector('#import-modal-error');

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }

    function openModal() {
      modal?.removeAttribute('hidden');
      showError('');
      if (textarea) {
        textarea.value = '';
        textarea.focus();
      }
    }

    function closeModal() {
      modal?.setAttribute('hidden', '');
      showError('');
    }

    openBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    confirmBtn?.addEventListener('click', async () => {
      const text = textarea?.value?.trim();
      if (!text) {
        showError('Paste the full AI response first.');
        return;
      }
      confirmBtn.disabled = true;
      try {
        await importApplicationFromPaste(text);
        closeModal();
        await refresh();
      } catch (err) {
        showError(err.message || 'Failed to parse import.');
      } finally {
        confirmBtn.disabled = false;
      }
    });
  }

  function bindEvents(refresh) {
    bindImportModal(refresh);
    unbindFitTooltips?.();
    unbindFitTooltips = bindFitBadgeTooltips(container);

    container.querySelectorAll('.application-status-select').forEach((select) => {
      updateStatusSelectStyle(select);
      select.addEventListener('change', async () => {
        const appId = select.dataset.appId;
        await updateApplication(appId, { status: normalizeApplicationStatus(select.value) });
        updateStatusSelectStyle(select);
        const row = select.closest('.application-row');
        const meta = getStatusMeta(select.value);
        row?.style.setProperty('--status-color', meta.color);
      });
    });

    container.querySelectorAll('.application-row').forEach((row) => {
      const id = row.dataset.id;

      row.querySelector('[data-action="download-resume"]')?.addEventListener('click', async () => {
        const app = await normalizeApplicationTemplateIds(await getApplication(id));
        if (!app?.resumeYaml?.trim()) return;
        try {
          const data = yaml.load(app.resumeYaml);
          const exportContext = applicationExportContext(app);
          const prepared = prepareDocumentDataForExport(data, exportContext);
          const filename = buildResumeFilename(prepared, app.title);
          const templateId = app.resumeTemplateId || DEFAULT_APPLICATION_RESUME_TEMPLATE_ID;
          downloadResumePdfFromData(prepared, templateId, filename, exportContext);
        } catch (err) {
          alert(err.message || 'Failed to download resume.');
        }
      });

      row.querySelector('[data-action="download-cover-letter"]')?.addEventListener('click', async () => {
        const app = await normalizeApplicationTemplateIds(await getApplication(id));
        if (!app?.coverLetterYaml?.trim()) return;
        try {
          const data = prepareCoverLetterData(app, yaml.load(app.coverLetterYaml));
          const exportContext = applicationExportContext(app);
          const prepared = prepareDocumentDataForExport(data, exportContext);
          const templateId = app.coverLetterTemplateId || DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID;
          downloadCoverLetterPdfFromData(
            prepared,
            templateId,
            prepared.name,
            buildCoverLetterFilename(prepared, app.company),
            exportContext
          );
        } catch (err) {
          alert(err.message || 'Failed to download cover letter.');
        }
      });

      row.querySelector('[data-action="delete"]')?.addEventListener('click', async () => {
        const app = await getApplication(id);
        if (!app) return;
        if (!confirm(`Delete application for "${displayCompany(app.company)} — ${app.title}"?`)) return;
        await deleteApplication(id);
        await refresh();
      });
    });
  }

  shell = mountAuthAwarePage(container, {
    activeView: 'applications',
    renderMain: async () => {
      const applications = await getAllApplications();
      return renderApplicationsView(applications);
    },
    bindMain: () => {
      const refresh = () => shell.refresh();
      bindEvents(refresh);
      return () => {
        unbindFitTooltips?.();
        unbindFitTooltips = null;
      };
    },
  });

  return {
    cleanup: () => {
      shell?.cleanup();
      shell = null;
      unbindFitTooltips?.();
      unbindFitTooltips = null;
    },
  };
}
