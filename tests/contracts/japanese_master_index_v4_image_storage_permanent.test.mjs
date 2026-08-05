import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  EXPECTED_PERMANENT_STORAGE_ROWS,
  EXPECTED_SOURCE_LANES,
  IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
} from '../../scripts/audits/japanese_master_index_v4/image_storage_permanent_plan_v1.mjs';

const LIVE_PLAN =
  'docs/audits/japanese_master_index_v4/image_storage_permanent_plan_v1/'
  + 'jpn_image_storage_permanent_plan_v1.json';

async function loadRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  return rows;
}

test('permanent Storage scope is exactly 53 rows across the two frozen lanes', () => {
  assert.equal(EXPECTED_PERMANENT_STORAGE_ROWS, 53);
  assert.deepEqual(EXPECTED_SOURCE_LANES, {
    original_high_resolution_canary: 17,
    deterministic_source_remediation: 36,
  });
});

test('permanent plan generator cannot access Storage or the database', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_storage_permanent_plan_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /\.storage\s*\./);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.match(source, /storage_access: false/);
  assert.match(source, /database_writes: false/);
});

test('permanent apply is fingerprinted, non-overwriting, and failure-atomic', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_storage_permanent_apply_v1.mjs',
    'utf8',
  );
  assert.match(source, /argument === '--apply'/);
  assert.match(source, /Explicit permanent Storage approval fingerprint/);
  assert.match(source, /code bundle changed after plan generation/i);
  assert.match(source, /staged = await Promise\.all\(assets\.map\(fetchSource\)\)/);
  assert.match(source, /existing\.some\(Boolean\)/);
  assert.match(source, /upsert: false/);
  assert.match(source, /downloadAndVerify/);
  assert.match(source, /if \(runError && client && uploadedAssets\.length > 0\)/);
  assert.match(source, /removeAndVerifyAbsent/);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.doesNotMatch(source, /\.from\(['"]card_prints['"]\)/);
});

test('live permanent plan freezes 53 locally verified assets without access', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_PLAN, {
    expectedPackageId: IMAGE_STORAGE_PERMANENT_PLAN_VERSION,
  });
  assert.equal(artifact.content.status, 'permanent_upload_plan_complete_no_storage_access');
  assert.equal(artifact.content.scope.assets, 53);
  assert.deepEqual(artifact.content.scope.source_lanes, EXPECTED_SOURCE_LANES);
  assert.equal(artifact.content.local_cache_readback.verified_rows, 53);
  assert.equal(artifact.content.collision_preflight.planned, true);
  assert.equal(artifact.content.collision_preflight.performed, false);
  assert.equal(artifact.content.ready_for_separate_storage_approval, true);
  assert.equal(artifact.content.execution_boundary.database_reads, false);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.execution_boundary.storage_reads, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
  assert.equal(
    artifact.content_fingerprint_sha256,
    '9f124fc23f7f6dcfcfeb26f0f4a54ec4624eea426f785f124e87be81aa63c5d9',
  );
  assert.equal(
    artifact.content.asset_dataset.content_fingerprint_sha256,
    'c5764e3e530d28009a28c58bd43e2159d9df042d407aff1dc4e8ff303b52d201',
  );
  assert.equal(
    artifact.content.code_bundle.hash,
    '590542fd2abc8710272a9f83410e75ed917556b09de9e2ce8244cd18abcc51e7',
  );
  assert.equal(
    artifact.content.approval_fingerprint_sha256,
    '23da727efaea32b71e3498f9af7ec12b83bed0e43519c55053d4fe2d27ee3b5e',
  );
  assert.equal(
    artifact.content.storage_plan_hash_sha256,
    '79d7744de1db13db6f58c441663e6d03c33f277e35d5d3c7c1a5a5364e59cd59',
  );
});

test('live permanent assets are unique, high resolution, and pointer-excluded', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_PLAN);
  const rows = await loadRows(artifact.content.asset_dataset);
  assert.equal(rows.length, 53);
  assert.equal(contentFingerprint(rows), artifact.content.asset_dataset.content_fingerprint_sha256);
  assert.equal(new Set(rows.map((row) => row.card_print_id)).size, 53);
  assert.equal(new Set(rows.map((row) => row.gv_id)).size, 53);
  assert.equal(new Set(rows.map((row) => row.target_storage_path)).size, 53);
  assert.equal(rows.filter((row) => row.source_lane === 'original_high_resolution_canary').length, 17);
  assert.equal(rows.filter((row) => row.source_lane === 'deterministic_source_remediation').length, 36);
  assert.equal(rows.filter((row) => new URL(row.source_url).hostname === 'www.pokemon-card.com').length, 48);
  assert.equal(rows.filter((row) => new URL(row.source_url).hostname === 'www.serebii.net').length, 5);
  assert.equal(rows.every((row) => row.source_expected.quality_band === 'high'), true);
  assert.equal(rows.every((row) => row.upload_policy.upsert === false), true);
  assert.equal(rows.every((row) => row.upload_policy.overwrite_allowed === false), true);
  assert.equal(rows.every((row) => row.database_pointer_update_allowed === false), true);
  assert.equal(rows.every((row) => row.success_lifecycle === 'upload_readback_verify_and_retain'), true);
});

test('live plan requires full rollback of newly created objects on failure', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_PLAN);
  const policy = artifact.content.execution_policy;
  assert.equal(policy.all_target_objects_must_be_absent_before_first_upload, true);
  assert.equal(policy.existing_target_object_is_hard_stop, true);
  assert.equal(policy.rollback_on_any_failure, true);
  assert.equal(policy.rollback_scope, 'only_objects_created_by_this_execution');
  assert.equal(policy.post_rollback_absence_verification_required, true);
  assert.equal(policy.durable_storage_objects_expected_on_success, 53);
  assert.equal(policy.durable_storage_objects_expected_on_failure, 0);
  assert.equal(policy.database_reads_allowed, false);
  assert.equal(policy.database_writes_allowed, false);
  assert.equal(policy.image_pointer_writes_allowed, false);
});
