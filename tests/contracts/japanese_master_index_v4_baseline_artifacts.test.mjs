import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  contentFingerprint,
  sha256,
} from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  readVerifiedArtifact,
} from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';

const ROOT = path.resolve('docs/audits/japanese_master_index_v4/baseline');

function readArtifact(filename) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filename), 'utf8'));
}

test('Japanese baseline reproduces the frozen live graph counts', () => {
  const artifact = readArtifact('live_jpn_parent_summary_v1.json');
  const { counts, plan_baseline_drift: drift } = artifact.content;

  assert.equal(counts.jpn_parent_rows, 26_047);
  assert.equal(counts.public_jpn_gv_ids, 25_985);
  assert.equal(counts.active_jpn_identities, 25_953);
  assert.equal(counts.jpn_child_printings, 25_953);
  assert.equal(counts.raw_set_codes, 504);
  assert.equal(counts.case_folded_set_codes, 388);
  assert.equal(counts.case_only_alias_groups, 116);
  assert.equal(counts.source_placeholder_sets, 45);
  assert.equal(counts.cards_in_source_placeholder_sets, 1_297);
  assert.equal(counts.no_public_gv_or_image_rows, 62);
  assert.equal(counts.no_active_identity_or_evidence_rows, 94);
  assert.ok(Object.values(drift).every((item) => item.matches));
});

test('every Japanese identity gap and private shell is individually classified', () => {
  const artifact = readArtifact('live_jpn_identity_gap_queue_v1.json');
  const gaps = artifact.content;

  assert.equal(gaps.identity_or_evidence_gaps.length, 94);
  assert.equal(gaps.private_or_no_image_rows.length, 62);
  assert.equal(gaps.classification_counts.superseded_duplicate_shell, 62);
  assert.equal(
    gaps.classification_counts.new_set_release_identity_or_evidence_pending,
    32,
  );
  assert.equal(gaps.unresolved_unclassified_count, 0);
  assert.ok(gaps.identity_or_evidence_gaps.every((row) => row.classification));
  assert.ok(gaps.private_or_no_image_rows.every((row) => row.classification));
});

test('source coverage accounts for every Japanese parent row', () => {
  const artifact = readArtifact('live_jpn_source_coverage_v1.json');
  const distribution = artifact.content.stored_lane_distribution;
  const accountedParents = distribution.reduce(
    (sum, row) => sum + row.parent_rows,
    0,
  );

  assert.equal(accountedParents, 26_047);
  assert.equal(distribution.find((row) => row.stored_lane_count === 0)?.parent_rows, 94);
  assert.equal(artifact.content.sources.length, 8);
});

test('English family freeze includes species and English relationship facts', () => {
  const artifact = readArtifact('english_family_reference_fingerprint_v1.json');
  const freeze = artifact.content;

  assert.ok(freeze.active_species_count > 1_000);
  assert.ok(freeze.active_english_species_link_count > 19_000);
  assert.match(freeze.combined_fingerprint_sha256, /^[a-f0-9]{64}$/);
});

test('row baseline freezes every Japanese graph lane and the English family reference', async () => {
  const artifact = readArtifact('live_jpn_row_baseline_manifest_v1.json');
  const datasets = Object.fromEntries(
    artifact.content.datasets.map((dataset) => [dataset.dataset_key, dataset]),
  );

  assert.equal(datasets.live_jpn_parent_rows_v1.row_count, 26_047);
  assert.equal(datasets.live_jpn_identity_rows_v1.row_count, 26_015);
  assert.equal(datasets.live_jpn_evidence_rows_v1.row_count, 116_589);
  assert.equal(datasets.live_jpn_printing_rows_v1.row_count, 25_953);
  assert.equal(datasets.live_jpn_family_review_rows_v1.row_count, 28_161);
  assert.equal(datasets.live_jpn_species_link_rows_v1.row_count, 19_678);
  assert.equal(datasets.language_agnostic_species_rows_v1.row_count, 1_025);
  assert.equal(datasets.english_family_card_rows_v1.row_count, 19_194);
  assert.equal(datasets.english_family_species_link_rows_v1.row_count, 19_346);

  for (const dataset of Object.values(datasets)) {
    assert.match(dataset.content_fingerprint_sha256, /^[a-f0-9]{64}$/);
    assert.equal(dataset.shard_paths.length, dataset.shard_count);

    let shardRows = 0;
    for (const shardPath of dataset.shard_paths) {
      const { artifact: shard } = await readVerifiedArtifact(shardPath);
      assert.equal(shard.content.dataset_key, dataset.dataset_key);
      assert.equal(
        contentFingerprint(shard.content),
        shard.content_fingerprint_sha256,
        shardPath,
      );
      shardRows += shard.content.row_count;
    }
    assert.equal(shardRows, dataset.row_count, dataset.dataset_key);
  }
});

test('every baseline artifact content fingerprint and manifest file hash verifies', () => {
  const manifest = readArtifact('live_jpn_baseline_manifest_v1.json');

  for (const record of manifest.content.artifacts) {
    const absolutePath = path.resolve(record.path);
    const bytes = fs.readFileSync(absolutePath);
    assert.equal(bytes.length, record.bytes, record.path);
    assert.equal(sha256(bytes), record.sha256, record.path);
  }

  for (const filename of [
    'live_jpn_parent_summary_v1.json',
    'live_jpn_source_coverage_v1.json',
    'live_jpn_set_code_inventory_v1.json',
    'live_jpn_identity_gap_queue_v1.json',
    'english_family_reference_fingerprint_v1.json',
    'live_jpn_source_manifest_v1.json',
    'live_jpn_row_baseline_manifest_v1.json',
  ]) {
    const artifact = readArtifact(filename);
    assert.equal(
      contentFingerprint(artifact.content),
      artifact.content_fingerprint_sha256,
      filename,
    );
  }
});

test('baseline artifacts contain no database credentials or mutation package', () => {
  const files = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const combined = files
    .map((filename) => fs.readFileSync(path.join(ROOT, filename), 'utf8'))
    .join('\n');

  assert.doesNotMatch(combined, /postgres(?:ql)?:\/\//i);
  const prohibitedSupabaseKeyPattern = new RegExp(
    `SUPABASE_(?:DB_URL|SECRET_KEY|SERVICE_${"ROLE_KEY"})`,
  );
  assert.doesNotMatch(combined, prohibitedSupabaseKeyPattern);
  assert.doesNotMatch(combined, /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/);
  assert.equal(files.some((filename) => /\.(?:sql|psql)$/i.test(filename)), false);
  assert.equal(files.some((filename) => /(?:apply|migration|writer)/i.test(filename)), false);
});
