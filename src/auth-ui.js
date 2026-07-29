import {
  getCurrentUser,
  onAuthStateChanged,
  signIn,
  signUp,
  signOut,
  waitForAuthReady,
  isFirebaseConfigured,
} from './auth.js';
import { renderSidebar, initSidebar } from './sidebar.js';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export function renderAuthPanel({ mode = 'signin', error = '', email = '' } = {}) {
  const isSignup = mode === 'signup';
  const title = isSignup ? 'Create account' : 'Sign in to Job Applications';
  const submitLabel = isSignup ? 'Sign up' : 'Sign in';
  const switchPrompt = isSignup
    ? 'Already have an account?'
    : 'Need an account?';
  const switchLabel = isSignup ? 'Sign in' : 'Sign up';
  const switchMode = isSignup ? 'signin' : 'signup';

  return `
    <div class="auth-panel">
      <div class="auth-panel-card">
        <h2 class="auth-panel-title">${title}</h2>
        <p class="auth-panel-subtitle">Track applications and download tailored PDFs — signed in to your account.</p>
        <form class="auth-form" id="auth-form" data-mode="${mode}" novalidate>
          <label class="auth-field">
            <span class="auth-label">Email</span>
            <input
              type="email"
              name="email"
              id="auth-email"
              class="auth-input"
              autocomplete="email"
              required
              value="${escapeHtml(email)}"
            />
          </label>
          <label class="auth-field">
            <span class="auth-label">Password</span>
            <input
              type="password"
              name="password"
              id="auth-password"
              class="auth-input"
              autocomplete="${isSignup ? 'new-password' : 'current-password'}"
              required
              minlength="6"
            />
          </label>
          <p class="auth-error" id="auth-error" role="alert"${error ? '' : ' hidden'}>${escapeHtml(error)}</p>
          <button type="submit" class="btn btn-primary auth-submit" id="auth-submit">${submitLabel}</button>
        </form>
        <p class="auth-switch">
          ${switchPrompt}
          <button type="button" class="auth-switch-btn" id="auth-switch-btn" data-mode="${switchMode}">${switchLabel}</button>
        </p>
      </div>
    </div>
  `;
}

export function renderAppShell({ activeView, mainHtml, user = null }) {
  return `
    <div class="app-shell">
      ${renderSidebar(activeView, { user })}
      <div class="main-column">
        <main class="home-page">${mainHtml}</main>
      </div>
    </div>
  `;
}

/**
 * Mount auth-aware page shell.
 * When Firebase is configured, requires sign-in before renderMain.
 * When Firebase env is missing, skips the gate and uses localStorage-backed storage.
 */
export function mountAuthAwarePage(container, { activeView, renderMain, bindMain }) {
  let unsubAuth = null;
  let mode = 'signin';
  let authError = '';
  let authEmail = '';
  let renderToken = 0;
  let mainCleanup = null;

  async function paint() {
    const token = ++renderToken;
    await waitForAuthReady();
    if (token !== renderToken) return;

    const cloudEnabled = isFirebaseConfigured();
    const user = getCurrentUser();

    if (cloudEnabled && !user) {
      mainCleanup?.();
      mainCleanup = null;
      container.innerHTML = renderAppShell({
        activeView,
        user: null,
        mainHtml: renderAuthPanel({ mode, error: authError, email: authEmail }),
      });
      if (token !== renderToken) return;
      initSidebar(container);
      bindAuthForm();
      return;
    }

    authError = '';
    let mainHtml = '';
    try {
      mainHtml = await renderMain(user);
    } catch (err) {
      mainHtml = `<div class="empty-state"><div class="empty-state-title">Something went wrong</div><p class="empty-state-text">${escapeHtml(err.message || 'Failed to load.')}</p></div>`;
    }
    if (token !== renderToken) return;

    mainCleanup?.();
    mainCleanup = null;
    container.innerHTML = renderAppShell({
      activeView,
      user: cloudEnabled ? user : { email: 'Local mode' },
      mainHtml,
    });
    initSidebar(container);
    bindSignedInChrome();
    mainCleanup = bindMain?.(container) || null;
  }

  function bindAuthForm() {
    const form = container.querySelector('#auth-form');
    const switchBtn = container.querySelector('#auth-switch-btn');
    const errorEl = container.querySelector('#auth-error');
    const submitBtn = container.querySelector('#auth-submit');

    switchBtn?.addEventListener('click', () => {
      mode = switchBtn.dataset.mode === 'signup' ? 'signup' : 'signin';
      authError = '';
      paint();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector('#auth-email')?.value?.trim() || '';
      const password = form.querySelector('#auth-password')?.value || '';
      authEmail = email;
      authError = '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
      }
      try {
        if (mode === 'signup') {
          await signUp(email, password);
        } else {
          await signIn(email, password);
        }
        // onAuthStateChanged / auth:changed will re-paint
      } catch (err) {
        authError = err.message || 'Authentication failed.';
        if (errorEl) {
          errorEl.textContent = authError;
          errorEl.hidden = false;
        }
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = mode === 'signup' ? 'Sign up' : 'Sign in';
        }
      }
    });
  }

  function bindSignedInChrome() {
    container.querySelector('#auth-sign-out')?.addEventListener('click', async () => {
      try {
        await signOut();
      } catch (err) {
        alert(err.message || 'Failed to sign out.');
      }
    });
  }

  unsubAuth = onAuthStateChanged(() => {
    paint();
  });

  return {
    cleanup: () => {
      renderToken += 1;
      unsubAuth?.();
      unsubAuth = null;
      mainCleanup?.();
      mainCleanup = null;
      container.innerHTML = '';
    },
    refresh: paint,
  };
}
