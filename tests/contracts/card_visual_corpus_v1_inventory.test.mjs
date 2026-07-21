import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
  parseCorpusInventoryArgsV1,
  reconcileCorpusRecordsV1,
  sha256JsonV1,
} from "../../backend/card_descriptions/card_visual_corpus_v1_inventory.mjs";

function validRecord(id, source, status = "pending") {
  return {
    inventory_version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    source,
    source_storage: source === "private_database_apply_1000" ? "private_database_with_saved_artifact" : "audit_artifact_only",
    card_print_id: id,
    outcome_class: "valid",
    review_status: status,
    prompt_branch: "pokemon",
    prompt_version: "prompt-v2",
    schema_version: "schema-v2",
    agent_version: "agent-v1",
    model_version: "model",
    fact_graph_sha256: "a".repeat(64),
    generated_row_sha256: "b".repeat(64),
  };
}

function gapRecord(id, outcomeClass) {
  return {
    inventory_version: CARD_VISUAL_CORPUS_SOURCE_INVENTORY_VERSION,
    source: "overnight_artifact_harvest_10000",
    source_storage: "audit_artifact_only",
    card_print_id: id,
    outcome_class: outcomeClass,
    review_status: null,
    prompt_branch: "trainer",
  };
}

test("corpus inventory arguments remain local and read-only", () => {
  const args = parseCorpusInventoryArgsV1([]);
  assert.match(args.dbSourceExport, /ALL_1000_APPLY_READINESS_SAVED_SYSTEM_JSON\.json$/);
  assert.match(args.overnightOutcomeIndex, /OVERNIGHT_OUTCOME_INDEX\.jsonl$/);
  assert.equal(args.concurrency, 32);
  assert.equal(parseCorpusInventoryArgsV1(["--concurrency=8"]).concurrency, 8);
});

test("stable corpus hashes ignore object key order", () => {
  assert.equal(sha256JsonV1({ b: 2, a: 1 }), sha256JsonV1({ a: 1, b: 2 }));
  assert.notEqual(sha256JsonV1([1, 2]), sha256JsonV1([2, 1]));
});

test("source reconciliation separates valid rows from coverage gaps", () => {
  const result = reconcileCorpusRecordsV1({
    databaseRecords: [validRecord("db-1", "private_database_apply_1000")],
    overnightRecords: [
      validRecord("run-1", "overnight_artifact_harvest_10000", "needs_review"),
      gapRecord("run-2", "quarantine"),
      gapRecord("run-3", "image_skip"),
      gapRecord("run-4", "unprocessed"),
    ],
  });
  assert.equal(result.reconciled, true);
  assert.equal(result.counts.source_rows_total, 5);
  assert.equal(result.counts.valid_rows_total, 2);
  assert.equal(result.counts.coverage_gaps_total, 3);
  assert.deepEqual(result.distributions.review_statuses, { needs_review: 1, pending: 1 });
  assert.deepEqual(result.distributions.outcomes, { image_skip: 1, quarantine: 1, unprocessed: 1, valid: 2 });
});

test("source reconciliation fails closed on cross-source overlap", () => {
  const result = reconcileCorpusRecordsV1({
    databaseRecords: [validRecord("same", "private_database_apply_1000")],
    overnightRecords: [validRecord("same", "overnight_artifact_harvest_10000")],
  });
  assert.equal(result.reconciled, false);
  assert.deepEqual(result.duplicate_ids.cross_source_overlap, ["same"]);
  assert.ok(result.findings.includes("cross_source_overlap_ids:1"));
});

test("source reconciliation rejects approval, Energy, and missing graph hashes", () => {
  const record = validRecord("unsafe", "private_database_apply_1000", "approved");
  record.prompt_branch = "energy";
  record.fact_graph_sha256 = null;
  const result = reconcileCorpusRecordsV1({ databaseRecords: [record], overnightRecords: [] });
  assert.equal(result.reconciled, false);
  assert.ok(result.findings.some((item) => item.startsWith("invalid_review_status:unsafe")));
  assert.ok(result.findings.includes("energy_branch_in_valid_corpus:unsafe"));
  assert.ok(result.findings.includes("missing_fact_graph_hash:unsafe"));
});

test("inventory implementation contains no provider, database, or embedding integration", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_corpus_v1_inventory.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /\bpg\b|SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(source, /eligibility_derivation:\s*false/);
  assert.match(source, /artwork_grouping:\s*false/);
});

