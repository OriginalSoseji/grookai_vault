import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_PROJECTION_VERSION,
  isCardUiProjectionEntryV1,
  isLockedEligibilityReportV1,
  parseVisualSearchProjectionArgsV1,
  projectArtworkGraphV1,
} from "../../backend/card_descriptions/card_visual_search_projection_v1.mjs";

function fixture(overrides = {}) {
  const group = {
    artwork_group_id: "cvag_fixture",
    artwork_group_hash: "group-hash",
    representative_card_print_id: "print-a",
    name_snapshot: "Pikachu",
    prompt_branch: "pokemon",
    eligibility_tier: "A",
    projection_guard_keys: [],
    ...overrides.group,
  };
  const membership = {
    artwork_group_id: group.artwork_group_id,
    card_print_id: "print-a",
    gv_id: "GV-PIKACHU",
    source_fact_graph_sha256: "fact-hash",
    source_generated_row_sha256: "row-hash",
    source_image_sha256: "image-hash",
    image_confidence: 0.95,
  };
  const graph = {
    observations: [
      { observation_id: "obs-subject", kind: "scene_subject", label: "Pikachu", normalized_label: "pikachu", confidence: 0.99, evidence_strength: "strong", scene_layer: "foreground", frame_position: "center", visibility: "visible", salience: "primary" },
      { observation_id: "obs-anatomy", kind: "creature_anatomy", label: "long pointed ears", normalized_label: "long pointed ears", confidence: 0.98, evidence_strength: "strong" },
      { observation_id: "obs-pose", kind: "pose", label: "sleeping with eyes closed", normalized_label: "sleeping", confidence: 0.96, evidence_strength: "strong" },
      { observation_id: "obs-forest", kind: "environment", label: "dense forest", normalized_label: "forest", confidence: 0.95, evidence_strength: "strong" },
      { observation_id: "obs-trees", kind: "object_group", label: "ten visible trees", normalized_label: "trees", confidence: 0.94, evidence_strength: "strong" },
      { observation_id: "obs-color", kind: "color_and_light", label: "yellow and green palette", normalized_label: "yellow green palette", confidence: 0.97, evidence_strength: "strong" },
      { observation_id: "obs-ui", kind: "card_ui", label: "120 HP", normalized_label: "120 hp", confidence: 0.99, evidence_strength: "strong" },
      { observation_id: "obs-illustrator", kind: "illustrator_text", label: "Illus. Example Artist", normalized_label: "illus example artist", confidence: 0.99, evidence_strength: "strong" },
      { observation_id: "obs-body-color", kind: "object_detail", label: "yellow body", normalized_label: "yellow body", confidence: 0.98, evidence_strength: "strong" },
      { observation_id: "obs-sign", kind: "environment_sign_text", label: "SALE sign", normalized_label: "sale sign", confidence: 0.96, evidence_strength: "strong" },
      { observation_id: "obs-object", kind: "objects_and_props", label: "metal object", normalized_label: "metal object", confidence: 0.9, evidence_strength: "medium" },
    ],
    typed_facts: [
      { fact_id: "fact-anatomy", module: "creature_anatomy", field_path: "ears", claim: "ear shape", value: "long and pointed", supporting_observation_ids: ["obs-anatomy"], confidence: 0.98, evidence_strength: "strong" },
      { fact_id: "fact-environment", module: "environment", field_path: "setting", claim: "setting", value: "dense forest", supporting_observation_ids: ["obs-forest"], confidence: 0.95, evidence_strength: "strong" },
      { fact_id: "fact-color", module: "color_and_light", field_path: "palette", claim: "palette", value: ["yellow", "green"], supporting_observation_ids: ["obs-color"], confidence: 0.97, evidence_strength: "strong" },
      { fact_id: "fact-body-color", module: "creature_anatomy", field_path: "body.color", claim: "body color", value: "yellow", supporting_observation_ids: ["obs-body-color"], confidence: 0.98, evidence_strength: "strong" },
      { fact_id: "fact-material", module: "objects_and_props", field_path: "material", claim: "material", value: "metal", supporting_observation_ids: ["obs-object"], confidence: 0.9, evidence_strength: "medium" },
      { fact_id: "fact-missing", module: "environment", field_path: "ground", claim: "ground", value: "grass", supporting_observation_ids: ["obs-missing"], confidence: 0.9, evidence_strength: "medium" },
    ],
    subjects: [{ observation_id: "obs-subject", subject_kind: "scene_subject", identity: "Pikachu", identity_confidence: 0.99 }],
    depicted_subjects: [{ observation_id: "obs-ui", represented_identity: "Raichu", surface_type: "card", host_surface: "printed card", confidence: 0.8 }],
    character_representations: [],
    counts: [{ count_id: "count-trees", normalized_label: "tree", count_type: "exact", exact_count: 10, supporting_observation_ids: ["obs-trees"], confidence: 0.94 }],
    relationships: [],
    semantic_visual_facts: [{ semantic_fact_id: "sem-sleeping", category: "state", label: "sleeping", subject_observation_id: "obs-subject", supporting_observation_ids: ["obs-pose"], confidence: 0.96 }],
    fact_grounded_search_terms: [
      { term: "sleeping Pikachu", supporting_observation_ids: ["obs-subject", "obs-pose"] },
      { term: "forest background", supporting_observation_ids: ["obs-forest"] },
    ],
    canonical_visual_concepts: { concept_schema_version: "CARD_VISUAL_CONTROLLED_VOCABULARY_V1", concepts: [{ concept: "forest", source_observation_ids: ["obs-forest"], confidence: 0.95 }, { concept: "yellow green palette", source_observation_ids: ["obs-color"], confidence: 0.97 }] },
  };
  const generatedRow = { card_print_id: "print-a", gv_id: "GV-PIKACHU", name: "Pikachu", prompt_branch: "pokemon", review_status: "pending", visual_attributes: { fact_graph: graph } };
  const decisions = [{ card_print_id: "print-a", projection_guard_keys: group.projection_guard_keys, module_limitations: [], flagged_evidence: [], ...overrides.decision }];
  return { group, membership, generatedRow, decisions };
}

function document(result, type) {
  return result.documents.find((row) => row.document_type === type);
}

test("projection arguments remain pinned to locked grouping and eligibility", () => {
  const args = parseVisualSearchProjectionArgsV1([]);
  assert.match(args.groupingDir, /grouping_424dbd1f2469$/);
  assert.match(args.eligibilityDir, /eligibility_a206881f5a0b$/);
  assert.equal(args.concurrency, 32);
  assert.equal(CARD_VISUAL_SEARCH_PROJECTION_VERSION, "CARD_VISUAL_SEARCH_PROJECTION_V1_1");
});

test("eligibility report parser accepts only the actual locked V1.4 shape", () => {
  assert.equal(isLockedEligibilityReportV1({ version: "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4", reconciled: true }), true);
  assert.equal(isLockedEligibilityReportV1({ version: "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_4", reconciliation: { reconciled: true } }), false);
  assert.equal(isLockedEligibilityReportV1({ version: "CARD_VISUAL_SEARCH_ELIGIBILITY_V1_3", reconciled: true }), false);
});

test("source card UI taxonomies are blocked without treating artwork sign text as card UI", () => {
  for (const module of ["illustrator_text", "hp_text", "set_symbol", "rarity_mark", "card_name_text", "energy_symbol", "attack_name_text", "rule_text"]) {
    assert.equal(isCardUiProjectionEntryV1({ module, field_path: null, category: module, observation_kinds: [module], supporting_observation_ids: ["obs-neutral"], term: "visible value" }), true, module);
  }
  assert.equal(isCardUiProjectionEntryV1({ module: "environment_sign_text", field_path: null, category: "environment_sign_text", observation_kinds: ["environment_sign_text"], supporting_observation_ids: ["obs-sign"], term: "SALE sign" }), false);
  assert.equal(isCardUiProjectionEntryV1({ module: "character_representation", field_path: "representation_form", category: "logo", observation_kinds: ["character_representation"], supporting_observation_ids: ["obs-logo"], term: "Pikachu logo on shirt" }), false);
});

test("projection produces three evidence-backed documents and keeps canonical context separate", () => {
  const result = projectArtworkGraphV1(fixture());
  assert.equal(result.documents.length, 3);
  assert.match(document(result, "subject").document_text, /long pointed ears/);
  assert.match(document(result, "scene").document_text, /dense forest/);
  assert.match(document(result, "style_composition").document_text, /yellow and green palette/);
  assert.equal(document(result, "subject").canonical_context.authority, "canonical_snapshot_not_visual_evidence");
  assert.ok(result.evidence.every((row) => row.supporting_observation_ids.length > 0));
});

test("card UI, depicted-on-UI identity, unsupported material, and missing references are excluded", () => {
  const result = projectArtworkGraphV1(fixture());
  assert.ok(result.exclusions.some((row) => row.source_id === "obs-ui" && row.exclusion_reasons.includes("card_ui_or_print_marker_observation")));
  assert.ok(result.exclusions.some((row) => row.source_id === "obs-illustrator" && row.exclusion_reasons.includes("card_ui_or_print_marker_observation")));
  assert.ok(result.exclusions.some((row) => row.source_id === "fact-material" && row.exclusion_reasons.includes("actual_material_claim_without_appearance_qualification")));
  assert.ok(result.exclusions.some((row) => row.source_id === "fact-missing" && row.exclusion_reasons.includes("missing_observation_reference")));
  assert.ok(result.evidence.every((row) => !row.supporting_observation_ids.includes("obs-ui")));
  assert.ok(result.evidence.every((row) => !row.supporting_observation_ids.includes("obs-illustrator")));
});

test("subject-linked generic observations route to subject while artwork sign text remains scene evidence", () => {
  const result = projectArtworkGraphV1(fixture());
  const bodyColor = result.evidence.find((row) => row.source_id === "obs-body-color");
  const sign = result.evidence.find((row) => row.source_id === "obs-sign");
  assert.equal(bodyColor?.document_type, "subject");
  assert.equal(sign?.document_type, "scene");
  assert.match(document(result, "subject").document_text, /yellow body/);
  assert.match(document(result, "scene").document_text, /SALE sign/);
});

test("count guard removes numeric count claims but preserves the counted visible object", () => {
  const input = fixture({ group: { eligibility_tier: "B", projection_guard_keys: ["counts"] } });
  const result = projectArtworkGraphV1(input);
  assert.ok(result.exclusions.some((row) => row.source_id === "count-trees" && row.applied_guards.includes("counts")));
  assert.ok(result.evidence.some((row) => row.source_id === "obs-trees"));
});

test("environment guard removes setting claims without removing style evidence", () => {
  const input = fixture({ group: { eligibility_tier: "B", projection_guard_keys: ["environment_setting"] } });
  const result = projectArtworkGraphV1(input);
  assert.doesNotMatch(document(result, "scene").document_text, /dense forest/);
  assert.match(document(result, "style_composition").document_text, /yellow and green palette/);
  assert.ok(result.exclusions.some((row) => row.applied_guards.includes("environment_setting")));
});

test("subject semantics guard preserves anatomy while suppressing image-derived identity roles", () => {
  const input = fixture({ group: { eligibility_tier: "B", projection_guard_keys: ["subject_semantics"] } });
  const result = projectArtworkGraphV1(input);
  assert.ok(result.exclusions.some((row) => row.source_type === "subject_role" && row.applied_guards.includes("subject_semantics")));
  assert.match(document(result, "subject").document_text, /long pointed ears/);
});

test("module completeness suppresses only modules explicitly identified as limited", () => {
  const input = fixture({
    group: { eligibility_tier: "B", projection_guard_keys: ["module_completeness"] },
    decision: { module_limitations: [{ module: "environment", reasons: ["omission_risk:high"] }] },
  });
  const result = projectArtworkGraphV1(input);
  assert.ok(result.exclusions.some((row) => row.source_id === "fact-environment" && row.applied_guards.includes("module_completeness")));
  assert.match(document(result, "style_composition").document_text, /yellow and green palette/);
});

test("projection is deterministic across replay", () => {
  const first = projectArtworkGraphV1(fixture());
  const second = projectArtworkGraphV1(fixture());
  assert.deepEqual(first, second);
  assert.deepEqual(first.documents.map((row) => row.document_hash), second.documents.map((row) => row.document_hash));
});

test("unknown guards fail closed", () => {
  const input = fixture({ group: { eligibility_tier: "B", projection_guard_keys: ["future_unknown_guard"] } });
  assert.throws(() => projectArtworkGraphV1(input), /unknown projection guards/);
});

test("projection implementation has no provider, database, embedding, or index-write integration", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_projection_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store/i);
  assert.match(source, /database_index_writes:\s*false/);
});
