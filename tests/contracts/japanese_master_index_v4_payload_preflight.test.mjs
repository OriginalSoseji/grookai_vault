import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  contentFingerprint,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  buildPayloadContracts,
  deterministicUuid,
  parseJapaneseReleaseDate,
  setRoleForReleaseKind,
} from '../../scripts/audits/japanese_master_index_v4/payload_preflight_v1.mjs';

const REPORT_PATH =
  'docs/audits/japanese_master_index_v4/payload_preflight/'
  + 'jpn_payload_preflight_v1.json';

function cardCandidate({
  key = 'candidate-1',
  setKey = 'jpn-test',
  liveSetId = '11111111-1111-4111-8111-111111111111',
  speciesId = '22222222-2222-4222-8222-222222222222',
} = {}) {
  return {
    candidate_key: key,
    promotion_lane: liveSetId ? 'existing_set' : 'set_prerequisite',
    target_set: {
      jpn_set_key: setKey,
      live_set_id: liveSetId,
    },
    printed_identity: {
      collector_facing_name_en: 'pikachu',
      collector_facing_name_source: 'language_agnostic_species_fallback',
      printed_name_ja: 'ピカチュウ',
      printed_number: '025',
      card_domain: 'pokemon',
      card_type: 'pokemon',
      identity_modifiers: [],
    },
    family_relationship: {
      family_key: `species:${speciesId}`,
      family_status: 'resolved_species',
      relationship_type: 'language_agnostic_species',
      species_id: speciesId,
      confidence: 0.95,
    },
    source_evidence: {
      source_assertion_keys: ['assertion-1'],
      source_ids: ['fixture'],
    },
    image_evidence: {
      urls: ['https://example.test/card.png'],
    },
  };
}

const assertion = {
  assertion_key: 'assertion-1',
  assertion_lane: 'fresh_source_assertion',
  registry_key: 'jpn-test',
  resolution_status: 'novel_numbered_candidate',
  source_external_id: 'TEST:025',
  source_key: 'fixture',
  raw_snapshot_ref: 'fixture://test',
  raw_snapshot_sha256: 'a'.repeat(64),
  image_urls: ['https://example.test/card.png'],
};

const species = {
  id: '22222222-2222-4222-8222-222222222222',
  canonical_name: 'pikachu',
  display_name: 'Pikachu',
  active: true,
};

test('deterministic UUIDs are stable version-5-shaped values', () => {
  const first = deterministicUuid('jpn-v4-fixture');
  assert.equal(first, deterministicUuid('jpn-v4-fixture'));
  assert.match(
    first,
    /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
});

test('Japanese release dates and set roles map deterministically', () => {
  assert.equal(
    parseJapaneseReleaseDate(['2021年 8月20日（金）']),
    '2021-08-20',
  );
  assert.equal(
    setRoleForReleaseKind('expansion_or_subset'),
    'expansion',
  );
  assert.equal(
    setRoleForReleaseKind('constructed_deck'),
    'product_insert',
  );
});

test('payload contracts use live species display names and exact row lanes', () => {
  const contracts = buildPayloadContracts({
    setCandidates: [],
    cardCandidates: [cardCandidate()],
    assertions: [assertion],
    speciesRows: [species],
  });
  assert.equal(contracts.card_print_rows.length, 1);
  assert.equal(contracts.identity_rows.length, 1);
  assert.equal(contracts.evidence_rows.length, 1);
  assert.equal(contracts.family_review_rows.length, 1);
  assert.equal(contracts.child_printing_rows.length, 1);
  assert.equal(contracts.card_print_rows[0].db_row.name, 'Pikachu');
  assert.equal(
    contracts.card_print_rows[0].db_row.gv_id,
    'GV-PK-JPN-TEST-025',
  );
  assert.equal(
    contracts.family_review_rows[0]
      .db_row.normalized_family_candidate,
    species.id,
  );
  assert.equal(
    contracts.child_printing_rows[0].apply_lane,
    'deferred_visibility_and_storage_gate',
  );
  assert.equal(
    contracts.child_printing_rows[0].db_row.printing_gv_id,
    'GV-PK-JPN-TEST-025-STD',
  );
});

test('occupied natural keys receive deterministic modifiers and GV suffixes', () => {
  const candidate = cardCandidate();
  const contracts = buildPayloadContracts({
    setCandidates: [],
    cardCandidates: [candidate],
    assertions: [assertion],
    speciesRows: [species],
    liveNaturalConflicts: new Set([
      `${candidate.target_set.live_set_id}|025`,
    ]),
  });
  assert.match(
    contracts.card_print_rows[0].db_row.printed_identity_modifier,
    /^jpn_v4_pikachu_[0-9a-f]{10}$/,
  );
  assert.match(
    contracts.card_print_rows[0].db_row.gv_id,
    /^GV-PK-JPN-TEST-025-[0-9A-F]{10}$/,
  );
});

test('missing assertion evidence fails closed', () => {
  assert.throws(
    () => buildPayloadContracts({
      setCandidates: [],
      cardCandidates: [cardCandidate()],
      assertions: [],
      speciesRows: [species],
    }),
    /Source assertion not found/,
  );
});

test('generated preflight is collision-free and preserves no-write boundaries', async () => {
  const { artifact } = await readVerifiedArtifact(REPORT_PATH);
  const report = artifact.content;
  assert.equal(
    report.status,
    'preflight_complete_no_write',
  );
  assert.deepEqual(report.summary, {
    blocking_collisions: 0,
    card_print_rows: 3888,
    child_printing_rows: 3888,
    evidence_rows: 3980,
    family_review_rows: 3888,
    identity_rows: 3888,
    nonblocking_collisions: 0,
    repository_schema_drift_tables: 0,
    set_rows: 1041,
  });
  assert.equal(report.execution_boundary.database_reads, true);
  assert.equal(report.execution_boundary.database_writes, false);
  assert.equal(report.execution_boundary.storage_writes, false);
  assert.equal(report.execution_boundary.sql_generated, false);
  assert.equal(report.execution_boundary.apply_payload_generated, false);
  assert.equal(
    report.execution_boundary.public_child_rows_apply_eligible,
    false,
  );

  const reconstructed = contentFingerprint({
    source_promotion_package_fingerprint:
      report.source_promotion_package_fingerprint,
    source_final_manifest_fingerprint:
      report.source_final_manifest_fingerprint,
    datasets: Object.fromEntries(
      Object.entries(report.datasets).map(([key, value]) => [
        key,
        value.content_fingerprint_sha256,
      ]),
    ),
    live_snapshot: report.live_snapshot,
    schema_fingerprint_sha256:
      report.live_snapshot.schema_fingerprint_sha256,
  });
  assert.equal(reconstructed, report.payload_fingerprint_sha256);
});

test('generated target rows have unique IDs and deferred public children', async () => {
  const { artifact } = await readVerifiedArtifact(REPORT_PATH);
  const report = artifact.content;
  const loadRows = async (descriptor) => {
    const rows = [];
    for (const shardPath of descriptor.shard_paths) {
      const { artifact: shard } = await readVerifiedArtifact(shardPath);
      rows.push(...shard.content.rows);
    }
    return rows;
  };
  const [
    sets,
    cards,
    identities,
    evidence,
    family,
    children,
    collisions,
  ] = await Promise.all([
    loadRows(report.datasets.set_rows),
    loadRows(report.datasets.card_print_rows),
    loadRows(report.datasets.identity_rows),
    loadRows(report.datasets.evidence_rows),
    loadRows(report.datasets.family_review_rows),
    loadRows(report.datasets.child_printing_rows),
    loadRows(report.datasets.collision_rows),
  ]);
  const allRows = [
    ...sets,
    ...cards,
    ...identities,
    ...evidence,
    ...family,
    ...children,
  ];
  assert.equal(
    new Set(allRows.map((row) => row.db_row.id)).size,
    allRows.length,
  );
  assert.equal(
    new Set(cards.map((row) => row.db_row.gv_id)).size,
    cards.length,
  );
  assert.equal(
    new Set(identities.map(
      (row) => row.db_row.identity_key_hash,
    )).size,
    identities.length,
  );
  assert.equal(collisions.length, 0);
  assert.equal(children.every(
    (row) => (
      row.apply_lane === 'deferred_visibility_and_storage_gate'
      && row.gate_blockers.length === 2
    ),
  ), true);
  assert.equal(cards.every(
    (row) => row.db_row.identity_domain === 'pokemon_jpn',
  ), true);
  assert.equal(cards.every(
    (row) => row.db_row.name === row.db_row.name.trim(),
  ), true);
});
