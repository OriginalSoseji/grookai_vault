import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY,
  CARD_VISUAL_ARTWORK_GROUPING_VERSION,
  groupArtworkCandidatesV1,
  normalizeArtworkCanonicalNameV1,
  parseArtworkGroupingArgsV1,
  reconcileArtworkGroupingV1,
} from "../../backend/card_descriptions/card_visual_artwork_grouping_v1.mjs";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function decision(id, overrides = {}) {
  return {
    card_print_id: id,
    gv_id: `GV-${id}`,
    name: "Pikachu",
    prompt_branch: "pokemon",
    tier: "A",
    search_eligible: true,
    projection_guard_keys: [],
    source_fact_graph_sha256: `fact-${id}`,
    source_generated_row_sha256: `row-${id}`,
    decision_sha256: `decision-${id}`,
    energy_card_detected: false,
    confidence: { image_quality: 0.95 },
    ...overrides,
  };
}

function inventory(id, imageSha256 = HASH_A, overrides = {}) {
  return {
    card_print_id: id,
    gv_id: `GV-${id}`,
    name: "Pikachu",
    prompt_branch: "pokemon",
    outcome_class: "valid",
    image_sha256: imageSha256,
    ...overrides,
  };
}

test("grouping arguments remain pinned to locked eligibility V1.4", () => {
  const args = parseArtworkGroupingArgsV1([]);
  assert.match(args.eligibilityDir, /card_visual_search_eligibility_v1_4/);
  assert.match(args.eligibilityDir, /eligibility_a206881f5a0b$/);
  assert.equal(CARD_VISUAL_ARTWORK_GROUPING_VERSION, "CARD_VISUAL_ARTWORK_GROUPING_V1");
  assert.equal(CARD_VISUAL_ARTWORK_GROUPING_AUTHORITY, "exact_image_hash_same_canonical_name_and_branch");
});

test("normalization preserves identity tokens while normalizing case and whitespace", () => {
  assert.equal(normalizeArtworkCanonicalNameV1("  Erika's   Pikachu ex  "), "erika's pikachu ex");
  assert.notEqual(normalizeArtworkCanonicalNameV1("Pikachu ex"), normalizeArtworkCanonicalNameV1("Pikachu"));
});

test("exact image, canonical name, and branch merge with stable member ordering", () => {
  const decisions = [decision("print-b"), decision("print-a")];
  const inventories = [inventory("print-a"), inventory("print-b")];
  const first = groupArtworkCandidatesV1(decisions, inventories);
  const second = groupArtworkCandidatesV1([...decisions].reverse(), [...inventories].reverse());

  assert.equal(first.groups.length, 1);
  assert.equal(first.groups[0].member_count, 2);
  assert.equal(first.groups[0].membership_kind, "shared_exact_image");
  assert.deepEqual(first.groups[0].member_card_print_ids, ["print-a", "print-b"]);
  assert.equal(first.groups[0].artwork_group_id, second.groups[0].artwork_group_id);
  assert.equal(first.groups[0].artwork_group_hash, second.groups[0].artwork_group_hash);
  assert.deepEqual(first.memberships.map((row) => row.card_print_id), ["print-a", "print-b"]);
});

test("same name with different image hashes remains split", () => {
  const decisions = [decision("print-a"), decision("print-b")];
  const grouped = groupArtworkCandidatesV1(decisions, [inventory("print-a", HASH_A), inventory("print-b", HASH_B)]);
  assert.equal(grouped.groups.length, 2);
  assert.equal(grouped.memberships.length, 2);
  assert.equal(grouped.conflicts.length, 0);
  assert.ok(grouped.groups.every((row) => row.membership_kind === "singleton"));
});

test("one image hash spanning names or branches becomes an explicit conflict", () => {
  const decisions = [
    decision("print-a", { name: "Pikachu" }),
    decision("print-b", { name: "Raichu" }),
    decision("print-c", { name: "Pikachu", prompt_branch: "trainer" }),
  ];
  const inventories = decisions.map((row) => inventory(row.card_print_id, HASH_A, { name: row.name, prompt_branch: row.prompt_branch }));
  const grouped = groupArtworkCandidatesV1(decisions, inventories);
  assert.equal(grouped.groups.length, 0);
  assert.equal(grouped.memberships.length, 0);
  assert.equal(grouped.conflicts.length, 3);
  assert.ok(grouped.conflicts.every((row) => row.conflict_type === "image_hash_cross_identity_collision"));
  assert.deepEqual(grouped.conflicts[0].collision_card_print_ids, ["print-a", "print-b", "print-c"]);
});

test("Tier B and projection guards propagate to a shared group", () => {
  const decisions = [
    decision("print-a"),
    decision("print-b", { tier: "B", projection_guard_keys: ["subject_semantics", "environment_setting"] }),
  ];
  const grouped = groupArtworkCandidatesV1(decisions, [inventory("print-a"), inventory("print-b")]);
  assert.equal(grouped.groups[0].eligibility_tier, "B");
  assert.deepEqual(grouped.groups[0].projection_guard_keys, ["environment_setting", "subject_semantics"]);
});

test("Tier C is excluded and an upstream eligible Energy row is conflict-routed", () => {
  const decisions = [
    decision("print-a", { tier: "C", search_eligible: false }),
    decision("print-b", { prompt_branch: "energy", energy_card_detected: true }),
  ];
  const grouped = groupArtworkCandidatesV1(decisions, [inventory("print-a"), inventory("print-b", HASH_B, { prompt_branch: "energy" })]);
  assert.equal(grouped.eligible.length, 1);
  assert.equal(grouped.memberships.length, 0);
  assert.equal(grouped.conflicts[0].conflict_type, "energy_card_not_groupable");
  assert.equal(reconcileArtworkGroupingV1(grouped, decisions).reconciled, true);
});

test("incomplete source evidence is conflict-routed and fully reconciles", () => {
  const decisions = [decision("print-a", { source_fact_graph_sha256: null })];
  const grouped = groupArtworkCandidatesV1(decisions, [inventory("print-a")]);
  assert.equal(grouped.conflicts[0].conflict_type, "incomplete_grouping_source_evidence");
  const reconciliation = reconcileArtworkGroupingV1(grouped, decisions);
  assert.equal(reconciliation.reconciled, true);
  assert.equal(reconciliation.counts.eligible_rows, 1);
  assert.equal(reconciliation.counts.conflict_rows, 1);
});

test("reconciliation detects duplicate group identifiers", () => {
  const decisions = [decision("print-a")];
  const grouped = groupArtworkCandidatesV1(decisions, [inventory("print-a")]);
  grouped.groups.push({ ...grouped.groups[0] });
  const reconciliation = reconcileArtworkGroupingV1(grouped, decisions);
  assert.equal(reconciliation.reconciled, false);
  assert.ok(reconciliation.findings.includes("duplicate_artwork_groups:1"));
});

test("grouping implementation has no provider, database, embedding, or projection integration", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_artwork_grouping_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store|writeSearchProjection/i);
  assert.match(source, /provider_calls:\s*false/);
  assert.match(source, /database_writes:\s*false/);
  assert.match(source, /search_projections:\s*false/);
});
