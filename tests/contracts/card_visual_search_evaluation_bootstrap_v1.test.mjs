import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION,
  CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS,
  assignEvaluationSplitsV1,
  buildEvaluationQuerySuiteV1,
  normalizeVisualSearchTextV1,
  rankVisualSearchQueryV1,
  tokenizeVisualSearchTextV1,
} from "../../backend/card_descriptions/card_visual_search_evaluation_bootstrap_v1.mjs";

function concept(sourceId, term, module, documentType, subjectRole = null) {
  return { source_type: subjectRole ? "subject_role" : "canonical_concept", source_id: sourceId, term, module, field_path: null, category: module, subject_role: subjectRole, supporting_observation_ids: [`obs-${sourceId}`], confidence: 0.95, evidence_strength: "strong", document_type: documentType };
}

function syntheticGroup(index, overrides = {}) {
  const id = String(index).padStart(3, "0");
  const subject = [
    concept(`subject-${id}`, `scene_subject: Creature ${id}`, "scene_subject", "subject", "scene_subject"),
    concept(`depicted-${id}`, `depicted_subject: Cameo ${id}`, "depicted_subject", "subject", "depicted_subject"),
    concept(`anatomy-${id}`, `long pointed ears ${id}`, "creature_anatomy", "subject"),
    concept(`human-${id}`, `trainer with gloves ${id}`, "human_appearance clothing", "subject"),
    concept(`pose-${id}`, `leaping pose ${id}`, "pose action state", "subject"),
  ];
  const scene = [
    concept(`environment-${id}`, `forest background ${id}`, "environment setting", "scene"),
    concept(`object-${id}`, `mechanical device ${id}`, "objects_and_props", "scene"),
    concept(`effect-${id}`, `spectral wisp ${id}`, "visual_effects", "scene"),
  ];
  const style = [
    concept(`color-${id}`, `purple palette ${id}`, "color_and_light", "style_composition"),
    concept(`composition-${id}`, `diagonal composition ${id}`, "composition motif", "style_composition"),
  ];
  return {
    artwork_group_id: `group-${id}`,
    representative_card_print_id: `print-${id}-a`,
    name: `Creature ${id}`,
    branch: index % 5 === 0 ? "trainer" : "pokemon",
    tier: index % 2 === 0 ? "A" : "B",
    printings: [
      { card_print_id: `print-${id}-a`, gv_id: `GV-${id}-A`, name: `Creature ${id}`, set_code: `SET${index % 8}`, number: `${index}`, artwork_fact_source: "own_image", variant_image_status: "available", print_marker_evidence_status: "not_observed" },
      { card_print_id: `print-${id}-b`, gv_id: `GV-${id}-B`, name: `Creature ${id}`, set_code: `SET${index % 8}`, number: `${index}b`, artwork_fact_source: "shared_parent_artwork", variant_image_status: "not_available", print_marker_evidence_status: "not_observed" },
    ],
    documents: {
      subject: { search_document_id: `doc-${id}-subject`, document_type: "subject", subject_role_keys: ["scene_subject", "depicted_subject"], structured_concepts: subject },
      scene: { search_document_id: `doc-${id}-scene`, document_type: "scene", subject_role_keys: [], structured_concepts: scene },
      style_composition: { search_document_id: `doc-${id}-style`, document_type: "style_composition", subject_role_keys: [], structured_concepts: style },
    },
    ...overrides,
  };
}

test("normalization and tokenization are deterministic and remove only query stop words", () => {
  assert.equal(normalizeVisualSearchTextV1("  Pikachu’s BLUE_body! "), "pikachu's blue body");
  assert.deepEqual(tokenizeVisualSearchTextV1("Pikachu sleeping in a forest"), ["pikachu", "sleeping", "forest"]);
});

test("candidate suite freezes exactly 250 queries with 200 calibration and 50 holdout", () => {
  const groups = Array.from({ length: 320 }, (_, index) => syntheticGroup(index + 1));
  const suite = buildEvaluationQuerySuiteV1(groups);
  assert.equal(CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_VERSION, "CARD_VISUAL_SEARCH_EVALUATION_BOOTSTRAP_V1");
  assert.equal(suite.length, 250);
  assert.equal(suite.filter((row) => row.split === "calibration").length, 200);
  assert.equal(suite.filter((row) => row.split === "holdout").length, 50);
  assert.equal(new Set(suite.map((row) => row.query_id)).size, 250);
  for (const [family, expected] of Object.entries(CARD_VISUAL_SEARCH_QUERY_FAMILY_TARGETS)) assert.equal(suite.filter((row) => row.family === family).length, expected, family);
  assert.deepEqual(suite, buildEvaluationQuerySuiteV1(Array.from({ length: 320 }, (_, index) => syntheticGroup(index + 1))));
});

test("structured lexical ranker keeps artwork identity unique and expands all group printings", () => {
  const target = syntheticGroup(1);
  const distractor = syntheticGroup(2);
  const query = assignEvaluationSplitsV1(Array.from({ length: 250 }, (_, index) => ({ family: "fixture", query_text: `fixture ${index}`, intent: { canonical_filters: { subjects: [], set_codes: [], years: null, artist: [] }, visual_concepts: [], subject_roles: [], count_constraints: [], printing_filters: [], query_aliases: [], negative_filters: [], unrecognized_terms: [] } })))[0];
  query.intent.canonical_filters.subjects = [target.name];
  query.intent.visual_concepts = ["long pointed ears 001"];
  const ranked = rankVisualSearchQueryV1(query, [target, distractor]);
  assert.equal(ranked.total_matches, 1);
  assert.equal(ranked.results[0].artwork_group_id, target.artwork_group_id);
  assert.equal(ranked.results[0].matching_printings.length, 2);
  assert.ok(ranked.results[0].matched_evidence.every((entry) => entry.supporting_observation_ids.length > 0));
});

test("unsupported strict concept produces a valid zero-result shape", () => {
  const query = { intent: { canonical_filters: { subjects: [], set_codes: [], years: null, artist: [] }, visual_concepts: ["seventeen umbrellas in a volcano"], subject_roles: [], count_constraints: [], printing_filters: [], query_aliases: [], negative_filters: [], unrecognized_terms: [] } };
  const ranked = rankVisualSearchQueryV1(query, [syntheticGroup(1)]);
  assert.equal(ranked.total_matches, 0);
  assert.deepEqual(ranked.results, []);
});

test("bootstrap implementation has no provider, database, embedding, or index-write path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_evaluation_bootstrap_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store/i);
  assert.match(source, /index_writes:\s*false/);
});
