/**
 * Auth UI helpers for the Applications shell.
 * Shared mounting lives in `auth-ui.js`; this module is the pages-facing entry.
 */
import { getCurrentUser, signOut, isFirebaseConfigured } from '../auth.js';

export {
  renderAuthPanel as renderAuthGate,
  mountAuthAwarePage,
  renderAppShell,
} from '../auth-ui.js';

export {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  waitForAuthReady,
  isFirebaseConfigured,
  requireAuth,
} from '../auth.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

/** Optional sidebar controls when a page renders sidebar without auth-ui shell. */
export function renderSidebarAuthControls() {
  if (!isFirebaseConfigured()) {
    return `
      <div class="sidebar-auth">
        <div class="sidebar-auth-user" title="Local mode">
          <span class="sidebar-auth-email">Local mode</span>
        </div>
      </div>
    `;
  }
  const user = getCurrentUser();
  if (!user) {
    return `
      <div class="sidebar-auth">
        <a href="#/applications" class="sidebar-auth-link" title="Sign in">Sign in</a>
      </div>
    `;
  }
  return `
    <div class="sidebar-auth">
      <div class="sidebar-auth-user" title="${escapeHtml(user.email || '')}">
        <span class="sidebar-auth-email">${escapeHtml(user.email || 'Signed in')}</span>
      </div>
      <button type="button" class="btn btn-secondary btn-sm sidebar-sign-out" id="auth-sign-out" title="Sign out">
        Sign out
      </button>
    </div>
  `;
}

export function bindSidebarAuthControls(container) {
  container.querySelector('#auth-sign-out')?.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (err) {
      alert(err?.message || 'Failed to sign out.');
    }
  });
}
