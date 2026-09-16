import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPokemonSealedWorldPlanV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { assertPokemonSealedAdditiveScopeV1 as scope, assertPokemonSealedProjectionV1 as projection } from '../../backend/pricing/pokemon_sealed_additive_catalog_v1.mjs';
const fixture = () => {
  const plan = buildPokemonSealedWorldPlanV1({ sourceRows: [{ product_id: 123, category_id: 3, group_id: 7,
    name: 'Booster Pack', group_name: 'Example', category_display_name: 'Pokemon', source_active: true,
    catalog_metadata_status: 'current', payload_hash: 'a'.repeat(64), extended_data: [] }],
  latestPriceRows: [{ product_id: 123, subtype_name_normalized: 'normal', currency: 'USD', market_price: 20,
    low_price: 10, observed_on: '2026-09-16', source_price_row_identity: '123:normal', payload_hash: 'b'.repeat(64) }],
  latestSync: { id: 'sync', status: 'completed', observed_on: '2026-09-16' }, producerCommit: 'c'.repeat(40) });
  return { plan, authority: { fingerprint: plan.plan_fingerprint_sha256, producerCommit: plan.producer_commit, productIds: [123] } };
};
test('additive scope requires exact producer, fingerprint and selected IDs', () => {
  const {plan, authority} = fixture(); scope(plan, authority);
  for (const patch of [{ fingerprint: 'wrong' }, {producerCommit:'d'.repeat(40)},
    {productIds:[124]}, {productIds:[123,123]}, {productIds:[]}]) assert.throws(() => scope(plan, {...authority,...patch}));
  plan.payload.variants[0].canonical_name = 'Changed'; assert.throws(() => scope(plan, authority));
});
test('family reuse checks all expected fields, not only UUID or name', () => {
  const row = fixture().plan.payload.families[0]; projection(row, {...row, created_at:'date'});
  for (const patch of [{game_key:'mtg'}, {canonical_name:'Wrong'}, {identity_fingerprint:'bad'}, {manufacturer_name:'invented'}])
    assert.throws(() => projection(row, {...row,...patch}));
  assert.throws(() => projection(row, null));
});
test('readback permits only deliberate draft-to-frozen transition', () => {
  const row = fixture().plan.payload.releases[0];
  projection(row, {...row,release_state:'frozen'}, true);
  assert.throws(() => projection(row, row, true));
  assert.throws(() => projection(row, {...row,release_state:'frozen',expected_member_count:2}, true));
});
