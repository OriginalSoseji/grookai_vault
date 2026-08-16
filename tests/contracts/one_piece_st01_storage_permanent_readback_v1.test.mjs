import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  EXPECTED_APPLY_PROOF_SHA256,
  EXPECTED_APPLY_RESULT_SHA256,
  ONE_PIECE_ST01_STORAGE_READBACK_VERSION,
} from "../../scripts/audits/one_piece_st01_storage_permanent_readback_v1.mjs";

const SOURCE = "scripts/audits/one_piece_st01_storage_permanent_readback_v1.mjs";

test("independent verifier binds the exact successful apply proof", () => {
  assert.equal(ONE_PIECE_ST01_STORAGE_READBACK_VERSION,
    "ONE_PIECE_ST01_STORAGE_PERMANENT_READBACK_V1");
  assert.equal(EXPECTED_APPLY_RESULT_SHA256,
    "ca68cbf35f0a38ea2dc71bff69c8ea00d46d7a8e7f81edd5567c8a493ee10c46");
  assert.equal(EXPECTED_APPLY_PROOF_SHA256,
    "7355e97c0f3e7d6bd68fe2364ab0247b283ab5a71c987e6e82743e6318f92c1f");
});

test("independent verifier permits only list and download Storage access", () => {
  const source = fs.readFileSync(SOURCE, "utf8");
  const legacyKey = new RegExp(["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_"));
  assert.match(source, /process\.env\.SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(source, legacyKey);
  assert.match(source, /\.list\(/);
  assert.match(source, /\.download\(/);
  assert.doesNotMatch(source, /\.upload\(/);
  assert.doesNotMatch(source, /\.remove\(/);
  assert.doesNotMatch(source, /\bpg\b|database_url|DATABASE_URL/i);
  assert.doesNotMatch(source, /\.from\(["']card_prints["']\)/);
  assert.match(source, /run_plan_written_before_storage_access:\s*true/);
  assert.match(source, /storage_uploads:\s*0/);
  assert.match(source, /pointer_writes:\s*0/);
});

test("independent verifier requires 18 exact list and byte readbacks", () => {
  const source = fs.readFileSync(SOURCE, "utf8");
  assert.match(source, /EXPECTED_ASSET_COUNT/);
  assert.match(source, /target_object_not_exactly_once/);
  assert.match(source, /\["size_bytes", "sha256", "width", "height", "format"\]/);
  assert.match(source, /independent_storage_readback_passed/);
});
