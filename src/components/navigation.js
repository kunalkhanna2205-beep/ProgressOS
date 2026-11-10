import { getUser } from '../utils/storage.js';

export function renderNavigation(container) {
  // Use the imported getUser() function from storage.js to fetch the active user safely
  const user = getUser();
  
  // Safely grab the initial or fallback to 'U'
  const initial = user && user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const displayName = user && user.name ? user.name : 'User';

  container.innerHTML = `
    <nav class="main-nav">
      <div class="nav-brand">
        <h2>MAN MATTERS</h2>
        <div class="brand-lockup">ProgressOS / My Hair Journey</div>
      </div>
      
      <div class="nav-links">
        <button class="nav-item active" data-view="today">
          <i data-lucide="home"></i>
          <span>Overview</span>
        </button>
        <button class="nav-item" data-view="progress">
          <i data-lucide="book-open"></i>
          <span>My Journey</span>
        </button>
        <button class="nav-item" data-view="insights">
          <i data-lucide="bar-chart-2"></i>
          <span>My Insights</span>
        </button>
        <button class="nav-item" data-view="reports">
          <i data-lucide="file-text"></i>
          <span>My Reports</span>
        </button>
      </div>

      <div class="nav-profile">
        <div class="profile-avatar">${initial}</div>
        <div class="profile-info">
          <strong>${displayName}</strong>
          <span>Hair Care Plan</span>
        </div>
      </div>
    </nav>
  `;
}

export function setupNavigationLogic(onNavigate) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      navItems.forEach(nav => nav.classList.remove('active'));
      const clickedItem = e.currentTarget;
      clickedItem.classList.add('active');
      const view = clickedItem.getAttribute('data-view');
      onNavigate(view);
    });
  });
}