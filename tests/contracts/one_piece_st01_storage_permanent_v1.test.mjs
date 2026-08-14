import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION,
  buildOnePieceSt01PermanentAssets,
  permanentStorageApprovalFingerprint,
  permanentStorageApprovalPayload,
  permanentStoragePlanHash,
} from "../../backend/pricing/one_piece_st01_storage_permanent_v1.mjs";

const PREFLIGHT_PLAN = "docs/audits/pricing/" +
  "one_piece_st01_storage_collision_preflight_v1/st01_18_objects_v1/run_plan.json";
const PLAN_SOURCE = "scripts/audits/one_piece_st01_storage_permanent_plan_v1.mjs";
const APPLY_SOURCE = "scripts/audits/one_piece_st01_storage_permanent_apply_v1.mjs";

function assets() {
  const plan = JSON.parse(fs.readFileSync(PREFLIGHT_PLAN, "utf8"));
  return buildOnePieceSt01PermanentAssets(plan.assets);
}

test("permanent scope is exactly the 18 frozen card/DON objects", () => {
  const rows = assets();
  assert.equal(rows.length, 18);
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, 18);
  assert.equal(new Set(rows.map((row) => row.target_storage_path)).size, 18);
  assert.equal(rows.every((row) => !row.review_lane.includes("sealed")), true);
  assert.equal(rows.every((row) => row.upload_policy.upsert === false), true);
  assert.equal(rows.every((row) => row.upload_policy.overwrite_allowed === false), true);
});

test("approval policy is fingerprinted and closes non-Storage boundaries", () => {
  const payload = permanentStorageApprovalPayload({
    assets: assets(),
    codeBundleSha256: "a".repeat(64),
  });
  assert.equal(payload.version, ONE_PIECE_ST01_STORAGE_PERMANENT_VERSION);
  assert.equal(payload.execution_policy.exact_assets, 18);
  assert.equal(payload.execution_policy.fresh_collision_check_before_first_upload, true);
  assert.equal(payload.execution_policy.upsert, false);
  assert.equal(payload.execution_policy.rollback_on_any_failure, true);
  assert.equal(payload.execution_policy.rollback_scope,
    "only_objects_created_by_this_execution");
  assert.equal(payload.execution_policy.database_connections_allowed, false);
  assert.equal(payload.execution_policy.image_pointer_writes_allowed, false);
  assert.equal(payload.execution_policy.sealed_assets_allowed, false);
  const fingerprint = permanentStorageApprovalFingerprint(payload);
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.match(permanentStoragePlanHash({
    approvalFingerprint: fingerprint,
    codeBundleSha256: "a".repeat(64),
  }), /^[0-9a-f]{64}$/);
});

test("plan generator is offline and cannot access Storage or database", () => {
  const source = fs.readFileSync(PLAN_SOURCE, "utf8");
  assert.doesNotMatch(source, /createClient\s*\(/);
  assert.doesNotMatch(source, /\.storage\s*\./);
  assert.doesNotMatch(source, /\bpg\b|database_url|DATABASE_URL/i);
  assert.match(source, /storage_access:\s*false/);
  assert.match(source, /database_writes:\s*false/);
});

test("apply runner is inert by default and failure-atomic when authorized", () => {
  const source = fs.readFileSync(APPLY_SOURCE, "utf8");
  assert.match(source, /argument === "--apply"/);
  assert.match(source, /Explicit permanent Storage approval fingerprint or plan hash mismatch/);
  assert.match(source, /Permanent Storage code bundle changed after plan generation/);
  assert.match(source, /staged = await Promise\.all\(assets\.map\(stageAsset\)\)/);
  assert.match(source, /if \(existing\.some\(Boolean\)\)/);
  assert.match(source, /upsert:\s*false/);
  assert.match(source, /downloadAndVerify/);
  assert.match(source, /if \(runError && client && uploadedAssets\.length > 0\)/);
  assert.match(source, /removeAndVerifyAbsent/);
  assert.doesNotMatch(source, /\bpg\b|database_url|DATABASE_URL/i);
  assert.doesNotMatch(source, /\.from\(["']card_prints["']\)/);
});
