import { getHistory } from '../utils/storage.js';
import { getEntries } from '../utils/db.js';
import { getLocalDateString } from '../utils/date.js';
import { calculateAdherence, calculateRecovery } from '../utils/analytics.js';
import { initializeIcons } from '../main.js';
import { generateProgressInterpretation } from '../utils/ai.js';

export async function renderInsights(container) {
  container.innerHTML = `<div style="padding:48px;text-align:center;"><i data-lucide="loader" class="spin"></i></div>`;
  initializeIcons();

  try {
    const history = getHistory();
    const entries = await getEntries();
    
    const referenceDateStr = getLocalDateString();
    const referenceDate = new Date(referenceDateStr);
    
    const earliestRecord = history.length > 0 ? history[0].date : referenceDateStr;
    
    const last30Start = new Date(referenceDate.getTime());
    last30Start.setDate(last30Start.getDate() - 30); // 30-day window
    const last30StartStr = getLocalDateString(last30Start);

    const allTime = calculateAdherence(history, earliestRecord, referenceDateStr);
    const last30 = calculateAdherence(history, last30StartStr, referenceDateStr);
    const recovery = calculateRecovery(history, earliestRecord, referenceDateStr);

    // --- RECOVERY TRANSPARENCY ---
    let ongoingCount = recovery.interruptions.filter(i => i.status.includes('Ongoing')).length;
    let recoveryHTML = `
      <div style="background:var(--color-bg-main); padding:16px; border-radius:var(--radius-sm); margin-bottom: 16px;">
        <div style="display: flex; flex-direction: column; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">Qualifying Missed Periods</span>
            <span style="font-weight: 700; font-size: 1.05rem;">${recovery.missedSessions}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--color-text-faint); margin-top: 2px;">(Days where all scheduled sessions were explicitly missed)</span>
        </div>
        
        <div style="display: flex; flex-direction: column; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">Successful Resumptions</span>
            <span style="font-weight: 700; color: #10B981; font-size: 1.05rem;">${recovery.resumptions}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--color-text-faint); margin-top: 2px;">(Days a routine was completed immediately following a miss)</span>
        </div>

        <div style="display: flex; flex-direction: column; border-bottom: 1px solid var(--color-border); padding-bottom: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">Average Time to Resume</span>
            <span style="font-weight: 700; font-size: 1.05rem;">${recovery.avgRecovery} days</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--color-text-faint); margin-top: 2px;">(Calculated from successful resumptions only)</span>
        </div>

        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 600; color: var(--color-text-main); font-size: 0.95rem;">Ongoing Interruptions</span>
          <span style="font-weight: 700; color: var(--color-text-faint); font-size: 1.05rem;">${ongoingCount}</span>
        </div>
      </div>
    `;

    // --- DOCUMENTATION READINESS ---
    let validPhotos = entries
      .filter(e => (e.imageBlob || e.imageUrl) && e.date <= referenceDateStr)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (validPhotos.length === 0) {
        const documentedHistory = history
            .filter(h => h.documented && h.date <= referenceDateStr)
            .sort((a, b) => new Date(a.date) - new Date(b.date));
            
        if (documentedHistory.length > 0) {
            validPhotos = documentedHistory.map(h => ({ date: h.date, angle: 'Front' }));
        }
    }
    
    const documentedDatesCount = new Set(validPhotos.map(e => e.date)).size;
    let readinessStatus = "Baseline Required";
    let readinessColor = "var(--color-text-faint)";
    
    if (validPhotos.length >= 2) {
      const oldestAngle = validPhotos[0].angle || null;
      const newestAngle = validPhotos[validPhotos.length - 1].angle || null;
      
      if (!oldestAngle || !newestAngle || oldestAngle !== newestAngle) {
          readinessStatus = "Building Evidence";
          readinessColor = "#F59E0B";
      } else {
          readinessStatus = "Comparable Entries";
          readinessColor = "#10B981";
      }
    }

    // --- 90-DAY PULSE CALENDAR ---
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dayNames = ["S", "M", "T", "W", "T", "F", "S"];
    
    let heatmapHTML = '';
    let currMonth = -1;
    let monthGridHTML = '';
    let monthLabel = '';
    
    const pulseStart = new Date(referenceDate.getTime());
    pulseStart.setDate(pulseStart.getDate() - 89);
    const pulseStartStr = getLocalDateString(pulseStart);
    const pulseStartFormatted = `${monthNamesShort[pulseStart.getMonth()]} ${pulseStart.getDate()}, ${pulseStart.getFullYear()}`;
    const pulseEndFormatted = `${monthNamesShort[referenceDate.getMonth()]} ${referenceDate.getDate()}, ${referenceDate.getFullYear()}`;
    
    let loopDate = new Date(pulseStart.getTime());
    while (loopDate <= referenceDate) {
        if (loopDate.getMonth() !== currMonth) {
            if (currMonth !== -1) {
                heatmapHTML += `<div class="month-block"><div class="month-label">${monthLabel}</div><div class="month-grid">${monthGridHTML}</div></div>`;
            }
            currMonth = loopDate.getMonth();
            monthLabel = monthNames[currMonth] + ' ' + loopDate.getFullYear();
            monthGridHTML = '';
            dayNames.forEach(d => monthGridHTML += `<div class="heat-day-header">${d}</div>`);
            
            const firstDay = new Date(loopDate.getFullYear(), currMonth, 1);
            const startPad = firstDay.getDay(); 
            for(let i=0; i<startPad; i++) {
                 monthGridHTML += `<div class="heat-empty"></div>`;
            }
            
            if (currMonth === pulseStart.getMonth()) {
                const startDayNum = loopDate.getDate();
                for(let day=1; day < startDayNum; day++) {
                     monthGridHTML += `<div class="heat-empty"></div>`;
                }
            }
        }
        
        const dStr = getLocalDateString(loopDate);
        const record = history.find(h => h.date === dStr);
        
        let heatClass = 'heat-unscheduled';
        let title = `${dStr}: Unscheduled`;
        let details = 'No routine expected.';
        let dayStr = loopDate.getDate();

        if (record && record.expectedRoutine && record.expectedRoutine.length > 0) {
            let expectedCount = record.expectedRoutine.length;
            let trueCount = 0;
            let falseCount = 0;
            let nullCount = 0;
            
            if (record.expectedRoutine.includes('morning')) {
                if (record.morningCompleted === true) trueCount++;
                else if (record.morningCompleted === false) falseCount++;
                else nullCount++;
            }
            if (record.expectedRoutine.includes('evening')) {
                if (record.eveningCompleted === true) trueCount++;
                else if (record.eveningCompleted === false) falseCount++;
                else nullCount++;
            }
            
            if (nullCount === expectedCount) {
                heatClass = 'heat-unrecorded';
                title = `${dStr}: Unrecorded`;
                details = 'No check-ins recorded.';
            } else if (trueCount === expectedCount) {
                heatClass = 'heat-complete';
                title = `${dStr}: Completed`;
                details = 'All scheduled sessions complete.';
            } else if (falseCount === expectedCount) {
                heatClass = 'heat-miss';
                title = `${dStr}: Missed`;
                details = `Explicitly missed. ${record.missedReason ? `Reason: ${record.missedReason}` : ''}`;
            } else if (trueCount >= 1 && falseCount >= 1) {
                heatClass = 'heat-partial';
                title = `${dStr}: Partial`;
                details = 'At least one session completed and one missed.';
            } else {
                if (trueCount > 0 && falseCount === 0) {
                   heatClass = 'heat-complete';
                   title = `${dStr}: Completed (Partial Record)`;
                   details = 'Recorded sessions were completed, but some were left unrecorded.';
                } else if (falseCount > 0 && trueCount === 0) {
                   heatClass = 'heat-miss';
                   title = `${dStr}: Missed (Partial Record)`;
                   details = 'Recorded sessions were missed, but some were left unrecorded.';
                }
            }
        }
        
        monthGridHTML += `<button class="heat-day ${heatClass}" aria-label="${title}" data-date="${dStr}" data-title="${title}" data-details="${details}">${dayStr}</button>`;
        
        loopDate.setDate(loopDate.getDate() + 1);
    }
    
    if (currMonth !== -1) {
        heatmapHTML += `<div class="month-block"><div class="month-label">${monthLabel}</div><div class="month-grid">${monthGridHTML}</div></div>`;
    }

    // --- RECONCILED TREND CHART ---
    let barsHTML = '';
    let labelsHTML = '';
    const daysSinceMonday = pulseStart.getDay() === 0 ? 6 : pulseStart.getDay() - 1;
    let currentMonday = new Date(pulseStart.getTime());
    currentMonday.setDate(pulseStart.getDate() - daysSinceMonday);

    let weekNum = 1;
    while (currentMonday <= referenceDate) {
      const startOfWeek = new Date(currentMonday);
      const endOfWeekFull = new Date(startOfWeek);
      endOfWeekFull.setDate(startOfWeek.getDate() + 6);
      
      const actualStart = startOfWeek < pulseStart ? new Date(pulseStart) : new Date(startOfWeek);
      const actualEnd = endOfWeekFull > referenceDate ? new Date(referenceDate) : new Date(endOfWeekFull);
      
      const startStr = getLocalDateString(actualStart);
      const endStr = getLocalDateString(actualEnd);
      const isPartial = startOfWeek < pulseStart || endOfWeekFull > referenceDate;
      
      const weekAdherence = calculateAdherence(history, startStr, endStr);
      const wRate = weekAdherence.totalRate;
      const wExp = weekAdherence.totalExpected;
      const wDone = weekAdherence.totalDone;
      
      const displayRate = wExp > 0 ? `${wRate}%` : 'N/A';
      const labelText = isPartial ? `W${weekNum}*` : `W${weekNum}`;
      
      const tooltip = wExp > 0 
          ? `Week ${weekNum} (${startStr.substring(5).replace('-','/')} to ${endStr.substring(5).replace('-','/')}): ${displayRate} (${wDone}/${wExp} sessions)` 
          : `Week ${weekNum} (${startStr.substring(5).replace('-','/')} to ${endStr.substring(5).replace('-','/')}): Insufficient Data`;
      
      const shortDate = startStr.substring(5).replace('-', '/');
      
      const barVisual = wExp > 0 
           ? `<div style="font-size:0.65rem; color:var(--color-brand-blue); margin-bottom:4px; font-weight:700;">${wRate}%</div><div class="bar-fill" style="height: ${wRate}%; opacity: 0.9;"></div>` 
           : `<div style="height:100%; display:flex; align-items:flex-end; padding-bottom:8px; justify-content:center;"><span style="font-size:0.65rem; color:var(--color-text-faint); font-weight: 700;">N/A</span></div>`;

      // Build Bars
      barsHTML += `
        <div class="bar-col" title="${tooltip}">
          ${barVisual}
        </div>
      `;
      // Build Labels (Separated from bars so the border-bottom draws cleanly between them)
      labelsHTML += `
        <div style="text-align: center; font-size: 0.65rem; color: var(--color-text-faint); font-weight: 700; line-height: 1.2;">
          ${labelText}<br><span style="font-size: 0.55rem; font-weight: normal;">${shortDate}</span>
        </div>
      `;

      currentMonday.setDate(currentMonday.getDate() + 7);
      weekNum++;
    }

    const scopedCSS = `
      <style>
        .insights-wrapper { max-width: 1200px; margin: 0 auto; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px; }
        .metric-card { background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; box-shadow: var(--shadow-sm); }
        .metric-value { font-family: 'DM Serif Display', serif; font-size: 2.2rem; color: var(--color-brand-blue); line-height: 1.1; margin-bottom: 8px; }
        .metric-label { font-size: 0.85rem; font-weight: 700; color: var(--color-text-faint); text-transform: uppercase; letter-spacing: 0.05em; }
        .metric-sub { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 8px; line-height: 1.4; }
        
        .insights-charts-grid { display: grid; grid-template-columns: 1fr; gap: 32px; margin-bottom: 32px; }
        @media (min-width: 1024px) { .insights-charts-grid { grid-template-columns: 1fr 1fr; align-items: stretch; } }
        
        .chart-card { background: var(--color-card-bg); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 24px; display: flex; flex-direction: column; overflow: hidden; }
        .chart-title { font-size: 1.1rem; font-weight: 700; margin-bottom: 24px; color: var(--color-text-main); display: flex; align-items: center; gap: 8px; }
        
        /* Bar Chart Fixed Constraints */
        .bar-chart-container { display: flex; flex: 1; min-height: 220px; width: 100%; overflow-x: auto; scrollbar-width: thin; padding-bottom: 8px; margin-top: 16px; }
        .y-axis { display: flex; flex-direction: column; justify-content: space-between; padding-right: 12px; padding-bottom: 36px; color: var(--color-text-faint); font-size: 0.75rem; border-right: 1px solid var(--color-border); position: sticky; left: 0; background: var(--color-card-bg); z-index: 5; flex-shrink: 0; }
        .bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; cursor: help; }
        .bar-fill { width: 100%; max-width: 24px; background: var(--color-brand-blue); border-radius: 4px 4px 0 0; transition: height 0.3s ease, filter 0.2s; }
        .bar-col:hover .bar-fill { filter: brightness(1.2); }
        
        /* Calendar Heatmap Strict Constraints */
        .calendar-wrapper { display: flex; gap: 32px; overflow-x: auto; padding-bottom: 24px; scrollbar-width: thin; align-items: start; }
        .month-block { flex: 0 0 240px; }
        .month-label { font-weight: 700; font-size: 0.95rem; color: var(--color-text-main); margin-bottom: 12px; text-align: center; }
        .month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
        .heat-day-header { font-size: 0.75rem; font-weight: 700; color: var(--color-text-faint); margin-bottom: 4px; }
        .heat-empty { aspect-ratio: 1; }
        .heat-day { aspect-ratio: 1; border-radius: 4px; border: none; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: transform 0.1s, box-shadow 0.1s; }
        .heat-day:hover { transform: scale(1.15); box-shadow: 0 0 0 2px var(--color-brand-blue); z-index: 10; position: relative; }
        
        .heat-unrecorded, .heat-unscheduled { color: var(--color-text-faint); }
        .heat-complete { background: #10B981; }
        .heat-partial { background: #F59E0B; }
        .heat-miss { background: #EF4444; }
        .heat-unrecorded { background: #E2E8F0; }
        .heat-unscheduled { background: #F8FAFC; border: 1px dashed #CBD5E1; }
        
        .legend { display: flex; gap: 16px; margin-top: 24px; font-size: 0.8rem; color: var(--color-text-muted); justify-content: flex-end; flex-wrap: wrap; border-top: 1px solid var(--color-border); padding-top: 16px; }
        .legend-item { display: flex; align-items: center; gap: 6px; }
        .legend-box { width: 12px; height: 12px; border-radius: 2px; }
        
        #heat-inspector { margin-top: 24px; padding: 16px; background: var(--color-nav-active-bg); border-radius: var(--radius-sm); border: 1px solid var(--color-border); display: none; }
      </style>
    `;

    container.innerHTML = `
      ${scopedCSS}
      <div class="dashboard-content insights-wrapper">
        <div class="dashboard-header" style="margin-bottom: 32px;">
          <h1 style="margin-top: 0; margin-bottom: 4px;">My Insights</h1>
          <p class="subtitle" style="margin-top: 0;">Analytics mapping your consistency and recovery.</p>
        </div>

        <div class="metrics-grid">
          <!-- CARD 1 -->
          <div class="metric-card">
            <div class="metric-value">${last30.totalRate}%</div>
            <div class="metric-label">30-Day Adherence</div>
            <div class="metric-sub">${last30.totalDone} / ${last30.totalExpected} scheduled sessions completed over the last 30 days.</div>
          </div>
          
          <!-- CARD 2 -->
          <div class="metric-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div style="display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px;">
                <div style="flex: 1;">
                    <div class="metric-value" style="font-size: 2rem;">${allTime.amRate}%</div>
                    <div class="metric-label">Morning</div>
                </div>
                <div style="width: 1px; background: var(--color-border);"></div>
                <div style="flex: 1; text-align: right;">
                    <div class="metric-value" style="font-size: 2rem;">${allTime.pmRate}%</div>
                    <div class="metric-label">Evening</div>
                </div>
            </div>
            <div class="metric-sub">Lifetime validated completion rates.</div>
          </div>

          <!-- CARD 3 -->
          <div class="metric-card">
            <div style="font-family: 'DM Sans', sans-serif; font-size: 1.3rem; font-weight: 700; color: ${readinessColor}; line-height: 1.2; margin-bottom: 8px;">
              ${readinessStatus}
            </div>
            <div class="metric-label">Documentation Status</div>
            <div class="metric-sub" style="line-height: 1.4;">
                <strong>${validPhotos.length}</strong> photo(s) logged across <strong>${documentedDatesCount}</strong> date(s).<br>
                <span style="display: inline-block; margin-top: 4px;">${validPhotos.length < 2 ? 'Upload another photograph to unlock visual comparison.' : 'Baseline and comparison points established.'}</span>
            </div>
          </div>
        </div>

        <div class="insights-charts-grid">
          
          <!-- AI Progress Interpreter -->
          <div class="chart-card ai-interpreter-card" style="background: linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 100%); border-color: #BAE6FD; grid-column: 1 / -1; margin-bottom: 0;">
            <div class="chart-title"><i data-lucide="sparkles" style="color:var(--color-brand-blue);"></i> AI Progress Interpreter</div>
            <div id="ai-interpreter-content">
              <div style="display:flex; align-items:center; gap:8px; color:var(--color-text-faint);">
                <i data-lucide="loader" class="spin" style="width:16px;height:16px;"></i> Generating personalized insights...
              </div>
            </div>
          </div>

          <!-- Consistency Trend -->
          <div class="chart-card">
            <div class="chart-title"><i data-lucide="trending-up" style="color:var(--color-brand-blue);"></i> 90-Day Weekly Trend</div>
            <p style="font-size: 0.8rem; color: var(--color-text-faint); margin-top: -20px; margin-bottom: 0;">* Denotes a partial week at the boundary.</p>
            <div class="bar-chart-container">
              <div class="y-axis">
                  <span>100%</span>
                  <span>50%</span>
                  <span>0%</span>
              </div>
              <div style="display: flex; flex-direction: column; flex: 1; min-width: 380px; padding-left: 12px;">
                  <div style="display: grid; grid-template-columns: repeat(14, 1fr); gap: 6px; flex: 1; border-bottom: 1px solid var(--color-border); align-items: flex-end; padding-bottom: 4px;">
                    ${barsHTML}
                  </div>
                  <div style="display: grid; grid-template-columns: repeat(14, 1fr); gap: 6px; padding-top: 8px;">
                    ${labelsHTML}
                  </div>
              </div>
            </div>
          </div>

          <!-- Recovery Analytics -->
          <div class="chart-card" style="margin-bottom: 0; display: flex; flex-direction: column; justify-content: center;">
            <div class="chart-title"><i data-lucide="activity" style="color:var(--color-brand-blue);"></i> Recovery Analytics</div>
            <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 16px; line-height: 1.4;">
              Consistency isn't about perfection; it's about how quickly you return to your routine after an interruption. 
            </p>
            ${recoveryHTML}
          </div>

        </div>

        <!-- 90-Day Calendar Heatmap -->
        <div class="chart-card">
          <div class="chart-title"><i data-lucide="calendar" style="color:var(--color-brand-blue);"></i> 90-Day Pulse <span style="font-size: 0.85rem; font-weight: normal; color: var(--color-text-faint); margin-left: 8px;">(${pulseStartFormatted} - ${pulseEndFormatted})</span></div>
          <div class="calendar-wrapper">
             ${heatmapHTML}
          </div>
          <div id="heat-inspector">
             <h4 id="hi-title" style="margin:0 0 4px 0; color: var(--color-brand-blue);"></h4>
             <p id="hi-details" style="margin:0; font-size: 0.9rem; color: var(--color-text-main);"></p>
          </div>
          <div class="legend">
            <div class="legend-item"><div class="legend-box heat-complete"></div> Completed</div>
            <div class="legend-item"><div class="legend-box heat-partial"></div> Partial</div>
            <div class="legend-item"><div class="legend-box heat-miss"></div> Missed</div>
            <div class="legend-item"><div class="legend-box heat-unrecorded"></div> Unrecorded</div>
            <div class="legend-item"><div class="legend-box heat-unscheduled"></div> Unscheduled</div>
          </div>
        </div>

      </div>
    `;
    
    // --- 6. AI PROGRESS INTERPRETER ---
    const aiContext = {
      last30Rate: last30.totalRate,
      last30Done: last30.totalDone,
      last30Expected: last30.totalExpected,
      amRate: last30.amRate,
      pmRate: last30.pmRate,
      successfulResumptions: recovery.resumptions,
      readinessStatus: readinessStatus
    };
    
    generateProgressInterpretation(aiContext).then(interpretation => {
      const aiContainer = document.getElementById('ai-interpreter-content');
      if (aiContainer && interpretation) {
        
        const observationsList = document.createElement('ul');
        observationsList.style.cssText = 'margin: 0 0 20px 20px; color: var(--color-text-main); font-size: 0.95rem; line-height: 1.5;';
        
        interpretation.observations.forEach(obs => {
           const li = document.createElement('li');
           li.style.marginBottom = '8px';
           li.textContent = obs; 
           observationsList.appendChild(li);
        });

        aiContainer.innerHTML = '';
        
        const pSummary = document.createElement('p');
        pSummary.style.cssText = 'font-weight: 600; color: var(--color-brand-blue); margin: 0 0 16px 0; font-size: 1.05rem; line-height: 1.5;';
        pSummary.textContent = interpretation.summary; 
        aiContainer.appendChild(pSummary);
        
        aiContainer.appendChild(observationsList);
        
        const recDiv = document.createElement('div');
        recDiv.style.cssText = 'background: white; padding: 16px; border-radius: var(--radius-sm); border: 1px solid #BAE6FD; font-size: 0.95rem;';
        recDiv.innerHTML = '<span style="font-weight: 700; color: var(--color-brand-blue); display:flex; align-items:center; gap:6px; margin-bottom:8px;"><i data-lucide="arrow-right-circle" style="width:16px;height:16px;"></i> Recommendation</span>';
        
        const pRecText = document.createElement('span');
        pRecText.textContent = interpretation.recommendation; 
        recDiv.appendChild(pRecText);
        
        aiContainer.appendChild(recDiv);
        initializeIcons();
      }
    });

    initializeIcons();

    const heatDays = container.querySelectorAll('.heat-day');
    const inspector = document.getElementById('heat-inspector');
    const iTitle = document.getElementById('hi-title');
    const iDetails = document.getElementById('hi-details');

    heatDays.forEach(day => {
      day.addEventListener('click', (e) => {
        iTitle.textContent = e.target.dataset.title;
        iDetails.textContent = e.target.dataset.details;
        inspector.style.display = 'block';
      });
    });

  } catch (err) {
    container.innerHTML = `<div style="padding: 48px; color: var(--color-brand-red);">Error loading insights: ${err.message}</div>`;
  }
}