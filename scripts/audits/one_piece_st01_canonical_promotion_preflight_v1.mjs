import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  buildOnePieceSt01PreflightFingerprintV1,
  evaluateOnePieceSt01PromotionPreflightV1,
  expectedOnePieceSt01StagingBindingsV1,
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_GAME_ID,
  ONE_PIECE_ST01_PREFLIGHT_VERSION,
  validateOnePieceSt01PromotionPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "frozen_plan_v1", "plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "production_preflight_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local", expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 120_000,
    statement_timeout: 120_000, application_name: applicationName,
  };
}

export async function captureOnePieceSt01PreflightSnapshotV1(
  connectionString,
  plan,
  applicationName = "one-piece-st01-canonical-preflight-v1",
) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const rows = plan.payload.numbered_cards;
    const ids = {
      cards: rows.map((row) => row.card_print.id),
      gvIds: rows.map((row) => row.card_print.gv_id),
      productIds: rows.map((row) => Number(row.source_product_id)),
      identityIds: rows.map((row) => row.identity.id),
      identityHashes: rows.map((row) => row.identity.identity_key_hash),
      evidenceIds: rows.map((row) => row.source_evidence.id),
      evidenceHashes: rows.map((row) => row.source_evidence.evidence_key_hash),
    };
    const foundation = (await client.query(`select
      (select count(*)::int from public.games where code=$1) as game_count,
      (select id::text from public.games where code=$1) as game_id,
      (select count(*)::int from public.catalog_game_release_controls where game_code=$1) as release_count,
      (select release_status from public.catalog_game_release_controls where game_code=$1) as release_status,
      (select release_version from public.catalog_game_release_controls where game_code=$1) as release_version,
      (select set_config('request.jwt.claim.role','anon',true) is not null and public.catalog_game_visible_to_request_v1($1)) as anon_visible,
      (select set_config('request.jwt.claim.role','authenticated',true) is not null and public.catalog_game_visible_to_request_v1($1)) as authenticated_visible,
      (select set_config('request.jwt.claim.role','service_role',true) is not null and public.catalog_game_visible_to_request_v1($1)) as service_visible,
      (select count(*)::int from supabase_migrations.schema_migrations where version='20260814150000') as migration_count,
      (select count(*)::int from public.sets where game=$1) as one_piece_set_count,
      (select count(*)::int from public.card_prints where game_id=$2::uuid) as one_piece_card_count`,
    [ONE_PIECE_GAME_CODE, ONE_PIECE_GAME_ID])).rows[0];
    const tableNames = ["sets", "card_prints", "card_print_identity",
      "card_print_identity_source_evidence", "external_mappings"];
    const schemaRows = (await client.query(`select table_name,
      count(*)::int as column_count from information_schema.columns
      where table_schema='public' and table_name=any($1::text[])
      group by table_name`, [tableNames])).rows;
    const schema = Object.fromEntries(tableNames.map((table) => [
      table, schemaRows.some((row) => row.table_name === table && row.column_count > 0),
    ]));
    const stagingRows = (await client.query(`select id::text,
      source_product_id::bigint, source_group_id::bigint, record_class,
      single_card_kind, payload_sha256
      from public.one_piece_canonical_import_rows
      where source_product_id=any($1::bigint[])
      order by source_product_id`, [ids.productIds])).rows.map((row) => ({
      ...row,
      source_product_id: Number(row.source_product_id),
      source_group_id: Number(row.source_group_id),
    }));
    const collisions = (await client.query(`select
      (select count(*)::int from public.sets where id=$1::uuid or (game=$2 and code=$3)) as set_identity,
      (select count(*)::int from public.card_prints where id=any($4::uuid[]) or gv_id=any($5::text[]) or tcgplayer_id=any($6::text[])) as card_identity,
      (select count(*)::int from public.card_print_identity where id=any($7::uuid[]) or (identity_domain='one_piece_eng_print' and identity_key_hash=any($8::text[]) and is_active)) as print_identity,
      (select count(*)::int from public.card_print_identity_source_evidence where id=any($9::uuid[]) or evidence_key_hash=any($10::text[])) as source_evidence,
      (select count(*)::int from public.external_mappings where source='tcgplayer' and external_id=any($6::text[])) as external_mapping`, [
      plan.payload.set_row.id, ONE_PIECE_GAME_CODE, plan.payload.set_row.code,
      ids.cards, ids.gvIds, ids.productIds.map(String), ids.identityIds,
      ids.identityHashes, ids.evidenceIds, ids.evidenceHashes,
    ])).rows[0];
    const blocking = (await client.query(
      "select unnest(pg_blocking_pids(pg_backend_pid()))::integer as pid"))
      .rows.map((row) => Number(row.pid));
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only === "on";
    await client.query("rollback");
    open = false;
    return {
      foundation, schema, staging_rows: stagingRows, collisions,
      blocking_pids: blocking, transaction_read_only: transactionReadOnly,
    };
  } finally {
    if (open) await client.query("rollback").catch(() => {});
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
  const planBody = await fs.readFile(PLAN_PATH, "utf8");
  const plan = JSON.parse(planBody);
  const validation = validateOnePieceSt01PromotionPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  const runPlan = {
    version: ONE_PIECE_ST01_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(), repository,
    promotion_plan_sha256: sha256(planBody),
    promotion_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    target_staging_bindings: expectedOnePieceSt01StagingBindingsV1(plan),
    mode: "production_read_only",
    boundaries: plan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const snapshot = await captureOnePieceSt01PreflightSnapshotV1(connectionString, plan);
  const evaluation = evaluateOnePieceSt01PromotionPreflightV1({ plan, snapshot });
  const fingerprint = buildOnePieceSt01PreflightFingerprintV1({
    producerCommitSha: repository.commit_sha,
    planFingerprint: plan.plan_fingerprint_sha256,
    snapshot,
  });
  const summary = {
    version: ONE_PIECE_ST01_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "pass" : "blocked", repository,
    promotion_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_fingerprint_sha256: fingerprint,
    selected_numbered_cards: 17,
    snapshot, findings: evaluation.findings,
    boundaries: { database_writes: 0, storage_writes: 0,
      pointer_writes: 0, pricing_writes: 0, publication_writes: 0,
      vault_writes: 0 },
  };
  const snapshotBody = await writeJson(path.join(args.outDir, "production_readback.json"), snapshot);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece ST-01 Canonical Promotion Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Preflight fingerprint: \`${fingerprint}\`\n` +
    `- Numbered cards: \`17\`\n` +
    `- Collisions: \`${Object.values(snapshot.collisions).reduce((a,b) => a + Number(b), 0)}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [["run_plan.json", runPlanBody],
      ["production_readback.json", snapshotBody], ["summary.json", summaryBody],
      ["REPORT.md", reportBody]].map(([artifactPath, body]) => ({
      path: artifactPath, sha256: sha256(body),
    })),
    bound_inputs: [{ path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
      sha256: sha256(planBody) }],
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    preflight_fingerprint_sha256: fingerprint, findings: summary.findings,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
  if (!evaluation.valid) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { PLAN_PATH, parseArgs };
