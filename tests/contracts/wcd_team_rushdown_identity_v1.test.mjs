import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CANON_MAINTENANCE_FILES_V1 } from "../../backend/maintenance/run_canon_maintenance_v1.mjs";
import { TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1 } from "../../backend/pricing/tcgplayer_wcd_team_rushdown_pilot_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELATIVE = "backend/maintenance/wcd_team_rushdown_identity_apply_v1.mjs";
const SCRIPT = readFileSync(path.join(ROOT, RELATIVE), "utf8");

test("Team Rushdown identity repair is a bounded canon maintenance task", () => {
  assert.ok(CANON_MAINTENANCE_FILES_V1.includes(RELATIVE));
  assert.equal(TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.length, 24);
  assert.equal(new Set(TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.source_product_id)).size, 24);
  assert.equal(new Set(TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1.map((row) => row.target.card_print_id)).size, 24);
});

test("Team Rushdown identity repair fails closed around production, evidence, and apply", () => {
  assert.match(SCRIPT, /CANON MAINTENANCE-ONLY EXECUTION BOUNDARY/);
  assert.match(SCRIPT, /const EXPECTED_COUNT = 24/);
  assert.match(SCRIPT, /const PROJECT_REF = "ycdxbpibncqcchqiihfz"/);
  assert.match(SCRIPT, /mappingDatabaseConfig/);
  assert.match(SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SCRIPT, /begin isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock/);
  assert.match(SCRIPT, /mappingTransactionState/);
  assert.match(SCRIPT, /commitMappingTransaction/);
  assert.match(SCRIPT, /rollbackMappingTransaction/);
  assert.match(SCRIPT, /automatic_retry_allowed:false/);
  assert.match(SCRIPT, /TRACKED_WORKTREE_NOT_CLEAN/);
  assert.match(SCRIPT, /WCD_TEAM_RUSHDOWN_IDENTITY_EXPECTED_FINGERPRINT/);
  assert.match(SCRIPT, /WCD_TEAM_RUSHDOWN_IDENTITY_EXPECTED_COMMIT_SHA/);
  assert.match(SCRIPT, /WCD_TEAM_RUSHDOWN_IDENTITY_CONFIRMATION/);
  assert.match(SCRIPT, /evidence_hash_changed/);
});

test("Team Rushdown identity repair inserts only identity rows and proves fresh readback", () => {
  assert.match(SCRIPT, /insert into public\.card_print_identity/);
  assert.match(SCRIPT, /dry_run_durable_write_detected/);
  assert.match(SCRIPT, /post_transaction_readback/);
  assert.match(SCRIPT, /post_transaction_readback_count:postTransactionReadback\.length/);
  assert.doesNotMatch(SCRIPT, /\bupdate\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(SCRIPT, /insert\s+into\s+public\.(?:external_mappings|card_printings|market_|vault_|inventory)/i);
});
