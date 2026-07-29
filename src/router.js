import { mountApplicationsPage } from './pages/applications.js';
import { mountApplicationsHowToPage } from './pages/applications-how-to.js';

let currentCleanup = null;
let applicationsController = null;
let applicationsHowToController = null;

export function navigate(path) {
  const normalized = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash !== normalized) {
    window.location.hash = normalized;
  } else {
    renderRoute();
  }
}

function parseRoute() {
  const hash = window.location.hash.slice(1) || '/applications';

  if (hash === '/applications') {
    return { name: 'applications' };
  }
  if (hash === '/applications-how-to') {
    return { name: 'applications-how-to' };
  }

  // Dropped product surfaces redirect to Applications
  if (
    hash === '/' ||
    hash === '/home' ||
    hash === '/library' ||
    hash === '/cover-letters' ||
    /^\/edit\/[^/]+$/.test(hash) ||
    /^\/cover-letter\/edit\/[^/]+$/.test(hash)
  ) {
    return { name: 'redirect', to: '#/applications' };
  }

  return { name: 'redirect', to: '#/applications' };
}

function renderRoute() {
  const app = document.getElementById('app');
  if (!app) return;

  const route = parseRoute();

  if (route.name === 'redirect') {
    if (window.location.hash !== route.to) {
      window.location.hash = route.to;
    }
    return;
  }

  if (route.name === 'applications') {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (applicationsHowToController) {
      applicationsHowToController.cleanup();
      applicationsHowToController = null;
    }
    if (!applicationsController) {
      applicationsController = mountApplicationsPage(app);
      currentCleanup = () => {
        applicationsController?.cleanup();
        applicationsController = null;
      };
    }
    return;
  }

  if (route.name === 'applications-how-to') {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (applicationsController) {
      applicationsController.cleanup();
      applicationsController = null;
    }
    if (!applicationsHowToController) {
      applicationsHowToController = mountApplicationsHowToPage(app);
      currentCleanup = () => {
        applicationsHowToController?.cleanup();
        applicationsHowToController = null;
      };
    }
  }
}

export function initRouter() {
  window.addEventListener('hashchange', renderRoute);
  if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
    window.location.hash = '#/applications';
  } else {
    renderRoute();
  }
}
