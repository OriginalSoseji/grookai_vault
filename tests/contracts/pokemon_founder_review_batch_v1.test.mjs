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
import { TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_KEY } from
  "../../backend/operations/tcgplayer_pricing_completion_agent_v1.mjs";
import { supersedeLegacyPokemonMappingAuthorityReviewsV1 } from
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
  assert.equal(workItem.work_item_key, TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_KEY);
  assert.deepEqual(workItem.plan_payload.exact_mapping_candidates, exact);
  assert.equal(workItem.plan_payload.master_mapping_authority.version, "MASTER_INDEX_MAPPING_AUTHORITY_V1");
  assert.equal(workItem.plan_fingerprint, operationsSha256V1(workItem.plan_payload));
  assert.equal(workItem.command_policy.execution_enabled, false);
});

function queueRow(workItem, overrides = {}) {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    state: "ready_for_review",
    agent_key: "tcgplayer-pricing-completion-v1",
    ...workItem,
    ...overrides,
  };
}

test("stable Pokemon review atomically supersedes only equivalent legacy review lanes", async () => {
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
  });
  const replacement = queueRow(workItem);
  const equivalentLegacy = queueRow(workItem, {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    work_item_key:
      "pokemon-pricing-mapping-review:473ff153-12f6-4b7d-8821-a04d12a5c33a:master-authority-batch-01",
    plan_fingerprint: "1".repeat(64),
  });
  const differentLegacy = queueRow(workItem, {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    work_item_key:
      "pokemon-pricing-mapping-review:aae5225b-a6b3-4e09-ac4c-3e65de24a1f4:master-authority-batch-01",
    plan_fingerprint: "2".repeat(64),
    plan_payload: {
      ...workItem.plan_payload,
      exact_mapping_candidates: exact.map((row, index) => index === 0 ? {
        ...row,
        source_product_id: row.source_product_id + 1,
      } : row),
    },
  });
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params });
      if (/where w\.id = \$1::uuid/.test(sql)) return { rows: [replacement] };
      if (/w\.work_item_key ~/.test(sql)) {
        return { rows: [equivalentLegacy, differentLegacy] };
      }
      if (/update public\.founder_work_items/.test(sql)) {
        return { rows: [{ id: params[0] }] };
      }
      return { rows: [] };
    },
  };
  const result = await supersedeLegacyPokemonMappingAuthorityReviewsV1(client, {
    replacementWorkItemId: replacement.id,
  });
  assert.deepEqual(result, {
    replacement_work_item_id: replacement.id,
    legacy_review_count: 2,
    superseded_review_count: 1,
  });
  const updates = calls.filter((call) => /update public\.founder_work_items/.test(call.sql));
  const events = calls.filter((call) => /insert into public\.founder_work_item_events/.test(call.sql));
  assert.equal(updates.length, 1);
  assert.equal(events.length, 1);
  assert.equal(updates[0].params[0], equivalentLegacy.id);
  assert.equal(calls.at(-1).sql, "commit");
  assert.ok(calls.every((call) => !/update public\.(?:card_prints|external_mappings|tcgplayer_market)/i
    .test(call.sql)));
});

test("stable approved Pokemon review can retire a duplicate legacy review", async () => {
  const replacement = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    work_item_key: TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_KEY,
    work_item_type: "tcgplayer_pricing_backlog_repair",
    action_type: "advance_tcgplayer_pricing_backlog",
    domain: "pricing",
    state: "approved",
    plan_fingerprint: "0".repeat(64),
    plan_payload: {
      proposal_version: "TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_V1",
      exact_mapping_candidates: [{
        source_product_id: 1,
        target: { card_print_id: "11111111-1111-4111-8111-111111111111" },
      }],
    },
    command_policy: { execution_enabled: false },
    agent_key: "tcgplayer-pricing-completion-v1",
  };
  const legacy = {
    ...replacement,
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    state: "ready_for_review",
    work_item_key:
      "pokemon-pricing-mapping-review:473ff153-12f6-4b7d-8821-a04d12a5c33a:master-authority-batch-01",
    plan_fingerprint: "1".repeat(64),
  };
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params });
      if (/where w\.id = \$1::uuid/.test(sql)) return { rows: [replacement] };
      if (/w\.work_item_key ~/.test(sql)) return { rows: [legacy] };
      if (/update public\.founder_work_items/.test(sql)) return { rows: [{ id: legacy.id }] };
      return { rows: [] };
    },
  };
  const result = await supersedeLegacyPokemonMappingAuthorityReviewsV1(client, {
    replacementWorkItemId: replacement.id,
  });
  assert.equal(result.superseded_review_count, 1);
  assert.equal(calls.at(-1).sql, "commit");
});

test("legacy Pokemon review supersession fails closed above its bounded lane", async () => {
  const replacement = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    work_item_key: TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_KEY,
    work_item_type: "tcgplayer_pricing_backlog_repair",
    action_type: "advance_tcgplayer_pricing_backlog",
    domain: "pricing",
    state: "ready_for_review",
    plan_fingerprint: "0".repeat(64),
    plan_payload: {
      proposal_version: "TCGPLAYER_POKEMON_MAPPING_AUTHORITY_REVIEW_V1",
      exact_mapping_candidates: [{
        source_product_id: 1,
        target: { card_print_id: "11111111-1111-4111-8111-111111111111" },
      }],
    },
    command_policy: { execution_enabled: false },
    agent_key: "tcgplayer-pricing-completion-v1",
  };
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      if (/where w\.id = \$1::uuid/.test(sql)) return { rows: [replacement] };
      if (/w\.work_item_key ~/.test(sql)) {
        return { rows: Array.from({ length: 17 }, () => ({
          ...replacement,
          work_item_key:
            "pokemon-pricing-mapping-review:473ff153-12f6-4b7d-8821-a04d12a5c33a:master-authority-batch-01",
        })) };
      }
      return { rows: [] };
    },
  };
  await assert.rejects(
    supersedeLegacyPokemonMappingAuthorityReviewsV1(client, {
      replacementWorkItemId: replacement.id,
    }),
    /exceeds its bound/,
  );
  assert.equal(calls.at(-1), "rollback");
  assert.ok(calls.every((sql) => !/update public\.founder_work_items/.test(sql)));
});
