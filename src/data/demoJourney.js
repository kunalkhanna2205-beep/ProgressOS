import { getLocalDateString } from '../utils/date.js';

// Seeded PRNG
function splitmix32(a) {
  return function() {
    a |= 0; a = a + 0x9e3779b9 | 0;
    let t = a ^ a >>> 16; t = Math.imul(t, 0x21f0aaad);
    t = t ^ t >>> 15; t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
  }
}

// Generate realistic SVG scalp image filling the square frame
function renderScalpSVG({week, density, seed}) {
  const prng = splitmix32(seed);
  const width = 400;
  const height = 400;
  const cx = width / 2;
  const cy = height / 2;
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
    <defs>
      <radialGradient id="scalpGrad${week}" cx="50%" cy="50%" r="70%" fx="45%" fy="45%">
        <stop offset="0%" stop-color="#f5e0d3" />
        <stop offset="70%" stop-color="#eac5b2" />
        <stop offset="100%" stop-color="#cda087" />
      </radialGradient>
      <filter id="noise${week}">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0, 0 1 0 0 0, 0 0 1 0 0, 0 0 0 0.05 0" />
      </filter>
    </defs>
    <!-- Use rect to fill the whole square without white corners -->
    <rect width="100%" height="100%" fill="url(#scalpGrad${week})" />
    <rect width="100%" height="100%" style="mix-blend-mode: multiply;" filter="url(#noise${week})" />
  `;

  const totalHairs = Math.floor(5000 * density);
  for (let i = 0; i < totalHairs; i++) {
    const x = prng() * width;
    const y = prng() * height;

    const distFromCrown = Math.hypot(x - cx, y - cy);
    const crownFactor = Math.max(0, 1 - (distFromCrown / 130));
    
    if (prng() < crownFactor * (1.1 - density)) continue;

    const angle = (prng() * 60 - 30 + (x < cx ? 15 : -15)) * (Math.PI / 180);
    const len = 8 + prng() * 6;
    const x2 = x + Math.cos(angle) * len;
    const y2 = y + Math.sin(angle) * len;
    const strokeWidth = 1 + prng() * 0.8;
    const opacity = 0.6 + prng() * 0.4;
    
    svg += `<path d="M ${x} ${y} Q ${x + (x2-x)*0.5 + prng()*2} ${y + (y2-y)*0.5 + prng()*2} ${x2} ${y2}" stroke="#2a1f1a" stroke-width="${strokeWidth}" fill="none" opacity="${opacity}" stroke-linecap="round" />`;
  }

  svg += `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getDemoJourneyData() {
  const today = new Date(getLocalDateString());
  const entries = [];
  const baseSeed = 42;
  
  const startDate = new Date(today.getTime());
  startDate.setDate(startDate.getDate() - 91);

  for (let week = 1; week <= 13; week++) {
    if (week === 6 || week === 9) continue;

    const entryDate = new Date(startDate.getTime());
    entryDate.setDate(entryDate.getDate() + (week * 7));
    
    const dateStr = getLocalDateString(entryDate);
    const timestamp = new Date(`${dateStr}T08:30:00`).toISOString();

    let density;
    if (week <= 5) {
        density = 0.45 + (0.10 * (week / 5)); 
    } else if (week <= 10) {
        density = 0.55; 
    } else {
        density = 0.55 + (0.15 * ((week - 10) / 3)); 
    }
    
    let note = "";
    if (week === 1) note = "Starting tracking today. Crown feels thin in the light.";
    if (week === 4) note = "Missed a few evenings this week, getting back on track.";
    if (week === 7) note = "Same spot, same light as last time.";
    if (week === 11) note = "Coverage is looking slightly denser at the vertex.";
    if (week === 13) note = "Week 13 complete. Happy with the visual consistency.";

    entries.push({
      id: `demo_w${week}`,
      date: dateStr,
      timestamp: timestamp,
      weekNumber: week,
      angle: "Crown",
      lighting: "Daylight",
      note: note,
      imageUrl: renderScalpSVG({ week, density, seed: baseSeed + week }),
      isDemo: true
    });
  }

  return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// BUMP VERSION to force complete Demo Data reset
export const DEMO_DATA_VERSION = "v5.0.0";
