import test from 'node:test';
import assert from 'node:assert/strict';

import { loadAuthoritativeContractIndexMapV1 } from '../../backend/lib/contracts/contract_index_v1.mjs';
import {
  CONTRACT_EXECUTION_SCOPES_V1,
  assertContractScopeRegistryV1,
} from '../../backend/lib/contracts/contract_scope_v1.mjs';
import {
  CONTRACT_RUNTIME_CATALOG_V1,
  CONTRACT_RUNTIME_DRIFT_REFERENCES_V1,
} from '../../backend/lib/contracts/runtime_contract_catalog_v1.mjs';

test('contract scope registry resolves only authoritative contract names and real checkpoints', async () => {
  await assert.doesNotReject(assertContractScopeRegistryV1());
});

test('every runtime scope contract name exactly matches an authoritative CONTRACT_INDEX entry', async () => {
  const authoritative = await loadAuthoritativeContractIndexMapV1();

  for (const scope of Object.values(CONTRACT_EXECUTION_SCOPES_V1)) {
    for (const contractName of scope.active_contracts) {
      assert.ok(
        authoritative.has(contractName),
        `${scope.execution_name} declared non-authoritative contract ${contractName}`,
      );
      assert.ok(
        CONTRACT_RUNTIME_CATALOG_V1[contractName],
        `${scope.execution_name} declared ${contractName} without runtime catalog coverage`,
      );
    }
  }
});

test('known drifted contract-like names are excluded from runtime scope', () => {
  const scopeContracts = new Set(
    Object.values(CONTRACT_EXECUTION_SCOPES_V1).flatMap((scope) => scope.active_contracts),
  );

  for (const driftedName of CONTRACT_RUNTIME_DRIFT_REFERENCES_V1) {
    assert.equal(scopeContracts.has(driftedName), false, `${driftedName} must not enter runtime scope`);
  }
});
