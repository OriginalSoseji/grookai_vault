import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedImagePointerRepairPlanV1,
  evaluateMtgSealedImagePointerRepairPreflightV1,
  evaluateMtgSealedImagePointerRepairReadbackV1,
  mtgSealedImagePointerRepairProtectedStateFingerprintV1,
  validateMtgSealedImagePointerRepairPlanV1,
} from '../../backend/pricing/mtg_sealed_image_pointer_function_repair_v1.mjs';

const migration = fs.readFileSync(
  'supabase/migrations/20260905040000_sealed_product_image_pointer_conflict_repair_v1.sql',
  'utf8');
const script = fs.readFileSync(
  'scripts/audits/mtg_sealed_image_pointer_function_repair_v1.mjs', 'utf8');

const brokenDefinition = `create function x() returns table(game_key text)
language plpgsql as $$ begin insert into pointer(game_key) values ('mtg')
on conflict (game_key) do update set game_key=excluded.game_key; end $$;`;
const repairedDefinition = brokenDefinition.replace(
  'on conflict (game_key)',
  'on conflict on constraint sealed_product_image_release_pointer_pkey');

function preflight({ repaired = false, ledger = false } = {}) {
  return {
    project_ref: 'ycdxbpibncqcchqiihfz',
    transaction_read_only: true,
    transaction_closed_before_artifacts: true,
    migration_ledger: { count: ledger ? 1 : 0,
      ...(ledger ? { version: '20260905040000',
        name: 'sealed_product_image_pointer_conflict_repair_v1',
        statement_count: 5 } : {}), later_versions: [] },
    pointer_function: { present: true, security_definer: true, volatility: 'v',
      configuration: ['search_path=pg_catalog, public'],
      definition: repaired ? repairedDefinition : brokenDefinition },
    routine_grants: [{ grantee: 'service_role', privilege_type: 'EXECUTE' }],
    pointer: { count: 0, image_release_id: null },
    authority: {
      image_release_id: '86b207e6-4f73-5d9a-af40-864c47256c38',
      image_release_state: 'frozen',
      image_release_manifest:
        '7ef0baf51b75d54d5d52b810634432918303d76c338e6d9152be07beb06d12c2',
      image_release_member_count: 2149,
      price_release_id: '25626032-7d72-5542-a8e0-7a6532c2f776',
      price_release_state: 'frozen',
      price_release_member_count: 2182,
      catalog_visibility: 'signed_in',
      sealed_visibility: 'hidden',
    },
    protected_counts: { card_prints: 10, sets: 2, families: 237,
      variants: 2904, image_evidence: 2182, image_objects: 2141,
      image_assertions: 2149, image_releases: 1,
      image_release_members: 2149, one_piece_price_pointers: 1 },
  };
}

function plan() {
  return buildMtgSealedImagePointerRepairPlanV1({
    repository: { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
      head_sha: 'a'.repeat(40), tracked_worktree_clean: true },
    migrationSql: migration,
    preflight: preflight(),
  });
}

test('migration repairs only the ambiguous constraint target', () => {
  assert.match(migration, /^begin;/m);
  assert.match(migration, /create or replace function public\.sealed_product_set_active_image_release_v1/);
  assert.match(migration,
    /on conflict on constraint sealed_product_image_release_pointer_pkey/i);
  assert.doesNotMatch(migration, /on conflict\s*\(game_key\)/i);
  assert.match(migration, /grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to (anon|authenticated)/i);
  assert.equal((migration.match(/create or replace function/gi) ?? []).length, 1);
  assert.match(migration, /commit;\s*$/i);
});

test('broken production baseline passes repair preflight', () => {
  assert.deepEqual(evaluateMtgSealedImagePointerRepairPreflightV1(preflight()),
    { valid: true, findings: [] });
});

test('preflight fails on pointer, ledger, visibility, or privilege drift', () => {
  const value = preflight();
  value.pointer = { count: 1, image_release_id: 'x' };
  value.migration_ledger.count = 1;
  value.authority.sealed_visibility = 'public';
  value.routine_grants.push({ grantee: 'authenticated',
    privilege_type: 'EXECUTE' });
  const result = evaluateMtgSealedImagePointerRepairPreflightV1(value);
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('migration_ledger_collision'));
  assert.ok(result.findings.includes('routine_grant_drift'));
  assert.ok(result.findings.includes('pointer_not_null'));
  assert.ok(result.findings.includes('visibility_drift'));
});

test('apply plan is deterministic, schema-only, and fingerprinted', () => {
  const left = plan();
  const right = plan();
  assert.equal(left.apply_plan_fingerprint_sha256,
    right.apply_plan_fingerprint_sha256);
  assert.equal(left.boundaries.migration_ledger_rows, 1);
  assert.equal(left.boundaries.function_replacements, 1);
  assert.equal(left.boundaries.pointer_writes, 0);
  assert.deepEqual(validateMtgSealedImagePointerRepairPlanV1(left),
    { valid: true, findings: [] });
  assert.match(left.required_approval_message,
    new RegExp(left.apply_plan_fingerprint_sha256));
});

test('independent repaired readback passes with unchanged protected state', () => {
  const value = plan();
  const readback = preflight({ repaired: true, ledger: true });
  readback.migration_ledger.statement_count = value.migration.statement_count;
  assert.deepEqual(evaluateMtgSealedImagePointerRepairReadbackV1({
    plan: value,
    readback,
    baselineProtectedStateFingerprint:
      mtgSealedImagePointerRepairProtectedStateFingerprintV1(preflight()),
  }).findings, []);
});

test('readback fails on function, pointer, grant, or protected-data drift', () => {
  const value = plan();
  const readback = preflight({ repaired: true, ledger: true });
  readback.migration_ledger.statement_count = value.migration.statement_count;
  readback.pointer = { count: 1, image_release_id: 'x' };
  readback.routine_grants.push({ grantee: 'authenticated',
    privilege_type: 'EXECUTE' });
  readback.protected_counts.variants += 1;
  readback.pointer_function.definition = brokenDefinition;
  const result = evaluateMtgSealedImagePointerRepairReadbackV1({ plan: value,
    readback,
    baselineProtectedStateFingerprint:
      mtgSealedImagePointerRepairProtectedStateFingerprintV1(preflight()) });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes('function_repair_readback_mismatch'));
  assert.ok(result.findings.includes('routine_grant_readback_mismatch'));
  assert.ok(result.findings.includes('pointer_write_detected'));
  assert.ok(result.findings.includes('protected_state_drift'));
});

test('operator requires exact authority and has one guarded commit path', () => {
  assert.match(script, /argument === '--plan'/);
  assert.match(script, /argument === '--rollback-canary'/);
  assert.match(script, /argument === '--apply'/);
  assert.match(script, /expectedPlanFingerprint/);
  assert.match(script, /MTG_SEALED_IMAGE_POINTER_REPAIR_APPROVAL_ENV_V1/);
  assert.match(script, /stripSealedMigrationTransactionWrapperV1/);
  assert.match(script, /insert into supabase_migrations\.schema_migrations/);
  assert.match(script, /durable \? 'commit' : 'rollback'/);
  assert.doesNotMatch(script,
    /select \* from\s+public\.sealed_product_set_active_image_release_v1\(/);
  assert.doesNotMatch(script, /storage\.from|fetch\(/);
});
