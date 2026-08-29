import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PUBLIC_SET_BROWSE_CONTRACT_VERSION,
  getPublicSetBrowseConfig,
  getPublicSetBrowseGroup,
  getPublicSetProductLane,
  normalizePublicSetBrowseGroup,
  normalizePublicSetProductLane,
} from "./publicSetBrowseConfig.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const setsPageSource = fs.readFileSync(path.resolve(here, "../app/sets/page.tsx"), "utf8");
const tileSource = fs.readFileSync(path.resolve(here, "../components/sets/PublicSetTile.tsx"), "utf8");
const detailSource = fs.readFileSync(path.resolve(here, "../app/sets/[set_code]/page.tsx"), "utf8");
const gridSource = fs.readFileSync(path.resolve(here, "../components/PublicSetCardGrid.tsx"), "utf8");

test("cross-TCG set browser contract is versioned", () => {
  assert.equal(PUBLIC_SET_BROWSE_CONTRACT_VERSION, "CROSS_TCG_SET_BROWSER_V1");
});

test("One Piece releases use One Piece families and product types", () => {
  assert.equal(getPublicSetBrowseGroup({ code: "OP17" }, "one_piece"), "op");
  assert.equal(getPublicSetBrowseGroup({ code: "EB04" }, "one_piece"), "eb");
  assert.equal(getPublicSetBrowseGroup({ code: "PRB02" }, "one_piece"), "prb");
  assert.equal(getPublicSetBrowseGroup({ code: "ST31" }, "one_piece"), "st");
  assert.equal(getPublicSetBrowseGroup({ code: "DON" }, "one_piece"), "promo");
  assert.equal(getPublicSetProductLane({ code: "ST31" }, "one_piece"), "deck");
  assert.equal(getPublicSetProductLane({ code: "OP17" }, "one_piece"), "main");
  assert.equal(getPublicSetProductLane({ code: "EB04" }, "one_piece"), "special");
  assert.equal(getPublicSetBrowseConfig("one_piece").groupLabel, "Release family");
  assert.doesNotMatch(JSON.stringify(getPublicSetBrowseConfig("one_piece")), /Scarlet|Sword|Pokemon era/);
});

test("Magic releases use release periods and Magic product types", () => {
  assert.equal(getPublicSetBrowseGroup({ release_year: 2026 }, "mtg"), "current");
  assert.equal(getPublicSetBrowseGroup({ release_year: 2022 }, "mtg"), "recent");
  assert.equal(getPublicSetBrowseGroup({ release_year: 2014 }, "mtg"), "modern");
  assert.equal(getPublicSetBrowseGroup({ release_year: 1998 }, "mtg"), "legacy");
  assert.equal(getPublicSetProductLane({ code: "fic", name: "Final Fantasy Commander" }, "mtg"), "deck");
  assert.equal(getPublicSetProductLane({ code: "tfin", name: "Final Fantasy Tokens" }, "mtg"), "token");
  assert.equal(getPublicSetProductLane({ code: "pfin", name: "Final Fantasy Promos" }, "mtg"), "promo");
  for (const code of ["tmp", "ths", "tsp", "pcy", "pls"]) {
    assert.equal(
      getPublicSetProductLane({ code, catalog_set_type: "expansion" }, "mtg"),
      "main",
    );
  }
  assert.equal(
    getPublicSetProductLane({ code: "por", catalog_set_type: "starter" }, "mtg"),
    "main",
  );
  assert.equal(
    getPublicSetProductLane({ code: "tfin", catalog_set_type: "token" }, "mtg"),
    "token",
  );
  assert.equal(
    getPublicSetProductLane({ code: "pfin", catalog_set_type: "promo" }, "mtg"),
    "promo",
  );
  assert.equal(getPublicSetBrowseConfig("mtg").groupLabel, "Release period");
});

test("incompatible group and lane values reset when games change", () => {
  assert.equal(normalizePublicSetBrowseGroup("sv", "one_piece"), "all");
  assert.equal(normalizePublicSetBrowseGroup("op", "mtg"), "all");
  assert.equal(normalizePublicSetProductLane("world", "one_piece"), "all");
});

test("set list scopes before loading and set links preserve game identity", () => {
  assert.match(setsPageSource, /getPublicSets\(gameScope, false\)/);
  assert.match(tileSource, /routeParams\.set\("game", setInfo\.game_code\)/);
  assert.match(tileSource, /setInfo\.hero_image_url/);
  assert.match(detailSource, /getCachedPublicSetByCode\(params\.set_code, gameCode\)/);
  assert.match(detailSource, /getPublicSetCards\(params\.set_code, 0, INITIAL_CARD_CHUNK, setDetail\.game_code\)/);
  assert.match(gridSource, /game=\$\{encodeURIComponent\(gameCode\)\}/);
});
