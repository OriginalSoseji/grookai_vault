import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_ELIGIBILITY_VERSION,
  classifyEligibilityV1,
  classifySourceGapV1,
  isEnergyCardEvidenceV1,
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
        subjects: [{ observation_id: "obs-1", subject_kind: "scene_subject", identity: "Test Card" }],
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

test("unresolved primary-subject and subject-role conflicts are Tier C", () => {
  const cases = [
    generatedRow({
      name: "Espeon",
      pokemon_name: "Espeon",
      review_status: "needs_review",
      quality_flags: ["potential_primary_subject_mismatch"],
      visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-groudon" }], subjects: [{ observation_id: "obs-groudon", subject_kind: "scene_subject", identity: "Groudon" }], module_reviews: [] } },
    }),
    generatedRow({
      review_status: "needs_review",
      quality_flags: ["potential_subject_kind_classification_confusion"],
      visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-shared" }], subjects: [{ observation_id: "obs-shared", subject_kind: "scene_subject", identity: "Pikachu" }], depicted_subjects: [{ observation_id: "obs-shared", represented_identity: "Pikachu" }], module_reviews: [] } },
    }),
  ];
  for (const row of cases) {
    const decision = classifyEligibilityV1(row, inventoryRow(row));
    assert.equal(decision.tier, "C");
    assert.ok(decision.critical_reasons.some((reason) => reason.startsWith("critical_flag:")));
  }
});

test("owner and variant naming mismatches recover to guarded Tier B when base identity matches", () => {
  for (const [name, identity] of [
    ["Erika's Exeggutor", "Exeggutor"],
    ["giovanniのmeowth（u）", "meowth"],
    ["Flareon δ", "flareon_delta_species_pokemon"],
  ]) {
    const row = generatedRow({
      name,
      pokemon_name: name,
      review_status: "needs_review",
      quality_flags: ["potential_primary_subject_mismatch"],
      visual_attributes: {
        fact_graph: {
          observations: [{ observation_id: "obs-subject" }],
          subjects: [{ observation_id: "obs-subject", subject_kind: "scene_subject", identity }],
          depicted_subjects: [],
          character_representations: [],
          module_reviews: [],
        },
      },
    });
    const decision = classifyEligibilityV1(row, inventoryRow(row));
    assert.equal(decision.tier, "B");
    assert.deepEqual(decision.projection_guard_keys, ["subject_semantics"]);
    assert.equal(decision.reviewed_flag_reclassifications[0].reason, "base_subject_identity_matches_canonical_name");
  }
});

test("structurally separated scene subjects recover subject-kind heuristic false positives", () => {
  const row = generatedRow({
    review_status: "needs_review",
    quality_flags: ["potential_subject_kind_classification_confusion"],
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-main" }, { observation_id: "obs-background" }],
        subjects: [
          { observation_id: "obs-main", subject_kind: "scene_subject", identity: "Magikarp" },
          { observation_id: "obs-background", subject_kind: "scene_subject", identity: "Magikarp" },
        ],
        depicted_subjects: [],
        character_representations: [],
        module_reviews: [],
      },
    },
  });
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.tier, "B");
  assert.deepEqual(decision.projection_guard_keys, ["subject_semantics"]);
});

test("visible canonical Pokemon subject recovers unavailable-metadata branch heuristic false positive", () => {
  const row = generatedRow({
    name: "ガーディ",
    pokemon_name: "ガーディ",
    review_status: "needs_review",
    quality_flags: ["potential_unavailable_metadata_prompt_branch_mismatch"],
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-growlithe" }, { observation_id: "obs-man" }],
        subjects: [
          { observation_id: "obs-growlithe", subject_kind: "scene_subject", identity: "ガーディ" },
          { observation_id: "obs-man", subject_kind: "scene_subject", identity: "man" },
        ],
        depicted_subjects: [],
        character_representations: [],
        module_reviews: [],
      },
    },
  });
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.tier, "B");
  assert.equal(decision.reviewed_flag_reclassifications[0].reason, "canonical_subject_is_visibly_present_despite_secondary_non_pokemon_evidence");
});

test("cross-role observation reuse remains a critical subject-kind conflict", () => {
  const row = generatedRow({
    review_status: "needs_review",
    quality_flags: ["potential_subject_kind_classification_confusion"],
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-pikachu" }],
        subjects: [{ observation_id: "obs-pikachu", subject_kind: "scene_subject", identity: "Pikachu" }],
        depicted_subjects: [{ observation_id: "obs-pikachu", represented_identity: "Pikachu" }],
        character_representations: [],
        module_reviews: [],
      },
    },
  });
  assert.equal(classifyEligibilityV1(row, inventoryRow(row)).tier, "C");
});

test("branch profiles fail closed when Trainer and Stadium evidence contradicts routing", () => {
  const trainerWithoutHuman = generatedRow({
    name: "Mount Lanakila",
    prompt_branch: "trainer",
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-mountain" }],
        subjects: [],
        typed_facts: [],
        modules: { human_appearance: { fact_ids: [], visible_body_regions: [], facial_evidence: [], hair: [], gestures: [], accessories: [] } },
        module_reviews: [],
      },
    },
  });
  const trainerDecision = classifyEligibilityV1(trainerWithoutHuman, inventoryRow(trainerWithoutHuman));
  assert.equal(trainerDecision.tier, "C");
  assert.ok(trainerDecision.critical_reasons.includes("prompt_branch_profile_conflict:trainer_without_human_evidence"));

  const stadiumNamedTrainer = generatedRow({
    name: "Gym Trainer",
    prompt_branch: "stadium",
  });
  const stadiumDecision = classifyEligibilityV1(stadiumNamedTrainer, inventoryRow(stadiumNamedTrainer));
  assert.equal(stadiumDecision.tier, "C");
  assert.ok(stadiumDecision.critical_reasons.includes("prompt_branch_profile_conflict:stadium_with_trainer_named_card"));
});

test("Trainer branch remains eligible when human appearance evidence exists", () => {
  const row = generatedRow({
    name: "Lillie",
    prompt_branch: "trainer",
    visual_attributes: {
      fact_graph: {
        observations: [{ observation_id: "obs-person" }],
        subjects: [{ observation_id: "obs-person", subject_kind: "scene_subject", identity: "Lillie" }],
        modules: { human_appearance: { fact_ids: ["fact-face"], visible_body_regions: [], facial_evidence: [], hair: [], gestures: [], accessories: [] } },
        module_reviews: [],
      },
    },
  });
  assert.equal(classifyEligibilityV1(row, inventoryRow(row)).tier, "A");
});

test("Pokemon branch without a typed scene subject fails closed", () => {
  const row = generatedRow({
    prompt_branch: "pokemon",
    visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-object" }], subjects: [], module_reviews: [] } },
  });
  const decision = classifyEligibilityV1(row, inventoryRow(row));
  assert.equal(decision.tier, "C");
  assert.ok(decision.critical_reasons.includes("prompt_branch_profile_conflict:pokemon_without_scene_subject"));
});

test("Pokemon identity lexicon fails closed on a Pokemon-named Stadium row", () => {
  const row = generatedRow({ name: "Unown R (Temple of Anger No. 022)", prompt_branch: "stadium" });
  const decision = classifyEligibilityV1(row, inventoryRow(row), {
    pokemonIdentityNames: ["unown", "アンノーン"],
    pokemonIdentityPairs: [{ aliases: ["unown", "アンノーン"] }],
  });
  assert.equal(decision.tier, "C");
  assert.ok(decision.critical_reasons.includes("prompt_branch_profile_conflict:non_pokemon_branch_with_pokemon_named_card"));
});

test("Pokemon branch requires a known canonical Pokemon identity and matching scene subject", () => {
  const context = {
    pokemonIdentityNames: ["growlithe", "ガーディ"],
    pokemonIdentityPairs: [{ aliases: ["growlithe", "ガーディ"] }],
  };
  for (const [name, identity] of [
    ["タチワキシティジム", "building"],
    ["アララギ博士", "female human"],
  ]) {
    const row = generatedRow({
      name,
      prompt_branch: "pokemon",
      visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-subject" }], subjects: [{ observation_id: "obs-subject", subject_kind: "scene_subject", identity }], module_reviews: [] } },
    });
    const decision = classifyEligibilityV1(row, inventoryRow(row), context);
    assert.equal(decision.tier, "C");
    assert.ok(decision.critical_reasons.includes("prompt_branch_profile_conflict:pokemon_branch_without_known_pokemon_identity"));
  }

  const growlithe = generatedRow({
    name: "ガーディ",
    pokemon_name: "ガーディ",
    prompt_branch: "pokemon",
    review_status: "needs_review",
    quality_flags: ["potential_unavailable_metadata_prompt_branch_mismatch"],
    visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-growlithe" }], subjects: [{ observation_id: "obs-growlithe", subject_kind: "scene_subject", identity: "Growlithe" }], module_reviews: [] } },
  });
  const recovered = classifyEligibilityV1(growlithe, inventoryRow(growlithe), context);
  assert.equal(recovered.tier, "B");
  assert.deepEqual(recovered.critical_reasons, []);
});

test("tight romanized Japanese alias matching recovers spelling variants without accepting another species", () => {
  const context = {
    pokemonIdentityNames: ["garchomp", "ガブリアス", "swadloon", "クルマユ", "purrloin", "チョロネコ"],
    pokemonIdentityPairs: [
      { aliases: ["garchomp", "ガブリアス", "gaburiasu"] },
      { aliases: ["swadloon", "クルマユ", "kurumayu"] },
      { aliases: ["purrloin", "チョロネコ", "choroneko"] },
    ],
  };
  for (const [name, identity] of [
    ["シロナのガブリアスex", "Gaburias"],
    ["クルマユ", "kuramayu"],
  ]) {
    const row = generatedRow({
      name,
      prompt_branch: "pokemon",
      visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-subject" }], subjects: [{ observation_id: "obs-subject", subject_kind: "scene_subject", identity }], module_reviews: [] } },
    });
    assert.equal(classifyEligibilityV1(row, inventoryRow(row), context).tier, "A");
  }

  const wrongSpecies = generatedRow({
    name: "チョロネコ",
    prompt_branch: "pokemon",
    visual_attributes: { fact_graph: { observations: [{ observation_id: "obs-subject" }], subjects: [{ observation_id: "obs-subject", subject_kind: "scene_subject", identity: "Lucario" }], module_reviews: [] } },
  });
  const decision = classifyEligibilityV1(wrongSpecies, inventoryRow(wrongSpecies), context);
  assert.equal(decision.tier, "C");
  assert.ok(decision.critical_reasons.includes("prompt_branch_profile_conflict:pokemon_without_matching_canonical_subject"));
});

test("Energy identity is excluded independently of prompt branch without blocking Energy tools", () => {
  for (const name of ["Basic Water Energy", "ダブル無色エネルギー", "Energía", "기본 물 에너지"]) {
    const row = generatedRow({ name, prompt_branch: "pokemon" });
    assert.equal(isEnergyCardEvidenceV1(row), true);
    const decision = classifyEligibilityV1(row, inventoryRow(row));
    assert.equal(decision.tier, "C");
    assert.ok(decision.critical_reasons.includes("energy_card_excluded"));
  }
  for (const name of ["Energy Search", "Energy Switch", "エネルギー転送"]) {
    assert.equal(isEnergyCardEvidenceV1(generatedRow({ name, prompt_branch: "item_tool_supporter" })), false);
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
