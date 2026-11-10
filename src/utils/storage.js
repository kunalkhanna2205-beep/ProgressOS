import { generateFictionalJourney } from '../data/demoData.js';
import { getLocalDateString } from './date.js';

const STORAGE_KEY = 'progressos_history';
const ACTIVITY_KEY = 'progressos_activities';
const USER_KEY = 'progressos_user';
const INTERVENTION_KEY = 'progressos_intervention';

// --- Safe Storage Wrappers (Data Protection & Quota Handling) ---
function safeGet(key, defaultVal) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    console.error(`[Storage Error] Failed to parse ${key}:`, e);
    return defaultVal;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error(`[Storage Error] Failed to save ${key}:`, e);
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
      console.warn("Storage quota exceeded. Changes not saved.");
    }
  }
}

export function initStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    const demo = generateFictionalJourney();
    safeSet(STORAGE_KEY, demo.history);
    safeSet(ACTIVITY_KEY, demo.activities);
    
    // Override the old schema to ensure the recruiter sees the proper dual-slot routine
    demo.user = {
      name: demo.user?.name || "Alex",
      routines: {
        morning: { product: "Biotin Hair Gummies", instruction: "Take 1 gummy daily." },
        evening: { product: "Advanced Hair Growth Tonic", instruction: "Apply to affected areas on a dry scalp." }
      }
    };
    safeSet(USER_KEY, demo.user);
  } else if (!localStorage.getItem(USER_KEY)) {
    safeSet(USER_KEY, { routines: {} });
  }
}

// --- Core Data Access ---
export function getUser() {
  return safeGet(USER_KEY, { routines: {} });
}

export function updateUserRoutine(morningConfig, eveningConfig) {
  const user = getUser();
  user.routines = {};
  if (morningConfig) user.routines.morning = morningConfig;
  if (eveningConfig) user.routines.evening = eveningConfig;
  safeSet(USER_KEY, user);
}

export function getHistory() {
  return safeGet(STORAGE_KEY, []);
}

// --- Routine State Management ---
export function getTodayRecord() {
  const history = getHistory();
  const user = getUser();
  const todayStr = getLocalDateString();
  
  let record = history.find(r => r.date === todayStr);
  
  if (!record) {
    const expected = user && user.routines ? Object.keys(user.routines) : [];
    record = { 
      date: todayStr, 
      expectedRoutine: expected,
      morningCompleted: null, 
      eveningCompleted: null, 
      missedReason: null,
      documented: false
    };
    history.push(record);
    safeSet(STORAGE_KEY, history);
  }
  return record;
}

export function updateCheckin(type, status, reason = null) {
  const history = getHistory();
  const todayStr = getLocalDateString();
  let recordIndex = history.findIndex(r => r.date === todayStr);
  
  if (recordIndex === -1) {
    getTodayRecord();
    const updatedHistory = getHistory();
    recordIndex = updatedHistory.findIndex(r => r.date === todayStr);
    applyUpdate(updatedHistory, recordIndex, type, status, reason);
  } else {
    applyUpdate(history, recordIndex, type, status, reason);
  }
}

function applyUpdate(historyArray, index, type, status, reason) {
  if (type === 'morning') historyArray[index].morningCompleted = status;
  if (type === 'evening') historyArray[index].eveningCompleted = status;
  if (reason) historyArray[index].missedReason = reason;

  safeSet(STORAGE_KEY, historyArray);

  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  if (status === true) {
    logActivity(`${typeLabel} routine completed`, 'Just now');
  } else if (status === false) {
    logActivity(`${typeLabel} routine missed`, `Reason: ${reason || 'Not specified'}`);
  }
}

export function undoCheckin(type) {
  const history = getHistory();
  const todayStr = getLocalDateString();
  let recordIndex = history.findIndex(r => r.date === todayStr);
  
  if (recordIndex === -1) return;
  
  let updated = false;
  if (type === 'morning' && history[recordIndex].morningCompleted !== null) {
    history[recordIndex].morningCompleted = null;
    updated = true;
  }
  if (type === 'evening' && history[recordIndex].eveningCompleted !== null) {
    history[recordIndex].eveningCompleted = null;
    updated = true;
  }
  
  if (updated) {
    if (history[recordIndex].morningCompleted === null && history[recordIndex].eveningCompleted === null) {
      history[recordIndex].missedReason = null;
    }
    safeSet(STORAGE_KEY, history);
    
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    logActivity(`${typeLabel} routine check-in undone`, 'Record reset');
  }
}

// --- Strict Analytics Export ---
export function getRoutineAnalytics() {
  const history = getHistory();
  let totalCompleted = 0;
  let totalMissed = 0;

  history.forEach(record => {
    if (record.morningCompleted === true) totalCompleted++;
    else if (record.morningCompleted === false) totalMissed++;
    
    if (record.eveningCompleted === true) totalCompleted++;
    else if (record.eveningCompleted === false) totalMissed++;
  });
  
  const totalActedUpon = totalCompleted + totalMissed; 
  const adherenceRate = totalActedUpon > 0 ? Math.round((totalCompleted / totalActedUpon) * 100) : 0;
  
  return { totalCompleted, totalMissed, totalExpected: totalActedUpon, adherenceRate };
}

// --- Comeback Intervention Flow ---
export function getLatestMissedDate() {
  const history = getHistory();
  const todayStr = getLocalDateString();
  
  const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  for (const record of sorted) {
    if (record.date >= todayStr) continue; 
    
    if (record.morningCompleted === false || record.eveningCompleted === false) {
      return record.date;
    }
  }
  return null;
}

export function getInterventionState() {
  return safeGet(INTERVENTION_KEY, { dismissedForDate: null });
}

export function shouldShowComeback() {
  const latestMiss = getLatestMissedDate();
  if (!latestMiss) return { show: false, date: null }; 
  
  const state = getInterventionState();
  if (state.dismissedForDate === latestMiss) return { show: false, date: null }; 
  
  return { show: true, date: latestMiss };
}

export function logInterventionAction(date, action, meta) {
  const state = getInterventionState();
  state.dismissedForDate = date; 
  safeSet(INTERVENTION_KEY, state);
  logActivity(action, meta);
}

// --- Journey & Activity Helpers ---
export function logActivity(label, meta) {
  const activities = safeGet(ACTIVITY_KEY, []);
  activities.unshift({ label, meta, timestamp: new Date().toISOString() });
  if (activities.length > 30) activities.pop();
  safeSet(ACTIVITY_KEY, activities);
}

export function getRecentActivity(limit = 4) {
  return safeGet(ACTIVITY_KEY, []).slice(0, limit);
}

export function setDocumented(dateStr, isDocumented) {
  const history = getHistory();
  let recordIndex = history.findIndex(r => r.date === dateStr);
  
  if (recordIndex === -1) {
    const user = getUser();
    const expected = user && user.routines ? Object.keys(user.routines) : [];
    history.push({
      date: dateStr,
      expectedRoutine: expected,
      morningCompleted: null,
      eveningCompleted: null,
      missedReason: null,
      documented: isDocumented
    });
  } else {
    history[recordIndex].documented = isDocumented;
  }
  
  safeSet(STORAGE_KEY, history);
}

export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ACTIVITY_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(INTERVENTION_KEY);
  initStorage();
}