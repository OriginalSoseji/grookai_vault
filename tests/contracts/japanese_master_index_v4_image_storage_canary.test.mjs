import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import {
  EXPECTED_STORAGE_CANARY_ROWS,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
  approvalPayload,
  buildStorageCanaryAssets,
  storagePlanHash,
} from '../../scripts/audits/japanese_master_index_v4/image_storage_canary_plan_v1.mjs';

const LIVE_ARTIFACT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_plan_v1/'
  + 'jpn_image_storage_canary_plan_v1.json';
const LIVE_APPLY_RESULT =
  'docs/audits/japanese_master_index_v4/image_storage_canary_apply_v1/'
  + 'jpn_image_storage_canary_apply_v1.json';

function readyRow(index) {
  const sha = String(index).padStart(64, 'a');
  return {
    status: 'ready_for_future_storage_canary',
    canary_position: index,
    card_print_id: `${String(index).padStart(8, '0')}-1111-4111-8111-111111111111`,
    gv_id: `GV-PK-JPN-TEST-${index}`,
    name: `Card ${index}`,
    set_code: 'jpn-test',
    number: String(index),
    source_identity_authority: 'applied_japanese_v4_identity_evidence_pointer',
    selected_source: {
      source_url: `https://www.pokemon-card.com/cards/${index}.jpg`,
      content_type: 'image/jpeg',
      size_bytes: 100_000 + index,
      sha256: sha,
      width: 600,
      height: 825,
      format: 'jpg',
      quality_band: 'high',
    },
    local_cache_path: `.tmp/test/${index}.jpg`,
    local_cache_sha256: sha,
    target_storage_path:
      `warehouse-derived/self-hosted-images-v1/card_prints/jpn-test/`
      + `gv-pk-jpn-test-${index}/${sha.slice(0, 24)}.jpg`,
    visual_identity_reconfirmation: 'not_performed',
  };
}

test('storage canary plan admits exactly 17 high-resolution official assets', () => {
  const rows = Array.from(
    { length: EXPECTED_STORAGE_CANARY_ROWS },
    (_, index) => readyRow(index + 1),
  );
  const assets = buildStorageCanaryAssets(rows);
  assert.equal(assets.length, 17);
  assert.equal(new Set(assets.map((row) => row.card_print_id)).size, 17);
  assert.equal(new Set(assets.map((row) => row.target_storage_path)).size, 17);
  assert.equal(assets.every((row) => !row.upload_policy.upsert), true);
  assert.equal(
    assets.every((row) => row.canary_lifecycle
      === 'upload_readback_then_remove_and_verify_absent'),
    true,
  );
});

test('storage canary rejects low-resolution or non-official assets', () => {
  const rows = Array.from({ length: 17 }, (_, index) => readyRow(index + 1));
  rows[0].selected_source.quality_band = 'low';
  assert.throws(() => buildStorageCanaryAssets(rows), /quality policy/);
  rows[0] = readyRow(1);
  rows[0].selected_source.source_url = 'https://example.test/card.jpg';
  assert.throws(() => buildStorageCanaryAssets(rows), /quality policy/);
});

test('approval fingerprint and plan hash bind target, code, policy, and assets', () => {
  const assets = Array.from({ length: 17 }, (_, index) => readyRow(index + 1));
  const normalized = buildStorageCanaryAssets(assets);
  const payload = approvalPayload(normalized, 'code-hash');
  const fingerprint = contentFingerprint(payload);
  assert.equal(payload.target.supabase_project_ref, TARGET_SUPABASE_PROJECT_REF);
  assert.equal(payload.target.storage_bucket, TARGET_STORAGE_BUCKET);
  assert.equal(payload.execution_policy.durable_storage_objects_expected, 0);
  assert.equal(payload.execution_policy.database_writes_allowed, false);
  assert.equal(
    storagePlanHash(fingerprint, 'code-hash'),
    storagePlanHash(fingerprint, 'code-hash'),
  );
  assert.notEqual(
    storagePlanHash(fingerprint, 'code-hash'),
    storagePlanHash(fingerprint, 'changed-code-hash'),
  );
});

test('plan generator cannot access Storage or the database', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_storage_canary_plan_v1.mjs',
    'utf8',
  );
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /\.storage\s*\./);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.match(source, /storage_access: false/);
  assert.match(source, /database_writes: false/);
});

test('apply runner is fingerprint gated, non-overwriting, and always rolls back', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_storage_canary_apply_v1.mjs',
    'utf8',
  );
  assert.match(source, /argument === '--apply'/);
  assert.match(source, /Explicit Storage approval fingerprint or plan hash mismatch/);
  assert.match(source, /code bundle changed after plan generation/i);
  assert.match(source, /upsert: false/);
  assert.match(source, /finally\s*\{/);
  assert.match(source, /removeAndVerifyAbsent/);
  assert.match(source, /durable_objects_after_run/);
  assert.doesNotMatch(source, /new\s+pg\.Client|withReadOnlyClient/);
  assert.doesNotMatch(source, /\.from\(['"]card_prints['"]\)/);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|merge|truncate)\s+(?:into|from|public\.)/i);
});

test('live Storage plan freezes the exact 17-object approval envelope', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT, {
    expectedPackageId:
      'JPN-MASTER-INDEX-V4-IMAGE-STORAGE-CANARY-PLAN-V1',
  });
  assert.equal(
    artifact.content_fingerprint_sha256,
    '123693d3ef4d7757eacbb6f09c01a949c1096715521112b2050b86e849b57f72',
  );
  assert.equal(artifact.content.status, 'plan_complete_no_storage_access');
  assert.equal(artifact.content.scope.assets, 17);
  assert.equal(
    artifact.content.approval_fingerprint_sha256,
    'ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7',
  );
  assert.equal(
    artifact.content.storage_plan_hash_sha256,
    '0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae',
  );
  assert.equal(
    artifact.content.code_bundle.hash,
    'a83f7296fcee737c2c7ef0d59b870c535e271f071add1c98b61e5c84524d586e',
  );
  assert.equal(artifact.content.local_cache_readback.verified_rows, 17);
  assert.equal(artifact.content.execution_boundary.storage_reads, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
  assert.equal(artifact.content.execution_boundary.database_reads, false);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.ready_for_separate_storage_approval, true);
});

test('live Storage assets verify and preserve transient rollback policy', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_ARTIFACT);
  const rows = [];
  for (const shardPath of artifact.content.asset_dataset.shard_paths) {
    const { artifact: shard } = await readVerifiedArtifact(shardPath);
    rows.push(...shard.content.rows);
  }
  assert.equal(rows.length, 17);
  assert.equal(
    contentFingerprint(rows),
    artifact.content.asset_dataset.content_fingerprint_sha256,
  );
  assert.equal(new Set(rows.map((row) => row.card_print_id)).size, 17);
  assert.equal(new Set(rows.map((row) => row.target_storage_path)).size, 17);
  assert.equal(
    rows.every((row) => row.source_expected.quality_band === 'high'),
    true,
  );
  assert.equal(
    rows.every((row) => row.source_url.startsWith(
      'https://www.pokemon-card.com/',
    )),
    true,
  );
  assert.equal(rows.every((row) => row.upload_policy.upsert === false), true);
  assert.equal(
    rows.every((row) => row.canary_lifecycle
      === 'upload_readback_then_remove_and_verify_absent'),
    true,
  );
  assert.equal(
    rows.every((row) => !row.database_pointer_update_allowed),
    true,
  );
});

test('approved live Storage canary uploaded, verified, and removed all 17 objects', () => {
  const result = JSON.parse(fs.readFileSync(LIVE_APPLY_RESULT, 'utf8'));
  assert.equal(result.status, 'passed_and_rolled_back');
  assert.equal(result.assets_staged, 17);
  assert.equal(result.uploaded, 17);
  assert.equal(result.readback_verified, 17);
  assert.equal(result.removed, 17);
  assert.equal(result.absent_verified, 17);
  assert.equal(result.durable_objects_after_run, 0);
  assert.equal(result.error, null);
});

test('approved live Storage canary preserved its exact authorization and boundaries', () => {
  const result = JSON.parse(fs.readFileSync(LIVE_APPLY_RESULT, 'utf8'));
  assert.equal(
    result.approval_fingerprint_sha256,
    'ef7d4745196a3f670870fa27f7d5b7a4d6609d61beae5889f4d90ea18d8394d7',
  );
  assert.equal(
    result.storage_plan_hash_sha256,
    '0d387055da45e4e1f38cfb2007eb8cb4e175023eb221c6d55391d46d6d6779ae',
  );
  assert.equal(result.target.supabase_project_ref, TARGET_SUPABASE_PROJECT_REF);
  assert.equal(result.target.storage_bucket, TARGET_STORAGE_BUCKET);
  assert.equal(result.database_reads, 0);
  assert.equal(result.database_writes, 0);
  assert.equal(result.image_pointer_writes, 0);
});

test('approved live Storage canary proof hash verifies', () => {
  const result = JSON.parse(fs.readFileSync(LIVE_APPLY_RESULT, 'utf8'));
  const { proof_hash_sha256: proofHash, ...proofPayload } = result;
  assert.equal(contentFingerprint(proofPayload), proofHash);
  assert.equal(
    proofHash,
    '5ef791677e10d1a0643c4add7b25a50fc67bbf9460e8fba68a1e398009f9911a',
  );
});
