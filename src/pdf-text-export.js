import { jsPDF } from 'jspdf';
import { getPdfStyle } from './templates/index.js';
import { sortExperienceChronologically } from './experience-sort.js';
import { contactDisplayParts, shouldIncludeLinkedIn } from './contact-display.js';
import {
  DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
  DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
} from './application-storage.js';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = { top: 40, left: 44, right: 44, bottom: 40 };
const COVER_LETTER_CLASSIC_MARGIN = { left: 56, right: 56 };

function resolveFont(pdfStyle) {
  return pdfStyle?.font === 'helvetica' ? 'helvetica' : 'times';
}

function formatContactParts(contact, exportContext = {}) {
  return contactDisplayParts(contact, shouldIncludeLinkedIn(exportContext));
}

function formatRoleNumberLine(roleNumber) {
  const value = String(roleNumber || '').trim();
  if (!value) return '';
  if (/^(?:requisition|req\.?|job\s*id|role)\b/i.test(value)) return value;
  return `Requisition #${value}`;
}

function stripGenericAddresseeSuffix(text) {
  return String(text || '')
    .replace(/\s+(?:Hiring|Recruiting)\s+(?:Team|Manager)\s*$/i, '')
    .trim();
}

function formatDateRange(start, end) {
  return [start, end].filter(Boolean).join(' – ');
}

function formatCoverLetterDate(dateValue) {
  if (!dateValue || dateValue === 'auto') {
    return new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  return String(dateValue).trim();
}

function parseSkillLine(skill) {
  const text = String(skill).trim();
  const match = text.match(/^([^:]+):\s*(.+)$/);
  if (!match) return { label: null, content: text };
  return { label: match[1].trim(), content: match[2].trim() };
}

function normalizeFlowText(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

class TextPdfWriter {
  constructor(doc, options = {}) {
    this.doc = doc;
    this.font = options.font || 'times';
    this.style = options.style || {};
    this.compact = Boolean(options.compact);
    this.onePageOnly = Boolean(options.onePageOnly);
    this.overflowed = false;
    this.bodySize = options.bodySize ?? (this.compact ? 9 : 10.5);
    this.metaSize = this.compact ? 9 : 9.5;
    this.sectionSize = this.compact ? 10 : 11;
    this.lineHeightMultiplier = options.lineHeightMultiplier ?? (this.compact ? 1.25 : 1.32);
    const marginLeft = options.marginLeft ?? MARGIN.left;
    const marginRight = options.marginRight ?? MARGIN.right;
    this.x = marginLeft;
    this.y = MARGIN.top;
    this.maxWidth = PAGE_WIDTH - marginLeft - marginRight;
    this.nameColor = [34, 34, 34];
    this.textColor = [51, 51, 51];
    this.mutedColor = [85, 85, 85];
    this.ruleColor = [140, 140, 140];
    this.accent = options.style?.accent || null;
    this.lastTextBaselineY = null;
    this.lastTextLineHeight = this.lineHeightFor(this.bodySize);
  }

  setColor(rgb) {
    this.doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  }

  setStyle(style, size) {
    this.doc.setFont(this.font, style);
    this.doc.setFontSize(size);
    this.setColor(this.textColor);
  }

  ensureSpace(height) {
    if (this.y + height <= PAGE_HEIGHT - MARGIN.bottom) return true;
    if (this.onePageOnly) {
      this.overflowed = true;
      return false;
    }
    this.doc.addPage();
    this.y = MARGIN.top;
    return true;
  }

  gap(amount = 6) {
    this.y += amount;
  }

  lineHeightFor(size = this.bodySize, multiplier = this.lineHeightMultiplier) {
    return size * multiplier;
  }

  drawLine(x1, y1, x2, y2, width = 0.75, color = this.textColor) {
    this.doc.setDrawColor(color[0], color[1], color[2]);
    this.doc.setLineWidth(width);
    this.doc.line(x1, y1, x2, y2);
  }

  drawHorizontalRule({
    beforeGap = 0,
    clearance = 2,
    afterGap = 0,
    width = 0.75,
    color = this.textColor,
  } = {}) {
    if (this.overflowed) return;
    const required = beforeGap + clearance + afterGap;
    if (!this.ensureSpace(required)) return;
    this.y += beforeGap;
    const ruleY = this.y + clearance;
    this.drawLine(this.x, ruleY, this.x + this.maxWidth, ruleY, width, color);
    this.y = ruleY + afterGap;
  }

  drawRuleBelowBaseline({
    baselineY,
    lineHeight = this.lineHeightFor(this.bodySize),
    descenderRatio = 0.24,
    padding = 3,
    afterGap = 0,
    width = 0.75,
    color = this.textColor,
  } = {}) {
    if (this.overflowed) return;
    const safeBaseline =
      Number.isFinite(baselineY) ? baselineY : Number.isFinite(this.lastTextBaselineY) ? this.lastTextBaselineY : this.y;
    const descenderClearance = Math.max(2, lineHeight * descenderRatio);
    const ruleY = safeBaseline + descenderClearance + padding;
    const nextY = ruleY + afterGap;
    const travel = Math.max(0, nextY - this.y);
    if (!this.ensureSpace(travel)) return;
    this.drawLine(this.x, ruleY, this.x + this.maxWidth, ruleY, width, color);
    this.y = Math.max(this.y, nextY);
  }

  rememberLastTextLine(baselineY, lineHeight) {
    this.lastTextBaselineY = baselineY;
    this.lastTextLineHeight = lineHeight;
  }

  centeredX(text) {
    return (PAGE_WIDTH - this.doc.getTextWidth(String(text))) / 2;
  }

  writeCentered(text, { style = 'bold', size = 18, color, font } = {}) {
    if (!text || this.overflowed) return;
    const useFont = font || this.font;
    this.doc.setFont(useFont, style);
    this.doc.setFontSize(size);
    if (color) this.setColor(color);
    else this.setColor(this.textColor);
    const lineHeight = this.lineHeightFor(size);
    if (!this.ensureSpace(lineHeight + 4)) return;
    const baselineY = this.y;
    this.doc.text(String(text), this.centeredX(text), baselineY);
    this.rememberLastTextLine(baselineY, lineHeight);
    this.y += lineHeight;
    this.setColor(this.textColor);
  }

  writeLeft(text, { style = 'bold', size = 18, color } = {}) {
    if (!text || this.overflowed) return;
    this.setStyle(style, size);
    if (color) this.setColor(color);
    if (!this.ensureSpace(this.lineHeightFor(size) + 4)) return;
    const baselineY = this.y;
    this.doc.text(String(text), this.x, baselineY);
    this.rememberLastTextLine(baselineY, this.lineHeightFor(size));
    this.y += this.lineHeightFor(size);
    this.setColor(this.textColor);
  }

  writeWrapped(text, { style = 'normal', size = this.bodySize, indent = 0, align, color, lineHeightMultiplier } = {}) {
    if (!text || this.overflowed) return;
    this.setStyle(style, size);
    if (color) this.setColor(color);
    const width = this.maxWidth - indent;
    const lines = this.doc.splitTextToSize(normalizeFlowText(text), width);
    const multiplier = lineHeightMultiplier ?? this.lineHeightMultiplier;
    const lineHeight = size * multiplier;
    if (!this.ensureSpace(lines.length * lineHeight)) return;
    const startY = this.y;
    if (align === 'center') {
      for (let i = 0; i < lines.length; i++) {
        const baselineY = startY + i * lineHeight;
        this.doc.text(lines[i], this.centeredX(lines[i]), baselineY);
      }
    } else if (align === 'right') {
      for (let i = 0; i < lines.length; i++) {
        const baselineY = startY + i * lineHeight;
        const textWidth = this.doc.getTextWidth(lines[i]);
        this.doc.text(lines[i], this.x + this.maxWidth - textWidth, baselineY);
      }
    } else {
      for (let i = 0; i < lines.length; i++) {
        const baselineY = startY + i * lineHeight;
        this.doc.text(lines[i], this.x + indent, baselineY);
      }
    }
    this.rememberLastTextLine(startY + (lines.length - 1) * lineHeight, lineHeight);
    this.y += lines.length * lineHeight;
    this.setColor(this.textColor);
  }

  writeLine(text, options = {}) {
    if (!text) return;
    this.writeWrapped(text, { ...options, size: options.size ?? this.bodySize });
  }

  writeSectionTitle(title) {
    if (this.overflowed) return;
    const sectionStyle = this.style.sectionStyle || 'underline';
    const label = this.formatSectionLabel(title, sectionStyle);
    this.gap(sectionStyle === 'spaced' ? (this.compact ? 7 : 10) : this.compact ? 6 : 8);

    if (sectionStyle === 'section-border' || this.style.accentTarget === 'section-border') {
      this.drawAccentBar();
    }

    this.setStyle('bold', this.sectionSize);
    if (this.shouldAccentSection()) this.setColor(this.accent);

    const sectionLineHeight = this.lineHeightFor(this.sectionSize);
    if (!this.ensureSpace(sectionLineHeight + 6)) return;
    const headingBaselineY = this.y;
    this.doc.text(label, this.x, headingBaselineY);
    this.rememberLastTextLine(headingBaselineY, sectionLineHeight);
    this.y += sectionLineHeight;

    this.drawSectionRule(sectionStyle, headingBaselineY, sectionLineHeight);
    this.setColor(this.textColor);
  }

  formatSectionLabel(title, sectionStyle) {
    const raw = String(title).trim();
    if (sectionStyle === 'title-case') {
      return raw.replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (sectionStyle === 'small-caps') {
      return raw.toUpperCase();
    }
    if (sectionStyle === 'caps-only') {
      return raw.toUpperCase();
    }
    return raw.toUpperCase();
  }

  shouldAccentSection() {
    const target = this.style.accentTarget;
    return this.accent && (target === 'section' || target === 'name-and-section' || target === 'name-and-border');
  }

  drawAccentBar() {
    if (!this.accent) return;
    this.drawLine(this.x - 8, this.y - 2, this.x - 3, this.y + 10, 2.5, this.accent);
  }

  sectionRuleWidth() {
    return this.compact ? 1.25 : 1.75;
  }

  sectionRuleBottomY(headingBaselineY, sectionLineHeight, padding = this.compact ? 2 : 3) {
    const descenderClearance = Math.max(2, sectionLineHeight * 0.22);
    return headingBaselineY + descenderClearance + padding;
  }

  bodyLeadInBelowSectionRule(sectionStyle) {
    // Rule-to-body baseline distance; must exceed body cap height (~7pt compact / ~8pt full)
    // so the first line does not sit on the rule. Spaced headers get a bit more air.
    if (sectionStyle === 'spaced') {
      return this.compact ? 13 : 15;
    }
    return this.compact ? 11 : 13;
  }

  ensureBodyBelowSectionRule(ruleBottomY, sectionStyle) {
    const minY = ruleBottomY + this.bodyLeadInBelowSectionRule(sectionStyle);
    this.y = Math.max(this.y, minY);
  }

  drawSectionRule(sectionStyle, headingBaselineY, sectionLineHeight) {
    if (sectionStyle === 'caps-only') return;

    const ruleColor = this.shouldAccentSection() ? this.accent : this.ruleColor;
    const padding = this.compact ? 2 : 3;
    const afterGap =
      (sectionStyle === 'spaced' ? (this.compact ? 3 : 5) : this.compact ? 2 : 3) + 4;
    const ruleWidth = this.sectionRuleWidth();
    const ruleBottomY = this.sectionRuleBottomY(headingBaselineY, sectionLineHeight, padding);

    if (sectionStyle === 'double') {
      const ruleY1 = ruleBottomY;
      const ruleY2 = ruleY1 + 2.5;
      const nextY = ruleY2 + afterGap;
      if (!this.ensureSpace(Math.max(0, nextY - this.y))) return;
      this.drawLine(this.x, ruleY1, this.x + this.maxWidth, ruleY1, ruleWidth, ruleColor);
      this.drawLine(this.x, ruleY2, this.x + this.maxWidth, ruleY2, ruleWidth * 0.7, ruleColor);
      this.y = Math.max(this.y, nextY);
      this.ensureBodyBelowSectionRule(ruleY2, sectionStyle);
      return;
    }

    if (sectionStyle === 'dotted') {
      this.doc.setLineDashPattern([1.5, 2], 0);
      this.drawRuleBelowBaseline({
        baselineY: headingBaselineY,
        lineHeight: sectionLineHeight,
        descenderRatio: 0.22,
        padding,
        afterGap,
        width: ruleWidth,
        color: ruleColor,
      });
      this.doc.setLineDashPattern([], 0);
      this.ensureBodyBelowSectionRule(ruleBottomY, sectionStyle);
      return;
    }

    this.drawRuleBelowBaseline({
      baselineY: headingBaselineY,
      lineHeight: sectionLineHeight,
      descenderRatio: 0.22,
      padding,
      afterGap,
      width: ruleWidth,
      color: ruleColor,
    });
    this.ensureBodyBelowSectionRule(ruleBottomY, sectionStyle);
  }

  writeBullet(text) {
    if (!text || this.overflowed) return;
    const bulletChar = this.bulletChar();
    const bullet = `${bulletChar} `;
    this.setStyle('normal', this.bodySize);
    const lines = this.doc.splitTextToSize(bullet + String(text).trim(), this.maxWidth - 14);
    const bulletLineHeight = this.lineHeightFor(this.bodySize);
    if (!this.ensureSpace(lines.length * bulletLineHeight)) return;
    this.doc.text(lines, this.x + 14, this.y);
    this.y += lines.length * bulletLineHeight;
  }

  bulletChar() {
    if (this.style.bullet === 'square') return '▪';
    if (this.style.bullet === 'circle') return '○';
    if (this.style.bullet === 'dash') return '–';
    return '•';
  }

  writeSkillLine(skill) {
    if (this.overflowed) return;
    const { label, content } = parseSkillLine(skill);
    if (!label) {
      this.writeLine(content);
      this.gap(this.compact ? 2 : 3);
      return;
    }

    const lineHeight = this.lineHeightFor(this.bodySize);
    this.setStyle('bold', this.bodySize);
    const labelText = `${label}: `;
    const labelWidth = this.doc.getTextWidth(labelText);
    this.setStyle('normal', this.bodySize);
    const lines = this.doc.splitTextToSize(content, this.maxWidth - labelWidth);
    if (!this.ensureSpace(lineHeight)) return;
    this.setStyle('bold', this.bodySize);
    this.doc.text(labelText, this.x, this.y);
    this.setStyle('normal', this.bodySize);
    this.doc.text(lines[0], this.x + labelWidth, this.y);
    this.y += lineHeight;
    for (let i = 1; i < lines.length; i++) {
      if (!this.ensureSpace(lineHeight)) return;
      this.doc.text(lines[i], this.x + 14, this.y);
      this.y += lineHeight;
    }
    this.gap(this.compact ? 2 : 4);
  }
}

function writeHeader(writer, data, pdfStyle, exportContext = {}) {
  const nameSize = pdfStyle.nameSize || 18;
  const alignLeft = pdfStyle.headerAlign === 'left';
  const accent = pdfStyle.accent || null;
  const nameColor =
    accent && (pdfStyle.accentTarget === 'name-and-section' || pdfStyle.accentTarget === 'name-and-border')
      ? accent
      : writer.nameColor;

  if (alignLeft) {
    writer.writeLeft(data.name || 'Your Name', { size: nameSize, color: nameColor });
  } else {
    writer.writeCentered(data.name || 'Your Name', { size: nameSize, color: nameColor });
  }

  writer.gap(writer.compact ? -4 : -5);

  if (accent && pdfStyle.accentTarget === 'name-line') {
    const lineY = writer.y + 2;
    const lineW = Math.min(120, writer.maxWidth * 0.35);
    const lineX = alignLeft ? writer.x : PAGE_WIDTH / 2 - lineW / 2;
    writer.drawLine(lineX, lineY, lineX + lineW, lineY, 1.25, accent);
    writer.gap(4);
  }

  const contactParts = formatContactParts(data.contact, exportContext);
  if (contactParts.length) {
    writer.writeLine(contactParts.join(' · '), {
      size: writer.metaSize,
      align: alignLeft ? undefined : 'center',
      color: writer.mutedColor,
    });
  }
  writer.gap(writer.compact ? 4 : 6);
}

function cloneResumeData(data) {
  return JSON.parse(JSON.stringify(data));
}

function shortenSummary(data, maxLen) {
  if (!data.summary || data.summary.length <= maxLen) return;
  data.summary = `${data.summary.slice(0, maxLen - 1).replace(/\s+\S*$/, '').trim()}.`;
}

function capBulletsPerJob(experience, maxBullets) {
  if (!Array.isArray(experience)) return;
  for (const job of experience) {
    if (Array.isArray(job.bullets) && job.bullets.length > maxBullets) {
      job.bullets = job.bullets.slice(0, maxBullets);
    }
  }
}

/** Remove the chronologically oldest experience entries (end of reverse-chrono order). */
function dropOldestExperienceEntries(experience, count = 1) {
  if (!Array.isArray(experience) || count <= 0) return experience;
  const sorted = sortExperienceChronologically(experience);
  const toDrop = new Set(sorted.slice(-count));
  return experience.filter((job) => !toDrop.has(job));
}

function trimSkillsList(skills, maxLines) {
  if (!Array.isArray(skills) || skills.length <= maxLines) return skills;
  return skills.slice(0, maxLines);
}

/** One incremental trim action per step — oldest experience entries drop first when jobs must be removed. */
const ONE_PAGE_TRIM_STEPS = [
  (data) => shortenSummary(data, 380),
  (data) => capBulletsPerJob(data.experience, 4),
  (data) => shortenSummary(data, 340),
  (data) => capBulletsPerJob(data.experience, 3),
  (data) => shortenSummary(data, 300),
  (data) => capBulletsPerJob(data.experience, 2),
  (data) => {
    data.experience = dropOldestExperienceEntries(data.experience, 1);
  },
  (data) => {
    data.experience = dropOldestExperienceEntries(data.experience, 1);
  },
  (data) => capBulletsPerJob(data.experience, 1),
  (data) => {
    data.skills = trimSkillsList(data.skills, 5);
  },
  (data) => {
    data.experience = dropOldestExperienceEntries(data.experience, 1);
  },
  (data) => {
    data.skills = trimSkillsList(data.skills, 4);
  },
  (data) => {
    data.experience = dropOldestExperienceEntries(data.experience, 1);
  },
];

function applyOnePageTrimSteps(data, stepCount) {
  const next = cloneResumeData(data);
  const limit = Math.min(stepCount, ONE_PAGE_TRIM_STEPS.length);
  for (let i = 0; i < limit; i++) ONE_PAGE_TRIM_STEPS[i](next);
  return next;
}

/** @deprecated Use applyOnePageTrimSteps — kept for tests referencing trim level semantics. */
function trimResumeForOnePage(data, level = 1) {
  const legacyStepMap = [0, 4, 7, 9, 12];
  const stepCount = legacyStepMap[Math.min(level, legacyStepMap.length - 1)] ?? 12;
  return applyOnePageTrimSteps(data, stepCount);
}

function renderResumeContent(writer, data, pdfStyle, exportContext = {}) {
  writer.overflowed = false;
  writeHeader(writer, data, pdfStyle, exportContext);

  if (data.summary) {
    writer.writeSectionTitle('Summary');
    writer.writeLine(data.summary);
    writer.gap(2);
  }

  const experience = sortExperienceChronologically(data.experience);
  if (Array.isArray(experience) && experience.length) {
    writer.writeSectionTitle('Experience');
    for (const job of experience) {
      if (writer.overflowed) break;
      writer.writeLine(job.title || '', { style: 'bold' });
      const meta = [job.company, job.location, formatDateRange(job.start, job.end)]
        .filter(Boolean)
        .join(' · ');
      if (meta) {
        writer.writeLine(meta, { style: 'italic', size: writer.metaSize, color: writer.mutedColor });
      }
      if (Array.isArray(job.bullets)) {
        for (const bullet of job.bullets) {
          if (writer.overflowed) break;
          writer.writeBullet(bullet);
        }
      }
      writer.gap(writer.compact ? 3 : 5);
    }
  }

  if (!writer.overflowed && Array.isArray(data.projects) && data.projects.length) {
    writer.writeSectionTitle('Projects');
    for (const project of data.projects) {
      if (writer.overflowed) break;
      writer.writeLine(project.title || '', { style: 'bold' });
      const meta = [project.company, project.location, formatDateRange(project.start, project.end)]
        .filter(Boolean)
        .join(' · ');
      if (meta) {
        writer.writeLine(meta, { style: 'italic', size: writer.metaSize, color: writer.mutedColor });
      }
      if (Array.isArray(project.bullets)) {
        for (const bullet of project.bullets) {
          if (writer.overflowed) break;
          writer.writeBullet(bullet);
        }
      }
      writer.gap(writer.compact ? 3 : 5);
    }
  }

  if (!writer.overflowed && Array.isArray(data.education) && data.education.length) {
    writer.writeSectionTitle('Education');
    for (const edu of data.education) {
      if (writer.overflowed) break;
      writer.writeLine(edu.degree || '', { style: 'bold' });
      const meta = [edu.school, edu.location, edu.year].filter(Boolean).join(' · ');
      if (meta) {
        writer.writeLine(meta, { style: 'italic', size: writer.metaSize, color: writer.mutedColor });
      }
      if (edu.details) {
        writer.writeLine(edu.details, { size: writer.metaSize });
      }
      writer.gap(writer.compact ? 3 : 5);
    }
  }

  if (!writer.overflowed && Array.isArray(data.skills) && data.skills.length) {
    writer.writeSectionTitle('Skills');
    for (const skill of data.skills) {
      if (writer.overflowed) break;
      writer.writeSkillLine(skill);
    }
  }

  return !writer.overflowed;
}

function buildResumePdfAttempt(data, templateId, { compact = false, onePageOnly = false, exportContext = {} } = {}) {
  const pdfStyle = getPdfStyle(templateId);
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const writer = new TextPdfWriter(doc, {
    font: resolveFont(pdfStyle),
    compact: compact || Boolean(pdfStyle.compact),
    onePageOnly,
    style: pdfStyle,
  });
  const fits = renderResumeContent(writer, data, pdfStyle, exportContext);
  return { doc, fits: onePageOnly ? fits : true };
}

export function buildResumePdf(data, templateId = 'classic', exportContext = {}) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid resume data.');
  }

  const pdfStyle = getPdfStyle(templateId);
  let compact = Boolean(pdfStyle.compact);
  let trimSteps = 0;

  for (let attempt = 0; attempt < ONE_PAGE_TRIM_STEPS.length + 2; attempt++) {
    const workingData = trimSteps === 0 ? cloneResumeData(data) : applyOnePageTrimSteps(data, trimSteps);
    const { doc, fits } = buildResumePdfAttempt(workingData, templateId, {
      compact,
      onePageOnly: true,
      exportContext,
    });
    if (fits) return doc;

    if (!compact) {
      compact = true;
      continue;
    }
    trimSteps += 1;
  }

  const fallbackData = applyOnePageTrimSteps(data, ONE_PAGE_TRIM_STEPS.length);
  return buildResumePdfAttempt(fallbackData, templateId, {
    compact: true,
    onePageOnly: false,
    exportContext,
  }).doc;
}

export function buildCoverLetterPdf(
  data,
  templateId = DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
  exportContext = {}
) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid cover letter data.');
  }

  const pdfStyle = getPdfStyle(templateId);
  const isClassicTemplate = String(templateId || '').toLowerCase() === 'classic';
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
  const writer = new TextPdfWriter(doc, {
    font: resolveFont(pdfStyle),
    style: pdfStyle,
    marginLeft: isClassicTemplate ? COVER_LETTER_CLASSIC_MARGIN.left : MARGIN.left,
    marginRight: isClassicTemplate ? COVER_LETTER_CLASSIC_MARGIN.right : MARGIN.right,
    bodySize: isClassicTemplate ? 12.5 : undefined,
  });

  const accent = pdfStyle.accent || [68, 68, 68];
  const classicSignatureGrey = [51, 51, 51];
  const classicNameGrey = [74, 74, 74];
  const classicRuleColor = [184, 184, 184];
  const classicNameSize = 23;
  const classicContactToRulePadding = 11;
  const classicRuleToDateGap = 46;
  const classicNameToContactGap = 18;
  const classicBodyLineHeight = 1.5;
  const classicSignatureBeforeGap = 28;
  const classicRecipientToSalutationGap = 30;
  const classicHeaderRuleWidth = 0.75;
  const dateSize = isClassicTemplate ? 12 : writer.metaSize;
  const contactSize = isClassicTemplate ? 11.25 : 9.5;
  const classicTextOpts = isClassicTemplate
    ? { size: 12.5, lineHeightMultiplier: classicBodyLineHeight }
    : {};

  writer.writeCentered(data.name || 'Your Name', {
    style: 'bold',
    size: isClassicTemplate ? classicNameSize : 14,
    font: isClassicTemplate ? 'helvetica' : undefined,
    color: isClassicTemplate ? classicNameGrey : writer.nameColor,
  });
  if (isClassicTemplate && writer.lastTextBaselineY != null) {
    writer.y = writer.lastTextBaselineY + classicNameToContactGap;
  } else {
    writer.gap(-4);
  }
  const contactParts = formatContactParts(data.contact, exportContext);
  if (contactParts.length) {
    writer.writeLine(contactParts.join(' · '), {
      size: contactSize,
      align: 'center',
      color: writer.mutedColor,
      lineHeightMultiplier: isClassicTemplate ? 1.32 : undefined,
    });
  }
  const headerDividerBaseline = writer.lastTextBaselineY ?? writer.y;
  writer.drawRuleBelowBaseline({
    baselineY: headerDividerBaseline,
    lineHeight: writer.lineHeightFor(contactSize, 1.32),
    descenderRatio: 0.26,
    padding: isClassicTemplate ? classicContactToRulePadding : 3,
    afterGap: isClassicTemplate ? classicRuleToDateGap : 14,
    width: isClassicTemplate ? classicHeaderRuleWidth : 1.5,
    color: isClassicTemplate ? classicRuleColor : writer.ruleColor,
  });

  writer.writeLine(formatCoverLetterDate(data.date), {
    size: dateSize,
    style: 'normal',
    align: 'right',
    color: writer.mutedColor,
    lineHeightMultiplier: isClassicTemplate ? 1.32 : undefined,
  });
  writer.gap(isClassicTemplate ? 11 : 8);

  const recipient = data.recipient || {};
  const recipientCompany = stripGenericAddresseeSuffix(recipient.company);
  if (isClassicTemplate) {
    if (recipientCompany) writer.writeLine(recipientCompany, classicTextOpts);
    const roleNumberLine = formatRoleNumberLine(recipient.role_number);
    if (roleNumberLine) writer.writeLine(roleNumberLine, classicTextOpts);
  } else {
    if (recipientCompany) writer.writeLine(recipientCompany);
    const roleNumberLine = formatRoleNumberLine(recipient.role_number);
    if (roleNumberLine) writer.writeLine(roleNumberLine);
    const recipientDividerBaseline = writer.lastTextBaselineY ?? writer.y;
    writer.drawRuleBelowBaseline({
      baselineY: recipientDividerBaseline,
      lineHeight: writer.lastTextLineHeight || writer.lineHeightFor(writer.bodySize),
      descenderRatio: 0.28,
      padding: 4,
      afterGap: 18,
      width: 1.75,
      color: accent,
    });
  }

  if (isClassicTemplate) writer.gap(classicRecipientToSalutationGap);

  if (data.salutation) {
    writer.writeLine(String(data.salutation).trim(), classicTextOpts);
    writer.gap(isClassicTemplate ? 8 : 6);
  }

  if (data.body) {
    const paragraphs = String(data.body).trim().split(/\n\s*\n/).filter((p) => p.trim());
    for (const paragraph of paragraphs) {
      writer.writeWrapped(paragraph.trim(), classicTextOpts);
      writer.gap(isClassicTemplate ? 8 : 6);
    }
  }

  writer.gap(isClassicTemplate ? 6 : 3);
  writer.writeLine(data.closing ? String(data.closing).trim() : 'Sincerely,', {
    style: isClassicTemplate ? 'normal' : 'italic',
    ...classicTextOpts,
  });
  writer.gap(isClassicTemplate ? classicSignatureBeforeGap : 14);

  const signatureName = data.signature_name || data.name || 'Your Name';
  const signatureColor = isClassicTemplate ? classicSignatureGrey : [62, 62, 62];
  const signatureSize = isClassicTemplate ? 12.5 : 14;
  const lineHeight = writer.lineHeightFor(signatureSize);
  if (writer.ensureSpace(lineHeight)) {
    if (isClassicTemplate) {
      writer.writeLeft(signatureName, {
        style: 'normal',
        size: signatureSize,
        color: signatureColor,
      });
    } else {
      const signatureFont = resolveFont(pdfStyle) === 'times' ? 'times' : 'helvetica';
      const signatureStyle = signatureFont === 'times' ? 'italic' : 'bolditalic';
      writer.doc.setFont(signatureFont, signatureStyle);
      writer.doc.setFontSize(signatureSize);
      writer.setColor(signatureColor);
      if (typeof writer.doc.setCharSpace === 'function') writer.doc.setCharSpace(0.35);
      writer.doc.text(String(signatureName), writer.x, writer.y);
      if (typeof writer.doc.setCharSpace === 'function') writer.doc.setCharSpace(0);
      writer.y += lineHeight;
      writer.setColor(writer.textColor);
    }
  }

  return doc;
}

export function countResumePdfPages(data, templateId = 'classic') {
  const doc = buildResumePdf(data, templateId);
  return doc.getNumberOfPages();
}

export function savePdf(doc, filename) {
  doc.save(filename);
}

export function downloadResumePdfFromData(
  data,
  templateId = DEFAULT_APPLICATION_RESUME_TEMPLATE_ID,
  filename = 'Resume_Position.pdf',
  exportContext = {}
) {
  const resolvedId = templateId || DEFAULT_APPLICATION_RESUME_TEMPLATE_ID;
  const doc = buildResumePdf(data, resolvedId, exportContext);
  savePdf(doc, filename);
}

export function downloadCoverLetterPdfFromData(
  data,
  templateId = DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID,
  _senderName,
  filename,
  exportContext = {}
) {
  const resolvedId = templateId || DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID;
  const doc = buildCoverLetterPdf(data, resolvedId, exportContext);
  savePdf(doc, filename || 'Cover_Letter_Company.pdf');
}

/** Extract plain text from resume data in logical reading order (for validation). */
export function resumeDataToPlainText(data) {
  const lines = [];
  if (data.name) lines.push(data.name);
  const contact = formatContactParts(data.contact);
  if (contact.length) lines.push(contact.join(' · '));
  if (data.summary) {
    lines.push('');
    lines.push('SUMMARY');
    lines.push(String(data.summary).trim());
  }
  if (Array.isArray(data.experience)) {
    lines.push('');
    lines.push('EXPERIENCE');
    for (const job of sortExperienceChronologically(data.experience)) {
      lines.push(job.title || '');
      lines.push([job.company, job.location, formatDateRange(job.start, job.end)].filter(Boolean).join(' · '));
      for (const bullet of job.bullets || []) lines.push(`• ${bullet}`);
    }
  }
  if (Array.isArray(data.education)) {
    lines.push('');
    lines.push('EDUCATION');
    for (const edu of data.education) {
      lines.push(edu.degree || '');
      lines.push([edu.school, edu.location, edu.year].filter(Boolean).join(' · '));
    }
  }
  if (Array.isArray(data.skills)) {
    lines.push('');
    lines.push('SKILLS');
    for (const skill of data.skills) lines.push(String(skill));
  }
  return lines.filter((line, i, arr) => line !== '' || (i > 0 && arr[i - 1] !== '')).join('\n');
}
