import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildOnePieceDurablePayloadPreflightFingerprintV1,
  buildOnePieceDurableSourceExpectationV1,
  evaluateOnePieceDurablePayloadPreflightV1,
  ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_VERSION,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_preflight_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import { sha256, stableJson } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  captureOnePieceSourceSnapshotV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAYLOAD_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_v1", "bounded_21_row_plan_v1",
  "plan.json");
const SCHEMA_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "schema_apply_plan_v1", "plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_preflight_v1",
  "production_read_only_v1");

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
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

async function captureReadOnly(connectionString, plan, schemaPlan) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: "one-piece-durable-payload-preflight-v1",
  });
  await client.connect();
  let transactionOpen = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    transactionOpen = true;
    const sourceExpectation = buildOnePieceDurableSourceExpectationV1(plan);
    const schemaReadback = await captureOnePieceSchemaReadbackV1(client);
    const sourceSnapshot = await captureOnePieceSourceSnapshotV1(client, sourceExpectation);
    const collisionResult = await client.query(`select
      (select count(*)::integer from public.one_piece_canonical_import_batches
        where id=$1::uuid) as batch_id,
      (select count(*)::integer from public.one_piece_canonical_import_batches
        where payload_fingerprint_sha256=$2) as payload_fingerprint,
      (select count(*)::integer from public.one_piece_canonical_import_rows
        where source_product_id=any($3::bigint[])) as source_products`, [
      plan.batch.id,
      plan.payload_fingerprint_sha256,
      plan.staging_rows.map((row) => Number(row.source_product_id)),
    ]);
    const blocking = await client.query("select unnest(pg_blocking_pids(pg_backend_pid()))::integer as pid");
    await client.query("rollback");
    transactionOpen = false;
    schemaReadback.transaction_closed_before_artifacts = true;
    return {
      schema_readback: schemaReadback,
      source_snapshot: sourceSnapshot,
      collision_state: collisionResult.rows[0],
      blocking_pids: blocking.rows.map((row) => Number(row.pid)),
    };
  } finally {
    if (transactionOpen) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean preflight producer");
  }
  const [planText, schemaPlanText] = await Promise.all([
    fs.readFile(PAYLOAD_PLAN, "utf8"),
    fs.readFile(SCHEMA_PLAN, "utf8"),
  ]);
  const plan = JSON.parse(planText);
  const schemaPlan = JSON.parse(schemaPlanText);
  const runPlan = {
    version: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    payload_plan_sha256: sha256(planText),
    payload_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    schema_plan_sha256: sha256(schemaPlanText),
    schema_apply_plan_fingerprint_sha256: schemaPlan.apply_plan_fingerprint_sha256,
    mode: "production_read_only",
    boundaries: { database_writes: false, storage_writes: false,
      canonical_or_publication_writes: false, mtg_writes: false },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const proof = await captureReadOnly(connectionString, plan, schemaPlan);
  const evaluation = evaluateOnePieceDurablePayloadPreflightV1({
    plan, schemaPlan,
    schemaReadback: proof.schema_readback,
    sourceSnapshot: proof.source_snapshot,
    collisionState: proof.collision_state,
    blockingPids: proof.blocking_pids,
  });
  const preflightFingerprint = buildOnePieceDurablePayloadPreflightFingerprintV1({
    producer_commit_sha: repository.commit_sha,
    payload_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    schema_apply_plan_fingerprint_sha256: schemaPlan.apply_plan_fingerprint_sha256,
    source_expectation_sha256: evaluation.source_expectation_sha256,
    schema_readback_sha256: sha256(stableJson(proof.schema_readback)),
    source_snapshot_sha256: sha256(stableJson(proof.source_snapshot)),
    collision_state_sha256: sha256(stableJson(proof.collision_state)),
  });
  const summary = {
    version: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "pass" : "blocked",
    repository,
    environment: environmentFingerprint(connectionString, "production-read-only"),
    preflight_fingerprint_sha256: preflightFingerprint,
    payload_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    schema_apply_plan_fingerprint_sha256: schemaPlan.apply_plan_fingerprint_sha256,
    source_expectation_sha256: evaluation.source_expectation_sha256,
    selected_rows: plan.staging_rows.length,
    collision_state: proof.collision_state,
    blocking_pids: proof.blocking_pids,
    findings: evaluation.findings,
    boundaries: runPlan.boundaries,
  };
  const schemaBody = await writeJson(path.join(args.outDir, "schema_readback.json"),
    proof.schema_readback);
  const sourceBody = await writeJson(path.join(args.outDir, "source_readback.json"),
    proof.source_snapshot);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece Durable Payload Preflight V1\n\n` +
    `- Status: **${summary.status.toUpperCase()}**\n` +
    `- Preflight fingerprint: \`${preflightFingerprint}\`\n` +
    `- Selected rows: \`${summary.selected_rows}\`\n` +
    `- Existing collisions: \`${Object.values(proof.collision_state).reduce((a,b) => a + Number(b), 0)}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      ["run_plan.json", runPlanBody], ["schema_readback.json", schemaBody],
      ["source_readback.json", sourceBody], ["summary.json", summaryBody],
      ["REPORT.md", reportBody],
    ].map(([artifactPath, body]) => ({ path: artifactPath,
      bytes: Buffer.byteLength(body), sha256: sha256(body) })),
    bound_inputs: [
      { path: path.relative(ROOT, PAYLOAD_PLAN).replaceAll("\\", "/"),
        bytes: Buffer.byteLength(planText), sha256: sha256(planText) },
      { path: path.relative(ROOT, SCHEMA_PLAN).replaceAll("\\", "/"),
        bytes: Buffer.byteLength(schemaPlanText), sha256: sha256(schemaPlanText) },
    ],
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    preflight_fingerprint_sha256: preflightFingerprint,
    findings: summary.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (!evaluation.valid) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
