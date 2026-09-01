import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildCatalogFounderOutcomePackageV1,
  buildCatalogSetOutcomeWorkItemV1,
  buildCatalogWriterInvocationV1,
  validateCatalogFounderOutcomePackageV1,
  validateCatalogWriterResultV1,
} from "../../backend/operations/catalog_founder_outcome_v1.mjs";
import { operationsSha256V1 } from "../../backend/operations/operations_control_plane_v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function mtgPackage({ sourceRunId = "123456" } = {}) {
  return buildCatalogFounderOutcomePackageV1({
    target: {
      key: "mtg:tst",
      writer_key: "mtg_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
      target: { set_code: "tst" },
    },
    result: { target: "mtg:tst", exit_code: 0 },
    summary: {
      mode: "plan",
      writer_payload_fingerprint: "b".repeat(64),
      promotion_row_counts: {
        sets: 1,
        card_prints: 2,
        card_print_identity: 2,
        card_printings: 2,
        external_mappings: 2,
        external_printing_mappings: 2,
      },
    },
    preflightProof: {
      collisions: {
        sets: 0,
        card_prints: 0,
        card_print_identity: 0,
        card_printings: 0,
        external_mappings: 0,
        external_printing_mappings: 0,
      },
    },
    artifactHashes: { "summary.json": "c".repeat(64) },
    sourceCommitSha: "a".repeat(40),
    sourceRunId,
    asOf: "2026-09-01",
  });
}

test("a clean read-only writer plan becomes one executable founder outcome", () => {
  const outcomePackage = mtgPackage();
  const item = buildCatalogSetOutcomeWorkItemV1({
    outcomePackage,
    sourceRunUri: "https://github.com/grookai/grookai/actions/runs/123456",
    expiresAt: "2026-09-04T00:00:00.000Z",
  });
  assert.equal(item.work_item_type, "founder_outcome_workflow");
  assert.equal(item.command_policy.execution_enabled, true);
  assert.equal(item.command_policy.cost_ceiling_usd, 0);
  assert.equal(item.plan_payload.outcome_workflow.workflow_key, "catalog_set_completion_v1");
  assert.deepEqual(
    item.plan_payload.outcome_workflow.stages.map((stage) => stage.handler_key),
    ["verify_catalog_frozen_scope_v1", "apply_catalog_frozen_plan_v1"],
  );
  assert.equal(item.scope.target_key, "mtg:tst");
});

test("writer invocation comes from code registry and pins commit, target, and payload", () => {
  const outcomePackage = mtgPackage();
  const invocation = buildCatalogWriterInvocationV1(outcomePackage, {
    headSha: "a".repeat(40),
    outDir: path.join(ROOT, ".tmp", "catalog-outcome-test"),
  });
  assert.equal(invocation.writer.worker, "scripts/workers/mtg_incremental_promotion_v1.mjs");
  assert.equal(invocation.args[0], path.normalize("scripts/workers/mtg_incremental_promotion_v1.mjs"));
  assert.ok(invocation.args.includes("--set-code=tst"));
  assert.ok(invocation.args.includes(`--expected-head-sha=${"a".repeat(40)}`));
  assert.ok(invocation.args.includes(`--expected-payload-fingerprint=${"b".repeat(64)}`));
  assert.equal(Object.keys(invocation.env).length, 0);
});

test("generic Japanese outcomes cannot inherit the legacy single-card enrichment", () => {
  const target = {
    key: "pokemon_jpn:M6",
    writer_key: "japanese_structured_incremental_promotion_v1",
    founder_outcome_eligible: true,
    worker: "scripts/workers/catalog_incremental_promotion_v1.mjs",
    target: {
      pokemon_set_code: "M6",
      pokemon_database_set_code: "jpn-product-test",
      pokemon_product_id: "955",
    },
  };
  const outcomePackage = buildCatalogFounderOutcomePackageV1({
    target,
    result: { target: target.key, exit_code: 0 },
    summary: {
      mode: "plan",
      payload_fingerprint_sha256: "d".repeat(64),
      transaction_result: {
        expected: { cards: 5, identities: 5, evidence: 10, family_reviews: 5 },
      },
    },
    preflightProof: {
      collision_preflight: { cards: 0, identities: 0, evidence: 0, family_reviews: 0 },
    },
    artifactHashes: { "summary.json": "e".repeat(64) },
    sourceCommitSha: "a".repeat(40),
    sourceRunId: "123456",
    asOf: "2026-09-01",
  });
  const invocation = buildCatalogWriterInvocationV1(outcomePackage, {
    headSha: "a".repeat(40),
    outDir: path.join(ROOT, ".tmp", "japanese-catalog-outcome-test"),
  });
  assert.ok(invocation.args.includes("--official-card-ids="));
  assert.ok(!invocation.args.some((arg) => arg.includes("50301")));
});

test("changed targets, collisions, and unregistered writers fail closed", () => {
  const changed = structuredClone(mtgPackage());
  changed.target.set_code = "evil";
  assert.throws(
    () => validateCatalogFounderOutcomePackageV1(changed),
    /target key does not match|fingerprint changed/,
  );

  assert.throws(() => buildCatalogFounderOutcomePackageV1({
    target: {
      key: "mtg:tst",
      writer_key: "arbitrary_writer_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/arbitrary.mjs",
      target: { set_code: "tst" },
    },
    result: { target: "mtg:tst", exit_code: 0 },
    summary: { mode: "plan" },
    preflightProof: { collisions: {} },
    artifactHashes: {},
    sourceCommitSha: "a".repeat(40),
    sourceRunId: "123",
    asOf: "2026-09-01",
  }), /not outcome-enabled/);

  assert.throws(() => buildCatalogFounderOutcomePackageV1({
    target: {
      key: "mtg:tst",
      writer_key: "mtg_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
      target: { set_code: "tst" },
    },
    result: { target: "mtg:tst", exit_code: 0 },
    summary: {
      mode: "plan",
      writer_payload_fingerprint: "b".repeat(64),
      promotion_row_counts: {
        sets: 1,
        card_prints: 2,
        card_print_identity: 2,
        card_printings: 2,
        external_mappings: 2,
        external_printing_mappings: 2,
      },
    },
    preflightProof: { collisions: { sets: 1 } },
    artifactHashes: {},
    sourceCommitSha: "a".repeat(40),
    sourceRunId: "123",
    asOf: "2026-09-01",
  }), /collision preflight is not clean/);
});

test("durable writer readback must exactly match every approved count", () => {
  const outcomePackage = mtgPackage();
  const summary = {
    mode: "apply",
    writer_payload_fingerprint: outcomePackage.payload_fingerprint_sha256,
    transaction_result: {
      action: "committed",
      durable_readback: {
        sets: { planned_count: 1, actual_count: 1, exact_count: 1 },
        card_prints: { planned_count: 2, actual_count: 2, exact_count: 2 },
        card_print_identity: { planned_count: 2, actual_count: 2, exact_count: 2 },
        card_printings: { planned_count: 2, actual_count: 2, exact_count: 2 },
        external_mappings: { planned_count: 2, actual_count: 2, exact_count: 2 },
        external_printing_mappings: { planned_count: 2, actual_count: 2, exact_count: 2 },
      },
    },
  };
  assert.equal(validateCatalogWriterResultV1(outcomePackage, summary).reconciled, true);
  summary.transaction_result.durable_readback.card_prints.exact_count = 1;
  assert.throws(
    () => validateCatalogWriterResultV1(outcomePackage, summary),
    /durable readback mismatch/,
  );
});

test("all outcome-enabled workers require an expected payload fingerprint on apply", () => {
  for (const file of [
    "scripts/workers/mtg_incremental_promotion_v1.mjs",
    "scripts/workers/one_piece_incremental_promotion_v1.mjs",
    "scripts/workers/english_pokemon_incremental_promotion_v1.mjs",
    "scripts/workers/catalog_incremental_promotion_v1.mjs",
  ]) {
    const worker = source(file);
    assert.match(worker, /--expected-payload-fingerprint/);
    assert.match(worker, /Expected payload fingerprint/);
  }
});

test("scheduled discovery plans packages but never applies a catalog writer", () => {
  const workflow = source(".github/workflows/universal-catalog-discovery.yml");
  const executor = source("scripts/workers/founder_outcome_workflow_executor_v1.mjs");
  assert.match(workflow, /catalog_incremental_supervisor_v1\.mjs[\s\S]*--mode=plan/);
  assert.match(workflow, /--outcome-eligible-only/);
  assert.match(workflow, /catalog_founder_outcome_packager_v1\.mjs/);
  assert.doesNotMatch(workflow, /catalog_incremental_supervisor_v1\.mjs[\s\S]*--mode=apply/);
  assert.match(executor, /buildCatalogWriterInvocationV1/);
  assert.match(executor, /validateCatalogWriterResultV1/);
  assert.match(executor, /secrets_excluded: true/);
});

test("packager verifies writer artifact bytes before creating executable authority", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-outcome-packager-"));
  try {
    const supervisorDir = path.join(root, "supervisor");
    const targetDir = path.join(root, "target");
    const outDir = path.join(root, "out");
    fs.mkdirSync(supervisorDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });
    const target = {
      key: "mtg:tst",
      writer_key: "mtg_incremental_promotion_v1",
      founder_outcome_eligible: true,
      worker: "scripts/workers/mtg_incremental_promotion_v1.mjs",
      target: { set_code: "tst" },
      args: ["--set-code=tst"],
    };
    fs.writeFileSync(path.join(supervisorDir, "supervisor_plan.json"), JSON.stringify({
      mode: "plan",
      as_of: "2026-09-01",
      expected_head_sha: "a".repeat(40),
      targets: [target],
    }));
    fs.writeFileSync(path.join(supervisorDir, "execution_results.json"), JSON.stringify([{
      target: "mtg:tst",
      exit_code: 0,
      artifact_directory: targetDir,
    }]));
    const summary = {
      mode: "plan",
      writer_payload_fingerprint: "b".repeat(64),
      promotion_row_counts: {
        sets: 1,
        card_prints: 2,
        card_print_identity: 2,
        card_printings: 2,
        external_mappings: 2,
        external_printing_mappings: 2,
      },
    };
    const preflight = {
      collisions: {
        sets: 0,
        card_prints: 0,
        card_print_identity: 0,
        card_printings: 0,
        external_mappings: 0,
        external_printing_mappings: 0,
      },
    };
    const summaryBytes = Buffer.from(JSON.stringify(summary));
    const preflightBytes = Buffer.from(JSON.stringify(preflight));
    fs.writeFileSync(path.join(targetDir, "summary.json"), summaryBytes);
    fs.writeFileSync(path.join(targetDir, "promotion_plan.json"), preflightBytes);
    fs.writeFileSync(path.join(targetDir, "artifact_hashes.json"), JSON.stringify({
      algorithm: "sha256",
      artifacts: [
        { path: "summary.json", sha256: operationsSha256V1(summaryBytes) },
        { path: "promotion_plan.json", sha256: operationsSha256V1(preflightBytes) },
      ],
    }));
    const args = [
      "scripts/workers/catalog_founder_outcome_packager_v1.mjs",
      `--supervisor-dir=${supervisorDir}`,
      `--out-dir=${outDir}`,
      `--source-commit-sha=${"a".repeat(40)}`,
      "--source-run-id=123456",
    ];
    const valid = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
    assert.equal(valid.status, 0, valid.stderr);
    assert.equal(JSON.parse(fs.readFileSync(
      path.join(outDir, "founder_outcome_packages.json"), "utf8",
    )).length, 1);

    fs.writeFileSync(path.join(targetDir, "summary.json"), JSON.stringify({ ...summary, mode: "apply" }));
    const tamperedOut = path.join(root, "tampered");
    const tampered = spawnSync(process.execPath, args.map((arg) =>
      arg.startsWith("--out-dir=") ? `--out-dir=${tamperedOut}` : arg), {
      cwd: ROOT,
      encoding: "utf8",
    });
    assert.equal(tampered.status, 0, tampered.stderr);
    assert.equal(JSON.parse(fs.readFileSync(
      path.join(tamperedOut, "founder_outcome_packages.json"), "utf8",
    )).length, 0);
    assert.match(JSON.parse(fs.readFileSync(
      path.join(tamperedOut, "held_targets.json"), "utf8",
    ))[0].error_message, /artifact hash mismatch/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("publisher accepts only packages from the same candidate, commit, and run", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "catalog-outcome-publisher-"));
  try {
    const discoveryDir = path.join(root, "discovery");
    const outDir = path.join(root, "out");
    fs.mkdirSync(discoveryDir, { recursive: true });
    const candidate = {
      game_code: "mtg",
      status: "missing_set",
      source_id: "scryfall_set_registry",
      source_code: "tst",
      source_name: "Test Set",
    };
    fs.writeFileSync(
      path.join(discoveryDir, "canonical_promotion_candidates.json"),
      JSON.stringify([candidate]),
    );
    fs.writeFileSync(path.join(discoveryDir, "summary.json"), JSON.stringify({
      actionable_gap_count: 1,
    }));
    fs.writeFileSync(path.join(discoveryDir, "artifact_hashes.json"), JSON.stringify({}));
    const packagesFile = path.join(root, "packages.json");
    fs.writeFileSync(packagesFile, JSON.stringify([mtgPackage()]));
    const args = [
      "scripts/workers/catalog_founder_work_item_publisher_v1.mjs",
      `--discovery-dir=${discoveryDir}`,
      `--out-dir=${outDir}`,
      `--outcome-packages-file=${packagesFile}`,
    ];
    const environment = {
      ...process.env,
      GITHUB_SHA: "a".repeat(40),
      GITHUB_RUN_ID: "123456",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "grookai/grookai",
    };
    const valid = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env: environment,
      encoding: "utf8",
    });
    assert.equal(valid.status, 0, valid.stderr);
    const report = JSON.parse(fs.readFileSync(path.join(outDir, "summary.json"), "utf8"));
    assert.equal(report.executable_outcome_work_item_count, 1);
    assert.equal(report.review_only_work_item_count, 0);
    assert.equal(report.review_supersession_request_count, 1);
    assert.equal(report.superseded_review_work_item_count, 0);

    fs.writeFileSync(packagesFile, JSON.stringify([mtgPackage({ sourceRunId: "999" })]));
    const stale = spawnSync(process.execPath, args, {
      cwd: ROOT,
      env: environment,
      encoding: "utf8",
    });
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /source run does not match/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
