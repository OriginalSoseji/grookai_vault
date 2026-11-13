import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
  const code = overrides.code ?? "M6";
  const snapshot = (id, name, number) => {
    const body = `<h1 class="Heading1">${name}</h1><div class="subtext"><img class="img-regulation" alt="${code}"> ${number} / 2</div>`;
    const url = `https://www.pokemon-card.com/card-search/details.php/card/${id}/regu/all`;
    return { request_url: url, final_url: url, http_status: 200, body, body_sha256: createHash("sha256").update(body).digest("hex") };
  };
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
    official_identity_snapshots: [snapshot("10001", "カード一", "001"), snapshot("10002", "カード二", "002")],
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
  assert.equal(result.cards[0].official_source_present, true);
  assert.equal(result.cards[0].official_identity_evidence[0].body, sourceSet().official_identity_snapshots[0].body);
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

test("coordinate agreement alone or conflicting official evidence cannot admit a new card", () => {
  for (const conflict of ["missing", "tampered", "wrong_name", "wrong_host", "wrong_redirect", "conflicting_coordinate"]) {
    const source = sourceSet();
    const snap = source.official_identity_snapshots[1];
    if (conflict === "missing") source.official_identity_snapshots.pop();
    if (conflict === "tampered") snap.body += "tampered";
    if (conflict === "wrong_host") snap.request_url = "https://example.com/card-search/details.php/card/10002/regu/all";
    if (conflict === "wrong_redirect") snap.final_url = "https://example.com/card-search/details.php/card/10002/regu/all";
    if (conflict === "conflicting_coordinate") {
      const other = structuredClone(snap);
      other.body = other.body.replace("カード二", "別のカード");
      other.body_sha256 = createHash("sha256").update(other.body).digest("hex");
      source.official_identity_snapshots.push(other);
    }
    if (conflict === "wrong_name") {
      snap.body = snap.body.replace("カード二", "別のカード");
      snap.body_sha256 = createHash("sha256").update(snap.body).digest("hex");
    }
    const result = buildJapanesePokemonMasterIndexIncrementalV1({
      sourceSets: [source], baseSets: [], baseCards: [], asOf: "2026-08-27",
    });
    assert.equal(result.sets.length, 0);
    assert.equal(result.cards.length, 0);
    assert.deepEqual(result.decisions[0].reasons, ["official_printed_name_missing_or_conflicting:2"]);
  }
});

test("unverified historical names do not remove already admitted cards", () => {
  const overlay = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets: [sourceSet()], baseSets: [], baseCards: [], asOf: "2026-08-27",
  });
  const source = sourceSet();
  source.official_identity_snapshots = [];
  const result = buildJapanesePokemonMasterIndexIncrementalV1({
    sourceSets: [source], baseSets: [], baseCards: [], currentOverlay: overlay, asOf: "2026-08-27",
  });
  assert.deepEqual(result.sets, overlay.sets);
  assert.deepEqual(result.cards, overlay.cards);
  assert.equal(result.decisions[0].decision, "already_complete_in_master_index");
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
