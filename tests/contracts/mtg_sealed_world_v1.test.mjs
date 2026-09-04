import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MTG_SEALED_GAME_KEY,
  buildMtgSealedWriteTelemetryV1,
  buildMtgSealedWorldPlanV1,
  validateMtgSealedWorldPlanV1,
} from '../../backend/pricing/mtg_sealed_world_v1.mjs';

const digest = (value) => String(value).padStart(64, '0').slice(-64);

function source(productId, name, overrides = {}) {
  return {
    product_id: productId,
    category_id: 1,
    group_id: 101,
    name,
    clean_name: name.toLowerCase(),
    source_url: `https://example.invalid/products/${productId}`,
    presale_info: null,
    extended_data: [],
    payload_hash: digest(productId),
    source_active: true,
    catalog_metadata_status: 'current',
    category_name: 'magic',
    category_display_name: 'Magic: The Gathering',
    non_sealed_label: 'Cards',
    group_name: 'Fixture Set',
    ...overrides,
  };
}

function price(productId, overrides = {}) {
  return {
    product_id: productId,
    source_price_row_identity: `tcgplayer:${productId}:normal:2026-08-16`,
    subtype_name_normalized: 'normal',
    observed_on: '2026-08-16',
    currency: 'USD',
    market_price: 99.95,
    low_price: 90,
    payload_hash: digest(productId + 10_000),
    ...overrides,
  };
}

function plan() {
  return buildMtgSealedWorldPlanV1({
    sourceRows: [
      source(1001, 'Fixture Set - Play Booster Box'),
      source(1002, 'Fixture Set - Play Booster Pack'),
      source(1003, 'Fixture Set - German Collector Booster Box'),
      source(1004, 'Lightning Bolt', {
        extended_data: [{ name: 'Number', value: '123' }],
      }),
    ],
    latestPriceRows: [price(1001), price(1002, { market_price: null })],
    latestSync: {
      id: 'sync-fixture',
      status: 'completed',
      observed_on: '2026-08-16',
    },
    producerCommit: 'a'.repeat(40),
  });
}

test('MTG sealed world promotes exact English sealed products only', () => {
  const value = plan();
  assert.equal(value.game_key, MTG_SEALED_GAME_KEY);
  assert.equal(value.payload.candidates.length, 2);
  assert.equal(value.payload.families.length, 1);
  assert.equal(value.payload.variants.length, 2);
  assert.deepEqual(value.payload.variants.map((row) => row.package_form).sort(),
    ['booster_box', 'pack']);
  assert.ok(value.payload.variants.every((row) => row.language_code === 'en'));
  assert.ok(value.payload.qualification_holds.some((row) =>
    row.reason === 'non_english_scope_hold' && row.source_product_id === 1003));
  assert.deepEqual(validateMtgSealedWorldPlanV1(value),
    { valid: true, findings: [] });
});

test('release contains only fresh exact TCGPlayer market prices', () => {
  const value = plan();
  assert.equal(value.payload.qualifications.length, 2);
  assert.deepEqual(value.qualification_status_counts, {
    blocked_missing_price: 1,
    qualified_exact: 1,
  });
  assert.equal(value.payload.members.length, 1);
  assert.equal(value.payload.members[0].qualification_status, 'qualified_exact');
  assert.equal(value.payload.releases[0].expected_member_count, 1);
  assert.equal(value.payload.releases[0].game_key, 'mtg');
});

test('sealed world retains exact evidence and claims no unrelated authority', () => {
  const value = plan();
  const mapping = value.payload.mappings[0];
  assert.equal(mapping.source_provider, 'tcgplayer');
  assert.equal(mapping.mapping_status, 'exact_reviewed');
  assert.ok(value.payload.evidence.every((row) =>
    row.source_mapping_id && row.source_payload_hash));
  assert.deepEqual(value.boundaries, {
    card_writes: 0,
    storage_writes: 0,
    vault_writes: 0,
    catalog_release_control_writes: 0,
    one_piece_writes: 0,
    anonymous_visibility: false,
    authenticated_visibility_before_catalog_release: false,
  });
});

test('plan is deterministic and validator rejects release contamination', () => {
  assert.deepEqual(plan(), plan());
  const changed = plan();
  changed.payload.members[0].qualification_status = 'blocked_stale';
  assert.equal(validateMtgSealedWorldPlanV1(changed).valid, false);
});

test('write telemetry counts inserted rows and pointer, not diagnostics', () => {
  const value = plan();
  const telemetry = buildMtgSealedWriteTelemetryV1(value);
  const insertedResources = [
    'candidates', 'families', 'variants', 'reviews', 'mappings', 'evidence',
    'qualifications', 'releases', 'members',
  ];
  const expectedTableRows = insertedResources.reduce(
    (sum, key) => sum + value.payload[key].length,
    0,
  );

  assert.equal(telemetry.table_rows_written, expectedTableRows);
  assert.equal(telemetry.pointer_rows_written, 1);
  assert.equal(telemetry.database_rows_written, expectedTableRows + 1);
  assert.equal(telemetry.diagnostic_counts.qualification_holds,
    value.payload.qualification_holds.length);
  assert.equal('qualification_holds' in telemetry.table_rows_by_resource, false);

  value.payload.qualification_holds.push({ reason: 'diagnostic_only_fixture' });
  value.counts.qualification_holds = value.payload.qualification_holds.length;
  const telemetryWithExtraDiagnostic = buildMtgSealedWriteTelemetryV1(value);
  const oldIncorrectTotal = Object.values(value.counts)
    .reduce((sum, count) => sum + Number(count), 0);
  assert.equal(telemetryWithExtraDiagnostic.database_rows_written,
    telemetry.database_rows_written);
  assert.equal(telemetryWithExtraDiagnostic.diagnostic_counts.qualification_holds,
    telemetry.diagnostic_counts.qualification_holds + 1);
  assert.notEqual(telemetryWithExtraDiagnostic.database_rows_written,
    oldIncorrectTotal);
});
