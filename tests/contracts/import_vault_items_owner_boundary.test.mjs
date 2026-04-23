import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const IMPORT_PATH = "apps/web/src/lib/import/importVaultItems.ts";
const PROOFS_PATH = "apps/web/src/lib/contracts/owner_write_proofs_v1.ts";

function readSource(relativePath) {
  return readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

test("importVaultItems routes bulk ownership mutations through executeOwnerWriteV1", () => {
  const source = readSource(IMPORT_PATH);

  assert.match(source, /return executeOwnerWriteV1<ImportVaultItemsResult>\(/);
  assert.match(source, /execution_name: "import_vault_items"/);
  assert.match(source, /actor_id: normalizedUserId/);
  assert.match(source, /createVaultCardCountBatchProofV1<ImportVaultItemsResult>/);
  assert.match(source, /createImportResultSummaryProofV1<ImportVaultItemsResult>/);
});

test("importVaultItems mutation helpers fail closed outside the owner boundary", () => {
  const source = readSource(IMPORT_PATH);

  assert.match(source, /getActiveOwnerWriteContextV1/);
  assert.match(
    source,
    /OWNER_WRITE: importVaultItems mutation helper called outside executeOwnerWriteV1/,
  );
  assert.match(source, /requireImportOwnerWriteContext\(\);/);
});

test("importVaultItems preserves the public result shape", () => {
  const source = readSource(IMPORT_PATH);

  assert.match(
    source,
    /return \{\s*importedCards,\s*importedEntries,\s*needsManualMatch,\s*skippedRows: needsManualMatch,\s*\};/s,
  );
});

test("owner write proof helpers expose import-safe count and summary proofs", () => {
  const source = readSource(PROOFS_PATH);

  assert.match(source, /createVaultCardCountBatchProofV1/);
  assert.match(source, /createImportResultSummaryProofV1/);
  assert.match(source, /owner_write_proof_failed:imported_cards_drift/);
  assert.match(source, /owner_write_proof_failed:imported_entries_drift/);
});
