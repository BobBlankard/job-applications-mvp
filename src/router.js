import { mountHomePage } from './pages/home.js';
import { mountEditorPage } from './pages/editor.js';
import { mountCoverLettersPage } from './pages/cover-letters.js';
import { mountCoverLetterEditorPage } from './pages/cover-letter-editor.js';

let currentCleanup = null;
let homeController = null;
let coverLettersController = null;

export function navigate(path) {
  const normalized = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash !== normalized) {
    window.location.hash = normalized;
  } else {
    renderRoute();
  }
}

function parseRoute() {
  const hash = window.location.hash.slice(1) || '/';
  if (hash === '/' || hash === '/home') {
    return { name: 'home', view: 'home' };
  }
  if (hash === '/library') {
    return { name: 'home', view: 'library' };
  }
  if (hash === '/cover-letters') {
    return { name: 'cover-letters' };
  }
  const coverLetterEditMatch = hash.match(/^\/cover-letter\/edit\/([^/]+)$/);
  if (coverLetterEditMatch) {
    return { name: 'cover-letter-edit', id: coverLetterEditMatch[1] };
  }
  const editMatch = hash.match(/^\/edit\/([^/]+)$/);
  if (editMatch) {
    return { name: 'edit', id: editMatch[1] };
  }
  return { name: 'home', view: 'home' };
}

function clearShellControllers() {
  if (homeController) {
    homeController.cleanup();
    homeController = null;
  }
  if (coverLettersController) {
    coverLettersController.cleanup();
    coverLettersController = null;
  }
}

function renderRoute() {
  const app = document.getElementById('app');
  if (!app) return;

  const route = parseRoute();

  if (route.name === 'edit') {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    clearShellControllers();
    currentCleanup = mountEditorPage(app, route.id);
    return;
  }

  if (route.name === 'cover-letter-edit') {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    clearShellControllers();
    currentCleanup = mountCoverLetterEditorPage(app, route.id);
    return;
  }

  if (route.name === 'cover-letters') {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (homeController) {
      homeController.cleanup();
      homeController = null;
    }
    if (!coverLettersController) {
      coverLettersController = mountCoverLettersPage(app);
      currentCleanup = () => {
        coverLettersController?.cleanup();
        coverLettersController = null;
      };
    }
    return;
  }

  if (coverLettersController) {
    coverLettersController.cleanup();
    coverLettersController = null;
  }

  if (homeController) {
    homeController.setView(route.view);
    return;
  }

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  homeController = mountHomePage(app, route.view);
  currentCleanup = () => {
    homeController?.cleanup();
    homeController = null;
  };
}

export function initRouter() {
  window.addEventListener('hashchange', renderRoute);
  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    renderRoute();
  }
}
