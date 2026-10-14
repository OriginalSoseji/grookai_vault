import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CANON_MAINTENANCE_FILES_V1 } from "../../backend/maintenance/run_canon_maintenance_v1.mjs";
import {
  TCGPLAYER_BW11_RADIANT_COLLECTION_PRODUCT_IDENTITIES_V1,
} from "../../backend/pricing/tcgplayer_bw11_radiant_collection_product_identity_authority_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELATIVE = "backend/maintenance/bw11_radiant_collection_truth_review_apply_v1.mjs";
const SCRIPT = readFileSync(path.join(ROOT, RELATIVE), "utf8");

test("BW11 Radiant Collection truth review is a bounded canon maintenance task", () => {
  assert.ok(CANON_MAINTENANCE_FILES_V1.includes(RELATIVE));
  assert.equal(TCGPLAYER_BW11_RADIANT_COLLECTION_PRODUCT_IDENTITIES_V1.length, 9);
  assert.equal(new Set(TCGPLAYER_BW11_RADIANT_COLLECTION_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id)).size, 9);
  assert.equal(new Set(TCGPLAYER_BW11_RADIANT_COLLECTION_PRODUCT_IDENTITIES_V1.map((row) => row.printing.printing_id)).size, 9);
  assert.ok(TCGPLAYER_BW11_RADIANT_COLLECTION_PRODUCT_IDENTITIES_V1.every((row) =>
    row.target.set_code === "bw11" && row.printing.finish_key === "holo"));
});

test("BW11 truth review fails closed around production, evidence, and apply", () => {
  assert.match(SCRIPT, /CANON MAINTENANCE-ONLY EXECUTION BOUNDARY/);
  assert.match(SCRIPT, /const EXPECTED_COUNT = 9/);
  assert.match(SCRIPT, /const PROJECT_REF = "ycdxbpibncqcchqiihfz"/);
  assert.match(SCRIPT, /mappingDatabaseConfig/);
  assert.match(SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SCRIPT, /begin isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock/);
  assert.match(SCRIPT, /mappingTransactionState/);
  assert.match(SCRIPT, /commitMappingTransaction/);
  assert.match(SCRIPT, /rollbackMappingTransaction/);
  assert.match(SCRIPT, /commit_uncertain/);
  assert.match(SCRIPT, /automatic_retry_allowed: false/);
  assert.match(SCRIPT, /TRACKED_WORKTREE_NOT_CLEAN/);
  assert.match(SCRIPT, /BW11_RC_TRUTH_REVIEW_EXPECTED_FINGERPRINT/);
  assert.match(SCRIPT, /BW11_RC_TRUTH_REVIEW_EXPECTED_COMMIT_SHA/);
  assert.match(SCRIPT, /BW11_RC_TRUTH_REVIEW_CONFIRMATION/);
  assert.match(SCRIPT, /master_cards_hash_changed/);
  assert.match(SCRIPT, /master_printings_hash_changed/);
});

test("BW11 truth review only inserts verified visible reviews and proves readback", () => {
  assert.match(SCRIPT, /insert into public\.card_printing_truth_reviews/);
  assert.match(SCRIPT, /'verified','visible',true/);
  assert.match(SCRIPT, /dry_run_durable_write_detected/);
  assert.match(SCRIPT, /post_transaction_readback/);
  assert.match(SCRIPT, /status: transaction\.commit_uncertain \|\| transaction\.rollback_uncertain \|\| transaction\.committed/);
  assert.match(SCRIPT, /post_transaction_readback_count: postTransactionReadback\.length/);
  assert.doesNotMatch(SCRIPT, /\bupdate\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(SCRIPT, /insert\s+into\s+public\.(?:external_mappings|market_|vault_|inventory)/i);
});
