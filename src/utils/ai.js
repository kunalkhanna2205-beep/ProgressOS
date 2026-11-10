/**
 * Core AI Service Wrapper
 * Handles secure communication with the backend, timeouts, and JSON parsing.
 */
async function callAI(action, payload, responseFormat = 'text') {
  try {
    const response = await fetch('/api/groq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, responseFormat })
    });
    
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    
    if (!data || typeof data.content !== 'string') {
        throw new Error('Malformed API structure');
    }
    
    return data.content;
  } catch (error) {
    console.warn(`[AI Service] Backend unavailable or failed (${action}). Triggering deterministic fallback.`, error);
    return null;
  }
}

export async function generateComebackCoaching(missedPeriods, latestMissReason) {
  const payload = `The user has missed ${missedPeriods} periods recently. Latest reason given for missing: ${latestMissReason || 'None recorded'}. Provide a realistic next step based on this.`;
  
  const aiResponse = await callAI('coach', payload);
  if (aiResponse) {
      return aiResponse.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  }
  
  return `You've had ${missedPeriods} interrupted period(s) recently. Let's focus on completing just one session today to rebuild your momentum smoothly.`;
}

export async function generateProgressInterpretation(analytics) {
  const payload = JSON.stringify(analytics);
  const aiResponse = await callAI('interpreter', payload, 'json');
  
  if (aiResponse) {
    try {
      const parsed = JSON.parse(aiResponse);
      if (parsed.summary && Array.isArray(parsed.observations) && parsed.recommendation) {
        return {
          summary: String(parsed.summary).replace(/</g, "&lt;"),
          observations: parsed.observations.map(o => String(o).replace(/</g, "&lt;")),
          recommendation: String(parsed.recommendation).replace(/</g, "&lt;")
        };
      } else {
        throw new Error("Invalid JSON Schema from LLM");
      }
    } catch (e) {
      console.warn("[AI Service] Failed to parse AI JSON or invalid schema, falling back.", e);
    }
  }
  
  // --- USER-CENTRIC DETERMINISTIC FALLBACK ---
  let comparisonText = '';
  let recommendationText = '';

  if (analytics.amRate === analytics.pmRate) {
    if (analytics.amRate === 100) {
      comparisonText = "Both your morning and evening routines were perfectly consistent.";
      recommendationText = "You have established a strong habit. Keep up the excellent work!";
    } else {
      comparisonText = "Your morning and evening routines were equally consistent.";
      recommendationText = "Try to identify any common obstacles that might be affecting both of your daily sessions.";
    }
  } else if (analytics.amRate > analytics.pmRate) {
    comparisonText = "Your morning routine was more consistent than your evening routine.";
    recommendationText = "Consider setting a reminder or adjusting the timing for your evening routine to improve overall consistency.";
  } else {
    comparisonText = "Your evening routine was more consistent than your morning routine.";
    recommendationText = "Consider setting a reminder or adjusting the timing for your morning routine to improve overall consistency.";
  }
  
  return {
    summary: `Over the last 30 days, you completed ${analytics.last30Done} of ${analytics.last30Expected} scheduled sessions.`,
    observations: [
      comparisonText,
      `You successfully resumed your routine ${analytics.successfulResumptions} times after an interruption.`
    ],
    recommendation: recommendationText
  };
}

export async function generateMonthlyStory(dateRangeText, monthAnalytics) {
  const payload = `Date Range: ${dateRangeText}. Data: ${JSON.stringify(monthAnalytics)}. Write a 3 sentence summary: 1. Completion summary. 2. Morning vs evening comparison. 3. One non-medical actionable tip based on the weakest routine.`;
  
  const aiResponse = await callAI('story', payload);
  if (aiResponse) {
      return aiResponse.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
  }
  
  if (monthAnalytics.expected === 0) {
    return `During ${dateRangeText}, there were no scheduled sessions recorded. Once you start tracking, your personalized summary will appear here.`;
  }
  
  let comparisonText = '';
  let tipText = '';

  if (monthAnalytics.amRate === monthAnalytics.pmRate) {
    if (monthAnalytics.amRate === 100) {
       comparisonText = "Both your morning and evening routines were perfectly consistent.";
       tipText = "Keep up the excellent work maintaining this strong habit.";
    } else {
       comparisonText = "Your morning and evening routines were equally consistent.";
       tipText = "Try to identify any common obstacles affecting both of your daily sessions.";
    }
  } else if (monthAnalytics.amRate > monthAnalytics.pmRate) {
      comparisonText = "Morning consistency was higher than evening consistency.";
      tipText = "Consider identifying what makes evening sessions harder to maintain.";
  } else {
      comparisonText = "Evening consistency was higher than morning consistency.";
      tipText = "Consider identifying what makes morning sessions harder to maintain.";
  }
  
  return `During ${dateRangeText}, you completed ${monthAnalytics.completed} of ${monthAnalytics.expected} scheduled sessions. ${comparisonText} ${tipText}`;
}