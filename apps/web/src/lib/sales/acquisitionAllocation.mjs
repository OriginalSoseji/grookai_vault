// Deterministic cent allocation. The sum always equals the cash total, even when
// the total cannot be divided evenly. Earlier lines receive the remainder cents.
export function equalSplit(totalMinor, count) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || !Number.isInteger(count) || count < 1) throw Error('Enter a total and at least one exact copy.');
  const base = Math.floor(totalMinor / count), remainder = totalMinor % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function weightedSplit(totalMinor, weights) {
  if (!Number.isSafeInteger(totalMinor) || totalMinor < 0 || !Array.isArray(weights) || !weights.length || weights.some(value => !Number.isSafeInteger(value) || value < 0)) throw Error('Reference values must be nonnegative whole cents.');
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return equalSplit(totalMinor, weights.length);
  const raw = weights.map(value => Math.floor(totalMinor * value / sum));
  let remainder = totalMinor - raw.reduce((a, b) => a + b, 0);
  for (let index = 0; remainder > 0; index = (index + 1) % raw.length, remainder -= 1) raw[index] += 1;
  return raw;
}

export function allocationPreview(totalMinor, lines, mode = 'equal_split') {
  if (!Array.isArray(lines) || !lines.length) return [];
  if (mode === 'weighted_reference') return weightedSplit(totalMinor, lines.map(line => Number(line.referenceMinor) || 0));
  if (mode === 'manual') return lines.map(line => Number(line.allocatedMinor) || 0);
  return equalSplit(totalMinor, lines.length);
}
