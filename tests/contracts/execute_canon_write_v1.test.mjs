import test from 'node:test';
import assert from 'node:assert/strict';

import {
  executeCanonWriteV1,
} from '../../backend/lib/contracts/execute_canon_write_v1.mjs';

function createFakeSupabaseLedgerTarget() {
  const inserts = [];
  return {
    inserts,
    from(tableName) {
      return {
        insert(row) {
          inserts.push({ tableName, row });
          return {
            select() {
              return {
                single: async () => ({
                  data: { id: `${tableName}-${inserts.length}`, created_at: '2026-04-23T00:00:00.000Z' },
                  error: null,
                }),
              };
            },
          };
        },
      };
    },
  };
}

function createFakePgTarget() {
  const calls = [];
  return {
    calls,
    async query(sql) {
      calls.push(String(sql).trim().toLowerCase());
      if (String(sql).toLowerCase().startsWith('insert into public.contract_violations')) {
        return { rows: [{ id: `contract-violation-${calls.length}` }] };
      }
      if (String(sql).toLowerCase().startsWith('insert into public.quarantine_records')) {
        return { rows: [{ id: `quarantine-${calls.length}` }] };
      }
      return { rows: [] };
    },
  };
}

test('executeCanonWriteV1 fails closed when scope is missing', async () => {
  const ledgerTarget = createFakeSupabaseLedgerTarget();

  const result = await executeCanonWriteV1({
    execution_name: 'missing_execution_scope_v1',
    payload_snapshot: { foo: 'bar' },
    ledger_target: ledgerTarget,
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, 'scope');
  assert.equal(result.failure_type, 'hard_fail');
  assert.match(result.reason, /No contract scope is registered/);
  assert.equal(ledgerTarget.inserts.filter((entry) => entry.tableName === 'contract_violations').length, 1);
});

test('executeCanonWriteV1 routes quarantine validation failures into both evidence lanes', async () => {
  const ledgerTarget = createFakeSupabaseLedgerTarget();

  const result = await executeCanonWriteV1({
    execution_name: 'source_image_enrichment_worker_v1',
    payload_snapshot: { card_print_id: 'cp-1' },
    ledger_target: ledgerTarget,
    contract_assertions: [
      {
        ok: false,
        contract_name: 'NO_ASSUMPTION_RULE',
        violation_type: 'ambiguous_image_group',
        severity: 'quarantine',
        reason: 'Representative image input remained ambiguous.',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, 'validation');
  assert.equal(result.failure_type, 'quarantine');
  assert.equal(ledgerTarget.inserts.filter((entry) => entry.tableName === 'contract_violations').length, 1);
  assert.equal(ledgerTarget.inserts.filter((entry) => entry.tableName === 'quarantine_records').length, 1);
});

test('executeCanonWriteV1 rolls back managed transactional writes when post-write proof fails', async () => {
  const target = createFakePgTarget();

  const result = await executeCanonWriteV1({
    execution_name: 'external_discovery_to_warehouse_bridge_v1',
    payload_snapshot: { candidate_id: 'candidate-1' },
    write_target: target,
    audit_target: target,
    ledger_target: target,
    transaction_control: 'managed',
    write: async () => {},
    proofs: [
      {
        name: 'forced_failure',
        contract_name: 'INGESTION_PIPELINE_CONTRACT_V1',
        violation_type: 'post_write_candidate_missing',
        async run() {
          return { ok: false, reason: 'forced proof failure' };
        },
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.stage, 'post_write_proof');
  assert.equal(result.failure_type, 'hard_fail');
  assert.match(result.reason, /forced proof failure/);
  assert.equal(target.calls.includes('begin'), true);
  assert.equal(target.calls.includes('rollback'), true);
  assert.equal(target.calls.includes('commit'), false);
});

test('executeCanonWriteV1 succeeds for compensated non-transactional writes when proofs pass', async () => {
  const ledgerTarget = createFakeSupabaseLedgerTarget();
  let wrote = false;

  const result = await executeCanonWriteV1({
    execution_name: 'printing_upsert_v1',
    payload_snapshot: {
      card_print_id: 'cp-1',
      finish_key: 'normal',
      dry_run: false,
    },
    write_target: ledgerTarget,
    audit_target: ledgerTarget,
    ledger_target: ledgerTarget,
    transaction_control: 'none',
    contract_assertions: [
      {
        ok: true,
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'missing_card_print_id',
        reason: 'unused',
      },
      {
        ok: true,
        contract_name: 'IDENTITY_CONTRACT_SUITE_V1',
        violation_type: 'unsupported_finish_key',
        reason: 'unused',
      },
    ],
    async write() {
      wrote = true;
    },
    proofs: [
      {
        name: 'round_trip',
        contract_name: 'CARD_PRINT_IDENTITY_SUBSYSTEM_CONTRACT_V1',
        violation_type: 'post_write_printing_missing',
        async run() {
          return { ok: true };
        },
      },
    ],
  });

  assert.deepEqual(result, { ok: true, proof_passed: true });
  assert.equal(wrote, true);
});
