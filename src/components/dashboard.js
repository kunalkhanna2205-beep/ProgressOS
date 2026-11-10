import { 
  getTodayRecord, updateCheckin, undoCheckin, getUser, getHistory, getRecentActivity,
  getRoutineAnalytics, shouldShowComeback, logInterventionAction, resetDemoData, updateUserRoutine
} from '../utils/storage.js';
import { clearAllEntries } from '../utils/db.js';
import { getDemoJourneyData, DEMO_DATA_VERSION } from '../data/demoJourney.js';
import { getLocalDateString } from '../utils/date.js';
import { initializeIcons } from '../main.js';
import { generateComebackCoaching } from '../utils/ai.js';

let pendingMissType = null;

export async function renderDashboard(container) {
  container.innerHTML = `<div style="padding:48px;text-align:center;"><i data-lucide="loader" class="spin"></i></div>`;
  initializeIcons();

  try {
    const storedVersion = localStorage.getItem('progressos_demo_version');
    if (storedVersion !== DEMO_DATA_VERSION) {
      await clearAllEntries();
      resetDemoData();
      localStorage.setItem('progressos_demo_version', DEMO_DATA_VERSION);
    }

    const user = getUser();
    const history = getHistory();
    const today = getTodayRecord();
    const analytics = getRoutineAnalytics();
    const recentActivities = getRecentActivity(10); // Fetch a bit more so we can filter system events

    const comeback = shouldShowComeback();
    let comebackHTML = '';
    
    if (comeback.show) {
      let actualMissedPeriods = 1;
      let reason = null;
      try {
        const latestRecord = history.find(h => h.date === comeback.date);
        if (latestRecord && latestRecord.missedReason) reason = latestRecord.missedReason;
        
        let tempMissed = 0;
        let isMissing = false;
        const sortedHistory = [...history].sort((a,b) => new Date(a.date) - new Date(b.date));
        sortedHistory.forEach(day => {
          const expected = day.expectedRoutine || [];
          const expectsMorning = expected.includes('morning');
          const expectsEvening = expected.includes('evening');
          
          if (!expectsMorning && !expectsEvening) return;

          let trueCount = 0;
          let falseCount = 0;
          if (expectsMorning) {
            if (day.morningCompleted === true) trueCount++;
            if (day.morningCompleted === false) falseCount++;
          }
          if (expectsEvening) {
            if (day.eveningCompleted === true) trueCount++;
            if (day.eveningCompleted === false) falseCount++;
          }
          
          const expectedCount = (expectsMorning ? 1 : 0) + (expectsEvening ? 1 : 0);
          const isFullMiss = (falseCount === expectedCount && expectedCount > 0);
          const hasTrue = trueCount > 0;
          
          if (isFullMiss && !isMissing) {
            isMissing = true;
            tempMissed++;
          } else if (hasTrue && isMissing) {
            isMissing = false;
          }
        });
        if (tempMissed > 0) actualMissedPeriods = tempMissed;
      } catch (e) {
        console.warn("Error calculating comeback periods.", e);
      }

      const reasons = ['Forgot', 'Too busy', 'Too tired', 'Ran out of product', 'Routine felt difficult', 'Other', 'Prefer not to say'];
      const reasonsHTML = reasons.map(r => 
        `<button class="btn-outline cb-reason-btn" data-reason="${r}" data-date="${comeback.date}" style="margin: 4px; border-color: #94A3B8; color: #4B5563;">${r}</button>`
      ).join('');

      comebackHTML = `
        <div id="comeback-card" class="card" style="background: #F0F9FF; border: 1px solid #BAE6FD; margin-bottom: 32px; padding: 24px;">
          <div id="comeback-step-1">
            <h3 style="margin-top: 0; font-size: 1.3rem; color: var(--color-brand-blue);">
              <i data-lucide="sparkles" style="vertical-align: text-bottom; margin-right: 8px;"></i>Comeback Coach
            </h3>
            <p id="cb-coach-text" style="margin-bottom: 24px; font-size: 0.95rem; color: var(--color-text-main);">
              <i data-lucide="loader" class="spin" style="width:14px;height:14px;display:inline-block;vertical-align:text-bottom;"></i> Generating advice...
            </p>
            <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
              <button class="btn-primary" id="cb-resume" data-date="${comeback.date}" style="width: auto;">Resume my routine</button>
              <button class="btn-outline" id="cb-simplify" data-date="${comeback.date}" style="width: auto; border-color: var(--color-brand-blue); background: white;">Make my routine simpler</button>
              <button class="btn-text" id="cb-tellus" style="width: auto; font-weight: 600;">Tell us what got in the way</button>
              <button class="btn-text" id="cb-later" data-date="${comeback.date}" style="width: auto; margin-left: auto;">Maybe later</button>
            </div>
          </div>
          
          <div id="comeback-step-2" class="hidden">
            <h3 style="margin-top: 0; font-size: 1.2rem; color: var(--color-brand-blue);">What got in the way?</h3>
            <p style="margin-bottom: 20px; font-size: 0.9rem; color: var(--color-text-muted);">This helps us understand your journey (optional).</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
              ${reasonsHTML}
            </div>
            <button class="btn-text" id="cb-skip" data-date="${comeback.date}" style="width: auto; padding: 0;">Skip</button>
          </div>
        </div>
      `;
      
      generateComebackCoaching(actualMissedPeriods, reason).then(text => {
         const coachEl = document.getElementById('cb-coach-text');
         if (coachEl) {
             coachEl.textContent = text;
         }
      });
    }

    const getRoutineUI = (type, isComplete) => {
      if (isComplete === true) {
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
            <div class="status-badge success"><i data-lucide="check-circle"></i> Completed</div>
            <button class="btn-text undo-btn" data-type="${type}" style="text-decoration: underline; font-size: 0.85rem;">Undo</button>
          </div>
        `;
      } else if (isComplete === false) {
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
            <div class="status-badge missed"><i data-lucide="x"></i> Missed</div>
            <button class="btn-text undo-btn" data-type="${type}" style="text-decoration: underline; font-size: 0.85rem;">Undo</button>
          </div>
        `;
      } else {
        return `
          <div class="action-buttons-fix" style="display: flex; gap: 12px; width: 100%; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
            <button class="complete-btn-fix" data-type="${type}" style="flex: 1; padding: 12px 16px; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer; border: 1px solid transparent; background-color: var(--color-brand-blue); color: white; transition: opacity 0.2s ease;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">Complete</button>
            <button class="miss-btn-fix" data-type="${type}" style="flex: 1; padding: 12px 16px; border-radius: 6px; font-weight: 600; font-size: 0.95rem; cursor: pointer; border: 1px solid var(--color-border); background-color: var(--color-bg-main); color: var(--color-text-main); transition: background-color 0.2s ease;" onmouseover="this.style.backgroundColor='#E5E9F0'" onmouseout="this.style.backgroundColor='var(--color-bg-main)'">Missed</button>
          </div>
        `;
      }
    };

    // Filter out system events and parse dates
    const filteredActivities = recentActivities.filter(a => a.label !== "App installed").slice(0, 4);
    const activityHTML = filteredActivities.length > 0 
      ? filteredActivities.map(item => {
          let timeDisplay = item.meta;
          if (item.timestamp) {
             const d = new Date(item.timestamp);
             timeDisplay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
          }
          
          let metaText = item.meta;
          if (item.label.toLowerCase().includes('missed') && (!item.meta || item.meta.includes('Not specified'))) {
              metaText = ''; // Hide reason if not provided
          } else if (item.label.toLowerCase().includes('missed') && item.meta) {
              metaText = item.meta; 
          } else {
              metaText = timeDisplay;
          }

          return `
          <li class="activity-item" style="padding: 16px; box-shadow: none;">
            <span class="activity-dot"></span>
            <div style="width: 100%;">
              <strong style="margin-bottom: 4px;">${item.label}</strong>
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--color-text-faint);">
                <span>${metaText}</span>
                ${item.label.toLowerCase().includes('missed') ? `<span>${timeDisplay}</span>` : ''}
              </div>
            </div>
          </li>
        `}).join('')
      : '<p class="subtitle" style="padding: 12px 0;">No recent activity.</p>';

    // --- Dynamic Routine Rendering ---
    const hasMorning = !!user?.routines?.morning;
    const hasEvening = !!user?.routines?.evening;
    let routineCardsHTML = '';
    
    // Morning Slot
    routineCardsHTML += `
      <div class="card routine-interactive" style="padding: 24px;">
        <div class="routine-header" style="margin-bottom: 16px;">
          <div class="routine-title" style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <span style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.8px;"><i data-lucide="sun" style="width: 18px; height: 18px;"></i> Morning</span>
          </div>
        </div>
        ${hasMorning ? `
          <div class="product-name" style="font-size: 1.15rem; font-weight: 700; color: var(--color-brand-blue); margin-bottom: 8px;">${user.routines.morning.product}</div>
          <div class="user-instructions" style="background: none; padding: 0; color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;">${user.routines.morning.instruction || 'No personal instructions provided.'}</div>
          <div class="routine-actions" style="width: 100%; display: flex; align-items: center; border-top: none; padding-top: 0; margin-top: 0;">${getRoutineUI('morning', today.morningCompleted)}</div>
        ` : `
          <p style="font-size: 0.95rem; color: var(--color-text-muted); margin-bottom: 16px;">No morning routine configured.</p>
          <button class="btn-outline open-setup-btn" style="width: 100%; border-color: var(--color-border); color: var(--color-text-main); font-weight: 600; padding: 10px;">Configure routine</button>
        `}
      </div>`;

    // Evening Slot
    routineCardsHTML += `
      <div class="card routine-interactive" style="padding: 24px;">
        <div class="routine-header" style="margin-bottom: 16px;">
          <div class="routine-title" style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <span style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.8px;"><i data-lucide="moon" style="width: 18px; height: 18px;"></i> Evening</span>
          </div>
        </div>
        ${hasEvening ? `
          <div class="product-name" style="font-size: 1.15rem; font-weight: 700; color: var(--color-brand-blue); margin-bottom: 8px;">${user.routines.evening.product}</div>
          <div class="user-instructions" style="background: none; padding: 0; color: var(--color-text-muted); font-size: 0.95rem; margin-bottom: 0; line-height: 1.5;">${user.routines.evening.instruction || 'No personal instructions provided.'}</div>
          <div class="routine-actions" style="width: 100%; display: flex; align-items: center; border-top: none; padding-top: 0; margin-top: 0;">${getRoutineUI('evening', today.eveningCompleted)}</div>
        ` : `
          <p style="font-size: 0.95rem; color: var(--color-text-muted); margin-bottom: 16px;">No evening routine configured.</p>
          <button class="btn-outline open-setup-btn" style="width: 100%; border-color: var(--color-border); color: var(--color-text-main); font-weight: 600; padding: 10px;">Configure routine</button>
        `}
      </div>`;

    // --- Weekly Consistency Indicator ---
    const todayStr = getLocalDateString();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);
    
    const weeklyHistory = history.filter(h => h.date >= sevenDaysAgoStr && h.date <= todayStr);
    let wComp = 0, wMiss = 0, wSch = 0;
    
    weeklyHistory.forEach(d => {
        const exp = d.expectedRoutine || [];
        if(exp.includes('morning')) { 
            wSch++; 
            if(d.morningCompleted === true) wComp++; 
            else if(d.morningCompleted === false) wMiss++; 
        }
        if(exp.includes('evening')) { 
            wSch++; 
            if(d.eveningCompleted === true) wComp++; 
            else if(d.eveningCompleted === false) wMiss++; 
        }
    });

    const weeklyIndicatorHTML = `
      <div style="background: #F8FAFC; padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center;">
         <div>
           <strong style="color: var(--color-text-main); display: block; margin-bottom: 4px; font-size: 0.95rem;">Rolling 7-Day Consistency</strong>
           <span style="font-size: 0.85rem; color: var(--color-text-muted);">${wComp} of ${wSch} scheduled sessions completed. ${wMiss} missed.</span>
         </div>
         <button class="btn-text open-insights-btn" style="font-size: 0.85rem; font-weight: 700; color: var(--color-brand-blue); padding: 8px 16px; background: white; border: 1px solid var(--color-border); border-radius: 20px; box-shadow: var(--shadow-sm); transition: all 0.2s ease;" onmouseover="this.style.borderColor='var(--color-brand-blue)'" onmouseout="this.style.borderColor='var(--color-border)'">Insights &rarr;</button>
      </div>
    `;

    const nameDisplay = user && user.name ? user.name : 'User';

    container.innerHTML = `
      <div class="dashboard-content">
        <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
          <div>
            <h1 style="margin-top: 0; margin-bottom: 4px;">Good morning, ${nameDisplay}.</h1>
          </div>
          <span class="demo-badge" style="margin-bottom: 0;">Deterministic Demo Data</span>
        </div>

        ${comebackHTML}

        <div class="summary-grid-2">
          <div class="summary-card">
            <h2>${analytics.adherenceRate}%</h2>
            <p style="font-weight: 700; color: var(--color-brand-blue); font-size: 0.9rem; margin-bottom: 4px;">Overall Adherence</p>
            <div style="font-size: 0.75rem; color: var(--color-text-faint); line-height: 1.4;">Completed sessions ÷ scheduled sessions.<br>Across ${history.length} tracked days.</div>
          </div>
          <div class="summary-card">
            <h2>${history.length}</h2>
            <p style="font-weight: 700; color: var(--color-brand-blue); font-size: 0.9rem; margin-bottom: 4px;">Days Tracked</p>
            <div style="font-size: 0.75rem; color: var(--color-text-faint); line-height: 1.4;">Total calendar records logged in your history.</div>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <div class="grid-column">
            ${weeklyIndicatorHTML}
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h3 style="margin: 0; font-size: 1.4rem; color: var(--color-brand-blue);">Today's Routine</h3>
              <!-- Clean, prominent Configure button -->
              <button class="btn-outline open-setup-btn" style="font-size: 0.85rem; font-weight: 700; padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; width: auto; background: white; border: 1px solid var(--color-brand-blue); box-shadow: var(--shadow-sm); cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='var(--color-brand-blue)'; this.style.color='white';" onmouseout="this.style.background='white'; this.style.color='var(--color-brand-blue)';">
                <i data-lucide="settings" style="width: 14px; height: 14px; margin-right: 6px;"></i> Configure
              </button>
            </div>
            
            ${routineCardsHTML}
            <p style="font-size: 0.8rem; color: var(--color-text-faint); text-align: center; margin-top: 16px;">Illustrative example of the intended experience.</p>
          </div>

          <div class="grid-column">
            <div style="margin-top: 8px;">
              <h3 style="font-size: 1.1rem; margin-bottom: 16px;">Recent Journey Activity</h3>
              <ul class="activity-list">
                ${activityHTML}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- INJECTED MODALS -->
      <div id="reason-modal" class="modal-overlay hidden">
        <div class="modal-content">
          <h3>Log Missed Routine</h3>
          <div class="reason-options">
            <button class="reason-btn" data-reason="Forgot">I forgot</button>
            <button class="reason-btn" data-reason="Busy">Too busy</button>
            <button class="reason-btn" data-reason="Ran Out">Ran out of product</button>
            <button class="reason-btn" data-reason="Inconvenient">Inconvenient timing</button>
            <button class="reason-btn" data-reason="Other">Other</button>
          </div>
          <button id="close-modal" class="btn-text" style="margin-top: 20px; width: 100%;">Cancel</button>
        </div>
      </div>
      
      <div id="setup-modal" class="modal-overlay hidden">
        <div class="modal-content" style="max-width: 500px; padding: 32px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-family: 'DM Sans', sans-serif; font-size: 1.4rem;">Configure Routine</h3>
            <button id="close-setup-modal" class="btn-text" style="padding: 4px;"><i data-lucide="x"></i></button>
          </div>
          <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 24px; line-height: 1.4;">Updates to your routine take effect starting tomorrow. This protects your historical and current day's tracking data.</p>
          
          <div style="margin-bottom: 20px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-main);">
            <label style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--color-brand-blue); cursor: pointer; margin-bottom: 12px;">
              <input type="checkbox" id="setup-morning-active" style="width: 16px; height: 16px;" />
              Morning Session
            </label>
            <div id="setup-morning-fields" class="hidden" style="display: flex; flex-direction: column; gap: 12px;">
              <input type="text" id="setup-morning-product" placeholder="Activity or product name" style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit;" />
              <textarea id="setup-morning-instruction" placeholder="Instructions (optional)" rows="2" style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; resize: vertical;"></textarea>
            </div>
          </div>

          <div style="margin-bottom: 32px; padding: 20px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg-main);">
            <label style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--color-brand-blue); cursor: pointer; margin-bottom: 12px;">
              <input type="checkbox" id="setup-evening-active" style="width: 16px; height: 16px;" />
              Evening Session
            </label>
            <div id="setup-evening-fields" class="hidden" style="display: flex; flex-direction: column; gap: 12px;">
              <input type="text" id="setup-evening-product" placeholder="Activity or product name" style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit;" />
              <textarea id="setup-evening-instruction" placeholder="Instructions (optional)" rows="2" style="padding: 12px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; resize: vertical;"></textarea>
            </div>
          </div>

          <button id="save-setup-btn" class="btn-primary" style="width: 100%;">Save Configuration</button>
        </div>
      </div>
    `;

    // --- EVENT BINDINGS (Scoped securely to container) ---
    
    // Insights Link
    container.querySelector('.open-insights-btn')?.addEventListener('click', () => {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(btn => {
            if(btn.innerText.toLowerCase().includes('insight')) btn.click();
        });
    });

    // Bind Routine Actions
    const rModal = container.querySelector('#reason-modal');
    container.querySelectorAll('.complete-btn-fix').forEach(btn => {
      btn.addEventListener('click', (e) => { 
        updateCheckin(e.target.dataset.type, true); 
        renderDashboard(container); 
      });
    });
    
    container.querySelectorAll('.undo-btn').forEach(btn => {
      btn.addEventListener('click', (e) => { 
        undoCheckin(e.target.dataset.type); 
        renderDashboard(container); 
      });
    });
    
    container.querySelectorAll('.miss-btn-fix').forEach(btn => {
      btn.addEventListener('click', (e) => { 
        pendingMissType = e.target.dataset.type; 
        if(rModal) rModal.classList.remove('hidden'); 
      });
    });
    
    // Bind Reason Modal Events
    if (rModal) {
      rModal.addEventListener('click', (e) => {
        if (e.target.classList.contains('reason-btn')) {
          updateCheckin(pendingMissType, false, e.target.dataset.reason);
          rModal.classList.add('hidden');
          renderDashboard(container);
        }
        if (e.target.id === 'close-modal') {
          rModal.classList.add('hidden');
          pendingMissType = null;
        }
      });
    }

    // Bind Setup Modal Events
    const setupModal = container.querySelector('#setup-modal');
    const mActive = container.querySelector('#setup-morning-active');
    const mFields = container.querySelector('#setup-morning-fields');
    const eActive = container.querySelector('#setup-evening-active');
    const eFields = container.querySelector('#setup-evening-fields');

    const toggleFields = (checkbox, fields) => {
      if(checkbox.checked) fields.classList.remove('hidden');
      else fields.classList.add('hidden');
    };

    mActive.addEventListener('change', () => toggleFields(mActive, mFields));
    eActive.addEventListener('change', () => toggleFields(eActive, eFields));

    container.querySelector('#close-setup-modal').addEventListener('click', () => {
      setupModal.classList.add('hidden');
    });

    container.querySelector('#save-setup-btn').addEventListener('click', () => {
      const mProd = container.querySelector('#setup-morning-product').value.trim();
      const mInst = container.querySelector('#setup-morning-instruction').value.trim();
      const eProd = container.querySelector('#setup-evening-product').value.trim();
      const eInst = container.querySelector('#setup-evening-instruction').value.trim();
      
      const mConfig = mActive.checked ? { product: mProd || 'Morning Activity', instruction: mInst } : null;
      const eConfig = eActive.checked ? { product: eProd || 'Evening Activity', instruction: eInst } : null;
      
      updateUserRoutine(mConfig, eConfig);
      
      setupModal.classList.add('hidden');
      alert("Routine configured successfully.\n\nNote: Changes will take effect starting tomorrow. Today's tracking record remains unchanged.");
      renderDashboard(container); 
    });

    // Bind Open Setup Modal Button(s)
    container.querySelectorAll('.open-setup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = getUser();
        mActive.checked = !!u.routines?.morning;
        if(mActive.checked) {
          container.querySelector('#setup-morning-product').value = u.routines.morning.product || '';
          container.querySelector('#setup-morning-instruction').value = u.routines.morning.instruction || '';
          mFields.classList.remove('hidden');
        } else {
          container.querySelector('#setup-morning-product').value = '';
          container.querySelector('#setup-morning-instruction').value = '';
          mFields.classList.add('hidden');
        }

        eActive.checked = !!u.routines?.evening;
        if(eActive.checked) {
          container.querySelector('#setup-evening-product').value = u.routines.evening.product || '';
          container.querySelector('#setup-evening-instruction').value = u.routines.evening.instruction || '';
          eFields.classList.remove('hidden');
        } else {
          container.querySelector('#setup-evening-product').value = '';
          container.querySelector('#setup-evening-instruction').value = '';
          eFields.classList.add('hidden');
        }

        setupModal.classList.remove('hidden');
        initializeIcons();
      });
    });

    // Comeback Intervention Binds (Fixed #cb-simplify logic)
    const cbCard = container.querySelector('#comeback-card');
    if (cbCard) {
      container.querySelector('#cb-resume')?.addEventListener('click', (e) => {
        logInterventionAction(e.target.dataset.date, 'Intervention Action', 'Resumed routine');
        renderDashboard(container);
      });
      
      // FIXED: Actually opens the configuration modal instead of just hiding the card
      container.querySelector('#cb-simplify')?.addEventListener('click', async (e) => {
        logInterventionAction(e.target.dataset.date, 'Intervention Action', 'Requested simpler routine');
        await renderDashboard(container);
        
        // After clearing the comeback card via re-render, automatically open the config modal
        const setupBtn = container.querySelector('.open-setup-btn');
        if (setupBtn) setupBtn.click();
      });
      
      container.querySelector('#cb-later')?.addEventListener('click', (e) => {
        logInterventionAction(e.target.dataset.date, 'Intervention Action', 'Dismissed (Maybe later)');
        renderDashboard(container);
      });
      container.querySelector('#cb-tellus')?.addEventListener('click', () => {
        container.querySelector('#comeback-step-1').classList.add('hidden');
        container.querySelector('#comeback-step-2').classList.remove('hidden');
      });

      container.querySelectorAll('.cb-reason-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          logInterventionAction(e.target.dataset.date, 'Comeback Reason Provided', e.target.dataset.reason);
          renderDashboard(container);
        });
      });
      container.querySelector('#cb-skip')?.addEventListener('click', (e) => {
        logInterventionAction(e.target.dataset.date, 'Intervention Action', 'Skipped reason collection');
        renderDashboard(container);
      });
    }
    
    initializeIcons();

  } catch (err) {
    container.innerHTML = `<div class="dashboard-content"><p>Error: ${err.message}</p></div>`;
  }
}