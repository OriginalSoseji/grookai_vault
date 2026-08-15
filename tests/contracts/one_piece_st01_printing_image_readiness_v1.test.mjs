import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  buildOnePieceSt01PrintingImageEvidenceV1,
  evaluateOnePieceSt01PrintingImageReadinessV1,
  ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS,
  ONE_PIECE_ST01_REQUIRED_PARENT_IMAGE_COLUMNS,
  ONE_PIECE_ST01_REQUIRED_PRINTING_COLUMNS,
  ONE_PIECE_ST01_REQUIRED_PRINTING_MAPPING_COLUMNS,
} from "../../backend/pricing/one_piece_st01_printing_image_readiness_v1.mjs";

const paths = {
  promotionPlan: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/frozen_plan_v1/plan.json",
  sourceReadback: "docs/audits/pricing/one_piece_canonical_import_durable_payload_apply_v1/production_apply_v1_independent_verify/readback.json",
  storageRows: "docs/audits/pricing/one_piece_st01_storage_permanent_readback_v1/st01_18_objects_v1/readback_rows.jsonl",
  canonicalReadback: "docs/audits/pricing/one_piece_st01_canonical_promotion_v1/independent_post_apply_v1/fresh_readback.json",
};

function lines(body) {
  return body.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function evidencePlan() {
  const [promotion, source, storage, canonical] = await Promise.all([
    fs.readFile(paths.promotionPlan, "utf8"),
    fs.readFile(paths.sourceReadback, "utf8"),
    fs.readFile(paths.storageRows, "utf8"),
    fs.readFile(paths.canonicalReadback, "utf8"),
  ]);
  return buildOnePieceSt01PrintingImageEvidenceV1({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
      tracked_worktree_clean: true,
    },
    inputHashes: ONE_PIECE_ST01_PRINTING_IMAGE_PINNED_INPUTS,
    promotionPlan: JSON.parse(promotion),
    sourceReadback: JSON.parse(source),
    storageRows: lines(storage),
    canonicalReadback: JSON.parse(canonical),
  });
}

function cleanSnapshot(plan) {
  return {
    schema: {
      card_prints: [...ONE_PIECE_ST01_REQUIRED_PARENT_IMAGE_COLUMNS],
      card_printings: [...ONE_PIECE_ST01_REQUIRED_PRINTING_COLUMNS],
      external_printing_mappings:
        [...ONE_PIECE_ST01_REQUIRED_PRINTING_MAPPING_COLUMNS],
    },
    finish_keys: [
      { key: "normal", label: "Normal", is_active: true, meta: {} },
      { key: "foil", label: "Foil", is_active: true,
        meta: { game_scope: ["mtg"] } },
      { key: "holo", label: "Holo", is_active: true, meta: {} },
    ],
    parents: plan.rows.map((row) => ({
      id: row.parent_card_print_id,
      gv_id: row.parent_gv_id,
      name: row.name,
      number: row.card_number,
      image_source: null,
      image_path: null,
      image_url: null,
      image_alt_url: null,
      image_status: null,
      image_note: null,
      data_quality_flags: {
        image_pointer_deferred: true,
        exact_printing_children_deferred: true,
      },
    })),
    parent_mappings: plan.rows.map((row) => ({
      card_print_id: row.parent_card_print_id,
      source: "tcgplayer",
      external_id: String(row.source_product_id),
      active: true,
      meta: {},
    })),
    existing_children: [],
    existing_printing_mappings: [],
    source_price_lanes: plan.rows.map((row) => ({
      source_product_id: row.source_product_id,
      ...row.source_finish_evidence,
    })),
    collisions: {
      child_id: 0,
      printing_gv_id: 0,
      parent_finish: 0,
      printing_mapping_id: 0,
      printing_mapping_source: 0,
      image_path_reference: 0,
    },
    release: {
      release_status: "hidden",
      anon_visible: false,
      authenticated_visible: false,
      service_visible: false,
    },
    blocking_pids: [],
    transaction_read_only: true,
  };
}

test("ST-01 evidence separates 14 normal candidates from 3 foil blockers", async () => {
  const plan = await evidencePlan();
  const normal = plan.rows.filter((row) =>
    row.child_printing_readiness.proposed_row !== null);
  const foil = plan.rows.filter((row) =>
    row.child_printing_readiness.status === "blocked_finish_taxonomy");
  assert.equal(plan.rows.length, 17);
  assert.equal(normal.length, 14);
  assert.equal(foil.length, 3);
  assert.deepEqual(foil.map((row) => row.card_number),
    ["ST01-001", "ST01-012", "ST01-013"]);
  assert.equal(new Set(normal.map((row) =>
    row.child_printing_readiness.proposed_row.id)).size, 14);
  assert.equal(normal.every((row) =>
    row.child_printing_readiness.proposed_row.printing_gv_id.endsWith("-STD")),
  true);
});

test("official image evidence proposes parent artwork only", async () => {
  const plan = await evidencePlan();
  for (const row of plan.rows) {
    assert.equal(row.parent_artwork_pointer_readiness.evidence_role,
      "exact_parent_artwork_identity");
    assert.equal(row.parent_artwork_pointer_readiness.does_not_prove_physical_finish,
      true);
    assert.equal(row.parent_artwork_pointer_readiness.proposed_values.image_status,
      "exact");
    assert.equal(row.parent_artwork_pointer_readiness.proposed_values.image_source,
      "identity");
    assert.match(row.parent_artwork_pointer_readiness.proposed_values.image_path,
      /^warehouse-derived\/self-hosted-images-v1\/card_prints\/one-piece\/st01\//);
    assert.equal(row.child_image_policy.proposed_child_image_fields, null);
    assert.equal(row.child_printing_readiness.proposed_row?.image_path ?? null, null);
  }
});

test("clean live snapshot passes with the expected taxonomy blockers", async () => {
  const plan = await evidencePlan();
  const result = evaluateOnePieceSt01PrintingImageReadinessV1({
    evidencePlan: plan,
    snapshot: cleanSnapshot(plan),
  });
  assert.equal(result.valid, true, result.findings.join(","));
  assert.deepEqual(result.counts, {
    selected_parents: 17,
    parent_artwork_pointers_ready: 17,
    normal_child_printings_ready: 14,
    external_printing_mappings_ready: 14,
    foil_children_blocked_by_taxonomy: 3,
    child_image_pointers_ready: 0,
  });
});

test("schema, evidence drift, collisions, and visibility fail closed", async () => {
  const plan = await evidencePlan();
  for (const mutate of [
    (snapshot) => snapshot.schema.card_printings.pop(),
    (snapshot) => { snapshot.source_price_lanes[0].subtype_name_normalized = "normal"; },
    (snapshot) => { snapshot.collisions.child_id = 1; },
    (snapshot) => { snapshot.release.authenticated_visible = true; },
    (snapshot) => { snapshot.existing_children.push({ id: "unexpected" }); },
    (snapshot) => { snapshot.parents[0].image_path = "already/present.png"; },
  ]) {
    const snapshot = cleanSnapshot(plan);
    mutate(snapshot);
    const result = evaluateOnePieceSt01PrintingImageReadinessV1({
      evidencePlan: plan,
      snapshot,
    });
    assert.equal(result.valid, false);
  }
});

test("One Piece foil remains blocked and is never translated to holo", async () => {
  const plan = await evidencePlan();
  const serialized = JSON.stringify(plan);
  assert.doesNotMatch(serialized, /"subtype_name_normalized":"holo"/);
  assert.equal(plan.rows.filter((row) =>
    row.source_finish_evidence.subtype_name_normalized === "foil").every((row) =>
      row.child_printing_readiness.proposed_row === null), true);

  const snapshot = cleanSnapshot(plan);
  snapshot.finish_keys.find((row) => row.key === "foil").meta.game_scope.push(
    "one_piece");
  const result = evaluateOnePieceSt01PrintingImageReadinessV1({
    evidencePlan: plan,
    snapshot,
  });
  assert.equal(result.valid, false);
  assert.ok(result.findings.includes("foil_unexpectedly_authorized_for_one_piece"));
});

test("production reconciler is read-only and has no apply mode", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_printing_image_readiness_v1.mjs", "utf8");
  assert.match(source, /default_transaction_read_only = on/i);
  assert.match(source, /repeatable read read only/i);
  assert.match(source, /client\.query\("rollback"\)/i);
  assert.doesNotMatch(source, /client\.query\("commit"\)/i);
  assert.doesNotMatch(source, /\binsert\s+into\s+public\./i);
  assert.doesNotMatch(source, /\bupdate\s+public\./i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(source, /--apply|mode\s*===\s*["']apply["']/i);
});
