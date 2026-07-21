import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION,
  classifyEligibilityV1,
  classifySourceGapV1,
  parseEligibilityArgsV1,
} from "../../backend/card_descriptions/card_visual_search_eligibility_v1.mjs";
import { sha256JsonV1 } from "../../backend/card_descriptions/card_visual_corpus_v1_inventory.mjs";

function generatedRow(overrides = {}) {
  const row = {
    card_print_id: "card-1",
    gv_id: "GV-PK-TEST-001",
    name: "Test Card",
    prompt_branch: "pokemon",
    prompt_version: "CARD_VISUAL_FACT_EXTRACTION_PROMPT_V2",
    output_schema_version: "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2",
    agent_version: "CARD_VISUAL_DESCRIPTION_AGENT_V1",
    model_version: "gpt-4.1-mini",
    image_source: "image_path",
    review_status: "pending",
    identity_input_confidence: 0.95,
    description_confidence: 0.95,
    attribute_confidence: 0.95,
    image_quality_score: 0.9,
    quality_flags: [],
    quality_flag_details: [],
    policy_results: [],
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-1" }],
        module_reviews: [{ module: "subjects", review_status: "complete", omission_risk: "low", evidence_quality: "high", abstentions: [] }],
      },
    },
    ...overrides,
  };
  return row;
}

function inventoryRow(row) {
  return {
    source: "overnight_artifact_harvest_10000",
    outcome_class: "valid",
    card_print_id: row.card_print_id,
    gv_id: row.gv_id,
    name: row.name,
    prompt_branch: row.prompt_branch,
    review_status: row.review_status,
    generated_row_sha256: sha256JsonV1(row),
    fact_graph_sha256: sha256JsonV1(row.visual_attributes.fact_graph),
  };
}

test("eligibility parser defaults to the frozen reconciled inventory", () => {
  const args = parseEligibilityArgsV1([]);
  assert.match(args.inventoryDir, /2026-07-21T15-51-01-795Z_inventory_3f72560c3b04$/);
  assert.equal(args.concurrency, 32);
});

test("clean evidence is Tier A", () => {
  const row = generatedRow();
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.policy_version, CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION);
  assert.equal(decision.tier, "A");
  assert.equal(decision.search_eligible, true);
  assert.deepEqual(decision.projection_guard_keys, []);
});

test("known noncritical setting uncertainty is Tier B with a projection guard", () => {
  const row = generatedRow({
    review_status: "needs_review",
    quality_flags: ["potential_speculative_setting_language"],
    quality_flag_details: [{ flag: "potential_speculative_setting_language", field: "environment.setting", matched_text: "night sky" }],
  });
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.tier, "B");
  assert.deepEqual(decision.projection_guard_keys, ["environment_setting"]);
  assert.equal(decision.flagged_evidence[0].field, "environment.setting");
});

test("primary-subject and subject-role conflicts are Tier C", () => {
  for (const flag of ["potential_primary_subject_mismatch", "potential_subject_kind_classification_confusion"]) {
    const row = generatedRow({ review_status: "needs_review", quality_flags: [flag] });
    const decision = classifyEligibilityV1(row, inventoryRow(row));
    assert.equal(decision.tier, "C");
    assert.ok(decision.critical_reasons.includes(`critical_flag:${flag}`));
  }
});

test("unknown quality flags fail closed to Tier C", () => {
  const row = generatedRow({ review_status: "needs_review", quality_flags: ["potential_new_unclassified_claim"] });
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.tier, "C");
  assert.deepEqual(decision.unknown_quality_flags, ["potential_new_unclassified_claim"]);
});

test("low-resolution evidence remains Tier B and Energy is excluded", () => {
  const limited = generatedRow({ review_status: "needs_review", quality_flags: ["partial_card_ui_due_to_low_resolution"], image_quality_score: 0.7 });
  assert.equal(classifyEligibilityV1(limited, inventoryRow(limited)).tier, "B");
  const energy = generatedRow({ prompt_branch: "energy" });
  assert.equal(classifyEligibilityV1(energy, inventoryRow(energy)).tier, "C");
});

test("source gaps are Tier C without claiming visual absence", () => {
  const decision = classifySourceGapV1({
    source: "overnight_artifact_harvest_10000",
    outcome_class: "image_skip",
    card_print_id: "gap-1",
    gv_id: "GV-PK-GAP-001",
    name: "Gap",
  });
  assert.equal(decision.tier, "C");
  assert.deepEqual(decision.critical_reasons, ["source_gap:image_skip"]);
});

test("eligibility implementation contains no provider, database, embedding, or grouping path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_eligibility_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /\bpg\b|SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(source, /artwork_grouping:\s*false/);
  assert.match(source, /search_projections:\s*false/);
});
