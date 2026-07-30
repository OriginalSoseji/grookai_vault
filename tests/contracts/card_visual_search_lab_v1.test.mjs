import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_LAB_VERSION,
  buildVisualSearchParserIndexV1,
  createVisualSearchImageResolverV1,
  createVisualSearchLabEngineV1,
  createVisualSearchLabServerV1,
  matchVisualSearchAliasV1,
  parseCardVisualSearchLabArgsV1,
  parseVisualSearchQueryV1,
  resolveVisualSearchSourceArtifactPathV1,
} from "../../backend/card_descriptions/card_visual_search_lab_v1.mjs";
import { buildVisualSearchCandidateIndexV1 } from "../../backend/card_descriptions/card_visual_search_evaluation_bootstrap_v1.mjs";

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
    document_type: documentType,
    ...overrides,
  };
}

function group(id, name, branch, concepts, roles = ["scene_subject"]) {
  const byType = { subject: [], scene: [], style_composition: [] };
  for (const concept of concepts) byType[concept.document_type].push(concept);
  return {
    artwork_group_id: `group-${id}`,
    representative_card_print_id: `print-${id}`,
    name,
    branch,
    tier: "A",
    printings: [{ card_print_id: `print-${id}`, gv_id: `GV-${id}`, name, set_code: "TST", number: id, artwork_fact_source: "own_image", variant_image_status: "available", print_marker_evidence_status: "not_observed" }],
    documents: {
      subject: { search_document_id: `doc-${id}-subject`, document_type: "subject", subject_role_keys: roles, structured_concepts: byType.subject },
      scene: { search_document_id: `doc-${id}-scene`, document_type: "scene", subject_role_keys: [], structured_concepts: byType.scene },
      style_composition: { search_document_id: `doc-${id}-style`, document_type: "style_composition", subject_role_keys: [], structured_concepts: byType.style_composition },
    },
  };
}

function fixtures() {
  return [
    group("001", "Pikachu", "pokemon", [
      entry("pikachu", "scene_subject: Pikachu", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("sleeping", "sleeping", "subject"),
      entry("forest", "forest", "scene"),
      entry("trees", "tree count exact: 3", "scene", { source_type: "count" }),
    ]),
    group("002", "Collector Room", "trainer", [
      entry("represented-pikachu", "character_representation: Pikachu: plush: yellow toy", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
      entry("plush", "yellow plush toy", "scene"),
    ], ["character_representation"]),
    group("003", "Haunted House", "stadium", [
      entry("spectral", "spectral figure", "scene"),
      entry("pumpkin", "three pumpkins", "scene"),
      entry("candle", "lit candles", "scene"),
    ], []),
    group("004", "Hazy Room", "trainer", [
      entry("smoke", "smoke cloud", "scene"),
      entry("eyes", "red eyes", "subject"),
    ]),
    group("005", "Red Eyes", "pokemon", [entry("red-only", "red eyes", "subject")]),
    group("006", "Glove Trainer", "trainer", [entry("glove", "black glove", "subject")]),
    group("007", "Lightning Field", "stadium", [entry("bolts", "lightning bolts count exact: 3", "scene", { source_type: "count" })], []),
    group("008", "Pillow Room", "trainer", [
      entry("pillow-pikachu", "character_representation: Pikachu: pillow: bed pillow", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
    ], ["character_representation"]),
    group("009", "Statue Garden", "stadium", [
      entry("statue-pikachu", "character_representation: Pikachu: statue: stone figure", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
    ], ["character_representation"]),
    group("010", "Portrait Room", "trainer", [
      entry("portrait-pikachu", "character_representation: Pikachu: cartoon portrait: printed icon", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
    ], ["character_representation"]),
    group("011", "Poster Room", "trainer", [
      entry("poster-pikachu", "depicted_subject: Pikachu: poster: wall poster", "subject", { source_type: "subject_role", subject_role: "depicted_subject" }),
    ], ["depicted_subject"]),
    group("012", "Screen Room", "trainer", [
      entry("screen-pikachu", "depicted_subject: Pikachu: screen: television screen", "subject", { source_type: "subject_role", subject_role: "depicted_subject" }),
    ], ["depicted_subject"]),
    group("013", "Illustration Room", "trainer", [
      entry("illustrated-pikachu", "depicted_subject: Pikachu with green headband and smiling closed eyes: illustration: illustrated scene, left midground", "subject", { source_type: "subject_role", subject_role: "depicted_subject" }),
    ], ["depicted_subject"]),
    group("014", "Conflicting Identity Room", "trainer", [
      entry("conflicting-pikachu", "character_representation: Pikachu (Tepig): plush: yellow toy", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
    ], ["character_representation"]),
    group("015", "Trainer Scene With Pikachu", "trainer", [
      entry("trainer-scene-pikachu", "scene_subject: Pikachu", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("trainer-pikachu-sleeping", "sleeping", "subject", { subject_role: "scene_subject", supporting_observation_ids: ["obs-trainer-scene-pikachu"] }),
    ]),
    group("016", "Mixed Awake Scene", "trainer", [
      entry("mixed-pikachu", "scene_subject: Pikachu", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("mixed-human", "scene_subject: human trainer", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("human-sleeping", "sleeping", "subject", { subject_role: "scene_subject", supporting_observation_ids: ["obs-mixed-human"] }),
    ]),
    group("017", "Pokemon Food Art", "trainer", [
      entry("food-pikachu", "character_representation: Pikachu: food shape: decorated pastry", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
    ], ["character_representation"]),
    group("018", "Pokemon Ice Cream Art", "trainer", [
      entry("ice-cream-pikachu", "Pikachu-shaped ice cream dessert", "scene", { source_type: "observation", module: "objects_and_props" }),
    ], []),
    group("019", "Vanilluxe", "pokemon", [
      entry("vanilluxe-subject", "scene_subject: Vanilluxe", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("vanilluxe-anatomy", "Vanilluxe has two connected ice cream cone shaped bodies", "subject", { source_type: "typed_fact", module: "creature_anatomy" }),
    ]),
    group("020", "Pikachu Eating Ice Cream", "trainer", [
      entry("snack-pikachu", "scene_subject: Pikachu", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("snack-ice-cream", "Pikachu holding an ice cream cone", "scene", { module: "objects_and_props" }),
    ]),
    group("021", "Marowak ex", "pokemon", [
      entry("marowak-subject", "scene_subject: Marowak", "subject", { source_type: "subject_role", subject_role: "scene_subject" }),
      entry("marowak-standing", "standing", "subject", { supporting_observation_ids: ["obs-marowak-subject"] }),
      entry("bad-standing-role", "visual_resemblance_reference: standing", "subject", { source_type: "subject_role", subject_role: "visual_resemblance_reference" }),
    ], ["scene_subject", "visual_resemblance_reference"]),
  ];
}

test("parser separates canonical subject, visual facts, roles, branches, counts, and unknown terms", () => {
  const groups = fixtures();
  const parser = buildVisualSearchParserIndexV1(groups, buildVisualSearchCandidateIndexV1(groups));
  const subjectQuery = parseVisualSearchQueryV1("Pikachu sleeping in a forest", parser);
  assert.equal(subjectQuery.detected_subject.canonical_name, "Pikachu");
  assert.deepEqual(subjectQuery.intent.visual_filters.concepts, ["sleeping", "forest"]);
  assert.deepEqual(subjectQuery.intent.unrecognized_terms, []);

  const roleQuery = parseVisualSearchQueryV1("Pikachu plush", parser);
  assert.deepEqual(roleQuery.intent.visual_filters.subject_roles, ["character_representation"]);
  assert.deepEqual(roleQuery.intent.visual_filters.representation_forms, ["plush"]);
  assert.deepEqual(roleQuery.intent.visual_filters.depicted_surfaces, []);
  assert.deepEqual(roleQuery.intent.canonical_filters.subjects, []);
  const pillowQuery = parseVisualSearchQueryV1("Pikachu-shaped pillow", parser);
  assert.deepEqual(pillowQuery.intent.visual_filters.representation_forms, ["pillow"]);
  assert.deepEqual(pillowQuery.intent.unrecognized_terms, []);
  const screenQuery = parseVisualSearchQueryV1("Pikachu on a screen", parser);
  assert.deepEqual(screenQuery.intent.visual_filters.subject_roles, ["depicted_subject"]);
  assert.deepEqual(screenQuery.intent.visual_filters.depicted_surfaces, ["screen"]);

  const trainerQuery = parseVisualSearchQueryV1("trainers wearing gloves", parser);
  assert.deepEqual(trainerQuery.intent.canonical_filters.branches, ["trainer"]);
  assert.deepEqual(trainerQuery.intent.visual_filters.concepts, ["glove"]);

  const pokemonSubjectQuery = parseVisualSearchQueryV1("sleeping Pokemon", parser);
  assert.deepEqual(pokemonSubjectQuery.intent.canonical_filters.branches, []);
  assert.deepEqual(pokemonSubjectQuery.intent.visual_filters.subject_classes, ["pokemon"]);
  assert.deepEqual(pokemonSubjectQuery.intent.visual_filters.subject_roles, ["scene_subject"]);
  assert.deepEqual(pokemonSubjectQuery.intent.visual_filters.concepts, ["sleeping"]);

  const pokemonCardQuery = parseVisualSearchQueryV1("Pokemon cards with sleeping", parser);
  assert.deepEqual(pokemonCardQuery.intent.canonical_filters.branches, ["pokemon"]);
  assert.deepEqual(pokemonCardQuery.intent.visual_filters.subject_classes, []);
  assert.deepEqual(pokemonCardQuery.intent.visual_filters.subject_roles, []);

  const foodRepresentationQuery = parseVisualSearchQueryV1("Pokemon as food", parser);
  assert.deepEqual(foodRepresentationQuery.intent.canonical_filters.branches, []);
  assert.deepEqual(foodRepresentationQuery.intent.visual_filters.subject_classes, ["pokemon"]);
  assert.deepEqual(foodRepresentationQuery.intent.visual_filters.subject_roles, ["character_representation"]);
  assert.deepEqual(foodRepresentationQuery.intent.visual_filters.representation_forms, ["food shape"]);

  const countQuery = parseVisualSearchQueryV1("cards with three visible lightning bolts", parser);
  assert.deepEqual(countQuery.intent.visual_filters.counts, [{ label: "lightning bolts", exact_count: 3 }]);

  const unknownQuery = parseVisualSearchQueryV1("Pikachu beside a quantum accordion", parser);
  assert.deepEqual(unknownQuery.intent.unrecognized_terms, ["quantum", "accordion"]);
});

test("pose terms cannot be promoted into a second subject identity", async () => {
  const groups = fixtures();
  const engine = createVisualSearchLabEngineV1(groups);
  const parsed = parseVisualSearchQueryV1(
    "Marowak standing",
    engine.parser_index,
  );
  assert.deepEqual(
    parsed.detected_subjects.map((row) => row.normalized_name),
    ["marowak"],
  );
  assert.deepEqual(parsed.intent.visual_filters.concepts, ["standing"]);
  const result = await engine.search("Marowak standing");
  assert.equal(result.total_matches, 1);
  assert.equal(result.results[0].artwork_group_id, "group-021");
});

test("search is strict, groups artwork first, expands printings, and preserves evidence references", async () => {
  const engine = createVisualSearchLabEngineV1(fixtures());
  const found = await engine.search("Pikachu sleeping in a forest");
  assert.equal(found.version, CARD_VISUAL_SEARCH_LAB_VERSION);
  assert.equal(found.total_matches, 1);
  assert.equal(found.results[0].artwork_group_id, "group-001");
  assert.equal(found.results[0].matching_printings.length, 1);
  assert.ok(found.results[0].matched_evidence.every((row) => row.supporting_observation_ids.length));

  const count = await engine.search("three visible lightning bolts");
  assert.equal(count.total_matches, 1);
  assert.equal(count.results[0].artwork_group_id, "group-007");

  const unknown = await engine.search("Pikachu beside a quantum accordion");
  assert.equal(unknown.total_matches, 0);
  assert.equal(unknown.strict_zero_reason, "unrecognized_terms");
});

test("explicit represented-subject role does not return a physically present subject", async () => {
  const engine = createVisualSearchLabEngineV1(fixtures());
  const found = await engine.search("Pikachu plush");
  assert.equal(found.total_matches, 1);
  assert.equal(found.results[0].artwork_group_id, "group-002");
  assert.deepEqual(found.results[0].matched_subject_roles, ["character_representation"]);
  assert.ok(found.results[0].matched_evidence.some((row) => row.match_authority === "bound_subject_role_evidence" && row.term.includes("plush")));
});

test("representation forms and depicted surfaces remain strict bound constraints", async () => {
  const engine = createVisualSearchLabEngineV1(fixtures());
  const cases = [
    ["Pikachu plush", "group-002"],
    ["Pikachu pillow", "group-008"],
    ["Pikachu statue", "group-009"],
    ["Pikachu poster", "group-011"],
    ["Pikachu on a screen", "group-012"],
  ];
  for (const [query, expectedGroup] of cases) {
    const result = await engine.search(query);
    assert.equal(result.total_matches, 1, query);
    assert.equal(result.results[0].artwork_group_id, expectedGroup, query);
    assert.notEqual(result.results[0].artwork_group_id, "group-010", query);
    assert.ok(result.results[0].matched_evidence.every((row) => row.supporting_observation_ids.length), query);
  }

  const genericDepiction = await engine.search("Pikachu depicted");
  assert.equal(genericDepiction.total_matches, 3);
  assert.ok(genericDepiction.results.some((row) => row.artwork_group_id === "group-013"));
  assert.ok(genericDepiction.results.every((row) => row.artwork_group_id !== "group-014"));

  const absent = await engine.search("Pikachu logo");
  assert.equal(absent.total_matches, 0);
  assert.equal(absent.strict_zero_reason, "subject_role_evidence_not_found");
});

test("Pokemon subject-class queries cross card branches and bind subject-scoped facts", async () => {
  const engine = createVisualSearchLabEngineV1(fixtures());
  const sleeping = await engine.search("sleeping Pokemon");
  assert.equal(sleeping.total_matches, 2);
  assert.deepEqual(sleeping.results.map((row) => row.artwork_group_id).sort(), ["group-001", "group-015"]);
  assert.ok(sleeping.results.every((row) => row.matched_evidence.some((entry) => entry.match_authority === "bound_subject_role_evidence")));

  const pokemonCards = await engine.search("Pokemon cards with sleeping");
  assert.equal(pokemonCards.total_matches, 1);
  assert.equal(pokemonCards.results[0].artwork_group_id, "group-001");

  const foodShape = await engine.search("Pokemon as food");
  assert.equal(foodShape.total_matches, 2);
  assert.deepEqual(foodShape.results.map((row) => row.artwork_group_id).sort(), ["group-017", "group-018"]);
  assert.ok(foodShape.results.some((row) => row.matched_evidence.some((entry) => entry.term.includes("food shape"))));

  const iceCream = await engine.search("Pokemon as ice cream");
  assert.equal(iceCream.total_matches, 1);
  assert.equal(iceCream.results[0].artwork_group_id, "group-018");
  assert.ok(iceCream.results[0].matched_evidence.some((entry) => entry.match_authority === "explicit_role_cue_recovery"));
  assert.ok(iceCream.results.every((row) => !["group-019", "group-020"].includes(row.artwork_group_id)));
});

test("query aliases require objective multi-cue evidence and never store the alias as a fact", async () => {
  const groups = fixtures();
  assert.equal(matchVisualSearchAliasV1("halloween", groups[2]).matched, true);
  assert.equal(matchVisualSearchAliasV1("altered_state_visual_cues", groups[3]).matched, true);
  assert.equal(matchVisualSearchAliasV1("altered_state_visual_cues", groups[4]).matched, false);

  const engine = createVisualSearchLabEngineV1(groups);
  const altered = await engine.search("stoner looking cards");
  assert.equal(altered.total_matches, 1);
  assert.equal(altered.results[0].artwork_group_id, "group-004");
  assert.ok(altered.results[0].matched_evidence.every((row) => !/stoner|high|intoxicated/iu.test(row.term)));

  const halloween = await engine.search("Halloween cards");
  assert.equal(halloween.total_matches, 1);
  assert.equal(halloween.results[0].artwork_group_id, "group-003");
});

test("local HTTP API validates requests and reports sandbox boundaries", async (context) => {
  const engine = createVisualSearchLabEngineV1(fixtures());
  const imageFetch = async () => new Response(new Uint8Array([137, 80, 78, 71]), { status: 200, headers: { "content-type": "image/png" } });
  const server = createVisualSearchLabServerV1({ engine, uiHtml: "<!doctype html><title>test</title>", imageFetch });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(health.status, "ready");
  assert.equal(health.boundaries.local_only, true);
  assert.equal(health.boundaries.database_writes, false);
  const result = await fetch(`${base}/api/search?q=${encodeURIComponent("Pikachu sleeping in a forest")}`).then((response) => response.json());
  assert.equal(result.total_matches, 1);
  assert.equal((await fetch(`${base}/api/search?q=x`)).status, 400);
  const imageResponse = await fetch(`${base}/api/image?source=${encodeURIComponent("warehouse-derived/self-hosted-images-v1/card_prints/test.png")}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/png");
  assert.equal((await fetch(`${base}/api/image?source=${encodeURIComponent("https://example.com/not-allowed.png")}`)).status, 400);
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});

test("external immutable releases resolve inventory artifacts under an explicit bounded root", async (context) => {
  const artifactRoot = mkdtempSync(path.join(os.tmpdir(), "visual-search-release-"));
  context.after(() => rmSync(artifactRoot, { recursive: true, force: true }));
  const sourceRelativePath = path.join(
    "docs",
    "audits",
    "card_visual_descriptions",
    "source.json",
  );
  const sourcePath = path.join(artifactRoot, sourceRelativePath);
  const inventoryPath = path.join(artifactRoot, "corpus_valid_candidates.jsonl");
  mkdirSync(path.dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    JSON.stringify({
      card_print_id: "print-external",
      image_source_key:
        "warehouse-derived/self-hosted-images-v1/card_prints/external.png",
      image_sha256: "a".repeat(64),
    }),
  );
  writeFileSync(
    inventoryPath,
    `${JSON.stringify({
      card_print_id: "print-external",
      source_artifact_path: sourceRelativePath.replaceAll("\\", "/"),
    })}\n`,
  );

  const args = parseCardVisualSearchLabArgsV1([
    `--artifact-root=${artifactRoot}`,
  ]);
  assert.equal(args.artifactRoot, artifactRoot);
  const resolver = await createVisualSearchImageResolverV1(inventoryPath, {
    artifactRoot,
  });
  const images = await resolver.resolve(["print-external"]);
  assert.equal(
    images.get("print-external").image_source_key,
    "warehouse-derived/self-hosted-images-v1/card_prints/external.png",
  );
  assert.equal(
    resolveVisualSearchSourceArtifactPathV1(sourceRelativePath, artifactRoot),
    sourcePath,
  );
  assert.equal(
    resolveVisualSearchSourceArtifactPathV1(sourcePath, artifactRoot),
    sourcePath,
  );
  assert.throws(
    () =>
      resolveVisualSearchSourceArtifactPathV1(
        path.join("..", "outside.json"),
        artifactRoot,
    ),
    /escapes the configured artifact root/u,
  );
  assert.throws(
    () =>
      resolveVisualSearchSourceArtifactPathV1(
        path.resolve(artifactRoot, "..", "outside.json"),
        artifactRoot,
      ),
    /escapes the configured artifact root/u,
  );
});

test("lab implementation has no provider, database, embedding, holdout, or persistent-index path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_lab_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/iu);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store/iu);
  assert.doesNotMatch(source, /holdout_queries|evaluation_holdout|judgment_submissions/iu);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/iu);
});
