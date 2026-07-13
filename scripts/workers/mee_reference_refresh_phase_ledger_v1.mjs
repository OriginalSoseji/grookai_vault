import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

import "../../backend/env.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const AUDIT_DIR = path.join(REPO_ROOT, "docs", "audits", "market_evidence_engine_v1");
const { Client } = pg;

function parseArgs(argv) {
  const status = argv.find((arg) => arg.startsWith("--status="))?.slice("--status=".length) ?? "succeeded";
  if (!["succeeded", "failed", "warning"].includes(status)) {
    throw new Error("--status must be succeeded, failed, or warning");
  }
  return {
    status,
    runKey: argv.find((arg) => arg.startsWith("--run-key="))?.slice("--run-key=".length) ?? `MEE-REFERENCE-${new Date().toISOString().slice(0, 10)}`,
    startedAt: argv.find((arg) => arg.startsWith("--started-at="))?.slice("--started-at=".length) ?? new Date().toISOString(),
    error: argv.find((arg) => arg.startsWith("--error="))?.slice("--error=".length) ?? null,
    artifactPath: argv.find((arg) => arg.startsWith("--artifact="))?.slice("--artifact=".length) ?? null,
  };
}

function directDbUrl() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
}

function pgSslConfig(connectionString) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(connectionString)) return false;
  return { rejectUnauthorized: false };
}

function latestReferenceWriterArtifact() {
  if (!existsSync(AUDIT_DIR)) return null;
  const file = readdirSync(AUDIT_DIR)
    .filter((name) => /^mee_reference_warehouse_delta_writer_v1_.*\.json$/.test(name))
    .map((name) => ({
      name,
      fullPath: path.join(AUDIT_DIR, name),
    }))
    .sort((a, b) => b.name.localeCompare(a.name))[0];
  return file ? path.relative(REPO_ROOT, file.fullPath).replace(/\\/g, "/") : null;
}

function readArtifact(relativePath) {
  if (!relativePath) return null;
  const fullPath = path.join(REPO_ROOT, relativePath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, "utf8"));
}

function summarizeArtifact(artifact) {
  if (!artifact) {
    return {
      acquired_count: 0,
      candidate_count: 0,
      inserted_count: 0,
      updated_count: 0,
      no_op_count: 0,
      failed_count: 0,
      payload: {},
    };
  }

  const applyResults = Array.isArray(artifact.apply_results) ? artifact.apply_results : [];
  const insertedCandidateRows = applyResults.reduce((sum, row) => sum + Number(row.inserted_candidate_rows ?? 0), 0);
  const insertedNormalizedRows = applyResults.reduce((sum, row) => sum + Number(row.inserted_normalized_rows ?? 0), 0);
  const projectedCandidateRows = applyResults.length
    ? applyResults.reduce((sum, row) => sum + Number(row.projected_candidate_rows ?? row.inserted_candidate_rows ?? 0), 0)
    : Number(artifact.delta_plan_summary?.total_missing_candidate_rows ?? 0);
  const projectedNormalizedRows = applyResults.length
    ? applyResults.reduce((sum, row) => sum + Number(row.projected_normalized_rows ?? row.inserted_normalized_rows ?? 0), 0)
    : Number(artifact.delta_plan_summary?.total_missing_normalized_rows ?? 0);

  return {
    acquired_count: Number(artifact.delta_plan_summary?.total_missing_candidate_rows ?? projectedCandidateRows ?? 0),
    candidate_count: Number(projectedCandidateRows + projectedNormalizedRows),
    inserted_count: insertedCandidateRows + insertedNormalizedRows,
    updated_count: 0,
    no_op_count: 0,
    failed_count: Number((artifact.findings ?? []).length),
    payload: {
      package_fingerprint_sha256: artifact.package_fingerprint_sha256 ?? null,
      findings: artifact.findings ?? [],
      apply_results: applyResults,
      delta_plan_summary: artifact.delta_plan_summary ?? null,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const connectionString = directDbUrl();
  if (!connectionString) throw new Error("SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL is required");

  const artifactPath = args.artifactPath ?? latestReferenceWriterArtifact();
  const artifact = readArtifact(artifactPath);
  const counts = summarizeArtifact(artifact);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: pgSslConfig(connectionString),
  });
  await client.connect();
  try {
    const result = await client.query(
      `insert into public.market_pricing_pipeline_phase_runs (
         pipeline,
         phase,
         run_key,
         artifact_path,
         started_at,
         finished_at,
         status,
         acquired_count,
         candidate_count,
         inserted_count,
         updated_count,
         no_op_count,
         failed_count,
         error,
         payload
       ) values (
         'mee_reference_refresh',
         'reference_refresh',
         $1,
         $2,
         $3::timestamptz,
         now(),
         $4,
         $5::int,
         $6::int,
         $7::int,
         $8::int,
         $9::int,
         $10::int,
         $11,
         $12::jsonb
       )
       returning id, status, artifact_path, created_at`,
      [
        args.runKey,
        artifactPath,
        args.startedAt,
        args.status,
        counts.acquired_count,
        counts.candidate_count,
        counts.inserted_count,
        counts.updated_count,
        counts.no_op_count,
        counts.failed_count,
        args.error,
        JSON.stringify(counts.payload),
      ],
    );
    console.log(JSON.stringify(result.rows[0], null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

await main();
