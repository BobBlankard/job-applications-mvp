# Multi-User Job Applications — Deploy / Firebase Hosting

Status: **ready to deploy when MVP is green** (no public production URL published yet).

This app is a Vite SPA with a **hash router** (`#/…`). Firebase Hosting serves the static build from `dist/`.

---

## Prerequisites

1. **Firebase CLI** (use via npx):
   ```bash
   npx -y firebase-tools@latest --version
   npx -y firebase-tools@latest login
   ```
2. **Dedicated Firebase project** for this app (do **not** reuse unrelated projects such as BandHouse / PinHaus unless intentional).
   - Create in [Firebase Console](https://console.firebase.google.com/) or:
     ```bash
     npx -y firebase-tools@latest projects:create <project-id> --display-name "Job Applications"
     ```
   - Set the active project:
     ```bash
     npx -y firebase-tools@latest use <project-id>
     ```
     (updates `.firebaserc`; replace the `REPLACE_WITH_FIREBASE_PROJECT_ID` placeholder).
3. Enable products in the console (or via other workstreams’ setup):
   - **Authentication** → Email/Password
   - **Cloud Firestore**
   - **Hosting**
4. Register a **Web app** in Project settings and copy the Firebase config into env vars (below).

---

## Build output path

| Step | Output |
|------|--------|
| `vite build` | `dist/` (entry HTML is `dist/index.dev.html` because Vite input is `index.dev.html`) |
| `scripts/standalone.js` (part of `npm run build`) | Writes **`dist/index.html`** for Hosting; also copies to root `index.html` + `assets/` for local `file://` / standalone use |

**Hosting public directory:** `dist` (see `firebase.json` → `hosting.public`).

Confirm after build:

```bash
npm run build
test -f dist/index.html && ls dist/assets
```

Hash routes never hit the server as paths (`/#/applications`), so a rewrite to `index.html` is mainly for `/` and any non-hash deep links. The rewrite in `firebase.json` is still recommended.

---

## Environment variables

Copy `.env.example` → `.env` (gitignored). Vite embeds `VITE_*` at **build** time:

| Variable | Source |
|----------|--------|
| `VITE_FIREBASE_API_KEY` | Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `<project-id>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Web app ID |

Do **not** commit `.env` or other secrets. Client Firebase config is public in the browser by design; security comes from Auth + Firestore rules (WS1).

---

## Local verify

```bash
# Install & env
cp .env.example .env   # fill in values once Auth/Firestore client exists
npm install

# Dev (port 5180)
npm run dev

# Production build + Vite preview
npm run build
npm run preview

# Optional: Firebase Hosting emulator (serves dist/)
npx -y firebase-tools@latest emulators:start --only hosting
```

Smoke-check once MVP is wired: signup/login, list/import applications, PDF download, how-to prompt — against the **Definition of Done** in `docs/MULTIUSER_KICKOFF_PROMPT.md`.

---

## Merging with Auth / Firestore config (WS1)

`firebase.json` currently contains the **hosting** section only so Auth/Firestore work can add:

- `firestore.rules` / `firestore.indexes.json`
- `"firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" }`

**Do not** overwrite `firestore.rules` when editing hosting. Merge sections in one `firebase.json`.

---

## Production deploy (when MVP is green)

**Gate:** only publish a public live URL after the Definition of Done checklist is satisfied (auth + cloud data + Applications UI end-to-end locally).

1. Set `.firebaserc` project ID and fill `.env`.
2. Build + deploy Hosting only:
   ```bash
   npm run deploy:hosting
   ```
   Equivalent:
   ```bash
   npm run build
   npx -y firebase-tools@latest deploy --only hosting
   ```
3. Live URLs (after deploy): `https://<project-id>.web.app` and `https://<project-id>.firebaseapp.com`.

### Preview channel (optional, pre-live)

Safe to try before promoting to live **if** a real project ID is set and credentials work:

```bash
npm run deploy:hosting:preview
```

Or:

```bash
npm run build
npx -y firebase-tools@latest hosting:channel:deploy preview
```

---

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Signature font + Vite → `dist/` + standalone copies (incl. `dist/index.html`) |
| `npm run deploy:hosting` | Build then deploy Hosting to **live** |
| `npm run deploy:hosting:preview` | Build then deploy to a **preview** channel |

---

## Current blockers / notes

- `.firebaserc` still has placeholder `REPLACE_WITH_FIREBASE_PROJECT_ID` — create or choose a dedicated project before any deploy.
- Firebase CLI login was available in the prep environment (`o.n.doherty@gmail.com`); listed projects were **BandHouse** / **PinHaus** only — not bound as this app’s default.
- Final public URL publish waits on MVP Definition of Done (other workstreams).
