import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";

import {
  sha256,
  stableJson,
} from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  compareOnePieceProtectedSnapshotsAllowingMtgProgressV1,
} from "../../backend/pricing/one_piece_canonical_import_rollback_canary_v1.mjs";
import {
  captureOnePieceProtectedBoundariesV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  captureOnePieceCompleteStagingCollisionStateV1,
  captureOnePieceCompleteStagingReadbackV1,
  captureOnePieceStagingAttributableWritesV1,
  evaluateOnePieceCompleteStagingReadbackV1,
  insertOnePieceCompleteStagingReleaseV1,
  loadFrozenOnePieceCompleteStagingReleaseV1,
  onePieceCompleteStagingClientV1,
  summarizeOnePieceCompleteStagingReadbackV1,
} from "./one_piece_complete_staging_release_db_v1.mjs";
import {
  environmentFingerprint,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

export const ONE_PIECE_COMPLETE_STAGING_CANARY_VERSION =
  "ONE_PIECE_COMPLETE_CATALOG_STAGING_ROLLBACK_CANARY_V1";
export const ONE_PIECE_COMPLETE_STAGING_CANARY_APPROVAL_ENV =
  "ONE_PIECE_COMPLETE_STAGING_CANARY_APPROVAL";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PREFLIGHT_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "production_preflight_v1",
  "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_staging_release_v1", "rollback_canary_v1");

function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: "",
    expectedPreflightFingerprint: "", outDir: DEFAULT_OUT,
    envFile: "C:\\grookai_vault\\.env.local" };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--expected-preflight-fingerprint=")) {
      args.expectedPreflightFingerprint = arg.split("=")[1].trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.execute) throw new Error("--execute is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPreflightFingerprint)) {
    throw new Error("Exact producer SHA and preflight fingerprint are required");
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

function guardToken(args, preflight, release) {
  return [
    "EXECUTE_ONE_PIECE_COMPLETE_STAGING_ROLLBACK_CANARY_V1",
    args.expectedHeadSha,
    preflight.preflight_fingerprint_sha256,
    release.plan.plan_fingerprint_sha256,
    "ROLLBACK_ONLY_ZERO_DURABLE_ROWS",
  ].join(":");
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
    throw new Error("Repository is not the exact clean canary producer");
  }
  const [loaded, preflightText] = await Promise.all([
    loadFrozenOnePieceCompleteStagingReleaseV1(ROOT),
    fs.readFile(PREFLIGHT_PATH, "utf8"),
  ]);
  const preflight = JSON.parse(preflightText);
  if (loaded.release.plan.repository.commit_sha !== repository.commit_sha ||
      preflight.status !== "pass" ||
      preflight.producer_commit_sha !== repository.commit_sha ||
      preflight.preflight_fingerprint_sha256 !==
        args.expectedPreflightFingerprint ||
      preflight.plan_fingerprint_sha256 !==
        loaded.release.plan.plan_fingerprint_sha256 ||
      preflight.release_payload_fingerprint_sha256 !==
        loaded.release.plan.release_payload_fingerprint_sha256) {
    throw new Error("Preflight is not exact, passing, and producer-bound");
  }
  const selectedBatchIds = preflight.rollback_canary_batches.map((row) => row.id);
  const expectedRows = loaded.release.batches
    .filter((entry) => selectedBatchIds.includes(entry.batch.id))
    .reduce((count, entry) => count + entry.staging_rows.length, 0);
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_COMPLETE_STAGING_CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    preflight_summary_sha256: sha256(preflightText),
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    selected_batch_ids: selectedBatchIds,
    expected_transaction_batch_rows: selectedBatchIds.length,
    expected_transaction_staging_rows: expectedRows,
    expected_durable_batch_rows: 0,
    expected_durable_staging_rows: 0,
    rollback_required: true,
    boundaries: { canonical_or_public_writes: false,
      pricing_storage_pointer_or_vault_writes: false },
  };
  const bodies = {
    "run_plan.json": await writeJson(path.join(args.outDir, "run_plan.json"), runPlan),
  };

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ??
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  if (process.env[ONE_PIECE_COMPLETE_STAGING_CANARY_APPROVAL_ENV] !==
      guardToken(args, preflight, loaded.release)) {
    throw new Error(`Exact guard missing from ${ONE_PIECE_COMPLETE_STAGING_CANARY_APPROVAL_ENV}`);
  }

  const proof = { transaction_started: false, rolled_back: false,
    service_role_write_path: false, collision_before: null,
    protected_before: null, protected_inside: null,
    transaction_readback: null, attributable_writes: null, findings: [] };
  let failure = null;
  const client = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-rollback-canary-v1");
  await client.connect();
  try {
    await client.query("begin transaction isolation level serializable");
    proof.transaction_started = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='300s'");
    await client.query("select pg_advisory_xact_lock(hashtext('one-piece-complete-staging-release-v1'))");
    proof.collision_before = await captureOnePieceCompleteStagingCollisionStateV1(
      client, loaded.release);
    if (!proof.collision_before.evaluation.valid) {
      throw new Error("Fresh collision state is not clean");
    }
    proof.protected_before = await captureOnePieceProtectedBoundariesV1(client);
    await client.query("set local role service_role");
    await client.query("select set_config('request.jwt.claim.role','service_role',true)");
    proof.service_role_write_path =
      (await client.query("select current_user as role")).rows[0].role === "service_role";
    if (!proof.service_role_write_path) throw new Error("Service role is not active");
    await insertOnePieceCompleteStagingReleaseV1(
      client, loaded.release, selectedBatchIds);
    proof.transaction_readback = await captureOnePieceCompleteStagingReadbackV1(
      client, loaded.release, selectedBatchIds);
    const evaluation = evaluateOnePieceCompleteStagingReadbackV1(
      loaded.release, proof.transaction_readback, selectedBatchIds);
    proof.findings.push(...evaluation.findings);
    proof.attributable_writes = await captureOnePieceStagingAttributableWritesV1(client);
    const expectedDml = new Map([
      ["one_piece_canonical_import_batches", selectedBatchIds.length],
      ["one_piece_canonical_import_rows", expectedRows],
    ]);
    for (const row of proof.attributable_writes) {
      if (row.inserted !== expectedDml.get(row.table_name) || row.updated !== 0 ||
          row.deleted !== 0 || row.hot_updated !== 0) {
        proof.findings.push(`unexpected_dml:${row.table_name}`);
      }
    }
    await client.query("reset role");
    proof.protected_inside = await captureOnePieceProtectedBoundariesV1(client);
    proof.findings.push(...compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(
      proof.protected_before, proof.protected_inside));
    if (proof.findings.length !== 0) {
      throw new Error(`Canary proof failed: ${proof.findings.join(",")}`);
    }
  } catch (error) {
    failure = sanitize(error);
  } finally {
    if (proof.transaction_started) {
      await client.query("rollback").catch(() => {});
      proof.rolled_back = true;
      proof.transaction_started = false;
    }
    await client.end();
  }

  const verifyClient = onePieceCompleteStagingClientV1(connectionString,
    "one-piece-complete-staging-post-rollback-v1");
  await verifyClient.connect();
  let open = false;
  let postRollback;
  let protectedAfter;
  try {
    await verifyClient.query("set default_transaction_read_only=on");
    await verifyClient.query("begin transaction isolation level repeatable read read only");
    open = true;
    postRollback = await captureOnePieceCompleteStagingCollisionStateV1(
      verifyClient, loaded.release);
    protectedAfter = await captureOnePieceProtectedBoundariesV1(verifyClient);
    await verifyClient.query("rollback");
    open = false;
  } finally {
    if (open) await verifyClient.query("rollback").catch(() => {});
    await verifyClient.end();
  }
  const postFindings = [...postRollback.evaluation.findings];
  if (postRollback.existing_batch_rows !== preflight.collision_state.existing_batch_rows ||
      postRollback.existing_staging_rows !== preflight.collision_state.existing_staging_rows) {
    postFindings.push("durable_row_residue");
  }
  postFindings.push(...compareOnePieceProtectedSnapshotsAllowingMtgProgressV1(
    proof.protected_before, protectedAfter));
  const status = !failure && proof.rolled_back && postFindings.length === 0
    ? "rollback_proof_passed_zero_residue"
    : "blocked";
  const compactTransactionReadback = proof.transaction_readback
    ? summarizeOnePieceCompleteStagingReadbackV1(proof.transaction_readback)
    : null;
  proof.transaction_readback = compactTransactionReadback;
  const summary = {
    version: ONE_PIECE_COMPLETE_STAGING_CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    status,
    repository,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    plan_fingerprint_sha256: loaded.release.plan.plan_fingerprint_sha256,
    selected_batch_count: selectedBatchIds.length,
    selected_row_count: expectedRows,
    service_role_write_path: proof.service_role_write_path,
    rolled_back: proof.rolled_back,
    durable_batch_delta: postRollback.existing_batch_rows -
      preflight.collision_state.existing_batch_rows,
    durable_row_delta: postRollback.existing_staging_rows -
      preflight.collision_state.existing_staging_rows,
    post_rollback_findings: postFindings,
    failure,
    environment: environmentFingerprint(connectionString, "production"),
    boundaries: runPlan.boundaries,
  };
  bodies["transaction_proof.json"] = await writeJson(
    path.join(args.outDir, "transaction_proof.json"), proof);
  bodies["post_rollback.json"] = await writeJson(
    path.join(args.outDir, "post_rollback.json"), {
      collision_state: postRollback,
      protected_snapshot_sha256: sha256(stableJson(protectedAfter)),
      findings: postFindings,
    });
  bodies["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# One Piece Complete Staging Rollback Canary V1\n\n` +
    `- Status: **${status.toUpperCase()}**\n` +
    `- Transaction-local batches / rows: ` +
    `\`${selectedBatchIds.length}\` / \`${expectedRows}\`\n` +
    `- Rolled back: \`${proof.rolled_back}\`\n` +
    `- Durable batch / row delta: ` +
    `\`${summary.durable_batch_delta}\` / \`${summary.durable_row_delta}\`\n` +
    `- Canonical/public writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  bodies["REPORT.md"] = report;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath, bytes: Buffer.byteLength(body), sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({ status,
    rolled_back: proof.rolled_back,
    transaction_batches: selectedBatchIds.length,
    transaction_rows: expectedRows,
    durable_batch_delta: summary.durable_batch_delta,
    durable_row_delta: summary.durable_row_delta,
    findings: [...proof.findings, ...postFindings], failure,
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
