import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const AUDIT_DIR = path.join(ROOT, 'docs', 'audits');

async function readJson(name) {
  return JSON.parse(await fs.readFile(path.join(AUDIT_DIR, name), 'utf8'));
}

test('Professor Program repair routing reuses existing parents and keeps the finish conflict held', async () => {
  const report = await readJson('tcgplayer_professor_program_repair_routing_20261031_v1.json');
  assert.equal(report.audit_only, true);
  assert.equal(report.durable_db_writes_performed, false);
  assert.equal(report.summary.rows, 8);
  assert.deepEqual(report.summary.by_route, {
    blocked_existing_parent_finish_conflict: 1,
    ready_existing_parent_modifier_repair: 3,
    ready_parent_identity_child_insert: 3,
    ready_tcgplayer_mapping: 1,
  });
  const sycamore = report.rows.find((row) => row.source_product_id === '176638');
  assert.equal(sycamore.route, 'blocked_existing_parent_finish_conflict');
  assert.deepEqual(sycamore.blockers, ['source_finish_child_missing_on_professor_program_parent']);
  const judge = report.rows.find((row) => row.source_product_id === '213516');
  assert.equal(judge.route, 'ready_tcgplayer_mapping');
  assert.equal(judge.target_parent_id, 'ea08d28d-8267-4db9-859c-64ffd048792f');
});

test('Professor Program catalog dry run proves rollback and contains no mapping or pricing writes', async () => {
  const report = await readJson('tcgplayer_professor_program_catalog_repair_guarded_dry_run_20261031_v1.json');
  assert.equal(report.rollback_only, true);
  assert.equal(report.durable_db_writes_performed, false);
  assert.equal(report.mapping_writes_performed, false);
  assert.equal(report.pricing_writes_performed, false);
  assert.equal(report.execution.rollback_verified, true);
  assert.equal(report.execution.transient_change_verified, true);
  assert.equal(report.execution.before_snapshot.hash_sha256, report.execution.after_snapshot.hash_sha256);
  assert.deepEqual(report.execution.simulated_write_counts, {
    parent_inserts: 3,
    identity_inserts: 3,
    child_inserts: 3,
    modifier_updates: 3,
    mapping_writes: 0,
    pricing_writes: 0,
    deletes: 0,
    merges: 0,
  });
  assert.deepEqual(report.targets.map((row) => row.source_product_id), [
    '176629', '176630', '176631', '176632', '176633', '499366',
  ]);
  assert.ok(report.recommended_real_apply_approval_text.includes(report.package_fingerprint_sha256));
  assert.match(report.recommended_real_apply_approval_text, /No mapping writes\. No pricing writes\./);
});
