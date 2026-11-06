import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1,
} from "../../backend/pricing/tcgplayer_professor_program_product_identity_authority_v1.mjs";

const SCRIPT = fs.readFileSync(
  new URL("../../scripts/audits/tcgplayer_professor_program_exact_mapping_guarded_dry_run_v1.mjs", import.meta.url),
  "utf8",
);

test("Professor Program exact mapping rehearsal freezes the intended seven products", () => {
  assert.deepEqual(
    TCGPLAYER_PROFESSOR_PROGRAM_PRODUCT_IDENTITIES_V1.map((row) => row.source_product_id),
    [176629, 176630, 176631, 176632, 176633, 213516, 499366],
  );
  assert.match(SCRIPT, /const HELD_PRODUCT_ID = 176638/);
  assert.match(SCRIPT, /readiness\.rows\.length, 7/);
  assert.match(SCRIPT, /selectTcgplayerExactMappingApplyBatchV1\(candidates, \{ limit: candidates\.length \}\)/);
});

test("Professor Program mapping authority binds reviewed evidence and live targets", () => {
  assert.match(SCRIPT, /freezeMasterMappingAuthority\(candidates, scopes\)/);
  assert.match(SCRIPT, /assertMasterPrintingAuthority\(manifest, artifacts\)/);
  assert.match(SCRIPT, /assertMasterMappingBatchAuthority\(candidates, authorityBundle, \{ liveTargets: live\.targets \}\)/);
  assert.match(SCRIPT, /source: "tcgplayer"/);
  assert.match(SCRIPT, /candidate_fingerprint: candidate\.candidate_fingerprint/);
  assert.match(SCRIPT, /execution_authorized: false/);
});

test("Professor Program production rehearsal is insert-only and always rolls back", () => {
  assert.match(SCRIPT, /begin transaction isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock\(hashtext\('tcgplayer_market_exact_mapping_apply_v1'\)\)/);
  assert.equal((SCRIPT.match(/insert into public\.external_mappings/g) ?? []).length, 1);
  assert.match(SCRIPT, /await client\.query\("rollback"\)/);
  assert.match(SCRIPT, /rollback_proof_passed_zero_durable_changes/);
  assert.doesNotMatch(SCRIPT, /\bupdate public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete from public\./i);
  assert.doesNotMatch(SCRIPT, /client\.query\(["']commit/i);
});

test("Professor Program package keeps pricing and publication outside the write boundary", () => {
  assert.match(SCRIPT, /pricing_writes: 0/);
  assert.match(SCRIPT, /publication_writes: 0/);
  assert.match(SCRIPT, /parent_writes: 0/);
  assert.match(SCRIPT, /printing_writes: 0/);
  assert.match(SCRIPT, /identity_writes: 0/);
  assert.match(SCRIPT, /deletes: 0/);
  assert.match(SCRIPT, /migrations: 0/);
  assert.match(SCRIPT, /separate_exact_founder_approval/);
});

