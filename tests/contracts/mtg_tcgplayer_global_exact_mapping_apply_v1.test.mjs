import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const SCRIPT = fs.readFileSync(new URL(
  '../../scripts/audits/mtg_tcgplayer_global_exact_mapping_apply_v1.mjs',
  import.meta.url,
), 'utf8');

test('global exact mapping apply binds the exact founder approval and preflight bytes', () => {
  assert.match(SCRIPT, /bb923161c47d582334a564894436802ab7b5df9a/);
  assert.match(SCRIPT, /f0b5a8df70331fbc4317125ca53a3c133614739d86603fbe286d1464d0697b7c/);
  assert.match(SCRIPT, /97cca525c64f868da34019e0f9713d38e17b62e8280af92e32588adb8697d087/);
  assert.match(SCRIPT, /a3591eb1-7e55-48ac-8996-b36afdd0d3df/);
  assert.match(SCRIPT, /f74968d88caa22f8e811b5928e9faea27a0c487e550283aaf722dbe88730d2fb/);
  assert.match(SCRIPT, /9ce81ed274585dfc3d3cc10dd02db069ce0d5de212deedf4693dfe7815a961f9/);
  assert.match(SCRIPT, /approval_text_changed/);
  assert.match(SCRIPT, /preflight_artifact_inventory_changed/);
  assert.match(SCRIPT, /approved_selected_rows_changed/);
  assert.match(SCRIPT, /authorized_preflight_approval_artifact_changed/);
  assert.match(SCRIPT, /authorized_preflight_queue_manifest_changed/);
  assert.match(SCRIPT, /authorized_preflight_batch_manifest_changed/);
  assert.match(SCRIPT, /authorized_preflight_batch_rows_changed/);
  assert.match(SCRIPT, /authorized_preflight_decision_changed/);
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
