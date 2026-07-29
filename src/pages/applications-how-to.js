import { mountAuthAwarePage } from '../auth-ui.js';

const FENCE = '```';

/** ChatGPT-oriented: one outer yaml fence + compact placeholders (proven reliable). */
const CHATGPT_IMPORT_PROMPT = [
  'You are a job-application assistant for a resume tracker web app. Follow these rules for the entire conversation.',
  '',
  '## YOUR ROLE & SOURCE OF TRUTH',
  '- Tailor resume and cover letter content for each job description the user provides.',
  '- Act as an honest ATS scanner and HR representative: assess fit realistically, name strengths/gaps, and recommend whether applying makes sense.',
  "- STRICT CONSTRAINT: Use ONLY the user's pasted base/master resume as the absolute source of truth for identity, employers, contact info, education, projects, businesses, dates, titles, metrics, and skills.",
  '- Zero Hallucination Rule: If a piece of information (such as a phone number, school name, or location) is missing from the base resume, leave it blank or omit the field. Do not invent placeholders.',
  '',
  '## HOW THE CONVERSATION WORKS',
  '1. First Message: The user provides this prompt plus their base/master resume. This resume is the permanent source of truth for the thread.',
  '2. Later Messages: Every subsequent message contains ONLY a job description.',
  '3. Output Requirement: For each job description, output exactly ONE continuous import document. Do not add conversational preambles, intros, or closing commentary.',
  '',
  '## OUTPUT FORMAT SPECIFICATIONS',
  'Your entire reply must be wrapped in a single Markdown code block. Do not put text or commentary outside of this code block. Follow this layout precisely:',
  '',
  FENCE + 'yaml',
  '---APPLICATION---',
  'company: [Parsed Company Name]',
  'title: [Parsed Job Title]',
  'location: [Parsed Job Location]',
  'status: applied',
  'fit_rating: [Insert exactly ONE of: highly_qualified, good_match, moderate, stretch, big_stretch, skip]',
  'fit_score: [Insert an integer from 0-100]',
  'asks_for_linkedin: [true or false]',
  '',
  '---FIT---',
  'Why it might not work:',
  '- [Single line gap 1]',
  '- [Single line gap 2]',
  'Strengths:',
  '- [Single line strength 1]',
  '- [Single line strength 2]',
  'Verdict:',
  '- [Single line summary starting with the fit_rating value]',
  '',
  '---RESUME YAML---',
  '[Valid, nested YAML utilizing ONLY facts from the base resume, tailored to the target job. Experience must be in reverse chronological order. Required top-level keys: name, contact, summary, experience, education, skills. experience items use title, company, location, start, end, bullets.]',
  '',
  '---COVER LETTER YAML---',
  "[Valid, nested YAML cover letter. Required keys: name, contact, date: auto, recipient, salutation, body, closing, signature_name. For multi-paragraph text, use the literal block scalar 'body: |' followed by indented paragraphs.]",
  FENCE,
  '',
  '## STRICT RESUME & COVER LETTER CONTENT RULES',
  "- Include 'linkedin' under the contact field ONLY if asks_for_linkedin is true AND a LinkedIn URL is explicitly present on the user's base resume.",
  '- Keep all fit ratings, scores, and critiques completely inside the ---FIT--- / ---APPLICATION--- sections. Do not let commentary bleed into the Resume or Cover Letter YAML fields.',
  '- Always quote YAML string values that contain colons to ensure the output remains syntactically valid YAML.',
  '- Never truncate the output. Complete the entire document through to the final line of the cover letter YAML.',
].join('\n');

/**
 * Cursor / Composer-oriented: raw delimiter paste, no outer fence,
 * explicit full schema example (models that follow file-like formats well).
 */
const CURSOR_IMPORT_PROMPT = `You are a job-application assistant integrated with a resume tracker web app. Follow these rules for the entire conversation.

## Your role
- Tailor resume and cover letter YAML for each job the user targets.
- Act as an honest ATS scanner and HR representative: assess fit realistically, name strengths and gaps, and recommend whether applying makes sense.
- Use ONLY the user's pasted base/master resume as the source of truth for identity, employers, contact info, education, projects, businesses, dates, titles, metrics, and skills. Never invent any of these.
- If a field is missing from the base resume, omit it — do not invent placeholders.

## How this conversation works
1. The user's FIRST message includes this prompt plus their base/master resume. Treat that resume as the permanent source of truth for this thread.
2. Every LATER message contains ONLY a full job description. For each job, output exactly ONE complete import-ready response.
3. Do not ask the user to resend their resume unless they explicitly want to replace it.

## Output format (required for every job)
Return one continuous import document. No preamble, no closing commentary, and NO wrapping markdown code fence around the whole reply.

Use these exact section headers in order:

---APPLICATION---
company: Summit Advisory Group
title: Administrative & Client Support Specialist
location: Austin, TX
status: applied
fit_rating: moderate
fit_score: 68
asks_for_linkedin: false

---FIT---
Why it might not work:
- Example gap tied to the posting
- Example second gap

Strengths:
- Example strength from the base resume
- Example second strength

Verdict:
- moderate — clear apply / maybe / skip recommendation with brief reason

---RESUME YAML---
name: Jordan Lee
contact:
  email: jordan.lee@example.com
  phone: "(555) 555-0100"
  location: Austin, TX
summary: |
  Short role-focused summary using only base-resume facts. Do not name the target company here.
experience:
  - title: Example Role
    company: Example Employer
    location: Austin, TX
    start: March 2021
    end: July 2023
    bullets:
      - Tailored achievement grounded in the base resume
      - Second achievement with honest metrics only if on the base resume
education:
  - degree: B.S. Example Field
    school: Example University
    location: Austin, TX
    year: "2020"
skills:
  - "Category: skill, skill, skill"

---COVER LETTER YAML---
name: Jordan Lee
contact:
  email: jordan.lee@example.com
  phone: "(555) 555-0100"
  location: Austin, TX
date: auto
recipient:
  company: Summit Advisory Group
  title: Administrative & Client Support Specialist
salutation: Dear Summit Advisory Group Hiring Team,
body: |
  Paragraph one tailored to the role.

  Paragraph two with evidence from the base resume.

  Short closing paragraph.
closing: Sincerely,
signature_name: Jordan Lee

## Rules
- Replace every example value with the user's real base-resume facts and the real job.
- fit_rating must be exactly ONE of: highly_qualified, good_match, moderate, stretch, big_stretch, skip (never a pipe list).
- asks_for_linkedin must be true or false only.
- FIT labels must be exactly: Why it might not work: / Strengths: / Verdict: with "- " bullets; gaps first.
- Experience reverse chronological; 3-5 bullets on the most relevant roles, 2-4 on others when content honestly fits.
- Include linkedin in contact only when asks_for_linkedin is true AND a LinkedIn URL is on the base resume.
- Keep fit commentary out of resume/cover letter YAML.
- Quote YAML strings that contain colons when needed. Never truncate.`;

const PROMPTS = {
  chatgpt: {
    id: 'chatgpt',
    label: 'ChatGPT',
    hint: 'Best for ChatGPT — wraps the whole reply in one yaml code block.',
    text: CHATGPT_IMPORT_PROMPT,
  },
  cursor: {
    id: 'cursor',
    label: 'Cursor',
    hint: 'Best for Cursor / Composer — raw ---SECTION--- delimiters, no outer fence.',
    text: CURSOR_IMPORT_PROMPT,
  },
};

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderApplicationsHowToView(activePromptId = 'chatgpt') {
  const active = PROMPTS[activePromptId] || PROMPTS.chatgpt;
  return `
    <div class="page-view applications-howto-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Applications: Quick How To</h2>
          <p class="page-subtitle">Three steps. Copy the prompt for your AI tool, then reuse the same chat for every job.</p>
        </div>
        <a href="#/applications" class="btn btn-secondary">Back to Applications</a>
      </div>

      <section class="applications-howto-card" aria-label="How to import applications with AI">
        <ol class="applications-howto-steps">
          <li>
            <strong>Setup (once):</strong> copy the <em>ChatGPT</em> or <em>Cursor</em> prompt below, paste it into a new chat, and add your base resume in the same message.
          </li>
          <li>
            <strong>Per job:</strong> paste the full job description into that same chat.
          </li>
          <li>
            <strong>Import:</strong> copy the AI's entire reply and paste it into <em>Import Application</em>.
          </li>
        </ol>

        <div class="applications-howto-prompt-pick" role="tablist" aria-label="Choose AI prompt">
          <button
            type="button"
            class="applications-howto-tab${active.id === 'chatgpt' ? ' is-active' : ''}"
            role="tab"
            id="prompt-tab-chatgpt"
            aria-selected="${active.id === 'chatgpt'}"
            data-prompt="chatgpt"
          >
            ChatGPT
          </button>
          <button
            type="button"
            class="applications-howto-tab${active.id === 'cursor' ? ' is-active' : ''}"
            role="tab"
            id="prompt-tab-cursor"
            aria-selected="${active.id === 'cursor'}"
            data-prompt="cursor"
          >
            Cursor
          </button>
        </div>

        <p class="applications-howto-prompt-hint" id="applications-howto-prompt-hint">${escapeHtml(active.hint)}</p>

        <div class="applications-howto-prompt-actions">
          <button
            type="button"
            class="btn btn-primary applications-howto-copy-btn"
            id="copy-applications-prompt-btn"
            data-prompt="${active.id}"
          >
            Copy ${escapeHtml(active.label)} Prompt
          </button>
          <button
            type="button"
            class="btn btn-secondary applications-howto-toggle-btn"
            id="toggle-applications-prompt-btn"
            aria-expanded="false"
            aria-controls="applications-howto-prompt-panel"
          >
            <span class="applications-howto-toggle-label">Show Prompt</span>
            <span class="applications-howto-toggle-chevron" aria-hidden="true">▾</span>
          </button>
        </div>

        <div class="applications-howto-prompt" id="applications-howto-prompt-panel" hidden>
          <pre class="applications-howto-prompt-text" id="applications-howto-prompt-text">${escapeHtml(active.text)}</pre>
        </div>
      </section>
    </div>
  `;
}

export function mountApplicationsHowToPage(container) {
  let activePromptId = 'chatgpt';
  let promptExpanded = false;

  function bindEvents(pageRoot) {
    const copyButton = pageRoot.querySelector('#copy-applications-prompt-btn');
    const toggleButton = pageRoot.querySelector('#toggle-applications-prompt-btn');
    const promptPanel = pageRoot.querySelector('#applications-howto-prompt-panel');
    const toggleLabel = pageRoot.querySelector('.applications-howto-toggle-label');
    const tabs = pageRoot.querySelectorAll('[data-prompt]');

    tabs.forEach((tab) => {
      if (tab.id === 'copy-applications-prompt-btn') return;
      if (!tab.classList.contains('applications-howto-tab')) return;
      tab.addEventListener('click', () => {
        const next = tab.dataset.prompt === 'cursor' ? 'cursor' : 'chatgpt';
        if (next === activePromptId) return;
        activePromptId = next;
        refreshPromptUi(pageRoot);
      });
    });

    copyButton?.addEventListener('click', async () => {
      const prompt = PROMPTS[activePromptId] || PROMPTS.chatgpt;
      const label = `Copy ${prompt.label} Prompt`;
      try {
        await navigator.clipboard.writeText(prompt.text);
        copyButton.textContent = 'Copied';
      } catch {
        copyButton.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        copyButton.textContent = label;
      }, 1300);
    });

    toggleButton?.addEventListener('click', () => {
      promptExpanded = !promptExpanded;
      if (promptExpanded) {
        promptPanel?.removeAttribute('hidden');
        toggleButton.setAttribute('aria-expanded', 'true');
        if (toggleLabel) toggleLabel.textContent = 'Hide Prompt';
      } else {
        promptPanel?.setAttribute('hidden', '');
        toggleButton.setAttribute('aria-expanded', 'false');
        if (toggleLabel) toggleLabel.textContent = 'Show Prompt';
      }
    });
  }

  function refreshPromptUi(pageRoot) {
    const prompt = PROMPTS[activePromptId] || PROMPTS.chatgpt;
    const hint = pageRoot.querySelector('#applications-howto-prompt-hint');
    const copyButton = pageRoot.querySelector('#copy-applications-prompt-btn');
    const promptText = pageRoot.querySelector('#applications-howto-prompt-text');
    const promptPanel = pageRoot.querySelector('#applications-howto-prompt-panel');
    const toggleButton = pageRoot.querySelector('#toggle-applications-prompt-btn');
    const toggleLabel = pageRoot.querySelector('.applications-howto-toggle-label');

    pageRoot.querySelectorAll('.applications-howto-tab').forEach((tab) => {
      const selected = tab.dataset.prompt === activePromptId;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
    });

    if (hint) hint.textContent = prompt.hint;
    if (copyButton) {
      copyButton.dataset.prompt = activePromptId;
      copyButton.textContent = `Copy ${prompt.label} Prompt`;
    }
    if (promptText) promptText.textContent = prompt.text;

    if (promptExpanded) {
      promptPanel?.removeAttribute('hidden');
      toggleButton?.setAttribute('aria-expanded', 'true');
      if (toggleLabel) toggleLabel.textContent = 'Hide Prompt';
    } else {
      promptPanel?.setAttribute('hidden', '');
      toggleButton?.setAttribute('aria-expanded', 'false');
      if (toggleLabel) toggleLabel.textContent = 'Show Prompt';
    }
  }

  return mountAuthAwarePage(container, {
    activeView: 'applications-how-to',
    renderMain: async () => renderApplicationsHowToView(activePromptId),
    bindMain: (root) => {
      const pageRoot = root.querySelector('.applications-howto-page') || root;
      bindEvents(pageRoot);
      if (promptExpanded) {
        refreshPromptUi(pageRoot);
      }
      return null;
    },
  });
}
