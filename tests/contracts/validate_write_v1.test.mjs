import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ContractRuntimeViolationError,
  assertValidContractWriteV1,
  runPostWriteAuditV1,
  validateWriteV1,
} from '../../backend/lib/contracts/validate_write_v1.mjs';

function createFakeLedgerTarget() {
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
                  data: { id: `${tableName}-${inserts.length}` },
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

test('precedence resolution chooses higher-authority identity failure over lower-authority pricing failure', async () => {
  const result = await validateWriteV1({
    execution_name: 'promote_source_backed_justtcg_mapping_v1',
    payload_snapshot: { card_print_id: 'cp-1' },
    contract_assertions: [
      {
        ok: false,
        contract_name: 'PRICING_ENGINE_V1',
        violation_type: 'pricing_conflict',
        reason: 'Lower-precedence pricing conflict.',
      },
      {
        ok: false,
        contract_name: 'IDENTITY_CONTRACT_SUITE_V1',
        violation_type: 'identity_conflict',
        reason: 'Higher-precedence identity conflict.',
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.contract_name, 'IDENTITY_CONTRACT_SUITE_V1');
  assert.equal(result.violation_type, 'identity_conflict');
});

test('missing contract scope hard fails deterministically', async () => {
  const result = await validateWriteV1({
    execution_name: 'missing_execution_scope_v1',
    payload_snapshot: { foo: 'bar' },
  });

  assert.deepEqual(result.ok, false);
  assert.equal(result.contract_name, 'GROOKAI_GUARDRAILS');
  assert.equal(result.violation_type, 'missing_contract_scope');
});

test('quarantine validation routes to both violation ledger and quarantine lane', async () => {
  const ledgerTarget = createFakeLedgerTarget();

  await assert.rejects(
    () =>
      assertValidContractWriteV1({
        execution_name: 'source_image_enrichment_worker_v1',
        payload_snapshot: { card_print_id: 'cp-1', source: 'tcgdex' },
        ledger_target: ledgerTarget,
        source_worker: 'source_image_enrichment_worker_v1',
        source_system: 'images',
        contract_assertions: [
          {
            ok: false,
            contract_name: 'NO_ASSUMPTION_RULE',
            violation_type: 'ambiguous_image_group',
            severity: 'quarantine',
            reason: 'Representative image input remained ambiguous.',
          },
        ],
      }),
    ContractRuntimeViolationError,
  );

  assert.equal(
    ledgerTarget.inserts.filter((entry) => entry.tableName === 'contract_violations').length,
    1,
  );
  assert.equal(
    ledgerTarget.inserts.filter((entry) => entry.tableName === 'quarantine_records').length,
    1,
  );
});

test('post-write proof failure logs deterministic hard-fail evidence', async () => {
  const ledgerTarget = createFakeLedgerTarget();

  await assert.rejects(
    () =>
      runPostWriteAuditV1({
        execution_name: 'gv_id_assignment_worker_v1',
        payload_snapshot: { card_print_id: 'cp-1', planned_gv_id: 'GV-ABC' },
        ledger_target: ledgerTarget,
        source_worker: 'gv_id_assignment_worker_v1',
        source_system: 'warehouse',
        proofs: [
          {
            name: 'gv_id_round_trip',
            contract_name: 'GV_ID_ASSIGNMENT_V1',
            violation_type: 'post_write_gv_id_missing',
            async run() {
              return {
                ok: false,
                reason: 'Round-trip proof could not find the assigned gv_id.',
              };
            },
          },
        ],
      }),
    ContractRuntimeViolationError,
  );

  assert.equal(ledgerTarget.inserts.length, 1);
  assert.equal(ledgerTarget.inserts[0].tableName, 'contract_violations');
  assert.equal(ledgerTarget.inserts[0].row.contract_name, 'GV_ID_ASSIGNMENT_V1');
});
