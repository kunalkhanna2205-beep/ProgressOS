import { getHistory } from '../utils/storage.js';
import { getLocalDateString } from '../utils/date.js';
import { getEntries } from '../utils/db.js';
import { calculateAdherence, calculateRecovery, calculateDocumentation } from '../utils/analytics.js';
import { generateMonthlyStory } from '../utils/ai.js';
import { initializeIcons } from '../main.js';

export async function renderReports(container) {
  container.innerHTML = `<div style="padding:48px;text-align:center;"><i data-lucide="loader" class="spin"></i></div>`;
  initializeIcons();

  try {
    const history = getHistory();
    const allEntries = await getEntries();
    
    const referenceDateStr = getLocalDateString();
    const referenceDate = new Date(referenceDateStr);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    let defaultMonthValue = `${referenceDate.getFullYear()}-${referenceDate.getMonth()}`;
    const availableMonths = new Set();
    
    history.forEach(h => {
        if (h.date <= referenceDateStr) {
            const d = new Date(h.date);
            availableMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
            
            // Find most recently completed month for default
            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
            nextMonth.setDate(nextMonth.getDate() - 1);
            if (getLocalDateString(nextMonth) < referenceDateStr) {
                if (!defaultMonthValue || new Date(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`) > new Date(`${defaultMonthValue.split('-')[0]}-${String(Number(defaultMonthValue.split('-')[1])+1).padStart(2,'0')}-01`)) {
                    defaultMonthValue = `${d.getFullYear()}-${d.getMonth()}`;
                }
            }
        }
    });
    
    availableMonths.add(`${referenceDate.getFullYear()}-${referenceDate.getMonth()}`);
    
    const sortedMonths = Array.from(availableMonths).sort((a, b) => {
        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);
        if (yA !== yB) return yB - yA;
        return mB - mA;
    });

    const renderMonth = async (selectedYear, selectedMonth) => {
        const monthStartStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
        const nextMonth = new Date(selectedYear, selectedMonth + 1, 1);
        nextMonth.setDate(nextMonth.getDate() - 1);
        
        let monthEndStr = getLocalDateString(nextMonth);
        let isCurrentMonth = false;
        
        if (monthEndStr > referenceDateStr) {
            monthEndStr = referenceDateStr;
            isCurrentMonth = true;
        }

        const startFormatted = `${monthNamesShort[new Date(monthStartStr).getMonth()]} ${new Date(monthStartStr).getDate()}`;
        const endFormatted = `${monthNamesShort[new Date(monthEndStr).getMonth()]} ${new Date(monthEndStr).getDate()}`;
        const dateRangeText = `${startFormatted} – ${endFormatted}`;
        const headerStatus = isCurrentMonth ? "Month to Date" : "Complete Month";

        const adherence = calculateAdherence(history, monthStartStr, monthEndStr);
        const recovery = calculateRecovery(history, monthStartStr, monthEndStr);
        
        // DOCUMENTATION MISMATCH FIX
        // calculateDocumentation usually strictly checks allEntries (IndexedDB).
        let docMetrics = calculateDocumentation(allEntries, history, monthStartStr, monthEndStr);
        
        // Fallback: If no real files are uploaded yet, use the 'documented: true' flag from the demo history
        if (docMetrics.photoCount === 0 && allEntries.length === 0) {
            const demoDocsInPeriod = history.filter(h => h.date >= monthStartStr && h.date <= monthEndStr && h.documented);
            docMetrics.photoCount = demoDocsInPeriod.length;
            docMetrics.journalCount = demoDocsInPeriod.length;
            docMetrics.documentedDays = demoDocsInPeriod.length;
        }

        const analytics = { 
            rate: adherence.totalRate, completed: adherence.totalDone, expected: adherence.totalExpected, 
            amRate: adherence.amRate, pmRate: adherence.pmRate, 
            missedSessions: recovery.missedSessions, resumptions: recovery.resumptions, 
            journalCount: docMetrics.journalCount, photoCount: docMetrics.photoCount, documentedDays: docMetrics.documentedDays
        };
        
        // Ensure safety on missing properties
        const amDone = adherence.amDone || 0;
        const amExp = adherence.amExpected || 0;
        const pmDone = adherence.pmDone || 0;
        const pmExp = adherence.pmExpected || 0;
        
        const contentEl = document.getElementById('reports-dynamic-content');
        if (contentEl) {
             contentEl.innerHTML = `
                <div class="report-main-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                        <h2 style="margin:0; font-size:1.4rem;">${monthNames[selectedMonth]} ${selectedYear} <span style="font-size:0.7rem; background:${isCurrentMonth ? '#FFFBEB' : '#F0FDF4'}; color:${isCurrentMonth ? '#B45309' : '#166534'}; padding:4px 8px; border-radius:4px; margin-left:8px; vertical-align:middle; border:1px solid ${isCurrentMonth ? '#FEF3C7' : '#DCFCE7'};">${headerStatus}</span></h2>
                        <span style="font-size:0.85rem; color:var(--color-text-faint); font-weight:700;">${dateRangeText}</span>
                    </div>
                    <div class="metric-grid-2x2">
                        <div>
                            <div class="m-val">${analytics.rate}%</div>
                            <div class="m-title">Routine adherence</div>
                            <div class="m-sub">Completed / scheduled sessions</div>
                        </div>
                        <div>
                            <div class="m-val">${analytics.completed}/${analytics.expected}</div>
                            <div class="m-title">Sessions completed</div>
                            <div class="m-sub">Across morning and evening</div>
                        </div>
                        <div>
                            <div class="m-val">${analytics.missedSessions}</div>
                            <div class="m-title">Sessions missed</div>
                            <div class="m-sub">Scheduled sessions not completed</div>
                        </div>
                        <div>
                            <div class="m-val">${analytics.resumptions}</div>
                            <div class="m-title">Successful resumptions</div>
                            <div class="m-sub">Recovered after interruptions</div>
                        </div>
                    </div>
                    
                    <hr class="sec-divider">
                    <h3 class="sec-title">Morning vs evening consistency</h3>
                    
                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; color: var(--color-text-main);">
                            <span>Morning</span><span>${amDone}/${amExp} (${analytics.amRate}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${analytics.amRate}%; height: 100%; background: #10B981; border-radius: 4px; transition: width 0.5s ease-out;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 40px;">
                        <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.95rem; margin-bottom: 8px; color: var(--color-text-main);">
                            <span>Evening</span><span>${pmDone}/${pmExp} (${analytics.pmRate}%)</span>
                        </div>
                        <div style="width: 100%; height: 8px; background: #E2E8F0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${analytics.pmRate}%; height: 100%; background: #F59E0B; border-radius: 4px; transition: width 0.5s ease-out;"></div>
                        </div>
                    </div>
                    
                    <hr class="sec-divider">
                    <h3 class="sec-title">Documentation during ${dateRangeText}</h3>
                    <div class="doc-grid">
                        <div>
                            <div class="d-val">${analytics.journalCount}</div>
                            <div class="d-title">Journal entries</div>
                        </div>
                        <div>
                            <div class="d-val">${analytics.documentedDays}</div>
                            <div class="d-title">Documented days</div>
                        </div>
                        <div>
                            <div class="d-val">${analytics.photoCount}</div>
                            <div class="d-title">Progress photos</div>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 100%); border: 1px solid #BAE6FD; border-radius: var(--radius-md); padding: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
                            <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-brand-blue); display: flex; align-items: center; gap: 8px;">
                                <i data-lucide="sparkles" style="width: 20px; height: 20px;"></i> Monthly Summary
                            </div>
                            <span style="background: #E0E7FF; color: #4338CA; font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 12px; letter-spacing: 0.05em; text-transform: uppercase;">AI-Assisted Summary</span>
                        </div>
                        <div id="ai-story-box" style="font-size: 1.05rem; line-height: 1.6; color: var(--color-text-main);">
                            <div style="display:flex; align-items:center; gap:8px; color:var(--color-text-faint);">
                                <i data-lucide="loader" class="spin"></i> Generating insights...
                            </div>
                        </div>
                    </div>
                </div>
             `;
             
             initializeIcons();
             
             const story = await generateMonthlyStory(dateRangeText, analytics);
             const storyBox = document.getElementById('ai-story-box');
             if (storyBox && story) {
                 storyBox.innerHTML = '';
                 story.split('\n\n').forEach(paragraph => {
                     if (paragraph.trim()) {
                         const p = document.createElement('p');
                         p.style.marginBottom = '16px';
                         p.style.marginTop = '0';
                         p.textContent = paragraph.trim();
                         storyBox.appendChild(p);
                     }
                 });
                 if (storyBox.lastChild) storyBox.lastChild.style.marginBottom = '0';
             }
        }
        
        const headerSub = document.getElementById('report-header-subtitle');
        if (headerSub) {
            headerSub.textContent = `YOUR HAIR-CARE JOURNEY • ${monthNames[selectedMonth].toUpperCase()}`;
        }
    };

    const monthOptions = sortedMonths.map(m => {
        const [y, mon] = m.split('-').map(Number);
        const isCurrent = (y === referenceDate.getFullYear() && mon === referenceDate.getMonth());
        const labelSuffix = isCurrent ? " (Month to Date)" : " (Complete Month)";
        return `<option value="${m}">${monthNames[mon]} ${y}${labelSuffix}</option>`;
    }).join('');

    const scopedCSS = `
      <style>
        .reports-wrapper { max-width: 800px; margin: 0 auto; padding-bottom: 48px; }
        .month-selector { padding: 10px 36px 10px 16px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-family: inherit; font-size: 0.95rem; background-color: white; color: var(--color-brand-blue); font-weight: 600; cursor: pointer; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%230F172A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; transition: border-color 0.2s; }
        .month-selector:hover { border-color: var(--color-brand-blue); }
        .report-main-card { background: var(--color-card-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); padding: 32px; box-shadow: var(--shadow-sm); }
        
        .metric-grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
        @media (max-width: 600px) { .metric-grid-2x2 { grid-template-columns: 1fr; gap: 24px; } }
        
        .m-val { font-family: 'DM Serif Display', serif; font-size: 2.5rem; color: var(--color-brand-blue); line-height: 1; }
        .m-title { font-weight: 700; margin-top: 8px; font-size: 1rem; color: var(--color-text-main); }
        .m-sub { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px; }
        
        .doc-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-bottom: 40px; }
        @media (max-width: 600px) { .doc-grid { grid-template-columns: 1fr; gap: 20px; } }
        
        .d-val { font-size: 1.8rem; font-weight: 700; color: var(--color-brand-blue); line-height: 1; }
        .d-title { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        
        .sec-divider { border: none; border-top: 1px solid var(--color-border); margin: 32px 0; }
        .sec-title { font-size: 1.1rem; font-weight: 700; color: var(--color-brand-blue); margin-bottom: 24px; }
      </style>
    `;

    container.innerHTML = `
      ${scopedCSS}
      <div class="dashboard-content reports-wrapper screen-only">
        <div class="dashboard-header" style="margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
                <h1 style="margin-top: 0; margin-bottom: 4px;">My Reports</h1>
                <p id="report-header-subtitle" class="subtitle" style="margin-top: 0; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-faint); font-weight: 700;">YOUR HAIR-CARE JOURNEY</p>
            </div>
            <span style="background: #D1FAE5; color: #065F46; padding: 6px 12px; font-size: 0.8rem; font-weight: 700; border-radius: 20px;">Monthly overview</span>
        </div>
        
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px; background: var(--color-card-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border); flex-wrap: wrap; gap: 16px;">
            <div style="font-weight: 700; font-size: 1.1rem; color: var(--color-brand-blue);">Reporting Period</div>
            <select id="report-month-select" class="month-selector">
                ${monthOptions}
            </select>
        </div>
        
        <div id="reports-dynamic-content">
            <div style="text-align:center; padding: 40px; color: var(--color-text-faint);">
                <i data-lucide="loader" class="spin"></i> Loading report data...
            </div>
        </div>
      </div>
    `;
    
    initializeIcons();

    const selectEl = document.getElementById('report-month-select');
    if (selectEl) {
        selectEl.value = defaultMonthValue;
        selectEl.addEventListener('change', (e) => {
            const [y, m] = e.target.value.split('-').map(Number);
            renderMonth(y, m);
        });
        
        const [initY, initM] = selectEl.value.split('-').map(Number);
        renderMonth(initY, initM);
    }

  } catch (err) {
    container.innerHTML = `<div style="padding: 48px; color: var(--color-brand-red);">Error loading reports: ${err.message}</div>`;
  }
}