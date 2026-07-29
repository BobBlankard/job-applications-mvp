# Multi-User Job Applications — Kickoff Prompt

## How to use

1. Open a **new Cursor chat** with **Multitask Mode** enabled.
2. Copy everything inside the **Copy-paste prompt** section below (from the start of the fenced block through the end).
3. Paste it as the first message and let the coordinator launch parallel workstreams.

Source of truth for current state and target: [`docs/MULTIUSER_HANDOFF_CONTEXT.md`](./MULTIUSER_HANDOFF_CONTEXT.md).

---

## Copy-paste prompt

```
# Build: Public multi-user Job Applications MVP

You are the **coordinator** for this repo. Use **Multitask Mode** and launch **parallel subagents** for independent workstreams — do **not** do everything as one giant serial agent.

## First action (required)

1. Read `docs/MULTIUSER_HANDOFF_CONTEXT.md` immediately. It is the **source of truth** for current architecture and the target product.
2. Do **not** change that doc’s intent. Implement the **Target product vision** described there.
3. Prefer **evolving this repo** toward multi-user (keep working import/PDF code). Do not abandon `cursor-import`, Applications PDF export, or the fit format.

Then skim the checklist files listed in that handoff (applications pages, `cursor-import.js`, storage modules, PDF pipeline, sidebar/router) as needed for accuracy.

## Product target (MVP)

| Requirement | Detail |
|-------------|--------|
| Public website | Sign-up / sign-in accounts |
| Per-user cloud storage | Applications + resume/cover letter YAML online, scoped to the signed-in user — **not** shared `localStorage`-only, **not** local file-passing |
| Isolation | Each user sees only their own data |
| UI | **Only** Job Applications flow: list, import, how-to, PDF download. Strip Home, Library, Cover Letters, and standalone editors from the product surface (libs may remain for PDF/YAML) |
| AI import | How-to prompt must work for **any** job seeker — no Owen Doherty identity, employers, or contact defaults |
| Preserve | Existing `---APPLICATION---` / `---FIT---` / YAML delimiter format, fit badges/tooltips, Applications jsPDF export quality (`pdf-text-export.js`, filenames, LinkedIn omission) |

Core loop: copy generic prompt → AI chat with user’s base resume → paste JDs → paste AI output into Import → track status/fit → download resume/cover letter PDFs.

## Stack / hosting recommendation

Current app: **Vanilla JS + Vite** SPA (`resume-builder`), hash router, no framework.

**Practical fast path:** keep the Vite SPA and add **Firebase Auth + Cloud Firestore** (or Firebase Realtime DB) for accounts and per-user documents, then host with **Firebase Hosting**. That matches a BaaS need without rewriting the UI into React/Next. Use Firebase skills/CLI in this environment if available; another Auth+DB+hosting combo is OK only if equally fast and you document why.

Replace `localStorage` application/resume/cover-letter stores with authenticated, `userId`-scoped cloud reads/writes and security rules so users cannot read others’ data. Client-only prefs (e.g. sidebar collapsed) may stay local.

## Parallel workstreams (launch these)

Spin up parallel agents for:

1. **Auth + multi-user backend / data model**  
   Signup/login/logout; Firestore (or equivalent) schema for applications + linked resume/cover letter docs; security rules; thin client API/storage adapters that mirror today’s create/update/list/delete shapes where possible.

2. **Applications UI**  
   Strip non-Applications nav/routes; keep list, import modal, status/fit UI, PDF download wiring. Stub against agreed API contracts while auth/storage lands; swap stubs for real adapters when ready.

3. **Generalize AI prompt + remove Owen coupling**  
   Rewrite `APPLICATION_IMPORT_PROMPT` in `applications-how-to.js` for any job seeker; remove/replace Owen-specific strings/defaults in the shipped how-to path (and don’t ship master-profile Owen content as product identity). Preserve delimiter format and FIT section labels. Keep `npm run test:cursor-import` green.

4. **Deploy / hosting**  
   After MVP works locally with real auth + cloud data: production build, hosting config, public URL. Do **not** block UI/auth work on deploy.

Coordinator: keep a short shared contract (collection shapes, auth state events, storage function signatures) so streams 1–2 don’t thrash. Merge carefully; run import tests after prompt/parser touches.

## Sequencing

| Can run in parallel | Must wait |
|---------------------|-----------|
| Auth/data model + Applications UI (UI stubs against contracts) + prompt generalization | Deploy / public URL until MVP works end-to-end locally |
| PDF/import preservation work alongside UI slim-down | Tight coupling of UI to final security rules before adapters exist — prefer interface first |
| Reading/inventory of Owen-coupled files | Rewriting PDF generation from scratch (don’t) |

Order of integration: (1) contracts + stubs → (2) auth + cloud adapters → (3) wire Applications UI to cloud → (4) generic prompt verified → (5) host and smoke-test public URL.

## Constraints

- **Evolve this repo**; don’t throw away Applications import/PDF. Preserve `src/cursor-import.js`, Applications downloads via `src/pdf-text-export.js`, fit ratings/tooltips, `pdf-filenames.js`, LinkedIn rules in `contact-display.js`.
- Don’t destroy useful local single-user behavior unnecessarily while migrating — introduce cloud + auth, migrate storage behind the same UX, keep import paste format stable.
- Out of v1 product UI: Home, Library, standalone resume/cover editors, Owen master-profile generation UX, shipping personal archive folders.
- Non-goals: full multi-area resume SaaS; requiring Cursor specifically (prompt is AI-agnostic).
- Do **not** rewrite the handoff doc’s target; implement it.

## Definition of done (MVP)

- [ ] Public hosted URL with signup/login
- [ ] Per-user isolated cloud data for applications (and linked resume/cover YAML)
- [ ] Applications-only UI: list, import, how-to, status/fit, delete
- [ ] Import via existing delimiter format still works; `npm run test:cursor-import` passes
- [ ] Resume + cover letter PDF download from application rows (quality comparable to today)
- [ ] How-to AI prompt is generic for any job seeker (no Owen-specific coupling in the shipped prompt)
- [ ] No reliance on shared browser `localStorage` as the sole multi-user store

## Start now

Read `docs/MULTIUSER_HANDOFF_CONTEXT.md`, propose the shared API/storage contract briefly, then **launch the parallel subagents** for the four workstreams above (deploy agent can prepare config but final publish waits until MVP works). Coordinate merges and report progress against the Definition of Done.
```
