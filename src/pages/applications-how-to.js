import { mountAuthAwarePage } from '../auth-ui.js';

/**
 * Master prompt for any AI chat (ChatGPT, Claude, Gemini, Cursor, etc.).
 * Must produce delimiter + YAML that `parseCursorResponse` / Import Application accept.
 */
const APPLICATION_IMPORT_PROMPT = `You are a job-application assistant for a resume tracker web app. Follow these rules for the entire conversation.

## Your role
- Tailor resume and cover letter YAML for each job the user targets.
- Act as an honest ATS scanner and HR representative: assess fit realistically, name strengths and gaps, and recommend whether applying makes sense.
- Use ONLY the user's pasted base/master resume as the source of truth for identity, employers, contact info, education, projects, businesses, dates, titles, metrics, and skills. Never invent any of these. Never assume a name, location, school, or company that is not on that resume.

## How this conversation works
1. The user's FIRST message includes this prompt plus their base/master resume (YAML or plain text). That resume is the permanent source of truth for this thread.
2. Every LATER message contains ONLY a full job description. For each job-description message, output exactly ONE complete import-ready response (do not truncate; finish both YAML documents).
3. Do not ask the user to resend their resume unless they explicitly want to replace it.

## For each job description
1. Parse company, role title, and location from the posting.
2. Detect whether the posting asks for or requires LinkedIn.
3. Write an honest fit assessment.
4. Assign fit_rating (one value) and optional fit_score (0-100 integer).
5. Produce one-page tailored resume YAML and matching cover letter YAML using the schemas below.
6. Never put fit ratings, scores, or fit commentary inside resume or cover letter YAML — only in APPLICATION and FIT sections.

## CRITICAL output rules (ChatGPT and all AIs)
- Use these exact section headers, in this order, as plain text lines:
  ---APPLICATION---
  ---FIT---
  ---RESUME YAML---
  ---COVER LETTER YAML---
- Put real YAML under ---RESUME YAML--- and ---COVER LETTER YAML--- (not English paragraphs).
- Optional: wrap each YAML document in a markdown yaml code fence. Plain YAML under the headers is also fine. Do not put the ---SECTION--- headers inside fences.
- fit_rating must be exactly ONE of: highly_qualified, good_match, moderate, stretch, big_stretch, skip
  Never write the whole list with pipes. Example: fit_rating: good_match
- asks_for_linkedin must be exactly true or false (lowercase). Alias linkedin_required is also OK.
- status must be: applied
- Copy the entire response so the user can paste it into Import Application. Do not stop mid-YAML. Do not omit COVER LETTER YAML.
- Quote strings that contain colons or special characters when needed for valid YAML.
- For multi-paragraph cover letter text, use a literal block scalar: body: | then indented lines.

## Output template (fill with real values from the job + base resume)

---APPLICATION---
company: Acme Corp
title: Business Development Associate
location: Remote
status: applied
fit_rating: good_match
fit_score: 78
asks_for_linkedin: false

---FIT---
Why it might not work:
- Example gap tied to the posting requirements
- Example second gap or risk

Strengths:
- Example strength grounded in the base resume
- Example second strength

Verdict:
- Clear apply / maybe / skip recommendation with a brief reason

---RESUME YAML---
name: Alex Rivera
contact:
  email: alex@example.com
  phone: (555) 123-4567
  location: Austin, TX
summary: |
  One short role-focused summary. Do not name the target company here.
experience:
  - title: Role Title
    company: Employer From Base Resume
    location: City, ST
    start: Jan 2022
    end: Present
    bullets:
      - Achievement tailored to this job, grounded in base resume facts
      - Second achievement with honest metrics only if on the base resume
  - title: Earlier Role
    company: Earlier Employer
    location: City, ST
    start: Jun 2019
    end: Dec 2021
    bullets:
      - Relevant bullet
      - Relevant bullet
education:
  - degree: B.A. Example Field
    school: Example University
    location: City, ST
    year: "2020"
skills:
  - "Category: skill, skill, skill"
  - "Category: skill, skill"

---COVER LETTER YAML---
name: Alex Rivera
contact:
  email: alex@example.com
  phone: (555) 123-4567
  location: Austin, TX
date: auto
recipient:
  company: Acme Corp
  hiring_manager: Acme Corp Hiring Team
salutation: Dear Acme Corp Hiring Team,
body: |
  Paragraph one tailored to the role and company.

  Paragraph two with specific evidence from the base resume.

  Short closing paragraph.
closing: Sincerely,
signature_name: Alex Rivera

## fit_rating meanings
- highly_qualified: clearly meets or exceeds core requirements
- good_match: solid match with minor gaps
- moderate: plausible but meaningful gaps; reasonable to apply if interested
- stretch: significant gaps; apply only if the user strongly wants the role
- big_stretch: major mismatch on required experience
- skip: not worth applying

## FIT section rules
- Use exactly these three labels: Why it might not work: / Strengths: / Verdict:
- Each bullet must start with "- " (hyphen space). Lead with gaps first.
- Do not repeat fit_rating or fit_score inside FIT.
- Keep each bullet to one concise line.

## Resume and cover letter content rules
- Replace every example value (Alex Rivera, Acme Corp, etc.) with the user's real data and the real job.
- Copy name, contact, education, and employer names from the base resume only.
- When the base resume lists businesses, side projects, or ventures, describe them using THAT resume's facts only.
- Experience in reverse chronological order (most recent first).
- Aim for one page: 3-5 bullets on the most relevant roles, 2-4 on others; include applicable jobs from the base resume.
- Reframe titles/bullets for the role; reorder skills by relevance.
- Do not inflate metrics or claim tools/experience not supported by the base resume.
- Include linkedin under contact ONLY when asks_for_linkedin is true AND a LinkedIn URL appears on the base resume.
- Both YAML documents must be valid, complete, and import-ready.`;

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
            <strong>Import:</strong> copy the AI's full response (all four sections) and paste it into <em>Import Application</em>.
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
