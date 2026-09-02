import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildProductionCatalogRoutesV1 } from "../../scripts/audits/production_catalog_crawl_v1.mjs";

test("production catalog crawl covers all governed TCG, collection, and social surfaces", () => {
  const routes = buildProductionCatalogRoutesV1({
    pokemon: { gv_id: "GV-PK-TEST-001", name: "Pikachu", set_code: "TEST" },
    one_piece: { gv_id: "GV-OP-TEST-001", name: "Monkey D. Luffy", set_code: "OPTEST" },
    mtg: { gv_id: "GV-MTG-TEST-001", name: "Black Lotus", set_code: "LEA" },
  });
  const names = new Set(routes.map((route) => route.name));

  for (const required of [
    "pokemon_search",
    "pokemon_sets",
    "pokemon_card",
    "one_piece_search",
    "one_piece_sets",
    "one_piece_card",
    "mtg_search",
    "mtg_sets",
    "mtg_card",
    "vault",
    "binders",
    "wall",
    "pulse",
  ]) {
    assert.ok(names.has(required), `${required} must be crawled`);
  }
  assert.equal(routes.length, 13);

  const expectedSetHeadings = new Map([
    ["pokemon_sets", "Browse Pokemon TCG Sets"],
    ["one_piece_sets", "Browse One Piece Card Game Releases"],
    ["mtg_sets", "Browse Magic: The Gathering Sets"],
  ]);
  for (const [name, heading] of expectedSetHeadings) {
    const route = routes.find((candidate) => candidate.name === name);
    assert.ok(route?.expected.includes(heading), `${name} must assert the current catalog heading`);
  }
});

test("production catalog crawl uses a disposable account, read-only catalog SQL, and verified cleanup", () => {
  const source = fs.readFileSync("scripts/audits/production_catalog_crawl_v1.mjs", "utf8");

  assert.match(source, /begin transaction read only/i);
  assert.match(source, /temporary_auth_user_only: true/);
  assert.match(source, /app_data_writes: false/);
  assert.match(source, /temporary_user_must_be_deleted: true/);
  assert.match(source, /deleteTemporaryAccount\(account\)/);
  assert.match(source, /establishServerAuthCookies\(context, account, origin\)/);
  assert.match(source, /createServerClient/);
  assert.match(source, /temporary_account_deleted_and_verified_absent/);
  assert.match(source, /fatal_error_sha256/);
  assert.match(source, /throw new Error\("temporary account sign-in failed"\)/);
  assert.doesNotMatch(source, /temporary account sign-in failed: \$\{error\.message\}/);
  assert.doesNotMatch(source, /insert\s+into\s+public\./i);
  assert.doesNotMatch(source, /update\s+public\./i);
  assert.doesNotMatch(source, /delete\s+from\s+public\./i);
});
