# Multi-User API / Storage Contract

Shared contract for Job Applications MVP workstreams. **Implement exactly** — other streams should align to this document.

## Stack

- Keep Vanilla JS + Vite SPA
- **Firebase Auth** (email/password signup + sign-in)
- **Cloud Firestore** for per-user data
- Optional thin Firebase init: `src/firebase.js` reading `import.meta.env` (`VITE_FIREBASE_*`)

## Auth module: `src/auth.js`

```js
// Events: window CustomEvent 'auth:changed' with detail { user: AuthUser|null }
onAuthStateChanged(callback) // subscribe; returns unsubscribe
getCurrentUser() // { uid, email } | null
signUp(email, password) // Promise<AuthUser>
signIn(email, password) // Promise<AuthUser>
signOut() // Promise<void>
requireAuth() // throws or returns user; used by storage
```

`AuthUser` shape: `{ uid: string, email: string | null }`.

Helpers also exported: `waitForAuthReady()`, `isFirebaseConfigured()`.

When Firebase env is missing, `requireAuth()` returns a local stub `{ uid: 'local', email: null }` so storage can use the async localStorage fallback.
## Firestore schema

```
users/{uid}
  email, createdAt

users/{uid}/applications/{applicationId}
  // same fields as today's application-storage records (no need to store userId redundantly if path-scoped)
  // id, company, title, location, roleNumber, jobDescription, asksForLinkedin, status,
  // resumeYaml, coverLetterYaml, resumeTemplateId, coverLetterTemplateId,
  // baseResumeId, resumeId, coverLetterId,
  // fitAssessment, fitRecommendation, fitRating, fitScore, fitSummary,
  // createdAt, appliedAt, updatedAt

users/{uid}/resumes/{resumeId}
  id, name, templateId, yaml, createdAt, updatedAt

users/{uid}/coverLetters/{coverLetterId}
  id, name, templateId, yaml, createdAt, updatedAt
```

Timestamps are ISO-8601 strings (compatible with existing UI). Document `id` matches the Firestore document ID.

### Security rules

Users can only read/write their own `users/{uid}/**`. No public read of data.

## Storage adapters

Preserve exported function **names**; make them **async** (return Promises).

### `src/application-storage.js`

- `getAllApplications()` → `Promise<Application[]>`
- `getApplication(id)` → `Promise<Application|null>`
- `createApplication(fields)` → `Promise<Application>`
- `updateApplication(id, updates)` → `Promise<Application|null>`
- `deleteApplication(id)` → `Promise<boolean>`
- Keep exporting `APPLICATION_STATUSES`, `normalizeApplicationStatus`, `DEFAULT_*_TEMPLATE_ID`

### `src/storage.js`

- `getAllResumes`, `getResume`, `createResume`, `updateResume`, `deleteResume` — all async Promises
- `migrateLegacyStorage` — no-op or skip cloud seed (don't auto-create Jane Doe for every user)

### `src/cover-letter-storage.js`

- Same CRUD pattern, async: `getAllCoverLetters`, `getCoverLetter`, `createCoverLetter`, `updateCoverLetter`, `deleteCoverLetter`

## Behavior

- When Firebase env is configured and the user is signed in, storage reads/writes Firestore under `users/{uid}/…`.
- Storage calls use `requireAuth()` in cloud mode.
- When `VITE_FIREBASE_*` env vars are missing, the same async API may fall back to `localStorage` for local offline/dev.
- **Production uses Firestore.** Local fallback is migration/dev only.

## Callers

All call sites of these storage functions must `await` them (especially Applications import/list/update/delete).
