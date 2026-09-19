import test from 'node:test';
import assert from 'node:assert/strict';
import { sha256, stableJson } from '../../backend/pricing/one_piece_canonical_import_staging_v1.mjs';
import { ONE_PIECE_GAME_ID } from '../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs';
import { assessOnePiecePrintingFamily, buildOnePiecePrintingAdmission } from '../../backend/catalog/one_piece_printing_admission_v1.mjs';
import { ONE_PIECE_COMPLETE_DON_SET_ID, ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION } from '../../backend/pricing/one_piece_complete_don_canonical_v1.mjs';

const hash = value => sha256(stableJson(value));
function seal(f) {
  const i = f.identities[0], e = f.evidence[0], p = f.products[0];
  i.identity_key_hash = hash(i.identity_payload);
  f.parent.print_identity_key = `one_piece_eng_print:${i.identity_key_hash}`;
  e.evidence_key_hash = hash({ acquisition_key: e.acquisition_key, source_key: e.source_key,
    evidence_subject: e.evidence_subject, evidence_payload: e.evidence_payload });
  p.payload_hash = hash(p.raw_payload);
  for (const l of f.lanes) l.payload_hash = hash(l.raw_payload);
  return f;
}
function fixture() {
  const domain = 'one_piece_eng_print';
  return seal({
    asOf: '2026-09-19T05:00:00Z',
    set: { id: 'set', game: 'one_piece', code: 'OP01' },
    parent: { id: 'parent', name: 'Zoro', number: 'OP01-001', gv_id: 'GV-OP-TCGP-123', set_id: 'set',
      set_code: 'OP01', game_id: ONE_PIECE_GAME_ID, identity_domain: domain, tcgplayer_id: '123',
      external_ids: { tcgplayer: '123' }, variant_key: 'tcgplayer_product_123' },
    identities: [{ id: 'identity', is_active: true, card_print_id: 'parent', identity_domain: domain,
      identity_key_version: 'ONE_PIECE_ENG_PRODUCT_PARENT_IDENTITY_V1', set_code_identity: 'OP01',
      printed_number: 'OP01-001', normalized_printed_name: 'zoro', source_name_raw: 'Zoro (Parallel)',
      identity_payload: { game_code: 'one_piece', language_code: 'en', set_code: 'OP01', printed_number: 'OP01-001',
        normalized_printed_name: 'zoro', variant_key: 'tcgplayer_product_123', source_product_id: 123 } }],
    evidence: [{ id: 'proof', active: true, card_print_id: 'parent', card_print_identity_id: 'identity',
      source_key: 'tcgplayer', acquisition_key: 'one_piece:tcgplayer:product:123',
      evidence_subject: { identity_domain: domain, set_code: 'OP01', printed_number: 'OP01-001', printed_name: 'Zoro',
        variant_key: 'tcgplayer_product_123', source_product_id: 123 },
      evidence_payload: { source_product: { source_product_id: 123 }, official_authority: {
        authority_status: 'exact_official_english_printed_number_and_name', card_number: 'OP01-001', official_name: 'Zoro' } } }],
    mappings: [{ active: true, source: 'tcgplayer', external_id: '123', card_print_id: 'parent' }],
    products: [{ product_id: 123, category_id: 68, group_id: 1, source_active: true, catalog_metadata_status: 'current',
      name: 'Zoro (Parallel)', extended_data: [{ name: 'Number', value: 'OP01-001' }], presale_info: { isPresale: false },
      raw_payload: { productId: 123, categoryId: 68, groupId: 1, name: 'Zoro (Parallel)',
        extendedData: [{ name: 'Number', value: 'OP01-001' }], presaleInfo: { isPresale: false } } }],
    lanes: [{ id: 'observation', product_id: 123, category_id: 68, group_id: 1, subtype_name_normalized: 'foil',
      subtype_name: 'Foil', observed_on: '2026-09-18', source_price_row_identity: 'tcgplayer:123:foil',
      source_artifact_id: 'archive', source_archive_path: 'warehouse/68/1/prices.json',
      raw_payload: { productId: 123, subTypeName: 'Foil', marketPrice: 5 } }],
    children: [], finishKeys: [{ key: 'normal', is_active: true, meta: {} },
      { key: 'foil', is_active: true, meta: { game_scope: ['mtg'] } }],
  });
}
function admitted() {
  const f = fixture(); f.finishKeys[1].meta.game_scope.push('one_piece'); return f;
}
function inventory(f) {
  return { observed_at: f.asOf, parents: [f.parent], sets: [f.set], identities: f.identities,
    evidence: f.evidence, mappings: f.mappings, products: f.products, latest_lanes: f.lanes, children: f.children };
}

function donFixture() {
  const f = admitted(), i = f.identities[0], e = f.evidence[0], p = f.products[0];
  f.set = { id: ONE_PIECE_COMPLETE_DON_SET_ID, game: 'one_piece', code: 'DON' };
  Object.assign(f.parent, { set_id: f.set.id, set_code: 'DON', number: null, name: 'DON!! Card (Nami)' });
  Object.assign(i, { identity_key_version: ONE_PIECE_COMPLETE_DON_IDENTITY_KEY_VERSION,
    set_code_identity: 'DON', printed_number: 'DON!!', normalized_printed_name: 'don!! card (nami)', source_name_raw: f.parent.name });
  Object.assign(i.identity_payload, { set_code: 'DON', printed_number: 'DON!!',
    printed_number_semantics: 'unnumbered_don_identity_token', normalized_printed_name: i.normalized_printed_name, source_group_id: 1 });
  Object.assign(e.evidence_subject, { set_code: 'DON', printed_number: 'DON!!', printed_name: f.parent.name, source_group_id: 1 });
  delete e.evidence_payload.official_authority;
  e.evidence_payload.authority = { exact_product_authority: 'tcgplayer_product_id_and_structured_don_classification',
    source_product_preserved_without_name_collapsing: true, official_equivalence_authority: false, official_visual_variant_authority: false };
  Object.assign(e.evidence_payload.source_product, { source_product_name: f.parent.name, source_group_id: 1,
    card_type: 'don', language: { normalized: 'en', explicit: false, authority: 'tcgplayer_category_68_default_unverified' } });
  e.evidence_payload.durable_staging = { source_product_id: 123, source_group_id: 1 };
  p.name = p.raw_payload.name = f.parent.name;
  p.extended_data = p.raw_payload.extendedData = [{ name: 'CardType', value: 'DON!!' }];
  return seal(f);
}

test('unnumbered DON product admits only archived finish without invented number or official equivalence', () => {
  const f = donFixture(), before = structuredClone(f), r = assessOnePiecePrintingFamily(f);
  assert.equal(r.status, 'source_verified', JSON.stringify(r.reasons));
  assert.equal(r.proposed_printings.length, 1);
  assert.equal(r.proposed_printings[0].finish_key, 'foil');
  assert.equal(r.proposed_printings[0].evidence.source_product_name, 'DON!! Card (Nami)');
  assert.deepEqual(f, before);
  assert.equal(f.parent.number, null);
});

const donHolds = [
  ['numbered_identity_required', f => { f.set.id = f.parent.set_id = 'another-don-set'; }],
  ['numbered_identity_required', f => { f.parent.number = 'DON!!'; }],
  ['unsupported_identity_version', f => { f.identities[0].identity_key_version = 'ONE_PIECE_ENG_PRODUCT_PARENT_IDENTITY_V1'; }],
  ['printed_number_mismatch', f => { f.identities[0].identity_payload.printed_number = null; }],
  ['don_product_authority_missing', f => { f.identities[0].identity_payload.printed_number_semantics = 'printed_number'; }],
  ['don_product_authority_missing', f => { f.evidence[0].evidence_payload.authority.official_equivalence_authority = true; }],
  ['don_product_authority_missing', f => { f.evidence[0].evidence_payload.source_product.language.normalized = 'ja'; }],
  ['don_product_group_mismatch', f => { f.evidence[0].evidence_subject.source_group_id = 2; }],
  ['source_number_mismatch', f => { f.products[0].extended_data.push({ name: 'Number', value: 'OP01-001' }); }],
  ['don_structured_type_required', f => { f.products[0].extended_data = f.products[0].raw_payload.extendedData = []; }],
  ['don_structured_type_required', f => { f.products[0].extended_data[0].value = 'Character'; }],
  ['source_name_changed', f => { f.products[0].name = f.products[0].raw_payload.name = 'DON!! Card (Nami) (Gold)'; }],
  ['missing_finish_archive', f => { f.lanes[0].source_artifact_id = null; }],
  ['finish_lane_cardinality', f => { f.lanes = []; }],
];
for (const [n, [reason, mutate]] of donHolds.entries()) test(`DON boundary ${n}: ${reason}`, () => {
  const f = donFixture(); mutate(f); seal(f);
  const r = assessOnePiecePrintingFamily(f);
  assert.equal(r.status, 'needs_evidence');
  assert.ok(r.reasons.includes(reason), JSON.stringify(r.reasons));
  assert.deepEqual(r.proposed_printings, []);
});

test('foil remains taxonomy-blocked and never becomes Pokemon holo', () => {
  const r = assessOnePiecePrintingFamily(fixture());
  assert.equal(r.status, 'source_verified_taxonomy_blocked');
  assert.deepEqual(r.taxonomy_required, ['foil']);
  assert.equal(r.proposed_printings[0].finish_key, 'foil');
  assert.equal(r.proposed_printings[0].printing_gv_id, 'GV-OP-TCGP-123-FOIL');
  assert.equal(r.database_writes, 0);
});
test('source-backed product, identity and subtype produce deterministic candidates without mutating input', () => {
  const f = admitted(), before = structuredClone(f);
  const a = buildOnePiecePrintingAdmission(inventory(f), f.finishKeys);
  assert.equal(a.counts.source_verified, 1);
  assert.equal(a.write_ready, false);
  assert.deepEqual(a, buildOnePiecePrintingAdmission(inventory(f), f.finishKeys));
  assert.deepEqual(f, before);
});
test('price amount and rarity do not determine finish', () => {
  const f = admitted(), before = assessOnePiecePrintingFamily(f).proposed_printings[0];
  f.lanes[0].raw_payload.marketPrice = null; f.parent.rarity = 'Common'; seal(f);
  const after = assessOnePiecePrintingFamily(f).proposed_printings[0];
  assert.equal(after.id, before.id); assert.equal(after.finish_key, 'foil');
});
test('normal and foil require two independent subtype records', () => {
  const f = admitted(), l = structuredClone(f.lanes[0]);
  Object.assign(l, { id: 'normal-observation', subtype_name_normalized: 'normal', subtype_name: 'Normal', source_price_row_identity: 'tcgplayer:123:normal' });
  l.raw_payload.subTypeName = 'Normal'; f.lanes.push(l); seal(f);
  const r = assessOnePiecePrintingFamily(f);
  assert.equal(r.status, 'source_verified'); assert.equal(r.proposed_printings.length, 2);
  assert.deepEqual(r.proposed_printings.map(p => p.finish_key), ['foil', 'normal']);
});

const holds = [
  ['wrong_game_or_set', f => { f.parent.game_id = 'pokemon'; }],
  ['wrong_identity_domain', f => { f.parent.identity_domain = 'pokemon_eng_print'; }],
  ['numbered_identity_required', f => { f.parent.number = 'DON!!'; }],
  ['identity_cardinality', f => { f.identities.push(structuredClone(f.identities[0])); }],
  ['evidence_cardinality', f => { f.evidence = []; }],
  ['mapping_cardinality_or_product', f => { f.mappings[0].external_id = '124'; }],
  ['product_cardinality', f => { f.products = []; }],
  ['missing_evidence_payload', f => { delete f.identities[0].identity_payload; }],
  ['identity_hash_mismatch', f => { f.identities[0].identity_payload.printed_number = 'OP01-002'; }],
  ['evidence_hash_mismatch', f => { f.evidence[0].evidence_subject.printed_name = 'Other'; }],
  ['identity_language_or_domain', f => { f.identities[0].identity_payload.language_code = 'ja'; seal(f); }],
  ['cross_parent_evidence', f => { f.evidence[0].card_print_identity_id = 'other'; }],
  ['unsupported_identity_version', f => { f.identities[0].identity_key_version = 'FUTURE'; }],
  ['source_name_changed', f => { f.identities[0].source_name_raw = 'Zoro'; }],
  ['official_authority_missing', f => { f.evidence[0].evidence_payload.official_authority.official_name = 'Other'; seal(f); }],
  ['variant_product_mismatch', f => { f.parent.variant_key = 'base'; }],
  ['source_product_not_current', f => { f.products[0].source_active = false; }],
  ['source_number_mismatch', f => { f.products[0].extended_data[0].value = 'OP01-002'; }],
  ['raw_product_hash_mismatch', f => { f.products[0].raw_payload.name = 'Another'; }],
  ['future_or_presale_product', f => { f.products[0].presale_info.isPresale = true; f.products[0].raw_payload.presaleInfo.isPresale = true; seal(f); }],
  ['future_or_presale_product', f => { f.products[0].presale_info.releasedOn = '2027-01-01'; f.products[0].raw_payload.presaleInfo.releasedOn = '2027-01-01'; seal(f); }],
  ['finish_lane_cardinality', f => { f.lanes = []; }],
  ['finish_lane_cardinality', f => { f.lanes.push(structuredClone(f.lanes[0])); }],
  ['unrecognized_finish', f => { f.lanes[0].subtype_name_normalized = 'holo'; }],
  ['raw_finish_mismatch', f => { f.lanes[0].raw_payload.productId = 124; seal(f); }],
  ['raw_finish_mismatch', f => { delete f.lanes[0].raw_payload; }],
  ['missing_finish_archive', f => { f.lanes[0].source_artifact_id = null; }],
  ['invalid_finish_observation_date', f => { f.lanes[0].observed_on = 'not-a-date'; }],
  ['invalid_finish_observation_date', f => { f.lanes[0].observed_on = '2026-09-20'; }],
];
for (const [reason, mutate] of holds) test(`holds unsupported family: ${reason} (${holds.findIndex(h => h[1] === mutate)})`, () => {
  const f = admitted(); mutate(f);
  const r = assessOnePiecePrintingFamily(f);
  assert.equal(r.status, 'needs_evidence'); assert.ok(r.reasons.includes(reason), JSON.stringify(r.reasons));
  assert.deepEqual(r.proposed_printings, []); assert.equal(r.database_writes, 0);
});
test('whitespace-only source correction does not erase treatment evidence', () => {
  const f = admitted(); f.identities[0].source_name_raw = 'Zoro  (Parallel)';
  assert.equal(assessOnePiecePrintingFamily(f).status, 'source_verified');
  f.identities[0].source_name_raw = 'Zoro (Textured)';
  assert.equal(assessOnePiecePrintingFamily(f).status, 'needs_evidence');
});
test('incremental official source evidence is accepted only with its known producer version', () => {
  const f = admitted(); f.evidence[0].source_key = 'tcgplayer_bandai_official';
  f.evidence[0].evidence_payload.promotion_version = 'ONE_PIECE_INCREMENTAL_CANONICAL_PROMOTION_V1'; seal(f);
  assert.equal(assessOnePiecePrintingFamily(f).status, 'source_verified');
  f.evidence[0].evidence_payload.promotion_version = 'unrecognized'; seal(f);
  assert.ok(assessOnePiecePrintingFamily(f).reasons.includes('evidence_source_or_domain'));
});
test('historical archived subtype supports printing identity without making its price current', () => {
  const f = admitted(); f.lanes[0].observed_on = '2020-01-01';
  const r = assessOnePiecePrintingFamily(f);
  assert.equal(r.status, 'source_verified');
  assert.equal(r.proposed_printings[0].evidence.observed_on, '2020-01-01');
  assert.match(r.proposed_printings[0].evidence.scope, /not a.*price-publication/);
  f.lanes[0].source_artifact_id = null;
  assert.ok(assessOnePiecePrintingFamily(f).reasons.includes('missing_finish_archive'));
});
test('existing exact children are retained, never recreated', () => {
  const f = admitted(), p = assessOnePiecePrintingFamily(f).proposed_printings[0];
  f.children = [{ ...p, id: 'existing-uuid', provenance_source: 'prior', provenance_ref: 'prior:123' }];
  const r = assessOnePiecePrintingFamily(f);
  assert.deepEqual(r.retained_printing_ids, ['existing-uuid']); assert.equal(r.proposed_printings.length, 0);
  f.children[0].is_provisional = true;
  assert.ok(assessOnePiecePrintingFamily(f).reasons.includes('existing_child_conflict'));
});
test('unmatched existing finish blocks the family instead of removing it', () => {
  const f = admitted(); f.children.push({ id: 'protected', finish_key: 'etched' });
  const before = structuredClone(f.children), r = assessOnePiecePrintingFamily(f);
  assert.ok(r.reasons.includes('existing_finish_not_in_source')); assert.deepEqual(f.children, before);
  assert.equal(r.proposed_printings.length, 0);
});
test('duplicate source product parents stop the entire preparation', () => {
  const f = admitted(), i = inventory(f);
  i.parents.push({ ...f.parent, id: 'other', gv_id: 'OTHER' });
  assert.throws(() => buildOnePiecePrintingAdmission(i, f.finishKeys), /duplicate_source_product_parent/);
});
test('out-of-scope evidence is never silently discarded', () => {
  const f = admitted(), i = inventory(f); i.evidence.push({ card_print_id: 'other' });
  assert.throws(() => buildOnePiecePrintingAdmission(i, f.finishKeys), /orphan_evidence_inventory/);
});
test('legacy ST01 name policy preserves punctuation without changing the identity', () => {
  const f = admitted(); f.set.code = f.parent.set_code = 'ST01'; f.parent.number = 'ST01-001'; f.parent.name = 'Monkey.D.Luffy'; f.parent.variant_key = '';
  const i = f.identities[0], e = f.evidence[0], p = f.products[0];
  Object.assign(i, { identity_key_version: 'ONE_PIECE_ENG_PRINT_IDENTITY_V1', set_code_identity: 'ST01',
    printed_number: 'ST01-001', normalized_printed_name: 'monkey.d.luffy', source_name_raw: 'Monkey.D.Luffy' });
  Object.assign(i.identity_payload, { set_code: 'ST01', printed_number: 'ST01-001', normalized_printed_name: 'monkey.d.luffy', variant_key: 'base' });
  Object.assign(e.evidence_subject, { set_code: 'ST01', printed_number: 'ST01-001', printed_name: 'Monkey.D.Luffy' });
  e.evidence_payload.official_authority = { authority_status: 'exact_official_english_st01_card_match', language_code: 'en' };
  e.evidence_payload.durable_staging = { source_product_id: 123 };
  p.name = p.raw_payload.name = 'Monkey.D.Luffy'; p.extended_data[0].value = p.raw_payload.extendedData[0].value = 'ST01-001'; seal(f);
  assert.equal(assessOnePiecePrintingFamily(f).status, 'source_verified');
});
