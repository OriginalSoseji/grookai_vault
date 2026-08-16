import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceDurablePayloadPlanV1,
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION,
  validateOnePieceDurablePayloadPlanV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";

const CANARY = "docs/audits/pricing/" +
  "one_piece_canonical_import_staging_and_canary_v1/" +
  "e55e334b828db7b3_security_hardened/canary_plan.json";
const PROOF = "docs/audits/pricing/" +
  "one_piece_canonical_import_durable_staging_schema_apply_v1/" +
  "production_schema_apply_v1/summary.json";

async function fixture() {
  const [canaryText, proofText] = await Promise.all([
    fs.readFile(CANARY, "utf8"),
    fs.readFile(PROOF, "utf8"),
  ]);
  return buildOnePieceDurablePayloadPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
    },
    canaryPlan: JSON.parse(canaryText),
    schemaApplyProof: JSON.parse(proofText),
    schemaApplyProofSha256: sha256(proofText),
  });
}

test("exact 1-batch 21-row durable payload plan validates", async () => {
  const plan = await fixture();
  assert.equal(plan.plan_version, ONE_PIECE_DURABLE_PAYLOAD_PLAN_VERSION);
  assert.equal(plan.batch.authorized_durable_batch_rows, 1);
  assert.equal(plan.batch.authorized_durable_staging_rows, 21);
  assert.equal(plan.staging_rows.length, 21);
  assert.deepEqual(validateOnePieceDurablePayloadPlanV1(plan), {
    valid: true,
    findings: [],
  });
});

test("payload preserves singles, DON, sealed, and zero promotion authority", async () => {
  const plan = await fixture();
  assert.equal(plan.staging_rows.filter((row) =>
    row.record_class === "exact_single_card_candidate").length, 18);
  assert.equal(plan.staging_rows.filter((row) =>
    row.single_card_kind === "don_card").length, 1);
  assert.equal(plan.staging_rows.filter((row) =>
    row.record_class === "sealed_product_candidate").length, 3);
  assert.equal(plan.staging_rows.every((row) =>
    row.payload.publishable === false &&
    row.payload.canonical_write_authorized === false &&
    row.payload.sealed_write_authorized === false), true);
});

test("payload, source identity, ordinals, and authority drift fail closed", async () => {
  const plan = await fixture();
  plan.staging_rows[0].payload.source_product_name = "drift";
  plan.staging_rows[1].row_ordinal = 0;
  plan.staging_rows[2].payload.canonical_write_authorized = true;
  const result = validateOnePieceDurablePayloadPlanV1(plan);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((value) => value.startsWith("row_payload_hash_mismatch:")));
  assert.ok(result.findings.includes("row_ordinals_not_contiguous"));
  assert.ok(result.findings.some((value) => value.startsWith("row_authority_open:")));
  assert.ok(result.findings.includes("plan_fingerprint_mismatch"));
});

test("proof, payload fingerprint, guard, producer, counts, and boundaries fail closed", async () => {
  const plan = await fixture();
  plan.schema_apply_proof_sha256 = "0".repeat(64);
  plan.payload_fingerprint_sha256 = "1".repeat(64);
  plan.guard_token = "open";
  plan.batch.producing_commit_sha = "b".repeat(40);
  plan.batch.row_counts.numbered_cards = 18;
  plan.batch.execution_boundaries.canonical_promotion = true;
  const result = validateOnePieceDurablePayloadPlanV1(plan);
  assert.equal(result.valid, false);
  for (const finding of [
    "schema_apply_proof_mismatch",
    "payload_fingerprint_mismatch",
    "guard_token_mismatch",
    "batch_producer_mismatch",
    "batch_counts_mismatch",
    "batch_boundary_mismatch",
  ]) {
    assert.ok(result.findings.includes(finding), finding);
  }
});

test("planner is offline-only and requires a clean frozen producer", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_canonical_import_durable_payload_plan_v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source, /\b(?:pg|postgres|supabaseClient)\b/);
  assert.doesNotMatch(source, /dotenv|SUPABASE_DB_URL|DATABASE_URL/);
  assert.match(source, /--expected-head-sha/);
  assert.match(source, /status", "--porcelain"/);
});
