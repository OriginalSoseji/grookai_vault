import assert from "node:assert/strict";
import test from "node:test";

import {
  attachCuratedCameoEvidenceV1,
  curatedCameoEntriesV1,
} from "../../backend/card_descriptions/card_visual_search_curated_cameo_v1.mjs";
import {
  createVisualSearchLabEngineV1,
  parseCardVisualSearchLabArgsV1,
} from "../../backend/card_descriptions/card_visual_search_lab_v1.mjs";

function entry(id, term, documentType, overrides = {}) {
  return {
    source_type: "canonical_concept",
    source_id: id,
    term,
    module: documentType === "subject" ? "subjects" : "environment",
    field_path: null,
    category: documentType,
    subject_role: null,
    supporting_observation_ids: [`obs-${id}`],
    confidence: 0.96,
    evidence_strength: "high",
    ...overrides,
  };
}

function group(id, name, concepts, roles = []) {
  const byType = { subject: [], scene: [], style_composition: [] };
  for (const concept of concepts) {
    byType[concept.document_type].push(concept);
  }
  return {
    artwork_group_id: `group-${id}`,
    representative_card_print_id: `print-${id}`,
    name,
    branch: "trainer",
    tier: "A",
    printings: [
      {
        card_print_id: `print-${id}`,
        gv_id: `GV-${id}`,
        name,
        set_code: "TST",
        number: id,
        artwork_fact_source: "own_image",
        variant_image_status: "available",
        print_marker_evidence_status: "not_observed",
      },
    ],
    documents: {
      subject: {
        search_document_id: `doc-${id}-subject`,
        document_type: "subject",
        subject_role_keys: roles,
        structured_concepts: byType.subject,
      },
      scene: {
        search_document_id: `doc-${id}-scene`,
        document_type: "scene",
        subject_role_keys: [],
        structured_concepts: byType.scene,
      },
      style_composition: {
        search_document_id: `doc-${id}-style`,
        document_type: "style_composition",
        subject_role_keys: [],
        structured_concepts: byType.style_composition,
      },
    },
  };
}

function cameoRow(
  id,
  cardPrintId,
  identity,
  {
    displayModes = [],
    reconciliationStatus = "exact_canonical_match",
  } = {},
) {
  return {
    source_record_id: `cameo-${id}`,
    authority: "external_curated_reference",
    source: "test_curated_reference",
    cameo_identity_kind: "pokemon",
    cameo_identity: identity,
    display_mode_terms: displayModes,
    reconciliation_status: reconciliationStatus,
    canonical_match: { card_print_id: cardPrintId },
  };
}

function unifiedFixtures() {
  const groups = [
    group(
      "direct",
      "Pikachu",
      [
        {
          ...entry(
            "direct-pikachu",
            "scene_subject: Pikachu",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
        {
          ...entry("direct-sleeping", "sleeping", "subject", {
            subject_role: "scene_subject",
          }),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group("cameo", "Town Volunteers", [], []),
    group("pillow", "Whimsicott", [], []),
    group(
      "unrelated-sleeping",
      "Rest Area",
      [
        {
          ...entry(
            "human",
            "scene_subject: human trainer",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
        {
          ...entry("human-sleeping", "sleeping", "subject", {
            subject_role: "scene_subject",
            supporting_observation_ids: ["obs-human"],
          }),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
  ];
  const rows = [
    cameoRow("approved", "print-cameo", "Pikachu", {
      reconciliationStatus: "existing_approved_cameo_match",
    }),
    cameoRow("pillow", "print-pillow", "Pikachu", {
      displayModes: ["pillow"],
    }),
    cameoRow("unrelated", "print-unrelated-sleeping", "Pikachu"),
  ];
  return attachCuratedCameoEvidenceV1(groups, rows);
}

test("curated cameo projection preserves external authority without inventing observations", () => {
  const [association, role] = curatedCameoEntriesV1(
    cameoRow("pillow", "print-pillow", "Pikachu", {
      displayModes: ["pillow"],
    }),
  );
  assert.equal(association.term, "cameo subject: Pikachu");
  assert.deepEqual(association.supporting_observation_ids, []);
  assert.deepEqual(association.supporting_external_evidence_ids, [
    "cameo-pillow",
  ]);
  assert.equal(association.proves_fact_graph_observation, false);
  assert.equal(role.term, "character_representation: Pikachu: pillow");
  assert.equal(role.subject_role, "character_representation");
});

test("plain identity search combines canonical, visual, and curated cameo evidence", async () => {
  const decorated = unifiedFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups, {
    curatedCameoStats: decorated.stats,
  });
  const result = await engine.search("Pikachu");
  assert.equal(result.total_matches, 4);
  assert.equal(result.results[0].artwork_group_id, "group-direct");
  assert.ok(
    result.results[0].matched_sources.includes("canonical_identity"),
  );
  assert.ok(
    result.results.some(
      (row) =>
        row.artwork_group_id === "group-cameo" &&
        row.matched_sources.includes("curated_cameo"),
    ),
  );
});

test("explicit cameo query returns curated relationships and excludes direct-only identity", async () => {
  const decorated = unifiedFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("Pikachu cameo");
  assert.equal(result.total_matches, 3);
  assert.ok(
    result.results.every((row) =>
      row.matched_sources.includes("curated_cameo"),
    ),
  );
  assert.ok(
    result.results.every(
      (row) => row.artwork_group_id !== "group-direct",
    ),
  );
  assert.ok(
    result.results.some((row) =>
      row.matched_evidence.some(
        (evidence) =>
          evidence.match_authority === "curated_cameo_association",
      ),
    ),
  );
});

test("explicit representation form can use curated display-mode evidence", async () => {
  const decorated = unifiedFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("Pikachu pillow");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-pillow");
  const evidence = result.results[0].matched_evidence.find(
    (row) =>
      row.match_authority === "curated_cameo_display_mode_evidence",
  );
  assert.ok(evidence);
  assert.deepEqual(evidence.supporting_observation_ids, []);
  assert.deepEqual(evidence.supporting_external_evidence_ids, [
    "cameo-pillow",
  ]);
});

test("curated association cannot bind an unrelated subject-scoped semantic fact", async () => {
  const decorated = unifiedFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("Pikachu sleeping");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-direct");
  assert.ok(
    result.results.every(
      (row) => row.artwork_group_id !== "group-unrelated-sleeping",
    ),
  );
});

test("runtime cameo source remains optional and explicitly configurable", () => {
  const defaultArgs = parseCardVisualSearchLabArgsV1([]);
  assert.equal(defaultArgs.cameoReference, null);
  const configured = parseCardVisualSearchLabArgsV1([
    "--cameo-reference=C:/tmp/canonical_matches.jsonl",
  ]);
  assert.equal(
    configured.cameoReference,
    "C:/tmp/canonical_matches.jsonl",
  );
});
