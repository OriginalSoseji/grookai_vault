import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSt01PromotionPlanV1,
  evaluateOnePieceSt01AttributableWritesV1,
  evaluateOnePieceSt01CanaryReadbackV1,
  evaluateOnePieceSt01PromotionPreflightV1,
  expectedOnePieceSt01AttributableWritesV1,
  expectedOnePieceSt01StagingBindingsV1,
  ONE_PIECE_ST01_IDENTITY_DOMAIN,
  ONE_PIECE_ST01_PINNED_INPUTS,
  validateOnePieceSt01PromotionPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";

const stagedPath = "docs/audits/pricing/one_piece_canonical_import_durable_payload_apply_v1/production_apply_v1_independent_verify/readback.json";
const readinessPath = "docs/audits/pricing/one_piece_st01_language_and_image_readiness_v1/st01_group_3189_v1/readiness_rows.jsonl";
const storagePath = "docs/audits/pricing/one_piece_st01_storage_permanent_readback_v1/st01_18_objects_v1/readback_rows.jsonl";
const foundationPath = "docs/audits/pricing/one_piece_canonical_catalog_foundation_apply_v1/independent_post_apply_v1/summary.json";

function lines(value) {
  return value.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function fixturePlan() {
  const [staged, readiness, storage, foundation] = await Promise.all([
    fs.readFile(stagedPath, "utf8"), fs.readFile(readinessPath, "utf8"),
    fs.readFile(storagePath, "utf8"), fs.readFile(foundationPath, "utf8"),
  ]);
  return buildOnePieceSt01PromotionPlanV1({
    repository: { commit_sha: "a".repeat(40), branch: "agent/one-piece-ingestion-readiness-v1", tracked_worktree_clean: true },
    inputHashes: ONE_PIECE_ST01_PINNED_INPUTS,
    stagedReadback: JSON.parse(staged),
    readinessRows: lines(readiness),
    storageRows: lines(storage),
    foundationSummary: JSON.parse(foundation),
  });
}

test("ST-01 plan contains only the 17 numbered canonical parents", async () => {
  const plan = await fixturePlan();
  assert.deepEqual(plan.counts, {
    sets: 1, card_prints: 17, card_print_identity: 17,
    card_print_identity_source_evidence: 17, external_mappings: 17,
  });
  assert.equal(validateOnePieceSt01PromotionPlanV1(plan).valid, true);
  assert.deepEqual(plan.payload.numbered_cards.map((row) => row.card_number),
    Array.from({ length: 17 }, (_, index) => `ST01-${String(index + 1).padStart(3, "0")}`));
  assert.equal(plan.payload.numbered_cards.some((row) => row.card_number === null), false);
});

test("all identities and mappings are traceable to staged and image evidence", async () => {
  const plan = await fixturePlan();
  for (const row of plan.payload.numbered_cards) {
    assert.equal(row.identity.identity_domain, ONE_PIECE_ST01_IDENTITY_DOMAIN);
    assert.equal(row.card_print.image_url, null);
    assert.equal(row.card_print.image_alt_url, null);
    assert.equal(row.source_evidence.evidence_payload.self_hosted_image_evidence.pointer_authorized, false);
    assert.match(row.image_sha256, /^[0-9a-f]{64}$/);
    assert.equal(row.external_mapping.external_id, String(row.source_product_id));
    assert.equal(row.external_mapping.card_print_id, row.card_print.id);
  }
});

test("plan validation fails closed on identity, image pointer, and scope drift", async () => {
  const plan = await fixturePlan();
  for (const mutate of [
    (copy) => { copy.payload.numbered_cards[0].identity.identity_domain = "pokemon_eng_standard"; },
    (copy) => { copy.payload.numbered_cards[0].card_print.image_url = "https://example.test/card.png"; },
    (copy) => { copy.payload.numbered_cards.pop(); },
  ]) {
    const copy = structuredClone(plan);
    mutate(copy);
    assert.equal(validateOnePieceSt01PromotionPlanV1(copy).valid, false);
  }
});

test("promotion implementation has no durable writer or downstream lane", async () => {
  const source = await fs.readFile(
    "backend/pricing/one_piece_st01_canonical_promotion_v1.mjs", "utf8");
  assert.doesNotMatch(source, /insert into public\./i);
  assert.doesNotMatch(source, /\bcommit\b/i);
  assert.doesNotMatch(source, /card_printings/i);
  assert.doesNotMatch(source, /market_price|vault_items|sealed_product/i);
});

test("clean read-only preflight passes and collisions fail closed", async () => {
  const plan = await fixturePlan();
  const snapshot = {
    transaction_read_only: true,
    foundation: {
      game_count: 1, game_id: "4f504300-0000-4000-8000-000000000001",
      release_count: 1, release_status: "hidden",
      release_version: "ONE_PIECE_CANONICAL_CATALOG_FOUNDATION_V1",
      anon_visible: false, authenticated_visible: false, service_visible: false,
      migration_count: 1, one_piece_set_count: 0, one_piece_card_count: 0,
    },
    schema: {
      sets: true, card_prints: true, card_print_identity: true,
      card_print_identity_source_evidence: true, external_mappings: true,
    },
    staging_rows: expectedOnePieceSt01StagingBindingsV1(plan),
    collisions: { set_identity: 0, card_identity: 0, print_identity: 0,
      source_evidence: 0, external_mapping: 0 },
    blocking_pids: [],
  };
  assert.equal(evaluateOnePieceSt01PromotionPreflightV1({ plan, snapshot }).valid, true);
  snapshot.collisions.external_mapping = 1;
  assert.equal(evaluateOnePieceSt01PromotionPreflightV1({ plan, snapshot }).valid, false);
});

test("rollback transaction accepts only exact attributed rows", async () => {
  const expected = expectedOnePieceSt01AttributableWritesV1();
  const rows = Object.entries(expected).map(([table_name, inserted]) => ({
    table_name, inserted, updated: 0, deleted: 0, hot_updated: 0,
  }));
  assert.deepEqual(evaluateOnePieceSt01AttributableWritesV1(rows), []);
  rows[0].inserted += 1;
  assert.notDeepEqual(evaluateOnePieceSt01AttributableWritesV1(rows), []);
});

test("transaction readback must remain hidden and exact", async () => {
  const plan = await fixturePlan();
  const readback = { ...plan.counts, release_status: "hidden",
    anon_visible: false, authenticated_visible: false, service_visible: false };
  assert.deepEqual(evaluateOnePieceSt01CanaryReadbackV1({ plan, readback }), []);
  readback.card_prints = 16;
  assert.notDeepEqual(evaluateOnePieceSt01CanaryReadbackV1({ plan, readback }), []);
});

test("rollback canary has no commit or durable apply mode", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_canonical_promotion_rollback_canary_v1.mjs",
    "utf8");
  assert.doesNotMatch(source, /client\.query\(["']commit["']\)/i);
  assert.doesNotMatch(source, /--apply|mode\s*===\s*["']apply["']/i);
  assert.match(source, /client\.query\(["']rollback["']\)/i);
});
