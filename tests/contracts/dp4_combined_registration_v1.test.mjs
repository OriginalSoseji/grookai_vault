import test from 'node:test';
import assert from 'node:assert/strict';
import { getContractScopeV1 } from '../../backend/lib/contracts/contract_scope_v1.mjs';
import { CANON_WRITE_EXECUTION_POLICIES_V1 } from '../../backend/lib/contracts/execute_canon_write_v1.mjs';
import { POST_WRITE_PROOF_MODES_V1 } from '../../backend/lib/contracts/run_post_write_proofs_v1.mjs';

test('all executed DP4 repairs retain their authoritative registrations', () => {
  for (const name of [
    'catalog_jpn_dp4_subject_repair_v1', 'catalog_jpn_dp4_identity80_v1',
    'catalog_jpn_dp4_artist84_v1', 'catalog_jpn_dp4_artist12_v1',
    'catalog_jpn_dp4_unown6_v1', 'catalog_jpn_dp4_porygon2_v1',
    'catalog_jpn_dp4_artist8_v1', 'catalog_jpn_dp4_family_containment_v1',
  ]) {
    assert.equal(getContractScopeV1(name).canon_affecting, true, name);
    assert.equal(CANON_WRITE_EXECUTION_POLICIES_V1[name].transaction_mode, 'transactional_authoritative', name);
    assert.equal(POST_WRITE_PROOF_MODES_V1[name], 'transactional_authoritative', name);
  }
});
