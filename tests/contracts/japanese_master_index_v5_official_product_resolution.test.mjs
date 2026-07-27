import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const detailRoot =
  'docs/audits/japanese_master_index_v5/official_product_details';
const resolutionRoot =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_identity_resolution';
const duplicateRoot =
  'docs/audits/japanese_master_index_v5/'
  + 'official_product_duplicate_adjudication';
const overlayRoot =
  'docs/audits/japanese_master_index_v5/working_index_overlay';

function json(root, name) {
  return JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
}

function jsonl(root, name) {
  return fs.readFileSync(path.join(root, name), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

test('official product detail evidence is complete and preserved', () => {
  const report = json(
    detailRoot,
    'jpn_v5_official_product_card_detail_report_v1.json',
  );
  const details = jsonl(
    detailRoot,
    'jpn_v5_official_product_card_details_v1.jsonl',
  );
  assert.equal(report.status, 'official_product_card_details_complete');
  assert.equal(report.requested_unique_card_id_count, 255);
  assert.equal(report.reused_v4_official_detail_count, 4);
  assert.equal(report.preserved_or_fetched_detail_count, 255);
  assert.equal(report.numbered_detail_count, 246);
  assert.equal(report.failed_detail_count, 0);
  assert.equal(report.snapshot_origin_live_fetch_count, 251);
  assert.equal(details.length, 255);
  assert.ok(details.every((row) => row.detail.printed_name));
  assert.ok(details.every((row) => row.detail.image_url));
  assert.ok(details.every((row) => row.raw_snapshot_sha256.length === 64));
});

test('live detail snapshots retain exact source hashes', () => {
  const details = jsonl(
    detailRoot,
    'jpn_v5_official_product_card_details_v1.jsonl',
  ).filter((row) => row.evidence_origin === 'live_fetch');
  assert.equal(details.length, 251);
  for (const row of details) {
    const body = fs.readFileSync(row.raw_snapshot_ref);
    assert.equal(
      crypto.createHash('sha256').update(body).digest('hex'),
      row.raw_snapshot_sha256,
    );
  }
});

test('official product identities resolve exact V4 delta', () => {
  const report = json(
    resolutionRoot,
    'jpn_v5_official_product_identity_resolution_report_v1.json',
  );
  const identities = jsonl(
    resolutionRoot,
    'jpn_v5_official_product_identity_delta_v1.jsonl',
  );
  assert.equal(report.official_unique_identity_count, 419);
  assert.equal(report.currently_master_admissible_count, 78);
  assert.equal(report.newly_covered_base_identity_count, 341);
  assert.deepEqual(report.resolution_disposition_counts, {
    duplicate_candidate_cluster_exact_image_review: 114,
    existing_candidate_exact_image_upgrade: 253,
    new_official_identity: 52,
  });
  assert.deepEqual(report.coverage_projection.projected, {
    covered_slots: 8_274,
    expected_slots: 22_085,
    percent: 37.46,
  });
  assert.ok(identities.every((row) =>
    row.base_identity_coverage_resolved));
});

test('all duplicate official-image clusters are evidence-safe', () => {
  const report = json(
    duplicateRoot,
    'jpn_v5_official_product_duplicate_adjudication_report_v1.json',
  );
  const rows = jsonl(
    duplicateRoot,
    'jpn_v5_official_product_duplicate_adjudications_v1.jsonl',
  );
  assert.equal(report.reviewed_cluster_count, 114);
  assert.equal(report.safe_merge_cluster_count, 114);
  assert.equal(report.blocked_cluster_count, 0);
  assert.equal(report.official_product_lane.integration_ready_identity_count, 419);
  assert.ok(rows.every((row) => row.safe_to_merge));
  assert.ok(rows.every((row) => row.blockers.length === 0));
  assert.ok(rows.every((row) =>
    row.candidate_cluster.every((candidate) =>
      candidate.exact_official_image_present)));
});

test('working overlay preserves V4 and adds exact base identities', () => {
  const report = json(
    overlayRoot,
    'jpn_v5_working_index_overlay_report_v1.json',
  );
  const overlay = jsonl(
    overlayRoot,
    'jpn_v5_working_base_identity_overlay_v1.jsonl',
  );
  const supersessions = jsonl(
    overlayRoot,
    'jpn_v5_candidate_supersessions_v1.jsonl',
  );
  assert.equal(report.overlay_identity_count, 419);
  assert.equal(report.newly_covered_base_identity_count, 341);
  assert.equal(report.previously_master_admissible_identity_count, 78);
  assert.equal(report.projected_v5_working_identity_count, 71_910);
  assert.equal(supersessions.length, 248);
  assert.equal(new Set(overlay.map((row) => row.v5_identity_key)).size, 419);
  assert.ok(overlay.every((row) =>
    row.base_identity_coverage_status === 'resolved'));
  assert.equal(report.boundary.v4_artifacts_mutated, false);
  assert.equal(report.boundary.production_writes, false);
});

test('resolution, adjudication, and overlay replay deterministically', () => {
  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), 'jpn-v5-product-resolution-'),
  );
  const runs = [
    {
      script: 'official_product_identity_resolution_v1.mjs',
      root: resolutionRoot,
      fingerprint:
        'jpn_v5_official_product_identity_resolution_fingerprints_v1.json',
    },
    {
      script: 'official_product_duplicate_adjudication_v1.mjs',
      root: duplicateRoot,
      fingerprint:
        'jpn_v5_official_product_duplicate_adjudication_fingerprints_v1.json',
    },
    {
      script: 'working_index_overlay_v1.mjs',
      root: overlayRoot,
      fingerprint:
        'jpn_v5_working_index_overlay_fingerprints_v1.json',
    },
  ];
  try {
    for (const [index, run] of runs.entries()) {
      const replayRoot = path.join(temp, '.tmp', `run_${index}`);
      execFileSync(process.execPath, [
        `scripts/audits/japanese_master_index_v5/${run.script}`,
        `--output-root=${replayRoot}`,
        '--quiet',
      ]);
      assert.deepEqual(
        json(replayRoot, run.fingerprint),
        json(run.root, run.fingerprint),
      );
    }
  } finally {
    fs.rmSync(temp, { force: true, recursive: true });
  }
});

test('resolution lane has no database or storage mutation path', () => {
  for (const name of [
    'official_product_card_detail_harvest_v1.mjs',
    'official_product_identity_resolution_v1.mjs',
    'official_product_duplicate_adjudication_v1.mjs',
    'working_index_overlay_v1.mjs',
  ]) {
    const source = fs.readFileSync(
      `scripts/audits/japanese_master_index_v5/${name}`,
      'utf8',
    );
    assert.doesNotMatch(source, /\b(postgres|supabase|storage)\s*\(/i);
    assert.doesNotMatch(
      source,
      /\b(insert|update|delete|truncate|alter|drop)\b\s+(into|table|from)?/i,
    );
  }
});
