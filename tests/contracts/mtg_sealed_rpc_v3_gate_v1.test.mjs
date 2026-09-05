import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  buildMtgSealedRpcV3Plan,
  hashMtgSealedRpcV3,
  MTG_SEALED_RPC_V3_CANDIDATE_SHA256,
  MTG_SEALED_RPC_V3_IMAGE_MANIFEST,
  MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID,
  MTG_SEALED_RPC_V3_MIGRATION_FILENAME,
  MTG_SEALED_RPC_V3_MIGRATION_VERSION,
  MTG_SEALED_RPC_V3_PRICE_RELEASE_ID,
  MTG_SEALED_RPC_V3_SIGNATURE,
  validateMtgSealedRpcV3Preflight,
  validateMtgSealedRpcV3Readback,
} from '../../backend/pricing/mtg_sealed_rpc_v3_gate_v1.mjs';

const candidateSql = fs.readFileSync(
  'docs/sql/mtg_sealed_image_backed_pricing_rpc_v3_migration_candidate.sql',
  'utf8');
const migrationSql = fs.readFileSync(
  `supabase/migrations/${MTG_SEALED_RPC_V3_MIGRATION_FILENAME}`, 'utf8');

const protectedState = Object.freeze({ card_print_count: 170404,
  set_count: 3397, mtg_image_pointer: MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID });

function preflight() {
  return {
    transaction_read_only: 'on',
    transaction_closed_before_artifacts: true,
    project_ref_match: true,
    migration_ledger_count: 0,
    function_present: false,
    missing_prerequisites: [],
    authority: {
      image_release_id: MTG_SEALED_RPC_V3_IMAGE_RELEASE_ID,
      image_manifest: MTG_SEALED_RPC_V3_IMAGE_MANIFEST,
      price_release_id: MTG_SEALED_RPC_V3_PRICE_RELEASE_ID,
      image_release_state: 'frozen',
      price_release_state: 'frozen',
      image_source_price_release_id: MTG_SEALED_RPC_V3_PRICE_RELEASE_ID,
      catalog_visibility: 'signed_in',
      sealed_visibility: 'hidden',
    },
    structural_evidence: { active_price_rows: 2182, image_backed_rows: 2149,
      eligible_rows: 2144, missing_image_rows: 33, noneligible_rows: 38,
      stale_rows: 5 },
    protected_state: protectedState,
  };
}

function repository() {
  return { branch: 'agent/mtg-sealed-image-migration-promotion-v1',
    head_sha: 'a'.repeat(40), tracked_worktree_clean: true };
}

function plan() {
  return buildMtgSealedRpcV3Plan({ repository: repository(), migrationSql,
    candidateSql, preflight: preflight() });
}

test('RPC V3 promotion preserves the immutable reviewed candidate lineage', () => {
  assert.equal(hashMtgSealedRpcV3(candidateSql),
    MTG_SEALED_RPC_V3_CANDIDATE_SHA256);
  assert.equal(MTG_SEALED_RPC_V3_MIGRATION_VERSION, '20260905070000');
  assert.match(migrationSql,
    /create or replace function public\.get_active_sealed_product_pricing_v3/);
  assert.doesNotMatch(migrationSql, /Review artifact only/);
});

test('plan freezes one schema function and one ledger row with zero data writes', () => {
  const value = plan();
  assert.equal(value.target.function_signature, MTG_SEALED_RPC_V3_SIGNATURE);
  assert.equal(value.boundaries.migration_ledger_inserts, 1);
  assert.equal(value.boundaries.function_creates_or_replacements, 1);
  assert.equal(value.boundaries.data_writes, 0);
  assert.equal(value.boundaries.pointer_writes, 0);
  assert.equal(value.boundaries.visibility_writes, 0);
  assert.match(value.apply_plan_fingerprint_sha256, /^[0-9a-f]{64}$/);
});

test('preflight fails closed on authority, visibility, or schema drift', () => {
  const cases = [
    ['migration_ledger_count', 1, 'migration_already_applied'],
    ['function_present', true, 'rpc_v3_already_present'],
  ];
  for (const [field, value, finding] of cases) {
    const fixture = preflight();
    fixture[field] = value;
    assert.ok(validateMtgSealedRpcV3Preflight(fixture).includes(finding));
  }
  const visibility = preflight();
  visibility.authority.sealed_visibility = 'signed_in';
  assert.ok(validateMtgSealedRpcV3Preflight(visibility)
    .includes('visibility_drift'));
  const pointer = preflight();
  pointer.authority.image_release_id = '00000000-0000-0000-0000-000000000000';
  assert.ok(validateMtgSealedRpcV3Preflight(pointer)
    .includes('image_pointer_mismatch'));
});

test('exact readback accepts hidden signed-in behavior and strict grants', () => {
  const value = plan();
  const readback = {
    transaction_read_only: 'on',
    transaction_closed_before_artifacts: true,
    function: { signature: MTG_SEALED_RPC_V3_SIGNATURE, volatility: 's',
      security_definer: true,
      configuration: ['search_path=pg_catalog, public'], public_execute: false,
      anon_execute: false, authenticated_execute: true,
      service_role_execute: true, definition_contract_valid: true },
    ledger: { version: value.migration.version, name: value.migration.name,
      statement_count: value.migration.statement_count },
    behavior: { authenticated_hidden_rows: 0, service_role_hidden_rows: 0,
      anonymous_execute_denied: true },
    structural_evidence: value.structural_evidence,
    protected_state: value.protected_baseline,
  };
  assert.deepEqual(validateMtgSealedRpcV3Readback({ plan: value, readback }), []);
});

test('readback rejects anonymous access, hidden leaks, and protected drift', () => {
  const value = plan();
  const readback = {
    transaction_read_only: 'on', transaction_closed_before_artifacts: true,
    function: { signature: MTG_SEALED_RPC_V3_SIGNATURE, volatility: 's',
      security_definer: true,
      configuration: ['search_path=pg_catalog, public'], public_execute: false,
      anon_execute: true, authenticated_execute: true,
      service_role_execute: true, definition_contract_valid: true },
    ledger: { version: value.migration.version, name: value.migration.name,
      statement_count: value.migration.statement_count },
    behavior: { authenticated_hidden_rows: 1, service_role_hidden_rows: 0,
      anonymous_execute_denied: false },
    structural_evidence: value.structural_evidence,
    protected_state: { ...value.protected_baseline, set_count: 1 },
  };
  const findings = validateMtgSealedRpcV3Readback({ plan: value, readback });
  assert.ok(findings.includes('function_acl_mismatch'));
  assert.ok(findings.includes('authenticated_hidden_visibility_leak'));
  assert.ok(findings.includes('anonymous_execution_not_denied'));
  assert.ok(findings.includes('protected_state_changed'));
});
