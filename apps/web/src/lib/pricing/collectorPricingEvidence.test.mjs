import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Synthetic evidence exercises the real pure readers. It is never published or
// passed to the app as market data; any attempted backend access fails the test.
function load(relative, expose = '') {
  const source = readFileSync(new URL(relative, import.meta.url), 'utf8') + expose;
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, console: { error() {} },
    require: () => new Proxy({}, { get() { throw new Error('Unexpected dependency access'); } }),
  });
  return exports;
}

const pricing = load('./marketPricingReadModelV1.ts');
const vault = load('../vault/getCanonicalVaultCollectorRows.ts', '\nexport { buildVaultExactPricingSummary };');
const owner = load('../vault/getOwnerVaultItems.ts');
const parent = '98d26f6e-83e8-4990-8e42-ea2e3aadb111';
const printing = '92f0c41e-1f2a-41ed-957d-ea973012bb5c';
const other = 'f164877b-cbc1-4903-8e64-761a13148067';
const row = (patch = {}) => ({
  pricing_scope: 'card_printing', card_print_id: parent, card_printing_id: printing,
  status: 'available', currency: 'USD', market_close: 12.34,
  source_name: 'tcgplayer', source_label: 'TCGPlayer Market', freshness: 'fresh',
  observed_at: '2026-09-11T12:00:00Z', published_at: '2026-09-11T12:01:00Z',
  provenance_id: 'synthetic-test-evidence-not-market-data', is_from_price: false,
  eligible_printing_count: 1, ...patch,
});
const fetch = (data, targets = { cardPrintingIds: [printing] }) =>
  pricing.getMarketPricingReadModelV1({ rpc: async () => ({ data, error: null }) }, targets);
const json = (value) => JSON.parse(JSON.stringify(value));

test('valid exact and parent From evidence retain their distinct scopes', async () => {
  const records = await fetch([row(), row({ pricing_scope: 'parent', card_printing_id: null,
    is_from_price: true, source_label: 'From TCGPlayer Market' })],
  { cardPrintIds: [parent], cardPrintingIds: [printing] });
  assert.equal(records.length, 2);
  assert.equal(pricing.indexExactMarketPricingByCardPrintingId(records).size, 1);
});

for (const [name, patch] of Object.entries({
  unavailable: { status: 'unavailable' }, stale: { freshness: 'stale' },
  missingProvenance: { provenance_id: '' }, missingDate: { observed_at: null },
  invalidDate: { published_at: 'invalid' }, wrongSource: { source_name: 'other' },
  wrongLabel: { source_label: 'Live market' }, currency: { currency: 'EUR' },
  zero: { market_close: 0 }, negative: { market_close: -1 },
  infinite: { market_close: Infinity }, stringPrice: { market_close: '12.34' },
  missingPrinting: { card_printing_id: null }, parentMasqueradingAsExact: { is_from_price: true },
  wrongScope: { pricing_scope: 'unknown' }, unrequestedPrinting: { card_printing_id: other },
  unrequestedParent: { pricing_scope: 'parent', card_printing_id: null, card_print_id: other },
})) {
  test(`rejects ${name} pricing evidence`, async () => assert.equal((await fetch([row(patch)])).length, 0));
}

test('does not accept parent evidence for a printing-only request', async () => {
  assert.equal((await fetch([row({ pricing_scope: 'parent', card_printing_id: null })])).length, 0);
});

test('duplicate evidence is rejected independently of response ordering', async () => {
  const rows = [row(), row({ market_close: 25 })];
  assert.equal((await fetch(rows)).length, 0);
  assert.equal((await fetch(rows.reverse())).length, 0);
});

test('malformed payloads fail closed', async () => {
  for (const payload of [null, {}, [null], ['bad']]) assert.equal((await fetch(payload)).length, 0);
});

test('empty requests make zero RPC calls; requested IDs are deduplicated', async () => {
  let calls = 0;
  const client = { rpc: async (name, args) => {
    calls++;
    assert.equal(name, 'get_market_pricing_read_model_v1');
    assert.deepEqual(json(args), { p_card_print_ids: null, p_card_printing_ids: [printing] });
    return { data: [row()], error: null };
  } };
  assert.equal((await pricing.getMarketPricingReadModelV1(client, {})).length, 0);
  assert.equal(calls, 0);
  await pricing.getMarketPricingReadModelV1(client, { cardPrintingIds: [printing, ` ${printing} `, ''] });
  assert.equal(calls, 1);
});

test('RPC errors are unavailable by default and propagate when explicitly requested', async () => {
  const error = new Error('fixture backend unavailable');
  const client = { rpc: async () => ({ data: null, error }) };
  assert.equal((await pricing.getMarketPricingReadModelV1(client, { cardPrintingIds: [printing] })).length, 0);
  await assert.rejects(pricing.getMarketPricingReadModelV1(client,
    { cardPrintingIds: [printing], throwOnError: true }), /fixture backend unavailable/);
});

const copy = (patch = {}) => ({ card_printing_id: printing, is_graded: false, market_price: null, ...patch });
function summarize(copies, evidence = row()) {
  return vault.buildVaultExactPricingSummary({
    aggregate: { cardPrintId: parent, rawCount: copies.filter(c => !c.is_graded).length, copyItems: copies },
    marketPriceByPrintingId: new Map([[printing, evidence]]),
  });
}

test('two exact raw copies total 24.68; unpriced and graded copies do not inflate totals', () => {
  const result = summarize([copy(), copy(), copy({ card_printing_id: null }), copy({ is_graded: true })]);
  assert.equal(result.effectivePrice, 24.68);
  assert.equal(result.pricedRawCopyCount, 2);
  assert.equal(result.unpricedRawCopyCount, 1);
  assert.deepEqual(json(result.copyItems.map(c => c.market_price)), [12.34, 12.34, null, null]);
});

for (const [name, patch] of Object.entries({
  differentParent: { card_print_id: other }, differentPrinting: { card_printing_id: other },
  parentScope: { pricing_scope: 'parent' }, nonfinite: { market_close: Infinity },
  negative: { market_close: -5 },
})) {
  test(`Vault keeps ${name} evidence unpriced`, () => {
    const result = summarize([copy()], row(patch));
    assert.equal(result.effectivePrice, null);
    assert.equal(result.unpricedRawCopyCount, 1);
  });
}

test('group totals are already copy totals and are not multiplied a second time', () => {
  const result = owner.buildVaultValueSummary([
    { effective_price: 24.68, raw_count: 2, priced_raw_copy_count: 2, unpriced_raw_copy_count: 0 },
    { effective_price: null, raw_count: 1, priced_raw_copy_count: 0, unpriced_raw_copy_count: 1 },
  ]);
  assert.equal(result.totalEstimatedValue, 24.68);
  assert.equal(result.pricedCopyCount, 2);
  assert.equal(result.unpricedCopyCount, 1);
  assert.equal(result.totalRawCopyCount, 3);
});

test('empty and nonfinite Vault prices stay unavailable, never a fabricated zero', () => {
  assert.equal(owner.buildVaultValueSummary([]).totalEstimatedValue, null);
  for (const amount of [Infinity, NaN, -1, null]) {
    assert.equal(owner.buildVaultValueSummary([{ effective_price: amount, raw_count: 1,
      priced_raw_copy_count: 0, unpriced_raw_copy_count: 1 }]).totalEstimatedValue, null);
  }
});
