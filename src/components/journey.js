import { initializeIcons } from '../main.js';
import { processImage } from '../utils/image.js';
import { addEntry, getEntries, deleteEntry, clearAllEntries } from '../utils/db.js';
import { getLocalDateString } from '../utils/date.js';
import { setDocumented, logActivity, resetDemoData, getHistory } from '../utils/storage.js';
import { getDemoJourneyData, DEMO_DATA_VERSION } from '../data/demoJourney.js';
import { calculateAdherence, calculateDocumentation } from '../utils/analytics.js';

// Global cache for Object URLs to prevent memory leaks across re-renders
let objectUrlCache = [];

function cleanupObjectUrls() {
  objectUrlCache.forEach(url => URL.revokeObjectURL(url));
  objectUrlCache = [];
}

export async function renderJourney(container) {
  // Free memory from previous renders
  cleanupObjectUrls();

  container.innerHTML = `
    <div class="dashboard-content journey-view">
      <div class="dashboard-header" style="margin-bottom: 32px;">
        <h1 style="margin-top: 0; margin-bottom: 4px;">My Journey</h1>
        <p class="subtitle" style="margin-top: 0;">Your personal progress and observation timeline.</p>
      </div>
      <div style="text-align: center; padding: 48px; color: var(--color-text-faint);">
        <i data-lucide="loader" class="spin" style="width: 32px; height: 32px; margin-bottom: 16px;"></i>
        <p>Loading your journey...</p>
      </div>
    </div>
  `;
  initializeIcons();

  try {
    const storedVersion = localStorage.getItem('progressos_demo_version');
    if (storedVersion !== DEMO_DATA_VERSION) {
      await clearAllEntries();
      resetDemoData();
      localStorage.setItem('progressos_demo_version', DEMO_DATA_VERSION);
    }

    const history = getHistory();
    const realEntries = await getEntries();
    const urlParams = new URLSearchParams(window.location.search);
    const forceDemo = urlParams.get('viewDemo') === 'true';

    let renderEntries = [];
    if (realEntries.length > 0 && !forceDemo) {
        renderEntries = realEntries;
    } else {
        renderEntries = getDemoJourneyData();
    }
    
    renderEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const groupedEntries = {};
    renderEntries.forEach(entry => {
      if (!groupedEntries[entry.date]) {
        groupedEntries[entry.date] = [];
      }
      groupedEntries[entry.date].push(entry);
    });

    const sortedDates = Object.keys(groupedEntries).sort((a, b) => new Date(b) - new Date(a));

    const getImgSrc = (entry) => {
      if (!entry) return '';
      if (entry.imageUrl) return entry.imageUrl;
      if (entry.imageBlob) {
        const url = URL.createObjectURL(entry.imageBlob);
        objectUrlCache.push(url);
        return url;
      }
      return '';
    };

    // Filter to only entries that actually have an image
    const photoEntries = renderEntries.filter(e => e.imageBlob || e.imageUrl);

    let timelineHTML = '';
    
    if (sortedDates.length === 0) {
      timelineHTML = `
        <div class="card empty-state-card">
          <div class="empty-state-content">
            <div class="empty-state-icon"><i data-lucide="camera"></i></div>
            <h3>Document Your Progress</h3>
            <p class="metric-context" style="max-width: 480px; margin: 0 auto 24px auto; text-align: center;">
              Consistent photographs and notes help you objectively track your personal experience over time. Creating a centralized record reduces reliance on memory and scattered camera rolls.
            </p>
            <button id="open-entry-modal" class="btn-primary">
              <i data-lucide="plus" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 6px;"></i>
              Add New Entry
            </button>
          </div>
        </div>
      `;
    } else {
      
      // Calculate true tracking start date from history
      let trackingSinceFormatted = 'No routine history yet';
      if (history.length > 0) {
          const earliestHistoryDateStr = history.reduce((min, p) => p.date < min ? p.date : min, history[0].date);
          trackingSinceFormatted = new Date(earliestHistoryDateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }

      // Shared analytics for accurate documentation counts
      const docMetrics = calculateDocumentation(renderEntries, history, "1970-01-01", "2100-01-01");
      
      const contextHTML = `
        <div class="journey-context-banner">
          <div class="context-stat"><strong>${docMetrics.documentedDays}</strong> Documented Days</div>
          <div class="context-stat"><strong>${docMetrics.journalCount}</strong> Entries &middot; <strong>${docMetrics.photoCount}</strong> Photos</div>
          <div class="context-stat">Tracking since <strong>${trackingSinceFormatted}</strong></div>
        </div>
      `;

      let compareHTML = '';
      
      if (photoEntries.length >= 2) {
        // Defaults: Oldest vs Newest valid photographs
        const oldest = photoEntries[photoEntries.length - 1];
        const newest = photoEntries[0];
        
        const optionsHTML = (selectedId) => photoEntries.map(e => {
          const dateLabel = new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const weekLabel = e.weekNumber ? `Week ${e.weekNumber} - ` : '';
          const isSelected = e.id === selectedId ? 'selected' : '';
          return `<option value="${e.id}" ${isSelected}>${weekLabel}${dateLabel}</option>`;
        }).join('');

        // Calculate initial adherence between defaults
        const d1 = oldest.date;
        const d2 = newest.date;
        const startD = d1 < d2 ? d1 : d2;
        const endD = d1 > d2 ? d1 : d2;
        const initialAdherence = calculateAdherence(history, startD, endD);
        
        let initialAdherenceText = '';
        if (initialAdherence.totalExpected > 0) {
            initialAdherenceText = `You followed your recorded routine on <strong>${initialAdherence.totalRate}%</strong> of scheduled sessions between these photographs (${initialAdherence.totalDone}/${initialAdherence.totalExpected}).`;
        } else {
            initialAdherenceText = `Not enough routine history to calculate consistency between these dates.`;
        }

        compareHTML = `
          <div class="card" style="margin-bottom: 32px; padding: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
              <h3 style="margin:0; font-family: 'DM Sans', sans-serif; font-size: 1.2rem; color: var(--color-brand-blue);"><i data-lucide="columns" style="width:18px;height:18px;margin-right:8px;vertical-align:text-bottom;"></i> Compare your journey</h3>
            </div>
            
            <div class="compare-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px;">
              <!-- Earlier Photo -->
              <div style="display: flex; flex-direction: column;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; margin-bottom: 8px;">Earlier photograph</label>
                <select id="compare-old-select" style="padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; background: var(--color-card-bg); margin-bottom: 12px; width: 100%;">
                    ${optionsHTML(oldest.id)}
                </select>
                <div style="width: 100%; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-bg-main);">
                    <img id="compare-old-img" src="${getImgSrc(oldest)}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;" onerror="this.style.display='none'" />
                </div>
                <p id="compare-old-date" style="font-weight:700; font-size: 0.95rem; margin-top: 12px; margin-bottom: 4px;">${new Date(oldest.timestamp).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}</p>
                <p id="compare-old-note" style="font-size: 0.95rem; color: var(--color-text-muted); margin: 0; font-style: italic;">${oldest.note || ''}</p>
              </div>
              
              <!-- Later Photo -->
              <div style="display: flex; flex-direction: column;">
                <label style="font-size: 0.85rem; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; margin-bottom: 8px;">Later photograph</label>
                <select id="compare-new-select" style="padding: 10px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; background: var(--color-card-bg); margin-bottom: 12px; width: 100%;">
                    ${optionsHTML(newest.id)}
                </select>
                <div style="width: 100%; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-bg-main);">
                    <img id="compare-new-img" src="${getImgSrc(newest)}" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; display: block;" onerror="this.style.display='none'" />
                </div>
                <p id="compare-new-date" style="font-weight:700; font-size: 0.95rem; margin-top: 12px; margin-bottom: 4px;">${new Date(newest.timestamp).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'})}</p>
                <p id="compare-new-note" style="font-size: 0.95rem; color: var(--color-text-muted); margin: 0; font-style: italic;">${newest.note || ''}</p>
              </div>
            </div>
            
            <div id="comparison-adherence-result" style="margin-top: 24px; padding: 16px; background: var(--color-bg-main); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: 0.95rem; color: var(--color-text-main);">
                <i data-lucide="${initialAdherence.totalExpected > 0 ? 'bar-chart-2' : 'info'}" style="width:18px;height:18px;vertical-align:text-bottom;margin-right:8px;color:${initialAdherence.totalExpected > 0 ? 'var(--color-brand-blue)' : 'var(--color-text-muted)'};"></i> 
                <span id="comparison-adherence-result-text">${initialAdherenceText}</span>
            </div>
          </div>
        `;
      } else {
        compareHTML = `
          <div class="card" style="margin-bottom: 32px; padding: 32px; text-align: center; color: var(--color-text-faint);">
            <i data-lucide="image" style="width:32px;height:32px;opacity:0.4;margin-bottom:12px;"></i>
            <p style="margin:0;">Upload at least two photographs to unlock the visual comparison tool.</p>
          </div>
        `;
      }

      let allEntriesHTML = '';
      
      sortedDates.forEach(date => {
        const displayDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        groupedEntries[date].forEach(entry => {
          const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          
          let mediaHTML = '';
          if (entry.imageBlob || entry.imageUrl) {
            const src = getImgSrc(entry);
            mediaHTML = `
              <div class="entry-media" style="margin-bottom: 12px;">
                <img src="${src}" alt="Progress photo" class="journey-photo" onerror="this.style.display='none'" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 6px; background: #E5E9F0; cursor: pointer;" />
              </div>
            `;
          }

          const noteHTML = entry.note ? `<div class="entry-note-container"><p class="entry-note" style="margin: 0; font-size: 0.9rem; color: var(--color-text-main);">${entry.note}</p></div>` : '';
          
          const deleteAction = entry.isDemo ? '' : `
            <button class="btn-text delete-entry-btn" data-id="${entry.id}" data-date="${entry.date}" title="Delete Entry" style="width: 100%; padding: 8px; margin-top: 12px; color: var(--color-brand-red); background: #FDF4F4; border: 1px solid rgba(227, 59, 59, 0.3); border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem; cursor: pointer;">
              <i data-lucide="trash-2" style="width: 14px; height: 14px; display:inline-block; vertical-align: middle; margin-right: 4px;"></i> Delete
            </button>
          `;

          allEntriesHTML += `
            <div class="journey-entry-card card" style="display: flex; flex-direction: column; justify-content: space-between; height: 100%; padding: 16px; margin-bottom: 0;">
              <div>
                <div class="entry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border);">
                  <span class="entry-time" style="font-weight: 700; color: var(--color-brand-blue); font-size: 0.95rem;">${displayDate}</span>
                  <span class="entry-time" style="font-size: 0.8rem; color: var(--color-text-faint);">${time}</span>
                </div>
                ${mediaHTML}
                ${noteHTML}
              </div>
              ${deleteAction}
            </div>
          `;
        });
      });

      const demoWarning = renderEntries.some(e => e.isDemo) ? `
        <div class="demo-warning-banner" style="margin-bottom: 24px; padding: 12px 16px; background: #FFF4E5; border: 1px solid #FFB020; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <i data-lucide="info" style="color: #B27B16;"></i>
            <span style="color: #8C6111; font-weight: 500;">Recruiter Demo Mode: Timeline includes pre-loaded historical data.</span>
          </div>
          <a href="#" id="reset-demo-btn" style="color: #8C6111; font-weight: 700;">Reset demo data</a>
        </div>
      ` : '';

      timelineHTML = `
        ${demoWarning}
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
          ${contextHTML}
          <button id="open-entry-modal" class="btn-primary" style="width: auto; padding: 10px 20px;">
            <i data-lucide="plus" style="width: 16px; height: 16px; display: inline-block; vertical-align: text-bottom; margin-right: 6px;"></i>
            Add Entry
          </button>
        </div>

        ${compareHTML}
        
        <div class="timeline-container">
          <!-- FIXED: Replaced standard block layout with a responsive multi-column grid -->
          <div class="timeline-entries-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
            ${allEntriesHTML}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="dashboard-content journey-view">
        <div class="dashboard-header" style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h1 style="margin-top: 0; margin-bottom: 4px;">My Journey</h1>
            <p class="subtitle" style="margin-top: 0;">Your personal progress and observation timeline.</p>
          </div>
        </div>
        
        <div id="journey-success-banner" class="status-badge success hidden" style="margin-bottom: 24px; padding: 16px; background: var(--color-nav-active-bg); border-radius: var(--radius-sm); border: 1px solid var(--color-brand-blue);">
          <i data-lucide="check-circle" style="width: 20px; height: 20px;"></i> 
          <span style="font-weight: 500;">Entry saved successfully!</span>
        </div>

        ${timelineHTML}
      </div>

      <!-- Add Entry Modal -->
      <div id="add-entry-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width: 500px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h3 style="margin: 0; font-family: 'DM Sans', sans-serif; font-size: 1.4rem;">New Journal Entry</h3>
            <button id="close-entry-modal" class="btn-text" style="padding: 4px; color: var(--color-text-main);"><i data-lucide="x"></i></button>
          </div>
          
          <div id="entry-error" class="comeback-banner hidden" style="padding: 12px; margin-bottom: 16px;"></div>

          <div style="margin-bottom: 20px;">
            <label style="display:block; font-weight: 600; margin-bottom: 8px;">Progress Photograph (Optional)</label>
            
            <div id="image-preview-container" class="hidden" style="position: relative; margin-bottom: 12px; background: var(--color-bg-main); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: 8px; text-align: center;">
              <img id="image-preview" src="" style="max-height: 250px; max-width: 100%; border-radius: 4px; object-fit: contain;" />
              <button id="remove-image-btn" class="btn-text" style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.95); padding: 6px 12px; border-radius: 4px; font-size: 0.85rem; font-weight: 700; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">Remove</button>
            </div>

            <input type="file" id="photo-upload" accept="image/jpeg, image/png, image/webp" capture="user" class="hidden" />
            <button id="trigger-upload-btn" class="btn-outline" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
              <i data-lucide="camera"></i> Select Photograph
            </button>
          </div>

          <div style="margin-bottom: 32px;">
            <label style="display:block; font-weight: 600; margin-bottom: 8px;">Observation (Optional)</label>
            <textarea id="note-input" rows="4" style="width: 100%; padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; resize: vertical;" placeholder="How is your progress today?"></textarea>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <button id="cancel-entry-btn" class="btn-text">Cancel</button>
            <button id="save-entry-btn" class="btn-primary" style="width: auto; padding: 12px 32px;">Save Entry</button>
          </div>
        </div>
      </div>
    `;

    attachModalEvents(container);
    attachTimelineEvents(container, groupedEntries, photoEntries, history);
    initializeIcons();

  } catch (err) {
    container.innerHTML = `
      <div class="dashboard-content">
        <h2>Error Loading Journey</h2>
        <p>${err.message}</p>
      </div>
    `;
  }
}

// Modal Logic
function attachModalEvents(container) {
  const modal = document.getElementById('add-entry-modal');
  const openBtn = document.getElementById('open-entry-modal');
  if (!openBtn || !modal) return;
  
  const closeBtn = document.getElementById('close-entry-modal');
  const cancelBtn = document.getElementById('cancel-entry-btn');
  const saveBtn = document.getElementById('save-entry-btn');
  
  const uploadInput = document.getElementById('photo-upload');
  const triggerUploadBtn = document.getElementById('trigger-upload-btn');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImage = document.getElementById('image-preview');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const noteInput = document.getElementById('note-input');
  const errorBanner = document.getElementById('entry-error');
  const successBanner = document.getElementById('journey-success-banner');

  let currentBlob = null;
  let currentObjectUrl = null;

  const resetForm = () => {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentBlob = null;
    currentObjectUrl = null;
    uploadInput.value = '';
    noteInput.value = '';
    previewContainer.classList.add('hidden');
    triggerUploadBtn.classList.remove('hidden');
    errorBanner.classList.add('hidden');
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'Save Entry';
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    resetForm();
  };

  openBtn.addEventListener('click', () => {
    successBanner?.classList.add('hidden');
    modal.classList.remove('hidden');
  });

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  triggerUploadBtn.addEventListener('click', () => uploadInput.click());

  uploadInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    errorBanner.classList.add('hidden');
    triggerUploadBtn.textContent = 'Processing...';
    triggerUploadBtn.disabled = true;

    try {
      const blob = await processImage(file);
      currentBlob = blob;
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = URL.createObjectURL(blob);
      previewImage.src = currentObjectUrl;
      previewContainer.classList.remove('hidden');
      triggerUploadBtn.classList.add('hidden');
    } catch (err) {
      errorBanner.innerHTML = `<strong>Unsupported Format</strong><p>${err.message}</p>`;
      errorBanner.classList.remove('hidden');
    } finally {
      triggerUploadBtn.innerHTML = '<i data-lucide="camera"></i> Select Photograph';
      triggerUploadBtn.disabled = false;
      uploadInput.value = '';
      initializeIcons();
    }
  });

  removeImageBtn.addEventListener('click', () => {
    if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
    currentBlob = null;
    currentObjectUrl = null;
    previewContainer.classList.add('hidden');
    triggerUploadBtn.classList.remove('hidden');
  });

  saveBtn.addEventListener('click', async () => {
    const note = noteInput.value.trim();
    if (!currentBlob && !note) {
      errorBanner.innerHTML = `<strong>Invalid Entry</strong><p>Add a photograph or observation to save.</p>`;
      errorBanner.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving...';
    errorBanner.classList.add('hidden');

    try {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const date = getLocalDateString();
      const timestamp = new Date().toISOString();

      await addEntry({ id, date, timestamp, note, imageBlob: currentBlob });
      setDocumented(date, true);
      logActivity(currentBlob ? 'Progress photo added' : 'Journal note added', 'Just now');
      
      closeModal();
      
      window.history.pushState({}, '', window.location.pathname);
      await renderJourney(container); 
      
      const newSuccessBanner = document.getElementById('journey-success-banner');
      if(newSuccessBanner) newSuccessBanner.classList.remove('hidden');

    } catch (err) {
      errorBanner.innerHTML = `<strong>Storage Error</strong><p>${err.message}</p>`;
      errorBanner.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Entry';
    }
  });
}

function attachTimelineEvents(container, groupedEntries, photoEntries, history) {
  const selOld = document.getElementById('compare-old-select');
  const selNew = document.getElementById('compare-new-select');

  if (selOld && selNew && photoEntries && photoEntries.length >= 2) {
    let lastOldId = selOld.value;
    let lastNewId = selNew.value;

    const getSrc = (e) => {
      if (e.imageUrl) return e.imageUrl;
      if (e.imageBlob) {
        const url = URL.createObjectURL(e.imageBlob);
        objectUrlCache.push(url);
        return url;
      }
      return '';
    };

    const updateCompareUI = (e) => {
      if (selOld.value === selNew.value) {
        if (e.target.id === 'compare-old-select') {
          selOld.value = lastOldId;
        } else {
          selNew.value = lastNewId;
        }
      }
      
      lastOldId = selOld.value;
      lastNewId = selNew.value;
      
      const eOld = photoEntries.find(entry => String(entry.id) === String(selOld.value));
      const eNew = photoEntries.find(entry => String(entry.id) === String(selNew.value));
      
      if (eOld) {
        document.getElementById('compare-old-img').src = getSrc(eOld);
        document.getElementById('compare-old-date').textContent = new Date(eOld.timestamp).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'});
        document.getElementById('compare-old-note').textContent = eOld.note || '';
      }
      if (eNew) {
        document.getElementById('compare-new-img').src = getSrc(eNew);
        document.getElementById('compare-new-date').textContent = new Date(eNew.timestamp).toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'});
        document.getElementById('compare-new-note').textContent = eNew.note || '';
      }

      const resText = document.getElementById('comparison-adherence-result-text');
      
      if (eOld && eNew && resText) {
        const startD = eOld.date < eNew.date ? eOld.date : eNew.date;
        const endD = eOld.date > eNew.date ? eOld.date : eNew.date;
        
        const ad = calculateAdherence(history, startD, endD);
        
        if (ad.totalExpected > 0) {
            resText.parentElement.querySelector('i').setAttribute('data-lucide', 'bar-chart-2');
            resText.parentElement.querySelector('i').style.color = 'var(--color-brand-blue)';
            resText.innerHTML = `You followed your recorded routine on <strong>${ad.totalRate}%</strong> of scheduled sessions between these photographs (${ad.totalDone}/${ad.totalExpected}).`;
        } else {
            resText.parentElement.querySelector('i').setAttribute('data-lucide', 'info');
            resText.parentElement.querySelector('i').style.color = 'var(--color-text-muted)';
            resText.innerHTML = `Not enough routine history to calculate consistency between these dates.`;
        }
        initializeIcons();
      }
    };

    selOld.addEventListener('change', updateCompareUI);
    selNew.addEventListener('change', updateCompareUI);
  }

  const deleteBtns = container.querySelectorAll('.delete-entry-btn');
  deleteBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm("Are you sure you want to delete this entry?")) return;
      
      const id = e.currentTarget.dataset.id;
      const date = e.currentTarget.dataset.date;
      
      try {
        await deleteEntry(id);
        
        const remainingOnDate = (groupedEntries[date] || []).filter(entry => String(entry.id) !== String(id));
        if (remainingOnDate.length === 0) {
          setDocumented(date, false);
        }
        
        await renderJourney(container);
      } catch (err) {
        alert("Failed to delete entry: " + err.message);
      }
    });
  });

  const resetDemoBtn = document.getElementById('reset-demo-btn');
  if (resetDemoBtn) {
    resetDemoBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if(confirm("Reset demo data and delete any real uploads?")) {
            await clearAllEntries();
            resetDemoData();
            window.history.pushState({}, '', window.location.pathname);
            await renderJourney(container);
        }
    });
  }

  const photos = container.querySelectorAll('.journey-photo');
  photos.forEach(photo => {
    photo.addEventListener('click', (e) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center; cursor:pointer; padding: 24px;';
      const img = document.createElement('img');
      img.src = e.target.src;
      img.style.cssText = 'max-width:100%; max-height:100%; object-fit:contain; border-radius: 8px;';
      overlay.appendChild(img);
      overlay.addEventListener('click', () => document.body.removeChild(overlay));
      document.body.appendChild(overlay);
    });
  });
}