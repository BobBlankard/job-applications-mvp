import { renderAppLogo } from './logo.js';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';
const HOVER_LEAVE_DELAY_MS = 140;

const NAV_ITEMS = [
  {
    id: 'applications',
    href: '#/applications',
    label: 'Applications',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="5" width="14" height="12" rx="1"/><path d="M7 5V4a3 3 0 0 1 6 0v1"/><path d="M10 10v3"/></svg>`,
  },
  {
    id: 'applications-how-to',
    href: '#/applications-how-to',
    label: 'How To',
    icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M10 9v5"/><path d="M10 6.5h.01"/></svg>`,
  },
];

const sidebarControllers = new WeakMap();

function canHoverPreview() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export function isSidebarCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function setSidebarCollapsed(collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    /* storage unavailable */
  }
}

function renderNavLinks(activeView) {
  return NAV_ITEMS.map((item) => {
    const active = activeView === item.id ? ' active' : '';
    return `
      <a href="${item.href}" class="sidebar-link${active}" data-nav="${item.id}" title="${item.label}">
        <span class="sidebar-icon">${item.icon}</span>
        <span class="sidebar-link-label">${item.label}</span>
      </a>
    `;
  }).join('');
}

function renderAuthFooter(user) {
  if (!user) return '';
  const email = user.email || 'Signed in';
  const isLocal = email === 'Local mode';
  return `
    <div class="sidebar-auth">
      <div class="sidebar-auth-user" title="${escapeHtml(email)}">
        <span class="sidebar-auth-email">${escapeHtml(email)}</span>
      </div>
      ${
        isLocal
          ? ''
          : `<button type="button" class="btn btn-secondary btn-sm sidebar-sign-out" id="auth-sign-out" title="Sign out">
        Sign out
      </button>`
      }
    </div>
  `;
}

export function renderSidebar(activeView, { user = null } = {}) {
  const signedIn = Boolean(user);
  // Auth gate: keep brand expanded (logo + name); hide app nav until signed in.
  const collapsed = signedIn ? isSidebarCollapsed() : false;
  return `
    <aside class="sidebar${collapsed ? ' sidebar--collapsed' : ''}${signedIn ? '' : ' sidebar--auth-gate'}" aria-label="Main navigation">
      <div class="sidebar-brand">
        <a href="#/applications" class="sidebar-brand-link" title="Job Applications">
          ${renderAppLogo({ className: 'sidebar-logo', size: 32 })}
          <span class="sidebar-brand-text">
            <span class="sidebar-title">Job Applications</span>
            <span class="sidebar-tagline">Import · Track · Download</span>
          </span>
        </a>
      </div>
      ${
        signedIn
          ? `<nav class="sidebar-nav">${renderNavLinks(activeView)}</nav>`
          : ''
      }
      ${renderAuthFooter(user)}
      ${
        signedIn
          ? `<button
        type="button"
        class="sidebar-toggle"
        id="sidebar-toggle"
        aria-label="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
        aria-expanded="${!collapsed}"
        title="${collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"
      >
        <svg class="sidebar-toggle-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <path d="M12 4 6 10l6 6"/>
        </svg>
      </button>`
          : ''
      }
    </aside>
  `;
}

export function initSidebar(container) {
  const shell = container.querySelector('.app-shell');
  const sidebar = container.querySelector('.sidebar');
  const toggle = container.querySelector('#sidebar-toggle');
  if (!shell || !sidebar || !toggle) return;

  const existing = sidebarControllers.get(container);
  if (existing) existing.abort();

  const controller = new AbortController();
  const { signal } = controller;
  sidebarControllers.set(container, controller);

  let leaveTimer = null;

  const isCollapsed = () => shell.classList.contains('sidebar-collapsed');
  const isVisuallyExpanded = () => !isCollapsed() || sidebar.classList.contains('sidebar--hover-preview');

  const updateToggleA11y = () => {
    const expanded = isVisuallyExpanded();
    toggle.setAttribute('aria-label', expanded ? 'Collapse sidebar' : 'Expand sidebar');
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
  };

  const clearHoverPreview = () => {
    sidebar.classList.remove('sidebar--hover-preview');
    shell.classList.remove('sidebar-hover-preview');
    updateToggleA11y();
  };

  const setHoverPreview = (active) => {
    if (!canHoverPreview() || !isCollapsed()) {
      clearHoverPreview();
      return;
    }
    sidebar.classList.toggle('sidebar--hover-preview', active);
    shell.classList.toggle('sidebar-hover-preview', active);
    updateToggleA11y();
  };

  const applyCollapsed = (collapsed) => {
    shell.classList.toggle('sidebar-collapsed', collapsed);
    sidebar.classList.toggle('sidebar--collapsed', collapsed);
    if (!collapsed) clearHoverPreview();
    updateToggleA11y();
  };

  applyCollapsed(isSidebarCollapsed());

  toggle.addEventListener('click', () => {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    clearHoverPreview();
    const collapsed = !isCollapsed();
    applyCollapsed(collapsed);
    setSidebarCollapsed(collapsed);
  }, { signal });

  sidebar.addEventListener('mouseenter', () => {
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      leaveTimer = null;
    }
    if (isCollapsed() && canHoverPreview()) {
      setHoverPreview(true);
    }
  }, { signal });

  sidebar.addEventListener('mouseleave', () => {
    if (!canHoverPreview() || !isCollapsed()) return;
    leaveTimer = window.setTimeout(() => {
      setHoverPreview(false);
      leaveTimer = null;
    }, HOVER_LEAVE_DELAY_MS);
  }, { signal });
}
