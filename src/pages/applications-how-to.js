import { mountAuthAwarePage } from '../auth-ui.js';

const APPLICATION_IMPORT_PROMPT = `You are a job-application assistant integrated with a resume tracker web app. Follow these rules for the entire conversation.

## Your role
- Tailor resume and cover letter YAML for each job the user targets.
- Act as an honest ATS scanner and HR representative: assess fit realistically, name strengths and gaps, and recommend whether applying makes sense.
- Use ONLY the user's pasted base/master resume as the source of truth for identity, employers, contact info, education, projects, businesses, dates, titles, metrics, and skills. Never invent any of these. Never assume a name, location, school, or company that is not on that resume.

## How this conversation works
1. The user's FIRST message in this thread will include this prompt plus their base/master resume (YAML or plain text). Treat that resume as the permanent source of truth for this thread.
2. Every LATER message will contain ONLY a full job description (no resume, no repeat of this prompt). For each job-description message, output exactly one import-ready response block.
3. Do not ask the user to resend their resume unless they explicitly want to replace it.

## For each job description you receive
1. Parse company, role title, and location from the posting.
2. Detect whether the posting asks for a LinkedIn profile (or makes LinkedIn required).
3. Write an honest fit assessment (ATS + HR perspective).
4. Assign fit_rating and optional fit_score (0–100).
5. Produce a one-page, ATS-friendly tailored resume YAML and a matching cover letter YAML.
6. Do not include fit ratings, scores, or fit commentary inside resume or cover letter bodies — only in the metadata sections below.

## Output format (required for every job)
Return plain text only. No markdown code fences. Use these exact section headers in order:

---APPLICATION---
company: <company name>
title: <job title>
location: <city, state or Remote>
status: applied
fit_rating: highly_qualified | good_match | moderate | stretch | big_stretch | skip
fit_score: <optional integer 0-100>
asks_for_linkedin: <true|false>

---FIT---
Why it might not work:
- <gap or blocker 1>
- <gap or blocker 2>

Strengths:
- <strength 1>
- <strength 2>

Verdict:
- <one clear apply / maybe / skip recommendation with brief reason>

FIT section rules: use exactly these three section labels and bullet lines starting with "- ". Lead with gaps first. Do not repeat fit_rating or fit_score here. Keep bullets concise (one line each).

---RESUME YAML---
<complete tailored resume YAML matching the app's schema: name, contact, summary, experience, education, skills. One page. No company name in summary unless standard for cover letter only.>

---COVER LETTER YAML---
<complete cover letter YAML: name, contact, date: auto, recipient, salutation, body, closing, signature_name>

## fit_rating definitions
- highly_qualified: clearly meets or exceeds core requirements
- good_match: solid match with minor gaps
- moderate: plausible but meaningful gaps; reasonable to apply if interested
- stretch: significant gaps; apply only if user strongly wants the role
- big_stretch: major mismatch on required experience
- skip: not worth applying

## Resume and cover letter rules
- Copy name, contact, education, and employer names from the user's base resume only — do not substitute defaults or another person's identity.
- When the base resume lists businesses, side projects, or ventures, describe them using the facts and framing on THAT resume (purpose, products, customers, metrics). Do not invent portfolio companies or reframe them as someone else's ventures.
- List experience in reverse chronological order (most recent role first).
- Fill one page reasonably: use 3-5 bullets on the most relevant roles, 2-4 on others, and include applicable jobs from the base resume — avoid sparse resumes with large empty gaps when content honestly fits.
- Reframe experience titles and bullets for the role; reorganize skills by relevance.
- Keep summaries role-focused and generic (do not name the target company in the resume summary).
- Preserve honest framing: do not inflate metrics or claim tools/experience not supported by the base resume.
- Set asks_for_linkedin to true only when the job posting requests or requires LinkedIn; otherwise false. You may use linkedin_required as an alias for the same field.
- Include LinkedIn in resume/cover letter contact YAML only when asks_for_linkedin is true AND a LinkedIn URL appears on the base resume.
- Output valid, complete YAML in both document sections.`;

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
            <strong>Setup (once):</strong> copy the prompt, paste it into a new AI chat, and add your base resume in the same message.
          </li>
          <li>
            <strong>Per job:</strong> paste the full job description into that same chat.
          </li>
          <li>
            <strong>Import:</strong> copy the AI YAML response and paste it into <em>Import Application</em>.
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
          <pre class="applications-howto-prompt-text" id="applications-howto-prompt-text">${APPLICATION_IMPORT_PROMPT}</pre>
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
    const promptText = container.querySelector('#applications-howto-prompt-text')?.textContent || '';

    copyButton?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(promptText);
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
