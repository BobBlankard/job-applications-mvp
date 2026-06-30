import { jsPDF } from 'jspdf';
import { elementToSVG, inlineResources } from 'dom-to-svg';
import { svg2pdf } from 'svg2pdf.js';

const PDF_FILENAME = 'Doherty Resume.pdf';
const LETTER_WIDTH_PT = 612;
const LETTER_HEIGHT_PT = 792;

const TYPOGRAPHY_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-transform',
];

/**
 * svg2pdf.js only maps font-weight 700 / "bold" to jsPDF's bold variant.
 * CSS weights like 600 are emitted by dom-to-svg but ignored, so text exports thin.
 */
function normalizeFontWeightForPdfExport(weight) {
  if (!weight) return 'normal';

  const normalized = weight.trim().toLowerCase();
  if (normalized === 'bold' || normalized === 'bolder') return 'bold';
  if (normalized === 'normal' || normalized === 'lighter') return 'normal';

  const numeric = Number.parseInt(normalized, 10);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 600) return 'bold';
    return 'normal';
  }

  return weight;
}

function walkElementPairs(sourceRoot, cloneRoot, callback) {
  callback(sourceRoot, cloneRoot);
  const sourceChildren = [...sourceRoot.children];
  const cloneChildren = [...cloneRoot.children];
  for (let i = 0; i < sourceChildren.length; i++) {
    const cloneChild = cloneChildren[i];
    if (!cloneChild) break;
    walkElementPairs(sourceChildren[i], cloneChild, callback);
  }
}

/** Inline computed typography on the export clone so dom-to-svg captures exact styles. */
function applyExportTypography(sourceRoot, cloneRoot) {
  walkElementPairs(sourceRoot, cloneRoot, (sourceEl, cloneEl) => {
    if (!cloneEl?.style) return;
    const computed = getComputedStyle(sourceEl);
    for (const prop of TYPOGRAPHY_PROPERTIES) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;

      const exportValue = prop === 'font-weight'
        ? normalizeFontWeightForPdfExport(value)
        : value;
      cloneEl.style.setProperty(prop, exportValue, 'important');
    }
  });
}

/** Normalize font-weight attributes on SVG text nodes before svg2pdf conversion. */
function normalizeSvgFontWeights(svgRoot) {
  svgRoot.querySelectorAll('[font-weight]').forEach((el) => {
    const weight = el.getAttribute('font-weight');
    const normalized = normalizeFontWeightForPdfExport(weight);
    if (normalized !== weight) {
      el.setAttribute('font-weight', normalized);
    }
  });
}

function prepareExportClone(previewPageEl) {
  const pageClone = previewPageEl.cloneNode(true);
  pageClone.style.transform = 'none';
  pageClone.style.transformOrigin = 'top left';
  pageClone.style.boxShadow = 'none';
  pageClone.classList.remove('page-overflow');

  const exportRoot = document.createElement('div');
  exportRoot.className = 'pdf-export-root';
  exportRoot.setAttribute('aria-hidden', 'true');
  exportRoot.appendChild(pageClone);
  document.body.appendChild(exportRoot);

  return { exportRoot, pageClone };
}

/**
 * Export a preview page element as a vector PDF that matches the HTML preview.
 * Uses DOM → SVG → PDF so CSS borders, fonts, and text order are preserved.
 */
export async function downloadPagePdf(previewPageEl, filename) {
  if (!previewPageEl) {
    throw new Error('Preview is not available.');
  }

  const { exportRoot, pageClone } = prepareExportClone(previewPageEl);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    applyExportTypography(previewPageEl, pageClone);

    const svgDocument = elementToSVG(pageClone);
    await inlineResources(svgDocument.documentElement);

    const svgElement = svgDocument.documentElement;
    normalizeSvgFontWeights(svgElement);

    const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });

    await svg2pdf(svgElement, doc, {
      x: 0,
      y: 0,
      width: LETTER_WIDTH_PT,
      height: LETTER_HEIGHT_PT,
    });

    doc.save(filename);
  } finally {
    exportRoot.remove();
  }
}

/** Export the on-screen resume preview as a vector PDF. */
export async function downloadResumePdf(previewPageEl) {
  return downloadPagePdf(previewPageEl, PDF_FILENAME);
}

function sanitizeFilename(name) {
  return String(name)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

/** Export a cover letter preview. Filename: "[Name] Cover Letter.pdf" */
export async function downloadCoverLetterPdf(previewPageEl, senderName) {
  const base = sanitizeFilename(senderName) || 'Cover Letter';
  return downloadPagePdf(previewPageEl, `${base} Cover Letter.pdf`);
}
