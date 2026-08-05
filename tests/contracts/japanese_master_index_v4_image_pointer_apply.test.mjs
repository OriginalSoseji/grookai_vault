import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const APPLY_SCRIPT =
  'scripts/audits/japanese_master_index_v4/image_pointer_apply_v1.mjs';
const DB_SCRIPT =
  'scripts/audits/japanese_master_index_v4/image_pointer_apply_db_v1.mjs';
const WORKFLOW =
  '.github/workflows/japanese-v4-image-pointer-approved-apply.yml';

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

test('approved apply workflow is one-shot, branch-bound, and implementation-pinned', () => {
  const source = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(source, /pull_request:/);
  assert.match(source, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(source, /github\.head_ref == 'catalog\/jpn-v4-production-integration-v2'/);
  assert.doesNotMatch(source, /^\s+push:/m);
  assert.doesNotMatch(source, /^\s+schedule:/m);
  assert.match(source, /5af461261264dd78d55b8bcc66dee0decab71fe71964e86530fde907d7bb4c69/);
  assert.match(source, /5e5dac562334057e81611c12807de3534ea423cfb3e5ecb769cb38a275569d32/);
  assert.match(source, /e76ecd6f12ad5c1a1a1f6836d54c34d527e4688f43d5196331aed31da93df912/);
  assert.match(source, /0600e0de392dcf714b5a3450a6f05fd739e6b32092e9e46883c747c56bacf5be/);
  assert.match(source, /5f103aaabda1f04533426e6695b367460c29483e694b5909e233c6529778e6f9/);
  assert.match(source, /ce3dbf33ba7d1cdb247269a8081ac1f31e0572fdfbf5a1322271baa36bcbe185/);
});
