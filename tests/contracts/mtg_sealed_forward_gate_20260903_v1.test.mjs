import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const auditRoot = path.resolve(
  'docs/audits/pricing/mtg_sealed_world_v1');
const manifest = JSON.parse(fs.readFileSync(path.join(
  auditRoot, '2026-09-03_ARTIFACT_HASHES.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(
  auditRoot,
  '2026-09-03T12-46-09Z_plan_33757112453/summary.json'), 'utf8'));
const playbook = fs.readFileSync(
  'docs/ops/GROOKAI_OPERATOR_PLAYBOOK_V1.md', 'utf8');

function sha256(filePath) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex');
}

test('MTG sealed forward gate artifacts retain exact hashes', () => {
  assert.equal(manifest.hash_algorithm, 'sha256');
  assert.equal(manifest.producer_commit_sha,
    '515ce390f4c0c47383a5e59d7b0c65d7e778c05d');
  for (const artifact of manifest.files) {
    const filePath = path.join(auditRoot, artifact.path);
    assert.equal(fs.statSync(filePath).size, artifact.bytes, artifact.path);
    assert.equal(sha256(filePath), artifact.sha256, artifact.path);
  }
});

test('frozen live plan preserves counts and zero-write boundaries', () => {
  assert.equal(summary.status, 'mtg_sealed_world_plan_frozen');
  assert.equal(summary.plan_fingerprint_sha256,
    'ed336dd1cbf442f1788a9d889d3b3d2b5a643e5f1c3b9cb39220f129542b8bae');
  assert.equal(summary.counts.families, 237);
  assert.equal(summary.counts.variants, 2904);
  assert.equal(summary.counts.members, 2182);
  assert.deepEqual(summary.boundaries, {
    card_writes: 0,
    storage_writes: 0,
    vault_writes: 0,
    catalog_release_control_writes: 0,
    one_piece_writes: 0,
    anonymous_visibility: false,
    authenticated_visibility_before_catalog_release: false,
  });
});

test('only the forward-ordered migration remains active', () => {
  const active = path.resolve(
    'supabase/migrations/20260903130000_sealed_product_per_game_release_v2.sql');
  const old = path.resolve(
    'supabase/migrations/20260816170000_sealed_product_per_game_release_v2.sql');
  assert.equal(fs.existsSync(old), false);
  assert.equal(sha256(active),
    '630463aa7af959d9e885423baa5fda948a759c0263a92805c8318828743ca0a6');
});

test('operator playbook exposes the exact gated MTG sealed workflow', () => {
  assert.match(playbook,
    /PRICING_CHECKPOINT_102_MTG_SEALED_DURABLE_APPLIED\.md/);
  assert.doesNotMatch(playbook,
    /PRICING_CHECKPOINT_101_MTG_SEALED_DURABLE_APPLY_READY\.md/);
  assert.match(playbook, /Steps 1-13 are complete/);
  assert.match(playbook, /single-use `apply` authority[^.]+is consumed/);
  assert.match(playbook, /Do not dispatch `apply`\s+again/);
  assert.match(playbook, /mtg-sealed-world-runner\.yml/);
  for (const operation of [
    'migration_dry_run', 'migration_apply', 'plan', 'preflight',
    'rollback_canary', 'apply', 'readback',
  ]) {
    assert.match(playbook, new RegExp(`\\b${operation}\\b`));
  }
  assert.match(playbook, /Never use `--include-all`/);
});
