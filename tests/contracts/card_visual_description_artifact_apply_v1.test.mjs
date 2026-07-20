import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS,
  aggregateImportedUsageV1,
  buildArtifactApplyFingerprintV1,
  classifyArtifactApplyStateV1,
  parseArtifactApplyArgsV1,
  validateArtifactRowForApplyV1,
} from "../../backend/card_descriptions/card_visual_description_artifact_apply_v1.mjs";

function source(relativePath) {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
}

function validRow() {
  return {
    card_print_id: "11111111-1111-4111-8111-111111111111",
    gv_id: "GV-PK-TEST-001",
    name: "Pikachu",
    set_name: "Test Set",
    set_code: "tst",
    number: "1",
    prompt_branch: "pokemon",
    image_sha256: "a".repeat(64),
    review_status: "pending",
    visual_attributes: { fact_graph: {} },
    description_version_key: "replace",
  };
}

test("artifact apply parser defaults to a bounded plan", () => {
  const args = parseArtifactApplyArgsV1([]);
  assert.equal(args.mode, "plan");
  assert.equal(args.maxCards, CARD_VISUAL_DESCRIPTION_ARTIFACT_APPLY_MAX_ROWS);
  assert.throws(() => parseArtifactApplyArgsV1(["--max-cards=26"]), /between 1 and 25/);
});

test("artifact apply parser requires a single mode", () => {
  assert.equal(parseArtifactApplyArgsV1(["--apply"]).mode, "apply");
  assert.throws(() => parseArtifactApplyArgsV1(["--apply", "--plan"]), /exactly one/);
});

test("artifact rows reject approvals, embeddings, and Energy", () => {
  const row = validRow();
  row.prompt_branch = "energy";
  row.review_status = "approved";
  row.embedding = [0.1];
  const result = validateArtifactRowForApplyV1(row);
  assert.ok(result.findings.includes("review_status_not_applyable"));
  assert.ok(result.findings.includes("energy_branch_not_allowed"));
  assert.ok(result.findings.includes("embedding_payload_not_allowed"));
});

test("artifact apply state blocks approved current rows", () => {
  const state = classifyArtifactApplyStateV1([{ current_description_id: "1", current_review_status: "approved" }]);
  assert.equal(state.decision, "blocked_approved_current");
});

test("artifact apply state recognizes only same-run full duplicates as idempotent", () => {
  const same = [{ duplicate_description_id: "1", duplicate_run_key: "run", expected_run_key: "run", current_description_id: "1" }];
  assert.equal(classifyArtifactApplyStateV1(same).decision, "idempotent");
  const drift = [{ duplicate_description_id: "1", duplicate_run_key: "other", expected_run_key: "run" }];
  assert.equal(classifyArtifactApplyStateV1(drift).decision, "blocked_duplicate_drift");
});

test("artifact apply usage preserves source telemetry", () => {
  const usage = aggregateImportedUsageV1([
    { request_count: 1, retry_count: 0, input_tokens: 10, output_tokens: 5, total_tokens: 15, cached_input_tokens: 2, estimated_cost_usd: 0.01, response_model_version: "model-a" },
    { request_count: 2, retry_count: 1, input_tokens: 20, output_tokens: 7, total_tokens: 27, cached_input_tokens: 3, estimated_cost_usd: 0.02, response_model_version: "model-a" },
  ]);
  assert.deepEqual(usage, {
    request_count: 3,
    retry_count: 1,
    input_tokens: 30,
    output_tokens: 12,
    total_tokens: 42,
    cached_input_tokens: 5,
    reasoning_output_tokens: 0,
    estimated_cost_usd: 0.03,
    response_model_versions: ["model-a"],
  });
});

test("artifact apply fingerprints are deterministic", () => {
  assert.equal(buildArtifactApplyFingerprintV1({ b: 2, a: 1 }), buildArtifactApplyFingerprintV1({ a: 1, b: 2 }));
});

test("artifact importer contains no provider or embedding write path", () => {
  const importer = source("backend/card_descriptions/card_visual_description_artifact_apply_v1.mjs");
  assert.doesNotMatch(importer, /responses\.create|openai\.com|OPENAI_API_KEY/);
  assert.doesNotMatch(importer, /insert\s+into\s+public\.card_embeddings/i);
  assert.match(importer, /provider_calls_during_apply:\s*0/);
  assert.match(importer, /review_status === "approved"/);
});

test("private migration retains RLS and service-role-only grants", () => {
  const sql = source("supabase/migrations/20260715120000_card_visual_description_agent_v1.sql");
  assert.match(sql, /alter table public\.card_visual_description_runs enable row level security/i);
  assert.match(sql, /alter table public\.card_print_visual_descriptions enable row level security/i);
  assert.match(sql, /revoke all on table public\.card_print_visual_descriptions from public, anon, authenticated/i);
  assert.match(sql, /grant all on table public\.card_print_visual_descriptions to service_role/i);
});
