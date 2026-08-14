import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  expectedOnePieceDurableBatchV1,
  expectedOnePieceDurableRowsV1,
  ONE_PIECE_DURABLE_PAYLOAD_APPLY_GUARD,
  validateOnePieceDurablePayloadApplyInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_apply_v1.mjs";

const PLAN = "docs/audits/pricing/one_piece_canonical_import_durable_payload_v1/" +
  "bounded_21_row_plan_v1/plan.json";
const PREFLIGHT = "docs/audits/pricing/" +
  "one_piece_canonical_import_durable_payload_preflight_v1/" +
  "production_read_only_v1/summary.json";

test("exact frozen payload and preflight authorize only 1 batch and 21 rows", async () => {
  const [planText, preflightText] = await Promise.all([
    fs.readFile(PLAN, "utf8"), fs.readFile(PREFLIGHT, "utf8"),
  ]);
  const plan = JSON.parse(planText);
  const result = validateOnePieceDurablePayloadApplyInputsV1({
    plan, preflight: JSON.parse(preflightText), preflightSummaryText: preflightText,
  });
  assert.deepEqual(result, { valid: true, findings: [] });
  assert.equal(expectedOnePieceDurableBatchV1(plan).authorized_durable_batch_rows, 1);
  assert.equal(expectedOnePieceDurableRowsV1(plan).length, 21);
  assert.match(ONE_PIECE_DURABLE_PAYLOAD_APPLY_GUARD,
    /ONE_BATCH_21_ROWS_NO_PROMOTION$/);
});

test("preflight byte drift fails closed", async () => {
  const [planText, preflightText] = await Promise.all([
    fs.readFile(PLAN, "utf8"), fs.readFile(PREFLIGHT, "utf8"),
  ]);
  const result = validateOnePieceDurablePayloadApplyInputsV1({
    plan: JSON.parse(planText), preflight: JSON.parse(preflightText),
    preflightSummaryText: `${preflightText} `,
  });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("preflight_summary_hash_mismatch"));
});

test("writer targets only private staging and has one guarded commit", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_durable_payload_apply_v1.mjs",
    "utf8",
  );
  assert.equal((source.match(/insert into public\.one_piece_canonical_import_/gi) ?? []).length, 2);
  assert.equal((source.match(/client\.query\("commit"\)/g) ?? []).length, 1);
  assert.match(source, /set local role service_role/);
  assert.match(source, /pg_advisory_xact_lock/);
  assert.doesNotMatch(source, /insert into public\.(?:card_|sets|games|sealed_|market_|vault_)/i);
  assert.doesNotMatch(source, /\b(?:update|delete from|truncate)\s+public\./i);
});

test("independent verifier is read-only and binds execution hash", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_durable_payload_post_apply_readback_v1.mjs",
    "utf8",
  );
  assert.match(source, /default_transaction_read_only = on/);
  assert.match(source, /repeatable read read only/);
  assert.match(source, /--expected-execution-summary-sha256=/);
  assert.doesNotMatch(source, /\b(?:insert|update|delete|truncate)\s+(?:into|from|table|public\.)/i);
});
