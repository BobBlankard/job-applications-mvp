export function renderSidebar(activeView) {
  return `
    <aside class="sidebar" aria-label="Main navigation">
      <div class="sidebar-brand">
        <h1 class="sidebar-title">Resume Builder</h1>
        <p class="sidebar-tagline">ATS-friendly · One page</p>
      </div>
      <nav class="sidebar-nav">
        <a href="#/" class="sidebar-link${activeView === 'home' ? ' active' : ''}" data-nav="home">
          <span class="sidebar-icon" aria-hidden="true">🏠</span>
          <span>Home</span>
        </a>
        <a href="#/library" class="sidebar-link${activeView === 'library' ? ' active' : ''}" data-nav="library">
          <span class="sidebar-icon" aria-hidden="true">📚</span>
          <span>Library</span>
        </a>
        <a href="#/cover-letters" class="sidebar-link${activeView === 'cover-letters' ? ' active' : ''}" data-nav="cover-letters">
          <span class="sidebar-icon" aria-hidden="true">✉️</span>
          <span>Cover Letters</span>
        </a>
      </nav>
    </aside>
  `;
}
