import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION,
  buildCalibrationJudgmentRowsV1,
  grookaiImageUrlV1,
  renderCalibrationDashboardV1,
  savedVisualRecordV1,
} from "../../backend/card_descriptions/card_visual_search_judgment_packet_v1.mjs";

function query(index, split = "calibration") {
  const id = `vsq_${String(index).padStart(4, "0")}`;
  return {
    query_id: id,
    split,
    family: "fixture",
    query_text: `query ${index}`,
    intent: { canonical_filters: { subjects: [] }, visual_concepts: ["forest"], subject_roles: [] },
    required_evidence_categories: ["scene"],
    valid_zero_result: false,
    bootstrap_candidate_judgment: split === "calibration" ? { expected_artwork_group_id: `group-${index}` } : null,
  };
}

function ranked(index) {
  return {
    query_id: `vsq_${String(index).padStart(4, "0")}`,
    total_matches: 1,
    bootstrap_evaluation: { rank: 1 },
    results: [{
      artwork_group_id: `group-${index}`,
      representative_card_print_id: `print-${index}`,
      representative_name: `Card ${index}`,
      prompt_branch: "pokemon",
      eligibility_tier: "A",
      score: 10,
      score_components: { structured_visual: 10 },
      matching_printings: [{ card_print_id: `print-${index}`, gv_id: `GV-${index}`, set_code: "SET", number: String(index) }],
      matched_evidence: [{ query_concept: "forest", term: "forest background", document_type: "scene", source_type: "canonical_concept", subject_role: null, supporting_observation_ids: [`obs-${index}`] }],
    }],
  };
}

test("Grookai image URLs accept governed storage paths only", () => {
  assert.equal(grookaiImageUrlV1("https://example.com/card.png"), null);
  assert.equal(grookaiImageUrlV1("../secret.png"), null);
  assert.equal(grookaiImageUrlV1("warehouse-derived/self-hosted-images-v1/cards/a b.png"), "https://grookaivault.com/api/canon/image?path=warehouse-derived%2Fself-hosted-images-v1%2Fcards%2Fa%20b.png");
  assert.equal(grookaiImageUrlV1("https://images.pokemontcg.io/set/1.png"), "https://grookaivault.com/_next/image?url=https%3A%2F%2Fimages.pokemontcg.io%2Fset%2F1.png&w=640&q=85");
  assert.equal(grookaiImageUrlV1("http://images.pokemontcg.io/set/1.png"), null);
});

test("judgment rows contain exactly 200 calibration queries and no completed judgments", () => {
  const suite = [...Array.from({ length: 200 }, (_, index) => query(index + 1)), ...Array.from({ length: 50 }, (_, index) => query(index + 201, "holdout"))];
  const outputs = Array.from({ length: 200 }, (_, index) => ranked(index + 1));
  const images = new Map(outputs.map((row, index) => [`print-${index + 1}`, { image_source_key: `warehouse-derived/self-hosted-images-v1/${index + 1}.png`, image_url: `https://example.invalid/${index + 1}` }]));
  const rows = buildCalibrationJudgmentRowsV1(suite, outputs, images);
  assert.equal(rows.length, 200);
  assert.ok(rows.every((row) => row.packet_version === CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION));
  assert.ok(rows.every((row) => row.review.completed_at === null && row.top_results.every((result) => result.judgment === null)));
  assert.ok(rows.every((row) => row.query_id <= "vsq_0200"));
});

test("source candidate outside the result window retains artwork identity and image", () => {
  const suite = Array.from({ length: 200 }, (_, index) => query(index + 1));
  const outputs = Array.from({ length: 200 }, (_, index) => {
    const row = ranked(index + 1);
    row.results = [];
    row.total_matches = 100;
    row.bootstrap_evaluation.rank = 0;
    return row;
  });
  const artworkByGroupId = new Map(suite.map((row, index) => [row.bootstrap_candidate_judgment.expected_artwork_group_id, { representative_card_print_id: `source-print-${index + 1}`, gv_id: `SOURCE-${index + 1}`, name: `Source ${index + 1}`, set_code: "SRC", number: String(index + 1) }]));
  const images = new Map([["source-print-1", { image_url: "https://example.invalid/source-1" }]]);
  const rows = buildCalibrationJudgmentRowsV1(suite, outputs, images, { artworkByGroupId });
  assert.equal(rows[0].source_candidate.representative_card_print_id, "source-print-1");
  assert.equal(rows[0].source_candidate.image.image_url, "https://example.invalid/source-1");
  assert.equal(rows[0].source_candidate.present_in_top_results, false);
});

test("saved visual records preserve the exact generated row and Fact Graph provenance", () => {
  const generatedRow = {
    card_print_id: "print-1",
    gv_id: "GV-1",
    name: "Wingull",
    artwork_description: "Fact digest.",
    visual_attributes: {
      fact_schema_version: "CARD_VISUAL_FACT_GRAPH_SCHEMA_V2",
      fact_graph: {
        observations: [{ observation_id: "obs-sky", kind: "environment", label: "blue sky" }],
        typed_facts: [{ fact_id: "fact-sky", module: "environment", field_path: "environment.sky", claim: "sky", value: "blue", supporting_observation_ids: ["obs-sky"] }],
        environment: { sky: ["blue sky"] },
      },
    },
  };
  const saved = savedVisualRecordV1({ outcome_type: "generated", generated_row: generatedRow }, "audit/source.json");
  assert.deepEqual(saved.generated_row, generatedRow);
  assert.equal(saved.source_artifact_path, "audit/source.json");
  assert.equal(saved.generated_row.visual_attributes.fact_graph.observations[0].label, "blue sky");
  assert.match(saved.generated_row_sha256, /^[a-f0-9]{64}$/u);
  assert.match(saved.source_record_sha256, /^[a-f0-9]{64}$/u);
});

test("dashboard preserves packet provenance and excludes network or mutation code", () => {
  const packet = { packet_version: CARD_VISUAL_SEARCH_JUDGMENT_PACKET_VERSION, judgment_set_version: "fixture", run_key: "run", commit_sha: "sha", saved_visual_records_by_card_id: {}, queries: [] };
  const html = renderCalibrationDashboardV1(packet);
  assert.match(html, /Grookai Visual Search Calibration/);
  assert.match(html, /Export JSONL/);
  assert.match(html, /Search match evidence only/);
  assert.match(html, /click to inspect image/);
  assert.match(html, /Full saved Fact Graph/);
  assert.match(html, /Exact saved generated row JSON/);
  assert.match(html, /facts-image-panel/);
  assert.match(html, /evidence and complete saved visual record/);
  assert.match(html, /Canonical:/);
  assert.doesNotMatch(html, /fetch\(|XMLHttpRequest|supabase|openai/i);
});

test("implementation has no provider database embedding or holdout execution path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_judgment_packet_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /OPENAI_API_KEY|responses\.create|embeddings?\.create|text-embedding/i);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.match(source, /holdout_exposed:\s*false/);
});
