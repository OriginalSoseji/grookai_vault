import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { summarizePortfolioObservationV1 as summary, comparePortfolioObservationsV1 as compare,
  PORTFOLIO_HISTORY_SCOPE } from '../../backend/vault/portfolio_history_v1.mjs';

const id = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const basis = s => createHash('sha256').update(s).digest('hex');
function copy(n, amount, { kind = 'raw', currency = 'USD', key = `printing-${n}`, reason = 'no_qualified_price' } = {}) {
  return { copyId: id(n), kind, basisKey: basis(key), unpricedReason: amount === null ? reason : null,
    reference: amount === null ? null : { amount, currency, provenanceId: id(9000 + n),
      observedAt: '2026-10-08T09:00:00.000Z', publishedAt: kind === 'sealed' ? null : '2026-10-08T10:00:00.000Z' } };
}
function point(copies = [], later = false) {
  return { version: 1, scope: PORTFOLIO_HISTORY_SCOPE, ownerId: id(1000), snapshotId: id(later ? 1002 : 1001),
    sequence: later ? '2' : '1', capturedAt: `2026-10-08T${later ? '12' : '11'}:00:00.000Z`, complete: true, ownedCount: copies.length, copies };
}
const clone = value => structuredClone(value);

test('flat total and equal coverage still explain all six independent changes', () => {
  const result = compare(point([copy(1, '10'), copy(2, '8'), copy(3, null), copy(4, '11'), copy(5, '4')]),
    point([copy(1, '12'), copy(3, '7'), copy(4, null), copy(5, '9', { key: 'corrected-printing' }), copy(6, '5')], true));
  assert.equal(result.currencies.USD.before, '33');
  assert.equal(result.currencies.USD.after, '33');
  assert.equal(result.currencies.USD.difference, '0');
  assert.deepEqual(result.currencies.USD.components, { marketMovement: '2', addedCopies: '5', removedCopies: '-8',
    newPriceCoverage: '7', lostPriceCoverage: '-11', basisChanges: '5' });
  assert.equal(result.before.coverage.priced, 4); assert.equal(result.after.coverage.priced, 4);
  assert.equal(result.counts.comparablePricedCopies, 1);
  assert.equal(result.isProfit, false); assert.equal(result.isCashFlow, false);
});

test('sub-cent references aggregate before rounding', () => {
  const result = compare(point([1, 2, 3].map(n => copy(n, '0.014'))), point([1, 2, 3].map(n => copy(n, '0.016')), true));
  assert.equal(result.currencies.USD.before, '0.042'); assert.equal(result.currencies.USD.after, '0.048');
  assert.equal(result.currencies.USD.difference, '0.006');
  assert.equal(result.currencies.USD.display.before, '0.04'); assert.equal(result.currencies.USD.display.after, '0.05');
  assert.equal(result.currencies.USD.display.difference, '0.01');
});

test('rounded components reconcile through an explicit adjustment', () => {
  const result = compare(point([copy(1, '1'), copy(2, null)]), point([copy(1, '1.004'), copy(2, '0.004')], true));
  assert.equal(result.currencies.USD.display.difference, '0.01');
  assert.equal(result.currencies.USD.display.components.marketMovement, '0.00');
  assert.equal(result.currencies.USD.display.components.newPriceCoverage, '0.00');
  assert.equal(result.currencies.USD.display.roundingAdjustment, '0.01');
});

test('negative half-cent component rounds away from zero and discloses reconciliation', () => {
  const result = compare(point([copy(1, '1.005')]), point([copy(1, '1')], true));
  assert.equal(result.currencies.USD.display.components.marketMovement, '-0.01');
  assert.equal(result.currencies.USD.display.difference, '-0.01');
  assert.equal(result.currencies.USD.display.roundingAdjustment, '0.00');
});

test('precision exceeds binary floating point without rounding or exponent conversion', () => {
  const before = '9007199254740993.000000000000000000000001';
  const after = '9007199254740993.000000000000000000000003';
  const result = compare(point([copy(1, before)]), point([copy(1, after)], true));
  assert.equal(result.currencies.USD.before, before);
  assert.equal(result.currencies.USD.difference, '0.000000000000000000000002');
});

test('empty, all-unpriced, partial and fully priced states are distinct', () => {
  assert.equal(summary(point()).state, 'empty');
  const unpriced = summary(point([copy(1, null)]));
  assert.equal(unpriced.state, 'unpriced'); assert.deepEqual(unpriced.totals, {});
  assert.equal(summary(point([copy(1, null), copy(2, '2')])).state, 'partially_priced');
  assert.equal(summary(point([copy(1, '2')])).state, 'priced');
});

test('first observation summary contains no fabricated previous point or performance', () => {
  const result = summary(point([copy(1, '2')]));
  assert.equal(result.capturedAt, '2026-10-08T11:00:00.000Z');
  for (const key of ['before', 'difference', 'percentage', 'profit']) assert.equal(Object.hasOwn(result, key), false);
});

test('new and removed unpriced holdings affect counts but cannot invent value', () => {
  const result = compare(point([copy(1, null)]), point([copy(2, null)], true));
  assert.equal(result.counts.addedCopies, 1); assert.equal(result.counts.removedCopies, 1);
  assert.deepEqual(result.currencies, {});
});

test('slabs remain owned and explicitly unsupported', () => {
  const result = summary(point([copy(1, null, { kind: 'slab', reason: 'unsupported_slab' }), copy(2, '2')]));
  assert.deepEqual(result.coverage.byKind.slab, { owned: 1, priced: 0, unpriced: 1 });
  assert.equal(result.coverage.byReason.unsupported_slab, 1);
  assert.throws(() => summary(point([copy(1, '2', { kind: 'slab' })])), /Slab references/);
});

test('opening sealed ownership changes valuation basis rather than implying market loss or disposal', () => {
  const result = compare(point([copy(1, '25', { kind: 'sealed', key: 'factory-sealed' })]),
    point([copy(1, null, { kind: 'sealed', key: 'opened', reason: 'ineligible_seal_state' })], true));
  assert.equal(result.after.coverage.owned, 1); assert.equal(result.counts.removedCopies, 0);
  assert.equal(result.currencies.USD.components.basisChanges, '-25');
  assert.equal(result.currencies.USD.components.marketMovement, '0');
  assert.equal(result.currencies.USD.components.lostPriceCoverage, '0');
});

test('currency changes never become converted market movement', () => {
  const result = compare(point([copy(1, '10', { currency: 'EUR' })]), point([copy(1, '12')], true));
  assert.equal(result.counts.basisChangedCopies, 1);
  assert.equal(result.currencies.EUR.components.basisChanges, '-10');
  assert.equal(result.currencies.USD.components.basisChanges, '12');
  assert.equal(result.currencies.USD.components.marketMovement, '0');
  assert.equal(result.before.coverage.byCurrency.EUR, 1);
});

test('separate currencies never create a combined grand total', () => {
  const result = summary(point([copy(1, '4', { currency: 'EUR' }), copy(2, '5')]));
  assert.deepEqual(result.totals, { EUR: { exact: '4', display: '4.00' }, USD: { exact: '5', display: '5.00' } });
  assert.equal(Object.hasOwn(result, 'total'), false);
});

test('new publication provenance does not change an otherwise identical basis', () => {
  const next = point([copy(1, '11')], true); next.copies[0].reference.provenanceId = id(8999);
  const result = compare(point([copy(1, '10')]), next);
  assert.equal(result.counts.comparablePricedCopies, 1);
  assert.equal(result.currencies.USD.components.marketMovement, '1');
});

test('sealed date-only observations retain their real precision without invented timestamps', () => {
  const p = point([copy(1, '25', { kind: 'sealed' })]);
  p.copies[0].reference.observedAt = '2026-10-08';
  assert.equal(summary(p).totals.USD.exact, '25');
  assert.equal(p.copies[0].reference.observedAt, '2026-10-08');
  p.copies[0].reference.observedAt = '2026-10-09';
  assert.throws(() => summary(p), /Future/);
  p.copies[0].reference.observedAt = '2026-02-30';
  assert.throws(() => summary(p), /observation date/);
});

test('raw timestamps cannot be replaced by a date-only assertion', () => {
  const p = point([copy(1, '25')]); p.copies[0].reference.observedAt = '2026-10-08';
  assert.throws(() => summary(p), /observation timestamp/);
});

for (const [name, mutate, pattern] of [
  ['incomplete read', p => { p.complete = false; }, /Incomplete/],
  ['partial page', p => { p.ownedCount = 2; }, /Incomplete/],
  ['duplicate copy', p => { p.copies.push(clone(p.copies[0])); p.ownedCount++; }, /duplicate copy/],
  ['unsupported scope', p => { p.scope = 'current_page'; }, /Unsupported/],
  ['unknown contract', p => { p.version = 2; }, /Unsupported/],
  ['invalid sequence', p => { p.sequence = '9223372036854775808'; }, /sequence/],
  ['unknown copy kind', p => { p.copies[0].kind = 'other'; }, /Unsupported/],
  ['missing basis', p => { p.copies[0].basisKey = ''; }, /valuation basis/],
  ['extra copy field', p => { p.copies[0].notes = 'private'; }, /fields/],
  ['missing provenance', p => { p.copies[0].reference.provenanceId = null; }, /provenance/],
  ['future observation', p => { p.copies[0].reference.observedAt = '2026-10-09T09:00:00.000Z'; }, /Future/],
  ['future publication', p => { p.copies[0].reference.publishedAt = '2026-10-09T09:00:00.000Z'; }, /Future/],
  ['publication before observation', p => { p.copies[0].reference.publishedAt = '2026-10-08T08:00:00.000Z'; }, /precedes/],
  ['missing raw publication', p => { p.copies[0].reference.publishedAt = null; }, /publication time/],
  ['impossible date', p => { p.capturedAt = '2026-02-30T11:00:00.000Z'; }, /timestamp/],
  ['priced and unpriced', p => { p.copies[0].unpricedReason = 'no_qualified_price'; }, /Priced copy/],
  ['missing unpriced reason', p => { p.copies[0].reference = null; }, /explicit reason/],
  ['invalid currency', p => { p.copies[0].reference.currency = 'usd'; }, /currency/],
]) test(`rejects ${name} without turning it into an empty observation`, () => {
  const p = point([copy(1, '1')]); mutate(p); assert.throws(() => summary(p), pattern);
});

for (const value of [0, 1, null, '', '0', '-1', 'NaN', 'Infinity', '1e3', '01.2', '1.', '.5', ' 1', '1'.repeat(1025)]) {
  test(`rejects unsafe amount ${String(value).slice(0, 25)}`, () => {
    const p = point([copy(1, '1')]); p.copies[0].reference.amount = value;
    assert.throws(() => summary(p));
  });
}

test('same owner, new point identity and increasing sequence are required', () => {
  const a = point([copy(1, '1')]), b = point([copy(1, '2')], true);
  assert.throws(() => compare(a, { ...b, ownerId: id(1003) }), /different owners/);
  assert.throws(() => compare(a, { ...b, snapshotId: a.snapshotId }), /same observation/);
  assert.throws(() => compare(b, a), /chronological/);
  assert.throws(() => compare(a, { ...b, sequence: a.sequence }), /sequence/);
  assert.throws(() => compare(a, { ...b, sequence: '0' }), /sequence/);
  assert.equal(compare(a, { ...b, capturedAt: a.capturedAt }).currencies.USD.difference, '1');
});

test('canonical output is invariant under row order and inputs remain unchanged', () => {
  const a = point([copy(1, '1.000'), copy(2, '2', { currency: 'EUR' }), copy(3, null)]);
  const b = point([copy(3, '4'), copy(2, '3', { currency: 'EUR' }), copy(1, '2.00')], true);
  const saved = JSON.stringify([a, b]), expected = compare(a, b);
  assert.deepEqual(compare({ ...a, copies: [...a.copies].reverse() }, { ...b, copies: [...b.copies].reverse() }), expected);
  assert.equal(JSON.stringify([a, b]), saved);
  assert.equal(expected.currencies.USD.after, '6');
});

test('200 generated portfolios reconcile against an independent integer oracle', () => {
  let seed = 5678;
  const random = max => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  const fixed = minor => `${Math.floor(minor / 1000)}.${String(minor % 1000).padStart(3, '0')}`;
  const milli = s => { const [whole, frac = ''] = s.split('.'); return Number(whole) * 1000 + Number((frac + '000').slice(0, 3)) * (s.startsWith('-') ? -1 : 1); };
  for (let trial = 0; trial < 200; trial++) {
    const a = [], b = []; let before = 0, after = 0;
    for (let n = 1; n <= 30; n++) {
      if (random(4)) { const amount = random(3) ? random(100000) + 1 : null; a.push(copy(n, amount === null ? null : fixed(amount))); before += amount ?? 0; }
      if (random(4)) { const amount = random(3) ? random(100000) + 1 : null; b.push(copy(n, amount === null ? null : fixed(amount), { key: random(3) ? `printing-${n}` : `new-${n}` })); after += amount ?? 0; }
    }
    const r = compare(point(a), point(b, true)).currencies.USD;
    assert.equal(milli(r.before), before); assert.equal(milli(r.after), after);
    assert.equal(milli(r.difference), after - before);
    assert.equal(Object.values(r.components).reduce((sum, x) => sum + milli(x), 0), after - before);
    assert.equal(milli(r.display.after) - milli(r.display.before), milli(r.display.difference));
    assert.equal(Object.values(r.display.components).reduce((sum, x) => sum + milli(x), 0) + milli(r.display.roundingAdjustment), milli(r.display.difference));
  }
});
