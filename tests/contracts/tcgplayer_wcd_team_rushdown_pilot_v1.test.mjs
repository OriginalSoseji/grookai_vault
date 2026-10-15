import assert from "node:assert/strict";
import test from "node:test";

import {
  TCGPLAYER_WCD_TEAM_RUSHDOWN_CARDS_V1 as CARDS,
  TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1,
  matchesWcdTeamRushdownPublicationV1,
  reviewedTcgplayerWcdTeamRushdownProductIdentityV1,
  uniqueWcdTeamRushdownPrintedNumberV1,
} from "../../backend/pricing/tcgplayer_wcd_team_rushdown_pilot_v1.mjs";
import {
  planTcgplayerExactMappingCandidateV1 as plan,
  tcgplayerExactMappingCandidateFingerprintV1 as fingerprint,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_plan_policy_v1.mjs";
import {
  validateTcgplayerExactMappingCandidateForApplyV1 as validate,
  validateTcgplayerExactMappingLiveTargetV1 as validateLive,
} from "../../backend/pricing/tcgplayer_market_exact_mapping_apply_policy_v1.mjs";
import { evaluateTcgplayerMarketQualificationV1 as qualify } from "../../backend/pricing/tcgplayer_market_publication_policy_v1.mjs";
import { classifyTcgplayerMarketProductScopeV1_3 as genericScope } from "../../backend/pricing/tcgplayer_market_product_scope_v1.mjs";
import { classifyTcgplayerMarketCoverageRowV1 as coverage } from "../../backend/pricing/tcgplayer_market_coverage_policy_v1.mjs";
import {
  REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V1,
  REVIEWED_SPECIAL_CANDIDATE_JOINS_V1,
  TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V1,
} from "../../backend/pricing/tcgplayer_reviewed_special_candidate_evidence_v1.mjs";

const NOW = new Date("2026-10-14T20:00:00Z");
function source(card) {
  return { ...card, category_id: 3, has_printed_number_evidence: true,
    active_source_mapping_count: 0, source_subtypes: ["Normal"],
    supporting_gap_observation_ids: ["observation"], supporting_gap_row_count: 1 };
}
function target(card) {
  return { ...card.target, active_standard_identity_count: 1,
    active_tcgplayer_mapping_count: 0 };
}
function planned(card) {
  return plan({ source: source(card), setTargets: [target(card)] });
}
function candidate(card) {
  return { ...source(card), ...target(card),
    source_product_extended_data: [{ name: "Number", value: card.printed_number }],
    canonical_name: card.target.name, canonical_number: card.target.number,
    card_printing_id: card.printing.printing_id,
    printing_gv_id: card.printing.printing_gv_id,
    source_subtype_name: "Normal", normalized_finish_key: "normal", finish_key: "normal",
    printing_is_provisional: false, printing_truth_verified: true,
    source_product_active: true, source_product_catalog_status: "current",
    source_mapping_count: 1, card_print_mapping_count: 1, card_printing_mapping_count: 1,
    identity_domain_count: 1, identity_domain: "pokemon_eng_standard",
    source_mapping_id: "mapping", mapping_method: "exact_reviewed_product_identity_authority_v1",
    source_observation_id: "observation", source_sync_run_id: "sync",
    source_artifact_id: "artifact", source_artifact_hash: "hash", source_row_hash: "row-hash",
    source_artifact_byte_size: 1024, source_price_row_identity: "source-row",
    source_sync_mode: "current_full_sync", source_sync_status: "completed",
    source_sync_failed_count: 0, source_sync_finished_at: "2026-10-14T10:00:00Z",
    currency: "USD", market_price: 1.23, duplicate_product_row_count: 1,
    variant_assignment_status: "exact_child_finish" };
}
function resign(row) {
  const { candidate_fingerprint: _fingerprint, ...body } = row;
  return { ...body, candidate_fingerprint: fingerprint(body) };
}

test("Team Rushdown authority is the complete reviewed 24-card source scope", () => {
  assert.equal(CARDS.length, 24);
  assert.equal(new Set(CARDS.map((row) => row.source_product_id)).size, 24);
  assert.equal(new Set(CARDS.map((row) => row.target.card_print_id)).size, 24);
  assert.ok(CARDS.every((row) => row.authority_version === TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1));
});

test("publication query enriches every reviewed Team Rushdown product", () => {
  assert.equal(TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V1.length, 26);
  for (const card of CARDS) {
    assert.ok(TCGPLAYER_REVIEWED_SPECIAL_PRODUCT_IDS_V1.includes(card.source_product_id));
    assert.match(REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V1, new RegExp(`\\b${card.source_product_id}\\b`));
    assert.match(REVIEWED_SPECIAL_CANDIDATE_JOINS_V1, new RegExp(`\\b${card.source_product_id}\\b`));
  }
  assert.match(REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V1, /as canonical_name/);
  assert.match(REVIEWED_SPECIAL_CANDIDATE_COLUMNS_V1, /as printing_truth_verified/);
  assert.match(REVIEWED_SPECIAL_CANDIDATE_JOINS_V1, /reviewed_printing\.card_print_id = reviewed_parent\.id/);
});

for (const card of CARDS) {
  test(`${card.source_product_id}: exact reviewed WCD source can plan and publish`, () => {
    assert.equal(genericScope(source(card)).in_scope, false);
    assert.equal(reviewedTcgplayerWcdTeamRushdownProductIdentityV1(source(card)), card);
    const result = planned(card);
    assert.equal(result.disposition, "candidate");
    assert.equal(result.reviewed_product_identity_authority_version, TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1);
    assert.equal(result.target.variant_key, "world_championship_deck_replica");
    assert.equal(validate(result).accepted, true);
    assert.deepEqual(validateLive(result, target(card)), []);
    const row = candidate(card);
    assert.equal(matchesWcdTeamRushdownPublicationV1(row), true);
    const decision = qualify(row, { now: NOW });
    assert.equal(decision.decision, "publish");
    assert.equal(decision.evidence.pilot_policy_version, TCGPLAYER_WCD_TEAM_RUSHDOWN_PILOT_V1);
    assert.equal(coverage({ ...row, ...decision, candidate_payload: row }).in_numerator, true);
  });
}

test("reserved Team Rushdown products fail closed on source, target, finish, or truth drift", () => {
  const card = CARDS[0];
  const original = planned(card);
  for (const change of [
    { source_group_id: 99 }, { source_group_name: "Ordinary Set" },
    { source_product_name: "Ancient Tomb - 2004 (Other Player)" },
    { printed_number: card.target.number }, { source_subtypes: ["Holofoil"] },
    { target: { ...original.target, card_print_id: "different-parent" } },
    { target: { ...original.target, variant_key: "" } },
  ]) assert.equal(validate(resign({ ...original, ...change })).accepted, false, JSON.stringify(change));
  const row = candidate(card);
  for (const change of [
    { source_product_id: 999999 }, { source_group_id: 99 },
    { source_product_name: "Ancient Tomb - 2004 (Other Player)" },
    { source_product_extended_data: [] },
    { source_product_extended_data: [...row.source_product_extended_data, ...row.source_product_extended_data] },
    { card_print_id: "other" }, { variant_key: "" },
    { card_printing_id: "other" }, { source_subtype_name: "Holofoil" },
    { printing_is_provisional: true }, { printing_truth_verified: false },
  ]) assert.equal(qualify({ ...row, ...change }, { now: NOW }).decision, "exclude", JSON.stringify(change));
});

test("an unmapped exact Team Rushdown source is measured as a repair gap", () => {
  const card = CARDS[0];
  const row = { ...candidate(card), source_mapping_count: 0, card_print_mapping_count: 0,
    card_printing_mapping_count: 0, card_print_id: null, card_printing_id: null,
    source_mapping_id: null, gv_id: null, printing_gv_id: null,
    canonical_name: null, canonical_number: null, set_id: null, set_code: null,
    variant_key: null, printing_truth_verified: false };
  const decision = qualify(row, { now: NOW });
  assert.equal(decision.decision, "exclude");
  const report = coverage({ ...row, ...decision, candidate_payload: row });
  assert.equal(report.in_denominator, true);
  assert.equal(report.in_numerator, false);
  assert.equal(report.primary_gap_reason, "missing_active_source_mapping");
  assert.equal(report.product_scope.rule_id, "reviewed_wcd_team_rushdown_mapping_gap");
});

test("Team Rushdown live number evidence requires one exact raw Number field", () => {
  const card = CARDS[0];
  assert.equal(uniqueWcdTeamRushdownPrintedNumberV1([{ name: "Number", value: card.printed_number }]), card.printed_number);
  assert.equal(uniqueWcdTeamRushdownPrintedNumberV1([]), null);
  assert.equal(uniqueWcdTeamRushdownPrintedNumberV1([
    { name: "Number", value: card.printed_number },
    { name: "number", value: card.printed_number },
  ]), null);
});
