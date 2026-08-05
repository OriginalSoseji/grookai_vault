import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { readVerifiedArtifact } from '../../scripts/audits/japanese_master_index_v4/artifact_rows_v1.mjs';
import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';
import {
  ALLOWED_IMAGE_POINTER_COLUMNS,
  EXPECTED_IMAGE_POINTER_ROWS,
  IMAGE_POINTER_MUTATION_CONTRACT,
  IMAGE_POINTER_PLAN_VERSION,
} from '../../scripts/audits/japanese_master_index_v4/image_pointer_common_v1.mjs';

const LIVE_PLAN =
  'docs/audits/japanese_master_index_v4/image_pointer_plan_v1/'
  + 'jpn_image_pointer_plan_v1.json';
const LIVE_ROLLBACK_PROOF =
  'docs/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1/'
  + 'jpn_image_pointer_rollback_proof_v1.json';
const FROZEN_PLAN = Object.freeze({
  artifact_content_fingerprint_sha256:
    'c7b76859e45afccbd57c579db118a3b1349782fc1c0ab9ad897acae66e47121c',
  package_fingerprint_sha256:
    'e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912',
  pointer_plan_hash_sha256:
    '0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be',
  mutation_contract_hash_sha256:
    '5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9',
  code_bundle_hash_sha256:
    '3fe17f3b06c413246037fc00caff323becd48328d0ed107b1bb002b40f1123c7',
  row_dataset_fingerprint_sha256:
    '5088488f1b9897a2f860b08ec789d7293da29c187474026f40dc324d5f15a0dc',
});

async function loadRows(descriptor) {
  const rows = [];
  for (const shardPath of descriptor.shard_paths) {
    const { artifact } = await readVerifiedArtifact(shardPath);
    rows.push(...artifact.content.rows);
  }
  return rows;
}

test('Japanese pointer contract is exactly 53 rows and three image fields', () => {
  assert.equal(EXPECTED_IMAGE_POINTER_ROWS, 53);
  assert.deepEqual(ALLOWED_IMAGE_POINTER_COLUMNS, [
    'image_note',
    'image_path',
    'image_status',
  ]);
  assert.equal(IMAGE_POINTER_MUTATION_CONTRACT.compare_and_swap, 'complete_to_jsonb_card_prints_row');
  assert.equal(IMAGE_POINTER_MUTATION_CONTRACT.rollback_proof, 'mandatory_before_real_apply_approval');
});

test('pointer planner uses read-only HTTPS calls and has no mutation path', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_pointer_plan_v1.mjs',
    'utf8',
  );
  assert.match(source, /\.from\('card_prints'\)/);
  assert.match(source, /\.select\('\*'\)/);
  assert.match(source, /reverifyStorageAssets/);
  assert.doesNotMatch(source, /\.update\(|\.insert\(|\.upsert\(|\.delete\(/);
  assert.match(source, /database_writes: false/);
  assert.match(source, /storage_writes: false/);
});

test('rollback proof can only update inside a transaction that always rolls back', () => {
  const source = fs.readFileSync(
    'scripts/audits/japanese_master_index_v4/image_pointer_rollback_proof_v1.mjs',
    'utf8',
  );
  assert.match(source, /--execute-rollback-proof/);
  assert.match(source, /Explicit rollback-proof fingerprint or hash mismatch/);
  assert.match(source, /await client\.query\('begin'\)/);
  assert.match(source, /for update/);
  assert.match(source, /update public\.card_prints as cp/);
  assert.match(source, /to_jsonb\(cp\) = \$\$\{beforeParam\}::jsonb/);
  assert.match(source, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(source, /client\.query\('commit'\)/);
  assert.match(source, /durable_database_writes: 0/);
  assert.match(source, /rejectUnauthorized: false/);
  assert.match(source, /pre-auth connection sends no credentials/);
  assert.match(source, /tls\.checkServerIdentity\(descriptor\.host, peer\)/);
  assert.match(source, /SUPABASE_DB_TLS_PINS\.intermediate_sha256/);
  assert.match(source, /SUPABASE_DB_TLS_PINS\.root_sha256/);
  assert.match(source, /leafCertificate\.verify\(intermediateCertificate\.publicKey\)/);
  assert.match(source, /intermediateCertificate\.verify\(rootCertificate\.publicKey\)/);
  assert.match(source, /rejectUnauthorized: true/);
});

test('rollback workflow is manual, bounded, and secret-backed', () => {
  const source = fs.readFileSync(
    '.github/workflows/japanese-v4-image-pointer-rollback-proof.yml',
    'utf8',
  );
  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /^\s+pull_request:/m);
  assert.doesNotMatch(source, /^\s+push:/m);
  assert.doesNotMatch(source, /^\s+schedule:/m);
  assert.match(source, /secrets\.SUPABASE_DB_URL/);
  assert.match(source, /--execute-rollback-proof/);
  assert.match(source, /cancel-in-progress: false/);
});

test('live pointer plan freezes complete snapshots and zero writes', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_PLAN, {
    expectedPackageId: IMAGE_POINTER_PLAN_VERSION,
  });
  assert.equal(
    artifact.content_fingerprint_sha256,
    FROZEN_PLAN.artifact_content_fingerprint_sha256,
  );
  assert.equal(
    artifact.content.package_fingerprint_sha256,
    FROZEN_PLAN.package_fingerprint_sha256,
  );
  assert.equal(
    artifact.content.pointer_plan_hash_sha256,
    FROZEN_PLAN.pointer_plan_hash_sha256,
  );
  assert.equal(
    artifact.content.mutation_contract_hash_sha256,
    FROZEN_PLAN.mutation_contract_hash_sha256,
  );
  assert.equal(
    artifact.content.code_bundle.hash,
    FROZEN_PLAN.code_bundle_hash_sha256,
  );
  assert.equal(
    artifact.content.row_dataset.content_fingerprint_sha256,
    FROZEN_PLAN.row_dataset_fingerprint_sha256,
  );
  assert.equal(artifact.content.status, 'complete_no_write_pointer_plan');
  assert.equal(artifact.content.scope.rows, 53);
  assert.equal(artifact.content.scope.rollback_proof_updates, 53);
  assert.equal(artifact.content.scope.already_applied_no_ops, 0);
  assert.equal(artifact.content.scope.blocked_rows, 0);
  assert.equal(artifact.content.storage_reverification.verified, 53);
  assert.equal(artifact.content.ready_for_rollback_proof, true);
  assert.equal(artifact.content.execution_boundary.database_writes, false);
  assert.equal(artifact.content.execution_boundary.storage_writes, false);
  assert.equal(artifact.content.execution_boundary.durable_changes, 0);
});

test('live pointer rows preserve fallback/source and change only three fields', async () => {
  const { artifact } = await readVerifiedArtifact(LIVE_PLAN);
  const rows = await loadRows(artifact.content.row_dataset);
  assert.equal(rows.length, 53);
  assert.equal(contentFingerprint(rows), artifact.content.row_dataset.content_fingerprint_sha256);
  assert.equal(new Set(rows.map((row) => row.target_row_id)).size, 53);
  for (const row of rows) {
    assert.ok(row.current_row_snapshot);
    assert.ok(row.expected_after_snapshot);
    assert.equal(contentFingerprint(row.current_row_snapshot), row.current_row_snapshot_hash);
    assert.equal(contentFingerprint(row.expected_after_snapshot), row.expected_after_snapshot_hash);
    assert.deepEqual(Object.keys(row.proposed_values).sort(), ALLOWED_IMAGE_POINTER_COLUMNS);
    assert.equal(row.proposed_values.image_path, row.target_storage_path);
    assert.equal(row.proposed_values.image_status, 'exact');
    assert.equal(row.expected_after_snapshot.image_url, row.current_row_snapshot.image_url);
    assert.equal(row.expected_after_snapshot.image_source, row.current_row_snapshot.image_source);
    assert.equal(row.expected_after_snapshot.representative_image_url, row.current_row_snapshot.representative_image_url);
    assert.equal(row.row_disposition, 'rollback_proof_update_required');
    assert.deepEqual(row.validation_errors, []);
  }
});

test('live rollback proof restores all rows and leaves zero durable writes', () => {
  const proof = JSON.parse(fs.readFileSync(LIVE_ROLLBACK_PROOF, 'utf8'));
  const { proof_hash_sha256: proofHash, ...proofPayload } = proof;
  assert.equal(
    proofHash,
    'ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185',
  );
  assert.equal(contentFingerprint(proofPayload), proofHash);
  assert.equal(proof.status, 'rollback_proof_passed_zero_durable_changes');
  assert.equal(proof.package_fingerprint_sha256, FROZEN_PLAN.package_fingerprint_sha256);
  assert.equal(proof.pointer_plan_hash_sha256, FROZEN_PLAN.pointer_plan_hash_sha256);
  assert.equal(proof.mutation_contract_hash_sha256, FROZEN_PLAN.mutation_contract_hash_sha256);
  assert.equal(proof.storage_reverified, 53);
  assert.equal(proof.locked_rows, 53);
  assert.equal(proof.updated_rows_inside_transaction, 53);
  assert.equal(proof.after_rows_verified_inside_transaction, 53);
  assert.equal(proof.rollback_completed, true);
  assert.equal(proof.durable_before_rows_restored, 53);
  assert.equal(proof.durable_database_writes, 0);
  assert.equal(proof.image_pointer_writes_durable, 0);
  assert.equal(proof.storage_writes, 0);
  assert.equal(proof.target_binding.supabase_project_ref, 'ycdxbpibncqcchqiihfz');
  assert.equal(
    proof.target_binding.database.tls_verification,
    'credential_free_manual_chain_validation_then_pinned_ca_reconnect',
  );
});
