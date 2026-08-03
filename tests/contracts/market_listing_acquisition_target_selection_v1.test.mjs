import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKET_LISTING_ACQUISITION_TARGET_SELECTION_VERSION,
  acquisitionCoverageLaneV1,
  selectMarketListingAcquisitionTargetsV1,
} from "../../backend/pricing/market_listing_acquisition_target_selection_v1.mjs";

function target(id, overrides = {}) {
  return {
    card_print_id: `card-${id}`,
    gv_id: `GV-PK-${id}`,
    game: "pokemon",
    release_date: "2025-01-01",
    last_queried_at: null,
    rarity: "Rare",
    ...overrides,
  };
}

test("new English Pokemon releases enter the next acquisition selection without a code list", () => {
  const selected = selectMarketListingAcquisitionTargetsV1({
    targets: [
      target("OLD-SPECIAL", {
        release_date: "1999-01-09",
        acquisition_priority: "priority_variant_special_finish",
      }),
      target("NEW-SET", { release_date: "2026-07-17" }),
      target("JAPANESE", { game: "pokemon_jpn", release_date: "2026-07-20" }),
    ],
    limit: 1,
    asOf: "2026-08-03T00:00:00.000Z",
  });

  assert.equal(selected.length, 1);
  assert.equal(selected[0].gv_id, "GV-PK-NEW-SET");
  assert.equal(selected[0].coverage_lane, "new_release_unqueried");
  assert.equal(selected[0].target_selection_version, MARKET_LISTING_ACQUISITION_TARGET_SELECTION_VERSION);
});

test("queried new releases yield to never-queried coverage and then rotate by oldest evidence", () => {
  const asOf = "2026-08-03T00:00:00.000Z";
  const rows = [
    target("NEW-QUERIED", {
      release_date: "2026-07-17",
      last_queried_at: "2026-08-02T00:00:00.000Z",
    }),
    target("OLD-UNQUERIED", { release_date: "2020-01-01" }),
    target("OLDER-EVIDENCE", {
      release_date: "2019-01-01",
      last_queried_at: "2026-05-01T00:00:00.000Z",
    }),
    target("NEWER-EVIDENCE", {
      release_date: "2018-01-01",
      last_queried_at: "2026-07-01T00:00:00.000Z",
    }),
  ];

  assert.equal(selectMarketListingAcquisitionTargetsV1({ targets: rows, limit: 1, asOf })[0].gv_id, "GV-PK-OLD-UNQUERIED");
  const refresh = selectMarketListingAcquisitionTargetsV1({
    targets: rows.filter((row) => row.last_queried_at),
    limit: 3,
    asOf,
  });
  assert.deepEqual(refresh.map((row) => row.gv_id), [
    "GV-PK-NEW-QUERIED",
    "GV-PK-OLDER-EVIDENCE",
    "GV-PK-NEWER-EVIDENCE",
  ]);
});

test("future releases are not treated as live new-set coverage", () => {
  assert.equal(acquisitionCoverageLaneV1(target("FUTURE", {
    release_date: "2026-09-01",
  }), { asOf: "2026-08-03T00:00:00.000Z" }), "unqueried");
  assert.deepEqual(selectMarketListingAcquisitionTargetsV1({
    targets: [target("FUTURE", { release_date: "2026-09-01" })],
    limit: 10,
    asOf: "2026-08-03T00:00:00.000Z",
  }), []);
});

test("selection excludes non-English Pokemon domains", () => {
  const selected = selectMarketListingAcquisitionTargetsV1({
    targets: [
      target("ENGLISH", { game: "pokemon" }),
      target("JAPANESE", { game: "pokemon_jpn", release_date: "2026-07-20" }),
    ],
    limit: 10,
    asOf: "2026-08-03T00:00:00.000Z",
  });
  assert.deepEqual(selected.map((row) => row.gv_id), ["GV-PK-ENGLISH"]);
});

test("selection deduplicates printing or parent identities before applying its limit", () => {
  const selected = selectMarketListingAcquisitionTargetsV1({
    targets: [target("ONE"), target("ONE"), target("TWO")],
    limit: 5,
    asOf: "2026-08-03T00:00:00.000Z",
  });
  assert.equal(selected.length, 2);
});
