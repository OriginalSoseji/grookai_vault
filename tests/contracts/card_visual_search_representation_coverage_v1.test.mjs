import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { analyzeVisualRepresentationCoverageV1 } from "../../backend/card_descriptions/card_visual_search_representation_coverage_v1.mjs";
import { loadPokemonVisualIdentityLexiconV1 } from "../../backend/card_descriptions/card_visual_search_pokemon_identity_v1.mjs";

function record(id, graph) {
  return {
    card_print_id: id,
    gv_id: `GV-${id}`,
    name: `Card ${id}`,
    prompt_branch: "trainer",
    source_artifact_path: `source-${id}.json`,
    generated_row: {
      card_print_id: id,
      gv_id: `GV-${id}`,
      name: `Card ${id}`,
      prompt_branch: "trainer",
      visual_attributes: { fact_graph: graph },
    },
  };
}

test("coverage audit separates structured representations from omission candidates", () => {
  const lexicon = loadPokemonVisualIdentityLexiconV1();
  const rows = [
    record("structured", {
      observations: [{ observation_id: "obs-1", kind: "object", label: "Pikachu pillow" }],
      typed_facts: [],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [{ observation_id: "obs-1", represented_identity: "Pikachu", representation_form: "pillow" }],
      depicted_subjects: [],
      module_reviews: [{ module: "character_representations", review_status: "likely_complete" }],
    }),
    record("missing", {
      observations: [{ observation_id: "obs-2", kind: "object", label: "small Pikachu plush toy beside the bed" }],
      typed_facts: [],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [],
      depicted_subjects: [],
      module_reviews: [{ module: "character_representations", review_status: "none_visible" }],
    }),
    record("poster", {
      observations: [{ observation_id: "obs-3", kind: "depicted_subject", label: "Pikachu poster on the wall" }],
      typed_facts: [],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [],
      depicted_subjects: [],
      module_reviews: [{ module: "depicted_subjects", review_status: "none_visible" }],
    }),
  ];
  const report = analyzeVisualRepresentationCoverageV1(rows, lexicon);
  assert.equal(report.counts.processed_rows, 3);
  assert.equal(report.counts.rows_with_character_representations, 1);
  assert.equal(report.counts.rows_with_pokemon_character_representations, 1);
  assert.equal(report.counts.omission_candidate_rows, 2);
  assert.equal(report.counts.pokemon_character_representation_candidate_rows, 1);
  assert.equal(report.counts.pokemon_depicted_subject_candidate_rows, 1);
  assert.equal(report.distributions.representation_forms.pillow, 1);
});

test("coverage audit does not turn generic form cues into Pokemon facts", () => {
  const report = analyzeVisualRepresentationCoverageV1([
    record("generic", {
      observations: [{ observation_id: "obs-4", kind: "object", label: "plain pillow on a chair" }],
      typed_facts: [],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [],
      depicted_subjects: [],
      module_reviews: [],
    }),
    record("anatomy", {
      observations: [{ observation_id: "obs-5", kind: "subject", label: "Vanilluxe resembles two connected ice cream cones" }],
      typed_facts: [{ fact_id: "fact-5", module: "creature_anatomy", field_path: "body_structure", claim: "ice cream cone shaped body", value: "two connected bodies" }],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [],
      depicted_subjects: [],
      module_reviews: [],
    }),
    record("card-ui", {
      observations: [{ observation_id: "obs-card-ui", kind: "card_ui_sticker", label: "Pikachu sticker in card UI" }],
      typed_facts: [],
      objects_and_props: [],
      fact_grounded_search_terms: [],
      character_representations: [],
      depicted_subjects: [],
      module_reviews: [],
    }),
  ]);
  assert.equal(report.counts.pokemon_character_representation_candidate_rows, 0);
  assert.equal(report.counts.generic_character_representation_candidate_rows, 1);
  assert.equal(report.counts.omission_candidate_rows, 1);
});

test("coverage audit has no provider database embedding holdout or source-mutation path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_representation_coverage_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/iu);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/u);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/iu);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store/iu);
  assert.doesNotMatch(source, /holdout_queries|evaluation_holdout|judgment_submissions/iu);
  assert.doesNotMatch(source, /unlink|rmSync|rename|copyFile/iu);
});
