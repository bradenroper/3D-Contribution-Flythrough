export const WEEKS = 52;
export const DAYS_PER_WEEK = 7;
export const CELL_SIZE = 1;
export const CELL_GAP = 0.2;
export const X_OFFSET = - (WEEKS * (CELL_SIZE + CELL_GAP)) / 2;
export const Z_OFFSET = - (DAYS_PER_WEEK * (CELL_SIZE + CELL_GAP)) / 2;

export function generateData() {
  const data = [];
  let maxCount = 0;
  for (let w = 0; w < WEEKS; w++) {
    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      // Create some clusters to make interesting areas
      let noise = Math.sin(w / 3) * Math.cos(d / 2) + Math.sin(w / 5);
      let count = Math.max(0, Math.floor(Math.random() * 5 + noise * 3));
      if (count > maxCount) maxCount = count;
      data.push({ w, d, count });
    }
  }

  // Pre-select 3 interesting points (highest counts spread out)
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const highlights = [];
  for (const item of sorted) {
    if (highlights.length === 3) break;
    // ensure they are spread out across weeks
    let tooclose = false;
    for (const h of highlights) {
      if (Math.abs(h.w - item.w) < 10) tooclose = true;
    }
    if (!tooclose) highlights.push(item);
  }
  
  // Sort highlights by week so camera visits them in order
  highlights.sort((a, b) => a.w - b.w);

  return { data, maxCount, highlights };
}
