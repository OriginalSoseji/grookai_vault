import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const operator = fs.readFileSync(
  'scripts/audits/mtg_sealed_world_v1.mjs', 'utf8');
const workflow = fs.readFileSync(
  '.github/workflows/mtg-sealed-world-runner.yml', 'utf8');

test('durable operator is exact-SHA and explicit-apply gated', () => {
  assert.match(operator, /Exact --expected-head-sha is required/);
  assert.match(operator, /Apply requires --execute-durable-apply/);
  assert.match(operator, /Live sealed-world plan fingerprint changed/);
  assert.match(workflow, /test "\$GITHUB_SHA" = "\$EXPECTED_SHA"/);
});

test('operator proves rollback residue and preserves One Piece', () => {
  assert.match(operator, /mtg_sealed_rollback_canary_passed_zero_residue/);
  assert.match(operator, /one_piece_unchanged/);
  assert.match(operator,
    /onePieceAfter\.boundary_sha256 ===\s*onePieceBefore\.boundary_sha256/);
  assert.match(operator, /catalog_release_control_writes: 0/);
  assert.match(operator, /one_piece_writes: 0/);
});

test('operator has no destructive database statements', () => {
  assert.doesNotMatch(operator, /\b(delete from|truncate|drop table)\b/i);
  assert.doesNotMatch(operator, /\bupdate\s+public\./i);
});

test('workflow chains preflight, canary, apply, and readback from one fingerprint', () => {
  assert.match(workflow, /PLAN_FINGERPRINT/);
  assert.match(workflow, /--mode=preflight/);
  assert.match(workflow, /--mode=canary/);
  assert.match(workflow, /--mode=apply/);
  assert.match(workflow, /--mode=readback/);
  assert.match(workflow, /TARGET_MIGRATION: 20260816170000_/);
});
