import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  buildMtgFreshScryfallFinishPlanV1,
  canonicalChildSupportsFinishV1,
  classifyMtgFreshScryfallFinishGapV1,
  MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1,
  mtgFreshScryfallDatabaseConfigV1,
  scryfallLinkSupportsFinishV1,
} from "../../backend/pricing/mtg_fresh_scryfall_finish_backfill_policy_v1.mjs";

const workflow = fs.readFileSync(new URL(
  "../../.github/workflows/mtg-pricing-publication-runner.yml",
  import.meta.url,
), "utf8");
const worker = fs.readFileSync(new URL(
  "../../scripts/audits/mtg_fresh_scryfall_finish_backfill_v1.mjs",
  import.meta.url,
), "utf8");

const child = (id, parent = "parent-a", support = ["scryfall-a"]) => ({
  card_print_id: parent,
  card_printing_id: id,
  supporting_scryfall_print_ids: support,
});

const lane = (overrides = {}) => ({
  product_id: "123",
  group_id: 7,
  group_name: "Example Set",
  product_name: "Example Card",
  subtype: "normal",
  finish: "normal",
  source_observation_id: "observation-a",
  child_candidates: [child("child-normal")],
  existing_mappings: [],
  gap_classification: "exact",
  evidence_counts: { eligible_child_candidate_count: 1 },
  ...overrides,
});

test("selects every exact observed lane of a fully exact product", () => {
  const plan = buildMtgFreshScryfallFinishPlanV1([
    lane(),
    lane({
      subtype: "foil",
      finish: "foil",
      source_observation_id: "observation-b",
      child_candidates: [child("child-foil", "parent-b", ["scryfall-b"])],
    }),
  ], { commit_sha: "abc" }, { source_sha256: "def" });
  assert.equal(plan.version, MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1);
  assert.equal(plan.fully_exact_product_count, 1);
  assert.equal(plan.selected_insert_count, 2);
  assert.deepEqual(plan.insert_rows.map((row) => row.external_id), [
    "123:foil",
    "123:normal",
  ]);
  assert.match(plan.required_approval, /:2$/);
});

test("holds the entire product when one observed lane is ambiguous", () => {
  const plan = buildMtgFreshScryfallFinishPlanV1([
    lane(),
    lane({
      subtype: "foil",
      finish: "foil",
      child_candidates: [child("child-foil-a"), child("child-foil-b")],
      gap_classification: "ambiguous_eligible_finish_children",
      evidence_counts: { eligible_child_candidate_count: 2 },
    }),
  ]);
  assert.equal(plan.selected_insert_count, 0);
  assert.equal(plan.review_only_product_count, 1);
  assert.deepEqual(plan.review_classification_counts, {
    ambiguous_eligible_finish_children: 1,
  });
});

test("holds a missing lane when another lane for the product is already published but no longer exact", () => {
  const plan = buildMtgFreshScryfallFinishPlanV1([
    lane(),
    lane({
      subtype: "foil",
      finish: "foil",
      source_observation_id: "observation-b",
      child_candidates: [],
      gap_classification: "missing_canonical_finish_child",
      evidence_counts: { eligible_child_candidate_count: 0 },
      existing_mappings: [{ id: "mapping-b", card_printing_id: "old-child", active: true }],
    }),
  ]);
  assert.equal(plan.selected_insert_count, 0);
  assert.equal(plan.already_exact_count, 0);
  assert.equal(plan.review_only_product_count, 1);
});

test("classifies each deterministic zero-candidate boundary", () => {
  const base = {
    finish: "normal",
    total_scryfall_link_count: 1,
    standard_scryfall_link_count: 1,
    finish_compatible_scryfall_link_count: 1,
    canonical_row_count: 1,
    finish_matching_canonical_row_count: 1,
    active_finish_row_count: 1,
    visible_parent_row_count: 1,
    non_provisional_row_count: 1,
    exact_identity_row_count: 1,
    review_clear_row_count: 1,
    eligible_child_candidate_count: 1,
  };
  assert.equal(classifyMtgFreshScryfallFinishGapV1(base), "exact");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    total_scryfall_link_count: 0,
  }), "missing_scryfall_product_link");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    standard_scryfall_link_count: 0,
  }), "etched_only_scryfall_product_link");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    finish_compatible_scryfall_link_count: 0,
  }), "scryfall_finish_not_supported");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    canonical_row_count: 0,
  }), "missing_canonical_scryfall_mapping");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    finish_matching_canonical_row_count: 0,
  }), "missing_canonical_finish_child");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    active_finish_row_count: 0,
  }), "inactive_finish_child");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    visible_parent_row_count: 0,
  }), "hidden_canonical_parent");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    non_provisional_row_count: 0,
  }), "provisional_finish_child");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    exact_identity_row_count: 0,
  }), "non_exact_canonical_identity");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    review_clear_row_count: 0,
  }), "hidden_printing_truth_review");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    eligible_child_candidate_count: 2,
  }), "ambiguous_eligible_finish_children");
  assert.equal(classifyMtgFreshScryfallFinishGapV1({
    ...base,
    finish: null,
  }), "unsupported_source_subtype");
});

test("accepts an identical active row and blocks a conflicting row", () => {
  const exact = buildMtgFreshScryfallFinishPlanV1([
    lane({
      existing_mappings: [{ id: "mapping-a", card_printing_id: "child-normal", active: true }],
    }),
  ]);
  assert.equal(exact.selected_insert_count, 0);
  assert.equal(exact.already_exact_count, 1);

  const conflict = buildMtgFreshScryfallFinishPlanV1([
    lane({
      existing_mappings: [{ id: "mapping-b", card_printing_id: "other-child", active: true }],
    }),
  ]);
  assert.equal(conflict.blocking_unsafe_count, 1);
  assert.equal(conflict.selected_insert_count, 0);
});

test("fingerprint is stable across input ordering", () => {
  const rows = [
    lane(),
    lane({ product_id: "124", source_observation_id: "observation-c" }),
  ];
  const left = buildMtgFreshScryfallFinishPlanV1(rows);
  const right = buildMtgFreshScryfallFinishPlanV1([...rows].reverse());
  assert.equal(left.plan_fingerprint, right.plan_fingerprint);
  assert.equal(left.insert_rows_sha256, right.insert_rows_sha256);
});

test("standard Scryfall links cannot borrow etched product authority", () => {
  assert.equal(
    scryfallLinkSupportsFinishV1({ role: "standard", finishes: ["nonfoil", "foil"] }, "foil"),
    true,
  );
  assert.equal(
    scryfallLinkSupportsFinishV1({ role: "etched", finishes: ["foil", "etched"] }, "foil"),
    false,
  );
});

test("canonical candidates require an active finish and visible parent", () => {
  const candidate = {
    finish: "foil",
    finish_is_active: true,
    card_is_visible: true,
    is_provisional: false,
    exact_identity_count: 1,
    hidden_review_count: 0,
  };
  assert.equal(canonicalChildSupportsFinishV1(candidate, "foil"), true);
  assert.equal(canonicalChildSupportsFinishV1({ ...candidate, finish_is_active: false }, "foil"), false);
  assert.equal(canonicalChildSupportsFinishV1({ ...candidate, card_is_visible: false }, "foil"), false);
});

test("database target pins the Grookai project and verified TLS", () => {
  const direct = mtgFreshScryfallDatabaseConfigV1(
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?sslmode=no-verify",
    {},
  );
  assert.equal(direct.ssl.rejectUnauthorized, true);
  assert.equal(direct.ssl.servername, "db.ycdxbpibncqcchqiihfz.supabase.co");
  assert.equal(new URL(direct.connectionString).search, "");
  assert.throws(() => mtgFreshScryfallDatabaseConfigV1(
    "postgresql://postgres:fixture@db.other.supabase.co:5432/postgres",
    {},
  ), /wrong_database_project/);
  assert.throws(() => mtgFreshScryfallDatabaseConfigV1(
    "postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres?options=bad",
    {},
  ), /unexpected_database_option/);
});

test("hosted finish mapping freezes source, plan, rollback, and apply evidence", () => {
  assert.match(workflow, /finish_map_plan/);
  assert.match(workflow, /finish_map_dry_run/);
  assert.match(workflow, /finish_map_apply/);
  assert.match(workflow, /https:\/\/api\.scryfall\.com\/bulk-data\/default-cards/);
  assert.match(workflow, /jq -er '\.jsonl_download_uri'/);
  assert.match(workflow, /gzip --test "\$source_dir\/default-cards\.jsonl\.gz"/);
  assert.doesNotMatch(workflow, /jq -c '\.\[\]'[\s\S]*gzip -n -9/);
  assert.match(workflow, /SUPABASE_DB_CA_CERT: \$\{\{ secrets\.SUPABASE_DB_CA_CERT \}\}/);
  assert.match(workflow, /expected_finish_plan_id:/);
  assert.match(workflow, /expected_finish_dry_run_id:/);
  assert.match(workflow, /gh run download "\$proof_id"/);
  assert.match(workflow, /local expected_stage="\$\{expected_operation#finish_map_\}"/);
  assert.match(workflow, /mtg-finish-map-\$expected_stage\/output\/summary\.json/);
  assert.match(workflow, /mtg-finish-map-\$expected_stage\/source\/default-cards\.jsonl\.gz/);
  assert.doesNotMatch(workflow, /-path '\*\/output\/summary\.json'/);
  assert.match(workflow, /summary\.plan\?\.blocking_unsafe_count !== 0/);
  assert.match(workflow, /proof\.plan\?\.plan_fingerprint !== current\.plan\?\.plan_fingerprint/);
  assert.match(workflow, /executed\.plan\?\.plan_fingerprint !== proof\.plan\?\.plan_fingerprint/);
  assert.match(workflow, /Executed finish-map dry-run drifted from frozen plan/);
  assert.match(workflow, /test "\$pricing_run_id" = "\$current_pricing_run_id"/);
  assert.match(workflow, /MTG_FRESH_SCRYFALL_FINISH_MAPPING_APPROVAL/);
  assert.match(workflow, /--expected-head-sha=\$EXPECTED_SHA/);
  assert.match(worker, /const databaseConfig = mtgFreshScryfallDatabaseConfigV1\(databaseUrl\)/);
  assert.match(worker, /const client = new pg\.Client\(databaseConfig\)/);
  assert.doesNotMatch(worker, /targetBindingFromEnvironment|connectVerifiedDbClient/);
});
