import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  evaluateOnePieceSt01DurableReadbackV1,
  ONE_PIECE_ST01_DURABLE_APPLY_VERSION,
  ONE_PIECE_ST01_DURABLE_APPROVAL_ENV,
  requiredOnePieceSt01DurableApprovalV1,
  validateFreshPreflightForApplyV1,
  validateOnePieceSt01DurableApplyPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_apply_v1.mjs";
import {
  evaluateOnePieceSt01AttributableWritesV1,
  evaluateOnePieceSt01PromotionPreflightV1,
  ONE_PIECE_GAME_CODE,
  validateOnePieceSt01PromotionPlanV1,
} from "../../backend/pricing/one_piece_st01_canonical_promotion_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";
import { insertPayload } from "./one_piece_st01_canonical_promotion_rollback_canary_v1.mjs";
import {
  captureOnePieceSt01PreflightSnapshotV1,
  PLAN_PATH,
} from "./one_piece_st01_canonical_promotion_preflight_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "durable_apply_plan_v1",
  "apply_plan.json");
const DEFAULT_PREFLIGHT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "final_apply_preflight_v1",
  "summary.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "durable_apply_ready_v1");
const DEFAULT_APPLY_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_canonical_promotion_v1", "durable_apply_execution_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    mode: "plan", envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "", preflightSummary: DEFAULT_PREFLIGHT,
    outDir: null,
  };
  for (const argument of argv) {
    if (argument === "--apply") args.mode = "apply";
    else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--expected-head-sha=")) {
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
  args.outDir ??= args.mode === "apply" ? DEFAULT_APPLY_OUT : DEFAULT_OUT;
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

function mapCardRows(rows) {
  return rows.map((row) => ({
    id: row.id, game_id: row.game_id, set_id: row.set_id,
    set_code: row.set_code, name: row.name, number: row.number,
    variant_key: row.variant_key, rarity: row.rarity, gv_id: row.gv_id,
    tcgplayer_id: row.tcgplayer_id, external_ids: row.external_ids,
    identity_domain: row.identity_domain,
    print_identity_key: row.print_identity_key, image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    data_quality_flags: row.data_quality_flags, ai_metadata: row.ai_metadata,
  }));
}

export async function captureOnePieceSt01DurableReadbackV1(client, promotionPlan) {
  const targets = promotionPlan.payload.numbered_cards;
  const setId = promotionPlan.payload.set_row.id;
  const cardIds = targets.map((row) => row.card_print.id);
  const identityIds = targets.map((row) => row.identity.id);
  const evidenceIds = targets.map((row) => row.source_evidence.id);
  const productIds = targets.map((row) => String(row.source_product_id));
  const setRows = (await client.query(`select id::text,game,code,name,
    release_date::text,identity_domain_default,source
    from public.sets where id=$1::uuid order by id`, [setId])).rows;
  const cardRows = mapCardRows((await client.query(`select id::text,
    game_id::text,set_id::text,set_code,name,number,variant_key,rarity,gv_id,
    tcgplayer_id,external_ids,identity_domain,print_identity_key,image_url,
    image_alt_url,data_quality_flags,ai_metadata
    from public.card_prints where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`,
  [cardIds])).rows);
  const identityRows = (await client.query(`select id::text,
    card_print_id::text,identity_domain,set_code_identity,printed_number,
    normalized_printed_name,source_name_raw,identity_payload,
    identity_key_version,identity_key_hash,is_active
    from public.card_print_identity where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`, [identityIds])).rows;
  const evidenceRows = (await client.query(`select id::text,
    card_print_identity_id::text,card_print_id::text,acquisition_key,
    source_key,evidence_key_hash,evidence_subject,evidence_payload,active
    from public.card_print_identity_source_evidence where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`, [evidenceIds])).rows;
  const mappingRows = (await client.query(`select card_print_id::text,source,
    external_id,meta,active from public.external_mappings
    where source='tcgplayer' and external_id=any($1::text[])
    order by array_position($1::text[],external_id)`, [productIds])).rows;
  const releaseStatus = (await client.query(`select release_status
    from public.catalog_game_release_controls where game_code=$1`,
  [ONE_PIECE_GAME_CODE])).rows[0]?.release_status ?? null;
  const visibility = { release_status: releaseStatus };
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    const visible = (await client.query(
      "select public.catalog_game_visible_to_request_v1($1) as visible",
      [ONE_PIECE_GAME_CODE],
    )).rows[0]?.visible ?? null;
    visibility[role === "service_role" ? "service_visible" : `${role}_visible`] = visible;
  }
  return {
    set_rows: setRows,
    card_rows: cardRows,
    identity_rows: identityRows,
    evidence_rows: evidenceRows,
    mapping_rows: mappingRows,
    ...visibility,
  };
}

export async function captureFreshOnePieceSt01DurableReadbackV1(
  connectionString,
  promotionPlan,
  applicationName = "one-piece-st01-durable-readback-v1",
) {
  const client = new Client(clientOptions(connectionString, applicationName));
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const readback = await captureOnePieceSt01DurableReadbackV1(client, promotionPlan);
    await client.query("rollback");
    open = false;
    return readback;
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
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

async function executeDurableApply({ connectionString, promotionPlan, applyPlan }) {
  const freshSnapshot = await captureOnePieceSt01PreflightSnapshotV1(
    connectionString, promotionPlan, "one-piece-st01-apply-fresh-preflight-v1");
  const freshEvaluation = evaluateOnePieceSt01PromotionPreflightV1({
    plan: promotionPlan, snapshot: freshSnapshot,
  });
  if (!freshEvaluation.valid) {
    throw new Error(`Fresh apply preflight failed: ${freshEvaluation.findings.join(",")}`);
  }
  const client = new Client(clientOptions(
    connectionString, "one-piece-st01-durable-apply-v1"));
  await client.connect();
  let open = false;
  let committed = false;
  let transactionReadback = null;
  let writes = null;
  try {
    await client.query("begin");
    open = true;
    await client.query(`set local lock_timeout='${applyPlan.timeouts.lock_timeout}'`);
    await client.query(`set local statement_timeout='${applyPlan.timeouts.statement_timeout}'`);
    await client.query(`set local idle_in_transaction_session_timeout=` +
      `'${applyPlan.timeouts.idle_in_transaction_session_timeout}'`);
    await insertPayload(client, promotionPlan);
    transactionReadback = await captureOnePieceSt01DurableReadbackV1(
      client, promotionPlan);
    writes = await attributableWrites(client);
    const findings = [
      ...evaluateOnePieceSt01DurableReadbackV1({
        promotionPlan, readback: transactionReadback,
      }),
      ...evaluateOnePieceSt01AttributableWritesV1(writes),
    ];
    if (findings.length) throw new Error(findings.join(","));
    await client.query("commit");
    open = false;
    committed = true;
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    error.executionProof = { committed, freshSnapshot, transactionReadback,
      attributable_writes: writes };
    throw error;
  } finally {
    await client.end();
  }
  const durableReadback = await captureFreshOnePieceSt01DurableReadbackV1(
    connectionString, promotionPlan, "one-piece-st01-post-apply-readback-v1");
  const durableFindings = evaluateOnePieceSt01DurableReadbackV1({
    promotionPlan, readback: durableReadback,
  });
  if (durableFindings.length) {
    const error = new Error(`Fresh durable readback failed: ${durableFindings.join(",")}`);
    error.executionProof = { committed, freshSnapshot, transactionReadback,
      attributable_writes: writes, durableReadback };
    throw error;
  }
  return { committed, freshSnapshot, transactionReadback,
    attributable_writes: writes, durableReadback };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = {
    commit_sha: git("rev-parse", "HEAD"), branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (repository.commit_sha !== args.expectedHeadSha ||
      repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean durable-apply producer");
  }
  const [promotionBody, applyPlanBody, preflightBody] = await Promise.all([
    fs.readFile(PLAN_PATH, "utf8"), fs.readFile(APPLY_PLAN_PATH, "utf8"),
    fs.readFile(args.preflightSummary, "utf8"),
  ]);
  const promotionPlan = JSON.parse(promotionBody);
  const applyPlan = JSON.parse(applyPlanBody);
  const preflight = JSON.parse(preflightBody);
  const findings = [
    ...validateOnePieceSt01PromotionPlanV1(promotionPlan).findings,
    ...validateOnePieceSt01DurableApplyPlanV1(applyPlan, promotionPlan).findings,
    ...validateFreshPreflightForApplyV1({ preflight, promotionPlan }),
  ];
  if (findings.length) throw new Error(findings.join(","));
  const requiredApproval = requiredOnePieceSt01DurableApprovalV1({
    applyPlan, preflight,
  });
  if (args.mode === "apply" &&
      process.env[ONE_PIECE_ST01_DURABLE_APPROVAL_ENV] !== requiredApproval) {
    throw new Error(`Exact approval missing from ${ONE_PIECE_ST01_DURABLE_APPROVAL_ENV}`);
  }
  const runPlan = {
    version: ONE_PIECE_ST01_DURABLE_APPLY_VERSION,
    recorded_at: new Date().toISOString(), mode: args.mode, repository,
    promotion_plan_sha256: sha256(promotionBody),
    apply_plan_sha256: sha256(applyPlanBody),
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: applyPlan.payload_fingerprint_sha256,
    fresh_preflight_sha256: sha256(preflightBody),
    fresh_preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    required_approval_message: requiredApproval,
    boundaries: applyPlan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  let proof = null;
  if (args.mode === "apply") {
    dotenv.config({ path: args.envFile, quiet: true });
    const connectionString = marketEvidenceDbUrl();
    if (!connectionString) throw new Error("Production database URL is unavailable");
    try {
      proof = await executeDurableApply({ connectionString, promotionPlan, applyPlan });
    } catch (error) {
      await writeJson(path.join(args.outDir, "failure.json"), {
        recorded_at: new Date().toISOString(), error: error.message,
        execution_proof: error.executionProof ?? null,
      });
      throw error;
    }
  }
  const summary = {
    version: ONE_PIECE_ST01_DURABLE_APPLY_VERSION,
    recorded_at: new Date().toISOString(), mode: args.mode,
    status: args.mode === "plan"
      ? "durable_apply_ready_explicit_approval_required"
      : "durable_apply_committed_and_readback_passed",
    repository,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: applyPlan.payload_fingerprint_sha256,
    fresh_preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    required_approval_message: requiredApproval,
    committed: proof?.committed ?? false,
    transaction_readback: proof?.transactionReadback ?? null,
    apply_fresh_preflight_snapshot: proof?.freshSnapshot ?? null,
    attributable_writes: proof?.attributable_writes ?? [],
    durable_readback: proof?.durableReadback ?? null,
    findings: [], boundaries: applyPlan.boundaries,
  };
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece ST-01 Durable Apply ${args.mode === "plan" ? "Readiness" : "Result"} V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Apply-plan fingerprint: \`${summary.apply_plan_fingerprint_sha256}\`\n` +
    `- Fresh preflight fingerprint: \`${summary.fresh_preflight_fingerprint_sha256}\`\n` +
    `- Durable transaction committed: \`${summary.committed}\`\n\n` +
    `## Required Approval\n\n\`\`\`text\n${requiredApproval}\n\`\`\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [["run_plan.json", runPlanBody], ["summary.json", summaryBody],
      ["REPORT.md", reportBody]].map(([artifactPath, body]) => ({
      path: artifactPath, sha256: sha256(body),
    })),
  });
  process.stdout.write(`${JSON.stringify({ status: summary.status,
    apply_plan_fingerprint_sha256: summary.apply_plan_fingerprint_sha256,
    fresh_preflight_fingerprint_sha256: summary.fresh_preflight_fingerprint_sha256,
    committed: summary.committed,
    out_dir: path.relative(ROOT, args.outDir).replaceAll("\\", "/") }, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { APPLY_PLAN_PATH, executeDurableApply, parseArgs };
