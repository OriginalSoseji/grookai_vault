import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CANON_MAINTENANCE_FILES_V1 } from "../../backend/maintenance/run_canon_maintenance_v1.mjs";
import {
  TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_review_lead_alias_product_identity_authority_v1.mjs";
import { planTcgplayerExactMappingCandidateV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import { validateTcgplayerExactMappingCandidateForApplyV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import { assertReviewLeadAliasCandidateObservationScopeV1, selectReviewLeadAliasCandidatesV1 } from
  "../../scripts/audits/tcgplayer_review_lead_alias_mapping_authority_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RELATIVE = "backend/maintenance/review_lead_alias_truth_review_apply_v1.mjs";
const SCRIPT = readFileSync(path.join(ROOT, RELATIVE), "utf8");
const AUTHORITY_SCRIPT = readFileSync(path.join(ROOT,
  "scripts/audits/tcgplayer_review_lead_alias_mapping_authority_v1.mjs"), "utf8");

test("review-lead registry freezes six products, six parents, and seven exact printings", () => {
  const rows = TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1;
  const printings = rows.flatMap((row) => row.printings);
  assert.equal(rows.length, 6);
  assert.equal(new Set(rows.map((row) => row.source_product_id)).size, 6);
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, 6);
  assert.equal(printings.length, 7);
  assert.equal(new Set(printings.map((row) => row.printing_id)).size, 7);
  assert.deepEqual([...new Set(rows.map((row) => row.target.set_code))].sort(),
    ["ex15", "sm10", "smp", "svp"]);
  assert.deepEqual(Object.fromEntries(["insert", "require_existing"].map((action) => [action,
    printings.filter((row) => row.truth_review_action === action).length])),
  { insert: 5, require_existing: 2 });
  assert.deepEqual(rows.filter((row) => row.target.set_code === "svp")
    .map((row) => row.source_product_id).sort((a, b) => a - b), [518863, 578146, 649232]);
  assert.ok(rows.filter((row) => row.target.set_code === "svp")
    .every((row) => row.printings.length === 1 && row.printings[0].finish_key === "normal"));
});

test("each review-lead source plans and validates only its frozen parent", () => {
  const subtypeByFinish = { holo: "Holofoil", normal: "Normal", reverse: "Reverse Holofoil" };
  for (const authority of TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1) {
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
      TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITY_AUTHORITY_V1);
    assert.equal(candidate.target.card_print_id, authority.target.card_print_id);
    assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);
    assert.doesNotThrow(() => assertReviewLeadAliasCandidateObservationScopeV1(candidate));
    assert.throws(() => assertReviewLeadAliasCandidateObservationScopeV1({
      ...candidate, source_subtypes: [],
    }), /source_subtypes_drift/);
    const drift = planTcgplayerExactMappingCandidateV1({
      source: { ...source, source_product_name: `${source.source_product_name} drift` },
      setTargets: [target],
    });
    assert.equal(drift.reason, "reviewed_product_source_drift");
  }
});

test("review-lead truth review is bounded and preserves existing verified reviews", () => {
  assert.ok(CANON_MAINTENANCE_FILES_V1.includes(RELATIVE));
  assert.match(SCRIPT, /CANON MAINTENANCE-ONLY EXECUTION BOUNDARY/);
  assert.match(SCRIPT, /const EXPECTED_PRODUCT_COUNT = 6/);
  assert.match(SCRIPT, /const EXPECTED_COUNT = 7/);
  assert.match(SCRIPT, /const EXPECTED_INSERT_COUNT = 5/);
  assert.match(SCRIPT, /truth_review_action === "require_existing"/);
  assert.match(SCRIPT, /required_truth_review_status_drift/);
  assert.match(SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(SCRIPT, /begin isolation level serializable/);
  assert.match(SCRIPT, /pg_advisory_xact_lock/);
  assert.match(SCRIPT, /REVIEW_LEAD_ALIAS_TRUTH_REVIEW_EXPECTED_FINGERPRINT/);
  assert.match(SCRIPT, /REVIEW_LEAD_ALIAS_TRUTH_REVIEW_EXPECTED_COMMIT_SHA/);
  assert.match(SCRIPT, /insert into public\.card_printing_truth_reviews/);
  assert.match(SCRIPT, /dry_run_durable_write_detected/);
  assert.doesNotMatch(SCRIPT, /\bupdate\s+public\./i);
  assert.doesNotMatch(SCRIPT, /\bdelete\s+from\s+public\./i);
});

test("review-lead mapping authority is read-only and evidence-bound", () => {
  assert.match(AUTHORITY_SCRIPT, /const EXPECTED_CANDIDATES = 6/);
  assert.match(AUTHORITY_SCRIPT, /const EXPECTED_PRINTINGS = 7/);
  assert.match(AUTHORITY_SCRIPT, /where p\.id=any\(\$1::uuid\[\]\)/);
  assert.match(AUTHORITY_SCRIPT, /begin transaction isolation level repeatable read read only/);
  assert.match(AUTHORITY_SCRIPT, /rejectUnauthorized:\s*true/);
  assert.match(AUTHORITY_SCRIPT, /master_index_hash_changed/);
  assert.match(AUTHORITY_SCRIPT, /active_truth_review, "verified"/);
  assert.match(AUTHORITY_SCRIPT, /freezeMasterMappingAuthority/);
  assert.doesNotMatch(AUTHORITY_SCRIPT, /\b(insert|update|delete)\s+(?:into|from|public\.)/i);
});

test("review-lead mapping authority selects its six products from a full planner output", () => {
  const batchRows = TCGPLAYER_REVIEW_LEAD_ALIAS_PRODUCT_IDENTITIES_V1.map((row) => ({
    source_product_id: row.source_product_id,
  }));
  const selected = selectReviewLeadAliasCandidatesV1([
    { source_product_id: 999999 },
    ...batchRows,
    { source_product_id: 888888 },
  ]);
  assert.deepEqual(selected, batchRows);
});
