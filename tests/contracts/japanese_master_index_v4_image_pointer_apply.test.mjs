import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { contentFingerprint } from '../../scripts/audits/japanese_master_index_v4/deterministic_artifact_v1.mjs';

const APPLY_SCRIPT =
  'scripts/audits/japanese_master_index_v4/image_pointer_apply_v1.mjs';
const DB_SCRIPT =
  'scripts/audits/japanese_master_index_v4/image_pointer_apply_db_v1.mjs';
const RETIRED_WORKFLOW =
  '.github/workflows/japanese-v4-image-pointer-approved-apply.yml';
const APPLY_RESULT =
  'docs/audits/japanese_master_index_v4/image_pointer_apply_v1/'
  + 'jpn_image_pointer_apply_v1.json';
const INDEPENDENT_READBACK =
  'docs/audits/japanese_master_index_v4/image_pointer_apply_v1/'
  + 'jpn_image_pointer_apply_independent_readback_v1.json';

function fileSha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

test('durable apply is plan-only by default and performs no access', () => {
  const result = spawnSync(process.execPath, [APPLY_SCRIPT], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.mode, 'plan_only');
  assert.equal(output.rows, 53);
  assert.equal(output.database_access_performed, false);
  assert.equal(output.storage_access_performed, false);
  assert.equal(
    output.fingerprint,
    'e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912',
  );
});

test('durable apply requires exact approval and rollback proof hashes', () => {
  const source = fs.readFileSync(APPLY_SCRIPT, 'utf8');
  assert.match(source, /argument === '--apply'/);
  assert.match(source, /Explicit durable-apply fingerprint or hash mismatch/);
  assert.match(source, /REQUIRED_ROLLBACK_PROOF_HASH/);
  assert.match(source, /rollback_proof_passed_zero_durable_changes/);
  assert.match(source, /durable_database_writes !== 0/);
});

test('durable apply locks and verifies all rows before the first update', () => {
  const source = fs.readFileSync(APPLY_SCRIPT, 'utf8');
  const lockIndex = source.indexOf('selectSnapshots(client, pointerRows, true)');
  const beforeIndex = source.indexOf('beforeRowsVerified = countMatchingSnapshots');
  const updateIndex = source.indexOf('await guardedUpdate(client, row)');
  assert.ok(lockIndex >= 0);
  assert.ok(beforeIndex > lockIndex);
  assert.ok(updateIndex > beforeIndex);
  assert.match(source, /Locked-row count mismatch/);
  assert.match(source, /Complete-row preflight drift/);
  assert.match(source, /to_jsonb\(cp\) = \$\$\{beforeParam\}::jsonb/);
});

test('durable apply commits only after expected-after readback and verifies durability', () => {
  const source = fs.readFileSync(APPLY_SCRIPT, 'utf8');
  const afterIndex = source.indexOf('afterRowsVerified = countMatchingSnapshots');
  const commitIndex = source.indexOf("await client.query('commit')");
  const durableIndex = source.indexOf('durableAfterRowsVerified = countMatchingSnapshots');
  assert.ok(afterIndex >= 0);
  assert.ok(commitIndex > afterIndex);
  assert.ok(durableIndex > commitIndex);
  assert.match(source, /await client\.query\('rollback'\)/);
  assert.doesNotMatch(source, /\b(delete|truncate)\s+(from\s+)?public\.card_prints\b/i);
});

test('durable apply changes only the three frozen image columns', () => {
  const source = fs.readFileSync(APPLY_SCRIPT, 'utf8');
  assert.match(source, /ALLOWED_IMAGE_POINTER_COLUMNS/);
  assert.match(source, /Unsupported proposed column set/);
  assert.match(source, /update public\.card_prints as cp/);
  assert.doesNotMatch(source, /\.(insert|upsert|delete)\(/);
});

test('apply database connector manually verifies bootstrap then enforces TLS', () => {
  const source = fs.readFileSync(DB_SCRIPT, 'utf8');
  assert.match(source, /No credentials are sent on this bootstrap connection/);
  assert.match(source, /tls\.checkServerIdentity\(descriptor\.host, peer\)/);
  assert.match(source, /leafCertificate\.verify\(intermediateCertificate\.publicKey\)/);
  assert.match(source, /intermediateCertificate\.verify\(rootCertificate\.publicKey\)/);
  assert.match(source, /rejectUnauthorized: false/);
  assert.match(source, /rejectUnauthorized: true/);
});

test('approved implementation remains pinned and one-shot workflow is retired', () => {
  assert.equal(
    fileSha256(DB_SCRIPT),
    '5af461261264dd78d55b8bcc66dee0decab71fe71964e86530fde907d7bb4c69',
  );
  assert.equal(
    fileSha256(APPLY_SCRIPT),
    '5e5dac562334057e81611c12807de3534ea423cfb3e5ecb769cb38a275569d32',
  );
  assert.equal(fs.existsSync(RETIRED_WORKFLOW), false);
});

test('durable apply proof records the exact approved 53-row commit', () => {
  const result = JSON.parse(fs.readFileSync(APPLY_RESULT, 'utf8'));
  const { proof_hash_sha256: proofHash, ...payload } = result;
  assert.equal(
    proofHash,
    'e7392884f42b618000495fbdd181c0eec220e66201cec50bc20f54b1d074dbbb',
  );
  assert.equal(contentFingerprint(payload), proofHash);
  assert.equal(result.status, 'applied_and_durably_verified');
  assert.equal(result.storage_reverified, 53);
  assert.equal(result.locked_rows, 53);
  assert.equal(result.before_rows_verified, 53);
  assert.equal(result.updated_rows, 53);
  assert.equal(result.after_rows_verified_inside_transaction, 53);
  assert.equal(result.commit_completed, true);
  assert.equal(result.durable_after_rows_verified, 53);
  assert.equal(result.durable_database_writes, 53);
  assert.equal(result.storage_writes, 0);
  assert.deepEqual(result.allowed_columns, [
    'image_note',
    'image_path',
    'image_status',
  ]);
});

test('independent HTTPS readback matches every frozen expected-after row', () => {
  const readback = JSON.parse(fs.readFileSync(INDEPENDENT_READBACK, 'utf8'));
  assert.equal(readback.status, 'complete_exact_readback');
  assert.equal(readback.rows, 53);
  assert.equal(readback.expected_after_hash_matches, 53);
  assert.equal(readback.exact_hosted_paths, 53);
  assert.equal(readback.preserved_fallback_source_and_representative, 53);
  assert.equal(readback.database_writes, false);
});
