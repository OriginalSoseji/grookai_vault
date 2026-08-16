import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceSt01AttributableWritesV1,
  evaluateOnePieceSt01CanaryReadbackV1,
  evaluateOnePieceSt01PromotionPreflightV1,
  ONE_PIECE_GAME_CODE,
  ONE_PIECE_ST01_ROLLBACK_CANARY_VERSION,
  validateOnePieceSt01PromotionPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";
import { sha256, stableJson } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import {
  captureOnePieceSt01PreflightSnapshotV1,
  PLAN_PATH,
} from "./one_piece_st01_canonical_promotion_preflight_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_PREFLIGHT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "production_preflight_v1", "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "production_rollback_canary_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local", expectedHeadSha: "",
    preflightSummary: DEFAULT_PREFLIGHT, outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--preflight-summary=")) {
      args.preflightSummary = path.resolve(argument.slice(20));
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

function clientOptions(connectionString) {
  return {
    connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 120_000,
    statement_timeout: 120_000,
    application_name: "one-piece-st01-canonical-rollback-canary-v1",
  };
}

async function insertPayload(client, plan) {
  const setRow = plan.payload.set_row;
  const rows = plan.payload.numbered_cards;
  await client.query(`insert into public.sets
    (id, game, code, name, release_date, source, identity_domain_default)
    values ($1::uuid,$2,$3,$4,$5::date,$6::jsonb,$7)`, [
    setRow.id, setRow.game, setRow.code, setRow.name, setRow.release_date,
    JSON.stringify(setRow.source), setRow.identity_domain_default,
  ]);
  await client.query(`insert into public.card_prints
    (id, game_id, set_id, set_code, name, number, variant_key, rarity,
     gv_id, tcgplayer_id, external_ids, identity_domain, print_identity_key,
     image_url, image_alt_url, data_quality_flags, ai_metadata)
    select x.id,x.game_id,x.set_id,x.set_code,x.name,x.number,x.variant_key,
      x.rarity,x.gv_id,x.tcgplayer_id,x.external_ids,x.identity_domain,
      x.print_identity_key,x.image_url,x.image_alt_url,x.data_quality_flags,
      x.ai_metadata
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid, game_id uuid, set_id uuid, set_code text, name text,
      number text, variant_key text, rarity text, gv_id text,
      tcgplayer_id text, external_ids jsonb, identity_domain text,
      print_identity_key text, image_url text, image_alt_url text,
      data_quality_flags jsonb, ai_metadata jsonb)`,
  [JSON.stringify(rows.map((row) => row.card_print))]);
  await client.query(`insert into public.card_print_identity
    (id,card_print_id,identity_domain,set_code_identity,printed_number,
     normalized_printed_name,source_name_raw,identity_payload,
     identity_key_version,identity_key_hash,is_active)
    select x.id,x.card_print_id,x.identity_domain,x.set_code_identity,
      x.printed_number,x.normalized_printed_name,x.source_name_raw,
      x.identity_payload,x.identity_key_version,x.identity_key_hash,x.is_active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,card_print_id uuid,identity_domain text,set_code_identity text,
      printed_number text,normalized_printed_name text,source_name_raw text,
      identity_payload jsonb,identity_key_version text,identity_key_hash text,
      is_active boolean)`, [JSON.stringify(rows.map((row) => row.identity))]);
  await client.query(`insert into public.card_print_identity_source_evidence
    (id,card_print_identity_id,card_print_id,acquisition_key,source_key,
     evidence_key_hash,evidence_subject,evidence_payload,active)
    select x.id,x.card_print_identity_id,x.card_print_id,x.acquisition_key,
      x.source_key,x.evidence_key_hash,x.evidence_subject,x.evidence_payload,
      x.active
    from jsonb_to_recordset($1::jsonb) as x(
      id uuid,card_print_identity_id uuid,card_print_id uuid,
      acquisition_key text,source_key text,evidence_key_hash text,
      evidence_subject jsonb,evidence_payload jsonb,active boolean)`,
  [JSON.stringify(rows.map((row) => row.source_evidence))]);
  await client.query(`insert into public.external_mappings
    (card_print_id,source,external_id,meta,active)
    select x.card_print_id,x.source,x.external_id,x.meta,x.active
    from jsonb_to_recordset($1::jsonb) as x(
      card_print_id uuid,source text,external_id text,meta jsonb,active boolean)`,
  [JSON.stringify(rows.map((row) => row.external_mapping))]);
}

async function transactionReadback(client, plan) {
  const rows = plan.payload.numbered_cards;
  const cardIds = rows.map((row) => row.card_print.id);
  const identityIds = rows.map((row) => row.identity.id);
  const evidenceIds = rows.map((row) => row.source_evidence.id);
  const products = rows.map((row) => String(row.source_product_id));
  return (await client.query(`select
    (select count(*)::int from public.sets where id=$1::uuid) as sets,
    (select count(*)::int from public.card_prints where id=any($2::uuid[])) as card_prints,
    (select count(*)::int from public.card_print_identity where id=any($3::uuid[])) as card_print_identity,
    (select count(*)::int from public.card_print_identity_source_evidence where id=any($4::uuid[])) as card_print_identity_source_evidence,
    (select count(*)::int from public.external_mappings where source='tcgplayer' and external_id=any($5::text[])) as external_mappings,
    (select release_status from public.catalog_game_release_controls where game_code=$6) as release_status,
    (select set_config('request.jwt.claim.role','anon',true) is not null and public.catalog_game_visible_to_request_v1($6)) as anon_visible,
    (select set_config('request.jwt.claim.role','authenticated',true) is not null and public.catalog_game_visible_to_request_v1($6)) as authenticated_visible,
    (select set_config('request.jwt.claim.role','service_role',true) is not null and public.catalog_game_visible_to_request_v1($6)) as service_visible`,
  [plan.payload.set_row.id, cardIds, identityIds, evidenceIds, products,
    ONE_PIECE_GAME_CODE])).rows[0];
}

async function attributableWrites(client) {
  return (await client.query(`select relname as table_name,
    coalesce(n_tup_ins,0)::bigint as inserted,
    coalesce(n_tup_upd,0)::bigint as updated,
    coalesce(n_tup_del,0)::bigint as deleted,
    coalesce(n_tup_hot_upd,0)::bigint as hot_updated
    from pg_stat_xact_user_tables where schemaname='public'
      and (coalesce(n_tup_ins,0)<>0 or coalesce(n_tup_upd,0)<>0
        or coalesce(n_tup_del,0)<>0 or coalesce(n_tup_hot_upd,0)<>0)
    order by relname`)).rows;
}

export async function executeOnePieceSt01RollbackCanaryV1(connectionString, plan) {
  const before = await captureOnePieceSt01PreflightSnapshotV1(
    connectionString, plan, "one-piece-st01-canary-fresh-preflight-v1");
  const beforeEvaluation = evaluateOnePieceSt01PromotionPreflightV1({
    plan, snapshot: before,
  });
  if (!beforeEvaluation.valid) {
    throw new Error(`Fresh canary preflight failed: ${beforeEvaluation.findings.join(",")}`);
  }
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  let open = false;
  let transaction = null;
  try {
    await client.query("begin");
    open = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='120s'");
    await client.query("set local idle_in_transaction_session_timeout='60s'");
    await insertPayload(client, plan);
    const readback = await transactionReadback(client, plan);
    const writes = await attributableWrites(client);
    const findings = [
      ...evaluateOnePieceSt01CanaryReadbackV1({ plan, readback }),
      ...evaluateOnePieceSt01AttributableWritesV1(writes),
    ];
    transaction = { readback, attributable_writes: writes, findings };
    if (findings.length) throw new Error(findings.join(","));
    await client.query("rollback");
    open = false;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
  const after = await captureOnePieceSt01PreflightSnapshotV1(
    connectionString, plan, "one-piece-st01-canary-post-rollback-v1");
  const afterEvaluation = evaluateOnePieceSt01PromotionPreflightV1({
    plan, snapshot: after,
  });
  if (!afterEvaluation.valid || stableJson(before.collisions) !== stableJson(after.collisions)) {
    throw new Error(`Post-rollback proof failed: ${afterEvaluation.findings.join(",")}`);
  }
  return { before, transaction, after };
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
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  const [planBody, preflightBody] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8"), fs.readFile(args.preflightSummary, "utf8"),
  ]);
  const plan = JSON.parse(planBody);
  const preflight = JSON.parse(preflightBody);
  const validation = validateOnePieceSt01PromotionPlanV1(plan);
  if (!validation.valid || preflight.status !== "pass" ||
      preflight.promotion_plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256 ||
      preflight.repository?.commit_sha !== repository.commit_sha) {
    throw new Error("Frozen plan or preflight is not eligible for canary");
  }
  const runPlan = {
    version: ONE_PIECE_ST01_ROLLBACK_CANARY_VERSION,
    recorded_at: new Date().toISOString(), repository,
    promotion_plan_sha256: sha256(planBody),
    promotion_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_summary_sha256: sha256(preflightBody),
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    mode: "production_rollback_only",
    boundaries: { durable_database_writes: 0, transaction_rollback_required: true,
      storage_writes: 0, image_pointer_writes: 0, child_printing_writes: 0,
      don_writes: 0, sealed_writes: 0, pricing_writes: 0,
      publication_writes: 0, vault_writes: 0 },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const proof = await executeOnePieceSt01RollbackCanaryV1(connectionString, plan);
  const summary = {
    version: ONE_PIECE_ST01_ROLLBACK_CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    status: "rollback_canary_passed_zero_durable_rows",
    repository,
    promotion_plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    transaction_readback: proof.transaction.readback,
    attributable_writes: proof.transaction.attributable_writes,
    post_rollback_collisions: proof.after.collisions,
    findings: [],
    boundaries: runPlan.boundaries,
  };
  const transactionBody = await writeJson(path.join(args.outDir, "transaction_proof.json"), proof.transaction);
  const rollbackBody = await writeJson(path.join(args.outDir, "post_rollback_readback.json"), proof.after);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece ST-01 Canonical Promotion Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Set/card/identity/evidence/mapping transaction rows: \`1 / 17 / 17 / 17 / 17\`\n` +
    `- Durable target rows after rollback: \`0\`\n` +
    `- App visibility enabled: \`false\`\n` +
    `- DON/sealed/pointer/pricing/publication/Vault writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [["run_plan.json", runPlanBody],
      ["transaction_proof.json", transactionBody],
      ["post_rollback_readback.json", rollbackBody],
      ["summary.json", summaryBody], ["REPORT.md", reportBody]]
      .map(([artifactPath, body]) => ({ path: artifactPath, sha256: sha256(body) })),
    bound_inputs: [
      { path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"), sha256: sha256(planBody) },
      { path: path.relative(ROOT, args.preflightSummary).replaceAll("\\", "/"), sha256: sha256(preflightBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    producer_commit_sha: repository.commit_sha,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { insertPayload, parseArgs };

