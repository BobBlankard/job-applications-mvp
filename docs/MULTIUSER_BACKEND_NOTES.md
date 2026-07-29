# Multi-User Backend Notes

## Firebase project setup

1. Create a Firebase project (Console or CLI):
   ```bash
   npx -y firebase-tools@latest login
   npx -y firebase-tools@latest projects:create <project-id> --display-name "Job Applications"
   ```
2. Register a **Web** app in the project and copy the Firebase config.
3. Enable **Authentication → Email/Password**.
4. Create a **Cloud Firestore** database (production mode is fine; deploy rules next).
5. Set the active project:
   ```bash
   npx -y firebase-tools@latest use <project-id>
   ```
   Or edit `.firebaserc` and replace `YOUR_FIREBASE_PROJECT_ID`.

## Environment variables

Copy `.env.example` to `.env.local` (gitignored) and fill in values from the Firebase web app config:

```bash
cp .env.example .env.local
```

Required keys: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`.

Restart `npm run dev` after changing env.

## Deploy rules (not hosting)

Hosting deploy is owned by Workstream 4. You can deploy Firestore rules only:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

## Local / offline fallback

If `VITE_FIREBASE_*` vars are missing, storage keeps an async `localStorage` fallback for local development. **Production must use Firestore** with Auth enabled.

## Auth UX

Applications page gates the tracker behind signup/sign-in when Firebase is configured. Sign-out lives in the sidebar account controls.
