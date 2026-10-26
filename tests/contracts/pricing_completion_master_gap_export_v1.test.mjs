import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPricingCompletionMasterGapExportV1, readPricingCompletionMasterSnapshotV1 } from '../../backend/pricing/pricing_completion_master_gap_export_v1.mjs';
import { normalizePricingCompletionSnapshotV1 } from '../../backend/pricing/pricing_completion_intake_v1.mjs';

const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const observedAt = '2026-10-13T12:00:00.000Z';
const scope = () => ({ games: ['pokemon'], currency: 'USD', sourceRunId: 'retained-run', observedAt, evidenceRef: 'fixture/exact-readback' });
function fixture() {
  const parents = [{ id: uuid(1), gv_id: 'GV-PK-BASE-001', name: 'Card', set_id: uuid(3), set_code: 'base', game: 'pokemon', set_game: 'pokemon' }];
  const printings = [{ id: uuid(2), card_print_id: uuid(1), printing_gv_id: 'GV-PK-BASE-001-HOLO', finish_key: 'holo' }];
  const prices = [{ pricing_scope: 'card_printing', card_print_id: uuid(1), card_printing_id: uuid(2),
    gv_id: parents[0].gv_id, printing_gv_id: printings[0].printing_gv_id, finish_key: 'holo',
    status: 'available', currency: 'USD', market_close: '10.25', freshness: 'fresh', source_name: 'tcgplayer',
    observed_at: '2026-10-12T13:00:00.000Z', published_at: '2026-10-13T11:00:00.000Z',
    provenance_id: uuid(4), is_from_price: false, eligible_printing_count: 1 }];
  return { scope: scope(), inventoryComplete: true, readbackComplete: true, parents, printings, prices };
}
test('positive exact fresh market price completes only the declared market-basis scope', () => {
  const result = buildPricingCompletionMasterGapExportV1(fixture());
  assert.equal(result.summary.freshPriced, 1); assert.equal(result.observations.length, 0);
  assert.equal(result.usablePrices[0].marketClose, '10.25');
  assert.equal(result.usablePrices[0].condition, 'NOT_CONDITION_SPECIFIC');
  assert.equal(result.usablePrices[0].physicalConditionVerified, false);
  assert.equal(result.coverage.masterToPrice.status, 'complete');
  assert.equal(result.summary.completionAllowed, true);
  assert.equal(result.summary.completionScope, 'pokemon/USD/TCGPLAYER_MARKET');
});
test('physical-condition or other price-basis requests cannot be silently treated as aggregate market quotes', () => {
  for (const changes of [{ condition: 'NM' }, { condition: 'UNKNOWN' }, { priceBasis: 'EBAY_SOLD' }]) {
    const input = fixture(); Object.assign(input.scope, changes);
    assert.throws(() => buildPricingCompletionMasterGapExportV1(input));
  }
});
test('unavailable exact printing is retained as a dimension-truthful queue gap', () => {
  const input = fixture(); Object.assign(input.prices[0], { status: 'unavailable', market_close: null, currency: null,
    freshness: 'unavailable', observed_at: null, published_at: null, provenance_id: null, eligible_printing_count: 0 });
  const result = buildPricingCompletionMasterGapExportV1(input);
  assert.equal(result.observations.length, 1); assert.equal(result.observations[0].identity.printingId, uuid(2));
  assert.equal(result.observations[0].identity.condition, 'NOT_CONDITION_SPECIFIC');
  assert.equal(result.observations[0].evidence.priceBasis, 'TCGPLAYER_MARKET');
  assert.equal(result.observations[0].evidence.physicalConditionVerified, false);
  assert.equal(result.coverage.masterToPrice.status, 'complete');
  assert.equal(result.summary.completionAllowed, false);
  const normalized = normalizePricingCompletionSnapshotV1({ schemaVersion: 'pricing-completion-input-v1',
    sourceRunId: scope().sourceRunId, observedAt, coverage: { sourceToMaster: { status: 'unknown' }, ...result.coverage }, observations: result.observations }, { now: Date.parse(observedAt) });
  assert.equal(normalized.summary.masterReportedUnresolved, 1);
  assert.equal(normalized.summary.unknownIdentityDimensions, 0);
});
test('parent without exact children stays unresolved coverage with no invented printing identity', () => {
  const input = fixture(); input.printings = []; input.prices = [];
  const result = buildPricingCompletionMasterGapExportV1(input);
  assert.equal(result.parentsWithoutPrintings[0].parentId, uuid(1));
  assert.equal(result.parentsWithoutPrintings[0].printingId, null);
  assert.equal(result.observations.length, 0); assert.equal(result.coverage.masterToPrice.expectedUnresolved, 1);
  assert.equal(result.coverage.masterToPrice.status, 'partial'); assert.equal(result.summary.completionAllowed, false);
});
for (const [label, changes, reason] of [
  ['zero', { market_close: 0 }, 'missing_positive_market_price'],
  ['negative', { market_close: '-1' }, 'missing_positive_market_price'],
  ['NaN', { market_close: 'NaN' }, 'missing_positive_market_price'],
  ['hexadecimal coercion', { market_close: '0x10' }, 'missing_positive_market_price'],
  ['wrong currency', { currency: 'EUR' }, 'currency_unavailable_or_mismatch'],
  ['stale source', { observed_at: '2026-10-12T11:59:59.999Z' }, 'source_price_stale'],
  ['future source', { observed_at: '2026-10-13T12:00:00.001Z' }, 'observed_at_invalid_or_future'],
  ['future publication', { published_at: '2026-10-13T12:00:00.001Z' }, 'published_at_invalid_or_future'],
  ['unfresh flag', { freshness: 'delayed' }, 'read_model_not_fresh'],
  ['missing provenance', { provenance_id: null }, 'missing_exact_provenance'],
  ['wrong source', { source_name: 'ebay' }, 'unsupported_price_source'],
  ['invalid exact count', { eligible_printing_count: 2 }, 'exact_eligible_count_mismatch'],
]) test(`${label} cannot close a Master price gap`, () => {
  const input = fixture(); Object.assign(input.prices[0], changes);
  const result = buildPricingCompletionMasterGapExportV1(input);
  assert.equal(result.summary.freshPriced, 0); assert.ok(result.observations[0].evidence.failures.includes(reason));
});
test('explicit stricter freshness is honored and the exact boundary is inclusive', () => {
  const input = fixture(); input.scope.maxPriceAgeMs = 23 * 3600000;
  assert.equal(buildPricingCompletionMasterGapExportV1(input).summary.freshPriced, 1);
  input.scope.maxPriceAgeMs -= 1;
  assert.equal(buildPricingCompletionMasterGapExportV1(input).summary.freshPriced, 0);
});
for (const [label, mutate] of [
  ['parent From summary', x => { x.prices[0].pricing_scope = 'parent'; }],
  ['From flag', x => { x.prices[0].is_from_price = true; }],
  ['missing From flag', x => { delete x.prices[0].is_from_price; }],
  ['parent mismatch', x => { x.prices[0].card_print_id = uuid(999); }],
  ['finish mismatch', x => { x.prices[0].finish_key = 'normal'; }],
  ['GV-ID mismatch', x => { x.prices[0].printing_gv_id = 'different'; }],
  ['missing readback', x => { x.prices = []; }],
  ['duplicate readback', x => { x.prices.push({ ...x.prices[0] }); }],
  ['extra readback', x => { x.prices.push({ ...x.prices[0], card_printing_id: uuid(999) }); }],
  ['orphan printing', x => { x.printings[0].card_print_id = uuid(999); }],
  ['wrong game', x => { x.parents[0].game = 'onepiece'; }],
  ['missing canonical set', x => { x.parents[0].set_id = null; }],
  ['mismatched set game', x => { x.parents[0].set_game = 'onepiece'; }],
  ['missing set game', x => { x.parents[0].set_game = null; }],
  ['missing full inventory flag', x => { delete x.inventoryComplete; }],
  ['missing full readback flag', x => { delete x.readbackComplete; }],
]) test(`fails closed on ${label}`, () => {
  const input = fixture(); mutate(input); assert.throws(() => buildPricingCompletionMasterGapExportV1(input));
});
test('different exact finish children under one parent are independently enumerated', () => {
  const input = fixture(); input.printings.push({ ...input.printings[0], id: uuid(5), finish_key: 'reverse', printing_gv_id: 'GV-PK-BASE-001-REVERSE' });
  input.prices.push({ ...input.prices[0], card_printing_id: uuid(5), finish_key: 'reverse', printing_gv_id: 'GV-PK-BASE-001-REVERSE', market_close: null });
  const result = buildPricingCompletionMasterGapExportV1(input);
  assert.equal(result.summary.freshPriced, 1); assert.equal(result.summary.masterPriceGaps, 1);
  assert.equal(result.observations[0].identity.printingId, uuid(5));
});
function clientFixture(overrides = {}) {
  const input = fixture(); const calls = [];
  return { input, calls, client: { async query(sql, args) {
    calls.push({ sql, args }); assert.match(sql.trim(), /^select\b/i); assert.doesNotMatch(sql, /\b(?:insert|update|delete|commit|rollback|begin)\b/i);
    if (sql.includes('current_setting')) return { rows: [{ read_only: 'on', isolation: 'repeatable read', ...overrides.guard }] };
    if (sql.includes('from public.card_prints cp')) return { rows: input.parents };
    if (sql.includes('from public.card_printings p')) return { rows: input.printings };
    if (sql.includes('get_market_pricing_read_model_v1')) return { rows: overrides.prices ?? input.prices };
    throw new Error('unexpected SQL');
  } } };
}
test('reader uses caller stable read-only transaction and exact RPC with no parent requests', async () => {
  const f = clientFixture(); const result = await readPricingCompletionMasterSnapshotV1(f.client, scope());
  assert.equal(result.printings.length, 1); assert.equal(f.calls.length, 4);
  assert.deepEqual(f.calls[3].args, [[], [uuid(2)]]);
  assert.equal(buildPricingCompletionMasterGapExportV1(result).summary.freshPriced, 1);
});
test('reader refuses writable or unstable transaction before canonical reads', async () => {
  for (const guard of [{ read_only: 'off' }, { isolation: 'read committed' }]) {
    const f = clientFixture({ guard }); await assert.rejects(readPricingCompletionMasterSnapshotV1(f.client, scope())); assert.equal(f.calls.length, 1);
  }
});
test('reader rejects missing or substituted RPC rows rather than silently losing coverage', async () => {
  for (const prices of [[], [{ ...fixture().prices[0], card_printing_id: uuid(999) }]]) {
    const f = clientFixture({ prices }); await assert.rejects(readPricingCompletionMasterSnapshotV1(f.client, scope()));
  }
});
test('reader normalizes PostgreSQL timestamptz Date values without changing evidence time', async () => {
  const f = clientFixture(); f.input.prices[0].observed_at = new Date(f.input.prices[0].observed_at);
  const result = await readPricingCompletionMasterSnapshotV1(f.client, scope());
  assert.equal(result.prices[0].observed_at, '2026-10-12T13:00:00.000Z');
});
test('SQL denominator uses parent game with left joined set, never silently excluding malformed routing', async () => {
  const f = clientFixture(); await readPricingCompletionMasterSnapshotV1(f.client, scope());
  const parentSql = f.calls[1].sql; const childSql = f.calls[2].sql;
  assert.match(parentSql, /join public\.games g on g\.id = cp\.game_id/i);
  assert.match(parentSql, /left join public\.sets s/i);
  assert.match(parentSql, /g\.code as game/i);
  assert.match(parentSql, /where g\.code = any\(\$1::text\[\]\)/i);
  assert.match(parentSql, /s\.game as set_game/i);
  assert.match(childSql, /join public\.games g on g\.id = cp\.game_id/i);
  assert.match(childSql, /where g\.code = any\(\$1::text\[\]\)/i);
  assert.doesNotMatch(parentSql + childSql, /cp\.game\b/i);
  assert.doesNotMatch(childSql, /join public\.sets|where s\.game/i);
});
test('malformed set routing retained by SQL makes reader fail closed instead of claiming full inventory', async () => {
  for (const changes of [
    { set_id: null, set_code: null, set_game: null },
    { set_game: 'onepiece' },
    { set_code: null, set_game: null },
  ]) {
    const f = clientFixture(); Object.assign(f.input.parents[0], changes);
    await assert.rejects(readPricingCompletionMasterSnapshotV1(f.client, scope()));
  }
});
