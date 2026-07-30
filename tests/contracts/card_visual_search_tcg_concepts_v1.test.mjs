import assert from "node:assert/strict";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
  deriveTcgVisualConceptsV1,
} from "../../backend/card_descriptions/card_visual_search_tcg_concepts_v1.mjs";

function entry(id, term, overrides = {}) {
  return {
    source_type: "observation",
    source_id: id,
    term,
    normalized_term: term.toLowerCase(),
    module: "objects_and_props",
    category: "objects_and_props",
    subject_role: null,
    supporting_observation_ids: [id],
    confidence: 0.97,
    ...overrides,
  };
}

test("derives TCG-centric concepts without replacing raw evidence", () => {
  const raw = [
    entry("obs-pose", "sleeping on a tree branch", {
      module: "creature_anatomy",
    }),
    entry("obs-ball", "Poke Ball held in left paw"),
    entry("obs-forest", "dense forest background", {
      module: "environment",
    }),
  ];
  const result = deriveTcgVisualConceptsV1(raw);
  assert.equal(
    result.version,
    CARD_VISUAL_SEARCH_TCG_CONCEPT_PROFILE_VERSION,
  );
  assert.deepEqual(
    result.concepts.map((row) => row.concept),
    ["holding", "forest", "tree", "Poke Ball", "sleeping"],
  );
  assert.deepEqual(raw.map((row) => row.term), [
    "sleeping on a tree branch",
    "Poke Ball held in left paw",
    "dense forest background",
  ]);
  assert.ok(
    result.concepts.every(
      (row) =>
        row.derivation === "deterministic_rule" &&
        row.source_observation_ids.length > 0,
    ),
  );
});

test("keeps representation, depiction, and scene subjects separate", () => {
  const result = deriveTcgVisualConceptsV1([
    entry("obs-poster", "Pikachu printed on wall poster", {
      source_type: "subject_role",
      module: "depicted_subject",
      subject_role: "depicted_subject",
    }),
    entry("obs-cookie", "Pikachu-shaped cookie", {
      source_type: "subject_role",
      module: "character_representation",
      subject_role: "character_representation",
    }),
    entry("obs-scene", "Mimikyu", {
      source_type: "subject_role",
      module: "scene_subject",
      subject_role: "scene_subject",
    }),
  ]);
  const concepts = result.concepts.map((row) => row.concept);
  assert.ok(concepts.includes("depicted on another surface"));
  assert.ok(concepts.includes("character-shaped object"));
  assert.ok(concepts.includes("character-shaped food"));
  assert.ok(concepts.includes("multiple visible subjects"));
  assert.ok(!concepts.includes("three or more visible subjects"));
});

test("derives three-subject and Halloween concepts only from sufficient evidence", () => {
  const result = deriveTcgVisualConceptsV1([
    entry("subject-1", "Pikachu", {
      source_type: "subject_role",
      module: "scene_subject",
      subject_role: "scene_subject",
    }),
    entry("subject-2", "Mimikyu", {
      source_type: "subject_role",
      module: "scene_subject",
      subject_role: "scene_subject",
    }),
    entry("subject-3", "Gengar", {
      source_type: "subject_role",
      module: "depicted_subject",
      subject_role: "depicted_subject",
    }),
    entry("pumpkin", "two carved pumpkins"),
    entry("candle", "three lit candles"),
  ]);
  const concepts = result.concepts.map((row) => row.concept);
  assert.ok(concepts.includes("three or more visible subjects"));
  assert.ok(concepts.includes("Halloween visual theme"));
});

test("does not derive Halloween from one generic dark or ghost term", () => {
  const result = deriveTcgVisualConceptsV1([
    entry("dark", "dark purple background"),
    entry("ghost", "ghost Pokemon", {
      module: "scene_subject",
      subject_role: "scene_subject",
    }),
  ]);
  assert.ok(
    !result.concepts.some((row) => row.concept === "Halloween visual theme"),
  );
});

test("does not derive concepts from card UI evidence", () => {
  const result = deriveTcgVisualConceptsV1([
    entry("obs-card-ui", "Poke Ball symbol in retreat cost", {
      module: "card_ui",
      supporting_card_ui_observation_ids: ["obs-card-ui"],
    }),
  ]);
  assert.equal(result.concepts.length, 0);
});
