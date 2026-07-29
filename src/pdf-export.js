import yaml from 'js-yaml';
import {
  downloadResumePdfFromData as downloadResumePdfJsPdf,
  downloadCoverLetterPdfFromData as downloadCoverLetterPdfJsPdf,
} from './pdf-text-export.js';
import {
  DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
  DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
} from './application-storage.js';
import { prepareDocumentDataForExport } from './contact-display.js';
import { buildResumeFilename, buildCoverLetterFilename } from './pdf-filenames.js';

/**
 * Export resume or cover letter PDF with a proper text layer for clean copy-paste.
 * Uses jsPDF native text (not SVG) so extraction matches Google Docs-style reading order.
 */
export async function downloadPagePdf(_previewPageEl, filename, options = {}) {
  const { type = 'resume', data, yamlText, templateId, exportContext = {} } = options;

  let docData = data;
  if (!docData && yamlText) {
    docData = yaml.load(yamlText);
  }

  if (!docData) {
    throw new Error('Document data is not available.');
  }

  const preparedData = prepareDocumentDataForExport(docData, exportContext);

  if (type === 'cover-letter') {
    const resolvedId = templateId || DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID;
    const resolvedFilename =
      filename ||
      buildCoverLetterFilename(preparedData, options.company || preparedData.recipient?.company);
    downloadCoverLetterPdfJsPdf(preparedData, resolvedId, preparedData.name, resolvedFilename, exportContext);
    return;
  }

  const resolvedResumeId = templateId || DEFAULT_APPLICATION_RESUME_TEMPLATE_ID;
  const resolvedFilename = filename || buildResumeFilename(preparedData, options.role);
  downloadResumePdfJsPdf(preparedData, resolvedResumeId, resolvedFilename, exportContext);
}

/** Export resume PDF with selectable text in logical reading order. */
export async function downloadResumePdf(previewPageEl, options = {}) {
  return downloadPagePdf(previewPageEl, options.filename, { type: 'resume', ...options });
}

/** Export cover letter PDF with selectable text in logical reading order. */
export async function downloadCoverLetterPdf(previewPageEl, _senderName, options = {}) {
  return downloadPagePdf(previewPageEl, options.filename, { type: 'cover-letter', ...options });
}

export { downloadResumePdfFromData, downloadCoverLetterPdfFromData } from './pdf-text-export.js';
