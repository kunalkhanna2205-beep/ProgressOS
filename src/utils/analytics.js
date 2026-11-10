export function calculateAdherence(history, startDateStr, endDateStr) {
  let amExpected = 0, amDone = 0;
  let pmExpected = 0, pmDone = 0;

  history.forEach(day => {
    if (day.date < startDateStr || day.date > endDateStr) return;

    const expected = day.expectedRoutine || [];
    const expectsMorning = expected.includes('morning');
    const expectsEvening = expected.includes('evening');

    if (expectsMorning) {
      if (day.morningCompleted === true || day.morningCompleted === false) amExpected++;
      if (day.morningCompleted === true) amDone++;
    }
    if (expectsEvening) {
      if (day.eveningCompleted === true || day.eveningCompleted === false) pmExpected++;
      if (day.eveningCompleted === true) pmDone++;
    }
  });

  const totalExpected = amExpected + pmExpected;
  const totalDone = amDone + pmDone;

  return {
    totalRate: totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0,
    amRate: amExpected > 0 ? Math.round((amDone / amExpected) * 100) : 0,
    pmRate: pmExpected > 0 ? Math.round((pmDone / pmExpected) * 100) : 0,
    totalExpected,
    totalDone,
    amExpected,
    amDone,
    pmExpected,
    pmDone
  };
}

export function calculateRecovery(history, startDateStr, endDateStr) {
  let missedSessions = 0;
  let resumptions = 0;
  let totalRecoveryDays = 0;
  let isInterrupted = false;
  let missStartDate = null;
  let interruptions = [];

  const sortedHistory = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedHistory.forEach(day => {
    const expected = day.expectedRoutine || [];
    const expectsMorning = expected.includes('morning');
    const expectsEvening = expected.includes('evening');
    
    if (!expectsMorning && !expectsEvening) return;

    let dayAmExpected = 0, dayAmMiss = 0, dayAmDone = 0;
    let dayPmExpected = 0, dayPmMiss = 0, dayPmDone = 0;

    if (expectsMorning) {
        if (day.morningCompleted === true || day.morningCompleted === false) dayAmExpected++;
        if (day.morningCompleted === false) dayAmMiss++;
        if (day.morningCompleted === true) dayAmDone++;
    }
    if (expectsEvening) {
        if (day.eveningCompleted === true || day.eveningCompleted === false) dayPmExpected++;
        if (day.eveningCompleted === false) dayPmMiss++;
        if (day.eveningCompleted === true) dayPmDone++;
    }

    const dayTotalExpected = dayAmExpected + dayPmExpected;
    const dayTotalMiss = dayAmMiss + dayPmMiss;
    const dayTotalDone = dayAmDone + dayPmDone;

    const isFullMiss = (dayTotalMiss === dayTotalExpected && dayTotalExpected > 0);
    const hasTrue = dayTotalDone > 0;
    const inRange = day.date >= startDateStr && day.date <= endDateStr;

    if (inRange) {
      missedSessions += dayTotalMiss;
    }

    if (isFullMiss && !isInterrupted) {
      isInterrupted = true;
      missStartDate = new Date(day.date);
    } else if (hasTrue && isInterrupted) {
      isInterrupted = false;
      const resumeDate = new Date(day.date);
      if (missStartDate && resumeDate > missStartDate) {
          if (inRange) {
            resumptions++;
            const duration = Math.round((resumeDate - missStartDate) / (1000 * 60 * 60 * 24));
            totalRecoveryDays += duration;
            
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            interruptions.push({
                start: missStartDate.toLocaleDateString('en-US', options),
                end: resumeDate.toLocaleDateString('en-US', options),
                duration,
                status: 'Resumed'
            });
          }
      }
    }
  });

  if (isInterrupted && missStartDate) {
      // Unresolved interruptions
      if (missStartDate.toISOString().split('T')[0] <= endDateStr) {
          const lastDate = new Date(sortedHistory[sortedHistory.length - 1].date);
          let duration = Math.round((lastDate - missStartDate) / (1000 * 60 * 60 * 24));
          if (duration === 0) duration = 1;
          const options = { month: 'short', day: 'numeric', year: 'numeric' };
          interruptions.push({
              start: missStartDate.toLocaleDateString('en-US', options),
              end: 'Ongoing',
              duration,
              status: 'Excluded (Ongoing)'
          });
      }
  }

  return { 
      missedSessions, 
      resumptions, 
      totalRecoveryDays, 
      avgRecovery: resumptions > 0 ? (totalRecoveryDays / resumptions).toFixed(1) : '0.0',
      interruptions
  };
}

export function calculateDocumentation(entries, history, startDateStr, endDateStr) {
  const rangeEntries = entries.filter(e => e.date >= startDateStr && e.date <= endDateStr);
  const journalCount = rangeEntries.length;
  const photoCount = rangeEntries.filter(e => e.imageBlob || e.imageUrl).length;
  
  const documentedDaysSet = new Set(rangeEntries.map(e => e.date));
  
  history.forEach(day => {
    if (day.date >= startDateStr && day.date <= endDateStr) {
      if (day.documented === true) {
        documentedDaysSet.add(day.date);
      }
    }
  });

  return { journalCount, photoCount, documentedDays: documentedDaysSet.size };
}