import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceSchemaReadbackV1,
  ONE_PIECE_SCHEMA_APPLY_VERSION,
  ONE_PIECE_SCHEMA_PLAN_PATH,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import {
  sha256OnePiecePreflightV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_preflight_v1.mjs";
import {
  environmentFingerprint,
  pgSslConfig,
} from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import {
  captureOnePieceSchemaReadbackV1,
} from "./one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    executionSummary: "",
    outDir: "",
  };
  for (const arg of argv) {
    if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else if (arg.startsWith("--execution-summary=")) {
      args.executionSummary = path.resolve(arg.slice(20));
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.executionSummary) throw new Error("--execution-summary is required");
  if (!args.outDir) throw new Error("--out-dir is required");
  return args;
}

function databaseUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

async function captureIndependentReadback(connectionString) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-schema-independent-readback-v1",
  });
  await client.connect();
  let readback;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin read only");
    readback = await captureOnePieceSchemaReadbackV1(client);
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  readback.transaction_closed_before_artifacts = true;
  return readback;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [planText, executionText] = await Promise.all([
    fs.readFile(path.join(ROOT, ONE_PIECE_SCHEMA_PLAN_PATH), "utf8"),
    fs.readFile(args.executionSummary, "utf8"),
  ]);
  const plan = JSON.parse(planText);
  const execution = JSON.parse(executionText);
  const preFindings = [];
  if (execution.version !== ONE_PIECE_SCHEMA_APPLY_VERSION) {
    preFindings.push("execution_version_mismatch");
  }
  if (execution.status !== "schema_only_applied_and_fresh_readback_passed") {
    preFindings.push("execution_status_not_passed");
  }
  if (execution.plan_fingerprint_sha256 !== plan.apply_plan_fingerprint_sha256) {
    preFindings.push("execution_plan_fingerprint_mismatch");
  }
  if (execution.migration_sha256 !== plan.migration_sha256) {
    preFindings.push("execution_migration_hash_mismatch");
  }
  if (Number(execution.boundaries?.one_piece_staging_rows_written) !== 0) {
    preFindings.push("execution_reported_one_piece_rows");
  }
  if (Number(execution.boundaries?.protected_table_dml_attributable_to_execution) !== 0) {
    preFindings.push("execution_reported_protected_dml");
  }
  if (preFindings.length) {
    throw new Error(`Execution proof is ineligible: ${preFindings.join(",")}`);
  }
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = databaseUrl();
  if (!connectionString) throw new Error("Production database URL is missing");
  const readback = await captureIndependentReadback(connectionString);
  const findings = evaluateOnePieceSchemaReadbackV1({ plan, readback });
  const result = {
    version: "ONE_PIECE_DURABLE_STAGING_SCHEMA_INDEPENDENT_READBACK_V1",
    recorded_at: new Date().toISOString(),
    status: findings.length ? "blocked" : "pass",
    execution_summary_path: args.executionSummary,
    execution_summary_sha256: sha256OnePiecePreflightV1(executionText),
    plan_fingerprint_sha256: plan.apply_plan_fingerprint_sha256,
    migration_sha256: plan.migration_sha256,
    environment: environmentFingerprint(connectionString, "production-read-only"),
    readback,
    findings,
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      storage_or_publication: false,
      deployment_or_app_visibility: false,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), result);
  const readbackBody = await writeJson(path.join(args.outDir, "readback.json"), readback);
  const reportBody = `# One Piece Durable Staging Schema Independent Readback V1\n\n` +
    `- Status: **${result.status.toUpperCase()}**\n` +
    `- Migration SHA-256: \`${result.migration_sha256}\`\n` +
    `- Tables: \`${readback.tables.length}\`\n` +
    `- Staging rows: \`${readback.tables.reduce((sum, row) =>
      sum + Number(row.row_count), 0)}\`\n` +
    `- Findings: \`${findings.length}\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "summary.json", bytes: Buffer.byteLength(summaryBody),
        sha256: sha256OnePiecePreflightV1(summaryBody) },
      { path: "readback.json", bytes: Buffer.byteLength(readbackBody),
        sha256: sha256OnePiecePreflightV1(readbackBody) },
      { path: "REPORT.md", bytes: Buffer.byteLength(reportBody),
        sha256: sha256OnePiecePreflightV1(reportBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    findings,
    out_dir: args.outDir,
  }, null, 2)}\n`);
  if (findings.length) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
