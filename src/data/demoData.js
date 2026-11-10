import { getLocalDateString } from '../utils/date.js';

export const demoState = {
  version: "v5.0.0",
  active: true
};

export function generateFictionalJourney() {
  const today = new Date(getLocalDateString());
  
  // Start exactly 91 days ago to match the 13-week photo journey
  const startDate = new Date(today.getTime());
  startDate.setDate(startDate.getDate() - 91);

  const history = [];
  const activities = [
    { label: "App installed", meta: "ProgressOS initialized", timestamp: startDate.toISOString() }
  ];
  
  const user = {
    name: "Alex",
    routines: {
      morning: { product: "Minoxidil 5% Topical", instruction: "Apply 1ml to affected areas on a dry scalp." },
      evening: { product: "Minoxidil 5% + Derma Roller", instruction: "Roll 5-10 times in one direction, apply 1ml." }
    }
  };

  // Determine exact photo dates from demoJourney logic (Weeks 1-13, skip 6 and 9)
  const photoDates = new Set([1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13].map(w => {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + (w * 7));
    return getLocalDateString(d);
  }));

  // Build the 91-day history
  for (let i = 0; i <= 91; i++) {
    const d = new Date(startDate.getTime());
    d.setDate(d.getDate() + i);
    const dateStr = getLocalDateString(d);

    let am = true;
    let pm = true;
    let reason = null;

    // --- Deterministic Fictional Narrative ---
    if (i >= 21 && i <= 24) { 
      // Week 3-4: Missed a few evenings
      pm = false; 
      reason = "Too busy";
    } else if (i >= 39 && i <= 44) { 
      // Week 6 gap: Major miss, ran out of product
      am = false; 
      pm = false; 
      reason = "Ran out of product";
    } else if (i >= 88 && i <= 90) { 
      // Recent gap (last 3 days): Trigger the Comeback Intervention for the recruiter today
      am = false; 
      pm = false; 
      reason = null; 
    }

    // Today (Day 91) should be strictly unrecorded so the recruiter can interact with it
    if (i === 91) {
      am = null; 
      pm = null; 
      reason = null;
    }

    history.push({
      date: dateStr,
      expectedRoutine: ['morning', 'evening'],
      morningCompleted: am,
      eveningCompleted: pm,
      missedReason: reason,
      documented: photoDates.has(dateStr)
    });
  }

  return { history, activities, user };
}