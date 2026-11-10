import './style.css';
import { 
  createIcons, Home, BookOpen, BarChart2, FileText, Sun, Moon, 
  CheckCircle, Circle, Camera, X, Edit2, Activity, Calendar, Plus,
  Loader, Sparkles, TrendingUp, ArrowRightCircle 
} from 'lucide';
import { renderNavigation, setupNavigationLogic } from './components/navigation.js';
import { renderDashboard } from './components/dashboard.js';
import { renderInsights } from './components/insights.js';
import { renderJourney } from './components/journey.js';
import { initStorage } from './utils/storage.js';
import { renderReports } from './components/reports.js';
import { initWalkthrough } from './utils/walkthrough.js';

initStorage(); 

const app = document.querySelector('#app');
app.innerHTML = `
  <div id="nav-container"></div>
  <div id="view-container" class="view-container"></div>
`;

const viewContainer = document.getElementById('view-container');
const navContainer = document.getElementById('nav-container');

renderNavigation(navContainer);

setupNavigationLogic((view) => {
  if (view === 'today') {
    renderDashboard(viewContainer);
  } else if (view === 'insights') {
    renderInsights(viewContainer);
  } else if (view === 'progress') {
    renderJourney(viewContainer);
  } else if (view === 'reports') {
    // ROUTER FIX: Now correctly renders the Monthly Story Reports page!
    renderReports(viewContainer);
  } else {
    viewContainer.innerHTML = `
      <div style="padding-top: 80px; text-align: center; max-width: 600px; margin: 0 auto;">
        <h2>${view.charAt(0).toUpperCase() + view.slice(1)}</h2>
        <p class="subtitle" style="margin-top: 12px; font-size: 1.1rem;">This module will be implemented in a future milestone.</p>
      </div>
    `;
  }
  initializeIcons();
});

renderDashboard(viewContainer);

export function initializeIcons(extraIcons = {}) {
  createIcons({
    icons: { 
      Home, BookOpen, BarChart2, FileText, Sun, Moon, CheckCircle, 
      Circle, Camera, X, Edit2, Activity, Calendar, Plus, 
      Loader, Sparkles, TrendingUp, ArrowRightCircle,
      ...extraIcons 
    }
  });
}

initializeIcons();

// Walkthrough Initialization
setTimeout(() => {
  initWalkthrough();
  
  // Inject Walkthrough Reopen Button into the navigation
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('reopen-tour-btn')) {
    const reopenBtn = document.createElement('button');
    reopenBtn.id = 'reopen-tour-btn';
    reopenBtn.className = 'nav-item';
    reopenBtn.style.cssText = 'background:none; border:none; color:var(--color-text-faint); font-size:0.75rem; font-weight:600; cursor:pointer; align-items:center; display:flex; flex-direction:column; gap:4px; margin-top: auto; padding-top: 12px;';
    reopenBtn.innerHTML = '<i data-lucide="sparkles" style="width:22px; height:22px;"></i><span style="display:block; text-align:center; width:100%;">Tour</span>';
    
    // On desktop, adjust styling to match side-nav layout
    if (window.innerWidth >= 1024) {
       reopenBtn.style.flexDirection = 'row';
       reopenBtn.style.justifyContent = 'flex-start';
       reopenBtn.style.gap = '16px';
       reopenBtn.style.padding = '14px 20px';
       reopenBtn.style.width = '100%';
       reopenBtn.style.fontSize = '0.95rem';
       reopenBtn.style.marginTop = '0';
       reopenBtn.innerHTML = '<i data-lucide="sparkles" style="width:22px; height:22px;"></i><span>Tour</span>';
    }
    
    reopenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('progressos_walkthrough_complete');
        initWalkthrough();
    });
    
    navLinks.appendChild(reopenBtn);
    initializeIcons();
  }
}, 500);