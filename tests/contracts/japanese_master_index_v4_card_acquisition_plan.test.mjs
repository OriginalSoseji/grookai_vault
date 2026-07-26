import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  CARD_ASSERTION_VERSION,
  buildCardAssertionKey,
  normalizeJapaneseCardAssertion,
  validateJapaneseCardAssertion,
} from '../../scripts/audits/japanese_master_index_v4/card_assertion_contract_v1.mjs';
import { buildCardAcquisitionPlan } from '../../scripts/audits/japanese_master_index_v4/card_acquisition_plan_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const ROOT = path.resolve('docs/audits/japanese_master_index_v4');

function readContent(relativePath) {
  const artifact = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), 'utf8'),
  );
  assert.equal(
    artifact.content_fingerprint_sha256,
    contentFingerprint(artifact.content),
  );
  return artifact.content;
}

function buildFromPreservedArtifacts() {
  return buildCardAcquisitionPlan({
    setAssertions: readContent('sets/source_set_assertions_v1.json').assertions,
    registryEntries: readContent('sets/jpn_set_registry_v1.json')
      .registry_entries,
    policies: readContent('sets/source_policy_v1.json').policies,
    officialProducts: readContent('sets/jpn_official_product_scope_v1.json')
      .products,
    storedSources: readContent('baseline/live_jpn_source_manifest_v1.json')
      .stored_sources,
  });
}

test('Japanese card assertion contract preserves printed identity without canonical contamination', () => {
  const assertion = normalizeJapaneseCardAssertion({
    source_id: 'tcgdex_ja_cards',
    source_family: 'tcgdex_ja',
    source_kind: 'structured_api',
    source_external_id: 'sv8-001',
    source_url: 'https://api.tcgdex.net/v2/ja/cards/sv8-001',
    source_container_id: 'sv8',
    registry_key: 'jpn-sv8',
    language: 'ja',
    parser_version: 'TCGDEX-JA-CARD-PARSER-V1',
    raw_snapshot_ref: 'cards/raw/tcgdex/sv8-001.json',
    raw_snapshot_sha256: 'a'.repeat(64),
    printed_name: 'ピカチュウ',
    card_number_raw: '001/106',
    card_number_numerator: 1,
    card_number_denominator: 106,
    source_set_code: 'SV8',
    image_urls: ['https://assets.tcgdex.net/ja/sv/sv8/001'],
    source_fields: {
      category: 'Pokémon',
      variants: { normal: true },
    },
  });
  assert.equal(assertion.assertion_version, CARD_ASSERTION_VERSION);
  assert.equal(assertion.printed_name, 'ピカチュウ');
  assert.equal(assertion.assertion_key, buildCardAssertionKey(assertion));
  assert.deepEqual(validateJapaneseCardAssertion(assertion), {
    valid: true,
    errors: [],
  });
  for (const key of ['card_print_id', 'card_printing_id', 'gv_id', 'gvvi_id']) {
    assert.equal(Object.hasOwn(assertion, key), false);
  }
});

test('Japanese card assertion contract rejects invalid provenance and credentials', () => {
  const assertion = normalizeJapaneseCardAssertion({
    source_id: 'example',
    source_family: 'example',
    source_kind: 'structured_api',
    source_external_id: '1',
    source_url: 'https://example.test/cards/1',
    registry_key: 'jpn-example',
    parser_version: 'EXAMPLE-V1',
    raw_snapshot_ref: 'raw/example.json',
    raw_snapshot_sha256: 'not-a-hash',
    printed_name: null,
    source_fields: { api_key: 'must-not-be-preserved' },
  });
  assertion.gv_id = 'GV-PK-JPN-EXAMPLE-001';
  const result = validateJapaneseCardAssertion(assertion);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('raw_snapshot_sha256_invalid'));
  assert.ok(result.errors.includes('identity_coordinate_missing'));
  assert.ok(result.errors.includes('forbidden_canonical_field:gv_id'));
  assert.ok(result.errors.includes('sensitive_source_field:api_key'));
});

test('card acquisition plan disposes every card-capable source assertion', () => {
  const plan = buildFromPreservedArtifacts();
  assert.equal(plan.summary.missing_source_assertion_representation_count, 0);
  assert.equal(
    plan.summary.represented_source_assertion_count,
    plan.summary.expected_source_assertion_count,
  );
  assert.ok(plan.summary.work_item_count >= 2000);
  assert.ok(plan.summary.preserved_live_evidence_rows >= 100000);
});

test('card acquisition plan represents every preserved evidence source exactly once', () => {
  const plan = buildFromPreservedArtifacts();
  const storedSources = readContent(
    'baseline/live_jpn_source_manifest_v1.json',
  ).stored_sources;
  const representedKeys = plan.source_inventory.flatMap(
    (lane) => lane.preserved_source_keys ?? [],
  );
  assert.equal(new Set(representedKeys).size, representedKeys.length);
  for (const stored of storedSources) {
    assert.equal(
      representedKeys.filter((key) => key === stored.source_key).length,
      1,
      `preserved source ${stored.source_key} must map to exactly one lane`,
    );
  }
  assert.equal(
    plan.source_inventory.reduce(
      (sum, lane) => sum + lane.preserved_live_evidence_rows,
      0,
    ),
    storedSources.reduce((sum, row) => sum + row.evidence_rows, 0),
  );
});

test('official acquisition schedules only products with explicit card-list links', () => {
  const plan = buildFromPreservedArtifacts();
  const official = plan.work_items.filter(
    (row) => row.lane_id === 'official_jp_cards',
  );
  assert.equal(
    official.filter((row) => row.disposition === 'scheduled').length,
    137,
  );
  assert.equal(
    official.filter((row) => row.disposition === 'release_context_only').length,
    503,
  );
});

test('Pokellector remains preserved but is never scheduled for automation', () => {
  const plan = buildFromPreservedArtifacts();
  const lane = plan.source_inventory.find(
    (row) => row.lane_id === 'pokellector_jp_manual',
  );
  assert.equal(lane.automatic_status, 'blocked_without_written_permission');
  assert.equal(lane.preserved_live_evidence_rows, 17734);
  assert.equal(
    plan.work_items.some(
      (row) =>
        row.lane_id === 'pokellector_jp_manual' &&
        row.disposition === 'scheduled',
    ),
    false,
  );
});

test('card acquisition plan is deterministic and contains no runtime credentials', () => {
  const first = buildFromPreservedArtifacts();
  const second = buildFromPreservedArtifacts();
  assert.equal(contentFingerprint(first), contentFingerprint(second));
  const serialized = JSON.stringify(first);
  assert.doesNotMatch(
    serialized,
    /SUPABASE_DB_URL|DATABASE_URL|service_role|authorization|api[_-]?key/i,
  );
  assert.deepEqual(first.execution_boundary, {
    database_reads: false,
    database_writes: false,
    storage_writes: false,
    source_fetches: false,
    plan_only: true,
  });
});
