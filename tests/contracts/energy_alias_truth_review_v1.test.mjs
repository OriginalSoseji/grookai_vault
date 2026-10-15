import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CANON_MAINTENANCE_FILES_V1 } from "../../backend/maintenance/run_canon_maintenance_v1.mjs";
import {
  TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_energy_alias_product_identity_authority_v1.mjs";
import {
  planTcgplayerExactMappingCandidateV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  validateTcgplayerExactMappingCandidateForApplyV1,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import {
  assertEnergyAliasCandidateObservationScopeV1,
} from "../../scripts/audits/tcgplayer_energy_alias_mapping_authority_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELATIVE = "backend/maintenance/energy_alias_truth_review_apply_v1.mjs";
const SCRIPT = readFileSync(path.join(ROOT, RELATIVE), "utf8");
const AUTHORITY_SCRIPT = readFileSync(path.join(ROOT,
  "scripts/audits/tcgplayer_energy_alias_mapping_authority_v1.mjs"), "utf8");

test("energy-alias registry freezes 7 products, 7 parents, and all 12 source-listed printings", () => {
  const rows = TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITIES_V1;
  const printings = rows.flatMap((row) => row.printings);
  assert.equal(rows.length, 7);
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, 7);
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, 7);
  assert.equal(printings.length, 12);
  assert.equal(new Set(printings.map((row) => row.printing_id)).size, 12);
  assert.deepEqual([...new Set(rows.map((row) => row.target.set_code))].sort(), ["sm5", "swsh3"]);
  assert.deepEqual([...new Set(printings.map((row) => row.finish_key))].sort(), ["holo", "normal", "reverse"]);
});

test("each frozen energy-alias source plans and validates only its exact parent", () => {
  const subtypeByFinish = { holo: "Holofoil", normal: "Normal", reverse: "Reverse Holofoil" };
  for (const authority of TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITIES_V1) {
    const source = {
      source_product_id: authority.source_product_id,
      source_product_name: authority.source_product_name,
      source_group_id: authority.source_group_id,
      source_group_name: authority.source_group_name,
      printed_number: authority.printed_number,
      source_subtypes: authority.printings.map((row) => subtypeByFinish[row.finish_key]),
      supporting_gap_observation_ids: authority.printings.map((row) =>
        `gap-${authority.source_product_id}-${row.finish_key}`),
      supporting_gap_row_count: authority.printings.length,
      active_source_mapping_count: 0,
      has_printed_number_evidence: true,
    };
    const target = {
      card_print_id: authority.target.card_print_id,
      gv_id: authority.target.gv_id,
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      name: authority.target.name,
      number: authority.target.number,
      variant_key: authority.target.variant_key,
      active_standard_identity_count: 1,
      active_tcgplayer_mapping_count: 0,
    };
    const candidate = planTcgplayerExactMappingCandidateV1({ source, setTargets: [target] });
    assert.equal(candidate.disposition, "candidate", authority.source_product_id);
    assert.equal(candidate.reviewed_product_identity_authority_version,
      TCGPLAYER_ENERGY_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1);
    assert.equal(candidate.target.card_print_id, authority.target.card_print_id);
    assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
    assert.doesNotThrow(() => assertEnergyAliasCandidateObservationScopeV1(candidate));
    assert.throws(() => assertEnergyAliasCandidateObservationScopeV1({
      ...candidate,
      supporting_gap_row_count: authority.printings.length - 1,
      supporting_gap_observation_ids: candidate.supporting_gap_observation_ids.slice(1),
    }), /supporting_gap_row_count_drift/);
    assert.throws(() => assertEnergyAliasCandidateObservationScopeV1({
      ...candidate,
      source_subtypes: candidate.source_subtypes.slice(0, -1),
    }), /source_subtypes_drift/);
    const drift = planTcgplayerExactMappingCandidateV1({
      source: { ...source, source_product_name: `${source.source_product_name} drift` }, setTargets: [target],
    });
    assert.equal(drift.reason, "reviewed_product_source_drift");
  }
});

test("energy-alias truth review is a bounded insert-only canon maintenance task", () => {
  assert.ok(CANON_MAINTENANCE_FILES_V1.includes(RELATIVE));
  assert.match(SCRIPT, /CANON MAINTENANCE-ONLY EXECUTION BOUNDARY/);
  assert.match(SCRIPT, /const EXPECTED_PRODUCT_COUNT = 7/);
  assert.match(SCRIPT, /const EXPECTED_COUNT = 12/);
  assert.match(SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SCRIPT, /begin isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock/);
  assert.match(SCRIPT, /ENERGY_ALIAS_TRUTH_REVIEW_EXPECTED_FINGERPRINT/);
  assert.match(SCRIPT, /ENERGY_ALIAS_TRUTH_REVIEW_EXPECTED_COMMIT_SHA/);
  assert.match(SCRIPT, /insert into public\.card_printing_truth_reviews/);
  assert.match(SCRIPT, /'verified','visible',true/);
  assert.match(SCRIPT, /dry_run_durable_write_detected/);
  assert.doesNotMatch(SCRIPT, /\bupdate\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete\s+from\s+public\./i);
  assert.doesNotMatch(SCRIPT, /insert\s+into\s+public\.(?:external_mappings|market_|vault_|inventory)/i);
});

test("energy-alias mapping authority is read-only, multi-finish, and evidence-bound", () => {
  assert.match(AUTHORITY_SCRIPT, /const EXPECTED_CANDIDATES = 7/);
  assert.match(AUTHORITY_SCRIPT, /const EXPECTED_PRINTINGS = 12/);
  assert.match(AUTHORITY_SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(AUTHORITY_SCRIPT, /master_index_hash_changed/);
  assert.match(AUTHORITY_SCRIPT, /authority\.printings\.map/);
  assert.match(AUTHORITY_SCRIPT, /active_truth_review, "verified"/);
  assert.match(AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(AUTHORITY_SCRIPT, /\b(insert|update|delete)\s+(?:into|from|public\.)/i);
});
