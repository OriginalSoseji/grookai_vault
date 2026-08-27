import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  buildJapanesePokemonMasterIndexIncrementalV1,
  mergeJapaneseMasterIndexIncrementalOverlayV1,
  normalizeJapaneseCardCoordinateV1,
} from "../../backend/catalog/japanese_pokemon_master_index_incremental_v1.mjs";

function sourceSet(overrides = {}) {
  return {
    catalog_scope: "pokemon_ja",
    code: "M6",
    source_set_id: "955",
    name: "Storm",
    release_date: "2026-08-01",
    expected_card_count: 2,
    count_scope: "full_set",
    aliases: ["M6"],
    count_evidence: [
      { authority: "tcgdex_japanese_structured_api", scope: "full_set", count: 2 },
      { authority: "bulbapedia_modern_japanese_set_list", scope: "full_set", count: 2 },
    ],
    tcgdex_cards: [
      { source_external_id: "M6-001", card_number_raw: "001", printed_name_ja: "カード一" },
      { source_external_id: "M6-002", card_number_raw: "002", printed_name_ja: "カード二" },
    ],
    independent_full_checklist_cards: [
      { source_external_id: "M6:1", card_number_raw: "1", english_display_name: "Card One" },
      { source_external_id: "M6:2", card_number_raw: "2", english_display_name: "Card Two" },
    ],
    ...overrides,
  };
}

test("coordinate normalization handles padded Japanese numbers", () => {
  assert.equal(normalizeJapaneseCardCoordinateV1("001/113"), "1");
  assert.equal(normalizeJapaneseCardCoordinateV1("SV001"), "SV1");
});

test("two complete independent coordinate lists admit a new Japanese set", () => {
  const result = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets: [sourceSet()],
    baseSets: [],
    baseCards: [],
    asOf: "2026-08-27",
  });
  assert.equal(result.sets.length, 1);
  assert.equal(result.cards.length, 2);
  assert.equal(result.cards[0].admission_status, "master_admissible");
  assert.equal(result.cards[0].official_source_present, false);
  assert.equal(result.decisions[0].decision, "admitted_incremental_delta");
});

test("an existing owner receives only missing card coordinates", () => {
  const baseSet = {
    jpn_set_key: "jpn-m6",
    official_code_evidence: ["M6"],
    expected_card_count_evidence: [2],
    master_admissible: true,
  };
  const baseCard = {
    jpn_set_key: "jpn-m6",
    printed_number: "1",
    printed_name_ja: "カード一",
    admission_status: "master_admissible",
  };
  const result = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets: [sourceSet()],
    baseSets: [baseSet],
    baseCards: [baseCard],
    asOf: "2026-08-27",
  });
  assert.equal(result.sets.length, 0);
  assert.equal(result.cards.length, 1);
  assert.equal(result.cards[0].printed_number, "002");
});

test("count or coordinate disagreement remains blocked", () => {
  const countMismatch = sourceSet({
    count_evidence: [
      { authority: "tcgdex_japanese_structured_api", scope: "full_set", count: 2 },
      { authority: "bulbapedia_modern_japanese_set_list", scope: "full_set", count: 1 },
    ],
  });
  const coordinateMismatch = sourceSet({
    independent_full_checklist_cards: [
      { source_external_id: "M6:1", card_number_raw: "1", english_display_name: "Card One" },
      { source_external_id: "M6:3", card_number_raw: "3", english_display_name: "Card Three" },
    ],
  });
  for (const source of [countMismatch, coordinateMismatch]) {
    const result = buildJapanesePokemonMasterIndexIncrementalV1({
      sourceSets: [source],
      baseSets: [],
      baseCards: [],
      asOf: "2026-08-27",
    });
    assert.equal(result.sets.length, 0);
    assert.equal(result.cards.length, 0);
    assert.equal(result.decisions[0].decision, "blocked");
  }
});

test("future releases and single-source lists cannot be admitted", () => {
  const future = sourceSet({ release_date: "2026-09-01" });
  const singleSource = sourceSet({ independent_full_checklist_cards: [] });
  for (const source of [future, singleSource]) {
    const result = buildJapanesePokemonMasterIndexIncrementalV1({
      sourceSets: [source],
      baseSets: [],
      baseCards: [],
      asOf: "2026-08-27",
    });
    assert.equal(result.cards.length, 0);
  }
});

test("verified overlay merges without replacing base authority", () => {
  const overlay = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets: [sourceSet()],
    baseSets: [],
    baseCards: [],
    asOf: "2026-08-27",
  });
  const merged = mergeJapaneseMasterIndexIncrementalOverlayV1({
    baseSets: [],
    baseCards: [],
    overlay,
  });
  assert.equal(merged.sets.length, 1);
  assert.equal(merged.cards.length, 2);
  assert.throws(() => mergeJapaneseMasterIndexIncrementalOverlayV1({
    baseSets: [overlay.sets[0]],
    baseCards: [],
    overlay,
  }), /set owner collision/);
});

test("Japanese incremental worker plans, applies, and replays idempotently", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "japanese-index-overlay-"));
  const discovery = path.join(root, "discovery");
  const firstPlan = path.join(root, "plan-1");
  const secondPlan = path.join(root, "plan-2");
  const overlay = path.join(root, "overlay.json");
  fs.mkdirSync(discovery, { recursive: true });
  fs.writeFileSync(
    path.join(discovery, "source_sets.json"),
    JSON.stringify([sourceSet({ code: "AUT1", source_set_id: "automation-fixture" })]),
  );
  const worker = path.resolve(
    "scripts/workers/japanese_pokemon_master_index_incremental_refresh_v1.mjs",
  );
  const run = (...args) => spawnSync(process.execPath, [worker, ...args], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });
  const planned = run(
    "--mode=plan",
    `--discovery-dir=${discovery}`,
    `--out-dir=${firstPlan}`,
    `--overlay-path=${overlay}`,
    "--as-of=2026-08-27",
  );
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).changed, true);
  const applied = run(
    "--mode=apply-to-worktree",
    `--plan-dir=${firstPlan}`,
    `--overlay-path=${overlay}`,
  );
  assert.equal(applied.status, 0, applied.stderr);
  const replay = run(
    "--mode=plan",
    `--discovery-dir=${discovery}`,
    `--out-dir=${secondPlan}`,
    `--overlay-path=${overlay}`,
    "--as-of=2026-08-27",
  );
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal(JSON.parse(replay.stdout).changed, false);
});
