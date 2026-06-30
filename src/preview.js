import yaml from 'js-yaml';
import { renderResume } from './renderer.js';
import { getTemplateById } from './templates/index.js';

export const LETTER_WIDTH_PX = 816;
export const LETTER_HEIGHT_PX = 1056;

export function parseResumeYaml(yamlText) {
  return yaml.load(yamlText);
}

export function createPreviewElement({ yamlText, data, templateId, width = 200 }) {
  const scale = width / LETTER_WIDTH_PX;
  const height = width * (LETTER_HEIGHT_PX / LETTER_WIDTH_PX);
  const template = getTemplateById(templateId);

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
  page.className = `resume-page ${template.cssClass}`;

  const content = document.createElement('div');
  content.className = 'resume-content';

  try {
    const resumeData = data ?? parseResumeYaml(yamlText);
    content.innerHTML = renderResume(resumeData);
  } catch {
    content.innerHTML = '<p class="resume-error">Preview unavailable</p>';
  }

  page.appendChild(content);
  viewport.appendChild(page);
  wrapper.appendChild(viewport);
  return wrapper;
}

export function mountResumePreview(container, options) {
  container.replaceChildren(createPreviewElement(options));
}

export function mountAllPreviews(root, selector = '[data-preview-yaml]') {
  root.querySelectorAll(selector).forEach((el) => {
    const yamlText = el.dataset.previewYaml;
    const templateId = el.dataset.previewTemplate;
    if (!yamlText || !templateId) return;
    mountResumePreview(el, { yamlText, templateId, width: Number(el.dataset.previewWidth) || 200 });
  });
}
