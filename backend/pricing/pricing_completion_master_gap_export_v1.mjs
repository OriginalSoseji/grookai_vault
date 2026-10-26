import assert from 'node:assert/strict';

export const PRICING_COMPLETION_MASTER_GAP_EXPORT_V1 = 'PRICING_COMPLETION_MASTER_GAP_EXPORT_V1';
const DAY = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const exact = (v, label) => { assert.ok(typeof v === 'string' && v.length && v.trim() === v, label); return v; };
const id = (v, label) => { assert.match(exact(v, label), UUID, label); return v; };
function time(v, label) {
  exact(v, label); assert.match(v, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, label);
  assert.equal(new Date(v).toISOString(), v, label); return Date.parse(v);
}
function options(input) {
  assert.deepEqual(input.games, ['pokemon'], 'V1 requires explicit Pokemon scope');
  assert.equal(input.currency, 'USD', 'current read contract supports USD only');
  assert.equal(input.priceBasis ?? 'TCGPLAYER_MARKET', 'TCGPLAYER_MARKET', 'unsupported price basis');
  assert.equal(input.condition ?? 'NOT_CONDITION_SPECIFIC', 'NOT_CONDITION_SPECIFIC', 'physical-condition pricing is outside this adapter');
  const maxPriceAgeMs = input.maxPriceAgeMs ?? DAY;
  assert.ok(Number.isSafeInteger(maxPriceAgeMs) && maxPriceAgeMs > 0 && maxPriceAgeMs <= 36 * 60 * 60 * 1000, 'invalid price age limit');
  const batchSize = input.batchSize ?? 500;
  assert.ok(Number.isSafeInteger(batchSize) && batchSize > 0 && batchSize <= 1000, 'invalid read batch size');
  time(input.observedAt, 'observedAt');
  exact(input.sourceRunId, 'sourceRunId'); exact(input.evidenceRef, 'evidenceRef');
  return { games: ['pokemon'], currency: 'USD', priceBasis: 'TCGPLAYER_MARKET', condition: 'NOT_CONDITION_SPECIFIC', sourceRunId: input.sourceRunId,
    observedAt: input.observedAt, evidenceRef: input.evidenceRef, maxPriceAgeMs, batchSize };
}
function unique(rows, key, label) {
  assert.ok(Array.isArray(rows), label); const map = new Map();
  for (const row of rows) { id(row[key], label); assert.ok(!map.has(row[key]), `duplicate ${label}`); map.set(row[key], row); }
  return map;
}
function validateInventory(snapshot, scope) {
  assert.equal(snapshot.inventoryComplete, true, 'full canonical inventory required');
  assert.equal(snapshot.readbackComplete, true, 'full exact readback required');
  const parents = unique(snapshot.parents, 'id', 'parent ID');
  const printings = unique(snapshot.printings, 'id', 'printing ID');
  const prices = unique(snapshot.prices, 'card_printing_id', 'price printing ID');
  for (const parent of parents.values()) {
    id(parent.set_id, 'parent set ID'); exact(parent.gv_id, 'parent GV-ID');
    exact(parent.name, 'parent name'); exact(parent.set_code, 'parent set code');
    assert.ok(scope.games.includes(parent.game), 'parent outside declared game scope');
    assert.equal(parent.set_game, parent.game, 'parent set game routing mismatch');
  }
  for (const printing of printings.values()) {
    assert.ok(parents.has(printing.card_print_id), 'printing has no scoped parent');
    exact(printing.printing_gv_id, 'printing GV-ID'); exact(printing.finish_key, 'finish key');
    const row = prices.get(printing.id); assert.ok(row, 'exact readback omitted printing');
    assert.equal(row.pricing_scope, 'card_printing', 'parent summary cannot satisfy exact price');
    assert.equal(row.card_print_id, printing.card_print_id, 'price parent mismatch');
    assert.equal(row.gv_id, parents.get(printing.card_print_id).gv_id, 'price parent GV-ID mismatch');
    assert.equal(row.printing_gv_id, printing.printing_gv_id, 'price printing GV-ID mismatch');
    assert.equal(row.finish_key, printing.finish_key, 'price finish mismatch');
    assert.equal(row.is_from_price, false, 'From price cannot satisfy exact price');
    assert.ok(['available', 'unavailable'].includes(row.status), 'invalid price status');
    exact(row.freshness, 'price freshness');
  }
  assert.equal(prices.size, printings.size, 'readback contains unrequested printing');
  return { parents, printings, prices };
}

/** Caller supplies a full retained canonical snapshot and exact application RPC readback.
 * This export never invents child IDs, conditions, prices or catalog authority.
 */
export function buildPricingCompletionMasterGapExportV1(snapshot, input = snapshot.scope) {
  const scope = options(input); const { parents, printings, prices } = validateInventory(snapshot, scope);
  const evaluatedAt = Date.parse(scope.observedAt); const observations = []; const usablePrices = [];
  const withChildren = new Set();
  for (const printing of [...printings.values()].sort((a, b) => a.id.localeCompare(b.id))) {
    withChildren.add(printing.card_print_id); const parent = parents.get(printing.card_print_id); const price = prices.get(printing.id);
    const failures = [];
    if (price.status !== 'available') failures.push('read_model_unavailable');
    if (price.currency !== scope.currency) failures.push('currency_unavailable_or_mismatch');
    if (!((typeof price.market_close === 'number'
      || (typeof price.market_close === 'string' && /^\d+(?:\.\d+)?$/.test(price.market_close)))
      && Number.isFinite(Number(price.market_close)) && Number(price.market_close) > 0)) failures.push('missing_positive_market_price');
    if (price.freshness !== 'fresh') failures.push('read_model_not_fresh');
    for (const field of ['observed_at', 'published_at']) {
      let value = NaN; try { value = time(price[field], field); } catch { /* Missing timestamps remain explicit gaps. */ }
      if (!Number.isFinite(value) || value > evaluatedAt) failures.push(`${field}_invalid_or_future`);
      else if (field === 'observed_at' && evaluatedAt - value > scope.maxPriceAgeMs) failures.push('source_price_stale');
    }
    if (!UUID.test(price.provenance_id ?? '')) failures.push('missing_exact_provenance');
    if (price.source_name !== 'tcgplayer') failures.push('unsupported_price_source');
    if (price.eligible_printing_count !== 1) failures.push('exact_eligible_count_mismatch');
    if (!failures.length) usablePrices.push({ printingId: printing.id, parentId: parent.id,
      currency: price.currency, marketClose: price.market_close, observedAt: price.observed_at,
      publishedAt: price.published_at, provenanceId: price.provenance_id, priceBasis: 'TCGPLAYER_MARKET', condition: 'NOT_CONDITION_SPECIFIC', physicalConditionVerified: false });
    else observations.push({ identity: { kind: 'master', printingId: printing.id, currency: scope.currency, condition: 'NOT_CONDITION_SPECIFIC' },
      reason: 'missing_published_price', sourceRunId: scope.sourceRunId,
      scope: `pokemon/${parent.set_code}/USD/TCGPLAYER_MARKET`,
      evidence: { parentId: parent.id, parentGvId: parent.gv_id, printingGvId: printing.printing_gv_id,
        finishKey: printing.finish_key, failures, readModel: 'get_market_pricing_read_model_v1', readback: price,
        priceBasis: 'TCGPLAYER_MARKET', physicalConditionVerified: false, evidenceRef: scope.evidenceRef,
        maxPriceAgeMs: scope.maxPriceAgeMs } });
  }
  const parentsWithoutPrintings = [...parents.values()].filter(p => !withChildren.has(p.id)).sort((a, b) => a.id.localeCompare(b.id))
    .map(p => ({ parentId: p.id, gvId: p.gv_id, setCode: p.set_code, name: p.name,
      printingId: null, reason: 'canonical_parent_without_exact_printing', unresolved: true,
      nextAction: 'Obtain exact printing evidence and use governed catalog admission; never synthesize a printing ID.' }));
  return { version: PRICING_COMPLETION_MASTER_GAP_EXPORT_V1, sourceRunId: scope.sourceRunId,
    observedAt: scope.observedAt, scope, databaseWrites: 0, observations, usablePrices, parentsWithoutPrintings,
    coverage: { masterToPrice: { status: parentsWithoutPrintings.length ? 'partial' : 'complete', sourceRunId: scope.sourceRunId,
      observedAt: scope.observedAt, evidenceRef: scope.evidenceRef,
      expectedUnresolved: observations.length + parentsWithoutPrintings.length } },
    summary: { canonicalParents: parents.size, exactPrintings: printings.size, freshPriced: usablePrices.length,
      masterPriceGaps: observations.length, parentsWithoutPrintings: parentsWithoutPrintings.length,
      physicalConditionCoverage: 'not_in_scope', exactMarketBasisEnumeration: 'complete',
      completionAllowed: observations.length === 0 && parentsWithoutPrintings.length === 0,
      completionScope: 'pokemon/USD/TCGPLAYER_MARKET' },
    limitations: ['The current RPC reports aggregate TCGPlayer Market. NOT_CONDITION_SPECIFIC is a reserved market-basis sentinel, never an inferred physical condition or NM quote. Completion applies only to Pokemon/USD/TCGPLAYER_MARKET.',
      'Parents without printings remain coverage gaps outside exact-printing queue identities.'] };
}

/** No connection creation, credentials or transaction mutation. Caller owns the same
 * READ ONLY REPEATABLE READ/SERIALIZABLE transaction as the source-side exporter.
 */
export async function readPricingCompletionMasterSnapshotV1(client, input) {
  const scope = options(input);
  const guard = (await client.query("select current_setting('transaction_read_only') as read_only, current_setting('transaction_isolation') as isolation")).rows;
  assert.equal(guard.length, 1); assert.equal(guard[0].read_only, 'on', 'read-only transaction required');
  assert.ok(['repeatable read', 'serializable'].includes(guard[0].isolation), 'stable snapshot transaction required');
  // The parent's own game defines the inventory denominator. Missing or wrongly
  // routed sets must survive this query and fail validation, never disappear.
  const parents = (await client.query(`select cp.id, cp.gv_id, cp.name, cp.set_id, g.code as game,
    s.code as set_code, s.game as set_game
    from public.card_prints cp join public.games g on g.id = cp.game_id
    left join public.sets s on s.id = cp.set_id
    where g.code = any($1::text[]) order by cp.id`, [scope.games])).rows;
  const printings = (await client.query(`select p.id, p.card_print_id, p.printing_gv_id, p.finish_key
    from public.card_printings p join public.card_prints cp on cp.id = p.card_print_id
    join public.games g on g.id = cp.game_id
    where g.code = any($1::text[]) order by p.id`, [scope.games])).rows;
  const prices = [];
  for (let offset = 0; offset < printings.length; offset += scope.batchSize) {
    const requested = printings.slice(offset, offset + scope.batchSize).map(p => p.id);
    const rows = (await client.query('select * from public.get_market_pricing_read_model_v1($1::uuid[], $2::uuid[])', [[], requested])).rows;
    assert.equal(rows.length, requested.length, 'exact readback batch count mismatch');
    assert.deepEqual(rows.map(r => r.card_printing_id).sort(), [...requested].sort(), 'exact readback batch identity mismatch');
    prices.push(...rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]))));
  }
  const snapshot = { scope, inventoryComplete: true, readbackComplete: true, parents, printings, prices };
  validateInventory(snapshot, scope); return snapshot;
}
