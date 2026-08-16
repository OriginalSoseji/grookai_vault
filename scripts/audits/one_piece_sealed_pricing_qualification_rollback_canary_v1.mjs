import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_VERSION,
  evaluateOnePieceSealedPricingQualificationCanaryV1,
  normalizeOnePieceSealedPricingQualificationRowsV1,
  selectOnePieceSealedPricingQualificationCanaryV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_canary_v1.mjs";
import {
  hashOnePieceSealedPricingQualificationPlanV1,
  validateOnePieceSealedPricingQualificationPlanV1,
} from "../../backend/pricing/one_piece_sealed_pricing_qualification_plan_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_qualification_plan_v1", "frozen_plan_v1");
const PLAN_PATH = path.join(PLAN_DIR, "qualification_plan.json.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_qualification_rollback_canary_v1",
  "production_rollback_v1");

export function parseArgs(argv) {
  const args = { execute: false, expectedHeadSha: "",
    expectedPlanFingerprint: "", expectedPayloadFingerprint: "",
    envFile: "C:\\grookai_vault\\.env.local", outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument === "--execute-rollback-canary") args.execute = true;
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--expected-plan-fingerprint=")) {
      args.expectedPlanFingerprint = argument.slice(28).trim().toLowerCase();
    } else if (argument.startsWith("--expected-payload-fingerprint=")) {
      args.expectedPayloadFingerprint = argument.slice(31).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!args.execute) throw new Error("--execute-rollback-canary is required");
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPlanFingerprint) ||
      !/^[0-9a-f]{64}$/.test(args.expectedPayloadFingerprint)) {
    throw new Error("Exact head SHA, plan fingerprint, and payload fingerprint are required");
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function repository(args) {
  const result = { branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"), tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "" };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean rollback-canary producer");
  }
  return result;
}

function options(connectionString, name) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000, application_name: name };
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function baseline(client) {
  return numeric((await client.query(`select
    (select count(*) from public.sealed_product_families) as sealed_product_families,
    (select count(*) from public.sealed_product_variants) as sealed_product_variants,
    (select count(*) from public.sealed_product_source_mappings) as sealed_product_source_mappings,
    (select count(*) from public.sealed_product_pricing_lane_qualifications) as sealed_product_pricing_lane_qualifications,
    (select count(*) from public.sealed_product_releases) as sealed_product_releases,
    (select count(*) from public.sealed_product_release_members) as sealed_product_release_members,
    (select count(*) from public.sealed_product_release_pointer) as sealed_product_release_pointer,
    (select count(*) from public.catalog_game_release_controls
      where game_code='one_piece') as one_piece_release_control_rows,
    (select release_status from public.catalog_game_release_controls
      where game_code='one_piece') as one_piece_release_status`)).rows[0]);
}

async function schemaProof(client) {
  return (await client.query(`select
    (select relrowsecurity from pg_class
      where oid='public.sealed_product_pricing_lane_qualifications'::regclass)
      as rls_enabled,
    (select relforcerowsecurity from pg_class
      where oid='public.sealed_product_pricing_lane_qualifications'::regclass)
      as rls_forced,
    exists(select 1 from pg_trigger where tgrelid=
      'public.sealed_product_pricing_lane_qualifications'::regclass
      and tgname='sealed_product_pricing_qualifications_append_only'
      and tgenabled<>'D') as append_only_trigger_enabled,
    exists(select 1 from pg_policies where schemaname='public'
      and tablename='sealed_product_pricing_lane_qualifications'
      and policyname='sealed_product_pricing_qualifications_service_role_all'
      and 'service_role'=any(roles)) as service_role_policy_present,
    has_table_privilege('service_role',
      'public.sealed_product_pricing_lane_qualifications','select')
      as service_role_select,
    has_table_privilege('service_role',
      'public.sealed_product_pricing_lane_qualifications','insert')
      as service_role_insert,
    has_table_privilege('anon',
      'public.sealed_product_pricing_lane_qualifications','select')
      as anon_select,
    has_table_privilege('authenticated',
      'public.sealed_product_pricing_lane_qualifications','select')
      as authenticated_select`)).rows[0];
}

async function lineageProof(client, rows) {
  return numeric((await client.query(`with expected as (
    select * from jsonb_to_recordset($1::jsonb) as x(
      id uuid,variant_id uuid,source_mapping_id uuid,
      source_price_row_identity text,source_subtype_name_normalized text,
      observed_on date,currency text,qualification_status text,
      qualification_evidence jsonb,source_observation_fingerprint text,
      qualification_contract_version text,publication_authority boolean)
  ) select count(*) as expected_rows,
    count(*) filter (where v.id is not null) as matched_variants,
    count(*) filter (where m.id is not null and m.variant_id=e.variant_id
      and m.source_provider='tcgplayer' and m.mapping_status='exact_reviewed'
      and m.promotion_authorized) as matched_exact_mappings,
    count(*) filter (where p.product_id=m.source_product_id
      and p.source_price_row_identity=e.source_price_row_identity
      and p.subtype_name_normalized=e.source_subtype_name_normalized
      and p.observed_on=e.observed_on
      and p.currency=e.currency
      and p.payload_hash=e.source_observation_fingerprint)
      as matched_source_observations
    from expected e
    left join public.sealed_product_variants v on v.id=e.variant_id
    left join public.sealed_product_source_mappings m
      on m.id=e.source_mapping_id
    left join public.tcgcsv_source_price_daily_observations p
      on p.product_id=m.source_product_id
      and p.source_price_row_identity=e.source_price_row_identity
      and p.observed_on=e.observed_on
      and p.payload_hash=e.source_observation_fingerprint`,
  [JSON.stringify(rows)])).rows[0]);
}

async function collisionProof(client, rows) {
  return numeric((await client.query(`with expected as (
    select * from jsonb_to_recordset($1::jsonb) as x(
      id uuid,source_mapping_id uuid,source_price_row_identity text,
      observed_on date,qualification_contract_version text)
  ) select
    (select count(*) from public.sealed_product_pricing_lane_qualifications q
      join expected e on e.id=q.id) as id_collisions,
    (select count(*) from public.sealed_product_pricing_lane_qualifications q
      join expected e on e.source_mapping_id=q.source_mapping_id
       and e.source_price_row_identity=q.source_price_row_identity
       and e.observed_on=q.observed_on
       and e.qualification_contract_version=q.qualification_contract_version)
      as unique_key_collisions`, [JSON.stringify(rows)])).rows[0]);
}

function evaluatePreflight({ baseline: state, schema, lineage, collisions,
  expectedRows }) {
  const findings = [];
  const add = (condition, code) => { if (condition) findings.push(code); };
  add(state.sealed_product_pricing_lane_qualifications !== 0,
    "qualification_baseline_not_empty");
  add(state.sealed_product_releases !== 0 ||
    state.sealed_product_release_members !== 0 ||
    state.sealed_product_release_pointer !== 0, "release_state_not_empty");
  add(state.one_piece_release_control_rows !== 1 ||
    state.one_piece_release_status !== "hidden", "one_piece_not_hidden");
  add(schema.rls_enabled !== true || schema.rls_forced !== true ||
    schema.append_only_trigger_enabled !== true ||
    schema.service_role_policy_present !== true ||
    schema.service_role_select !== true || schema.service_role_insert !== true ||
    schema.anon_select !== false || schema.authenticated_select !== false,
  "qualification_security_boundary_mismatch");
  add(lineage.expected_rows !== expectedRows ||
    lineage.matched_variants !== expectedRows ||
    lineage.matched_exact_mappings !== expectedRows ||
    lineage.matched_source_observations !== expectedRows,
  "source_lineage_mismatch");
  add(collisions.id_collisions !== 0 || collisions.unique_key_collisions !== 0,
    "qualification_collision");
  return { valid: findings.length === 0, findings };
}

async function readOnlyPreflight(connectionString, rows) {
  const client = new Client(options(connectionString,
    "one-piece-sealed-pricing-qualification-preflight-v1"));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    const transactionReadOnly = (await client.query("show transaction_read_only"))
      .rows[0].transaction_read_only === "on";
    // A single pg client is intentionally sequential. Concurrent query calls on
    // one connection are deprecated and provide no snapshot benefit.
    const state = await baseline(client);
    const schema = await schemaProof(client);
    const lineage = await lineageProof(client, rows);
    const collisions = await collisionProof(client, rows);
    await client.query("rollback");
    const evaluation = evaluatePreflight({ baseline: state, schema, lineage,
      collisions, expectedRows: rows.length });
    return { ...evaluation, transaction_read_only: transactionReadOnly,
      baseline: state, schema, lineage, collisions };
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function remainingRows(client, rows) {
  return Number((await client.query(`select count(*) from
    public.sealed_product_pricing_lane_qualifications
    where id=any($1::uuid[])`, [rows.map((row) => row.id)])).rows[0].count);
}

async function insertRows(client, rows) {
  await client.query(`insert into public.sealed_product_pricing_lane_qualifications
    (id,variant_id,source_mapping_id,source_price_row_identity,
     source_subtype_name_normalized,observed_on,currency,qualification_status,
     qualification_evidence,source_observation_fingerprint,
     qualification_contract_version,publication_authority)
    select id,variant_id,source_mapping_id,source_price_row_identity,
      source_subtype_name_normalized,observed_on,currency,qualification_status,
      qualification_evidence,source_observation_fingerprint,
      qualification_contract_version,publication_authority
    from jsonb_to_recordset($1::jsonb) as x(id uuid,variant_id uuid,
      source_mapping_id uuid,source_price_row_identity text,
      source_subtype_name_normalized text,observed_on date,currency text,
      qualification_status text,qualification_evidence jsonb,
      source_observation_fingerprint text,qualification_contract_version text,
      publication_authority boolean)`, [JSON.stringify(rows)]);
}

async function readback(client, rows) {
  return normalizeOnePieceSealedPricingQualificationRowsV1((await client.query(
    `select id::text,variant_id::text,source_mapping_id::text,
      source_price_row_identity,source_subtype_name_normalized,
      observed_on::text,currency,qualification_status,qualification_evidence,
      source_observation_fingerprint,qualification_contract_version,
      publication_authority
    from public.sealed_product_pricing_lane_qualifications
    where id=any($1::uuid[]) order by id`, [rows.map((row) => row.id)])).rows);
}

async function attribution(client) {
  return (await client.query(`select relname as table_name,
    n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
    n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
    from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0
      or n_tup_del<>0 or n_tup_hot_upd<>0 order by relname`)).rows
    .map(numeric);
}

async function runRollback(connectionString, selection, preflight) {
  const client = new Client(options(connectionString,
    "one-piece-sealed-pricing-qualification-rollback-canary-v1"));
  await client.connect();
  let rolledBack = false;
  try {
    await client.query("begin transaction isolation level repeatable read");
    await client.query("select pg_advisory_xact_lock(hashtextextended($1,0))",
      ["one_piece_sealed_pricing_qualification_rollback_canary_v1"]);
    const before = await baseline(client);
    const collisions = await collisionProof(client, selection.rows);
    if (collisions.id_collisions !== 0 ||
        collisions.unique_key_collisions !== 0) {
      throw new Error("Canary collision detected inside transaction");
    }
    await insertRows(client, selection.rows);
    const actual = await readback(client, selection.rows);
    const writes = await attribution(client);
    await client.query("rollback");
    rolledBack = true;
    return { preflight, transaction: { committed: false, rolled_back: true },
      baseline_before: before, transaction_readback: actual,
      write_attribution: writes };
  } finally {
    if (!rolledBack) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function verifyRollback(connectionString, selection) {
  const client = new Client(options(connectionString,
    "one-piece-sealed-pricing-qualification-post-rollback-v1"));
  await client.connect();
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    const result = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    remaining_target_rows: await remainingRows(client, selection.rows),
    baseline: await baseline(client) };
    await client.query("rollback");
    return result;
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  await fs.writeFile(file, body);
  return body;
}

async function writeArtifacts(dir, files, producer) {
  await fs.mkdir(dir, { recursive: true });
  const buffers = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    buffers[name] = body;
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", producer_commit_sha: producer,
    artifacts: Object.fromEntries(Object.entries(buffers).map(([name, body]) =>
      [name, { bytes: body.length, sha256:
        hashOnePieceSealedPricingQualificationPlanV1(body) }])),
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const planBuffer = await fs.readFile(PLAN_PATH);
  const plan = JSON.parse(gunzipSync(planBuffer));
  const planValidation = validateOnePieceSealedPricingQualificationPlanV1(plan);
  if (!planValidation.valid ||
      plan.plan_fingerprint_sha256 !== args.expectedPlanFingerprint ||
      plan.payload_fingerprint_sha256 !== args.expectedPayloadFingerprint) {
    throw new Error("Rollback canary is not bound to the exact valid frozen plan");
  }
  const selection = selectOnePieceSealedPricingQualificationCanaryV1(plan);
  const runPlan = {
    version: ONE_PIECE_SEALED_PRICING_QUALIFICATION_CANARY_VERSION,
    recorded_at: new Date().toISOString(), repository: repo,
    qualification_plan_artifact_sha256:
      hashOnePieceSealedPricingQualificationPlanV1(planBuffer),
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    sample_fingerprint_sha256: selection.sample_fingerprint_sha256,
    statuses: selection.statuses,
    boundaries: { rollback_only: true, durable_database_writes: 0,
      release_writes: 0, release_member_writes: 0, release_pointer_writes: 0,
      publication_writes: 0, card_writes: 0, storage_writes: 0,
      vault_writes: 0, app_visibility_changes: 0 },
  };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const preflight = await readOnlyPreflight(connectionString,
    plan.payload.qualification_rows);
  if (!preflight.valid || preflight.transaction_read_only !== true) {
    throw new Error(`Fresh preflight failed: ${preflight.findings.join(",")}`);
  }
  const proof = await runRollback(connectionString, selection, preflight);
  proof.post_rollback = await verifyRollback(connectionString, selection);
  proof.boundaries = { durable_database_writes: 0, release_writes: 0,
    publication_writes: 0, app_visibility_changes: 0 };
  const validation = evaluateOnePieceSealedPricingQualificationCanaryV1({
    selection, proof });
  const summary = { ...runPlan, status: validation.valid
    ? "production_rollback_canary_passed_zero_residue"
    : "production_rollback_canary_failed",
  full_plan_preflight: preflight,
  selected_rows: selection.rows.length,
  exact_transaction_readback: validation.findings.includes(
    "transaction_readback_mismatch") === false,
  write_attribution: proof.write_attribution,
  post_rollback_remaining_target_rows:
    proof.post_rollback.remaining_target_rows,
  validation,
  exact_next_gate: validation.valid
    ? "freeze the insert-only durable 374-row qualification apply plan"
    : "stop and repair before any durable qualification apply" };
  const report = `# One Piece Sealed Pricing Qualification Rollback Canary V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Full-plan fresh lineage preflight: \`${preflight.valid}\`\n` +
    `- Canary statuses: \`${selection.statuses.join(", ")}\`\n` +
    `- Transaction-local exact readback: \`${summary.exact_transaction_readback}\`\n` +
    `- Post-rollback target rows: \`${summary.post_rollback_remaining_target_rows}\`\n` +
    `- Durable database/release/publication/visibility writes: \`0 / 0 / 0 / 0\`\n`;
  await writeArtifacts(args.outDir, { "run_plan.json": runPlan,
    "selection.json": selection, "transaction_proof.json": proof,
    "summary.json": summary, "REPORT.md": report }, repo.commit_sha);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) throw new Error(validation.findings.join(","));
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}

export { baseline, collisionProof, lineageProof, readOnlyPreflight, schemaProof };
