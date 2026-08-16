import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceDurablePayloadReadbackV1,
  ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL_ENV,
  ONE_PIECE_DURABLE_PAYLOAD_APPLY_GUARD,
  ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION,
  ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
  ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT,
  ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_SUMMARY_SHA256,
  validateOnePieceDurablePayloadApplyInputsV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_apply_v1.mjs";
import {
  buildOnePieceDurableSourceExpectationV1,
  ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
} from "../../backend/pricing/one_piece_canonical_import_durable_payload_preflight_v1.mjs";
import {
  evaluateOnePieceSchemaReadbackV1,
} from "../../backend/pricing/one_piece_canonical_import_durable_staging_schema_apply_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import {
  captureOnePieceProtectedBoundariesV1,
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
const PREFLIGHT_SUMMARY = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_preflight_v1",
  "production_read_only_v1", "summary.json");
const SCHEMA_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_staging_schema_apply_v1",
  "schema_apply_plan_v1", "plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_import_durable_payload_apply_v1", "production_apply_v1");

function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: "", outDir: DEFAULT_OUT,
    envFile: "C:\\grookai_vault\\.env.local" };
  for (const arg of argv) {
    if (arg === "--execute") args.execute = true;
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else if (arg.startsWith("--env-file=")) args.envFile = path.resolve(arg.slice(11));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!args.execute) throw new Error("--execute is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function sanitize(error) {
  return String(error?.message ?? error)
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DATABASE_URL]")
    .slice(0, 4000);
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function clientFor(connectionString, applicationName) {
  return new Client({ connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 240_000,
    statement_timeout: 240_000, application_name: applicationName });
}

export async function captureOnePieceDurableRowsV1(client, plan) {
  const total = (await client.query(`select
    (select count(*)::integer from public.one_piece_canonical_import_batches)
      as total_batch_count,
    (select count(*)::integer from public.one_piece_canonical_import_rows)
      as total_row_count`)).rows[0];
  const batchResult = await client.query(`select id::text,
    payload_fingerprint_sha256, source_manifest_logical_sha256,
    migration_candidate_sha256, plan_version, schema_version,
    producing_commit_sha, producing_branch, source_category_id::integer,
    source_group_id::integer, source_group_name,
    source_group_released_on::text, staging_mode,
    authorized_durable_batch_rows, authorized_durable_staging_rows,
    row_counts, execution_boundaries
    from public.one_piece_canonical_import_batches where id=$1::uuid`,
  [plan.batch.id]);
  const rowResult = await client.query(`select id::text, batch_id::text,
    source_product_id::integer, source_group_id::integer, record_class,
    single_card_kind, language_key, promotion_state, row_ordinal,
    payload, payload_sha256 from public.one_piece_canonical_import_rows
    where batch_id=$1::uuid order by row_ordinal`, [plan.batch.id]);
  return {
    total_batch_count: Number(total.total_batch_count),
    total_row_count: Number(total.total_row_count),
    batch_count: batchResult.rowCount,
    row_count: rowResult.rowCount,
    batch: batchResult.rows[0] ?? null,
    rows: rowResult.rows.map((row) => ({ ...row,
      source_product_id: Number(row.source_product_id),
      source_group_id: Number(row.source_group_id),
      row_ordinal: Number(row.row_ordinal) })),
  };
}

async function collisionState(client, plan) {
  return (await client.query(`select
    (select count(*)::integer from public.one_piece_canonical_import_batches
      where id=$1::uuid) as batch_id,
    (select count(*)::integer from public.one_piece_canonical_import_batches
      where payload_fingerprint_sha256=$2) as payload_fingerprint,
    (select count(*)::integer from public.one_piece_canonical_import_rows
      where source_product_id=any($3::bigint[])) as source_products`, [
    plan.batch.id, plan.payload_fingerprint_sha256,
    plan.staging_rows.map((row) => Number(row.source_product_id)),
  ])).rows[0];
}

async function insertExactPayload(client, plan) {
  const batch = plan.batch;
  await client.query(`insert into public.one_piece_canonical_import_batches (
    id, payload_fingerprint_sha256, source_manifest_logical_sha256,
    migration_candidate_sha256, plan_version, schema_version,
    producing_commit_sha, producing_branch, source_category_id,
    source_group_id, source_group_name, source_group_released_on, staging_mode,
    authorized_durable_batch_rows, authorized_durable_staging_rows,
    row_counts, execution_boundaries
  ) values ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::date,$13,$14,$15,
    $16::jsonb,$17::jsonb)`, [
    batch.id, batch.payload_fingerprint_sha256,
    batch.source_manifest_logical_sha256, batch.migration_candidate_sha256,
    batch.plan_version, batch.schema_version, batch.producing_commit_sha,
    batch.producing_branch, batch.source_category_id, batch.source_group_id,
    batch.source_group_name, batch.source_group_released_on, batch.staging_mode,
    batch.authorized_durable_batch_rows, batch.authorized_durable_staging_rows,
    JSON.stringify(batch.row_counts), JSON.stringify(batch.execution_boundaries),
  ]);
  await client.query(`insert into public.one_piece_canonical_import_rows (
    id,batch_id,source_product_id,source_group_id,record_class,single_card_kind,
    language_key,promotion_state,row_ordinal,payload,payload_sha256)
    select id,batch_id,source_product_id,source_group_id,record_class,
      single_card_kind,language_key,promotion_state,row_ordinal,payload,payload_sha256
    from jsonb_to_recordset($1::jsonb) as r(id uuid,batch_id uuid,
      source_product_id bigint,source_group_id bigint,record_class text,
      single_card_kind text,language_key text,promotion_state text,
      row_ordinal integer,payload jsonb,payload_sha256 text)`,
  [JSON.stringify(plan.staging_rows)]);
}

async function captureFreshReadOnly(connectionString, plan, schemaPlan) {
  const client = clientFor(connectionString,
    "one-piece-durable-payload-fresh-readback-v1");
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const rows = await captureOnePieceDurableRowsV1(client, plan);
    rows.schema = await captureOnePieceSchemaReadbackV1(client);
    const source = await captureOnePieceSourceSnapshotV1(client,
      buildOnePieceDurableSourceExpectationV1(plan));
    const protectedAfter = await captureOnePieceProtectedBoundariesV1(client);
    await client.query("rollback");
    open = false;
    rows.schema.transaction_closed_before_artifacts = true;
    return { rows, source, protected_after: protectedAfter };
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function executeTransaction(connectionString, plan, schemaPlan) {
  const client = clientFor(connectionString,
    "one-piece-durable-payload-apply-v1");
  const proof = { transaction_started: false, committed: false,
    service_role_write_path: false, collision_state: null,
    protected_before: null, protected_inside: null, readback: null,
    source_inside: null, findings: [] };
  await client.connect();
  try {
    await client.query("begin transaction isolation level serializable");
    proof.transaction_started = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='240s'");
    await client.query("select pg_advisory_xact_lock(hashtext('one-piece-durable-payload-v1'))");
    proof.collision_state = await collisionState(client, plan);
    if (Object.values(proof.collision_state).some((value) => Number(value) !== 0)) {
      throw new Error("Fresh collision check failed");
    }
    proof.protected_before = await captureOnePieceProtectedBoundariesV1(client);
    const sourceExpectation = buildOnePieceDurableSourceExpectationV1(plan);
    const sourceBefore = await captureOnePieceSourceSnapshotV1(client, sourceExpectation);
    const schemaBefore = await captureOnePieceSchemaReadbackV1(client);
    const schemaBeforeFindings = evaluateOnePieceSchemaReadbackV1({
      plan: schemaPlan, readback: schemaBefore, requireReadOnly: false,
      requireClosed: false,
    });
    if (schemaBeforeFindings.length) {
      throw new Error(`Schema drift before write: ${schemaBeforeFindings.join(",")}`);
    }
    await client.query("set local role service_role");
    await client.query("select set_config('request.jwt.claim.role','service_role',true)");
    const role = (await client.query("select current_user as role")).rows[0].role;
    proof.service_role_write_path = role === "service_role";
    if (!proof.service_role_write_path) throw new Error("Service-role write path not active");
    await insertExactPayload(client, plan);
    const stagedRows = await captureOnePieceDurableRowsV1(client, plan);
    await client.query("reset role");
    stagedRows.schema = await captureOnePieceSchemaReadbackV1(client);
    proof.source_inside = await captureOnePieceSourceSnapshotV1(client, sourceExpectation);
    proof.protected_inside = await captureOnePieceProtectedBoundariesV1(client);
    proof.readback = stagedRows;
    const evaluation = evaluateOnePieceDurablePayloadReadbackV1({
      plan, schemaPlan, readback: stagedRows,
      sourceSnapshot: proof.source_inside,
      protectedBefore: proof.protected_before,
      protectedAfter: proof.protected_inside,
      schemaRequireReadOnly: false, schemaRequireClosed: false,
    });
    proof.findings = evaluation.findings;
    if (!evaluation.valid) {
      throw new Error(`Transaction readback failed: ${evaluation.findings.join(",")}`);
    }
    await client.query("commit");
    proof.committed = true;
    proof.transaction_started = false;
    return proof;
  } catch (error) {
    if (proof.transaction_started) await client.query("rollback").catch(() => {});
    error.transaction_proof = proof;
    throw error;
  } finally {
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
    throw new Error("Repository is not the exact clean apply producer");
  }
  const [planText, preflightText, schemaPlanText] = await Promise.all([
    fs.readFile(PAYLOAD_PLAN, "utf8"), fs.readFile(PREFLIGHT_SUMMARY, "utf8"),
    fs.readFile(SCHEMA_PLAN, "utf8"),
  ]);
  const plan = JSON.parse(planText);
  const preflight = JSON.parse(preflightText);
  const schemaPlan = JSON.parse(schemaPlanText);
  const inputValidation = validateOnePieceDurablePayloadApplyInputsV1({
    plan, preflight, preflightSummaryText: preflightText,
  });
  if (!inputValidation.valid) {
    throw new Error(`Frozen apply inputs failed: ${inputValidation.findings.join(",")}`);
  }
  if (process.env[ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL_ENV] !==
      ONE_PIECE_DURABLE_PAYLOAD_APPLY_GUARD) {
    throw new Error(`Exact guard is missing from ${ONE_PIECE_DURABLE_PAYLOAD_APPLY_APPROVAL_ENV}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = { version: ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION,
    recorded_at: new Date().toISOString(), repository,
    preflight_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT,
    preflight_summary_sha256: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_SUMMARY_SHA256,
    payload_plan_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
    payload_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
    authorized_batch_rows: 1, authorized_staging_rows: 21,
    boundaries: { private_staging_only: true, canonical_writes: 0,
      sealed_writes: 0, pricing_writes: 0, storage_writes: 0,
      vault_writes: 0, publication_or_deployment: false, mtg_writes: 0 } };
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ?? "";
  if (!connectionString) throw new Error("Production database URL is missing");
  let transactionProof;
  let fresh;
  let failure = null;
  try {
    transactionProof = await executeTransaction(connectionString, plan, schemaPlan);
    fresh = await captureFreshReadOnly(connectionString, plan, schemaPlan);
    const freshEvaluation = evaluateOnePieceDurablePayloadReadbackV1({
      plan, schemaPlan, readback: fresh.rows, sourceSnapshot: fresh.source,
      protectedBefore: transactionProof.protected_before,
      protectedAfter: fresh.protected_after,
    });
    if (!freshEvaluation.valid) {
      throw new Error(`Fresh readback failed: ${freshEvaluation.findings.join(",")}`);
    }
  } catch (error) {
    transactionProof ??= error.transaction_proof;
    failure = sanitize(error);
  }
  const summary = { version: ONE_PIECE_DURABLE_PAYLOAD_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: !failure && transactionProof?.committed && fresh
      ? "applied_and_fresh_readback_passed" : "blocked",
    repository, environment: environmentFingerprint(connectionString, "production"),
    preflight_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_PREFLIGHT_FINGERPRINT,
    payload_plan_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_PLAN_FINGERPRINT,
    payload_fingerprint_sha256: ONE_PIECE_DURABLE_PAYLOAD_FINGERPRINT,
    committed: transactionProof?.committed ?? false,
    service_role_write_path: transactionProof?.service_role_write_path ?? false,
    batch_rows_written: fresh?.rows?.batch_count ?? 0,
    staging_rows_written: fresh?.rows?.row_count ?? 0,
    transaction_findings: transactionProof?.findings ?? [],
    failure,
    boundaries: runPlan.boundaries };
  const bodies = { "run_plan.json": runPlanBody };
  if (transactionProof) bodies["transaction_proof.json"] = await writeJson(
    path.join(args.outDir, "transaction_proof.json"), transactionProof);
  if (fresh) bodies["fresh_readback.json"] = await writeJson(
    path.join(args.outDir, "fresh_readback.json"), fresh);
  bodies["summary.json"] = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece Durable Payload Apply V1\n\n` +
    `- Status: **${summary.status.toUpperCase()}**\n` +
    `- Committed: \`${summary.committed}\`\n` +
    `- Service-role write path: \`${summary.service_role_write_path}\`\n` +
    `- Batch rows: \`${summary.batch_rows_written}\`\n` +
    `- Staging rows: \`${summary.staging_rows_written}\`\n` +
    `- Canonical/public writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  bodies["REPORT.md"] = reportBody;
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(bodies).map(([artifactPath, body]) => ({
      path: artifactPath, bytes: Buffer.byteLength(body), sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    committed: summary.committed, batch_rows: summary.batch_rows_written,
    staging_rows: summary.staging_rows_written, failure,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (summary.status === "blocked") process.exitCode = 1;
}

const invoked = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${sanitize(error)}\n`);
    process.exitCode = 1;
  });
}
