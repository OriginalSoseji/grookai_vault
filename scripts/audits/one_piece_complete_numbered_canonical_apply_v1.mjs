import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_COMPLETE_NUMBERED_APPLY_VERSION,
  evaluateOnePieceCompleteNumberedAttributableWritesV1,
  evaluateOnePieceCompleteNumberedDurableReadbackV1,
  summarizeOnePieceCompleteNumberedDurableReadbackV1,
  validateOnePieceCompleteNumberedApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_apply_v1.mjs";
import {
  evaluateOnePieceCompleteNumberedPreflightV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_preflight_v1.mjs";
import {
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256 } from
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
const APPLY_PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_apply_v1", "frozen_apply_plan_v1",
  "apply_plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_apply_v1", "durable_apply_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = {
    apply: false,
    expectedHeadSha: "",
    expectedApplyPlanFingerprint: "",
    expectedPayloadFingerprint: "",
    envFile: "C:\\grookai_vault\\.env.local",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument === "--apply") args.apply = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-apply-plan-fingerprint=")) {
      args.expectedApplyPlanFingerprint = argument.slice(34).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.apply) throw new Error("--apply is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  for (const [label, value] of [["apply-plan", args.expectedApplyPlanFingerprint],
    ["payload", args.expectedPayloadFingerprint]]) {
    if (!/^[0-9a-f]{64}$/.test(value)) {
      throw new Error(`--expected-${label}-fingerprint=<64-character SHA> is required`);
    }
  }
  return args;
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body, "utf8");
}

function clientOptions(connectionString, applicationName) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: applicationName,
  };
}

function chunks(rows, size) {
  const result = [];
  for (let index = 0; index < rows.length; index += size) {
    result.push(rows.slice(index, index + size));
  }
  return result;
}

async function insertSets(client, rows) {
  await client.query(`insert into public.sets
    (id,game,code,name,release_date,source,identity_domain_default)
    select x.id,x.game,x.code,x.name,x.release_date,x.source,
      x.identity_domain_default from jsonb_to_recordset($1::jsonb) as x(
      id uuid,game text,code text,name text,release_date date,source jsonb,
      identity_domain_default text)`, [JSON.stringify(rows)]);
}

async function insertChunk(client, rows) {
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

function mapCardRows(rows) {
  return rows.map((row) => ({
    id: row.id,
    game_id: row.game_id,
    set_id: row.set_id,
    set_code: row.set_code,
    name: row.name,
    number: row.number,
    variant_key: row.variant_key,
    rarity: row.rarity,
    gv_id: row.gv_id,
    tcgplayer_id: row.tcgplayer_id,
    external_ids: row.external_ids,
    identity_domain: row.identity_domain,
    print_identity_key: row.print_identity_key,
    image_url: row.image_url,
    image_alt_url: row.image_alt_url,
    data_quality_flags: row.data_quality_flags,
    ai_metadata: row.ai_metadata,
  }));
}

export async function captureOnePieceCompleteNumberedDurableReadbackV1(
  client,
  promotionPlan,
) {
  const sets = promotionPlan.payload.set_rows;
  const rows = promotionPlan.payload.numbered_cards;
  const setIds = sets.map((row) => row.id);
  const cardIds = rows.map((row) => row.card_print.id);
  const identityIds = rows.map((row) => row.identity.id);
  const evidenceIds = rows.map((row) => row.source_evidence.id);
  const products = rows.map((row) => row.external_mapping.external_id);
  const setRows = (await client.query(`select id::text,game,code,name,
    release_date::text,identity_domain_default,source from public.sets
    where id=any($1::uuid[]) order by array_position($1::uuid[],id)`,
  [setIds])).rows;
  const cardRows = mapCardRows((await client.query(`select id::text,
    game_id::text,set_id::text,set_code,name,number,variant_key,rarity,gv_id,
    tcgplayer_id,external_ids,identity_domain,print_identity_key,image_url,
    image_alt_url,data_quality_flags,ai_metadata from public.card_prints
    where id=any($1::uuid[]) order by array_position($1::uuid[],id)`,
  [cardIds])).rows);
  const identityRows = (await client.query(`select id::text,
    card_print_id::text,identity_domain,set_code_identity,printed_number,
    normalized_printed_name,source_name_raw,identity_payload,
    identity_key_version,identity_key_hash,is_active
    from public.card_print_identity where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`, [identityIds])).rows;
  const evidenceRows = (await client.query(`select id::text,
    card_print_identity_id::text,card_print_id::text,acquisition_key,source_key,
    evidence_key_hash,evidence_subject,evidence_payload,active
    from public.card_print_identity_source_evidence where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`, [evidenceIds])).rows;
  const mappingRows = (await client.query(`select card_print_id::text,source,
    external_id,meta,active from public.external_mappings
    where source='tcgplayer' and external_id=any($1::text[])
    order by array_position($1::text[],external_id)`, [products])).rows;
  const result = {
    set_rows: setRows,
    card_rows: cardRows,
    identity_rows: identityRows,
    evidence_rows: evidenceRows,
    mapping_rows: mappingRows,
    release_status: (await client.query(`select release_status
      from public.catalog_game_release_controls where game_code='one_piece'`))
      .rows[0]?.release_status ?? null,
  };
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    result[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return result;
}

async function captureFreshReadback(connectionString, promotionPlan) {
  const client = new Client(clientOptions(connectionString,
    "one-piece-complete-numbered-post-apply-readback-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const readback = await captureOnePieceCompleteNumberedDurableReadbackV1(
      client, promotionPlan);
    await client.query("rollback");
    return readback;
  } finally {
    await client.query("rollback").catch(() => {});
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

export async function executeOnePieceCompleteNumberedDurableApplyV1({
  connectionString,
  promotionPlan,
  applyPlan,
}) {
  const freshPreflight = await captureOnePieceCompleteNumberedPreflightV1(
    connectionString, promotionPlan);
  const preflightEvaluation = evaluateOnePieceCompleteNumberedPreflightV1({
    plan: promotionPlan,
    snapshot: freshPreflight,
  });
  if (!preflightEvaluation.valid) {
    throw new Error(`Fresh apply preflight failed: ${preflightEvaluation.findings.join(",")}`);
  }
  const client = new Client(clientOptions(connectionString,
    "one-piece-complete-numbered-durable-apply-v1"));
  await client.connect();
  let open = false;
  let committed = false;
  let transactionReadback = null;
  let writes = null;
  try {
    await client.query("begin");
    open = true;
    await client.query(`set local lock_timeout='${applyPlan.execution.lock_timeout}'`);
    await client.query(`set local statement_timeout='${applyPlan.execution.statement_timeout}'`);
    await client.query(`set local idle_in_transaction_session_timeout=` +
      `'${applyPlan.execution.idle_in_transaction_session_timeout}'`);
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1,0))",
      [applyPlan.execution.advisory_lock_key],
    );
    await insertSets(client, promotionPlan.payload.set_rows);
    for (const chunk of chunks(promotionPlan.payload.numbered_cards,
      applyPlan.execution.chunk_size)) {
      await insertChunk(client, chunk);
    }
    transactionReadback = await captureOnePieceCompleteNumberedDurableReadbackV1(
      client, promotionPlan);
    writes = await attributableWrites(client);
    const findings = [
      ...evaluateOnePieceCompleteNumberedDurableReadbackV1({
        promotionPlan,
        readback: transactionReadback,
      }),
      ...evaluateOnePieceCompleteNumberedAttributableWritesV1(writes),
    ];
    if (findings.length) throw new Error(findings.join(","));
    await client.query("commit");
    open = false;
    committed = true;
  } catch (error) {
    if (open) await client.query("rollback").catch(() => {});
    error.executionProof = {
      committed,
      fresh_preflight: freshPreflight,
      transaction_readback: transactionReadback,
      attributable_writes: writes,
    };
    throw error;
  } finally {
    await client.end();
  }
  const durableReadback = await captureFreshReadback(
    connectionString, promotionPlan);
  const durableFindings = evaluateOnePieceCompleteNumberedDurableReadbackV1({
    promotionPlan,
    readback: durableReadback,
  });
  if (durableFindings.length) {
    const error = new Error(`Fresh durable readback failed: ${durableFindings.join(",")}`);
    error.executionProof = { committed, fresh_preflight: freshPreflight,
      transaction_readback: transactionReadback, attributable_writes: writes,
      durable_readback: durableReadback };
    throw error;
  }
  return { committed, freshPreflight, transactionReadback,
    attributableWrites: writes, durableReadback };
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
    throw new Error("Repository is not the exact clean durable-apply producer");
  }
  const [planCompressed, applyPlanBody] = await Promise.all([
    fs.readFile(PLAN_PATH),
    fs.readFile(APPLY_PLAN_PATH),
  ]);
  const promotionPlan = JSON.parse(gunzipSync(planCompressed));
  const applyPlan = JSON.parse(applyPlanBody);
  const findings = [
    ...validateOnePieceCompleteNumberedPromotionPlanV1(promotionPlan).findings,
    ...validateOnePieceCompleteNumberedApplyPlanV1(
      applyPlan, promotionPlan).findings,
  ];
  if (findings.length ||
      args.expectedApplyPlanFingerprint !==
      applyPlan.apply_plan_fingerprint_sha256 ||
      args.expectedPayloadFingerprint !== applyPlan.payload_fingerprint_sha256) {
    throw new Error("Frozen apply plan, payload, or execution fingerprints changed");
  }
  const runPlan = {
    version: ONE_PIECE_COMPLETE_NUMBERED_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    mode: "apply",
    promotion_plan_gzip_sha256: sha256(planCompressed),
    apply_plan_sha256: sha256(applyPlanBody),
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: applyPlan.payload_fingerprint_sha256,
    target_binding: applyPlan.target_binding,
    execution: applyPlan.execution,
    boundaries: applyPlan.boundaries,
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const artifacts = {};
  artifacts["run_plan.json"] = await writeJson(
    path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  let proof;
  try {
    proof = await executeOnePieceCompleteNumberedDurableApplyV1({
      connectionString,
      promotionPlan,
      applyPlan,
    });
  } catch (error) {
    const execution = error.executionProof ?? null;
    await writeJson(path.join(args.outDir, "failure.json"), {
      recorded_at: new Date().toISOString(),
      error: error.message,
      committed: execution?.committed ?? false,
      fresh_preflight: execution?.fresh_preflight ? {
        baseline: execution.fresh_preflight.baseline,
        collisions: execution.fresh_preflight.collisions,
      } : null,
      transaction_readback: execution?.transaction_readback
        ? summarizeOnePieceCompleteNumberedDurableReadbackV1(
          execution.transaction_readback) : null,
      attributable_writes: execution?.attributable_writes ?? [],
      durable_readback: execution?.durable_readback
        ? summarizeOnePieceCompleteNumberedDurableReadbackV1(
          execution.durable_readback) : null,
    });
    throw error;
  }
  const summary = {
    version: ONE_PIECE_COMPLETE_NUMBERED_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: "durable_apply_committed_and_readback_passed",
    repository,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: applyPlan.payload_fingerprint_sha256,
    committed: proof.committed,
    fresh_preflight: {
      baseline: proof.freshPreflight.baseline,
      collisions: proof.freshPreflight.collisions,
    },
    transaction_readback:
      summarizeOnePieceCompleteNumberedDurableReadbackV1(
        proof.transactionReadback),
    attributable_writes: proof.attributableWrites,
    durable_readback:
      summarizeOnePieceCompleteNumberedDurableReadbackV1(proof.durableReadback),
    findings: [],
    boundaries: applyPlan.boundaries,
    exact_next_gate: "run an independent fresh read-only post-apply verification",
  };
  artifacts["summary.json"] = await writeJson(
    path.join(args.outDir, "summary.json"), summary);
  artifacts["attributable_writes.json"] = await writeJson(
    path.join(args.outDir, "attributable_writes.json"),
    proof.attributableWrites);
  const report = `# Complete One Piece Numbered Canonical Durable Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Producer commit: \`${repository.commit_sha}\`\n` +
    `- Set/card/identity/evidence/mapping inserts: \`58 / 6491 / 6491 / 6491 / 6491\`\n` +
    `- Updates/deletes/children/DON/sealed/Storage/images/pricing/publication/Vault: \`0\`\n` +
    `- Hidden for anon/authenticated/service role: \`true\`\n` +
    `- Fresh durable readback: \`passed\`\n`;
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
      { path: path.relative(ROOT, APPLY_PLAN_PATH).replaceAll("\\", "/"),
        sha256: sha256(applyPlanBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { APPLY_PLAN_PATH, PLAN_PATH };
