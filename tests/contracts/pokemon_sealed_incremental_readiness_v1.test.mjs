import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPokemonSealedIncrementalReadinessV1 as build } from '../../backend/pricing/pokemon_sealed_incremental_readiness_v1.mjs';

const input = () => ({ project_ref: 'ycdxbpibncqcchqiihfz', at: '2026-09-16T12:00:00Z', selected_ids: [12],
  source: [{ product_id: 12, category_id: 3, group_id: 2, name: 'Booster Pack', source_active: true, payload_hash: 'source', extended_data: [] }],
  mappings: [], coverage: [], pointers: [{ game_key: 'pokemon', release_id: 'unchanged' }],
  prices: [{ product_id: 12, subtype_name_normalized: 'normal', market_price: 10, currency: 'USD', observed_on: '2026-09-16' }] });
const mapped = () => { const s = input(); s.mappings = [{ source_product_id: 12, source_category_id: 3,
  source_group_id: 2, source_payload_hash: 'source', variant_id: 'v', game_key: 'pokemon', mapping_status: 'exact_reviewed' }];
  s.coverage = [{ source_product_id: 12, variant_id: 'v', price_member_id: 'p', image_member_id: 'i' }]; return s; };

test('new exact sealed evidence creates only a queue, never apply authority', () => {
  const s = input(), copy = structuredClone(s), result = build(s);
  assert.equal(result.new_identities, 1);
  assert.equal(result.apply_authority, false);
  assert.equal(result.database_writes, 0);
  assert.ok(result.rows[0].reasons.includes('new_identity_requires_additive_apply'));
  assert.deepEqual(s, copy);
  assert.deepEqual(result, build(s));
});
test('existing paired membership is distinguished from new or drifted mappings', () => {
  const s = mapped();
  assert.equal(build(s).rows[0].disposition, 'active_verified_mapping');
  s.source[0].payload_hash = 'changed';
  assert.equal(build(s).changed_mappings, 1);
  assert.equal(build(s).rows[0].disposition, 'work_required');
  assert.deepEqual(build(s).protected_pointers, s.pointers);
});
test('missing and duplicate identities, cross-game ownership and projection drift stop', () => {
  for (const mutate of [s => s.selected_ids.push(12), s => s.source.pop(),
    s => s.mappings[0].game_key = 'mtg', s => s.mappings[0].source_group_id = 3,
    s => s.coverage[0].variant_id = 'wrong', s => s.mappings.push(s.mappings[0]),
    s => s.prices.push(s.prices[0])]) {
    const s = mapped(); mutate(s); assert.throws(() => build(s));
  }
});
test('zero, future, stale and absent prices never qualify and source presale survives', () => {
  for (const patch of [{market_price: 0}, {observed_on:'2026-09-17'}, {observed_on:'2026-09-08'}, {currency:'EUR'}]) {
    const s = input(); Object.assign(s.prices[0], patch); assert.equal(build(s).fresh_positive_prices, 0);
  }
  const s = input(); s.prices = []; s.source[0].presale_info = { isPresale: true, releasedOn: '2026-12-04' };
  assert.equal(build(s).fresh_positive_prices, 0);
  assert.deepEqual(build(s).rows[0].source_presale_info, s.source[0].presale_info);
});
test('unpaired live membership is explicit, not described as published', () => {
  const s = mapped(); s.coverage[0].image_member_id = null;
  assert.equal(build(s).active_paired_members, 0);
  assert.ok(build(s).rows[0].reasons.includes('active_price_image_membership_mismatch'));
});
