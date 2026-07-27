import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import zlib from 'node:zlib';

import {
  contentFingerprint,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const REPORT_PATH =
  'docs/audits/japanese_master_index_v4/promotion_package/'
  + 'jpn_promotion_package_v1.json';
const SOURCE_PATH =
  'scripts/audits/japanese_master_index_v4/promotion_package_v1.mjs';

function readJsonArtifact(inputPath) {
  const raw = fs.readFileSync(inputPath);
  const serialized = inputPath.endsWith('.gz')
    ? zlib.gunzipSync(raw).toString('utf8')
    : raw.toString('utf8');
  const artifact = JSON.parse(serialized);
  assert.equal(
    artifact.content_fingerprint_sha256,
    contentFingerprint(artifact.content),
    `fingerprint mismatch: ${inputPath}`,
  );
  return artifact;
}

function loadRows(descriptor) {
  const rows = [];
  descriptor.shard_paths.forEach((shardPath, index) => {
    const shard = readJsonArtifact(shardPath);
    assert.equal(shard.content.dataset_key, descriptor.dataset_key);
    assert.equal(shard.content.shard_index, index + 1);
    assert.equal(shard.content.shard_count, descriptor.shard_count);
    assert.equal(shard.content.row_count, shard.content.rows.length);
    rows.push(...shard.content.rows);
  });
  assert.equal(rows.length, descriptor.row_count);
  assert.equal(
    contentFingerprint(rows),
    descriptor.content_fingerprint_sha256,
  );
  return rows;
}

test('promotion package is a verified no-write planning artifact', () => {
  const report = readJsonArtifact(REPORT_PATH);

  assert.equal(
    report.package_id,
    'JPN-MASTER-INDEX-PROMOTION-PACKAGE-V1',
  );
  assert.equal(
    report.content.status,
    'complete_no_write_promotion_package',
  );
  assert.deepEqual(report.content.execution_boundary, {
    database_identifiers_generated: false,
    database_reads: false,
    database_writes: false,
    english_mutation: false,
    family_promotion: false,
    identity_writes: false,
    promotion_approval_implied: false,
    public_gv_ids_generated: false,
    source_fetches: false,
    sql_generated: false,
    storage_writes: false,
  });
  assert.equal(
    report.content.source_fingerprints.english_family,
    '7aaa2d3c4d14e379515a33a60bc19444b4333c4ba6ecc1c0a2a8c2eea52669db',
  );
});

test('promotion package partitions every novel candidate exactly once', () => {
  const report = readJsonArtifact(REPORT_PATH);
  const { datasets, summary } = report.content;
  const direct = loadRows(datasets.direct_card_candidates);
  const dependent = loadRows(datasets.set_dependent_card_candidates);
  const blocked = loadRows(datasets.novel_blocked_review);
  const setCandidates = loadRows(datasets.set_insert_candidates);
  const setKeys = new Set(setCandidates.map((row) => row.candidate_key));
  const candidateKeys = [
    ...direct,
    ...dependent,
    ...blocked,
  ].map((row) => row.candidate_key);

  assert.deepEqual(summary, {
    direct_card_candidates: 38,
    evidence_gap_review: 17_891,
    existing_parent_review: 2_224,
    novel_blocked_review: 1_803,
    ready_cards_with_image_evidence: 3_888,
    set_dependent_card_candidates: 3_850,
    set_insert_candidates: 1_041,
    set_mapping_review: 86,
    total_promotion_ready_cards: 3_888,
  });
  assert.equal(candidateKeys.length, 5_691);
  assert.equal(new Set(candidateKeys).size, 5_691);
  assert.ok(direct.every((row) =>
    row.target_set.live_set_id
    && row.target_set.prerequisite === 'none'));
  assert.ok(dependent.every((row) =>
    setKeys.has(row.target_set.jpn_set_key)
    && row.target_set.prerequisite === 'promote_set_candidate_first'));
});

test('promotion-ready rows retain English names, evidence, and images', () => {
  const report = readJsonArtifact(REPORT_PATH);
  const { datasets } = report.content;
  const ready = [
    ...loadRows(datasets.direct_card_candidates),
    ...loadRows(datasets.set_dependent_card_candidates),
  ];

  assert.equal(ready.length, 3_888);
  assert.ok(ready.every((row) =>
    row.printed_identity.collector_facing_name_en
    && row.printed_identity.printed_name_ja
    && row.printed_identity.printed_number
    && row.source_evidence.source_ids.length > 0
    && row.image_evidence.candidate_count > 0
    && row.image_evidence.urls.length > 0
    && row.generated_database_identifiers === false
    && row.generated_public_gv_id === false));
});

test('review lanes preserve every unresolved reason', () => {
  const report = readJsonArtifact(REPORT_PATH);
  const { datasets } = report.content;
  const novel = loadRows(datasets.novel_blocked_review);
  const sets = loadRows(datasets.set_mapping_review);
  const existing = loadRows(datasets.existing_parent_review);
  const evidence = loadRows(datasets.evidence_gap_review);

  assert.deepEqual(report.content.novel_blocker_counts, {
    collector_facing_english_name_missing: 1_788,
    set_mapping_not_promotion_safe: 15,
  });
  assert.equal(novel.length, 1_803);
  assert.equal(sets.length, 86);
  assert.equal(existing.length, 2_224);
  assert.equal(evidence.length, 17_891);
  assert.ok(novel.every((row) => row.promotion_blockers.length > 0));
  assert.ok(sets.every((row) => row.promotion_blockers.length > 0));
  assert.ok(existing.every((row) => row.promotion_blockers.length > 0));
  assert.ok(evidence.every((row) => row.missing_source_families.length > 0));
});

test('package builder contains no database or SQL execution path', () => {
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');

  assert.doesNotMatch(source, /\bpg\b|postgres|supabase/iu);
  assert.doesNotMatch(
    source,
    /\b(?:insert\s+into|update\s+public\.|delete\s+from|truncate|alter\s+table|create\s+table)\b/iu,
  );
  assert.doesNotMatch(source, /client\.query|\.rpc\s*\(/u);
  assert.doesNotMatch(source, /--apply|--execute|--write/iu);
});
