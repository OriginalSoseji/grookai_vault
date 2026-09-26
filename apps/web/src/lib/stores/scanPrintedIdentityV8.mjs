// Printed coordinates are evidence, never a new canonical identity or finish.
const positive = value => Number.isSafeInteger(value) && value > 0 ? value : null;
const code = value => typeof value === 'string' && /^[A-Z0-9]{2,8}$/i.test(value.trim()) ? value.trim().toUpperCase() : null;

export function printedCoordinates(card, set) {
  return {
    total: positive(card?.printed_total) ?? (set?.identity_model === 'reprint_anthology' ? null : positive(set?.printed_total)),
    setCode: code(card?.printed_set_abbrev) ?? code(set?.printed_set_abbrev),
  };
}

export function collectorToken(value) {
  const match = String(value ?? '').trim().toUpperCase().match(/^([A-Z]{0,5})(\d{1,4})([A-Z]?)$/);
  return match ? { prefix: match[1], digits: Number(match[2]), suffix: match[3], key: `${match[1]}${Number(match[2])}${match[3]}` } : null;
}

export function readPrintedFooter(text) {
  const normalized = String(text ?? '').normalize('NFKC').toUpperCase();
  const fractions = [...normalized.matchAll(/(?<![A-Z0-9])([A-Z]{0,5}\d{1,4}[A-Z]?)\s*\/\s*([A-Z]{0,5}\d{1,4})(?![A-Z0-9])/g)]
    .map(match => ({ number: collectorToken(match[1]), total: collectorToken(match[2]) }))
    .filter(row => row.number && row.total && row.total.digits > 0 && row.total.digits <= 999 && (!row.total.prefix || row.total.prefix === row.number.prefix));
  // A standalone promo must retain its prefix. Bare years/HP are not identifiers.
  const promos = (normalized.includes('/') ? [] : [...normalized.matchAll(/(?<![A-Z0-9])([A-Z]{1,5}\d{1,4}[A-Z]?)(?![A-Z0-9])/g)])
    .map(match => collectorToken(match[1]));
  const setCodes = [...new Set([...normalized.matchAll(/(?<![A-Z0-9])([A-Z0-9]{2,8})\s+EN(?![A-Z0-9])/g)].map(match => match[1]))];
  return { fractions, promos, setCodes };
}

export function printedIdentityEvidence(footer, number, coordinates = {}) {
  const expected = collectorToken(number), read = readPrintedFooter(footer);
  const exact = expected ? read.fractions.filter(row => row.number.key === expected.key) : [];
  const knownTotal = positive(coordinates.total), knownSet = code(coordinates.setCode);
  const numberConflict = Boolean(expected) && read.fractions.some(row => row.number.key !== expected.key);
  const totals = new Set(exact.map(row => row.total.key));
  const totalConflict = totals.size > 1 || Boolean(knownTotal && exact.some(row => row.total.digits !== knownTotal));
  const setConflict = Boolean(knownSet && read.setCodes.some(value => value !== knownSet));
  const numberMatch = exact.length > 0 || Boolean(expected?.prefix && !read.fractions.length && read.promos.some(row => row.key === expected.key));
  return { numberMatch, numberConflict, totalConflict, setConflict,
    conflict: numberConflict || totalConflict || setConflict,
    totalMatch: Boolean(knownTotal && exact.length && !totalConflict),
    setMatch: Boolean(knownSet && read.setCodes.length && !setConflict),
    totalKnown: Boolean(knownTotal), setKnown: Boolean(knownSet) };
}
