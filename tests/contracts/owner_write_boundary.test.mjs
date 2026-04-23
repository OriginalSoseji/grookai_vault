import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXECUTOR_PATH = "apps/web/src/lib/contracts/execute_owner_write_v1.ts";
const PROOFS_PATH = "apps/web/src/lib/contracts/owner_write_proofs_v1.ts";

function readSource(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("executeOwnerWriteV1 hard-requires actor authority", () => {
  const source = readSource(EXECUTOR_PATH);

  assert.match(source, /OWNER_WRITE: actor_id required/);
  assert.match(source, /normalizeRequiredText\(params\.actor_id, "OWNER_WRITE: actor_id required"\)/);
});

test("executeOwnerWriteV1 executes writes before proofs and returns the write result", () => {
  const source = readSource(EXECUTOR_PATH);

  assert.match(source, /result = await params\.write\(context\)/);
  assert.match(source, /for \(const proof of params\.proofs \?\? \[\]\) \{/);
  assert.match(source, /await proof\(\{\s*\.\.\.context,\s*result,\s*\}\)/s);
  assert.match(source, /return result;/);
});

test("executeOwnerWriteV1 shares metadata and preserves nested owner authority", () => {
  const source = readSource(EXECUTOR_PATH);

  assert.match(source, /metadata: activeContext\.metadata/);
  assert.match(source, /OWNER_WRITE: nested actor mismatch/);
  assert.match(source, /setMetadata\(key, value\) \{\s*metadata\.set\(key, value\);/s);
  assert.match(source, /getMetadata\(key\) \{\s*return metadata\.get\(key\) as never;/s);
});

test("executeOwnerWriteV1 fails closed on write or proof error and exposes the owner proof helpers", () => {
  const executorSource = readSource(EXECUTOR_PATH);
  const proofsSource = readSource(PROOFS_PATH);

  assert.match(executorSource, /stage: "write" \| "proof"/);
  assert.match(executorSource, /throw error;/);
  assert.match(executorSource, /await maybeHandleOwnerWriteErrorV1\(params\.on_error,/);
  assert.match(proofsSource, /createVaultInstanceActiveProofV1/);
  assert.match(proofsSource, /createVaultInstanceArchivedProofV1/);
  assert.match(proofsSource, /createVaultCardCountProofV1/);
  assert.match(proofsSource, /createInteractionExistsProofV1/);
  assert.match(proofsSource, /createInteractionSignalProofV1/);
});

test("migrated trust mutation files now route through executeOwnerWriteV1", () => {
  const routeSource = readSource("apps/web/src/app/api/slabs/upgrade/route.ts");
  const createInteractionSource = readSource(
    "apps/web/src/lib/network/createCardInteractionAction.ts",
  );
  const replyInteractionSource = readSource(
    "apps/web/src/lib/network/replyToCardInteractionGroupAction.ts",
  );
  const quantitySource = readSource("apps/web/src/lib/vault/updateVaultItemQuantity.ts");
  const addSource = readSource("apps/web/src/lib/vault/addCardToVault.ts");
  const slabSource = readSource("apps/web/src/lib/slabs/createSlabInstance.ts");

  assert.match(routeSource, /executeOwnerWriteV1/);
  assert.doesNotMatch(routeSource, /rollbackCreatedSlab/);
  assert.match(createInteractionSource, /executeOwnerWriteV1/);
  assert.match(replyInteractionSource, /executeOwnerWriteV1/);
  assert.match(quantitySource, /executeOwnerWriteV1/);
  assert.match(addSource, /executeOwnerWriteV1/);
  assert.match(slabSource, /executeOwnerWriteV1/);
  assert.match(routeSource, /createVaultInstanceArchivedProofV1/);
  assert.match(createInteractionSource, /createInteractionExistsProofV1/);
  assert.match(createInteractionSource, /createInteractionSignalProofV1/);
  assert.match(replyInteractionSource, /createInteractionExistsProofV1/);
  assert.match(replyInteractionSource, /createInteractionSignalProofV1/);
});
