import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION,
  buildArtworkGroupingAuditV1,
  parseArtworkGroupingAuditArgsV1,
} from "../../backend/card_descriptions/card_visual_artwork_grouping_audit_v1.mjs";
import { sha256JsonV1 } from "../../backend/card_descriptions/card_visual_corpus_v1_inventory.mjs";

function fixtureGroup(id, name, imageHash, memberIds) {
  const group = {
    artwork_group_id: id,
    representative_card_print_id: memberIds[0],
    member_count: memberIds.length,
    membership_kind: memberIds.length === 1 ? "singleton" : "shared_exact_image",
    normalized_name: name,
    name_snapshot: name,
    prompt_branch: "pokemon",
    source_image_sha256: imageHash,
    eligibility_tier: "A",
    projection_guard_keys: [],
    grouping_authority: "exact_image_hash_same_canonical_name_and_branch",
    grouping_evidence: { image_sha256: imageHash, normalized_name: name, prompt_branch: "pokemon" },
    member_card_print_ids: memberIds,
    source_fact_graph_hashes: ["fact"],
    source_generated_row_hashes: ["row"],
  };
  group.artwork_group_hash = sha256JsonV1(group);
  return group;
}

function fixtureId(name, imageHash) {
  return `cvag_${sha256JsonV1({ image_sha256: imageHash, normalized_name: name, prompt_branch: "pokemon" }).slice(0, 24)}`;
}

function membership(group, cardPrintId) {
  return {
    artwork_group_id: group.artwork_group_id,
    card_print_id: cardPrintId,
    prompt_branch: group.prompt_branch,
    source_image_sha256: group.source_image_sha256,
    grouping_evidence: { normalized_name: group.normalized_name },
  };
}

test("audit arguments remain pinned to the reconciled V1.1 grouping", () => {
  const args = parseArtworkGroupingAuditArgsV1([]);
  assert.match(args.groupingDir, /card_visual_artwork_grouping_v1_1/);
  assert.match(args.groupingDir, /grouping_424dbd1f2469$/);
  assert.equal(args.sampleSize, 25);
  assert.equal(CARD_VISUAL_ARTWORK_GROUPING_AUDIT_VERSION, "CARD_VISUAL_ARTWORK_GROUPING_AUDIT_V1");
});

test("audit passes exact shared artwork, singleton, and same-name image splits", () => {
  const imageA = "a".repeat(64);
  const imageB = "b".repeat(64);
  const shared = fixtureGroup(fixtureId("pikachu", imageA), "pikachu", imageA, ["print-a", "print-b"]);
  const split = fixtureGroup(fixtureId("pikachu", imageB), "pikachu", imageB, ["print-c"]);
  const memberships = [membership(shared, "print-a"), membership(shared, "print-b"), membership(split, "print-c")];
  const result = buildArtworkGroupingAuditV1({ groups: [shared, split], memberships, conflicts: [], sampleSize: 25 });
  assert.equal(result.passed, true);
  assert.equal(result.counts.multi_member_groups, 1);
  assert.equal(result.counts.singleton_groups, 1);
  assert.equal(result.counts.same_name_different_image_candidates, 1);
  assert.deepEqual(result.sampled_cases_by_category, { multi_member_group: 1, same_name_different_image_split: 1, singleton_group: 1 });
});

test("audit fails a mutated group hash and member count", () => {
  const image = "a".repeat(64);
  const group = fixtureGroup(fixtureId("pikachu", image), "pikachu", image, ["print-a"]);
  group.member_count = 2;
  const result = buildArtworkGroupingAuditV1({ groups: [group], memberships: [membership(group, "print-a")], conflicts: [], sampleSize: 1 });
  assert.equal(result.passed, false);
  assert.ok(result.findings.some((row) => row.startsWith("group_hash_mismatch:")));
  assert.ok(result.findings.some((row) => row.startsWith("member_count_mismatch:")));
});

test("audit implementation has no provider, database, embedding, or projection integration", () => {
  const source = readFileSync(new URL("../../backend/card_descriptions/card_visual_artwork_grouping_audit_v1.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /openai\.com|responses\.create|OPENAI_API_KEY/);
  assert.doesNotMatch(source, /SUPABASE_DB_URL|DATABASE_URL|POSTGRES_URL|createClient\(/);
  assert.doesNotMatch(source, /insert\s+into|update\s+public\.|delete\s+from/i);
  assert.doesNotMatch(source, /embeddings?\.create|text-embedding|vector_store|writeSearchProjection/i);
  assert.match(source, /human_visual_approval:\s*false/);
});
