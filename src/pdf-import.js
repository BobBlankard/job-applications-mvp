import { parseResumeText, resumeDataToYaml } from './pdf-parser.js';
import { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker.mjs';

export { parseResumeText, resumeDataToYaml } from './pdf-parser.js';

let workerConfigured = false;
let pdfjsLibPromise = null;

function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist');
  }
  return pdfjsLibPromise;
}

function configurePdfWorker(pdfjsLib) {
  if (workerConfigured) return;
  workerConfigured = true;

  // Inline worker handler so PDF.js never dynamic-import()s a relative worker URL.
  // Required for file:// builds where bundled scripts resolve imports against about:blank.
  globalThis.pdfjsWorker = { WorkerMessageHandler };

  // workerSrc must be set even though the fake-worker path uses globalThis.pdfjsWorker.
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'data:text/javascript,export%20%7B%7D';
}

function groupItemsIntoLines(items) {
  const groups = new Map();

  for (const item of items) {
    const text = item.str?.trim();
    if (!text) continue;

    const y = Math.round(item.transform?.[5] ?? 0);
    const x = item.transform?.[4] ?? 0;

    if (!groups.has(y)) groups.set(y, []);
    groups.get(y).push({ x, text });
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, parts]) => parts.sort((a, b) => a.x - b.x).map((p) => p.text).join(' ').trim())
    .filter(Boolean);
}

export async function extractTextFromPdf(file) {
  const pdfjsLib = await loadPdfjs();
  configurePdfWorker(pdfjsLib);

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageLines = groupItemsIntoLines(content.items);
    for (const text of pageLines) {
      lines.push({ page: pageNum, text });
    }
  }

  return lines;
}

export async function importPdfFile(file) {
  if (!file) {
    throw new Error('No file selected.');
  }

  const isPdf =
    file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('Please select a PDF file.');
  }

  const lines = await extractTextFromPdf(file);
  const text = lines.map((line) => line.text).join('\n').trim();

  if (!text) {
    throw new Error('This PDF has no extractable text. Try a text-based PDF.');
  }

  const data = parseResumeText(lines);
  const yamlText = resumeDataToYaml(data);

  return { data, yaml: yamlText };
}
