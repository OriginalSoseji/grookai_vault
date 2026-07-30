import assert from "node:assert/strict";
import test from "node:test";

import {
  attachCuratedCameoEvidenceV1,
  curatedCameoEntriesV1,
} from "../../backend/card_descriptions/card_visual_search_curated_cameo_v1.mjs";
import {
  createVisualSearchLabEngineV1,
  parseVisualSearchQueryV1,
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

function collectorFixtures() {
  const groups = [
    group("mimikyu-title", "Mimikyu", [], []),
    group("pikachu-title", "Pikachu", [], []),
    group("gengar-title", "Gengar", [], []),
    group("haunter-title", "Haunter", [], []),
    group("gastly-title", "Gastly", [], []),
    group(
      "mimikyu-pikachu",
      "Mimikyu",
      [
        {
          ...entry("mimikyu-visible", "Mimikyu ragged cloth body", "subject"),
          document_type: "subject",
        },
      ],
      [],
    ),
    group(
      "ghost-pair",
      "Ghost Gathering",
      [
        {
          ...entry(
            "gengar-visible",
            "scene_subject: Gengar",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
        {
          ...entry(
            "haunter-visible",
            "scene_subject: Haunter",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group(
      "yamper-ball",
      "Yamper",
      [
        {
          ...entry(
            "yamper-subject",
            "scene_subject: Yamper",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
        {
          ...entry("yamper-holding", "holding", "subject", {
            source_type: "relationship",
            module: "relationships",
            supporting_observation_ids: [
              "obs-yamper-subject",
              "obs-yamper-ball",
            ],
          }),
          document_type: "subject",
        },
        {
          ...entry(
            "yamper-pokeball",
            "red and white Poké Ball held in mouth",
            "subject",
            {
              module: "objects_and_props",
              supporting_observation_ids: ["obs-yamper-ball"],
            },
          ),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group(
      "unbound-trainer-ball",
      "Trainer and Pikachu",
      [
        {
          ...entry(
            "unbound-pikachu",
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
          ...entry("trainer-holding", "human trainer holding", "subject", {
            source_type: "relationship",
            module: "relationships",
            supporting_observation_ids: [
              "obs-human",
              "obs-trainer-ball",
            ],
          }),
          document_type: "subject",
        },
        {
          ...entry(
            "trainer-pokeball",
            "Poké Ball in trainer hand",
            "subject",
            {
              module: "objects_and_props",
              supporting_observation_ids: ["obs-trainer-ball"],
            },
          ),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group(
      "three-pokemon",
      "Three Pokémon Scene",
      [
        {
          ...entry(
            "three-pikachu",
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
          ...entry(
            "three-mimikyu",
            "scene_subject: Mimikyu",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
        {
          ...entry(
            "three-gastly",
            "scene_subject: Gastly",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group(
      "two-pokemon",
      "Two Pokémon Scene",
      [
        {
          ...entry(
            "two-pikachu",
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
          ...entry(
            "two-mimikyu",
            "scene_subject: Mimikyu",
            "subject",
            {
              source_type: "subject_role",
              subject_role: "scene_subject",
            },
          ),
          document_type: "subject",
        },
      ],
      ["scene_subject"],
    ),
    group("slurpuff-cookie", "Slurpuff", [], []),
  ];
  const rows = [
    cameoRow("mimikyu-pika", "print-mimikyu-pikachu", "Pikachu"),
    {
      ...cameoRow(
        "slurpuff-pika-cookie",
        "print-slurpuff-cookie",
        "Pikachu",
        {
          displayModes: ["food"],
          reconciliationStatus: "founder_image_confirmed",
        },
      ),
      authority: "founder_image_review",
      representation_details: ["cookie"],
    },
  ];
  return attachCuratedCameoEvidenceV1(groups, rows);
}

test("collector parser supports aliases, boolean subject groups, relationships, and minimum counts", () => {
  const decorated = collectorFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);

  const cookie = parseVisualSearchQueryV1(
    "Pika shaped cookie",
    engine.parser_index,
  );
  assert.equal(cookie.detected_subject.canonical_name, "Pikachu");
  assert.deepEqual(cookie.query_subject_aliases, [
    { alias: "pika", canonical: "pikachu" },
  ]);
  assert.deepEqual(cookie.intent.visual_filters.representation_forms, [
    "food shape",
  ]);

  const together = parseVisualSearchQueryV1(
    "Mimikyu and Pikachu together",
    engine.parser_index,
  );
  assert.deepEqual(together.intent.visual_filters.subject_groups, [
    ["Mimikyu"],
    ["Pikachu"],
  ]);

  const alternatives = parseVisualSearchQueryV1(
    "Gengar and Haunter or Ghastly",
    engine.parser_index,
  );
  assert.deepEqual(alternatives.intent.visual_filters.subject_groups, [
    ["Gengar"],
    ["Haunter", "Gastly"],
  ]);

  const holding = parseVisualSearchQueryV1(
    "Pokemon holding a pokeball",
    engine.parser_index,
  );
  assert.deepEqual(holding.intent.visual_filters.relationships, [
    {
      predicate: "holding",
      object: "poke ball",
      subject_binding: "required",
    },
  ]);

  const minimum = parseVisualSearchQueryV1(
    "cards with 3 or more Pokemon",
    engine.parser_index,
  );
  assert.deepEqual(minimum.intent.visual_filters.subject_count_constraints, [
    {
      subject_class: "pokemon",
      operator: "gte",
      minimum_count: 3,
      scope: "all_visible_pokemon_appearances",
    },
  ]);
});

test("founder-confirmed Pikachu-shaped cookie returns Slurpuff without mutating observations", async () => {
  const decorated = collectorFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("Pika shaped cookie");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-slurpuff-cookie");
  const evidence = result.results[0].matched_evidence.find(
    (row) => row.governance_status === "human_image_confirmed",
  );
  assert.ok(evidence);
  assert.match(evidence.term, /Pikachu: food shape: cookie/u);
  assert.deepEqual(evidence.supporting_observation_ids, []);
  assert.deepEqual(evidence.supporting_external_evidence_ids, [
    "cameo-slurpuff-pika-cookie",
  ]);
});

test("multi-subject AND and OR groups require co-occurrence in one artwork", async () => {
  const decorated = collectorFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const mimikyu = await engine.search("Mimikyu and Pikachu together");
  assert.equal(mimikyu.total_matches, 3);
  const mixedAuthority = mimikyu.results.find(
    (row) => row.artwork_group_id === "group-mimikyu-pikachu",
  );
  assert.ok(mixedAuthority);
  assert.ok(
    mixedAuthority.matched_sources.includes("visual_fact_graph"),
  );
  assert.ok(mixedAuthority.matched_sources.includes("curated_cameo"));

  const ghosts = await engine.search("Gengar and Haunter or Ghastly");
  assert.equal(ghosts.total_matches, 1);
  assert.equal(ghosts.results[0].artwork_group_id, "group-ghost-pair");
});

test("holding query binds the Pokeball to the Pokemon rather than another subject", async () => {
  const decorated = collectorFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("Pokemon holding a pokeball");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-yamper-ball");
  assert.ok(
    result.results[0].matched_evidence.some(
      (row) =>
        row.match_authority === "bound_subject_object_relationship",
    ),
  );
  assert.ok(
    result.results.every(
      (row) => row.artwork_group_id !== "group-unbound-trainer-ball",
    ),
  );
});

test("minimum Pokemon count uses visible identity evidence and excludes lower counts", async () => {
  const decorated = collectorFixtures();
  const engine = createVisualSearchLabEngineV1(decorated.groups);
  const result = await engine.search("card with 3 or more Pokemon");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-three-pokemon");
  assert.ok(
    result.results[0].matched_evidence.some(
      (row) =>
        row.match_authority === "derived_visible_pokemon_count" &&
        row.derived_visible_pokemon_count === 3,
    ),
  );
});
