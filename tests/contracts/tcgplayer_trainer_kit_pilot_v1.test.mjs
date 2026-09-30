import assert from "node:assert/strict";
import test from "node:test";
import {
  TCGPLAYER_TRAINER_KIT_PILOT_CARDS_V1 as CARDS,
  matchesTrainerKitPilotPublicationV1,
  matchesTrainerKitPilotLiveMappingV1,
  uniqueTrainerKitPrintedNumberV1,
} from "../../backend/pricing/tcgplayer_trainer_kit_pilot_v1.mjs";
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

const NOW = new Date("2026-09-30T04:00:00Z");
function source(card) {
  return { ...card, category_id: 3, source_group_id: 1540,
    source_group_name: "HGSS Trainer Kit: Gyarados & Raichu",
    has_printed_number_evidence: true, active_source_mapping_count: 0,
    source_subtypes: ["Normal"], supporting_gap_observation_ids: ["observation"],
    supporting_gap_row_count: 1 };
}
function target(card) {
  return { ...card, name: card.source_product_name, number: card.canonical_number,
    variant_key: "", active_standard_identity_count: 1, active_tcgplayer_mapping_count: 0 };
}
function planned(card) {
  return plan({ source: source(card), directTargets: [target(card)] });
}
function candidate(card) {
  return { ...source(card), ...target(card),
    source_product_extended_data: [{ name: "Number", value: card.printed_number }],
    canonical_name: card.source_product_name,
    source_subtype_name: "Normal", normalized_finish_key: "normal", finish_key: "normal",
    printing_is_provisional: false, printing_truth_verified: true,
    source_product_active: true, source_product_catalog_status: "current",
    source_mapping_count: 1, card_print_mapping_count: 1, card_printing_mapping_count: 1,
    identity_domain_count: 1, identity_domain: "pokemon_eng_standard",
    source_mapping_id: "mapping", mapping_method: "exact_reviewed_mapping",
    source_observation_id: "observation", source_sync_run_id: "sync",
    source_artifact_id: "artifact", source_artifact_hash: "hash", source_row_hash: "row-hash",
    source_artifact_byte_size: 1024, source_price_row_identity: "source-row",
    source_sync_mode: "current_full_sync", source_sync_status: "completed",
    source_sync_failed_count: 0, source_sync_finished_at: "2026-09-29T10:00:00Z",
    currency: "USD", market_price: 1.23, duplicate_product_row_count: 1,
    variant_assignment_status: "exact_child_finish" };
}
function resign(row) {
  const { candidate_fingerprint, ...body } = row;
  return { ...body, candidate_fingerprint: fingerprint(body) };
}

for (const card of CARDS) {
  test(`${card.source_product_id}: reviewed source and exact target can be planned, not globally admitted`, () => {
    assert.equal(genericScope(source(card)).in_scope, false);
    const result = planned(card);
    assert.equal(result.disposition, "candidate");
    assert.equal(validate(result).accepted, true);
    assert.deepEqual(validateLive(result, target(card)), []);
    assert.equal(plan({ source: source(card), directTargets: [] }).disposition, "blocked");
    assert.equal(plan({ source: source(card), directTargets: [target(card), target(card)] }).disposition, "blocked");
  });
  test(`${card.source_product_id}: tampered mapping remains rejected even after fingerprint recomputation`, () => {
    const original = planned(card);
    for (const change of [
      { source_group_id: 99 }, { source_group_name: "Ordinary Set" },
      { printed_number: card.canonical_number }, { source_product_name: "Copycat (Stamped)" },
      { source_subtypes: ["Holofoil"] }, { source_subtypes: ["Normal", "Reverse Holofoil"] },
      { pilot_policy_version: undefined },
      { target: { ...original.target, set_id: "different-set" } },
      { target: { ...original.target, card_print_id: "different-parent" } },
      { target: { ...original.target, canonical_number: `0${card.canonical_number}` } },
    ]) assert.equal(validate(resign({ ...original, ...change })).accepted, false, JSON.stringify(change));
    assert.ok(validateLive(original, { ...target(card), number: `0${card.canonical_number}` }).includes("trainer_kit_pilot_identity_mismatch"));
    for (const change of [{ category_id: 1 }, { source_group_id: 99 }, { source_subtypes: ["Holofoil"] }]) {
      assert.equal(plan({ source: { ...source(card), ...change }, directTargets: [target(card)] }).disposition, "blocked");
    }
  });
  test(`${card.source_product_id}: fresh exact verified normal printing qualifies and coverage agrees`, () => {
    const row = candidate(card);
    assert.equal(matchesTrainerKitPilotPublicationV1(row), true);
    const decision = qualify(row, { now: NOW });
    assert.equal(decision.decision, "publish");
    assert.equal(decision.evidence.pilot_policy_version, "TCGPLAYER_TRAINER_KIT_PILOT_V1");
    const report = coverage({ ...row, ...decision, candidate_payload: row });
    assert.equal(report.in_numerator, true);
    assert.equal(report.product_scope.in_scope, true);
  });
  test(`${card.source_product_id}: any missing or conflicting publication identity stays excluded`, () => {
    const row = candidate(card);
    const changes = [
      { source_product_id: 999999 }, { category_id: 1 }, { source_group_id: 99 },
      { source_group_name: "Ordinary Set" }, { source_product_name: "Other" },
      { source_product_extended_data: [] },
      { source_product_extended_data: [{ name: "Number", value: card.canonical_number }] },
      { source_product_extended_data: [...row.source_product_extended_data, ...row.source_product_extended_data] },
      { card_print_id: "other" }, { gv_id: "other" }, { set_id: "other" }, { set_code: "other" },
      { canonical_name: "Other" }, { canonical_number: `0${card.canonical_number}` },
      { variant_key: "holo" }, { card_printing_id: "other" }, { printing_gv_id: "other" },
      { source_subtype_name: "Holofoil" }, { normalized_finish_key: "holo" }, { finish_key: "holo" },
      { printing_is_provisional: true }, { printing_truth_verified: false },
    ];
    for (const change of changes) assert.equal(qualify({ ...row, ...change }, { now: NOW }).decision, "exclude", JSON.stringify(change));
    for (const key of ["canonical_name", "canonical_number", "variant_key", "printing_truth_verified", "printing_is_provisional"]) {
      const missing = { ...row }; delete missing[key];
      assert.equal(qualify(missing, { now: NOW }).decision, "exclude", key);
    }
  });
  test(`${card.source_product_id}: pilot does not bypass freshness, source integrity, or one-to-one mapping`, () => {
    const row = candidate(card);
    for (const change of [
      { market_price: null }, { market_price: 0 }, { currency: "EUR" },
      { source_sync_failed_count: 1 }, { source_artifact_hash: "" },
      { source_mapping_count: 2 }, { source_mapping_count: 0 },
      { card_printing_mapping_count: 0 }, { identity_domain: "pokemon_jpn_standard" },
      { duplicate_product_row_count: 2 }, { variant_assignment_status: "unknown" },
    ]) assert.equal(qualify({ ...row, ...change }, { now: NOW }).decision, "quarantine", JSON.stringify(change));
    assert.equal(qualify({ ...row, source_sync_finished_at: "2026-09-27T00:00:00Z" }, { now: NOW }).decision, "suppress_stale");
  });
  test(`${card.source_product_id}: unmapped source stays a repair gap and plans its exact half deck`, () => {
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
    assert.equal(coverage({ ...row, ...decision, decision: "publish", candidate_payload: row }).in_numerator, false);
    const plannedGap = plan({ source: source(card), setTargets: CARDS.map(target),
      groupConsensus: { set_count: 1, set_id: "wrong-half-deck", set_code: "wrong" } });
    assert.equal(plannedGap.disposition, "candidate");
    assert.equal(plannedGap.target.card_print_id, card.card_print_id);
    assert.equal(plannedGap.evidence_lane, "reviewed_trainer_kit_product_authority");
    assert.equal(validate(plannedGap).accepted, true);
    for (const change of [
      { source_product_id: 999999 }, { source_subtype_name: "Holofoil" },
      { source_group_id: 99 }, { source_mapping_count: 1 },
      { card_print_id: "unexpected-mapped-parent" },
      { source_product_extended_data: [...row.source_product_extended_data, ...row.source_product_extended_data] },
    ]) assert.equal(coverage({ ...row, ...decision, ...change }).in_denominator, false, JSON.stringify(change));
  });
  test(`${card.source_product_id}: live mapping requires exactly one raw number field`, () => {
    const current = { ...source(card), product_id: card.source_product_id,
      extended_data: [{ name: "Number", value: card.printed_number }] };
    assert.equal(matchesTrainerKitPilotLiveMappingV1(planned(card), current, target(card)), true);
    for (const fields of [[],
      [...current.extended_data, { name: "Number", value: "999/999" }],
      [...current.extended_data, { name: "number", value: card.printed_number }],
      [{ name: "Number", value: card.canonical_number }],
    ]) {
      assert.equal(matchesTrainerKitPilotLiveMappingV1(planned(card), { ...current, extended_data: fields }, target(card)), false);
    }
    assert.equal(uniqueTrainerKitPrintedNumberV1([...current.extended_data, ...current.extended_data]), null);
  });
}

test("unreviewed Trainer Kit products remain blocked at plan and apply boundaries", () => {
  const card = CARDS[0];
  assert.equal(plan({ source: { ...source(card), source_product_id: 999999 }, directTargets: [target(card)] }).disposition, "blocked");
  assert.equal(validate(resign({ ...planned(card), source_product_id: 999999 })).accepted, false);
});
