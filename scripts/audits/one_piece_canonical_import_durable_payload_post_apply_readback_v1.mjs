import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceDurablePayloadReadbackV1,
  ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION,
  ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
  ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_apply_v1.mjs";
import {
  buildOnePieceDurableSourceExpectationV1,
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_preflight_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  captureOnePieceProtectedBoundariesV1,
  captureOnePieceSourceSnapshotV1,
} from "./one_piece_canonical_import_rollback_db_v1.mjs";
import {
  captureOnePieceDurableRowsV1,
} from "./one_piece_canonical_import_durable_payload_apply_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PAYLOAD_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_v1", "bounded_21_row_plan_v1",
  "plan.json");
const SCHEMA_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "schema_apply_plan_v1", "plan.json");

function parseArgs(argv) {
  const args = { envFile: "C:\\grookai_vault\\.env.local", expectedHeadSha: "",
    executionSummary: "", expectedExecutionSummarySha256: "", outDir: "" };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--expected-head-sha=")) args.expectedHeadSha = arg.slice(20);
    else if (arg.startsWith("--execution-summary=")) {
      args.executionSummary = path.resolve(arg.slice(20));
    } else if (arg.startsWith("--expected-execution-summary-sha256=")) {
      args.expectedExecutionSummarySha256 = arg.slice(36);
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedExecutionSummarySha256) ||
      !args.executionSummary || !args.outDir) {
    throw new Error("Exact head, summary hash, execution summary, and out dir are required");
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (git("rev-parse", "HEAD") !== args.expectedHeadSha ||
      git("branch", "--show-current") !== "agent/one-piece-ingestion-readiness-v1" ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean verifier producer");
  }
  const executionDir = path.dirname(args.executionSummary);
  const [summaryText, hashesText, transactionText, planText, schemaPlanText] =
    await Promise.all([
      fs.readFile(args.executionSummary, "utf8"),
      fs.readFile(path.join(executionDir, "artifact_hashes.json"), "utf8"),
      fs.readFile(path.join(executionDir, "transaction_proof.json"), "utf8"),
      fs.readFile(PAYLOAD_PLAN, "utf8"), fs.readFile(SCHEMA_PLAN, "utf8"),
    ]);
  if (sha256(summaryText) !== args.expectedExecutionSummarySha256) {
    throw new Error("Execution summary hash changed");
  }
  const summary = JSON.parse(summaryText);
  const artifactHashes = JSON.parse(hashesText);
  const expectedArtifacts = new Map(artifactHashes.artifacts.map((row) =>
    [row.path, row.sha256]));
  for (const [name, body] of [["summary.json", summaryText],
    ["transaction_proof.json", transactionText]]) {
    if (expectedArtifacts.get(name) !== sha256(body)) {
      throw new Error(`Execution artifact hash mismatch: ${name}`);
    }
  }
  if (summary.version !== ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION ||
      summary.status !== "applied_and_fresh_readback_passed" ||
      summary.committed !== true || summary.service_role_write_path !== true ||
      Number(summary.batch_rows_written) !== 1 ||
      Number(summary.staging_rows_written) !== 21 ||
      summary.preflight_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT ||
      summary.payload_plan_fingerprint_sha256 !==
        ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT ||
      summary.payload_fingerprint_sha256 !== ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT) {
    throw new Error("Execution summary is not exact and passing");
  }
  const transactionProof = JSON.parse(transactionText);
  const plan = JSON.parse(planText);
  const schemaPlan = JSON.parse(schemaPlanText);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  const client = new Client({ connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 240_000,
    statement_timeout: 240_000,
    application_name: "one-piece-durable-payload-independent-readback-v1" });
  await client.connect();
  let open = false;
  let readback;
  let source;
  let protectedAfter;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    readback = await captureOnePieceDurableRowsV1(client, plan);
    readback.schema = await captureOnePieceSchemaReadbackV1(client);
    source = await captureOnePieceSourceSnapshotV1(client,
      buildOnePieceDurableSourceExpectationV1(plan));
    protectedAfter = await captureOnePieceProtectedBoundariesV1(client);
    await client.query("rollback");
    open = false;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
  readback.schema.transaction_closed_before_artifacts = true;
  const evaluation = evaluateOnePieceDurablePayloadReadbackV1({
    plan, schemaPlan, readback, sourceSnapshot: source,
    protectedBefore: transactionProof.protected_before,
    protectedAfter,
  });
  const result = { version: "ONE_PIECE_DURABLE_PAYLOAD_INDEPENDENT_READBACK_V1",
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "pass" : "blocked",
    execution_summary_sha256: args.expectedExecutionSummarySha256,
    payload_plan_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
    payload_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
    batch_rows: readback.batch_count, staging_rows: readback.row_count,
    findings: evaluation.findings,
    boundaries: { transaction_read_only: true, database_writes: false,
      canonical_or_publication_writes: false, storage_or_vault_writes: false } };
  await fs.mkdir(args.outDir, { recursive: true });
  const readbackBody = await writeJson(path.join(args.outDir, "readback.json"),
    { rows: readback, source, protected_after: protectedAfter });
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), result);
  const reportBody = `# One Piece Durable Payload Independent Readback V1\n\n` +
    `- Status: **${result.status.toUpperCase()}**\n` +
    `- Batch rows: \`${result.batch_rows}\`\n` +
    `- Staging rows: \`${result.staging_rows}\`\n` +
    `- Findings: \`${result.findings.length}\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", artifacts: [
      ["readback.json", readbackBody], ["summary.json", summaryBody],
      ["REPORT.md", reportBody],
    ].map(([artifactPath, body]) => ({ path: artifactPath,
      bytes: Buffer.byteLength(body), sha256: sha256(body) })),
  });
  process.stdout.write(`${JSON.stringify({ status: result.status,
    batch_rows: result.batch_rows, staging_rows: result.staging_rows,
    findings: result.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (!evaluation.valid) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
