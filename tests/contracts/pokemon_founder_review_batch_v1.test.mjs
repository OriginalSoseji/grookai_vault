import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1,
  TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITY_AUTHORITY_V1,
} from "../../backend/pricing/tcgplayer_founder_review_batch_product_identity_authority_v1.mjs";
import { planTcgplayerExactMappingCandidateV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import { validateTcgplayerExactMappingCandidateForApplyV1 } from
  "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import { operationsSha256V1 } from
  "../../backend/operations/operations_control_plane_v1.mjs";
import { buildPokemonPricingMappingAuthorityReviewWorkItemV1 } from
  "../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const review = JSON.parse(readFileSync(path.join(ROOT,
  "docs/audits/pokemon_tcgplayer_founder_review_batch_20261026.json"), "utf8"));

const subtypeByFinish = { normal: "Normal", holo: "Holofoil", reverse: "Reverse Holofoil" };

function source(authority) {
  return {
    source_product_id: authority.source_product_id,
    source_product_name: authority.source_product_name,
    source_group_id: authority.source_group_id,
    source_group_name: authority.source_group_name,
    printed_number: authority.printed_number,
    source_subtypes: authority.printings.map((printing) => subtypeByFinish[printing.finish_key]),
    supporting_gap_observation_ids: [`gap-${authority.source_product_id}`],
    supporting_gap_row_count: authority.printings.length,
    active_source_mapping_count: 0,
    has_printed_number_evidence: true,
  };
}

function target(authority) {
  return {
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
}

test("founder review admits only three exact source, parent, and finish identities", () => {
  const rows = TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1;
  assert.deepEqual(rows.map((row) => row.source_product_id), [87394, 162270, 246275]);
  assert.equal(new Set(rows.map((row) => row.target.card_print_id)).size, 3);
  assert.ok(rows.every((row) => row.printings.length === 1 && row.printing.finish_key === "normal"));
  assert.deepEqual(review.admitted_product_ids, rows.map((row) => row.source_product_id));
  assert.equal(review.boundary.reviewed_count, 18);
  assert.equal(review.boundary.held_count, 15);
  assert.equal(review.boundary.database_writes, false);
});

test("each admitted product plans and validates only its frozen target", () => {
  for (const authority of TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1) {
    const candidate = planTcgplayerExactMappingCandidateV1({
      source: source(authority),
      setTargets: [target(authority)],
    });
    assert.equal(candidate.disposition, "candidate", authority.source_product_id);
    assert.equal(candidate.reviewed_product_identity_authority_version,
      TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITY_AUTHORITY_V1);
    assert.equal(candidate.target.card_print_id, authority.target.card_print_id);
    assert.equal(validateTcgplayerExactMappingCandidateForApplyV1(candidate).accepted, true);

    const drift = planTcgplayerExactMappingCandidateV1({
      source: { ...source(authority), source_product_name: `${authority.source_product_name} drift` },
      setTargets: [target(authority)],
    });
    assert.equal(drift.reason, "reviewed_product_source_drift");
  }
});

test("finish-ambiguous and unnumbered rows remain outside executable authority", () => {
  const admitted = new Set(TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1
    .map((row) => row.source_product_id));
  const held = review.held.flatMap((entry) => entry.product_ids);
  assert.equal(new Set(held).size, 15);
  assert.ok(held.every((productId) => !admitted.has(productId)));
  assert.equal(new Set([...held, ...admitted]).size, 18);
});

test("evidence-rich review item carries exact candidates and Master Index authority", () => {
  const authorities = TCGPLAYER_FOUNDER_REVIEW_BATCH_PRODUCT_IDENTITIES_V1;
  const exact = authorities.map((authority) => planTcgplayerExactMappingCandidateV1({
    source: source(authority),
    setTargets: [target(authority)],
  }));
  const candidates = authorities.map((authority) => ({
    ...source(authority),
    review_targets: [{
      card_print_id: authority.target.card_print_id,
      gv_id: authority.target.gv_id,
      set_id: authority.target.set_id,
      set_code: authority.target.set_code,
      set_name: authority.target.set_code,
      canonical_name: authority.target.name,
      canonical_number: authority.target.number,
      variant_key: "",
      candidate_score: 100,
      candidate_evidence: { exact_reviewed_identity: true },
    }],
  }));
  const workItem = buildPokemonPricingMappingAuthorityReviewWorkItemV1({
    candidates,
    exactMappingCandidates: exact,
    masterMappingAuthority: { version: "MASTER_INDEX_MAPPING_AUTHORITY_V1" },
    sourcePricingRunId: "pricing-run",
    sourceSyncRunId: "7ca0463c-98e1-430c-9a28-aa94b23de778",
    sourceCompletedAt: "2026-10-25T11:49:45.943Z",
    sourceCommitSha: "43ccc34e2da595382fffa76400e5e480568c067c",
    sourceRunUri: "https://github.com/OriginalSoseji/grookai_vault/actions/runs/40271141832",
  });
  assert.match(workItem.work_item_key, /:master-authority-batch-01$/);
  assert.deepEqual(workItem.plan_payload.exact_mapping_candidates, exact);
  assert.equal(workItem.plan_payload.master_mapping_authority.version, "MASTER_INDEX_MAPPING_AUTHORITY_V1");
  assert.equal(workItem.plan_fingerprint, operationsSha256V1(workItem.plan_payload));
  assert.equal(workItem.command_policy.execution_enabled, false);
});
