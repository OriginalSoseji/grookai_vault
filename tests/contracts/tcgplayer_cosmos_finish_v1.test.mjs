import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateTcgplayerMarketQualificationV1 as evaluate } from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';
import { classifyTcgplayerMarketCoverageRowV1 as coverage } from '../../backend/pricing/tcgplayer_market_coverage_policy_v1.mjs';

const now = new Date('2026-09-30T23:00:00Z');
const valid = {
  source_product_id: 609698, category_id: 3, group_id: 1861,
  source_group_name: 'SM Promos', source_product_name: 'Eevee - SM184 (Cosmos Holo)',
  source_subtype_name: 'Holofoil', normalized_finish_key: 'cosmos', finish_key: 'cosmos',
  cosmos_finish_authority: true, source_mapping_meta: { required_finish_key: 'cosmos' },
  source_product_active: true, source_product_catalog_status: 'current',
  has_printed_number_evidence: true, currency: 'USD', market_price: 14.47,
  source_row_hash: 'row', source_observation_id: 'observation', source_sync_run_id: 'run',
  source_artifact_id: 'artifact', source_artifact_hash: 'hash', source_artifact_byte_size: 2048,
  source_price_row_identity: 'tcgplayer:609698:holofoil', source_sync_mode: 'current_full_sync',
  source_sync_status: 'completed', source_sync_failed_count: 0,
  source_sync_finished_at: '2026-09-30T07:40:19Z', source_mapping_count: 1,
  source_mapping_id: '348872', mapping_method: 'exact_existing_set_number_name_image_audit_v1',
  card_print_mapping_count: 1, card_printing_mapping_count: 1, identity_domain_count: 1,
  identity_domain: 'pokemon_eng_standard', card_print_id: 'parent', gv_id: 'GV-PK-SM-SM184',
  card_printing_id: 'cosmos-child', printing_gv_id: 'GV-PK-SM-SM184-COSMOS',
  variant_assignment_status: 'exact_child_finish', duplicate_product_row_count: 1,
  variant_assignment_id: 'cosmos-assignment',
  variant_assignment_version: 'MEE_MARKET_CLOSE_COSMOS_ASSIGNMENT_V1',
};
const check = (patch = {}) => evaluate({ ...valid, ...patch }, { now });

test('an explicit Cosmos product with exact reviewed child authority can publish', () => {
  assert.equal(check().decision, 'publish');
  assert.equal(check().policy_version, 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3');
  assert.equal(check().evidence.finish_policy_version, 'TCGPLAYER_COSMOS_FINISH_V1');
});
test('generic holo cannot receive a Cosmos price even with a truthy authority marker', () => {
  const result = check({ finish_key: 'holo', normalized_finish_key: 'holo' });
  assert.equal(result.eligible, false);
  assert.ok(result.reason_codes.includes('cosmos_exact_finish_required'));
});
for (const authority of [false, undefined, null, 'true', 1]) {
  test(`missing or nonboolean authority stays excluded (${String(authority)})`, () => {
    assert.equal(check({ cosmos_finish_authority: authority }).eligible, false);
  });
}
for (const subtype of ['Normal', 'Reverse Holofoil', 'Foil', 'Cosmos Holofoil', '']) {
  test(`a conflicting provider subtype is rejected (${subtype})`, () => {
    assert.equal(check({ source_subtype_name: subtype }).eligible, false);
  });
}
test('renamed source cannot evade treatment checks using old mapping metadata', () => {
  assert.ok(check({ source_product_name: 'Eevee - SM184' }).reason_codes.includes('cosmos_source_treatment_conflict'));
});
test('old generic or missing assignments cannot provide Cosmos provenance', () => {
  assert.equal(check({ variant_assignment_id: null }).eligible, false);
  assert.ok(check({ variant_assignment_version: 'MEE_MARKET_CLOSE_VARIANT_ASSIGNMENT_V1' })
    .reason_codes.includes('cosmos_assignment_required'));
});
test('other excluded product families do not inherit the Cosmos exception', () => {
  for (const patch of [
    { source_group_name: 'Prize Pack Series Cards' },
    { source_group_name: 'World Championship Decks' },
    { source_product_name: 'Eevee (Staff) (Cosmos Holo)' },
    { source_product_name: 'Eevee (Pokemon Center) (Cosmos Holo)' },
    { source_product_name: 'Eevee (Cracked Ice Holo)' },
    { category_id: 1, identity_domain: 'mtg_eng_paper_print' },
  ]) assert.equal(check(patch).eligible, false, JSON.stringify(patch));
});
test('Cosmos does not bypass freshness, price, language, mapping, or finish gates', () => {
  for (const patch of [
    { source_sync_finished_at: '2026-09-25T07:00:00Z' }, { market_price: 0 },
    { identity_domain: 'pokemon_jpn' }, { card_print_mapping_count: 2 },
    { source_product_active: false }, { source_sync_failed_count: 1 },
    { card_printing_id: null }, { variant_assignment_status: 'no_matching_child_finish' },
  ]) assert.equal(check(patch).eligible, false, JSON.stringify(patch));
});
test('coverage agrees with publication for reviewed Cosmos and excludes generic holo', () => {
  const decision = check();
  const result = coverage({ ...valid, ...decision, candidate_payload: valid });
  assert.equal(result.product_scope.in_scope, true);
  const bad = { ...valid, normalized_finish_key: 'holo', finish_key: 'holo' };
  assert.equal(coverage({ ...bad, candidate_payload: bad }).product_scope.in_scope, false);
});
