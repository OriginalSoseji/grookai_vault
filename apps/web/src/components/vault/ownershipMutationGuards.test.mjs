import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSource(...segments) {
  return readFileSync(join(sourceRoot, ...segments), "utf8");
}

test("owner wall section mutations round-trip through ownership proof helpers", () => {
  const createAction = readSource("lib", "wallSections", "createWallSectionAction.ts");
  const updateAction = readSource("lib", "wallSections", "updateWallSectionAction.ts");
  const assignAction = readSource("lib", "wallSections", "assignWallSectionMembershipAction.ts");
  const removeAction = readSource("lib", "wallSections", "removeWallSectionMembershipAction.ts");
  const guards = readSource("lib", "contracts", "ownershipMutationGuards.ts");

  assert.match(guards, /Ownership\/trust mutations must round-trip against exact-copy truth before reporting success/);
  assert.match(createAction, /assertWallSectionStateProof/);
  assert.match(updateAction, /assertWallSectionStateProof/);
  assert.match(assignAction, /assertWallSectionMembershipProof/);
  assert.match(removeAction, /assertWallSectionMembershipProof/);
});

test("exact-copy ownership actions verify archived, active, count, and intent proofs", () => {
  const archiveAction = readSource("lib", "vault", "archiveVaultItemInstanceAction.ts");
  const quantityAction = readSource("lib", "vault", "updateVaultItemQuantity.ts");
  const addAction = readSource("lib", "vault", "addCardToVault.ts");
  const intentAction = readSource("lib", "network", "saveVaultItemInstanceIntentAction.ts");
  const slabAction = readSource("lib", "slabs", "createSlabInstance.ts");
  const interactionAction = readSource("lib", "network", "executeCardInteractionOutcomeAction.ts");
  const ownerProofs = readSource("lib", "contracts", "owner_write_proofs_v1.ts");

  assert.match(archiveAction, /assertVaultInstanceArchivedProof/);
  assert.match(archiveAction, /assertVaultCardCountProof/);
  assert.match(ownerProofs, /assertVaultInstanceArchivedProof/);
  assert.match(ownerProofs, /assertVaultInstanceActiveProof/);
  assert.match(ownerProofs, /assertVaultCardCountProof/);
  assert.match(quantityAction, /createVaultInstanceArchivedProofV1/);
  assert.match(quantityAction, /createVaultInstanceActiveProofV1/);
  assert.match(quantityAction, /createVaultCardCountProofV1/);
  assert.match(addAction, /createVaultInstanceActiveProofV1/);
  assert.match(intentAction, /assertVaultIntentProof/);
  assert.match(slabAction, /createVaultInstanceActiveProofV1/);
  assert.match(interactionAction, /assertVaultInstanceArchivedProof/);
  assert.match(interactionAction, /assertVaultInstanceActiveProof/);
});
