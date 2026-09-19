export function numberCore(value) {
  let normalized = String(value ?? '').normalize('NFKC').trim().toUpperCase();
  if (!normalized) return null;
  // Numeric denominators are presentation-only; promo series and letter
  // prefixes/suffixes must survive reconciliation as identity evidence.
  const coordinate = normalized.match(/^([^/]+)\/\s*\d+\s*$/);
  if (coordinate) normalized = coordinate[1].trim();
  const digits = normalized.match(/\d+/);
  if (!digits) return normalized.replace(/[\s-]+/g, '');
  const prefix = normalized.slice(0, digits.index).replace(/[\s-]+/g, '');
  const suffix = normalized.slice(digits.index + digits[0].length).replace(/[\s-]+/g, '');
  return `${prefix}${Number.parseInt(digits[0], 10)}${suffix}`;
}
