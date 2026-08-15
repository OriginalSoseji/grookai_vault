import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSt01PrintingImageMutationPlanV1,
  evaluateOnePieceSt01PrintingImageAttributionV1,
  evaluateOnePieceSt01PrintingImageTransactionReadbackV1,
  evaluateOnePieceSt01PrintingImageZeroResidueV1,
  expectedOnePieceSt01PrintingImageAttributionV1,
  ONE_PIECE_ST01_POINTER_FORBIDDEN_COLUMNS,
  ONE_PIECE_ST01_POINTER_UPDATE_COLUMNS,
  ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS,
  validateOnePieceSt01PrintingImageMutationPlanV1,
} from "../../backend/pricing/one_piece_st01_printing_image_mutation_plan_v1.mjs";

const root =
  "docs/audits/pricing/one_piece_st01_printing_image_readiness_v1/identity_source_candidate_v1";
const paths = {
  evidencePlan: `${root}/evidence_plan.json`,
  readinessRows: `${root}/readiness_rows.jsonl`,
  readinessSummary: `${root}/summary.json`,
  productionReadback: `${root}/production_readback.json`,
};

function lines(body) {
  return body.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function fixturePlan() {
  const bodies = Object.fromEntries(await Promise.all(
    Object.entries(paths).map(async ([key, file]) => [
      key, await fs.readFile(file, "utf8"),
    ]),
  ));
  return buildOnePieceSt01PrintingImageMutationPlanV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: ONE_PIECE_ST01_PRINTING_IMAGE_MUTATION_PINNED_INPUTS,
    evidencePlan: JSON.parse(bodies.evidencePlan),
    readinessRows: lines(bodies.readinessRows),
    readinessSummary: JSON.parse(bodies.readinessSummary),
    productionReadback: JSON.parse(bodies.productionReadback),
  });
}

test("offline plan freezes exactly 17 updates, 14 children, and 14 mappings", async () => {
  const plan = await fixturePlan();
  assert.equal(validateOnePieceSt01PrintingImageMutationPlanV1(plan).valid, true);
  assert.deepEqual(plan.counts, {
    parent_pointer_updates: 17,
    normal_child_inserts: 14,
    external_printing_mapping_inserts: 14,
    foil_taxonomy_blockers: 3,
    child_image_pointer_writes: 0,
  });
  assert.equal(Object.hasOwn(plan, "mode"), false);
  assert.equal(Object.hasOwn(plan, "approval_env"), false);
  assert.equal(plan.boundaries.database_access, false);
  assert.equal(plan.boundaries.durable_database_writes, false);
});

test("parent pointer updates preserve identity and exact-child deferral", async () => {
  const plan = await fixturePlan();
  for (const row of plan.mutation_payload.parent_pointer_updates) {
    assert.deepEqual(row.allowed_update_columns,
      [...ONE_PIECE_ST01_POINTER_UPDATE_COLUMNS]);
    assert.deepEqual(row.forbidden_update_columns,
      [...ONE_PIECE_ST01_POINTER_FORBIDDEN_COLUMNS]);
    assert.equal(row.expected_before.image_source, null);
    assert.equal(row.expected_before.image_path, null);
    assert.equal(row.expected_before.image_url, null);
    assert.equal(row.expected_before.image_alt_url, null);
    assert.equal(row.proposed_values.image_source,
      "identity");
    assert.equal(row.proposed_values.image_status, "exact");
    assert.equal(row.proposed_values.data_quality_flags.image_pointer_deferred,
      false);
    assert.equal(row.proposed_values.data_quality_flags
      .exact_printing_children_deferred, true);
    assert.equal(row.physical_finish_claim, false);
    assert.equal(row.storage_write_required, false);
  }
});

test("normal children have no image claims and foil rows have no mutations", async () => {
  const plan = await fixturePlan();
  for (const child of plan.mutation_payload.normal_child_inserts) {
    assert.equal(child.finish_key, "normal");
    assert.equal(child.is_provisional, false);
    for (const field of ["image_source", "image_path", "image_url",
      "image_alt_url", "image_status", "image_note"]) {
      assert.equal(child[field], null);
    }
  }
  assert.deepEqual(plan.mutation_payload.foil_taxonomy_blockers.map((row) =>
    row.card_number), ["ST01-001", "ST01-012", "ST01-013"]);
  for (const row of plan.mutation_payload.foil_taxonomy_blockers) {
    assert.equal(row.source_finish_subtype, "foil");
    assert.equal(row.proposed_child_row, null);
    assert.equal(row.proposed_mapping_row, null);
  }
});

test("plan validation fails closed on scope, image, foil, or fingerprint drift", async () => {
  const plan = await fixturePlan();
  for (const mutate of [
    (copy) => copy.mutation_payload.parent_pointer_updates.pop(),
    (copy) => { copy.mutation_payload.normal_child_inserts[0].image_path = "x"; },
    (copy) => { copy.mutation_payload.parent_pointer_updates[0]
      .proposed_values.image_source = "official_one_piece_card_game"; },
    (copy) => { copy.mutation_payload.foil_taxonomy_blockers[0]
      .proposed_child_row = {}; },
    (copy) => { copy.boundaries.durable_database_writes = true; },
    (copy) => { copy.rollback_contract.transaction_must_rollback = false; },
  ]) {
    const copy = structuredClone(plan);
    mutate(copy);
    assert.equal(validateOnePieceSt01PrintingImageMutationPlanV1(copy).valid,
      false);
  }
});

test("rollback attribution accepts only the exact three-table footprint", () => {
  const expected = expectedOnePieceSt01PrintingImageAttributionV1();
  const actual = expected.map((row) => ({
    table_name: row.table_name,
    inserted: row.inserted,
    updated: row.updated,
    deleted: row.deleted,
    hot_updated: row.table_name === "card_prints" ? 4 : 0,
  }));
  assert.deepEqual(evaluateOnePieceSt01PrintingImageAttributionV1(actual), []);
  const updateDrift = structuredClone(actual);
  updateDrift[0].updated = 18;
  assert.deepEqual(evaluateOnePieceSt01PrintingImageAttributionV1(updateDrift),
    ["attributable_write_mismatch:card_prints"]);
  const hotDrift = structuredClone(actual);
  hotDrift[0].hot_updated = 18;
  assert.deepEqual(evaluateOnePieceSt01PrintingImageAttributionV1(hotDrift),
    ["attributable_write_mismatch:card_prints"]);
  const extra = [...actual, {
    table_name: "card_prices", inserted: 1, updated: 0, deleted: 0,
    hot_updated: 0,
  }];
  assert.deepEqual(evaluateOnePieceSt01PrintingImageAttributionV1(extra),
    ["unexpected_attributable_write:card_prices"]);
});

test("live identity-source rollback attribution replays with HOT updates", async () => {
  const proof = JSON.parse(await fs.readFile(
    "docs/audits/pricing/one_piece_st01_printing_image_rollback_canary_v1/production_rollback_identity_source_v1/transaction_proof.json",
    "utf8",
  ));
  assert.equal(proof.mutation_counts.parent_pointer_updates, 17);
  assert.equal(proof.mutation_counts.normal_child_inserts, 14);
  assert.equal(proof.mutation_counts.external_printing_mapping_inserts, 14);
  assert.equal(Number(proof.attributable_writes.find((row) =>
    row.table_name === "card_prints")?.hot_updated), 4);
  assert.deepEqual(evaluateOnePieceSt01PrintingImageAttributionV1(
    proof.attributable_writes,
  ), []);
});

test("transaction readback must match the exact proposed state", async () => {
  const plan = await fixturePlan();
  const readback = structuredClone(
    plan.rollback_contract.expected_transaction_readback,
  );
  assert.deepEqual(evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
    plan, readback,
  }), []);
  readback.normal_child_rows[0].finish_key = "holo";
  assert.deepEqual(evaluateOnePieceSt01PrintingImageTransactionReadbackV1({
    plan, readback,
  }), ["transaction_readback_mismatch:normal_child_rows"]);
});

test("post-rollback proof requires the exact zero-residue baseline", async () => {
  const plan = await fixturePlan();
  const readback = structuredClone(
    plan.rollback_contract.expected_post_rollback_zero_residue,
  );
  assert.deepEqual(evaluateOnePieceSt01PrintingImageZeroResidueV1({
    plan, readback,
  }), []);
  readback.child_rows.push({ id: "residue" });
  assert.deepEqual(evaluateOnePieceSt01PrintingImageZeroResidueV1({
    plan, readback,
  }), ["post_rollback_residue:child_rows"]);
});

test("offline generator has no database, environment, Storage, or execution path", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_printing_image_mutation_plan_v1.mjs",
    "utf8",
  );
  assert.doesNotMatch(source,
    /from ["']pg["']|dotenv|marketEvidenceDbUrl|createClient|SUPABASE_/);
  assert.doesNotMatch(source, /--apply|approval_env|client\.query|\.upload\(|\.remove\(/i);
  assert.doesNotMatch(source,
    /\binsert\s+into\s+public\.|\bupdate\s+public\.|\bdelete\s+from\s+public\./i);
});
