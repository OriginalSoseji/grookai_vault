import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";

import {
  EXPECTED_ASSET_COUNT,
  TARGET_STORAGE_BUCKET,
  TARGET_SUPABASE_PROJECT_REF,
  buildOnePieceSt01StorageAssets,
  buildOnePieceSt01StorageRunPlan,
  validateOnePieceSt01StorageRunPlan,
} from "../../backend/pricing/one_piece_st01_storage_collision_preflight_v1.mjs";

function readinessRow(index) {
  const hash = index.toString(16).padStart(64, "0");
  return {
    row_ordinal: index,
    staging_row_id: `row-${index}`,
    source_product_id: 300000 + index,
    source_product_name: `Card ${index}`,
    review_lane: index === 17
      ? "don_card_variant_identity_review"
      : "numbered_card_parent_identity_review",
    card_number: index === 17 ? null : `ST01-${String(index + 1).padStart(3, "0")}`,
    proposed_parent_gv_id: `GV-OP-${index}`,
    image: {
      target_path_status: "proposed_content_addressed_card_path",
      target_storage_path: "warehouse-derived/self-hosted-images-v1/card_prints/one-piece/st01/" +
        `gv-op-${index}/${hash.slice(0, 24)}.png`,
      selected_source: {
        requested_url: `https://example.test/${index}.png`,
        role: "official_card_list_exact",
        content_type: "image/png",
        size_bytes: 10000 + index,
        sha256: hash,
        width: 600,
        height: 838,
        format: "png",
      },
      local_cache_path: `.tmp/${index}.png`,
      local_cache_sha256: hash,
    },
  };
}

test("storage plan contains exactly 18 unique card/DON assets and excludes sealed", () => {
  const rows = Array.from({ length: EXPECTED_ASSET_COUNT }, (_, index) =>
    readinessRow(index));
  rows.push({
    ...readinessRow(18),
    review_lane: "sealed_product_identity_review",
    image: { target_path_status: "pending_sealed_image_contract" },
  });
  const assets = buildOnePieceSt01StorageAssets(rows);
  assert.equal(assets.length, 18);
  assert.equal(new Set(assets.map((row) => row.target_storage_path)).size, 18);
  assert.equal(assets.some((row) =>
    row.review_lane === "sealed_product_identity_review"), false);
  assert.ok(assets.every((row) => row.target_storage_bucket === TARGET_STORAGE_BUCKET));
});

test("run plan binds exact target and closes every write boundary", () => {
  const assets = buildOnePieceSt01StorageAssets(
    Array.from({ length: 18 }, (_, index) => readinessRow(index)),
  );
  const plan = buildOnePieceSt01StorageRunPlan({
    repository: {
      commit_sha: "a".repeat(40),
      branch: "agent/one-piece-ingestion-readiness-v1",
    },
    assets,
  });
  assert.deepEqual(validateOnePieceSt01StorageRunPlan(plan), []);
  assert.equal(plan.target.supabase_project_ref, TARGET_SUPABASE_PROJECT_REF);
  assert.equal(plan.boundaries.storage_list_reads_allowed, true);
  assert.equal(plan.boundaries.storage_uploads_allowed, false);
  assert.equal(plan.boundaries.database_connections_allowed, false);
  assert.equal(plan.boundaries.sealed_assets_included, false);
});

test("preflight runner has list-only Storage access and no database or mutations", async () => {
  const source = await fs.readFile(
    "scripts/audits/one_piece_st01_storage_collision_preflight_v1.mjs",
    "utf8",
  );
  assert.match(source, /\.storage\.from\(TARGET_STORAGE_BUCKET\)[\s\S]*?\.list\(/);
  assert.doesNotMatch(source, /\.upload\(|\.remove\(|\.download\(/);
  assert.doesNotMatch(source, /\bpg\b|DATABASE_URL|SUPABASE_DB_URL|\.insert\(|\.update\(|\.delete\(/);
  assert.match(source, /run_plan\.json/);
  assert.match(source, /storage_uploads: 0/);
  assert.match(source, /database_connections: 0/);
});
