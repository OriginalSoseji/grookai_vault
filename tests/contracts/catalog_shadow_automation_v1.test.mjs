import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";

import {
  buildCatalogShadowReconciliationV1,
  CATALOG_SHADOW_MODE,
} from "../../backend/catalog/catalog_shadow_automation_v1.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const workflow = (name) => fs.readFileSync(
  path.join(ROOT, ".github", "workflows", name),
  "utf8",
);

const SCHEDULED_CATALOG_WORKFLOWS = [
  "catalog-incremental-promotion.yml",
  "mtg-catalog-supervisor.yml",
  "pokemon-master-index-refresh.yml",
  "universal-catalog-discovery.yml",
];

test("shadow reconciliation preserves candidates without authorizing execution", () => {
  const result = buildCatalogShadowReconciliationV1({
    actionableGaps: [{ game_code: "mtg", status: "missing_set" }],
    actualHeadSha: "a".repeat(40),
    discoverySummary: {
      version: "UNIVERSAL_CATALOG_DISCOVERY_V1",
      database_mode: "read-only transaction",
    },
    expectedHeadSha: "a".repeat(40),
    masterIndexCandidates: [{ language: "en" }],
    promotionCandidates: [{ game_code: "mtg", status: "missing_set" }],
  });
  assert.equal(result.mode, CATALOG_SHADOW_MODE);
  assert.equal(result.queue.length, 1);
  assert.equal(result.queue[0].execution_authorized, false);
  assert.equal(result.boundaries.database_writes, false);
  assert.equal(result.boundaries.child_writer_dispatches, false);
  assert.equal(result.boundaries.promotion_execution_enabled, false);
});

test("shadow reconciliation rejects non-read-only evidence and SHA drift", () => {
  const base = {
    actionableGaps: [],
    actualHeadSha: "a".repeat(40),
    discoverySummary: { database_mode: "read-only transaction" },
    expectedHeadSha: "a".repeat(40),
    masterIndexCandidates: [],
    promotionCandidates: [],
  };
  assert.throws(() => buildCatalogShadowReconciliationV1({
    ...base,
    discoverySummary: { database_mode: "read-write" },
  }), /requires read-only discovery evidence/);
  assert.throws(() => buildCatalogShadowReconciliationV1({
    ...base,
    actualHeadSha: "b".repeat(40),
  }), /HEAD does not match/);
});

test("every scheduled catalog workflow is shadow-only and has no apply path", () => {
  for (const name of SCHEDULED_CATALOG_WORKFLOWS) {
    const source = workflow(name);
    assert.match(source, /schedule:/, name);
    assert.match(source, /CATALOG_AUTOMATION_MODE:\s*shadow-only/, name);
    assert.doesNotMatch(source, /--mode=apply(?:\s|\\)/, name);
    assert.doesNotMatch(source, /(?:^|\s)--apply(?:\s|\\)/m, name);
  }
});

test("scheduled database readers default every session to read-only", () => {
  for (const name of [
    "catalog-incremental-promotion.yml",
    "mtg-catalog-supervisor.yml",
    "universal-catalog-discovery.yml",
  ]) {
    assert.match(
      workflow(name),
      /PGOPTIONS:\s*"-c default_transaction_read_only=on"/,
      name,
    );
  }
  for (const relativePath of [
    "scripts/workers/universal_catalog_discovery_v1.mjs",
    "scripts/audits/mtg_catalog_supervisor_v1.mjs",
  ]) {
    const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
    assert.match(
      source,
      /options:\s*"-c default_transaction_read_only=on"/,
      relativePath,
    );
    assert.match(source, /begin transaction read only/i, relativePath);
  }
});

test("scheduled workflows never dispatch canonical writers", () => {
  const pokemon = workflow("pokemon-master-index-refresh.yml");
  assert.match(pokemon, /shadow_reconciliation_dispatched/);
  assert.doesNotMatch(pokemon, /promotion_dispatched/);

  const shadow = workflow("catalog-incremental-promotion.yml");
  assert.match(shadow, /catalog_shadow_reconciliation_v1\.mjs/);
  assert.doesNotMatch(shadow, /catalog_incremental_supervisor_v1\.mjs/);
  assert.doesNotMatch(shadow, /incremental_promotion_v1\.mjs/);

  const mtg = workflow("mtg-catalog-supervisor.yml");
  assert.match(mtg, /--shadow-only/);
  assert.doesNotMatch(mtg, /--dispatch/);
  assert.doesNotMatch(mtg, /actions:\s*write/);
});

test("shadow workflows check out and reconcile the exact triggering SHA", () => {
  for (const name of [
    "catalog-incremental-promotion.yml",
    "mtg-catalog-supervisor.yml",
  ]) {
    const source = workflow(name);
    assert.match(source, /ref:\s*\$\{\{ github\.sha \}\}/, name);
    assert.doesNotMatch(source, /ref:\s*\$\{\{ github\.event\.repository\.default_branch \}\}/, name);
  }
});

test("shadow worker requires explicit mode and never imports database clients", () => {
  const source = fs.readFileSync(
    path.join(ROOT, "scripts", "workers", "catalog_shadow_reconciliation_v1.mjs"),
    "utf8",
  );
  assert.match(source, /CATALOG_AUTOMATION_MODE/);
  assert.doesNotMatch(source, /from "pg"|@supabase|SUPABASE_DB_URL|DATABASE_URL/);
  assert.doesNotMatch(source, /\b(insert|update|delete|truncate)\b/i);
});

test("shadow worker emits an immutable queue in fixture mode", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-shadow-"));
  const discoveryDir = path.join(root, "discovery");
  const outDir = path.join(root, "output");
  fs.mkdirSync(discoveryDir, { recursive: true });
  fs.writeFileSync(path.join(discoveryDir, "actionable_gaps.json"), "[]\n");
  fs.writeFileSync(path.join(discoveryDir, "canonical_promotion_candidates.json"), "[]\n");
  fs.writeFileSync(path.join(discoveryDir, "pokemon_master_index_update_candidates.json"), "[]\n");
  fs.writeFileSync(path.join(discoveryDir, "summary.json"), JSON.stringify({
    version: "UNIVERSAL_CATALOG_DISCOVERY_V1",
    database_mode: "read-only transaction",
  }));
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim();
  const run = spawnSync(process.execPath, [
    path.join(ROOT, "scripts", "workers", "catalog_shadow_reconciliation_v1.mjs"),
    `--discovery-dir=${discoveryDir}`,
    `--out-dir=${outDir}`,
    `--expected-head-sha=${head}`,
  ], {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, CATALOG_AUTOMATION_MODE: CATALOG_SHADOW_MODE },
  });
  assert.equal(run.status, 0, run.stderr);
  const summary = JSON.parse(fs.readFileSync(path.join(outDir, "summary.json"), "utf8"));
  assert.equal(summary.status, "completed");
  assert.equal(summary.boundaries.database_writes, false);
  assert.ok(fs.existsSync(path.join(outDir, "artifact_hashes.json")));
});
