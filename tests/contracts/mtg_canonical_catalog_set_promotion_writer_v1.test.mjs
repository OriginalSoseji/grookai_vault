import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMtgSetPromotionSecurityV1,
  assertMtgSetPromotionSourceLanesV1,
  buildMtgCanonicalSetPromotionApprovalV1,
  captureMtgSetPromotionCurrentSourceLanesV1,
} from "../../scripts/audits/mtg_canonical_catalog_set_promotion_writer_v1.mjs";

function fixture() {
  return {
    plan: {
      selected_set: { code: "msh", name: "Marvel Super Heroes" },
      promotion_plan_sha256: "a".repeat(64),
      writer_payload_fingerprint: "b".repeat(64),
      staging_batch_id: "276cc9f7-0159-5df3-874c-73ea04e741a4",
      staging_rows_sha256: "c".repeat(64),
      promotion_rows_sha256: "d".repeat(64),
      mutation_contract_sha256: "e".repeat(64),
      row_counts: {
        sets: 1,
        card_prints: 453,
        card_print_identity: 453,
        card_printings: 865,
        external_mappings: 453,
        external_printing_mappings: 864,
      },
    },
    repository: {
      governing_commit_sha: "f".repeat(40),
      governing_files_sha256: "1".repeat(64),
    },
  };
}

test("set writer approval binds exact rows, code, and prohibited boundaries", () => {
  const { plan, repository } = fixture();
  const approval = buildMtgCanonicalSetPromotionApprovalV1(plan, repository);
  assert.match(approval.approval_sha256, /^[0-9a-f]{64}$/);
  assert.match(approval.required_approval_message, /MTG set msh/);
  assert.match(approval.required_approval_message, /453 card_prints/);
  assert.match(approval.required_approval_message, /865 card_printings/);
  assert.match(approval.required_approval_message, /864 TCGPlayer/);
  assert.match(approval.required_approval_message, new RegExp(repository.governing_commit_sha));
  assert.match(approval.required_approval_message, /do not approve migrations/i);
  assert.match(approval.required_approval_message, /another set/);
  assert.match(approval.required_approval_message, /Pokemon mutation/);
});

test("set writer security accepts only the hidden release boundary", () => {
  assert.doesNotThrow(() => assertMtgSetPromotionSecurityV1({
    release_table_rls: true,
    anon_release_select: false,
    authenticated_release_select: false,
    service_release_select: true,
    service_release_insert: true,
    service_release_update: true,
    restrictive_policy_count: 5,
    internal_search_anon_execute: false,
    internal_search_authenticated_execute: false,
    wrapper_search_anon_execute: true,
    wrapper_search_authenticated_execute: true,
  }));
});

test("set writer security rejects an authenticated release-table grant", () => {
  assert.throws(() => assertMtgSetPromotionSecurityV1({
    release_table_rls: true,
    anon_release_select: false,
    authenticated_release_select: true,
    service_release_select: true,
    service_release_insert: true,
    service_release_update: true,
    restrictive_policy_count: 5,
    internal_search_anon_execute: false,
    internal_search_authenticated_execute: false,
    wrapper_search_anon_execute: true,
    wrapper_search_authenticated_execute: true,
  }), /security mismatch/);
});

test("source verification uses the newest complete planned-lane day", async () => {
  let queryText = "";
  let queryValues = null;
  const client = {
    async query(text, values) {
      queryText = text;
      queryValues = values;
      return {
        rows: [{
          planned_count: 2,
          source_row_count: 2,
          positive_market_price_count: 2,
          observed_on: "2026-08-14",
        }],
      };
    },
  };
  const payload = {
    rows: {
      external_printing_mappings: [
        { meta: { product_id: 101, source_subtype: "normal" } },
        { meta: { product_id: 102, source_subtype: "foil" } },
      ],
    },
  };

  const result = await captureMtgSetPromotionCurrentSourceLanesV1(client, payload);

  assert.equal(result.source_row_count, 2);
  assert.match(queryText, /first_planned/);
  assert.match(queryText, /candidate_days as materialized/);
  assert.match(queryText, /complete_days/);
  assert.match(queryText, /where not exists \(\s*select 1\s*from planned/s);
  assert.match(queryText, /observation\.observed_on = candidate\.observed_on/);
  assert.match(queryText, /order by candidate\.observed_on desc/);
  assert.doesNotMatch(queryText, /group by observation\.observed_on/);
  assert.doesNotMatch(queryText, /latest_day/);
  assert.deepEqual(JSON.parse(queryValues[0]), [
    { product_id: 101, subtype: "normal" },
    { product_id: 102, subtype: "foil" },
  ]);
});

test("set writer separates exact source identity from current price availability", () => {
  const plan = { row_counts: { external_printing_mappings: 237 } };
  assert.doesNotThrow(() => assertMtgSetPromotionSourceLanesV1({
    planned_count: 237,
    source_row_count: 237,
    positive_market_price_count: 236,
  }, plan));
  assert.throws(() => assertMtgSetPromotionSourceLanesV1({
    planned_count: 237,
    source_row_count: 236,
    positive_market_price_count: 236,
  }, plan), /current source lanes/);
  assert.throws(() => assertMtgSetPromotionSourceLanesV1({
    planned_count: 237,
    source_row_count: 237,
    positive_market_price_count: 238,
  }, plan), /positive source lanes exceeded mapped lanes/);
});
