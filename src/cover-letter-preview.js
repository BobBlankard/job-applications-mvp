import yaml from 'js-yaml';
import { renderCoverLetter } from './cover-letter-renderer.js';
import { getCoverLetterTemplateById } from './cover-letter-templates/index.js';
import { LETTER_WIDTH_PX, LETTER_HEIGHT_PX } from './preview.js';

export function parseCoverLetterYaml(yamlText) {
  return yaml.load(yamlText);
}

export function createCoverLetterPreviewElement({ yamlText, data, templateId, width = 200 }) {
  const scale = width / LETTER_WIDTH_PX;
  const height = width * (LETTER_HEIGHT_PX / LETTER_WIDTH_PX);
  const template = getCoverLetterTemplateById(templateId);

  const wrapper = document.createElement('div');
  wrapper.className = 'resume-preview-thumb';
  wrapper.style.width = `${width}px`;
  wrapper.style.height = `${height}px`;

  const viewport = document.createElement('div');
  viewport.className = 'resume-preview-viewport';
  viewport.style.width = `${LETTER_WIDTH_PX}px`;
  viewport.style.height = `${LETTER_HEIGHT_PX}px`;
  viewport.style.transform = `scale(${scale})`;
  viewport.style.transformOrigin = 'top left';

  const page = document.createElement('div');
  page.className = `cover-letter-page ${template.cssClass}`;

  const content = document.createElement('div');
  content.className = 'cover-letter-content';

  try {
    const letterData = data ?? parseCoverLetterYaml(yamlText);
    content.innerHTML = renderCoverLetter(letterData);
  } catch {
    content.innerHTML = '<p class="cl-error">Preview unavailable</p>';
  }

  page.appendChild(content);
  viewport.appendChild(page);
  wrapper.appendChild(viewport);
  return wrapper;
}

export function mountCoverLetterPreview(container, options) {
  container.replaceChildren(createCoverLetterPreviewElement(options));
}
