import assert from 'node:assert/strict';
import { pokemonSealedHashV1 as hash } from './pokemon_sealed_world_v1.mjs';
import { assertPokemonSealedAdditiveScopeV1, executePokemonSealedAdditiveCatalogV1,
  verifyPokemonSealedAdditiveReadbackV1, verifyPokemonSealedAdditiveAbsentV1 } from './pokemon_sealed_additive_catalog_v1.mjs';

export const POKEMON_SEALED_ADDITIVE_EXECUTION_V1 = 'POKEMON_SEALED_ADDITIVE_EXECUTION_V1';
export const POKEMON_SEALED_PROJECT_REF = 'ycdxbpibncqcchqiihfz';

export function assertPokemonSealedCanaryReceiptV1(receipt, expectedHash, plan, head) {
  assert.equal(hash(receipt), expectedHash, 'Canary receipt hash mismatch');
  assert.equal(receipt.version, POKEMON_SEALED_ADDITIVE_EXECUTION_V1);
  assert.equal(receipt.project_ref, POKEMON_SEALED_PROJECT_REF);
  assert.equal(receipt.mode, 'canary');
  assert.equal(receipt.status, 'passed');
  assert.equal(receipt.producer_commit, head);
  assert.equal(receipt.plan_fingerprint, plan.plan_fingerprint_sha256);
  assert.equal(receipt.committed, false);
  assert.equal(receipt.rollback_verified, true);
  assert.equal(receipt.already_applied, false);
  assert.equal(receipt.database_rows_committed, 0);
  assert.equal(receipt.transaction_rows_tested, Object.entries(plan.payload)
    .filter(([key]) => key !== 'families').reduce((sum, [, rows]) => sum + rows.length, 0));
  assert.equal(receipt.pointer_writes, 0);
  assert.equal(receipt.storage_writes, 0);
}

// The CLI supplies a fresh connection for every phase. A lost COMMIT response
// remains unknown until exact readback; never automatically replay a write.
export async function runPokemonSealedAdditiveExecutionV1({ connect, plan, authority, mode,
  canary, canaryHash, persistPhase = async () => {} }) {
  assert.ok(['preflight', 'canary', 'apply', 'readback'].includes(mode));
  assertPokemonSealedAdditiveScopeV1(plan, authority);
  if (mode === 'apply') assertPokemonSealedCanaryReceiptV1(canary, canaryHash, plan, authority.producerCommit);
  const c = await connect();
  let result, committed = false, commitAttempted = false, phase = 'transaction';
  try {
    await c.query(`begin isolation level serializable${['preflight', 'readback'].includes(mode) ? ' read only' : ''}`);
    if (mode === 'readback') {
      result = { already_applied: true, inserted: 0, counts: await verifyPokemonSealedAdditiveReadbackV1(c, plan) };
    } else {
      result = await executePokemonSealedAdditiveCatalogV1(c, plan, authority, { write: mode !== 'preflight' });
    }
    if (mode === 'canary') assert.equal(result.already_applied, false, 'Canary requires unapplied payload');
    if (mode === 'apply' && !result.already_applied) {
      await persistPhase({ phase: 'before_commit', plan_fingerprint: plan.plan_fingerprint_sha256,
        transaction_rows_tested: result.inserted });
      commitAttempted = true;
      await c.query('commit');
      committed = true;
    } else await c.query('rollback');
    phase = 'independent_readback';
    if (mode !== 'preflight') {
      const reader = await connect();
      try {
        await reader.query('begin isolation level repeatable read read only');
        if (mode === 'canary') await verifyPokemonSealedAdditiveAbsentV1(reader, plan);
        else result.counts = await verifyPokemonSealedAdditiveReadbackV1(reader, plan);
        await reader.query('rollback');
      } finally { await reader.end(); }
    }
    return { version: POKEMON_SEALED_ADDITIVE_EXECUTION_V1, project_ref: POKEMON_SEALED_PROJECT_REF,
      mode, status: 'passed', producer_commit: authority.producerCommit,
      plan_fingerprint: plan.plan_fingerprint_sha256, committed,
      already_applied: result.already_applied, rollback_verified: mode === 'canary',
      transaction_rows_tested: result.inserted, database_rows_committed: committed ? result.inserted : 0,
      expected_inserted: result.expected_inserted, counts: result.counts,
      protected_state_fingerprint: result.protected_state_fingerprint,
      pointer_writes: 0, storage_writes: 0, at: new Date().toISOString() };
  } catch (error) {
    if (!commitAttempted) await c.query('rollback').catch(() => {});
    await persistPhase({ phase: 'failed', failure_phase: phase,
      commit_state: committed ? 'committed_readback_failed' : commitAttempted ? 'unknown_requires_readback' : 'not_committed',
      error: error.message });
    throw error;
  } finally { await c.end(); }
}
