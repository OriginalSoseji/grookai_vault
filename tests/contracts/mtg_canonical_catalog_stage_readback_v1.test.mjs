import assert from "node:assert/strict";
import test from "node:test";

import { reconcileMtgStageRowsV1 } from "../../scripts/audits/mtg_canonical_catalog_stage_readback_v1.mjs";

const row = {
  id: "row-1",
  batch_id: "batch-1",
  entity_type: "sets",
  row_key: "set-1",
  row_ordinal: 0,
  payload: { id: "set-1", code: "dsk" },
  payload_sha256: "a".repeat(64),
};

test("stage readback accepts exact row evidence", async () => {
  const { stableJson } = await import("../../scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs");
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(stableJson([row])).digest("hex");
  const result = reconcileMtgStageRowsV1([row], {
    rows: [row],
    staged_rows_sha256: hash,
  });
  assert.deepEqual(result.findings, []);
  assert.equal(result.row_count, 1);
});

test("stage readback restores frozen contract order before aggregate hashing", async () => {
  const { stableJson } = await import("../../scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs");
  const { createHash } = await import("node:crypto");
  const secondRow = {
    ...row,
    id: "row-2",
    entity_type: "card_prints",
    row_key: "card-1",
  };
  const expected = [row, secondRow];
  const hash = createHash("sha256").update(stableJson(expected)).digest("hex");
  const result = reconcileMtgStageRowsV1([secondRow, row], {
    rows: expected,
    staged_rows_sha256: hash,
  });
  assert.deepEqual(result.findings, []);
});

test("stage readback detects changed payload", async () => {
  const { stableJson } = await import("../../scripts/audits/mtg_canonical_catalog_canary_stage_v1.mjs");
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(stableJson([row])).digest("hex");
  const result = reconcileMtgStageRowsV1(
    [{ ...row, payload: { id: "set-1", code: "wrong" } }],
    { rows: [row], staged_rows_sha256: hash },
  );
  assert.ok(result.findings.some((finding) => finding.startsWith("staged_row_mismatch")));
  assert.ok(result.findings.includes("staged_rows_hash_mismatch"));
});
