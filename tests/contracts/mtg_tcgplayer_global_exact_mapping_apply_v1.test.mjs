import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const SCRIPT = fs.readFileSync(new URL(
  '../../scripts/audits/mtg_tcgplayer_global_exact_mapping_apply_v1.mjs',
  import.meta.url,
), 'utf8');

test('global exact mapping apply binds the exact founder approval and preflight bytes', () => {
  assert.match(SCRIPT, /stableHash\(preflightCore\(receipt\.value\)\)/);
  assert.match(SCRIPT, /receipt\.value\.preflight_fingerprint_sha256, options\.approvalToken/);
  assert.match(SCRIPT, /authorized_preflight_source_commit_invalid/);
  assert.match(SCRIPT, /authorized_preflight_mapping_manifest_changed/);
  assert.match(SCRIPT, /authorized_mapping_snapshot_mismatch/);
  assert.match(SCRIPT, /approval_text_changed/);
  assert.match(SCRIPT, /preflight_artifact_inventory_changed/);
  assert.match(SCRIPT, /approved_selected_rows_changed/);
  assert.match(SCRIPT, /authorized_preflight_approval_artifact_changed/);
  assert.match(SCRIPT, /authorized_preflight_queue_manifest_changed/);
  assert.match(SCRIPT, /authorized_preflight_batch_manifest_changed/);
  assert.match(SCRIPT, /authorized_preflight_batch_rows_changed/);
  assert.match(SCRIPT, /authorized_preflight_decision_changed/);
  assert.doesNotMatch(SCRIPT, /AUTHORIZED_PREFLIGHT_FINGERPRINT/);
  assert.doesNotMatch(SCRIPT, /AUTHORIZED_PREFLIGHT_RECEIPT_SHA256/);
  assert.doesNotMatch(SCRIPT, /AUTHORIZED_SELECTED_ROWS_SHA256/);
  assert.ok(SCRIPT.indexOf('bindAuthorizedPreflight(options, packageData)')
    < SCRIPT.indexOf("new pg.Client(connectionConfig('mtg_global_exact_mapping_apply_v1'))"));
});

test('global exact mapping apply is one bounded 36-row insert-only transaction', () => {
  assert.match(SCRIPT, /const TOTAL_ROWS = 36/);
  assert.match(SCRIPT, /begin transaction isolation level serializable/);
  assert.equal((SCRIPT.match(/assertVerifiedProductionTls\(/g) ?? []).length, 3);
  assert.match(SCRIPT, /pg_advisory_xact_lock\(hashtext\('tcgplayer_market_exact_mapping_apply_v1'\)\)/);
  assert.equal((SCRIPT.match(/insert into public\.external_mappings/g) ?? []).length, 1);
  assert.equal((SCRIPT.match(/client\.query\('commit'\)/g) ?? []).length, 1);
  assert.doesNotMatch(SCRIPT, /\bupdate public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete from public\./i);
  assert.doesNotMatch(SCRIPT, /\binsert into public\.(?!external_mappings)/i);
});

test('global exact mapping apply retains durable rollback and uncertain-commit reconciliation', () => {
  assert.match(SCRIPT, /rollback_plan\.json/);
  assert.match(SCRIPT, /rollback_manifest\.json/);
  assert.match(SCRIPT, /artifact_hashes\.json/);
  assert.match(SCRIPT, /committed_zero_mismatch_readback/);
  assert.match(SCRIPT, /committed_by_independent_readback/);
  assert.match(SCRIPT, /commit_outcome_unknown_requires_operator_readback/);
  assert.match(SCRIPT, /begin transaction isolation level read committed/);
  assert.ok(SCRIPT.indexOf("pg_advisory_xact_lock(hashtext('tcgplayer_market_exact_mapping_apply_v1'))")
    < SCRIPT.indexOf("const mappings = await scopedMappings(readback, rows)"));
  assert.match(SCRIPT, /post_commit_readback_failed/);
  assert.match(SCRIPT, /failed_zero_committed_writes/);
  assert.match(SCRIPT, /pricing_writes: 0/);
  assert.match(SCRIPT, /publication_writes: 0/);
  assert.match(SCRIPT, /vault_writes: 0/);
});
