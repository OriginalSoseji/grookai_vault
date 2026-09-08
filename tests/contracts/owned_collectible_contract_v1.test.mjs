import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  resolveOwnedCollectibleTargetV1 as resolve,
  planSealedVaultAdditionV1 as add,
  summarizeOwnedCollectibleMarketV1 as summarize,
  planSealedCopyDispositionV1 as dispose,
} from '../../backend/vault/owned_collectible_contract_v1.mjs';

const id = n => `abcdefab-0000-0000-0000-${String(n).padStart(12, '0')}`;
const owner = id(1);
const request = id(2);
const variant = id(3);
const release = id(4);
const card = id(5);
const printing = id(6);
const product = { variant_id: variant, game_key: 'pokemon', identity_status: 'released', game_visible: true };
for (const [file,table,privileges] of [
  ['20260907180000_sealed_owned_instances_v1.sql','sealed_ownership_controls_v1','select,update'],
  ['20260907180000_sealed_owned_instances_v1.sql','vault_sealed_requests_v1','select,insert'],
  ['20260907183000_sealed_owned_read_models_v1.sql','vault_sealed_current_evidence_v1','select'],
]) test(`${table} explicitly clears default service grants before bounded grants`,()=>{
  const source=readFileSync(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8');
  const revoke=`revoke all on public.${table} from public,anon,authenticated,service_role;`;
  const grant=`grant ${privileges} on public.${table} to service_role;`;
  assert.ok(source.includes(revoke));
  assert.ok(source.indexOf(grant)>source.indexOf(revoke));
});
const addition = changes => add({ ownerId: owner, requestId: request, product, ...changes });
const copy = (changes = {}) => ({
  id: id(10), user_id: owner, gv_vi_id: 'GVVI-ABCDEFAB-000001',
  sealed_product_variant_id: variant, seal_state: 'factory_sealed',
  package_condition: 'undamaged', archived_at: null, ...changes,
});
const quote = (changes = {}) => ({
  object_kind: 'sealed', target_id: variant, condition_basis: 'factory_sealed_undamaged',
  source_provider: 'tcgplayer', status: 'qualified_exact', release_id: release,
  qualification_id: id(7), observed_on: '2026-09-07', currency: 'USD',
  market_price_minor: 12345, ...changes,
});
const summary = (instances, quotes = [], overrides = {}) => summarize({
  ownerId: owner, instances, quotesByInstanceId: new Map(quotes),
  activeReleaseIds: [release], asOf: '2026-09-07', ...overrides,
});
const disposition = changes => dispose({ ownerId: owner, requestId: request, instance: copy(), type: 'remove', ...changes });

test('card, slab and sealed keep distinct real identity anchors', () => {
  assert.equal(resolve({ card_print_id: card, card_printing_id: printing }).kind, 'card');
  assert.equal(resolve({ slab_cert_id: id(8) }).kind, 'slab');
  assert.deepEqual(resolve(copy()), { kind: 'sealed', id: variant, key: `sealed:${variant}`, card_printing_id: null });
  assert.equal(resolve(copy({ sealed_product_variant_id: variant.toUpperCase() })).id, variant);
});

for (const [name, row, error] of [
  ['missing anchor', {}, 'exactly_one_identity_anchor_required'],
  ['dual anchor', copy({ card_print_id: card }), 'exactly_one_identity_anchor_required'],
  ['family masquerading as anchor', { sealed_product_family_id: variant }, 'exactly_one_identity_anchor_required'],
  ['invalid UUID', copy({ sealed_product_variant_id: 'box' }), 'invalid_sealed_product_variant_id'],
  ['conflicting kind', copy({ object_kind: 'card' }), 'object_kind_anchor_conflict'],
  ['card child on sealed', copy({ card_printing_id: printing }), 'printing_requires_card'],
  ['legacy card bucket', copy({ legacy_vault_item_id: id(9) }), 'sealed_cannot_use_card_bucket'],
  ['slab grade on sealed', copy({ grade_company: 'PSA' }), 'sealed_cannot_use_slab_grade'],
  ['graded sealed', copy({ is_graded: true }), 'sealed_cannot_use_slab_grade'],
]) test(`identity rejects ${name}`, () => assert.throws(() => resolve(row), new RegExp(error)));

test('released unpriced product without image can be owned; quantity means packages', () => {
  const plan = addition({ quantity: 3 });
  assert.equal(plan.copy_count, 3);
  assert.equal(plan.intent, 'hold');
  assert.equal(plan.seal_state, 'unknown');
  assert.equal(plan.package_condition, 'unknown');
  assert.equal(plan.creates_card_prints, false);
  assert.equal(plan.creates_contents_inventory, false);
  assert.equal(plan.requires_transaction, true);
  assert.equal('card_print_id' in plan, false);
  assert.ok(Object.isFrozen(plan));
});

for (const game of ['pokemon', 'mtg', 'one_piece']) {
  test(`addition contract is not restricted to Pokemon: ${game}`, () => {
    assert.equal(addition({ product: { ...product, game_key: game } }).game_key, game);
  });
}

for (const quantity of [0, -1, 1.5, 101, '2', null, NaN]) {
  test(`invalid quantity ${quantity} is rejected`, () => assert.throws(() => addition({ quantity }), /invalid_quantity/));
}

test('hidden and unreleased identities cannot be published through ownership', () => {
  assert.throws(() => addition({ product: { ...product, game_visible: false } }), /sealed_identity_not_available/);
  assert.throws(() => addition({ product: { ...product, identity_status: 'candidate' } }), /sealed_identity_not_available/);
});

test('addition binding preserves retries and changes with owner, product, quantity or condition', () => {
  const base = addition();
  assert.deepEqual(base, addition());
  assert.deepEqual(base, addition({ ownerId: owner.toUpperCase(), requestId: request.toUpperCase() }));
  assert.match(base.payload_fingerprint, /^[0-9a-f]{64}$/);
  for (const change of [
    { ownerId: id(20) }, { requestId: id(21) }, { quantity: 2 },
    { product: { ...product, variant_id: id(22) } },
    { sealState: 'factory_sealed' }, { packageCondition: 'damaged' },
    { acquisitionCostMinor: 0, acquisitionCurrency: 'USD' },
  ]) assert.notEqual(base.payload_fingerprint, addition(change).payload_fingerprint);
  assert.equal(base.idempotency_scope, `${owner}:${request}`);
});

test('condition and acquisition inputs do not silently coerce into facts', () => {
  assert.throws(() => addition({ sealState: 'mint' }), /invalid_seal_state/);
  assert.throws(() => addition({ packageCondition: 'NM' }), /invalid_package_condition/);
  assert.throws(() => addition({ acquisitionCostMinor: 100 }), /acquisition_money_pair_required/);
  assert.throws(() => addition({ acquisitionCostMinor: 1.5, acquisitionCurrency: 'USD' }), /invalid_acquisition_cost_minor/);
  assert.throws(() => addition({ acquisitionCostMinor: 100, acquisitionCurrency: 'usd' }), /invalid_currency/);
});

test('mixed card and sealed market total counts each physical copy exactly once', () => {
  const second = copy({ id: id(11) });
  const ownedCard = { id: id(12), user_id: owner, card_print_id: card, card_printing_id: printing };
  const result = summary([copy(), second, ownedCard], [
    [id(10), quote()], [id(11), quote()],
    [id(12), quote({ object_kind: 'card', target_id: card, card_printing_id: printing, market_price_minor: 500 })],
  ]);
  assert.equal(result.active_copy_count, 3);
  assert.equal(result.priced_copy_count, 3);
  assert.equal(result.unpriced_copy_count, 0);
  assert.deepEqual(result.market_totals_minor, { USD: 25190 });
  assert.deepEqual(result.market_subtotals_minor_by_kind, { card: { USD: 500 }, slab: {}, sealed: { USD: 24690 } });
});

test('asking prices, acquisition costs and old cached values never substitute for market evidence', () => {
  const result = summary([copy({ market_price: 9999, asking_price_amount: 500, acquisition_cost: 100 })]);
  assert.equal(result.active_copy_count, 1);
  assert.equal(result.unpriced_copy_count, 1);
  assert.deepEqual(result.market_totals_minor, {});
  assert.equal(result.rows[0].reason, 'missing_price');
});

for (const [name, change, reason] of [
  ['wrong variant', { target_id: id(99) }, 'price_identity_mismatch'],
  ['wrong kind', { object_kind: 'card' }, 'price_identity_mismatch'],
  ['wrong condition basis', { condition_basis: 'opened' }, 'price_condition_mismatch'],
  ['unqualified', { status: 'candidate' }, 'price_not_qualified'],
  ['wrong source', { source_provider: 'estimate' }, 'price_not_qualified'],
  ['inactive release', { release_id: id(99) }, 'price_release_not_active'],
  ['missing evidence', { qualification_id: null }, 'price_evidence_missing'],
  ['stale', { observed_on: '2026-08-30' }, 'price_not_fresh'],
  ['future', { observed_on: '2026-09-08' }, 'price_not_fresh'],
  ['invalid calendar date', { observed_on: '2026-02-30' }, 'price_not_fresh'],
  ['missing date', { observed_on: null }, 'price_not_fresh'],
  ['zero price', { market_price_minor: 0 }, 'price_amount_invalid'],
  ['negative price', { market_price_minor: -1 }, 'price_amount_invalid'],
  ['fractional minor unit', { market_price_minor: 1.01 }, 'price_amount_invalid'],
  ['numeric string', { market_price_minor: '1200' }, 'price_amount_invalid'],
  ['bad currency', { currency: 'usd' }, 'price_amount_invalid'],
]) test(`withholds ${name} without removing ownership`, () => {
  const result = summary([copy()], [[id(10), quote(change)]]);
  assert.equal(result.active_copy_count, 1);
  assert.equal(result.priced_copy_count, 0);
  assert.equal(result.rows[0].reason, reason);
  assert.deepEqual(result.market_totals_minor, {});
});

test('sealed freshness honors the existing UTC seventh-day boundary', () => {
  assert.equal(summary([copy()], [[id(10), quote({ observed_on: '2026-08-31' })]]).priced_copy_count, 1);
  assert.equal(summary([copy()], [[id(10), quote({ observed_on: '2026-08-31' })]], { asOf: '2026-09-08' }).priced_copy_count, 0);
});

for (const change of [{ seal_state: 'unknown' }, { seal_state: 'opened' }, { package_condition: 'unknown' }, { package_condition: 'damaged' }]) {
  test(`does not value unsupported package condition ${JSON.stringify(change)}`, () => {
    const result = summary([copy(change)], [[id(10), quote()]]);
    assert.equal(result.unpriced_copy_count, 1);
    assert.equal(result.rows[0].reason, 'sealed_condition_not_qualified');
  });
}

test('different currencies remain separate, never added together', () => {
  const result = summary([copy(), copy({ id: id(11) })], [
    [id(10), quote()], [id(11), quote({ currency: 'EUR', market_price_minor: 2000 })],
  ]);
  assert.deepEqual(result.market_totals_minor, { EUR: 2000, USD: 12345 });
});

test('archived/sold/traded copies leave active market totals even with a valid quote', () => {
  const result = summary([copy({ archived_at: '2026-09-07T12:00:00Z' })], [[id(10), quote()]]);
  assert.equal(result.archived_copy_count, 1);
  assert.equal(result.active_copy_count, 0);
  assert.deepEqual(result.market_totals_minor, {});
});

test('duplicate instances, other owners and unsafe sums fail closed', () => {
  assert.throws(() => summary([copy(), copy()]), /duplicate_owned_instance/);
  assert.throws(() => summary([copy({ user_id: id(99) })]), /owner_scope_mismatch/);
  assert.throws(() => summary([copy(), copy({ id: id(11) })], [
    [id(10), quote({ market_price_minor: Number.MAX_SAFE_INTEGER })], [id(11), quote()],
  ]), /total_exceeds_safe_integer/);
  assert.throws(() => summary([], [], { asOf: '2026-02-30' }), /invalid_as_of/);
});

test('unassigned cards and slabs do not borrow sealed or raw-card prices', () => {
  const unassigned = { id: id(10), user_id: owner, card_print_id: card };
  const slab = { id: id(11), user_id: owner, slab_cert_id: id(8) };
  const result = summary([unassigned, slab], [[id(10), quote()], [id(11), quote()]]);
  assert.deepEqual(result.rows.map(row => row.reason), ['printing_unassigned', 'slab_pricing_not_supported']);
});

test('wrong or malformed exact child printing is withheld rather than crashing', () => {
  const ownedCard = { id: id(10), user_id: owner, card_print_id: card, card_printing_id: printing };
  for (const child of [null, 123, id(99)]) {
    assert.equal(summary([ownedCard], [[id(10), quote({ object_kind: 'card', target_id: card, card_printing_id: child })]]).rows[0].reason, 'price_printing_mismatch');
  }
});

test('sale plan captures proceeds and counterparty and atomically withdraws the copy', () => {
  const plan = disposition({ type: 'sale', salePriceMinor: 15000, saleCurrency: 'USD', counterparty: ' Collector ' });
  assert.equal(plan.counterparty_label, 'Collector');
  assert.equal(plan.sale_price_minor, 15000);
  assert.equal(plan.sealed_product_variant_id, variant);
  assert.equal(plan.archive_instance, true);
  assert.equal(plan.withdraw_wall_listing, true);
  assert.equal(plan.preserve_history, true);
  assert.equal(plan.transfer_counterparty_ownership, false);
  assert.equal(plan.requires_transaction, true);
});

test('trade accepts descriptive consideration and optional cash paid or received', () => {
  for (const cashDirection of ['paid', 'received']) {
    const plan = disposition({ type: 'trade', tradeReceived: 'Two booster boxes', cashDirection, cashAmountMinor: 2500, cashCurrency: 'USD' });
    assert.equal(plan.trade_cash_direction, cashDirection);
    assert.equal(plan.create_received_inventory, false);
  }
  assert.equal(disposition({ type: 'trade', tradeReceived: 'Another collection' }).trade_cash_minor, null);
});

test('remove archives without fabricating a sale or destroying history', () => {
  const plan = disposition();
  assert.equal(plan.type, 'remove');
  assert.equal(plan.sale_price_minor, null);
  assert.equal(plan.preserve_history, true);
  assert.equal(plan.archive_instance, true);
});

test('disposition bindings identify payload changes without claiming persistence', () => {
  assert.deepEqual(disposition(), disposition());
  const sale = disposition({ type: 'sale', salePriceMinor: 1, saleCurrency: 'USD' });
  assert.notEqual(sale.payload_fingerprint, disposition().payload_fingerprint);
  assert.notEqual(sale.payload_fingerprint, disposition({ type: 'sale', salePriceMinor: 2, saleCurrency: 'USD' }).payload_fingerprint);
  assert.equal(sale.idempotency_scope, `${owner}:${request}`);
  assert.equal('persisted' in sale, false);
});

for (const [name, change, error] of [
  ['other owner', { ownerId: id(99) }, 'instance_not_owned'],
  ['archived copy', { instance: copy({ archived_at: '2026-09-07T12:00:00Z' }) }, 'instance_already_archived'],
  ['missing GVVI', { instance: copy({ gv_vi_id: null }) }, 'instance_missing_gvvi'],
  ['unsupported action', { type: 'delete' }, 'invalid_disposition_type'],
  ['sale missing amount', { type: 'sale', saleCurrency: 'USD' }, 'invalid_sale_price_minor'],
  ['sale zero amount', { type: 'sale', salePriceMinor: 0, saleCurrency: 'USD' }, 'invalid_sale_price_minor'],
  ['sale trade fields', { type: 'sale', salePriceMinor: 1, saleCurrency: 'USD', tradeReceived: 'box' }, 'sale_trade_fields_not_allowed'],
  ['trade missing consideration', { type: 'trade' }, 'trade_received_required'],
  ['trade sale fields', { type: 'trade', tradeReceived: 'box', salePriceMinor: 1 }, 'trade_sale_fields_not_allowed'],
  ['cash without direction', { type: 'trade', tradeReceived: 'box', cashAmountMinor: 1 }, 'trade_cash_pair_required'],
  ['cash without amount', { type: 'trade', tradeReceived: 'box', cashDirection: 'paid', cashCurrency: 'USD' }, 'invalid_cash_amount_minor'],
  ['invalid direction', { type: 'trade', tradeReceived: 'box', cashDirection: 'both' }, 'invalid_cash_direction'],
  ['remove with proceeds', { salePriceMinor: 100 }, 'remove_transaction_fields_not_allowed'],
  ['overlong counterparty', { counterparty: 'x'.repeat(121) }, 'invalid_counterparty'],
]) test(`disposition rejects ${name}`, () => assert.throws(() => disposition(change), new RegExp(error)));
