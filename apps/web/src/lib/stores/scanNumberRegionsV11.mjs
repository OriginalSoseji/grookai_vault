// OCR word boxes locate pixels to reread; their text never supplies a guessed ID.
export const MAX_NUMBER_REGIONS = 2;
export function numberWordRegions(data, width, height) {
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0)) return [];
  const regions = [], seen = new Set();
  for (const block of data.blocks ?? []) for (const paragraph of block.paragraphs ?? []) for (const line of paragraph.lines ?? []) for (const word of line.words ?? []) {
    if (!Number.isFinite(word.confidence) || word.confidence < 0 || word.confidence >= 75) continue;
    const text = String(word.text ?? '');
    if (!/\d\s*\/\s*(?:[A-Z]{0,5})\d/i.test(text) && (text.match(/\d/g) ?? []).length < 5) continue;
    const box = word.bbox;
    if (!box || ![box.x0, box.y0, box.x1, box.y1].every(Number.isSafeInteger) || box.x0 < 0 || box.y0 < 0 || box.x1 > width || box.y1 > height || box.x1 <= box.x0 || box.y1 <= box.y0) continue;
    const left = Math.max(0, box.x0 - 3), top = Math.max(0, box.y0 - 3);
    const region = { left, top, width: Math.min(width, box.x1 + 3) - left, height: Math.min(height, box.y1 + 3) - top };
    // Avoid amplifying a bogus narrow/tall box or a whole footer into a huge OCR bitmap.
    if (region.width / region.height < 1 || region.width / region.height > 20) continue;
    const key = JSON.stringify(region);
    if (seen.has(key)) continue;
    seen.add(key); regions.push(region);
    if (regions.length === MAX_NUMBER_REGIONS) return regions;
  }
  return regions;
}
