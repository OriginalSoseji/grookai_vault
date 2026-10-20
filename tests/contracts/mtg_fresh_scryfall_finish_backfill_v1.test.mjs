import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMtgFreshScryfallFinishPlanV1,
  MTG_FRESH_SCRYFALL_FINISH_BACKFILL_V1,
  mtgFreshScryfallDatabaseConfigV1,
  scryfallLinkSupportsFinishV1,
} from "../../backend/pricing/mtg_fresh_scryfall_finish_backfill_policy_v1.mjs";

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
    }),
  ]);
  assert.equal(plan.selected_insert_count, 0);
  assert.equal(plan.review_only_product_count, 1);
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
