import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTcgplayerEditionSubtypeV1 as parse, previewTcgplayerEditionIdentityV1 as preview,
  tcgplayerEditionQualificationReasonsV1 as reasons, hydrateTcgplayerEditionCandidateV1 as hydrate,
  isTcgplayerJungleEditionAssignmentProjectionV1 as exact } from '../../backend/pricing/tcgplayer_edition_identity_v1.mjs';
import { evaluateTcgplayerMarketQualificationV1 as qualify } from '../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs';

const parent = { id: 'parent', gv_id: 'GV-PK-JU-1-FIRST-EDITION', set_id: 'jungle',
  set_code: 'base2', identity_domain: 'pokemon_eng_standard', set_identity_model: 'standard',
  variant_key: '', printed_identity_modifier: 'edition:first_edition' };
const printing = { id: 'child', card_print_id: 'parent', printing_gv_id: 'child-gvid',
  finish_key: 'holo', is_provisional: false, public_visibility: null };
const source = { category_id: 3, source_product_id: 45120, source_subtype_name: '1st Edition Holofoil' };
const check = (patch = {}) => preview({ parent, printing, source, ...patch });

test('source edition and finish remain distinct and preserve original subtype', () => {
  for (const [subtype, edition, finish] of [
    ['Unlimited', 'unlimited', 'normal'], ['Unlimited Holofoil', 'unlimited', 'holo'],
    ['1st Edition', 'first_edition', 'normal'], ['1st Edition Holofoil', 'first_edition', 'holo'],
  ]) assert.deepEqual(parse(subtype), { source_subtype_name: subtype, edition, finish_key: finish });
  assert.equal(parse('  UNLIMITED  ').source_subtype_name, '  UNLIMITED  ');
  for (const subtype of ['Unlimited Reverse Holofoil', '1st Edition (Staff)', 'First Edition',
    'Holofoil', 'Normal', '', null, {}, 'unlimited\nholofoil']) assert.equal(parse(subtype), null);
});

test('matching dimensions are review leads only, never price or ownership authority', () => {
  const input = { parent, printing, source };
  const before = structuredClone(input);
  assert.deepEqual(check().reasons, []);
  assert.equal(check().identity_compatible, true);
  assert.equal(check().publishable, false);
  assert.equal(check().write_ready, false);
  assert.equal(check().ownership_reassignment_allowed, false);
  assert.deepEqual(input, before);
});

test('neither edition may receive the other edition price', () => {
  assert.ok(check({ source: { ...source, source_subtype_name: 'Unlimited Holofoil' } }).reasons.includes('edition_mismatch'));
  assert.ok(check({ parent: { ...parent, printed_identity_modifier: 'edition:unlimited' } }).reasons.includes('edition_mismatch'));
});

test('blank edition remains unresolved regardless of image, name, source flags or metadata', () => {
  const unknown = { ...parent, printed_identity_modifier: null, image_status: 'exact',
    image_note: 'First Edition stamp', name: 'Clefable First Edition',
    ai_metadata: { pokemonapi: { legalities: { unlimited: 'Legal' } } },
    variants: { firstEdition: true }, edition_authority: true };
  for (const subtype of ['Unlimited Holofoil', '1st Edition Holofoil']) {
    const result = check({ parent: unknown, source: { ...source, source_subtype_name: subtype } });
    assert.equal(result.canonical_edition, null);
    assert.ok(result.reasons.includes('canonical_edition_unresolved'));
  }
});

test('wrong parent, finish, provisional child and special variants stay incompatible', () => {
  for (const patch of [
    { printing: { ...printing, card_print_id: 'another-parent' } },
    { printing: { ...printing, finish_key: 'normal' } },
    { printing: { ...printing, is_provisional: true } },
    { printing: { ...printing, public_visibility: false } },
    { parent: { ...parent, variant_key: 'no_symbol_error' } },
    { parent: { ...parent, set_code: 'base1' } },
    { source: { ...source, category_id: 1 } },
  ]) assert.equal(check(patch).identity_compatible, false);
});

const now = new Date('2026-10-01T04:00:00Z');
const valid = {
  source_product_id: 45120, category_id: 3, source_group_name: 'Jungle',
  source_product_name: 'Clefable (1)', source_subtype_name: 'Holofoil',
  normalized_finish_key: 'holo', finish_key: 'holo', source_product_active: true,
  source_product_catalog_status: 'current', has_printed_number_evidence: true,
  currency: 'USD', market_price: 38.06, source_row_hash: 'row',
  source_observation_id: 'observation', source_sync_run_id: 'run', source_artifact_id: 'artifact',
  source_artifact_hash: 'hash', source_artifact_byte_size: 100,
  source_price_row_identity: 'tcgplayer:45120:holofoil', source_sync_mode: 'current_full_sync',
  source_sync_status: 'completed', source_sync_failed_count: 0,
  source_sync_finished_at: '2026-10-01T03:00:00Z', source_mapping_count: 1,
  source_mapping_id: 'mapping', mapping_method: 'exact', card_print_mapping_count: 1,
  card_printing_mapping_count: 1, identity_domain_count: 1, identity_domain: 'pokemon_eng_standard',
  card_print_id: 'parent', gv_id: 'GV-PK-JU-1', card_printing_id: 'child', printing_gv_id: 'child-gvid',
  variant_assignment_status: 'exact_child_finish', duplicate_product_row_count: 1,
};

test('prefilled normalized finish and exact generic assignments cannot publish edition prices', () => {
  assert.equal(qualify(valid, { now }).eligible, true);
  for (const subtype of ['Unlimited', 'Unlimited Holofoil', '1st Edition', '1st Edition Holofoil', 'First Edition Holofoil']) {
    const finish = subtype.endsWith('Holofoil') ? 'holo' : 'normal';
    const result = qualify({ ...valid, source_subtype_name: subtype, finish_key: finish,
      normalized_finish_key: finish, edition_authority: true, source_mapping_meta: { edition_verified: true } }, { now });
    assert.equal(result.decision, 'quarantine');
    assert.ok(result.reason_codes.includes('edition_bound_pricing_authority_required'));
    assert.equal(result.evidence.edition_policy_version, 'TCGPLAYER_EDITION_IDENTITY_V1');
    assert.equal(result.policy_version, 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3');
  }
});

test('ordinary Pokemon and MTG source subtypes do not acquire an edition gate', () => {
  for (const subtype of ['Normal', 'Holofoil', 'Reverse Holofoil', 'Foil']) {
    assert.deepEqual(reasons({ category_id: 3, source_subtype_name: subtype }), []);
    assert.deepEqual(reasons({ category_id: 1, source_subtype_name: subtype }), []);
  }
  assert.deepEqual(reasons({ category_id: 1, source_subtype_name: 'Unlimited' }), []);
  assert.ok(reasons({ ...valid, printed_identity_modifier: 'edition:first_edition' }).length > 0);
});

test('partial internal assignment metadata never enables edition publication', () => {
  const result = qualify({ ...valid, source_subtype_name: '1st Edition Holofoil',
    gv_id: 'GV-PK-JU-1-FIRST-EDITION', printing_gv_id: 'GV-PK-JU-1-FIRST-EDITION-HOLO',
    printed_identity_modifier: 'edition:first_edition',
    variant_assignment_id: 'retained-internal-assignment',
    variant_assignment_version: 'TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    edition_assignment_authority: true, edition_binding_id: 'reviewed-binding',
  }, { now });
  assert.equal(result.eligible, false);
  assert.equal(result.decision, 'quarantine');
  assert.ok(result.reason_codes.includes('edition_bound_pricing_authority_required'));
  assert.equal(result.policy_version, 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3');
});

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
function editionRow() {
  const row = { ...valid, group_id: 635, source_subtype_name: '1st Edition Holofoil',
    source_mapping_id: null, variant_assignment_id: null, mapping_method: 'jungle_edition_binding_v1',
    edition_assignment_id: id(1), edition_binding_id: id(2), edition_assignment_sha256: 'a'.repeat(64),
    edition_assignment_version: 'TCGPLAYER_JUNGLE_EDITION_ASSIGNMENT_V1',
    edition_assignment_required: true, edition_assignment_current: true,
    printed_identity_modifier: 'edition:first_edition',
    card_print_id: id(3), card_printing_id: id(4), gv_id: 'GV-PK-JU-1-FIRST-EDITION',
    printing_gv_id: 'GV-PK-JU-1-FIRST-EDITION-HOLO' };
  row.edition_assignment_payload = { version: row.edition_assignment_version,
    source: { observation_id: row.source_observation_id, sync_run_id: row.source_sync_run_id,
      artifact_id: row.source_artifact_id, artifact_hash: row.source_artifact_hash,
      product_id: row.source_product_id, subtype: row.source_subtype_name,
      row_hash: row.source_row_hash, price_row_identity: row.source_price_row_identity,
      currency: 'USD', market_price: row.market_price, category_id: 3, group_id: 635,
      product_hash: 'b'.repeat(64), sync_finished_at_epoch: Date.parse(row.source_sync_finished_at) / 1000 },
    binding: { id: id(2), identity_link_id: id(5), manifest_sha256: 'c'.repeat(64) },
    canonical: { legacy_card_print_id: id(6), card_print_id: id(3), card_printing_id: id(4),
      gv_id: row.gv_id, printing_gv_id: row.printing_gv_id, edition: 'first_edition', finish_key: 'holo',
      printed_identity_modifier: row.printed_identity_modifier } };
  return row;
}

test('complete exact edition projection qualifies through separate assignment lane with unchanged V1_3 policy', () => {
  const row = editionRow(); assert.equal(exact(row), true);
  const result = qualify(row, { now });
  assert.equal(result.eligible, true); assert.equal(result.decision, 'publish');
  assert.equal(result.policy_version, 'TCGPLAYER_MARKET_PUBLICATION_POLICY_V1_3');
  assert.equal(result.evidence.edition_assignment_id, row.edition_assignment_id);
  assert.equal(result.evidence.source_mapping_id, null);
});

test('changed edition, source, identity, amount, scope or partial projection stays held', () => {
  for (const patch of [
    { category_id: 1 }, { group_id: 634 }, { edition_assignment_current: false },
    { edition_assignment_required: false }, { edition_assignment_id: null },
    { edition_binding_id: id(99) }, { edition_assignment_sha256: 'not-a-hash' },
    { edition_assignment_version: 'old-version' }, { edition_assignment_payload: null },
    { source_subtype_name: 'Unlimited Holofoil' }, { normalized_finish_key: 'normal' },
    { printed_identity_modifier: 'edition:unlimited' }, { source_mapping_id: 1 },
    { variant_assignment_id: id(98) }, { market_price: 999 }, { currency: 'EUR' },
    { card_print_id: id(6) }, { card_printing_id: id(97) }, { source_row_hash: 'changed' },
    { source_sync_finished_at: '2026-10-01T02:00:00Z' },
  ]) {
    const row = { ...editionRow(), ...patch };
    assert.equal(exact(row), false, JSON.stringify(patch));
    assert.equal(qualify(row, { now }).eligible, false, JSON.stringify(patch));
  }
});

test('only edition candidates preserve full PostgreSQL timestamp precision before staging', () => {
  const ordinary = { ...valid }; assert.equal(hydrate(ordinary), ordinary);
  const row = { ...editionRow(), source_sync_finished_at: new Date('2026-10-01T03:00:00.123Z'),
    edition_source_sync_finished_at: '2026-10-01 03:00:00.123456+00' };
  const frozen = structuredClone(row); const result = hydrate(row);
  assert.equal(result.source_sync_finished_at, row.edition_source_sync_finished_at);
  assert.deepEqual(row, frozen);
});
