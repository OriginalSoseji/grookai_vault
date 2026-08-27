import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import zlib from "node:zlib";

import {
  buildPokemonLanguageCandidateIndexReconciliationV1,
  mergePokemonLanguageCandidateSnapshotV1,
  normalizePokemonLanguageSourceSnapshotV1,
  POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
  summarizePokemonLanguageCandidateSnapshotV1,
  TCGDEX_LIVE_POKEMON_LANGUAGE_SCOPES,
  TCGDEX_POKEMON_LANGUAGE_SCOPES,
} from "../../backend/catalog/pokemon_language_master_index_v1.mjs";
import { parseTcgdexGithubLanguageSourceTreeV1 } from
  "../../backend/catalog/tcgdex_github_language_source_v1.mjs";

const sets = [
  { id: "sv01", name: "Set One", cardCount: { official: 1, total: 1 } },
  { id: "tk-hs-g", name: "Trainer Kit", cardCount: { official: 1, total: 1 } },
];
const cards = [
  { id: "sv01-1", localId: "1", name: "Pikachu", image: "https://example/1" },
  { id: "tk-hs-g-1", localId: "1", name: "Raichu", image: "https://example/2" },
];

test("all provider language scopes are explicit", () => {
  assert.equal(TCGDEX_POKEMON_LANGUAGE_SCOPES.length, 18);
  for (const language of ["en", "ja", "fr", "pt-br", "zh-tw", "zh-cn"]) {
    assert.ok(TCGDEX_POKEMON_LANGUAGE_SCOPES.includes(language));
  }
  assert.deepEqual(TCGDEX_LIVE_POKEMON_LANGUAGE_SCOPES, [
    "de", "en", "es", "fr", "id", "it", "ja", "pt-br", "th", "zh-tw",
  ]);
});

test("source cards become persistent candidates without canonical authority", () => {
  const snapshot = normalizePokemonLanguageSourceSnapshotV1({ language: "en", sets, cards });
  assert.equal(snapshot.version, POKEMON_LANGUAGE_MASTER_INDEX_VERSION);
  assert.equal(snapshot.canonical_authority, false);
  assert.equal(snapshot.cards.length, 2);
  assert.equal(snapshot.cards[0].canonical_authority, false);
  assert.equal(snapshot.cards[0].evidence_status, "single_source_candidate");
  assert.equal(snapshot.cards.find((row) => row.source_card_id === "tk-hs-g-1").source_set_id,
    "tk-hs-g");
  assert.deepEqual(snapshot.source_anomalies, []);
});

test("orphan source cards are preserved as non-canonical anomalies", () => {
  const snapshot = normalizePokemonLanguageSourceSnapshotV1({
    language: "de",
    sets: [sets[0]],
    cards: [...cards.slice(0, 1), {
      id: "pop8-1",
      localId: "1",
      name: "Heatran",
    }],
  });
  assert.equal(snapshot.cards.length, 1);
  assert.equal(snapshot.source_anomalies.length, 1);
  assert.equal(snapshot.source_anomalies[0].anomaly_type,
    "source_card_without_set_owner");
  assert.equal(snapshot.source_anomalies[0].source_payload.name, "Heatran");
  assert.equal(snapshot.source_anomalies[0].canonical_authority, false);
  assert.equal(snapshot.source_anomalies[0].revalidation_required, true);
});

test("conflicting duplicate set IDs preserve every source row in quarantine", () => {
  const snapshot = normalizePokemonLanguageSourceSnapshotV1({
    language: "zh-cn",
    sets: [
      { id: "CSV1C", name: "Gem Pack", cardCount: { total: 9 } },
      { id: "CSV1C", name: "Ancient Continuity", cardCount: { total: 127 } },
    ],
    cards: [],
  });
  assert.equal(snapshot.sets.length, 0);
  assert.equal(snapshot.source_anomalies.length, 2);
  assert.ok(snapshot.source_anomalies.every((row) =>
    row.anomaly_type === "duplicate_source_set_id" &&
    row.source_key === "CSV1C" &&
    row.canonical_authority === false
  ));
  assert.deepEqual(
    snapshot.source_anomalies.map((row) => row.source_payload.name).sort(),
    ["Ancient Continuity", "Gem Pack"],
  );
});

test("discovery reconciliation exposes every scope without promoting candidates", () => {
  const reconciliation = buildPokemonLanguageCandidateIndexReconciliationV1({
    registry: {
      version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
      canonical_authority: false,
      languages: [{
        language: "fr",
        status: "candidate_index_ready",
        set_count: 10,
        card_count: 100,
        sets_fingerprint_sha256: "sets-fr",
        cards_fingerprint_sha256: "cards-fr",
      }],
    },
    canonicalCardCountsByLanguage: { en: 21_693, ja: 28_008 },
  });
  assert.equal(reconciliation.languages.length, 18);
  assert.equal(reconciliation.summary.promotion_candidate_count, 0);
  assert.equal(reconciliation.languages.find((row) => row.language === "fr")
    .candidate_card_count, 100);
  assert.equal(reconciliation.languages.find((row) => row.language === "fr")
    .candidate_source_anomaly_count, 0);
  assert.equal(reconciliation.languages.find((row) => row.language === "fr")
    .admission_status, "candidate_only_pending_independent_evidence_adapter");
  assert.equal(reconciliation.languages.find((row) => row.language === "en")
    .canonical_database_card_count, 21_693);
  assert.equal(reconciliation.languages.find((row) => row.language === "ja")
    .admission_adapter, "japanese_master_index_v4_plus_incremental_v1");
  assert.ok(reconciliation.languages.every((row) =>
    row.canonical_authority === false && row.promotion_candidate_count === 0
  ));
});

test("candidate registry cannot claim canonical authority", () => {
  assert.throws(
    () => buildPokemonLanguageCandidateIndexReconciliationV1({
      registry: {
        version: POKEMON_LANGUAGE_MASTER_INDEX_VERSION,
        canonical_authority: true,
        languages: [],
      },
    }),
    /candidate registry is invalid/,
  );
});

test("official GitHub source fallback extracts multilingual identity without executing source", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tcgdex-source-tree-"));
  const western = path.join(root, "data", "Series");
  const asian = path.join(root, "data-asia", "Series");
  fs.mkdirSync(path.join(western, "Set One"), { recursive: true });
  fs.mkdirSync(path.join(asian, "Set Japan"), { recursive: true });
  fs.writeFileSync(path.join(western, "Set One.ts"), `
    const base1 = {
      id: "sv-test",
      name: { en: "Set One", fr: "Serie Un" },
      cardCount: { official: 1 },
      serie: {},
    };
    export default base1;
  `);
  fs.writeFileSync(path.join(western, "Set One", "001.ts"), `
    const card = {
      name: { en: "Pikachu", fr: "Pikachu FR" },
      attacks: [{ name: { en: "Do not parse me" } }],
    };
  `);
  fs.writeFileSync(path.join(asian, "Set Japan.ts"), `
    const set = { id: "sv-jp", name: { ja: "セット", th: "ชุด" }, serie: {}, cardCount: { official: 1 } };
  `);
  fs.writeFileSync(path.join(asian, "Set Japan", "001.ts"), `
    const card = { name: { ja: "ピカチュウ", th: "พิคาชู" } };
  `);

  const parsed = await parseTcgdexGithubLanguageSourceTreeV1({
    repositoryRoot: root,
    sourceCommitSha: "abc123",
    concurrency: 2,
  });
  assert.equal(parsed.source_commit_sha, "abc123");
  assert.equal(parsed.snapshots.en.cards[0].name, "Pikachu");
  assert.equal(parsed.snapshots.fr.cards[0].id, "sv-test-001");
  assert.equal(parsed.snapshots.ja.cards[0].name, "ピカチュウ");
  assert.equal(parsed.snapshots.th.status, "available");
  assert.equal(parsed.snapshots.de.status, "provider_no_cards");
  const normalized = normalizePokemonLanguageSourceSnapshotV1({
    language: "ja",
    sets: parsed.snapshots.ja.sets,
    cards: parsed.snapshots.ja.cards,
    source: parsed.source,
    sourceCommitSha: parsed.source_commit_sha,
  });
  assert.equal(normalized.source, "tcgdex_github_snapshot");
  assert.equal(normalized.source_commit_sha, "abc123");
  assert.match(normalized.cards[0].source_evidence_reference, /001\.ts$/);
});

test("cumulative merge preserves temporarily absent rows and prior printed names", () => {
  const baseline = normalizePokemonLanguageSourceSnapshotV1({ language: "fr", sets, cards });
  const current = normalizePokemonLanguageSourceSnapshotV1({
    language: "fr",
    sets,
    cards: [{ ...cards[0], name: "Pikachu corrigé" }],
  });
  const merged = mergePokemonLanguageCandidateSnapshotV1({
    baseline,
    current,
    catastrophicDropRatio: 0,
  });
  const changed = merged.cards.find((row) => row.source_card_id === "sv01-1");
  const absent = merged.cards.find((row) => row.source_card_id === "tk-hs-g-1");
  assert.deepEqual(changed.prior_printed_names, ["Pikachu"]);
  assert.equal(absent.source_presence, "temporarily_unobserved");
  assert.equal(absent.revalidation_required, true);
});

test("cumulative merge preserves resolved source anomalies for revalidation", () => {
  const baseline = normalizePokemonLanguageSourceSnapshotV1({
    language: "de",
    sets: [sets[0]],
    cards: [...cards.slice(0, 1), {
      id: "pop8-1",
      localId: "1",
      name: "Heatran",
    }],
  });
  const current = normalizePokemonLanguageSourceSnapshotV1({
    language: "de",
    sets: [sets[0]],
    cards: cards.slice(0, 1),
  });
  const merged = mergePokemonLanguageCandidateSnapshotV1({
    baseline,
    current,
    catastrophicDropRatio: 0,
  });
  assert.equal(merged.source_anomalies.length, 1);
  assert.equal(merged.source_anomalies[0].source_presence, "temporarily_unobserved");
  assert.equal(merged.source_anomalies[0].revalidation_required, true);
});

test("daily workflow approves generated PR guard before automatic merge", () => {
  const workflow = fs.readFileSync(
    path.resolve(".github/workflows/pokemon-master-index-refresh.yml"),
    "utf8",
  );
  const approval = workflow.indexOf("Approve and verify generated pull request checks");
  const merge = workflow.indexOf("Merge governed data-only update automatically");
  assert.ok(approval > 0);
  assert.ok(merge > approval);
  assert.match(workflow, /actions\/runs\/\$RUN_ID\/approve/);
  assert.match(workflow, /gh run watch "\$RUN_ID" --exit-status/);
});

test("catastrophic source regression fails closed", () => {
  const largeCards = Array.from({ length: 100 }, (_, index) => ({
    id: `sv01-${index + 1}`,
    localId: String(index + 1),
    name: `Card ${index + 1}`,
  }));
  const largeSets = [{ id: "sv01", name: "Set", cardCount: { total: 100 } }];
  const baseline = normalizePokemonLanguageSourceSnapshotV1({
    language: "de",
    sets: largeSets,
    cards: largeCards,
  });
  const current = normalizePokemonLanguageSourceSnapshotV1({
    language: "de",
    sets: largeSets,
    cards: largeCards.slice(0, 10),
  });
  assert.throws(
    () => mergePokemonLanguageCandidateSnapshotV1({ baseline, current }),
    /Catastrophic de source regression/,
  );
});

test("worker plan and apply are deterministic with fixture sources", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-language-index-"));
  const source = path.join(root, "source");
  const baseline = path.join(root, "baseline");
  const firstPlan = path.join(root, "plan-1");
  const secondPlan = path.join(root, "plan-2");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "fr.sets.json"), JSON.stringify(sets));
  fs.writeFileSync(path.join(source, "fr.cards.json"), JSON.stringify(cards));
  const worker = path.resolve("scripts/workers/pokemon_language_master_index_refresh_v1.mjs");
  const run = (...args) => spawnSync(process.execPath, [worker, ...args], {
    cwd: path.resolve("."),
    encoding: "utf8",
  });

  const planned = run(
    "--mode=plan",
    `--baseline-dir=${baseline}`,
    `--source-dir=${source}`,
    `--out-dir=${firstPlan}`,
    "--languages=fr",
  );
  assert.equal(planned.status, 0, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).changed, true);
  const firstRegistry = JSON.parse(fs.readFileSync(
    path.join(firstPlan, "candidate_index", "language_registry_v1.json"),
    "utf8",
  ));
  assert.equal(firstRegistry.languages.length, 18);
  assert.equal(firstRegistry.languages.find((row) => row.language === "fr")
    .source_anomaly_count, 0);
  assert.ok(fs.existsSync(path.join(
    firstPlan,
    "candidate_index",
    "fr",
    "source_anomalies.json.gz",
  )));
  assert.equal(firstRegistry.languages.find((row) => row.language === "de").status,
    "not_selected_no_baseline");
  const applied = run(
    "--mode=apply-to-worktree",
    `--baseline-dir=${baseline}`,
    `--plan-dir=${firstPlan}`,
  );
  assert.equal(applied.status, 0, applied.stderr);
  assert.equal(summarizePokemonLanguageCandidateSnapshotV1(
    normalizePokemonLanguageSourceSnapshotV1({ language: "fr", sets, cards }),
  ).card_count, 2);
  const baselineRegistryPath = path.join(baseline, "language_registry_v1.json");
  const baselineRegistry = JSON.parse(fs.readFileSync(baselineRegistryPath, "utf8"));
  Object.assign(
    baselineRegistry.languages.find((row) => row.language === "de"),
    {
      status: "candidate_index_ready",
      set_count: 9,
      card_count: 90,
      source: "prior_source",
      source_commit_sha: "prior-commit",
    },
  );
  fs.writeFileSync(baselineRegistryPath, JSON.stringify(baselineRegistry));

  const replay = run(
    "--mode=plan",
    `--baseline-dir=${baseline}`,
    `--source-dir=${source}`,
    `--out-dir=${secondPlan}`,
    "--languages=fr",
  );
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal(JSON.parse(replay.stdout).changed, false);
  const replayRegistry = JSON.parse(fs.readFileSync(
    path.join(secondPlan, "candidate_index", "language_registry_v1.json"),
    "utf8",
  ));
  assert.equal(replayRegistry.languages.length, 18);
  assert.equal(replayRegistry.languages.find((row) => row.language === "fr").card_count, 2);
  assert.equal(replayRegistry.languages.find((row) => row.language === "de").card_count, 90);
  assert.equal(replayRegistry.languages.find((row) => row.language === "de").source_commit_sha,
    "prior-commit");
});

test("worker persists source anomalies instead of failing the language", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pokemon-language-anomaly-"));
  const source = path.join(root, "source");
  const out = path.join(root, "plan");
  const baseline = path.join(root, "baseline");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(path.join(source, "de.sets.json"), JSON.stringify([sets[0]]));
  fs.writeFileSync(path.join(source, "de.cards.json"), JSON.stringify([
    cards[0],
    { id: "pop8-1", localId: "1", name: "Heatran" },
  ]));
  const worker = path.resolve("scripts/workers/pokemon_language_master_index_refresh_v1.mjs");
  const planned = spawnSync(process.execPath, [
    worker,
    "--mode=plan",
    `--baseline-dir=${baseline}`,
    `--source-dir=${source}`,
    `--out-dir=${out}`,
    "--languages=de",
  ], { cwd: path.resolve("."), encoding: "utf8" });
  assert.equal(planned.status, 0, planned.stderr);
  const report = JSON.parse(planned.stdout);
  assert.deepEqual(report.required_live_language_failures, []);
  assert.deepEqual(report.source_anomaly_languages, ["de"]);
  assert.equal(report.source_anomaly_count, 1);
  assert.equal(report.results[0].status, "candidate_index_ready");
  assert.equal(report.results[0].card_count, 1);
  const anomalyBuffer = fs.readFileSync(path.join(
    out,
    "candidate_index",
    "de",
    "source_anomalies.json.gz",
  ));
  const anomalies = JSON.parse(zlib.gunzipSync(anomalyBuffer).toString("utf8"));
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].source_payload.id, "pop8-1");

  const applied = spawnSync(process.execPath, [
    worker,
    "--mode=apply-to-worktree",
    `--baseline-dir=${baseline}`,
    `--plan-dir=${out}`,
  ], { cwd: path.resolve("."), encoding: "utf8" });
  assert.equal(applied.status, 0, applied.stderr);
  fs.writeFileSync(path.join(source, "de.cards.json"), JSON.stringify([cards[0]]));
  const replayOut = path.join(root, "replay");
  const replay = spawnSync(process.execPath, [
    worker,
    "--mode=plan",
    `--baseline-dir=${baseline}`,
    `--source-dir=${source}`,
    `--out-dir=${replayOut}`,
    "--languages=de",
  ], { cwd: path.resolve("."), encoding: "utf8" });
  assert.equal(replay.status, 0, replay.stderr);
  const replayReport = JSON.parse(replay.stdout);
  assert.deepEqual(replayReport.source_anomaly_languages, ["de"]);
  assert.equal(replayReport.source_anomaly_count, 1);
  assert.equal(replayReport.observed_source_anomaly_count, 0);
  assert.equal(replayReport.revalidation_source_anomaly_count, 1);
});
