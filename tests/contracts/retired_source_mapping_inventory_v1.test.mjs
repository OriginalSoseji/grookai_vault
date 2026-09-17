import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getContractScopeV1 } from '../../backend/lib/contracts/contract_scope_v1.mjs';
import { getCanonWriteExecutionPolicyV1 } from '../../backend/lib/contracts/execute_canon_write_v1.mjs';
import { POST_WRITE_PROOF_MODES_V1 } from '../../backend/lib/contracts/run_post_write_proofs_v1.mjs';
import { CONTRACT_RUNTIME_CATALOG_V1 } from '../../backend/lib/contracts/runtime_contract_catalog_v1.mjs';
import { validateWriteV1 } from '../../backend/lib/contracts/validate_write_v1.mjs';
import { loadRuntimeWritePathAuditRowsV1, runRuntimeHealthChecksV1 } from '../../scripts/contracts/runtime_automation_v1.mjs';

const name = 'promote_source_backed_justtcg_mapping_v1';
const source = `backend/pricing/${name}.mjs`;

test('retired source mapping cannot advertise scope, write policy or post-write proof coverage', async () => {
  assert.equal(getContractScopeV1(name), null);
  assert.equal(getCanonWriteExecutionPolicyV1(name), null);
  assert.equal(POST_WRITE_PROOF_MODES_V1[name], undefined);
  const validation = await validateWriteV1({ execution_name: name, payload_snapshot: {} });
  assert.equal(validation.ok, false);
  assert.equal(validation.violation_type, 'missing_contract_scope');
  for (const contract of Object.values(CONTRACT_RUNTIME_CATALOG_V1)) {
    assert.ok(!contract.enforcement_points?.worker?.includes(source));
  }
});

test('worker discovery describes only review output, not an apply or database writer', async () => {
  const workers = JSON.parse(await readFile(new URL('../../docs/playbooks/PRIZE_PACK_WORKER_INDEX_V1.json', import.meta.url), 'utf8'));
  const worker = workers.find(row => row.name === name);
  assert.ok(worker);
  assert.equal(worker.type, 'read');
  assert.equal(worker.writes_db, false);
  assert.ok(!worker.inputs.includes('--apply'));
  assert.ok(!worker.outputs.includes('external_mappings'));
});

test('actual runtime inventory classifies the former writer as review-only and remains consistent', async () => {
  const rows = await loadRuntimeWritePathAuditRowsV1();
  const row = rows.find(row => row.path_name === name);
  assert.ok(row);
  assert.equal(row.canon_affecting, false);
  assert.equal(row.runtime_status, 'review_only');
  assert.equal(row.post_write_proof, false);
  const report = await runRuntimeHealthChecksV1();
  assert.equal(report.ok, true, JSON.stringify(report));
  assert.equal(report.summary.failed_checks, 0);
});
