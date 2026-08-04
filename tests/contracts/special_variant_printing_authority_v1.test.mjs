import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  cardNameMatches,
  classifyAuthority,
  denominatorSupported,
  finishFromSubtype,
  justTcgProductId,
  variantTitleMatches,
} from '../../scripts/audits/special_variant_printing_authority_v1.mjs';

const baseRow = {
  name: 'Darmanitan',
  number: '25',
  set_code: 'bw1',
  variant_key: 'prerelease_stamp',
  reference_only_candidate_finishes: ['holo'],
  source_finish_evidence: [],
};
const discovery = {
  tcgplayerId: '228483',
  name: 'Darmanitan - 25/114 (Prerelease)',
  number: '25/114',
};
const product = {
  product_id: 228483,
  category_id: 3,
  name: 'Darmanitan - 25/114 (Prerelease)',
  clean_name: 'Darmanitan 25 114 Prerelease',
  extended_data: [{ name: 'Number', displayName: 'Card Number', value: '25/114' }],
  payload_hash: 'product-payload-hash',
  source_active: true,
  catalog_metadata_status: 'current',
};
const observations = [{ subtype_name: 'Holofoil', payload_hash: 'finish-payload-hash' }];
const setRecord = {
  source_totals: {
    pokemontcg_api: { printed_total: 114, total: 115 },
    tcgdex: { official: 114, total: 115 },
  },
};
const masterRows = [{
  status: 'master_verified',
  set_key: 'bw1',
  card_number: '25',
  card_name: 'Darmanitan',
  finish_key: 'stamped',
  sources: ['tcgcollector_card_variants'],
  source_authorities: ['tcgcollector.com'],
  evidence_urls: ['https://example.test/darmanitan'],
}];

test('normalizes exact catalog finish subtypes', () => {
  assert.equal(finishFromSubtype('Holofoil'), 'holo');
  assert.equal(finishFromSubtype('Reverse Holofoil'), 'reverse');
  assert.equal(finishFromSubtype('Normal'), 'normal');
  assert.equal(finishFromSubtype('Unrecognized'), null);
});

test('extracts a numeric TCGplayer product discovery handle', () => {
  assert.equal(justTcgProductId(discovery), 228483);
  assert.equal(justTcgProductId({}), null);
});

test('requires explicit and role-correct special variant titles', () => {
  assert.equal(variantTitleMatches('prerelease_stamp', product.name), true);
  assert.equal(variantTitleMatches('prerelease_stamp', `${product.name} [Staff]`), false);
  assert.equal(variantTitleMatches('staff_prerelease_stamp', `${product.name} [Staff]`), true);
  assert.equal(variantTitleMatches('play_pokemon_stamp', 'Pikachu - Play! Pokemon League Promo'), true);
  assert.equal(variantTitleMatches('play_pokemon_stamp', 'Pikachu - Prize Pack Series One'), false);
});

test('requires the expected card name at the start of the catalog title', () => {
  assert.equal(cardNameMatches('Darmanitan', product), true);
  assert.equal(cardNameMatches('Victini', product), false);
});

test('requires a full-number denominator to match the verified set registry', () => {
  assert.equal(denominatorSupported(product, setRecord), true);
  assert.equal(denominatorSupported({
    ...product,
    extended_data: [{ name: 'Number', value: '25/999' }],
  }, setRecord), false);
});

test('qualifies only an exact catalog identity, finish, and Master-supported candidate', () => {
  const result = classifyAuthority({ row: baseRow, discoveryPayload: discovery, product, observations, masterRows, setRecord });
  assert.equal(result.status, 'authoritative_candidate_ready_for_guarded_dry_run');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.checks.product_id_equal, true);
  assert.equal(result.checks.variant_title_exact, true);
});

test('JustTCG evidence alone never qualifies a row', () => {
  const result = classifyAuthority({ row: baseRow, discoveryPayload: discovery, product: null, observations: [], masterRows, setRecord });
  assert.equal(result.status, 'tcgcsv_product_missing');
});

test('a product-id or variant-title conflict blocks the candidate', () => {
  const wrongId = classifyAuthority({
    row: baseRow,
    discoveryPayload: discovery,
    product: { ...product, product_id: 999 },
    observations,
    masterRows,
    setRecord,
  });
  assert.equal(wrongId.status, 'identity_or_finish_conflict');
  assert.ok(wrongId.blockers.includes('tcgplayer_product_id_mismatch'));

  const noVariant = classifyAuthority({
    row: baseRow,
    discoveryPayload: discovery,
    product: { ...product, name: 'Darmanitan - 25/114' },
    observations,
    masterRows,
    setRecord,
  });
  assert.equal(noVariant.status, 'identity_or_finish_conflict');
  assert.ok(noVariant.blockers.includes('special_variant_not_explicit_in_product_title'));
});

test('missing exact finish evidence remains blocked', () => {
  const result = classifyAuthority({ row: baseRow, discoveryPayload: discovery, product, observations: [], masterRows, setRecord });
  assert.equal(result.status, 'variant_identity_corroborated_finish_needs_second_source');
  assert.ok(result.blockers.includes('tcgcsv_exact_finish_subtype_missing'));
});

test('finish disagreement is a hard conflict', () => {
  const result = classifyAuthority({
    row: baseRow,
    discoveryPayload: discovery,
    product,
    observations: [{ subtype_name: 'Normal', payload_hash: 'normal-finish-payload-hash' }],
    masterRows,
    setRecord,
  });
  assert.equal(result.status, 'identity_or_finish_conflict');
  assert.ok(result.blockers.includes('tcgcsv_finish_conflicts_with_discovery_finish'));
});

test('catalog evidence without independent Master support stays review-only', () => {
  const result = classifyAuthority({ row: baseRow, discoveryPayload: discovery, product, observations, masterRows: [], setRecord });
  assert.equal(result.status, 'variant_identity_corroborated_finish_needs_second_source');
  assert.ok(result.blockers.includes('master_index_exact_card_missing'));
});

test('stale or unhashed catalog evidence cannot qualify', () => {
  const result = classifyAuthority({
    row: baseRow,
    discoveryPayload: discovery,
    product: { ...product, source_active: false },
    observations,
    masterRows,
    setRecord,
  });
  assert.equal(result.status, 'identity_or_finish_conflict');
  assert.ok(result.blockers.includes('tcgcsv_catalog_evidence_not_current_or_hashed'));
});

test('authority audit has no database mutation path', async () => {
  const source = await fs.readFile(
    new URL('../../scripts/audits/special_variant_printing_authority_v1.mjs', import.meta.url),
    'utf8',
  );
  assert.equal(/\.from\([^)]*\)\s*\.\s*(?:insert|upsert|update|delete)\s*\(/s.test(source), false);
  assert.equal(/\.rpc\s*\(/.test(source), false);
});
