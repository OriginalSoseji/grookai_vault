import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROOFS_PATH = "apps/web/src/lib/contracts/owner_write_proofs_v1.ts";

function readSource(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

function countMatches(source, pattern) {
  return (source.match(pattern) ?? []).length;
}

function assertMutationOccursAfterOwnerBoundary(source, label) {
  const boundaryIndex = source.indexOf("executeOwnerWriteV1");
  assert.ok(boundaryIndex >= 0, `${label}: missing executeOwnerWriteV1`);

  for (const pattern of [/\.update\(/g, /\.insert\(/g, /\.delete\(/g, /\.rpc\(/g]) {
    const match = pattern.exec(source);
    pattern.lastIndex = 0;
    if (!match) {
      continue;
    }
    assert.ok(match.index > boundaryIndex, `${label}: mutation primitive appears before owner boundary`);
  }
}

test("exact-copy metadata actions route mutations through executeOwnerWriteV1", () => {
  const cases = [
    {
      path: "apps/web/src/lib/vault/saveVaultItemInstanceConditionAction.ts",
      executionName: "save_vault_item_instance_condition",
      proofName: "createVaultInstanceConditionProofV1",
    },
    {
      path: "apps/web/src/lib/vault/saveVaultItemInstanceMediaAction.ts",
      executionName: "save_vault_item_instance_media",
      proofName: "createVaultInstanceMediaProofV1",
    },
    {
      path: "apps/web/src/lib/vault/saveVaultItemInstanceNotesAction.ts",
      executionName: "save_vault_item_instance_notes",
      proofName: "createVaultInstanceNotesProofV1",
    },
    {
      path: "apps/web/src/lib/vault/saveVaultItemInstancePricingAction.ts",
      executionName: "save_vault_item_instance_pricing",
      proofName: "createVaultInstancePricingProofV1",
    },
    {
      path: "apps/web/src/lib/vault/saveVaultItemInstanceImageDisplayModeAction.ts",
      executionName: "save_vault_item_instance_image_display_mode",
      proofName: "createVaultInstanceImageDisplayModeProofV1",
    },
    {
      path: "apps/web/src/lib/condition/assignConditionSnapshotAction.ts",
      executionName: "assign_condition_snapshot",
      proofName: "createConditionSnapshotAssignmentProofV1",
    },
  ];

  for (const testCase of cases) {
    const source = readSource(testCase.path);

    assert.match(source, /executeOwnerWriteV1/);
    assert.match(source, new RegExp(`execution_name: "${testCase.executionName}"`));
    assert.match(source, /actor_id: user\.id/);
    assert.match(source, new RegExp(testCase.proofName));
    assert.match(source, /context\.setMetadata\("source",/);

    assertMutationOccursAfterOwnerBoundary(source, testCase.path);
  }
});

test("exact-copy metadata files expose only one direct mutation primitive each", () => {
  const updateOnlyPaths = [
    "apps/web/src/lib/vault/saveVaultItemInstanceConditionAction.ts",
    "apps/web/src/lib/vault/saveVaultItemInstanceMediaAction.ts",
    "apps/web/src/lib/vault/saveVaultItemInstanceNotesAction.ts",
    "apps/web/src/lib/vault/saveVaultItemInstancePricingAction.ts",
    "apps/web/src/lib/vault/saveVaultItemInstanceImageDisplayModeAction.ts",
    "apps/web/src/lib/condition/assignConditionSnapshotAction.ts",
  ];

  for (const relativePath of updateOnlyPaths) {
    const source = readSource(relativePath);

    assert.equal(countMatches(source, /\.update\(/g), 1, `${relativePath}: expected one update()`);
    assert.equal(countMatches(source, /\.insert\(/g), 0, `${relativePath}: unexpected insert()`);
    assert.equal(countMatches(source, /\.delete\(/g), 0, `${relativePath}: unexpected delete()`);
    assert.equal(countMatches(source, /\.rpc\(/g), 0, `${relativePath}: unexpected rpc()`);
  }
});

test("owner write proofs include exact-copy metadata proof helpers", () => {
  const source = readSource(PROOFS_PATH);

  for (const proofName of [
    "createVaultInstanceConditionProofV1",
    "createVaultInstanceMediaProofV1",
    "createVaultInstanceNotesProofV1",
    "createVaultInstancePricingProofV1",
    "createVaultInstanceImageDisplayModeProofV1",
    "createConditionSnapshotAssignmentProofV1",
  ]) {
    assert.match(source, new RegExp(proofName));
  }
});
