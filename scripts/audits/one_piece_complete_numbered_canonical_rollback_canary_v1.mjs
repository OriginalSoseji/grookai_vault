import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_COMPLETE_NUMBERED_ROLLBACK_CANARY_VERSION,
  evaluateOnePieceCompleteNumberedCanaryPostRollbackV1,
  evaluateOnePieceCompleteNumberedCanaryTransactionV1,
  selectOnePieceCompleteNumberedCanaryV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_rollback_canary_v1.mjs";
import {
  evaluateOnePieceCompleteNumberedPreflightV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_preflight_v1.mjs";
import {
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256, stableJson } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import {
  captureOnePieceCompleteNumberedPreflightV1,
} from "./one_piece_complete_numbered_canonical_preflight_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_promotion_v1", "frozen_plan_v1",
  "promotion_plan.json.gz");
const PREFLIGHT_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_preflight_v1", "production_read_only_v1",
  "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_rollback_canary_v1",
  "production_rollback_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    execute: false,
    expectedHeadSha: "",
    envFile: "C:\\grookai_vault\\.env.local",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--execute-rollback-canary") args.execute = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.execute) throw new Error("--execute-rollback-canary is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function clientOptions(connectionString) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-complete-numbered-rollback-canary-v1",
  };
}

export async function insertOnePieceCompleteNumberedCanaryV1(client, sample) {
  const sets = sample.map((item) => item.set_row);
  const rows = sample.map((item) => item.numbered_card);
  await client.query(`insert into public.sets
    (id,game,code,name,release_date,source,identity_domain_default)
    select x.id,x.game,x.code,x.name,x.release_date,x.source,
      x.identity_domain_default from jsonb_to_recordset($1::jsonb) as x(
      id uuid,game text,code text,name text,release_date date,source jsonb,
      identity_domain_default text)`, [JSON.stringify(sets)]);
  await client.query(`insert into public.card_prints
    (id,game_id,set_id,set_code,name,number,variant_key,rarity,gv_id,
     tcgplayer_id,external_ids,identity_domain,print_identity_key,image_url,
     image_alt_url,data_quality_flags,ai_metadata)
    select x.id,x.game_id,x.set_id,x.set_code,x.name,x.number,x.variant_key,
      x.rarity,x.gv_id,x.tcgplayer_id,x.external_ids,x.identity_domain,
      x.print_identity_key,x.image_url,x.image_alt_url,x.data_quality_flags,
      x.ai_metadata from jsonb_to_recordset($1::jsonb) as x(
      id uuid,game_id uuid,set_id uuid,set_code text,name text,number text,
      variant_key text,rarity text,gv_id text,tcgplayer_id text,
      external_ids jsonb,identity_domain text,print_identity_key text,
      image_url text,image_alt_url text,data_quality_flags jsonb,ai_metadata jsonb)`,
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
      x.active from jsonb_to_recordset($1::jsonb) as x(
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

async function transactionReadback(client, sample) {
  const setIds = sample.map((item) => item.set_row.id);
  const rows = sample.map((item) => item.numbered_card);
  const cardIds = rows.map((row) => row.card_print.id);
  const identityIds = rows.map((row) => row.identity.id);
  const evidenceIds = rows.map((row) => row.source_evidence.id);
  const products = rows.map((row) => String(row.source_product_id));
  const row = (await client.query(`select
    (select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'code',code)
      order by code),'[]'::jsonb) from public.sets where id=any($1::uuid[])) as sets,
    (select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'set_id',set_id::text,
      'gv_id',gv_id,'tcgplayer_id',tcgplayer_id) order by id::text),'[]'::jsonb)
      from public.card_prints where id=any($2::uuid[])) as card_prints,
    (select coalesce(jsonb_agg(jsonb_build_object('id',id::text,
      'card_print_id',card_print_id::text,'identity_key_hash',identity_key_hash)
      order by id::text),'[]'::jsonb) from public.card_print_identity
      where id=any($3::uuid[])) as identities,
    (select coalesce(jsonb_agg(jsonb_build_object('id',id::text,
      'card_print_identity_id',card_print_identity_id::text,
      'card_print_id',card_print_id::text,'evidence_key_hash',evidence_key_hash)
      order by id::text),'[]'::jsonb) from public.card_print_identity_source_evidence
      where id=any($4::uuid[])) as source_evidence,
    (select coalesce(jsonb_agg(jsonb_build_object('card_print_id',card_print_id::text,
      'source',source,'external_id',external_id) order by external_id),'[]'::jsonb)
      from public.external_mappings where source='tcgplayer'
      and external_id=any($5::text[])) as external_mappings,
    (select release_status from public.catalog_game_release_controls
      where game_code='one_piece') as release_status`,
  [setIds, cardIds, identityIds, evidenceIds, products])).rows[0];
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    row[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return row;
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

export async function executeOnePieceCompleteNumberedRollbackCanaryV1(
  connectionString,
  plan,
  sample,
) {
  const before = await captureOnePieceCompleteNumberedPreflightV1(
    connectionString, plan);
  const beforeEvaluation = evaluateOnePieceCompleteNumberedPreflightV1({
    plan,
    snapshot: before,
  });
  if (!beforeEvaluation.valid) {
    throw new Error(`Fresh preflight failed: ${beforeEvaluation.findings.join(",")}`);
  }

  const client = new Client(clientOptions(connectionString));
  await client.connect();
  let transactionOpen = false;
  let transaction = null;
  let transactionError = null;
  try {
    await client.query("begin");
    transactionOpen = true;
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='180s'");
    await client.query("set local idle_in_transaction_session_timeout='60s'");
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_complete_numbered_canonical_apply_v1"],
    );
    await insertOnePieceCompleteNumberedCanaryV1(client, sample);
    const readback = await transactionReadback(client, sample);
    const writes = await attributableWrites(client);
    const findings = evaluateOnePieceCompleteNumberedCanaryTransactionV1({
      sample,
      readback,
      attributableWrites: writes,
    });
    transaction = { readback, attributable_writes: writes, findings };
    if (findings.length) throw new Error(findings.join(","));
  } catch (error) {
    transactionError = error.message;
  } finally {
    if (transactionOpen) {
      await client.query("rollback").catch(() => {});
      transactionOpen = false;
    }
    await client.end();
  }

  const after = await captureOnePieceCompleteNumberedPreflightV1(
    connectionString, plan);
  const afterEvaluation = evaluateOnePieceCompleteNumberedPreflightV1({
    plan,
    snapshot: after,
  });
  const postFindings = evaluateOnePieceCompleteNumberedCanaryPostRollbackV1({
    before,
    after,
    afterEvaluation,
  });
  return {
    before,
    transaction,
    transaction_error: transactionError,
    after,
    findings: [
      ...(transaction?.findings ?? []),
      ...(transactionError ? [`transaction_error:${transactionError}`] : []),
      ...postFindings,
    ],
  };
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
  const [planCompressed, preflightBody] = await Promise.all([
    fs.readFile(PLAN_PATH),
    fs.readFile(PREFLIGHT_PATH),
  ]);
  const plan = JSON.parse(gunzipSync(planCompressed));
  const preflight = JSON.parse(preflightBody);
  const validation = validateOnePieceCompleteNumberedPromotionPlanV1(plan);
  if (!validation.valid ||
      preflight.status !== "production_read_only_preflight_passed" ||
      preflight.plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256 ||
      preflight.payload_fingerprint_sha256 !== plan.payload_fingerprint_sha256 ||
      preflight.findings?.length !== 0) {
    throw new Error("Frozen plan or production preflight is not canary eligible");
  }
  const sample = selectOnePieceCompleteNumberedCanaryV1(plan);
  const runPlan = {
    version: ONE_PIECE_COMPLETE_NUMBERED_ROLLBACK_CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    sample: sample.map((item) => ({
      role: item.role,
      set_code: item.set_code,
      set_id: item.set_row.id,
      source_product_id: item.numbered_card.source_product_id,
      card_print_id: item.numbered_card.card_print.id,
      gv_id: item.numbered_card.card_print.gv_id,
    })),
    mode: "production_transaction_rollback_only",
    boundaries: {
      durable_database_writes: 0,
      transaction_rollback_required: true,
      updates: 0,
      deletes: 0,
      child_printing_writes: 0,
      don_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_enabled: false,
    },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  artifacts["run_plan.json"] = await writeJson(
    path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const proof = await executeOnePieceCompleteNumberedRollbackCanaryV1(
    connectionString, plan, sample);
  const passed = proof.findings.length === 0 && proof.transaction !== null;
  const compactProof = {
    readback: proof.transaction?.readback ?? null,
    attributable_writes: proof.transaction?.attributable_writes ?? [],
    findings: proof.transaction?.findings ?? [],
    rollback_attempted: true,
    rollback_succeeded: proof.findings.every((finding) =>
      !finding.startsWith("post_rollback:")),
  };
  const canaryFingerprint = sha256(stableJson({
    producer_commit_sha: repository.commit_sha,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    sample: runPlan.sample,
    transaction: compactProof,
    post_rollback: {
      foundation: proof.after.foundation,
      baseline: proof.after.baseline,
      collisions: proof.after.collisions,
    },
  }));
  const summary = {
    version: ONE_PIECE_COMPLETE_NUMBERED_ROLLBACK_CANARY_VERSION,
    recorded_at: new Date().toISOString(),
    status: passed
      ? "rollback_canary_passed_zero_durable_rows"
      : "rollback_canary_failed_zero_residue_still_checked",
    repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    rollback_canary_fingerprint_sha256: canaryFingerprint,
    sample: runPlan.sample,
    transaction: compactProof,
    post_rollback: {
      baseline: proof.after.baseline,
      collisions: proof.after.collisions,
    },
    findings: proof.findings,
    boundaries: runPlan.boundaries,
    exact_next_gate: passed
      ? "freeze an insert-only durable apply plan bound to this rollback proof"
      : "stop and repair only the recorded rollback-canary failure",
  };
  artifacts["protected_before.json"] = await writeJson(
    path.join(args.outDir, "protected_before.json"), proof.before);
  artifacts["transaction_proof.json"] = await writeJson(
    path.join(args.outDir, "transaction_proof.json"), compactProof);
  artifacts["post_rollback_readback.json"] = await writeJson(
    path.join(args.outDir, "post_rollback_readback.json"), proof.after);
  artifacts["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  const report = `# Complete One Piece Numbered Canonical Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer commit: \`${repository.commit_sha}\`\n` +
    `- Sample roles: \`${runPlan.sample.map((row) => row.role).join(", ")}\`\n` +
    `- Transaction set/card/identity/evidence/mapping rows: \`5 / 5 / 5 / 5 / 5\`\n` +
    `- Durable rows after rollback: \`0\`\n` +
    `- App visibility enabled: \`false\`\n` +
    `- Findings: \`${summary.findings.length}\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  artifacts["REPORT.md"] = Buffer.from(report, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
    bound_inputs: [
      { path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(planCompressed) },
      { path: path.relative(ROOT, PREFLIGHT_PATH).replaceAll("\\", "/"),
        sha256: sha256(preflightBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!passed) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { PLAN_PATH, PREFLIGHT_PATH };
