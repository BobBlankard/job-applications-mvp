import { DEFAULT_COVER_LETTER_YAML } from './default-yaml.js';

const TEMPLATE_DEFS = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Times New Roman, traditional business letter with centered header.',
    cssClass: 'cl-template-classic',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean sans-serif with bold hierarchy and subtle letter-spacing.',
    cssClass: 'cl-template-modern',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple, elegant layout with understated uppercase typography.',
    cssClass: 'cl-template-minimal',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Slightly formal with a subtle accent bar and refined spacing.',
    cssClass: 'cl-template-professional',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter margins and line height to fit comfortably on one page.',
    cssClass: 'cl-template-compact',
  },
  {
    id: 'navy-accent',
    name: 'Navy Accent',
    description: 'Professional layout with a navy header rule and accent details.',
    cssClass: 'cl-template-navy-accent',
  },
];

export const COVER_LETTER_TEMPLATES = TEMPLATE_DEFS.map((def) => ({
  ...def,
  defaultYaml: DEFAULT_COVER_LETTER_YAML,
}));

export const DEFAULT_COVER_LETTER_TEMPLATE_ID = 'classic';

export function getCoverLetterTemplateById(id) {
  return COVER_LETTER_TEMPLATES.find((t) => t.id === id) || COVER_LETTER_TEMPLATES[0];
}
