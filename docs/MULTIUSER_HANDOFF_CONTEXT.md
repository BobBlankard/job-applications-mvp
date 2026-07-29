# Multi-User Job Applications — Agent Handoff Context

## Purpose / how to use this file

This document is a **handoff for a future agent** that will rebuild or evolve this repo into a **public multi-user web app**.

- Treat **Target product vision** as the destination product requirements.
- Treat everything under **Current architecture** and feature deep dives as an accurate inventory of **what exists today** (single-user, local, multi-area resume builder).
- Do **not** invent a full implementation plan here. Prefer preserving working import/PDF behavior unless the target explicitly requires change.
- When implementing, read the checklist at the bottom first, then generalize Owen-specific coupling listed in this file.

---

## Target product vision (multi-user public Job Applications only)

**TARGET (not current state):**

| Requirement | Detail |
|-------------|--------|
| Public website | People create accounts and sign in |
| Per-user cloud data | Applications, resume YAML, cover letter YAML live online under that user — **not** shared browser `localStorage`, **not** files passed around locally |
| Isolation | Each user sees **only** their own applications/files |
| UI scope | **Only** the Job Applications menu/flow (list + import + how-to + PDF download). Strip Home, Library, Cover Letters sidebar areas, and standalone resume/cover-letter editors from the **product surface** (supporting libs may remain internally for PDF/YAML) |
| AI import | Prompt must work for **any** job seeker — no hardcoded Owen Doherty identity, employers, or contact defaults |
| Core loop preserved | Copy prompt → AI chat with user’s base resume → paste job descriptions → paste AI output into Import → track status/fit → download resume/cover letter PDFs |

---

## Current architecture inventory

### Project type

- **Vanilla JS + Vite** SPA (no React/framework).
- Package name: `resume-builder` (`package.json`).
- Entry points:
  - Dev: `index.dev.html` → `/src/main.js`
  - Production/standalone: root `index.html` + `assets/` (built via `npm run build` → Vite + `scripts/standalone.js`)
- Router: hash-based (`src/router.js`), `#/…`
- Shell: sidebar + main column (`src/sidebar.js`)
- Styling: CSS under `src/styles/` (including `applications.css`, `applications-how-to.css`)

### Key scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Vite on port **5180** |
| `npm run build` | Signature font + Vite build + standalone copy |
| `npm run test:cursor-import` | Import format regression (`scripts/test-cursor-import.js`) |
| `npm run ai:generate` | CLI helper (`scripts/generate-with-cursor.js`) |

### Current routes / pages

| Hash route | Page module | In TARGET UI? |
|------------|-------------|---------------|
| `#/` / `#/home` | `src/pages/home.js` — resume list | **Drop** |
| `#/library` | same home, library view — templates | **Drop** |
| `#/edit/:id` | `src/pages/editor.js` — resume YAML editor | **Drop** from product UI |
| `#/cover-letters` | `src/pages/cover-letters.js` | **Drop** |
| `#/cover-letter/edit/:id` | `src/pages/cover-letter-editor.js` | **Drop** |
| `#/applications` | `src/pages/applications.js` | **Keep** (primary) |
| `#/applications-how-to` | `src/pages/applications-how-to.js` | **Keep** (prompt + workflow) |

Sidebar nav today (`src/sidebar.js`): Home, Library, Applications, Cover Letters. Brand: “Resume Builder”.

### Auth / storage today (single-user)

**No authentication.** All data is browser **`localStorage`** on one device:

| Key | Module | Contents |
|-----|--------|----------|
| `resume-builder-applications` | `src/application-storage.js` | Application records (incl. embedded YAML + fit fields) |
| `resume-builder-resumes` | `src/storage.js` | Resume documents (also written on application import) |
| `resume-builder-cover-letters` | `src/cover-letter-storage.js` | Cover letter documents (also written on import) |
| `resume-builder-yaml` | legacy | Migrated once into resumes (`migrateLegacyStorage`) |
| `sidebar-collapsed` | `src/sidebar.js` | UI preference |

**Must change for multi-user:** replace shared/local keys with **authenticated, per-user server-side (or BaaS) storage**; never expose another user’s applications.

---

## Applications feature deep dive

### End-to-end: How To → AI → Import → Track → PDF

1. **How To** (`#/applications-how-to`): user copies `APPLICATION_IMPORT_PROMPT` from `src/pages/applications-how-to.js`, pastes into an AI chat together with their **base/master resume**.
2. **Per job:** user pastes only the job description into that same chat.
3. **Import:** on `#/applications`, **Import Application** opens a modal; user pastes the full AI response.
4. **Parse:** `parseCursorResponse()` in `src/cursor-import.js` extracts metadata, FIT text, resume YAML, cover letter YAML.
5. **Persist:** `importApplicationFromPaste()` in `src/pages/applications.js`:
   - Creates linked resume + cover letter via `createResume` / `createCoverLetter`
   - Creates application via `createApplication` with YAML + fit fields + `resumeId` / `coverLetterId`
6. **UI:** table rows show company, fit badge, role, applied date, status select, Resume / Cover Letter / Delete actions.
7. **PDF:** downloads use `downloadResumePdfFromData` / `downloadCoverLetterPdfFromData` (`src/pdf-text-export.js`) with filenames from `src/pdf-filenames.js` and LinkedIn filtering via `src/contact-display.js`.

Secondary (older/rule-based) path: `src/document-generator.js` can tailor from a master profile and build Cursor prompts — heavily Owen-coupled; the live Applications How To prompt is the primary user-facing AI path.

Reference doc (format mirror): `src/data/cursor-workflow-reference.md`.

### Application data model

Created/updated in `src/application-storage.js`. Typical record:

```js
{
  id,                    // `app-${timestamp}-…`
  company, title, location, roleNumber,
  jobDescription,        // often empty on AI import today
  asksForLinkedin,       // from APPLICATION block `asks_for_linkedin`
  status,                // applied | no_response | interview | rejected | offer
  resumeYaml, coverLetterYaml,
  resumeTemplateId,      // default: `compact-minimal`
  coverLetterTemplateId, // default: `classic`
  baseResumeId, resumeId, coverLetterId,
  fitAssessment,         // full ---FIT--- body
  fitRecommendation,     // legacy: strong | apply | moderate | weak | skip | unknown
  fitRating,             // highly_qualified | good_match | moderate | stretch | big_stretch | skip
  fitScore,              // 0–100 or null
  fitSummary,            // short derived summary
  createdAt, appliedAt, updatedAt
}
```

Defaults:

- Resume template for apps: `DEFAULT_APPLICATION_RESUME_TEMPLATE_ID = 'compact-minimal'`
- Cover letter template: `DEFAULT_APPLICATION_COVER_LETTER_TEMPLATE_ID = 'classic'`
- Status normalization maps legacy `draft`/`sent` → `applied`

Resume/cover letter stores are separate lists of `{ id, name, templateId, yaml, createdAt, updatedAt }`.

### Fit badge / tooltip expectations

**Ratings** (`FIT_RATINGS` in `src/cursor-import.js`):

| id | Label | Color |
|----|-------|-------|
| `highly_qualified` | Highly qualified | `#3b82f6` |
| `good_match` | Good match | `#14b8a6` |
| `moderate` | Moderate | `#f59e0b` |
| `stretch` | Stretch | `#f97316` |
| `big_stretch` | Big stretch | `#b91c1c` |
| `skip` | Skip | `#9aa0a6` |

Badge may show optional numeric `fitScore`.

**Tooltip HTML** (`formatFitTooltipHtml` in `src/pages/applications.js`):

- Expect FIT body shaped as section headers ending with `:` then `- ` bullets.
- Canonical sections (also required by the How To prompt):
  - `Why it might not work:` (styled with `is-gaps`)
  - `Strengths:`
  - `Verdict:`
- Gaps-first ordering is intentional.

---

## Cursor / AI import format

Parser: `src/cursor-import.js` → `parseCursorResponse(text)`.

### Preferred delimiter format

```
---APPLICATION---
company: …
title: …
location: …
status: applied
fit_rating: highly_qualified | good_match | moderate | stretch | big_stretch | skip
fit_score: <optional 0-100>
asks_for_linkedin: true|false   # optional; also accepts linkedin_required

---FIT---
Why it might not work:
- …
Strengths:
- …
Verdict:
- …

---RESUME YAML---
<resume yaml>

---COVER LETTER YAML---
<cover letter yaml>
```

- Delimiters are regex-matched case-insensitively (`---RESUME YAML---`, `---COVER LETTER YAML---`, etc.).
- YAML inside sections may be raw or wrapped in ` ```yaml ` fences.
- **Legacy** markdown format still works: `## FIT ASSESSMENT`, `## RESUME YAML`, fenced YAML blocks.
- If `fit_rating` omitted, rating is inferred from FIT text / legacy APPLY|MAYBE|SKIP language.
- Import requires at least one of resume or cover letter YAML; invalid YAML throws a clear error.

### Resume / cover letter YAML schemas (expected)

Resume: `name`, `contact`, `summary`, `experience[]`, `education[]`, `skills[]` (see README / How To prompt).

Cover letter: `name`, `contact`, `date` (`auto` allowed), `recipient`, `salutation`, `body`, `closing`, `signature_name`.

---

## AI prompt & Owen-specific coupling

**TARGET:** AI import must work for any job seeker. Remove or replace hardcoding with user-supplied master resume / profile.

### Concrete files / strings to generalize

| Location | What’s Owen-specific |
|----------|----------------------|
| `src/pages/applications-how-to.js` | Prompt lines for **monoright.com**, **BandHouse**, **Ecstasy Angel** framed as “Owen’s …” businesses |
| `src/data/master-profile.yaml` | Full **Owen Doherty** identity, contact (`o.n.doherty@gmail.com`, `owendohertyworks.com`, LinkedIn), San Diego/SDSU narrative, venture guidance |
| `src/master-profile.js` | Loads bundled master profile as source of truth for generation |
| `src/document-generator.js` | Company title frames for monoright/BandHouse/Ecstasy/PinHaus/Seed; San Diego defaults; SDSU opener; Cursor prompt line keeping monoright as “Owen’s web design…”; cover letter openers |
| `src/pdf-text-export.js` | Fallback filenames `Owen_Doherty_Resume_Position.pdf`, `Owen_Doherty_CL_Company.pdf` (real downloads usually use `pdf-filenames.js` from YAML `name`) |
| `README.md` | Mentions download as `Doherty Resume.pdf` (older DOM→SVG path messaging) |
| Sample folders | `Owen's Old Resumes/`, `Owens Cover Letters/` — personal archives, not app runtime |
| `scripts/test-cursor-import.js` | Sample pastes use `name: Owen Doherty` (tests only) |

### What is already generic (preserve)

- Delimiter import format and FIT section labels
- Application tracker UX and status model
- `pdf-filenames.js` building `{First}_{Last}_Resume_{Role}.pdf` / `{First}_{Last}_CL_{Company}.pdf` from document `name`
- LinkedIn omission rules in `contact-display.js`
- How To workflow structure (prompt once + base resume; JD per message; import paste)

Generic starter resume elsewhere uses **Jane Doe** (`src/default-resume.js`, templates) — not Owen, but also not multi-user account-scoped.

---

## PDF export pipeline

**Applications downloads** use **text/jsPDF** pipeline:

- `src/pdf-text-export.js` — `buildResumePdf` / `buildCoverLetterPdf` → `downloadResumePdfFromData` / `downloadCoverLetterPdfFromData`
- Templates: resume PDF styles from `src/templates/index.js` (`getPdfStyle`); apps default resume template **`compact-minimal`**
- Cover letters default template **`classic`** with dedicated styling in `pdf-text-export.js`:
  - Wider margins (`COVER_LETTER_CLASSIC_MARGIN` 56/56)
  - Larger body (~12.5pt), Helvetica name, grey header rule, larger gaps before date/signature
  - Classic signature: left-aligned normal text (not Great Vibes script used in some preview paths)
- Filenames: `src/pdf-filenames.js` from person name + role/company
- **LinkedIn omission:** LinkedIn appears on PDF/contact **only if** `asksForLinkedin` / `asks_for_linkedin` is true **or** job text matches LinkedIn-request regex (`src/contact-display.js`). Otherwise `linkedin` is stripped before export via `prepareDocumentDataForExport`.

There is also a separate **DOM → SVG → PDF** path (`src/pdf-export.js`) used by the resume/cover-letter **editors** — not the Applications row download buttons. Prefer keeping the Applications jsPDF path unless there is a strong reason to unify.

Fit assessment text is **tracker-only** and is **not** embedded in PDFs.

---

## Storage & auth gap analysis (current → required)

| Concern | Current | Required for TARGET |
|---------|---------|---------------------|
| Identity | Implicit single browser user | Account signup / login |
| Applications | `localStorage` key `resume-builder-applications` | Per-user DB records; query filtered by `userId` |
| Documents | Same-browser resume + cover letter stores | Per-user; preferably owned by or linked to application |
| Master / base resume | Bundled Owen YAML or pasted into AI chat only | Per-user uploaded/stored base resume (or profile) feeding the prompt |
| Cross-user isolation | N/A (one machine) | Server rules / auth so users cannot read others’ data |
| Sharing files | Manual copy/paste of AI output | No shared single-tenant storage; optional export still OK |
| Sidebar prefs | localStorage fine to keep client-only | Optional |

---

## Out of scope for v1 of the multi-user product

Drop from **product UI / navigation** (implementation may leave modules unused):

- Home resume library (`#/`, `#/home`)
- Template Library (`#/library`)
- Standalone resume editor (`#/edit/:id`)
- Cover Letters list + editor (`#/cover-letters`, `#/cover-letter/edit/:id`)
- Rule-based in-app generation UX that depends on Owen’s master profile (unless replaced by per-user profile)
- Shipping personal archive folders (`Owen's Old Resumes/`, `Owens Cover Letters/`) as product content

**In scope for v1:** Applications list, How To + generalized prompt, Import Application, status/fit UI, Resume & Cover Letter PDF download, accounts + per-user persistence.

---

## Suggested migration constraints / non-goals

- **Preserve the import paste format** (`---APPLICATION---` / `---FIT---` / `---RESUME YAML---` / `---COVER LETTER YAML---` and FIT section labels). Existing tests: `npm run test:cursor-import`.
- **Do not rewrite PDF generation from scratch** unless necessary; reuse `pdf-text-export.js`, filenames, LinkedIn rules, classic cover letter spacing.
- **Generalize prompts/profile**, don’t hardcode a new personal identity into the shipped prompt.
- **Applications-only product surface** — keep supporting YAML/PDF code as libraries, not as competing menus.
- Non-goal: building a full multi-area resume SaaS in v1.
- Non-goal: requiring users to use Cursor specifically (prompt is AI-agnostic).

---

## Read these files first (checklist)

Future agent should read in roughly this order:

1. `docs/MULTIUSER_HANDOFF_CONTEXT.md` (this file)
2. `src/pages/applications.js` — import UI, PDF download, fit tooltips
3. `src/pages/applications-how-to.js` — shipped AI prompt (Owen lines to remove)
4. `src/cursor-import.js` — import parser + fit ratings
5. `src/application-storage.js` — application model + localStorage
6. `src/data/cursor-workflow-reference.md` — format reference
7. `src/pdf-text-export.js` — Applications PDF pipeline
8. `src/pdf-filenames.js` — download naming
9. `src/contact-display.js` — LinkedIn omission
10. `src/storage.js` + `src/cover-letter-storage.js` — document stores
11. `src/router.js` + `src/sidebar.js` — routes/nav to slim down
12. `src/data/master-profile.yaml` + `src/document-generator.js` — Owen coupling inventory
13. `scripts/test-cursor-import.js` — expected parse behavior
14. `package.json` + `vite.config.js` + `src/main.js` — project bootstrap

Optional when touching editors/templates (usually out of v1 UI): `src/renderer.js`, `src/cover-letter-renderer.js`, `src/templates/index.js`, `src/pdf-export.js`.
