import { DEFAULT_COVER_LETTER_YAML } from './default-yaml.js';

const TEMPLATE_DEFS = [
  {
    id: 'classic',
    name: 'Classic',
    category: 'standard',
    description: 'Times New Roman, traditional business letter with centered header.',
    cssClass: 'cl-template-classic',
  },
  {
    id: 'modern',
    name: 'Modern',
    category: 'standard',
    description: 'Clean sans-serif with bold hierarchy and subtle letter-spacing.',
    cssClass: 'cl-template-modern',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'standard',
    description: 'Simple, elegant layout with understated uppercase typography.',
    cssClass: 'cl-template-minimal',
  },
  {
    id: 'professional',
    name: 'Professional',
    category: 'standard',
    description: 'Slightly formal with a subtle accent bar and refined spacing.',
    cssClass: 'cl-template-professional',
  },
  {
    id: 'compact',
    name: 'Compact',
    category: 'standard',
    description: 'Tighter margins and line height to fit comfortably on one page.',
    cssClass: 'cl-template-compact',
  },
  {
    id: 'navy-accent',
    name: 'Navy Accent',
    category: 'standard',
    description: 'Professional layout with a navy header rule and accent details.',
    cssClass: 'cl-template-navy-accent',
  },
];

export const COVER_LETTER_TEMPLATES = TEMPLATE_DEFS.map((def) => ({
  ...def,
  defaultYaml: DEFAULT_COVER_LETTER_YAML,
}));

export const DEFAULT_COVER_LETTER_TEMPLATE_ID = 'classic';

export const COVER_LETTER_TEMPLATE_CATEGORIES = [
  { id: 'standard', label: 'Standard' },
];

export function getCoverLetterTemplateById(id) {
  return COVER_LETTER_TEMPLATES.find((t) => t.id === id) || COVER_LETTER_TEMPLATES[0];
}

export function renderCoverLetterTemplateSelectOptions(templates, categories, selectedId, escapeHtml) {
  return categories
    .map((cat) => {
      const items = templates.filter((t) => (t.category || 'standard') === cat.id);
      if (!items.length) return '';
      const options = items
        .map(
          (t) =>
            `<option value="${t.id}"${t.id === selectedId ? ' selected' : ''}>${escapeHtml(t.name)}</option>`
        )
        .join('');
      return `<optgroup label="${escapeHtml(cat.label)}">${options}</optgroup>`;
    })
    .join('');
}
