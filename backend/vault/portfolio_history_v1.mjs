// Pure server-side projection of complete, owner-private observations.
// This is not a capture, authorization, price qualification, or persistence API.
// Amounts remain exact decimal strings; never convert prices to Number.
export const PORTFOLIO_HISTORY_VERSION = 1;
export const PORTFOLIO_HISTORY_SCOPE = 'all_active_owned_copies';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const reasons = new Set(['no_qualified_price', 'unsupported_slab', 'ineligible_seal_state',
  'ineligible_package_condition', 'identity_unresolved', 'unsupported_currency', 'invalid_reference']);
const components = ['marketMovement', 'addedCopies', 'removedCopies', 'newPriceCoverage',
  'lostPriceCoverage', 'basisChanges'];
const zero = () => ({ n: 0n, scale: 0 });
function requireValue(condition, message) {
  if (!condition) throw new TypeError(message);
}
function record(value, keys, name) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value), `Invalid ${name}`);
  requireValue(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null,
    `Invalid ${name} prototype`);
  requireValue(Object.keys(value).sort().join('|') === [...keys].sort().join('|'), `Invalid ${name} fields`);
}
function normalize(value) {
  if (value.n === 0n) return zero();
  let { n, scale } = value;
  while (scale > 0 && n % 10n === 0n) { n /= 10n; scale--; }
  return { n, scale };
}
function decimal(value) {
  requireValue(typeof value === 'string' && value.length <= 1024 && /^(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(value),
    'Reference amount must be a bounded exact positive decimal string');
  const [whole, fraction = ''] = value.split('.');
  const result = normalize({ n: BigInt(whole + fraction), scale: fraction.length });
  requireValue(result.n > 0n, 'Reference amount must be positive');
  return result;
}
function add(a, b) {
  const scale = Math.max(a.scale, b.scale);
  return normalize({ n: a.n * 10n ** BigInt(scale - a.scale) + b.n * 10n ** BigInt(scale - b.scale), scale });
}
function negate(a) { return { n: -a.n, scale: a.scale }; }
function subtract(a, b) { return add(a, negate(b)); }
function text(a) {
  const normalized = normalize(a);
  const sign = normalized.n < 0n ? '-' : '';
  const digits = (normalized.n < 0n ? -normalized.n : normalized.n).toString().padStart(normalized.scale + 1, '0');
  return sign + (normalized.scale ? digits.slice(0, -normalized.scale) + '.' + digits.slice(-normalized.scale) : digits);
}
// Matches PostgreSQL numeric round: ties away from zero, after aggregation.
function roundedMinor(a) {
  if (a.scale <= 2) return a.n * 10n ** BigInt(2 - a.scale);
  const divisor = 10n ** BigInt(a.scale - 2);
  const absolute = a.n < 0n ? -a.n : a.n;
  const rounded = absolute / divisor + (absolute % divisor * 2n >= divisor ? 1n : 0n);
  return a.n < 0n ? -rounded : rounded;
}
function displayMinor(n) {
  const digits = (n < 0n ? -n : n).toString().padStart(3, '0');
  return (n < 0n ? '-' : '') + digits.slice(0, -2) + '.' + digits.slice(-2);
}
function timestamp(value, name) {
  requireValue(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value), `Invalid ${name}`);
  const parsed = Date.parse(value);
  requireValue(Number.isFinite(parsed) && new Date(parsed).toISOString() === value, `Invalid ${name}`);
  return parsed;
}
function observedTime(value, kind, captured) {
  if (kind === 'sealed' && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const midnight = timestamp(value + 'T00:00:00.000Z', 'observation date');
    requireValue(value <= new Date(captured).toISOString().slice(0, 10), 'Future price observation');
    // Use midnight only for validation, never as an invented source timestamp.
    return { date: value, time: midnight };
  }
  const time = timestamp(value, 'observation timestamp');
  requireValue(time <= captured, 'Future price observation');
  return { date: null, time };
}
function validate(snapshot) {
  record(snapshot, ['version', 'scope', 'ownerId', 'snapshotId', 'sequence', 'capturedAt', 'complete', 'ownedCount', 'copies'], 'observation');
  requireValue(snapshot.version === 1 && snapshot.scope === PORTFOLIO_HISTORY_SCOPE, 'Unsupported observation contract');
  requireValue(typeof snapshot.ownerId === 'string' && uuid.test(snapshot.ownerId), 'Invalid owner');
  requireValue(typeof snapshot.snapshotId === 'string' && uuid.test(snapshot.snapshotId), 'Invalid observation identity');
  requireValue(typeof snapshot.sequence === 'string' && /^[1-9][0-9]{0,18}$/.test(snapshot.sequence)
    && BigInt(snapshot.sequence) <= 9223372036854775807n, 'Invalid capture sequence');
  const captured = timestamp(snapshot.capturedAt, 'capture timestamp');
  requireValue(snapshot.complete === true && Array.isArray(snapshot.copies) && snapshot.copies.length <= 100000
    && snapshot.ownedCount === snapshot.copies.length, 'Incomplete or oversized observation');
  const copies = new Map();
  for (const copy of snapshot.copies) {
    record(copy, ['copyId', 'kind', 'basisKey', 'reference', 'unpricedReason'], 'copy');
    requireValue(typeof copy.copyId === 'string' && uuid.test(copy.copyId) && !copies.has(copy.copyId), 'Invalid or duplicate copy');
    requireValue(['raw', 'slab', 'sealed'].includes(copy.kind), 'Unsupported copy kind');
    // The capture authority supplies a digest of complete, versioned identity,
    // condition and valuation policy. Observation/publication IDs are excluded.
    requireValue(typeof copy.basisKey === 'string' && /^[0-9a-f]{64}$/.test(copy.basisKey), 'Invalid valuation basis');
    let amount = null;
    if (copy.reference === null) {
      requireValue(reasons.has(copy.unpricedReason), 'Unpriced copy needs an explicit reason');
    } else {
      record(copy.reference, ['amount', 'currency', 'provenanceId', 'observedAt', 'publishedAt'], 'reference');
      requireValue(copy.kind !== 'slab', 'Slab references are not supported by this valuation contract');
      requireValue(copy.unpricedReason === null, 'Priced copy cannot have an unpriced reason');
      requireValue(typeof copy.reference.currency === 'string' && /^[A-Z]{3}$/.test(copy.reference.currency), 'Invalid currency');
      requireValue(typeof copy.reference.provenanceId === 'string' && uuid.test(copy.reference.provenanceId), 'Missing price provenance');
      const observed = observedTime(copy.reference.observedAt, copy.kind, captured);
      if (copy.reference.publishedAt === null) {
        requireValue(copy.kind === 'sealed', 'Raw reference needs publication time');
      } else {
        const published = timestamp(copy.reference.publishedAt, 'publication timestamp');
        requireValue(published <= captured, 'Future price publication');
        requireValue(observed.date === null ? published >= observed.time : copy.reference.publishedAt.slice(0, 10) >= observed.date,
          'Publication precedes its observation');
      }
      amount = decimal(copy.reference.amount);
    }
    copies.set(copy.copyId, { copy, amount });
  }
  return { snapshot, copies, captured };
}
function totals(observation) {
  const sums = new Map();
  for (const { copy, amount } of observation.copies.values()) {
    if (amount !== null) sums.set(copy.reference.currency, add(sums.get(copy.reference.currency) ?? zero(), amount));
  }
  return sums;
}
function summarize(observation) {
  const byKind = Object.fromEntries(['raw', 'slab', 'sealed'].map(k => [k, { owned: 0, priced: 0, unpriced: 0 }]));
  const byReason = new Map();
  const byCurrency = new Map();
  let priced = 0;
  for (const { copy, amount } of observation.copies.values()) {
    byKind[copy.kind].owned++;
    if (amount === null) {
      byKind[copy.kind].unpriced++;
      byReason.set(copy.unpricedReason, (byReason.get(copy.unpricedReason) ?? 0) + 1);
    } else {
      priced++; byKind[copy.kind].priced++;
      byCurrency.set(copy.reference.currency, (byCurrency.get(copy.reference.currency) ?? 0) + 1);
    }
  }
  const owned = observation.copies.size;
  return {
    snapshotId: observation.snapshot.snapshotId, sequence: observation.snapshot.sequence, capturedAt: observation.snapshot.capturedAt,
    state: owned === 0 ? 'empty' : priced === 0 ? 'unpriced' : priced === owned ? 'priced' : 'partially_priced',
    coverage: { owned, priced, unpriced: owned - priced, byKind,
      byReason: Object.fromEntries([...byReason].sort()), byCurrency: Object.fromEntries([...byCurrency].sort()) },
    totals: Object.fromEntries([...totals(observation)].sort().map(([currency, amount]) => [currency,
      { exact: text(amount), display: displayMinor(roundedMinor(amount)) }])),
  };
}
export function summarizePortfolioObservationV1(snapshot) { return summarize(validate(snapshot)); }

export function comparePortfolioObservationsV1(previous, current) {
  const before = validate(previous), after = validate(current);
  requireValue(previous.ownerId === current.ownerId, 'Cannot compare different owners');
  requireValue(previous.snapshotId !== current.snapshotId, 'A retry is the same observation, not a new point');
  requireValue(BigInt(current.sequence) > BigInt(previous.sequence) && after.captured >= before.captured,
    'Observations must follow capture sequence and chronological order');
  const beforeSums = totals(before), afterSums = totals(after), changes = new Map();
  const counts = { addedCopies: 0, removedCopies: 0, basisChangedCopies: 0, newlyPricedCopies: 0,
    lostPricedCopies: 0, comparablePricedCopies: 0, unchangedUnpricedCopies: 0 };
  function contribute(name, row, direction = 1n) {
    if (row.amount === null) return;
    const currency = row.copy.reference.currency;
    if (!changes.has(currency)) changes.set(currency, Object.fromEntries(components.map(k => [k, zero()])));
    const bucket = changes.get(currency);
    bucket[name] = add(bucket[name], { n: direction * row.amount.n, scale: row.amount.scale });
  }
  for (const id of new Set([...before.copies.keys(), ...after.copies.keys()])) {
    const old = before.copies.get(id), next = after.copies.get(id);
    if (!old) { counts.addedCopies++; contribute('addedCopies', next); }
    else if (!next) { counts.removedCopies++; contribute('removedCopies', old, -1n); }
    else if (old.copy.kind !== next.copy.kind || old.copy.basisKey !== next.copy.basisKey
      || (old.amount !== null && next.amount !== null && old.copy.reference.currency !== next.copy.reference.currency)) {
      counts.basisChangedCopies++; contribute('basisChanges', old, -1n); contribute('basisChanges', next);
    } else if (old.amount !== null && next.amount !== null) {
      counts.comparablePricedCopies++; contribute('marketMovement', old, -1n); contribute('marketMovement', next);
    } else if (old.amount === null && next.amount !== null) {
      counts.newlyPricedCopies++; contribute('newPriceCoverage', next);
    } else if (old.amount !== null && next.amount === null) {
      counts.lostPricedCopies++; contribute('lostPriceCoverage', old, -1n);
    } else { counts.unchangedUnpricedCopies++; }
  }
  const currencies = [...new Set([...beforeSums.keys(), ...afterSums.keys()])].sort();
  const result = {};
  for (const currency of currencies) {
    const old = beforeSums.get(currency) ?? zero(), next = afterSums.get(currency) ?? zero();
    const bucket = changes.get(currency) ?? Object.fromEntries(components.map(k => [k, zero()]));
    const exactChange = subtract(next, old);
    requireValue(text(components.reduce((sum, key) => add(sum, bucket[key]), zero())) === text(exactChange), 'Portfolio changes do not reconcile');
    const displayChange = roundedMinor(next) - roundedMinor(old);
    const displayedComponents = Object.fromEntries(components.map(k => [k, displayMinor(roundedMinor(bucket[k]))]));
    const roundingAdjustment = displayChange - components.reduce((sum, k) => sum + roundedMinor(bucket[k]), 0n);
    result[currency] = {
      before: text(old), after: text(next), difference: text(exactChange),
      components: Object.fromEntries(components.map(k => [k, text(bucket[k])])),
      display: { scale: 2, before: displayMinor(roundedMinor(old)), after: displayMinor(roundedMinor(next)),
        difference: displayMinor(displayChange), components: displayedComponents, roundingAdjustment: displayMinor(roundingAdjustment) },
    };
  }
  return { version: 1, scope: PORTFOLIO_HISTORY_SCOPE, before: summarize(before), after: summarize(after), counts,
    currencies: result, meaning: 'reference_value_change', isProfit: false, isCashFlow: false };
}
