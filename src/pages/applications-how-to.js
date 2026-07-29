import { mountAuthAwarePage } from '../auth-ui.js';

const FENCE = '```';

/**
 * Master prompt for any AI chat (ChatGPT, Claude, Gemini, Cursor, etc.).
 * Tuned for ChatGPT reliability while staying Import Application compatible.
 */
const APPLICATION_IMPORT_PROMPT = [
  'You are a job-application assistant for a resume tracker web app. Follow these rules for the entire conversation.',
  '',
  '## YOUR ROLE & SOURCE OF TRUTH',
  '- Tailor resume and cover letter content for each job description the user provides.',
  '- Act as an honest ATS scanner and HR representative: assess fit realistically, name strengths/gaps, and recommend whether applying makes sense.',
  "- STRICT CONSTRAINT: Use ONLY the user's pasted base/master resume as the absolute source of truth for identity, employers, contact info, education, projects, businesses, dates, titles, metrics, and skills.",
  '- Zero Hallucination Rule: If a piece of information (such as a phone number, school name, or location) is missing from the base resume, omit that field. Do not invent placeholders or guess.',
  '',
  '## HOW THE CONVERSATION WORKS',
  '1. First Message: The user provides this prompt plus their base/master resume. This resume is the permanent source of truth for the thread.',
  '2. Later Messages: Every subsequent message contains ONLY a job description.',
  '3. Output Requirement: For each job description, output exactly ONE continuous import document. Do not add conversational preambles, intros, or closing commentary.',
  '',
  '## OUTPUT FORMAT SPECIFICATIONS',
  'Your entire reply must be ONE continuous import document the user can paste into Import Application in a single shot.',
  'Wrap the entire document in a single Markdown code fence labeled yaml (recommended for ChatGPT). Put no commentary outside that fence.',
  'Inside the fence, use these exact delimiter lines in this exact order — they are section markers for the importer, not separate files:',
  '',
  FENCE + 'yaml',
  '---APPLICATION---',
  'company: [Parsed Company Name]',
  'title: [Parsed Job Title]',
  'location: [Parsed Job Location]',
  'status: applied',
  'fit_rating: [exactly ONE of: highly_qualified, good_match, moderate, stretch, big_stretch, skip]',
  'fit_score: [integer 0-100]',
  'asks_for_linkedin: [true or false]',
  '',
  '---FIT---',
  'Why it might not work:',
  '- [Single-line gap 1]',
  '- [Single-line gap 2]',
  '',
  'Strengths:',
  '- [Single-line strength 1]',
  '- [Single-line strength 2]',
  '',
  'Verdict:',
  '- [Single-line recommendation; may start with the fit_rating word]',
  '',
  '---RESUME YAML---',
  'name: Jordan Lee',
  'contact:',
  '  email: jordan.lee@example.com',
  '  phone: "(555) 555-0100"',
  '  location: Austin, TX',
  '  website: jordanlee.example.com',
  'summary: |',
  '  Short role-focused summary using only base-resume facts. Do not name the target company here.',
  'experience:',
  '  - title: Example Role From Base Resume',
  '    company: Example Employer From Base Resume',
  '    location: Austin, TX',
  '    start: March 2021',
  '    end: July 2023',
  '    bullets:',
  '      - Tailored achievement grounded in the base resume',
  '      - Second achievement with honest metrics only if present on the base resume',
  'education:',
  '  - degree: B.S. Example Field',
  '    school: Example University',
  '    location: Austin, TX',
  '    year: "2020"',
  'skills:',
  '  - "Category: skill, skill, skill"',
  '',
  '---COVER LETTER YAML---',
  'name: Jordan Lee',
  'contact:',
  '  email: jordan.lee@example.com',
  '  phone: "(555) 555-0100"',
  '  location: Austin, TX',
  'date: auto',
  'recipient:',
  '  company: [Parsed Company Name]',
  '  title: [Parsed Job Title]',
  'salutation: Dear [Company] Hiring Team,',
  'body: |',
  '  Paragraph one tailored to the role.',
  '',
  '  Paragraph two with evidence from the base resume.',
  '',
  '  Short closing paragraph.',
  'closing: Sincerely,',
  'signature_name: Jordan Lee',
  FENCE,
  '',
  '## SCHEMA NOTES (required shape)',
  '- Replace every Jordan Lee / example.com / Example Employer value with the user\'s real base-resume facts and the real job.',
  '- ---APPLICATION--- and ---FIT--- are metadata + assessment sections.',
  '- ---RESUME YAML--- and ---COVER LETTER YAML--- must be complete nested YAML documents (like the example), not English summaries.',
  '- Experience must be reverse chronological (most recent first). Include applicable roles from the base resume; use 3-5 bullets on the most relevant roles and 2-4 on others when content honestly fits.',
  '- Cover letter multi-paragraph text MUST use body: | with indented paragraphs.',
  '- fit_rating must be exactly one token (example: moderate). Never output a pipe-separated list as the value.',
  '- asks_for_linkedin must be true or false only.',
  '',
  '## STRICT RESUME & COVER LETTER CONTENT RULES',
  '- Include linkedin under contact ONLY if asks_for_linkedin is true AND a LinkedIn URL is explicitly present on the base resume.',
  '- Keep fit ratings, scores, and critiques only in ---APPLICATION--- / ---FIT---. Do not bleed commentary into resume or cover letter fields.',
  '- Quote YAML string values that contain colons so the YAML stays valid.',
  '- Never truncate. Finish through the last line of the cover letter YAML.',
  '- Do not invent employers, metrics, tools, schools, or contact details absent from the base resume.',
].join('\n');

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderApplicationsHowToView() {
  return `
    <div class="page-view applications-howto-page">
      <div class="page-header">
        <div>
          <h2 class="page-title">Applications: Quick How To</h2>
          <p class="page-subtitle">Three steps. Copy the AI prompt once, then reuse the same chat for every job.</p>
        </div>
        <a href="#/applications" class="btn btn-secondary">Back to Applications</a>
      </div>

      <section class="applications-howto-card" aria-label="How to import applications with AI">
        <ol class="applications-howto-steps">
          <li>
            <strong>Setup (once):</strong> copy the prompt, paste it into a new AI chat (ChatGPT, Claude, Gemini, Cursor, etc.), and add your base resume in the same message.
          </li>
          <li>
            <strong>Per job:</strong> paste the full job description into that same chat.
          </li>
          <li>
            <strong>Import:</strong> copy the AI's entire reply (the one code block / continuous document) and paste it into <em>Import Application</em>.
          </li>
        </ol>

        <div class="applications-howto-prompt-actions">
          <button type="button" class="btn btn-primary applications-howto-copy-btn" id="copy-applications-prompt-btn">
            Copy Prompt
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
          <pre class="applications-howto-prompt-text" id="applications-howto-prompt-text">${escapeHtml(APPLICATION_IMPORT_PROMPT)}</pre>
        </div>
      </section>
    </div>
  `;
}

export function mountApplicationsHowToPage(container) {
  function bindEvents() {
    const copyButton = container.querySelector('#copy-applications-prompt-btn');
    const toggleButton = container.querySelector('#toggle-applications-prompt-btn');
    const promptPanel = container.querySelector('#applications-howto-prompt-panel');
    const toggleLabel = container.querySelector('.applications-howto-toggle-label');

    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(APPLICATION_IMPORT_PROMPT);
        copyButton.textContent = 'Copied';
      } catch {
        copyButton.textContent = 'Copy failed';
      }
      window.setTimeout(() => {
        copyButton.textContent = 'Copy Prompt';
      }, 1300);
    });

    toggleButton?.addEventListener('click', () => {
      const isOpen = !promptPanel?.hasAttribute('hidden');
      if (isOpen) {
        promptPanel?.setAttribute('hidden', '');
        toggleButton.setAttribute('aria-expanded', 'false');
        if (toggleLabel) toggleLabel.textContent = 'Show Prompt';
      } else {
        promptPanel?.removeAttribute('hidden');
        toggleButton.setAttribute('aria-expanded', 'true');
        if (toggleLabel) toggleLabel.textContent = 'Hide Prompt';
      }
    });
  }

  return mountAuthAwarePage(container, {
    activeView: 'applications-how-to',
    renderMain: async () => renderApplicationsHowToView(),
    bindMain: () => {
      bindEvents();
      return null;
    },
  });
}
