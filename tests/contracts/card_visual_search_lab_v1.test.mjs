import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_SEARCH_LAB_VERSION,
  buildVisualSearchParserIndexV1,
  createVisualSearchLabEngineV1,
  createVisualSearchLabServerV1,
  matchVisualSearchAliasV1,
  parseVisualSearchQueryV1,
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
      entry("represented-pikachu", "character_representation: Pikachu", "subject", { source_type: "subject_role", subject_role: "character_representation" }),
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
  assert.deepEqual(roleQuery.intent.canonical_filters.subjects, []);
  assert.deepEqual(parseVisualSearchQueryV1("Pikachu-shaped pillow", parser).intent.unrecognized_terms, []);

  const trainerQuery = parseVisualSearchQueryV1("trainers wearing gloves", parser);
  assert.deepEqual(trainerQuery.intent.canonical_filters.branches, ["trainer"]);
  assert.deepEqual(trainerQuery.intent.visual_filters.concepts, ["glove"]);

  const countQuery = parseVisualSearchQueryV1("cards with three visible lightning bolts", parser);
  assert.deepEqual(countQuery.intent.visual_filters.counts, [{ label: "lightning bolts", exact_count: 3 }]);

  const unknownQuery = parseVisualSearchQueryV1("Pikachu beside a quantum accordion", parser);
  assert.deepEqual(unknownQuery.intent.unrecognized_terms, ["quantum", "accordion"]);
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

test("lab implementation has no provider, database, embedding, holdout, or persistent-index path", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_search_lab_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/iu);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store/iu);
  assert.doesNotMatch(source, /holdout_queries|evaluation_holdout|judgment_submissions/iu);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/iu);
});
