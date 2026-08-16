import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import pg from "pg";

import {
  ONE_PIECE_COMPLETE_DON_APPLY_VERSION,
  ONE_PIECE_COMPLETE_DON_PREFLIGHT_VERSION,
  ONE_PIECE_COMPLETE_DON_REQUIRED_SCHEMA,
  buildOnePieceCompleteDonApplyPlanV1,
  buildOnePieceCompleteDonPreflightFingerprintV1,
  evaluateOnePieceCompleteDonPreflightV1,
  evaluateOnePieceCompleteDonReadbackV1,
  evaluateOnePieceCompleteDonWritesV1,
  onePieceCompleteDonGlobalPostApplyExpectedV1,
  selectOnePieceCompleteDonCanaryV1,
  summarizeOnePieceCompleteDonReadbackV1,
  validateOnePieceCompleteDonApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_don_canonical_gate_v1.mjs";
import {
  validateOnePieceCompleteDonPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_don_canonical_v1.mjs";
import { sha256, stableJson } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT = path.join(ROOT, "docs", "audits", "pricing");
const PLAN_PATH = path.join(AUDIT, "one_piece_complete_don_canonical_v1",
  "frozen_plan_v1", "promotion_plan.json.gz");
const PREFLIGHT_DIR = path.join(AUDIT,
  "one_piece_complete_don_canonical_preflight_v1", "production_read_only_v1");
const CANARY_DIR = path.join(AUDIT,
  "one_piece_complete_don_canonical_rollback_canary_v1", "production_rollback_v1");
const APPLY_PLAN_DIR = path.join(AUDIT,
  "one_piece_complete_don_canonical_apply_v1", "frozen_apply_plan_v1");
const APPLY_DIR = path.join(AUDIT,
  "one_piece_complete_don_canonical_apply_v1", "durable_apply_v1");
const VERIFY_DIR = path.join(AUDIT,
  "one_piece_complete_don_canonical_apply_v1", "independent_post_apply_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

export function parseArgs(argv) {
  const args = { mode: "", expectedHeadSha: "", expectedApplyPlanFingerprint: "",
    expectedPayloadFingerprint: "", outDir: "" };
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) args.mode = arg.slice(7);
    else if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).toLowerCase();
    } else if (arg.startsWith("--expected-apply-plan-fingerprint=")) {
      args.expectedApplyPlanFingerprint = arg.slice(34).toLowerCase();
    } else if (arg.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = arg.slice(31).toLowerCase();
    } else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!["preflight", "canary", "apply-plan", "apply", "verify"].includes(args.mode)) {
    throw new Error("--mode=preflight|canary|apply-plan|apply|verify is required");
  }
  if (["preflight", "canary", "apply", "verify"].includes(args.mode) &&
      !/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (args.mode === "apply") {
    if (!/^[0-9a-f]{64}$/.test(args.expectedApplyPlanFingerprint) ||
        !/^[0-9a-f]{64}$/.test(args.expectedPayloadFingerprint)) {
      throw new Error("exact apply-plan and payload fingerprints are required");
    }
  }
  return args;
}

function repository() {
  return {
    commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
}

function assertRepository(args, repo) {
  if (repo.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repo.tracked_worktree_clean ||
      (args.expectedHeadSha && repo.commit_sha !== args.expectedHeadSha)) {
    throw new Error("Repository is not the exact clean DON gate producer");
  }
}

async function readPlan() {
  const plan = JSON.parse(gunzipSync(await fs.readFile(PLAN_PATH)));
  const validation = validateOnePieceCompleteDonPromotionPlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  return plan;
}

function connectionString() {
  const value = process.env.SUPABASE_DB_URL;
  if (!value) throw new Error("SUPABASE_DB_URL is required");
  return value;
}

function clientOptions(label) {
  const value = connectionString();
  return { connectionString: value, ssl: pgSslConfig(value),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: label };
}

function normalizeNumbers(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function captureFoundation(client) {
  const row = normalizeNumbers((await client.query(`select
    (select count(*)::int from public.games where code='one_piece') as game_count,
    (select id::text from public.games where code='one_piece') as game_id,
    (select count(*)::int from public.catalog_game_release_controls
      where game_code='one_piece') as release_count,
    (select release_status from public.catalog_game_release_controls
      where game_code='one_piece') as release_status`)).rows[0]);
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    row[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return row;
}

async function captureBaseline(client) {
  return normalizeNumbers((await client.query(`select
    (select count(*)::int from public.sets where game='one_piece') as sets,
    (select count(*)::int from public.card_prints where game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_prints,
    (select count(*)::int from public.card_print_identity i join public.card_prints c
      on c.id=i.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_print_identity,
    (select count(*)::int from public.card_print_identity_source_evidence e
      join public.card_prints c on c.id=e.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid)
      as card_print_identity_source_evidence,
    (select count(*)::int from public.external_mappings e join public.card_prints c
      on c.id=e.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as external_mappings,
    (select count(*)::int from public.card_printings p join public.card_prints c
      on c.id=p.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid) as card_printings,
    (select count(*)::int from public.external_printing_mappings e
      join public.card_printings p on p.id=e.card_printing_id
      join public.card_prints c on c.id=p.card_print_id where c.game_id=
      '4f504300-0000-4000-8000-000000000001'::uuid)
      as external_printing_mappings`)).rows[0]);
}

async function captureSchema(client) {
  const result = {};
  for (const table of ONE_PIECE_COMPLETE_DON_REQUIRED_SCHEMA) {
    result[table] = (await client.query(
      "select to_regclass($1) is not null as present", [`public.${table}`],
    )).rows[0]?.present === true;
  }
  return result;
}

async function captureStaging(client, plan) {
  const ids = plan.payload.don_cards.map((row) => row.staging.staging_row_id);
  return (await client.query(`select id::text,batch_id::text,
    source_product_id::bigint,source_group_id::bigint,record_class,
    single_card_kind,language_key,promotion_state,payload_sha256,
    payload->>'source_payload_hash' as source_payload_hash
    from public.one_piece_canonical_import_rows where id=any($1::uuid[])
    order by source_product_id`, [ids])).rows.map((row) => ({
    ...row, source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
  }));
}

async function captureCollisions(client, plan) {
  const sets = plan.payload.set_rows;
  const rows = plan.payload.don_cards;
  return normalizeNumbers((await client.query(`select
    (select count(*)::int from public.sets where id=any($1::uuid[])) as set_ids,
    (select count(*)::int from public.sets where game='one_piece'
      and code=any($2::text[])) as set_codes,
    (select count(*)::int from public.card_prints where id=any($3::uuid[]))
      as card_print_ids,
    (select count(*)::int from public.card_prints where gv_id=any($4::text[]))
      as card_print_gv_ids,
    (select count(*)::int from public.card_prints where tcgplayer_id=any($5::text[]))
      as card_print_tcgplayer_ids,
    (select count(*)::int from public.card_prints
      where external_ids->>'tcgplayer'=any($5::text[])) as card_external_ids,
    (select count(*)::int from public.card_print_identity where id=any($6::uuid[]))
      as identity_ids,
    (select count(*)::int from public.card_print_identity
      where identity_domain='one_piece_eng_print'
      and identity_key_hash=any($7::text[])) as identity_hashes,
    (select count(*)::int from public.card_print_identity
      where card_print_id=any($3::uuid[])) as identity_card_print_ids,
    (select count(*)::int from public.card_print_identity_source_evidence
      where id=any($8::uuid[])) as evidence_ids,
    (select count(*)::int from public.card_print_identity_source_evidence
      where evidence_key_hash=any($9::text[])) as evidence_hashes,
    (select count(*)::int from public.card_print_identity_source_evidence
      where acquisition_key=any($10::text[])) as evidence_acquisition_keys,
    (select count(*)::int from public.external_mappings
      where source='tcgplayer' and external_id=any($5::text[])) as external_mappings`, [
    sets.map((row) => row.id), sets.map((row) => row.code),
    rows.map((row) => row.card_print.id), rows.map((row) => row.card_print.gv_id),
    rows.map((row) => row.external_mapping.external_id),
    rows.map((row) => row.identity.id), rows.map((row) => row.identity.identity_key_hash),
    rows.map((row) => row.source_evidence.id),
    rows.map((row) => row.source_evidence.evidence_key_hash),
    rows.map((row) => row.source_evidence.acquisition_key),
  ])).rows[0]);
}

async function capturePreflight(plan) {
  const client = new Client(clientOptions("one-piece-complete-don-preflight-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    await client.query("set local lock_timeout='5s'");
    const result = {
      transaction_read_only: (await client.query("show transaction_read_only"))
        .rows[0]?.transaction_read_only === "on",
      foundation: await captureFoundation(client),
      baseline: await captureBaseline(client),
      schema: await captureSchema(client),
      staging_rows: await captureStaging(client, plan),
      collisions: await captureCollisions(client, plan),
      blocking_pids: (await client.query(
        "select pg_blocking_pids(pg_backend_pid()) as pids",
      )).rows[0]?.pids ?? [],
    };
    await client.query("rollback");
    return result;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function insertSet(client, row) {
  await client.query(`insert into public.sets
    (id,game,code,name,release_date,source,identity_domain_default)
    values ($1,$2,$3,$4,$5,$6,$7)`, [row.id, row.game, row.code, row.name,
    row.release_date, row.source, row.identity_domain_default]);
}

async function insertRows(client, rows) {
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

async function captureReadback(client, plan) {
  const sets = plan.payload.set_rows;
  const rows = plan.payload.don_cards;
  const setRows = (await client.query(`select id::text,game,code,name,
    release_date::text,identity_domain_default,source from public.sets
    where id=any($1::uuid[]) order by array_position($1::uuid[],id)`,
  [sets.map((row) => row.id)])).rows;
  const cardRows = (await client.query(`select id::text,game_id::text,set_id::text,
    set_code,name,number,variant_key,rarity,gv_id,tcgplayer_id,external_ids,
    identity_domain,print_identity_key,image_url,image_alt_url,data_quality_flags,
    ai_metadata from public.card_prints where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`,
  [rows.map((row) => row.card_print.id)])).rows;
  const identityRows = (await client.query(`select id::text,card_print_id::text,
    identity_domain,set_code_identity,printed_number,normalized_printed_name,
    source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active
    from public.card_print_identity where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`,
  [rows.map((row) => row.identity.id)])).rows;
  const evidenceRows = (await client.query(`select id::text,
    card_print_identity_id::text,card_print_id::text,acquisition_key,source_key,
    evidence_key_hash,evidence_subject,evidence_payload,active
    from public.card_print_identity_source_evidence where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`,
  [rows.map((row) => row.source_evidence.id)])).rows;
  const products = rows.map((row) => row.external_mapping.external_id);
  const mappingRows = (await client.query(`select card_print_id::text,source,
    external_id,meta,active from public.external_mappings
    where source='tcgplayer' and external_id=any($1::text[])
    order by array_position($1::text[],external_id)`, [products])).rows;
  const result = { set_rows: setRows, card_rows: cardRows,
    identity_rows: identityRows, evidence_rows: evidenceRows,
    mapping_rows: mappingRows,
    release_status: (await client.query(`select release_status from
      public.catalog_game_release_controls where game_code='one_piece'`))
      .rows[0]?.release_status ?? null };
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    result[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return result;
}

async function captureFreshReadback(plan) {
  const client = new Client(clientOptions("one-piece-complete-don-readback-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const result = await captureReadback(client, plan);
    await client.query("rollback");
    return result;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function writeArtifacts(outDir, artifacts) {
  await fs.mkdir(outDir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(artifacts)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(outDir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(outDir, name), body);
    hashes[name] = sha256(body);
  }
  await writeJson(path.join(outDir, "artifact_hashes.json"), hashes);
}

async function runPreflight(args, repo, plan) {
  const snapshot = await capturePreflight(plan);
  const evaluation = evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot });
  const fingerprint = buildOnePieceCompleteDonPreflightFingerprintV1({
    plan, snapshot,
  });
  const summary = { version: ONE_PIECE_COMPLETE_DON_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "production_read_only_preflight_passed" :
      "production_read_only_preflight_failed",
    repository: repo, plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: fingerprint,
    baseline: snapshot.baseline, collision_counts: snapshot.collisions,
    staging_row_count: snapshot.staging_rows.length,
    findings: evaluation.findings,
    boundaries: { transaction_read_only: true, database_writes: 0 },
  };
  const report = `# One Piece DON Production Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n- Staging rows: \`${summary.staging_row_count}\`\n` +
    `- Preflight fingerprint: \`${fingerprint}\`\n` +
    `- Findings: \`${summary.findings.length}\`\n- Database writes: zero\n`;
  await writeArtifacts(args.outDir || PREFLIGHT_DIR, {
    "summary.json": summary, "production_readback.json": snapshot,
    "REPORT.md": report,
  });
  if (!evaluation.valid) throw new Error(evaluation.findings.join(","));
  return summary;
}

async function runCanary(args, repo, plan) {
  const preflightBody = await fs.readFile(path.join(PREFLIGHT_DIR, "summary.json"));
  const preflight = JSON.parse(preflightBody);
  if (preflight.status !== "production_read_only_preflight_passed" ||
      preflight.plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256) {
    throw new Error("DON preflight is not canary eligible");
  }
  const before = await capturePreflight(plan);
  const beforeEval = evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot: before });
  if (!beforeEval.valid) throw new Error(beforeEval.findings.join(","));
  const sample = selectOnePieceCompleteDonCanaryV1(plan);
  const samplePlan = { payload: { set_rows: [sample.set_row],
    don_cards: sample.don_cards } };
  const client = new Client(clientOptions("one-piece-complete-don-canary-v1"));
  await client.connect();
  let proof;
  try {
    await client.query("begin");
    await client.query("set local lock_timeout='5s'");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_complete_don_canonical_canary_v1"]);
    await insertSet(client, sample.set_row);
    await insertRows(client, sample.don_cards);
    const readback = await captureReadback(client, samplePlan);
    const writes = await attributableWrites(client);
    const findings = [
      ...evaluateOnePieceCompleteDonReadbackV1({ plan: samplePlan, readback }),
      ...evaluateOnePieceCompleteDonWritesV1(writes, true),
    ];
    await client.query("rollback");
    proof = { sample_source_product_ids: sample.don_cards.map((row) =>
      row.source_product_id), transaction_readback:
      summarizeOnePieceCompleteDonReadbackV1(readback),
      attributable_writes: writes, findings, rolled_back: true };
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
  const after = await capturePreflight(plan);
  const afterEval = evaluateOnePieceCompleteDonPreflightV1({ plan, snapshot: after });
  const findings = [...(proof?.findings ?? []), ...afterEval.findings];
  const canaryFingerprint = sha256(stableJson({ plan: plan.plan_fingerprint_sha256,
    preflight: preflight.preflight_fingerprint_sha256, proof, after }));
  const summary = { version: "ONE_PIECE_COMPLETE_DON_ROLLBACK_CANARY_V1",
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "production_rollback_canary_passed" :
      "production_rollback_canary_failed",
    repository: repo, plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    canary_fingerprint_sha256: canaryFingerprint,
    sample_source_product_ids: proof.sample_source_product_ids,
    rolled_back: true, post_rollback_zero_residue: afterEval.valid,
    findings, boundaries: { committed: false, durable_database_writes: 0,
      updates: 0, deletes: 0 } };
  const report = `# One Piece DON Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n- Sample rows: \`5\`\n` +
    `- Rolled back: \`true\`\n- Zero residue: \`${afterEval.valid}\`\n` +
    `- Canary fingerprint: \`${canaryFingerprint}\`\n`;
  await writeArtifacts(args.outDir || CANARY_DIR, { "summary.json": summary,
    "transaction_proof.json": proof, "post_rollback_readback.json": after,
    "REPORT.md": report });
  if (findings.length) throw new Error(findings.join(","));
  return summary;
}

async function runApplyPlan(args, repo, plan) {
  const [preflightBody, canaryBody] = await Promise.all([
    fs.readFile(path.join(PREFLIGHT_DIR, "summary.json")),
    fs.readFile(path.join(CANARY_DIR, "summary.json")),
  ]);
  const applyPlan = buildOnePieceCompleteDonApplyPlanV1({ repository: repo,
    promotionPlan: plan, preflightSummary: JSON.parse(preflightBody),
    canarySummary: JSON.parse(canaryBody), proofHashes: {
      preflight_summary_sha256: sha256(preflightBody),
      canary_summary_sha256: sha256(canaryBody),
    } });
  const validation = validateOnePieceCompleteDonApplyPlanV1(applyPlan, plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  const summary = { version: applyPlan.version, recorded_at: new Date().toISOString(),
    status: "frozen_don_apply_plan_passed_no_writes", repository: repo,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    target_binding: applyPlan.target_binding, findings: [],
    exact_next_gate: "durable hidden insert-only DON apply" };
  const report = `# One Piece DON Frozen Apply Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Apply-plan fingerprint: \`${applyPlan.apply_plan_fingerprint_sha256}\`\n` +
    `- Payload fingerprint: \`${plan.payload_fingerprint_sha256}\`\n`;
  await writeArtifacts(args.outDir || APPLY_PLAN_DIR, {
    "apply_plan.json": applyPlan, "summary.json": summary, "REPORT.md": report,
  });
  return summary;
}

async function executeApply(plan, applyPlan) {
  const freshPreflight = await capturePreflight(plan);
  const preflightEval = evaluateOnePieceCompleteDonPreflightV1({
    plan, snapshot: freshPreflight,
  });
  if (!preflightEval.valid) throw new Error(
    `Fresh apply preflight failed: ${preflightEval.findings.join(",")}`);
  const client = new Client(clientOptions("one-piece-complete-don-apply-v1"));
  await client.connect();
  let committed = false;
  let transactionReadback;
  let writes;
  try {
    await client.query("begin");
    await client.query(`set local lock_timeout='${applyPlan.execution.lock_timeout}'`);
    await client.query(`set local statement_timeout='${applyPlan.execution.statement_timeout}'`);
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      [applyPlan.execution.advisory_lock_key]);
    await insertSet(client, plan.payload.set_rows[0]);
    for (let index = 0; index < plan.payload.don_cards.length;
      index += applyPlan.execution.chunk_size) {
      await insertRows(client, plan.payload.don_cards.slice(index,
        index + applyPlan.execution.chunk_size));
    }
    transactionReadback = await captureReadback(client, plan);
    writes = await attributableWrites(client);
    const findings = [...evaluateOnePieceCompleteDonReadbackV1({
      plan, readback: transactionReadback }),
    ...evaluateOnePieceCompleteDonWritesV1(writes)];
    if (findings.length) throw new Error(findings.join(","));
    await client.query("commit");
    committed = true;
  } catch (error) {
    if (!committed) await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const durableReadback = await captureFreshReadback(plan);
  const durableFindings = evaluateOnePieceCompleteDonReadbackV1({
    plan, readback: durableReadback,
  });
  if (durableFindings.length) throw new Error(durableFindings.join(","));
  return { committed, freshPreflight, transactionReadback, writes,
    durableReadback };
}

async function runApply(args, repo, plan) {
  const applyPlan = JSON.parse(await fs.readFile(
    path.join(APPLY_PLAN_DIR, "apply_plan.json"), "utf8"));
  const validation = validateOnePieceCompleteDonApplyPlanV1(applyPlan, plan);
  if (!validation.valid || applyPlan.apply_plan_fingerprint_sha256 !==
      args.expectedApplyPlanFingerprint || plan.payload_fingerprint_sha256 !==
      args.expectedPayloadFingerprint) {
    throw new Error("Exact DON durable-apply authorization does not match");
  }
  const execution = await executeApply(plan, applyPlan);
  const summary = { version: ONE_PIECE_COMPLETE_DON_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: "durable_apply_committed_and_readback_passed", repository: repo,
    committed: execution.committed,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    attributable_writes: execution.writes,
    transaction_readback:
      summarizeOnePieceCompleteDonReadbackV1(execution.transactionReadback),
    durable_readback:
      summarizeOnePieceCompleteDonReadbackV1(execution.durableReadback),
    findings: [], boundaries: { durable_database_transaction_committed: true,
      updates: 0, deletes: 0, child_printing_writes: 0, sealed_writes: 0,
      storage_writes: 0, image_pointer_writes: 0, pricing_writes: 0,
      publication_writes: 0, vault_writes: 0, app_visibility_enabled: false } };
  const report = `# One Piece DON Durable Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n- DON parents: \`222\`\n` +
    `- Transaction committed: \`true\`\n- Fresh readback: \`passed\`\n` +
    `- Visibility: \`hidden\`\n`;
  await writeArtifacts(args.outDir || APPLY_DIR, { "summary.json": summary,
    "attributable_writes.json": execution.writes,
    "transaction_readback.json": execution.transactionReadback,
    "durable_readback.json": execution.durableReadback, "REPORT.md": report });
  return summary;
}

async function captureGlobalPostApply() {
  const client = new Client(clientOptions("one-piece-complete-don-verify-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const baseline = await captureBaseline(client);
    const extra = normalizeNumbers((await client.query(`select
      (select count(*)::int from public.sets where game='one_piece'
        and code='DON') as don_set_rows,
      (select count(*)::int from public.card_prints where game_id=
        '4f504300-0000-4000-8000-000000000001'::uuid and set_code='DON')
        as don_card_rows,
      (select count(*)::int from public.card_printings p join public.card_prints c
        on c.id=p.card_print_id where c.game_id=
        '4f504300-0000-4000-8000-000000000001'::uuid and c.set_code='DON')
        as don_child_printings`)).rows[0]);
    const foundation = await captureFoundation(client);
    await client.query("rollback");
    return { ...baseline, ...extra, release_status: foundation.release_status,
      anon_visible: foundation.anon_visible,
      authenticated_visible: foundation.authenticated_visible,
      service_role_visible: foundation.service_role_visible };
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function runVerify(args, repo, plan) {
  const [readback, globalReadback] = await Promise.all([
    captureFreshReadback(plan), captureGlobalPostApply(),
  ]);
  const findings = evaluateOnePieceCompleteDonReadbackV1({ plan, readback });
  if (stableJson(globalReadback) !==
      stableJson(onePieceCompleteDonGlobalPostApplyExpectedV1())) {
    findings.push("global_readback_mismatch");
  }
  const summary = { version: "ONE_PIECE_COMPLETE_DON_POST_APPLY_V1",
    recorded_at: new Date().toISOString(),
    status: findings.length === 0 ? "don_apply_independently_verified" :
      "don_apply_independent_verification_failed",
    repository: repo, transaction_read_only: true,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    readback: summarizeOnePieceCompleteDonReadbackV1(readback),
    global_readback: globalReadback, findings,
    exact_next_gate: "One Piece sealed-product candidate warehouse apply" };
  const report = `# One Piece DON Independent Post-Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n- Read-only: \`true\`\n` +
    `- DON parents: \`${globalReadback.don_card_rows}\`\n` +
    `- Visibility: \`${globalReadback.release_status}\`\n`;
  await writeArtifacts(args.outDir || VERIFY_DIR, { "summary.json": summary,
    "readback.json": readback, "global_readback.json": globalReadback,
    "REPORT.md": report });
  if (findings.length) throw new Error(findings.join(","));
  return summary;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository();
  assertRepository(args, repo);
  const plan = await readPlan();
  let summary;
  if (args.mode === "preflight") summary = await runPreflight(args, repo, plan);
  else if (args.mode === "canary") summary = await runCanary(args, repo, plan);
  else if (args.mode === "apply-plan") summary = await runApplyPlan(args, repo, plan);
  else if (args.mode === "apply") summary = await runApply(args, repo, plan);
  else summary = await runVerify(args, repo, plan);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
