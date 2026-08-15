import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import pg from "pg";

import {
  ONE_PIECE_COMPLETE_SEALED_APPLY_VERSION,
  ONE_PIECE_COMPLETE_SEALED_PREFLIGHT_VERSION,
  ONE_PIECE_COMPLETE_SEALED_TABLES,
  buildOnePieceCompleteSealedApplyPlanV1,
  buildOnePieceCompleteSealedPreflightFingerprintV1,
  evaluateOnePieceCompleteSealedCandidateReadbackV1,
  evaluateOnePieceCompleteSealedCandidateWritesV1,
  evaluateOnePieceCompleteSealedPreflightV1,
  selectOnePieceCompleteSealedCanaryV1,
  validateOnePieceCompleteSealedCandidatePlanV1,
  validateOnePieceCompleteSealedApplyPlanV1,
} from "../../backend/pricing/one_piece_complete_sealed_candidate_v1.mjs";
import { sha256, stableJson } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const AUDIT = path.join(ROOT, "docs", "audits", "pricing");
const PLAN_PATH = path.join(AUDIT, "one_piece_complete_sealed_candidate_v1",
  "frozen_plan_v1", "candidate_plan.json.gz");
const PREFLIGHT_DIR = path.join(AUDIT,
  "one_piece_complete_sealed_candidate_preflight_v1", "production_read_only_v1");
const CANARY_DIR = path.join(AUDIT,
  "one_piece_complete_sealed_candidate_rollback_canary_v1",
  "production_rollback_v1");
const APPLY_PLAN_DIR = path.join(AUDIT,
  "one_piece_complete_sealed_candidate_apply_v1", "frozen_apply_plan_v1");
const APPLY_DIR = path.join(AUDIT,
  "one_piece_complete_sealed_candidate_apply_v1", "durable_apply_v1");
const VERIFY_DIR = path.join(AUDIT,
  "one_piece_complete_sealed_candidate_apply_v1", "independent_post_apply_v1");

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
  if (args.mode === "apply" &&
      (!/^[0-9a-f]{64}$/.test(args.expectedApplyPlanFingerprint) ||
       !/^[0-9a-f]{64}$/.test(args.expectedPayloadFingerprint))) {
    throw new Error("exact apply-plan and payload fingerprints are required");
  }
  return args;
}

function repo() {
  return { commit_sha: git("rev-parse", "HEAD"),
    branch: git("branch", "--show-current"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
}

function assertRepo(args, repository) {
  if (repository.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      !repository.tracked_worktree_clean ||
      (args.expectedHeadSha && repository.commit_sha !== args.expectedHeadSha)) {
    throw new Error("Repository is not the exact clean sealed gate producer");
  }
}

async function loadPlan() {
  const plan = JSON.parse(gunzipSync(await fs.readFile(PLAN_PATH)));
  const validation = validateOnePieceCompleteSealedCandidatePlanV1(plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  return plan;
}

function options(label) {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: label };
}

function numbers(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function cardBaseline(client) {
  return numbers((await client.query(`select
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

async function sealedCounts(client) {
  const result = {};
  for (const table of ONE_PIECE_COMPLETE_SEALED_TABLES) {
    result[table] = Number((await client.query(
      `select count(*)::int as count from public.${table}`)).rows[0].count);
  }
  return result;
}

async function schemaSecurity(client) {
  const result = {};
  for (const table of ONE_PIECE_COMPLETE_SEALED_TABLES) {
    const row = (await client.query(`select to_regclass($1) is not null as present,
      coalesce((select relrowsecurity from pg_class where oid=to_regclass($1)),false)
        as rls_enabled,
      coalesce((select relforcerowsecurity from pg_class where oid=to_regclass($1)),false)
        as rls_forced,
      has_table_privilege('anon',$1,'select') as anon_select,
      has_table_privilege('authenticated',$1,'select') as authenticated_select,
      has_table_privilege('service_role',$1,'select') as service_select,
      has_table_privilege('service_role',$1,'insert') as service_insert`,
    [`public.${table}`])).rows[0];
    result[table] = row;
  }
  return result;
}

async function visibility(client) {
  const result = { release_status: (await client.query(`select release_status
    from public.catalog_game_release_controls where game_code='one_piece'`))
    .rows[0]?.release_status ?? null };
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    result[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return result;
}

async function stagingRows(client, plan) {
  const ids = plan.payload.candidates.map((row) => row.source_product_id);
  return (await client.query(`select source_product_id::bigint,
    source_group_id::bigint,record_class,single_card_kind,language_key,
    promotion_state,payload->>'source_payload_hash' as source_payload_hash
    from public.one_piece_canonical_import_rows
    where source_product_id=any($1::bigint[]) order by source_product_id`,
  [ids])).rows.map((row) => ({ ...row,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id) }));
}

async function collisions(client, plan) {
  const rows = plan.payload.candidates;
  return numbers((await client.query(`select
    (select count(*)::int from public.sealed_product_candidates
      where id=any($1::uuid[])) as candidate_ids,
    (select count(*)::int from public.sealed_product_candidates
      where source_provider='tcgplayer' and source_category_id=68
      and source_product_id=any($2::bigint[])) as source_products,
    (select count(*)::int from public.sealed_product_candidates
      where source_payload_hash=any($3::text[])) as source_payloads`, [
    rows.map((row) => row.id), rows.map((row) => row.source_product_id),
    rows.map((row) => row.source_payload_hash),
  ])).rows[0]);
}

async function capturePreflight(plan) {
  const client = new Client(options("one-piece-sealed-candidate-preflight-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const visible = await visibility(client);
    const snapshot = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    ...visible, card_baseline: await cardBaseline(client),
    sealed_baseline: await sealedCounts(client),
    schema: await schemaSecurity(client), staging_rows: await stagingRows(client, plan),
    collisions: await collisions(client, plan),
    blocking_pids: (await client.query(
      "select pg_blocking_pids(pg_backend_pid()) as pids")).rows[0]?.pids ?? [] };
    await client.query("rollback");
    return snapshot;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function insertCandidates(client, rows) {
  await client.query(`insert into public.sealed_product_candidates
    (id,source_provider,source_category_id,source_group_id,source_product_id,
     source_product_name,source_payload_hash,classifier_version,classification,
     confidence,evidence,candidate_identity,ambiguity_reasons,requires_review,
     promotion_eligible,canonical_authority,publication_authority)
    select x.id,x.source_provider,x.source_category_id,x.source_group_id,
      x.source_product_id,x.source_product_name,x.source_payload_hash,
      x.classifier_version,x.classification,x.confidence,x.evidence,
      x.candidate_identity,x.ambiguity_reasons,x.requires_review,
      x.promotion_eligible,x.canonical_authority,x.publication_authority
    from jsonb_to_recordset($1::jsonb) as x(id uuid,source_provider text,
      source_category_id bigint,source_group_id bigint,source_product_id bigint,
      source_product_name text,source_payload_hash text,classifier_version text,
      classification text,confidence numeric,evidence jsonb,candidate_identity jsonb,
      ambiguity_reasons text[],requires_review boolean,promotion_eligible boolean,
      canonical_authority boolean,publication_authority boolean)`,
  [JSON.stringify(rows)]);
}

async function readbackCandidates(client, rows) {
  return (await client.query(`select id::text,source_provider,
    source_category_id::bigint,source_group_id::bigint,source_product_id::bigint,
    source_product_name,source_payload_hash,classifier_version,classification,
    confidence::float8 as confidence,evidence,candidate_identity,ambiguity_reasons,
    requires_review,promotion_eligible,canonical_authority,publication_authority
    from public.sealed_product_candidates where id=any($1::uuid[])
    order by array_position($1::uuid[],id)`, [rows.map((row) => row.id)]))
    .rows.map((row) => ({ ...row,
      source_category_id: Number(row.source_category_id),
      source_group_id: Number(row.source_group_id),
      source_product_id: Number(row.source_product_id) }));
}

async function writes(client) {
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

async function freshReadback(rows) {
  const client = new Client(options("one-piece-sealed-candidate-readback-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const result = await readbackCandidates(client, rows);
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

async function artifacts(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json") ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    hashes[name] = sha256(body);
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), hashes);
}

async function preflightMode(args, repository, plan) {
  const snapshot = await capturePreflight(plan);
  const evaluation = evaluateOnePieceCompleteSealedPreflightV1({ plan, snapshot });
  const fingerprint = buildOnePieceCompleteSealedPreflightFingerprintV1({
    plan, snapshot });
  const summary = { version: ONE_PIECE_COMPLETE_SEALED_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "production_read_only_preflight_passed" :
      "production_read_only_preflight_failed", repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: fingerprint,
    staging_row_count: snapshot.staging_rows.length,
    collision_counts: snapshot.collisions, sealed_baseline: snapshot.sealed_baseline,
    findings: evaluation.findings,
    boundaries: { transaction_read_only: true, database_writes: 0 } };
  const report = `# One Piece Sealed Candidate Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n- Staging rows: \`${summary.staging_row_count}\`\n` +
    `- Existing sealed rows: \`0\`\n- Findings: \`${summary.findings.length}\`\n`;
  await artifacts(args.outDir || PREFLIGHT_DIR, { "summary.json": summary,
    "production_readback.json": snapshot, "REPORT.md": report });
  if (!evaluation.valid) throw new Error(evaluation.findings.join(","));
  return summary;
}

async function canaryMode(args, repository, plan) {
  const preflight = JSON.parse(await fs.readFile(path.join(PREFLIGHT_DIR,
    "summary.json"), "utf8"));
  if (preflight.status !== "production_read_only_preflight_passed" ||
      preflight.plan_fingerprint_sha256 !== plan.plan_fingerprint_sha256) {
    throw new Error("Sealed preflight is not canary eligible");
  }
  const before = await capturePreflight(plan);
  const beforeEval = evaluateOnePieceCompleteSealedPreflightV1({ plan, snapshot: before });
  if (!beforeEval.valid) throw new Error(beforeEval.findings.join(","));
  const sample = selectOnePieceCompleteSealedCanaryV1(plan);
  const client = new Client(options("one-piece-sealed-candidate-canary-v1"));
  await client.connect();
  let proof;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_complete_sealed_candidate_canary_v1"]);
    await insertCandidates(client, sample);
    const readback = await readbackCandidates(client, sample);
    const attribution = await writes(client);
    const findings = [
      ...evaluateOnePieceCompleteSealedCandidateReadbackV1({
        candidates: sample, readback }),
      ...evaluateOnePieceCompleteSealedCandidateWritesV1(attribution, true),
    ];
    await client.query("rollback");
    proof = { sample_source_product_ids: sample.map((row) => row.source_product_id),
      candidate_readback_sha256: sha256(stableJson(readback)),
      attributable_writes: attribution, findings, rolled_back: true };
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
  const after = await capturePreflight(plan);
  const afterEval = evaluateOnePieceCompleteSealedPreflightV1({ plan, snapshot: after });
  const findings = [...proof.findings, ...afterEval.findings];
  const canaryFingerprint = sha256(stableJson({ plan: plan.plan_fingerprint_sha256,
    preflight: preflight.preflight_fingerprint_sha256, proof, after }));
  const summary = { version: "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_CANARY_V1",
    recorded_at: new Date().toISOString(),
    status: findings.length ? "production_rollback_canary_failed" :
      "production_rollback_canary_passed", repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflight.preflight_fingerprint_sha256,
    canary_fingerprint_sha256: canaryFingerprint,
    sample_source_product_ids: proof.sample_source_product_ids,
    rolled_back: true, post_rollback_zero_residue: afterEval.valid,
    findings, boundaries: { committed: false, durable_database_writes: 0 } };
  const report = `# One Piece Sealed Candidate Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n- Sample rows: \`10\`\n` +
    `- Rolled back: \`true\`\n- Zero residue: \`${afterEval.valid}\`\n`;
  await artifacts(args.outDir || CANARY_DIR, { "summary.json": summary,
    "transaction_proof.json": proof, "post_rollback_readback.json": after,
    "REPORT.md": report });
  if (findings.length) throw new Error(findings.join(","));
  return summary;
}

async function applyPlanMode(args, repository, plan) {
  const [preflightBody, canaryBody] = await Promise.all([
    fs.readFile(path.join(PREFLIGHT_DIR, "summary.json")),
    fs.readFile(path.join(CANARY_DIR, "summary.json"))]);
  const applyPlan = buildOnePieceCompleteSealedApplyPlanV1({ repository,
    candidatePlan: plan, preflightSummary: JSON.parse(preflightBody),
    canarySummary: JSON.parse(canaryBody), proofHashes: {
      preflight_summary_sha256: sha256(preflightBody),
      canary_summary_sha256: sha256(canaryBody) } });
  const validation = validateOnePieceCompleteSealedApplyPlanV1(applyPlan, plan);
  if (!validation.valid) throw new Error(validation.findings.join(","));
  const summary = { version: applyPlan.version, recorded_at: new Date().toISOString(),
    status: "frozen_sealed_candidate_apply_plan_passed_no_writes", repository,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    target_binding: applyPlan.target_binding, findings: [],
    exact_next_gate: "durable 403-row sealed candidate warehouse apply" };
  const report = `# One Piece Sealed Candidate Frozen Apply Plan V1\n\n` +
    `- Status: \`${summary.status}\`\n- Candidate rows: \`403\`\n` +
    `- Apply-plan fingerprint: \`${applyPlan.apply_plan_fingerprint_sha256}\`\n`;
  await artifacts(args.outDir || APPLY_PLAN_DIR, { "apply_plan.json": applyPlan,
    "summary.json": summary, "REPORT.md": report });
  return summary;
}

async function executeApply(plan, applyPlan) {
  const fresh = await capturePreflight(plan);
  const preflight = evaluateOnePieceCompleteSealedPreflightV1({ plan, snapshot: fresh });
  if (!preflight.valid) throw new Error(`Fresh preflight failed: ${preflight.findings}`);
  const client = new Client(options("one-piece-sealed-candidate-apply-v1"));
  await client.connect();
  let transactionReadback;
  let attribution;
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      [applyPlan.execution.advisory_lock_key]);
    for (let index = 0; index < plan.payload.candidates.length;
      index += applyPlan.execution.chunk_size) {
      await insertCandidates(client, plan.payload.candidates.slice(index,
        index + applyPlan.execution.chunk_size));
    }
    transactionReadback = await readbackCandidates(client, plan.payload.candidates);
    attribution = await writes(client);
    const findings = [
      ...evaluateOnePieceCompleteSealedCandidateReadbackV1({
        candidates: plan.payload.candidates, readback: transactionReadback }),
      ...evaluateOnePieceCompleteSealedCandidateWritesV1(attribution),
    ];
    if (findings.length) throw new Error(findings.join(","));
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
  const durable = await freshReadback(plan.payload.candidates);
  const findings = evaluateOnePieceCompleteSealedCandidateReadbackV1({
    candidates: plan.payload.candidates, readback: durable });
  if (findings.length) throw new Error(findings.join(","));
  return { fresh, transactionReadback, attribution, durable };
}

async function applyMode(args, repository, plan) {
  const applyPlan = JSON.parse(await fs.readFile(path.join(APPLY_PLAN_DIR,
    "apply_plan.json"), "utf8"));
  const validation = validateOnePieceCompleteSealedApplyPlanV1(applyPlan, plan);
  if (!validation.valid || applyPlan.apply_plan_fingerprint_sha256 !==
      args.expectedApplyPlanFingerprint || plan.payload_fingerprint_sha256 !==
      args.expectedPayloadFingerprint) {
    throw new Error("Exact sealed candidate authorization does not match");
  }
  const execution = await executeApply(plan, applyPlan);
  const digest = (rows) => ({ row_count: rows.length,
    rows_sha256: sha256(stableJson(rows)) });
  const summary = { version: ONE_PIECE_COMPLETE_SEALED_APPLY_VERSION,
    recorded_at: new Date().toISOString(),
    status: "durable_candidate_apply_committed_and_readback_passed", repository,
    committed: true,
    apply_plan_fingerprint_sha256: applyPlan.apply_plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    attributable_writes: execution.attribution,
    transaction_readback: digest(execution.transactionReadback),
    durable_readback: digest(execution.durable), findings: [],
    boundaries: { candidate_rows: 403, family_rows: 0, variant_rows: 0,
      review_rows: 0, mapping_rows: 0, evidence_rows: 0, pricing_rows: 0,
      release_rows: 0, release_pointer_rows: 0, card_writes: 0,
      storage_writes: 0, publication_writes: 0, app_visibility_enabled: false } };
  const report = `# One Piece Sealed Candidate Durable Apply V1\n\n` +
    `- Status: \`${summary.status}\`\n- Candidate rows: \`403\`\n` +
    `- Other sealed-domain rows: \`0\`\n- Visibility: \`private/service-only\`\n`;
  await artifacts(args.outDir || APPLY_DIR, { "summary.json": summary,
    "attributable_writes.json": execution.attribution,
    "transaction_readback.json": execution.transactionReadback,
    "durable_readback.json": execution.durable, "REPORT.md": report });
  return summary;
}

async function verifyMode(args, repository, plan) {
  const [readback, snapshot] = await Promise.all([
    freshReadback(plan.payload.candidates), capturePostApplyState()]);
  const findings = evaluateOnePieceCompleteSealedCandidateReadbackV1({
    candidates: plan.payload.candidates, readback });
  const expectedCounts = Object.fromEntries(ONE_PIECE_COMPLETE_SEALED_TABLES
    .map((table) => [table, table === "sealed_product_candidates" ? 403 : 0]));
  if (stableJson(snapshot.sealed_counts) !== stableJson(expectedCounts)) {
    findings.push("sealed_domain_counts_mismatch");
  }
  if (snapshot.release_status !== "hidden" || snapshot.anon_visible ||
      snapshot.authenticated_visible || snapshot.service_role_visible) {
    findings.push("one_piece_visibility_mismatch");
  }
  const summary = { version: "ONE_PIECE_COMPLETE_SEALED_CANDIDATE_POST_APPLY_V1",
    recorded_at: new Date().toISOString(),
    status: findings.length ? "sealed_candidate_verification_failed" :
      "sealed_candidate_apply_independently_verified", repository,
    transaction_read_only: true,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    candidate_readback: { row_count: readback.length,
      rows_sha256: sha256(stableJson(readback)) }, global_readback: snapshot,
    findings, exact_next_gate:
      "family and variant review evidence before any sealed canonical promotion" };
  const report = `# One Piece Sealed Candidate Independent Verification V1\n\n` +
    `- Status: \`${summary.status}\`\n- Candidates: \`${readback.length}\`\n` +
    `- Families/variants/mappings/releases: \`0 / 0 / 0 / 0\`\n`;
  await artifacts(args.outDir || VERIFY_DIR, { "summary.json": summary,
    "candidate_readback.json": readback, "global_readback.json": snapshot,
    "REPORT.md": report });
  if (findings.length) throw new Error(findings.join(","));
  return summary;
}

async function capturePostApplyState() {
  const client = new Client(options("one-piece-sealed-candidate-verify-v1"));
  await client.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const visible = await visibility(client);
    const result = { transaction_read_only: true,
      card_baseline: await cardBaseline(client),
      sealed_counts: await sealedCounts(client), ...visible };
    await client.query("rollback");
    return result;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repository = repo();
  assertRepo(args, repository);
  const plan = await loadPlan();
  let summary;
  if (args.mode === "preflight") summary = await preflightMode(args, repository, plan);
  else if (args.mode === "canary") summary = await canaryMode(args, repository, plan);
  else if (args.mode === "apply-plan") summary = await applyPlanMode(args, repository, plan);
  else if (args.mode === "apply") summary = await applyMode(args, repository, plan);
  else summary = await verifyMode(args, repository, plan);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
