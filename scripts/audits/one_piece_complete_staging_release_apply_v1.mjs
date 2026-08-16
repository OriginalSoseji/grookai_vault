import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

import {
  ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV,
} from "../../backend/pricing/one_piece_complete_staging_release_v1.mjs";
import {
  compareOnePieceProtectedSnapshotsAllowingMtgProgressV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  captureOnePieceProtectedBoundariesV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  captureOnePieceCompleteSourceInventoryV1,
  captureOnePieceCompleteStagingCollisionStateV1,
  captureOnePieceCompleteStagingReadbackV1,
  captureOnePieceReleaseVisibilityV1,
  captureOnePieceStagingAttributableWritesV1,
  evaluateOnePieceCompleteSourceInventoryV1,
  evaluateOnePieceCompleteStagingReadbackV1,
  evaluateOnePieceReleaseVisibilityV1,
  insertOnePieceCompleteStagingReleaseV1,
  loadFrozenOnePieceCompleteStagingReleaseV1,
  onePieceCompleteStagingClientV1,
  summarizeOnePieceCompleteStagingReadbackV1,
} from "./one_piece_complete_staging_release_db_v1.mjs";
import {
  environmentFingerprint,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

export const ONE_PIECE_COMPLETE_STAGING_APPLY_VERSION =
  "ONE_PIECE_COMPLETE_CATALOG_STAGING_RELEASE_APPLY_V1";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PREFLIGHT_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "production_preflight_v1",
  "summary.json");
const CANARY_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "rollback_canary_v1",
  "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "durable_apply_v1");

function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: "",
    expectedPreflightFingerprint: "", expectedCanarySummarySha: "",
    outDir: DEFAULT_OUT, envFile: "C:\\grookai_vault\\.env.local" };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--expected-preflight-fingerprint=")) {
      args.expectedPreflightFingerprint = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--expected-canary-summary-sha=")) {
      args.expectedCanarySummarySha = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.execute || !/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPreflightFingerprint) ||
      !/^[0-9a-f]{64}$/.test(args.expectedCanarySummarySha)) {
    throw new Error("Execute flag and exact producer/preflight/canary hashes are required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function sanitize(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function captureFreshProof(connectionString, loaded) {
  const client = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-fresh-readback-v1");
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const fullReadback = await captureOnePieceCompleteStagingReadbackV1(
      client, loaded.release);
    const schema = await captureOnePieceSchemaReadbackV1(client);
    const source = await captureOnePieceCompleteSourceInventoryV1(
      client, loaded.release);
    const protectedSnapshot = await captureOnePieceProtectedBoundariesV1(client);
    const visibility = await captureOnePieceReleaseVisibilityV1(client);
    await client.query("rollback");
    open = false;
    schema.transaction_closed_before_artifacts = true;
    return { fullReadback, schema, source, protectedSnapshot, visibility };
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = { commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean durable-apply producer");
  }
  const [loaded, preflightText, canaryText] = await Promise.all([
    loadFrozenOnePieceCompleteStagingReleaseV1(ROOT),
    fs.readFile(PREFLIGHT_PATH, "utf8"),
    fs.readFile(CANARY_PATH, "utf8"),
  ]);
  const preflight = JSON.parse(preflightText);
  const canary = JSON.parse(canaryText);
  if (loaded.release.plan.repository.commit_sha !== repository.commit_sha ||
      preflight.status !== "pass" ||
      preflight.preflight_fingerprint_sha256 !==
        args.expectedPreflightFingerprint ||
      canary.status !== "rollback_proof_passed_zero_residue" ||
      canary.repository?.commit_sha !== repository.commit_sha ||
      canary.preflight_fingerprint_sha256 !==
        preflight.preflight_fingerprint_sha256 ||
      sha256(canaryText) !== args.expectedCanarySummarySha) {
    throw new Error("Preflight/canary authorities are not exact and passing");
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_COMPLETE_STAGING_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    preflight_summary_sha256: sha256(preflightText),
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    rollback_canary_summary_sha256: sha256(canaryText),
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      loaded.release.plan.release_payload_fingerprint_sha256,
    authorized_batch_rows:
      loaded.release.plan.aggregate_counts.materialized_source_groups,
    authorized_staging_rows: loaded.release.plan.aggregate_counts.source_products,
    boundaries: {
      durable_service_only_staging: true,
      canonical_writes: 0,
      sealed_catalog_writes: 0,
      pricing_writes: 0,
      storage_or_pointer_writes: 0,
      vault_writes: 0,
      publication_or_deployment: false,
    },
  };
  const bodies = {
    "run_plan.json": await writeJson(path.join(args.outDir, "run_plan.json"), runPlan),
  };

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  if (process.env[ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV] !==
      loaded.release.plan.guard_token) {
    throw new Error(`Exact guard missing from ${ONE_PIECE_COMPLETE_STAGING_APPROVAL_ENV}`);
  }

  const proof = { transaction_started: false, committed: false,
    service_role_write_path: false, collision_before: null,
    source_before_sha256: null, protected_before: null,
    transaction_readback: null, attributable_writes: null,
    visibility_before: null, visibility_inside: null, findings: [] };
  let failure = null;
  const client = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-durable-apply-v1");
  await client.connect();
  try {
    await client.query("begin transaction isolation level serializable");
    proof.transaction_started = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='300s'");
    await client.query("select pg_advisory_xact_lock(hashtext('one-piece-complete-staging-release-v1'))");
    proof.collision_before = await captureOnePieceCompleteStagingCollisionStateV1(
      client, loaded.release);
    if (!proof.collision_before.evaluation.valid ||
        proof.collision_before.existing_batch_rows !==
          preflight.collision_state.existing_batch_rows ||
        proof.collision_before.existing_staging_rows !==
          preflight.collision_state.existing_staging_rows) {
      throw new Error("Fresh collision/baseline check failed");
    }
    const sourceBefore = await captureOnePieceCompleteSourceInventoryV1(
      client, loaded.release);
    const sourceEvaluation = evaluateOnePieceCompleteSourceInventoryV1(
      loaded.release, sourceBefore);
    if (!sourceEvaluation.valid) {
      throw new Error(`Fresh source check failed: ${sourceEvaluation.findings.join(",")}`);
    }
    proof.source_before_sha256 = sha256(stableJson(sourceBefore));
    const schemaBefore = await captureOnePieceSchemaReadbackV1(client);
    const schemaBeforeFindings = evaluateOnePieceSchemaReadbackV1({
      plan: loaded.schemaPlan,
      readback: schemaBefore,
      requireReadOnly: false,
      requireClosed: false,
      expectedTableRowCounts: {
        one_piece_canonical_import_batches:
          proof.collision_before.existing_batch_rows,
        one_piece_canonical_import_rows:
          proof.collision_before.existing_staging_rows,
      },
    });
    if (schemaBeforeFindings.length !== 0) {
      throw new Error(`Schema drift before apply: ${schemaBeforeFindings.join(",")}`);
    }
    proof.visibility_before = await captureOnePieceReleaseVisibilityV1(client);
    const visibilityBefore = evaluateOnePieceReleaseVisibilityV1(
      proof.visibility_before);
    if (!visibilityBefore.valid) {
      throw new Error(`One Piece visibility open: ${visibilityBefore.findings.join(",")}`);
    }
    proof.protected_before = await captureOnePieceProtectedBoundariesV1(client);
    await client.query("set local role service_role");
    await client.query("select set_config('request.jwt.claim.role','service_role',true)");
    proof.service_role_write_path =
      (await client.query("select current_user as role")).rows[0].role === "service_role";
    if (!proof.service_role_write_path) throw new Error("Service role is not active");
    await insertOnePieceCompleteStagingReleaseV1(client, loaded.release);
    const fullReadback = await captureOnePieceCompleteStagingReadbackV1(
      client, loaded.release);
    const readbackEvaluation = evaluateOnePieceCompleteStagingReadbackV1(
      loaded.release, fullReadback);
    proof.findings.push(...readbackEvaluation.findings);
    proof.transaction_readback = summarizeOnePieceCompleteStagingReadbackV1(
      fullReadback);
    await client.query("reset role");
    proof.attributable_writes = await captureOnePieceStagingAttributableWritesV1(client);
    const expectedDml = new Map([
      ["one_piece_canonical_import_batches", runPlan.authorized_batch_rows],
      ["one_piece_canonical_import_rows", runPlan.authorized_staging_rows],
    ]);
    for (const row of proof.attributable_writes) {
      if (row.inserted !== expectedDml.get(row.table_name) || row.updated !== 0 ||
          row.deleted !== 0 || row.hot_updated !== 0) {
        proof.findings.push(`unexpected_dml:${row.table_name}`);
      }
    }
    const schemaInside = await captureOnePieceSchemaReadbackV1(client);
    proof.findings.push(...evaluateOnePieceSchemaReadbackV1({
      plan: loaded.schemaPlan,
      readback: schemaInside,
      requireReadOnly: false,
      requireClosed: false,
      expectedTableRowCounts: {
        one_piece_canonical_import_batches:
          proof.collision_before.existing_batch_rows + runPlan.authorized_batch_rows,
        one_piece_canonical_import_rows:
          proof.collision_before.existing_staging_rows + runPlan.authorized_staging_rows,
      },
    }).map((value) => `schema:${value}`));
    proof.visibility_inside = await captureOnePieceReleaseVisibilityV1(client);
    proof.findings.push(...evaluateOnePieceReleaseVisibilityV1(
      proof.visibility_inside).findings);
    const protectedInside = await captureOnePieceProtectedBoundariesV1(client);
    proof.findings.push(...compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(
      proof.protected_before, protectedInside).map((value) => `protected:${value}`));
    if (proof.findings.length !== 0) {
      throw new Error(`Transaction proof failed: ${proof.findings.join(",")}`);
    }
    await client.query("commit");
    proof.committed = true;
    proof.transaction_started = false;
  } catch (error) {
    failure = sanitize(error);
    if (proof.transaction_started) {
      await client.query("rollback").catch(() => {});
      proof.transaction_started = false;
    }
  } finally {
    await client.end();
  }

  let fresh = null;
  const freshFindings = [];
  if (proof.committed) {
    try {
      fresh = await captureFreshProof(connectionString, loaded);
      freshFindings.push(...evaluateOnePieceCompleteStagingReadbackV1(
        loaded.release, fresh.fullReadback).findings);
      freshFindings.push(...evaluateOnePieceSchemaReadbackV1({
        plan: loaded.schemaPlan,
        readback: fresh.schema,
        expectedTableRowCounts: {
          one_piece_canonical_import_batches:
            proof.collision_before.existing_batch_rows + runPlan.authorized_batch_rows,
          one_piece_canonical_import_rows:
            proof.collision_before.existing_staging_rows + runPlan.authorized_staging_rows,
        },
      }).map((value) => `schema:${value}`));
      freshFindings.push(...evaluateOnePieceCompleteSourceInventoryV1(
        loaded.release, fresh.source).findings.map((value) => `source:${value}`));
      freshFindings.push(...evaluateOnePieceReleaseVisibilityV1(
        fresh.visibility).findings);
      freshFindings.push(...compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(
        proof.protected_before, fresh.protectedSnapshot)
        .map((value) => `protected:${value}`));
      if (freshFindings.length !== 0) {
        failure = `Fresh readback failed: ${freshFindings.join(",")}`;
      }
    } catch (error) {
      failure = sanitize(error);
    }
  }
  const status = proof.committed && fresh && !failure && freshFindings.length === 0
    ? "durable_apply_committed_and_fresh_readback_passed"
    : "blocked";
  const freshCompact = fresh ? {
    readback: summarizeOnePieceCompleteStagingReadbackV1(fresh.fullReadback),
    schema_sha256: sha256(stableJson(fresh.schema)),
    source_sha256: sha256(stableJson(fresh.source)),
    protected_snapshot_sha256: sha256(stableJson(fresh.protectedSnapshot)),
    visibility: fresh.visibility,
    findings: freshFindings,
  } : null;
  const summary = {
    version: ONE_PIECE_COMPLETE_STAGING_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status,
    repository,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    release_payload_fingerprint_sha256:
      loaded.release.plan.release_payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    rollback_canary_summary_sha256: sha256(canaryText),
    committed: proof.committed,
    service_role_write_path: proof.service_role_write_path,
    batch_rows_written: freshCompact?.readback.selected_batch_count ?? 0,
    staging_rows_written: freshCompact?.readback.selected_row_count ?? 0,
    final_total_batch_rows: freshCompact?.readback.total_batch_count ?? null,
    final_total_staging_rows: freshCompact?.readback.total_row_count ?? null,
    transaction_findings: proof.findings,
    fresh_findings: freshFindings,
    failure,
    environment: environmentFingerprint(connectionString, "production"),
    boundaries: runPlan.boundaries,
  };
  bodies["transaction_proof.json"] = await writeJson(
    path.join(args.outDir, "transaction_proof.json"), proof);
  if (freshCompact) {
    bodies["fresh_readback.json"] = await writeJson(
      path.join(args.outDir, "fresh_readback.json"), freshCompact);
  }
  bodies["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# One Piece Complete Staging Durable Apply V1\n\n` +
    `- Status: **${status.toUpperCase()}**\n` +
    `- Committed: \`${proof.committed}\`\n` +
    `- New batches / rows: \`${summary.batch_rows_written}\` / ` +
    `\`${summary.staging_rows_written}\`\n` +
    `- Total immutable batches / rows: ` +
    `\`${summary.final_total_batch_rows}\` / ` +
    `\`${summary.final_total_staging_rows}\`\n` +
    `- One Piece release visibility: \`${freshCompact?.visibility.release_status ?? "unknown"}\`\n` +
    `- Canonical, public, pricing, Storage, pointer, and Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  bodies["REPORT.md"] = report;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath, bytes: Buffer.byteLength(body), sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({ status, committed: proof.committed,
    batch_rows: summary.batch_rows_written,
    staging_rows: summary.staging_rows_written,
    total_batch_rows: summary.final_total_batch_rows,
    total_staging_rows: summary.final_total_staging_rows,
    visibility: freshCompact?.visibility ?? null,
    findings: [...proof.findings, ...freshFindings], failure,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (status === "blocked") process.exitCode = 1;
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invoked === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${sanitize(error)}\n`);
    process.exitCode = 1;
  });
}
