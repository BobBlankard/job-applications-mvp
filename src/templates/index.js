import { buildStarterYaml } from './base-yaml.js';

const DEMO_YAML = buildStarterYaml('Jane Doe');

const TEMPLATE_DEFS = [
  // --- Classic family (standard spacing) ---
  {
    id: 'classic',
    name: 'Classic',
    category: 'classic',
    description: 'Times serif, centered header, solid underlined caps sections.',
    accentColor: null,
    cssClass: 'template-classic',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'underline' },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'classic',
    description: 'Light weight with generous whitespace and thin rules.',
    accentColor: null,
    cssClass: 'template-minimal',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'spaced' },
  },
  {
    id: 'traditional',
    name: 'Traditional',
    category: 'classic',
    description: 'Georgia serif with distinctive double-line dividers.',
    accentColor: null,
    cssClass: 'template-traditional',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'double' },
  },
  {
    id: 'clean',
    name: 'Clean',
    category: 'classic',
    description: 'Arial sans with title-case headers and stacked entries.',
    accentColor: null,
    cssClass: 'template-clean',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'title-case', entryStacked: true },
  },
  {
    id: 'standard',
    name: 'Standard',
    category: 'classic',
    description: 'Balanced Times layout suitable for most industries.',
    accentColor: null,
    cssClass: 'template-standard',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'underline' },
  },
  {
    id: 'formal',
    name: 'Formal',
    category: 'classic',
    description: 'Heavy weights, wide letter-spacing, authoritative feel.',
    accentColor: null,
    cssClass: 'template-formal',
    pdf: { font: 'times', nameSize: 19, sectionStyle: 'underline', formal: true },
  },
  {
    id: 'simple',
    name: 'Simple',
    category: 'classic',
    description: 'Bold ALL CAPS section titles, no underlines, circle bullets.',
    accentColor: null,
    cssClass: 'template-simple',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'caps-only', bullet: 'circle' },
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'classic',
    description: 'Prominent 20pt name with tight, authoritative sections.',
    accentColor: null,
    cssClass: 'template-executive',
    pdf: { font: 'times', nameSize: 20, sectionStyle: 'underline', compact: false },
  },
  {
    id: 'academic',
    name: 'Academic',
    category: 'classic',
    description: 'Left-aligned header with scholarly serif typography.',
    accentColor: null,
    cssClass: 'template-academic',
    pdf: { font: 'times', nameSize: 17, sectionStyle: 'underline', headerAlign: 'left' },
  },
  {
    id: 'professional',
    name: 'Professional',
    category: 'classic',
    description: 'Gray section labels on a subtle tinted background bar.',
    accentColor: null,
    cssClass: 'template-professional',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'underline', sectionGray: true },
  },
  {
    id: 'refined',
    name: 'Refined',
    category: 'classic',
    description: 'Elegant Georgia with small-caps section titles.',
    accentColor: null,
    cssClass: 'template-refined',
    pdf: { font: 'times', nameSize: 17, sectionStyle: 'small-caps' },
  },
  {
    id: 'straightforward',
    name: 'Straightforward',
    category: 'classic',
    description: 'No-nonsense Arial with square bullet markers.',
    accentColor: null,
    cssClass: 'template-straightforward',
    pdf: { font: 'helvetica', nameSize: 16, sectionStyle: 'underline', bullet: 'square' },
  },
  {
    id: 'timeless',
    name: 'Timeless',
    category: 'classic',
    description: 'Enduring serif style with dotted section rules.',
    accentColor: null,
    cssClass: 'template-timeless',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'dotted' },
  },
  {
    id: 'calibri-modern',
    name: 'Calibri Modern',
    category: 'classic',
    description: 'Calibri-style sans with en-dash bullets and left accent bar.',
    accentColor: null,
    cssClass: 'template-calibri-modern',
    pdf: { font: 'helvetica', nameSize: 18, sectionStyle: 'underline', bullet: 'dash' },
  },

  // --- Compact family (dense one-page) ---
  {
    id: 'compact-classic',
    name: 'Compact Classic',
    category: 'compact',
    description: '9pt Times, tight spacing — fits more on one page.',
    accentColor: null,
    cssClass: 'template-compact-classic',
    pdf: { font: 'times', nameSize: 16, sectionStyle: 'underline', compact: true },
  },
  {
    id: 'compact-minimal',
    name: 'Compact Minimal',
    category: 'compact',
    description: '9pt Arial, minimal gaps, understated headers.',
    accentColor: null,
    cssClass: 'template-compact-minimal',
    pdf: { font: 'helvetica', nameSize: 16, sectionStyle: 'spaced', compact: true },
  },
  {
    id: 'compact-professional',
    name: 'Compact Professional',
    category: 'compact',
    description: 'Dense Arial with gray caps headers.',
    accentColor: null,
    cssClass: 'template-compact-professional',
    pdf: { font: 'helvetica', nameSize: 16, sectionStyle: 'underline', compact: true, sectionGray: true },
  },
  {
    id: 'compact-navy',
    name: 'Compact Navy',
    category: 'compact',
    description: 'Tight Times layout with navy section titles.',
    accentColor: '#1a365d',
    cssClass: 'template-compact-navy',
    pdf: { font: 'times', nameSize: 16, sectionStyle: 'underline', compact: true, accent: [26, 54, 93], accentTarget: 'section' },
  },
  {
    id: 'compact-teal',
    name: 'Compact Teal',
    category: 'compact',
    description: 'Dense sans with teal name and section accents.',
    accentColor: '#2c7a7b',
    cssClass: 'template-compact-teal',
    pdf: { font: 'helvetica', nameSize: 16, sectionStyle: 'underline', compact: true, accent: [44, 122, 123], accentTarget: 'name-and-section' },
  },
  {
    id: 'compact-executive',
    name: 'Compact Executive',
    category: 'compact',
    description: 'Maximum density with bold 17pt name.',
    accentColor: null,
    cssClass: 'template-compact-executive',
    pdf: { font: 'times', nameSize: 17, sectionStyle: 'underline', compact: true },
  },

  // --- Accent family (colored highlights) ---
  {
    id: 'navy-accent',
    name: 'Navy Accent',
    category: 'accent',
    description: 'Navy section headers with matching underline rules.',
    accentColor: '#1a365d',
    cssClass: 'template-navy-accent',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'underline', accent: [26, 54, 93], accentTarget: 'section' },
  },
  {
    id: 'teal-professional',
    name: 'Teal Professional',
    category: 'accent',
    description: 'Teal name and header rules for a polished look.',
    accentColor: '#2c7a7b',
    cssClass: 'template-teal-professional',
    pdf: { font: 'helvetica', nameSize: 18, sectionStyle: 'underline', accent: [44, 122, 123], accentTarget: 'name-and-section' },
  },
  {
    id: 'charcoal-modern',
    name: 'Charcoal Modern',
    category: 'accent',
    description: 'Left charcoal border accent on each section.',
    accentColor: '#2d3748',
    cssClass: 'template-charcoal-modern',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'underline', accent: [45, 55, 72], accentTarget: 'section-border' },
  },
  {
    id: 'burgundy-classic',
    name: 'Burgundy Classic',
    category: 'accent',
    description: 'Burgundy accent line beneath the name.',
    accentColor: '#742a2a',
    cssClass: 'template-burgundy-classic',
    pdf: { font: 'times', nameSize: 18, sectionStyle: 'underline', accent: [116, 42, 42], accentTarget: 'name-line' },
  },
  {
    id: 'forest-executive',
    name: 'Forest Executive',
    category: 'accent',
    description: 'Forest green thick underlines on section headers.',
    accentColor: '#276749',
    cssClass: 'template-forest-executive',
    pdf: { font: 'times', nameSize: 19, sectionStyle: 'underline', accent: [39, 103, 73], accentTarget: 'section-border' },
  },
  {
    id: 'slate-professional',
    name: 'Slate Professional',
    category: 'accent',
    description: 'Slate blue titles with light gray section rules.',
    accentColor: '#4a5568',
    cssClass: 'template-slate-professional',
    pdf: { font: 'helvetica', nameSize: 17, sectionStyle: 'underline', accent: [74, 85, 104], accentTarget: 'section' },
  },
  {
    id: 'indigo-accent',
    name: 'Indigo Accent',
    category: 'accent',
    description: 'Indigo name with left-border section accents.',
    accentColor: '#434190',
    cssClass: 'template-indigo-accent',
    pdf: { font: 'helvetica', nameSize: 18, sectionStyle: 'underline', accent: [67, 65, 144], accentTarget: 'name-and-border' },
  },
];

const LEGACY_ALIASES = {
  compact: 'compact-classic',
};

export const TEMPLATES = TEMPLATE_DEFS.map((def) => ({
  ...def,
  defaultYaml: DEMO_YAML,
}));

export const TEMPLATE_CATEGORIES = [
  { id: 'classic', label: 'Classic' },
  { id: 'compact', label: 'Compact' },
  { id: 'accent', label: 'Accent' },
];

export const DEFAULT_TEMPLATE_ID = 'classic';

export function getTemplateById(id) {
  const resolvedId = LEGACY_ALIASES[id] || id;
  return TEMPLATES.find((t) => t.id === resolvedId) || TEMPLATES[0];
}

export function getPdfStyle(templateId) {
  return getTemplateById(templateId).pdf;
}

export function getTemplatesByCategory(categoryId) {
  return TEMPLATES.filter((t) => t.category === categoryId);
}
