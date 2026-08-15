import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import pg from "pg";

import {
  ONE_PIECE_COMPLETE_NUMBERED_REQUIRED_SCHEMA,
  ONE_PIECE_COMPLETE_NUMBERED_PREFLIGHT_VERSION,
  buildOnePieceCompleteNumberedPreflightFingerprintV1,
  evaluateOnePieceCompleteNumberedPreflightV1,
  summarizeOnePieceCompleteNumberedStagingV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_preflight_v1.mjs";
import {
  validateOnePieceCompleteNumberedPromotionPlanV1,
} from "../../backend/pricing/one_piece_complete_numbered_canonical_promotion_v1.mjs";
import { sha256, stableJson } from
  "../../backend/pricing/one_piece_canonical_import_staging_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PLAN_PATH = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_promotion_v1", "frozen_plan_v1",
  "promotion_plan.json.gz");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_complete_numbered_canonical_preflight_v1", "production_read_only_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = { expectedHeadSha: "", outDir: DEFAULT_OUT };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice("--expected-head-sha=".length).trim();
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice("--out-dir=".length));
    } else {
      throw new Error(`Unsupported argument: ${arg}`);
    }
  }
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
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: "one-piece-complete-numbered-preflight-v1",
  };
}

function normalizeNumbers(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function captureFoundation(client) {
  const row = (await client.query(`select
    (select count(*)::int from public.games where code='one_piece') as game_count,
    (select id::text from public.games where code='one_piece') as game_id,
    (select count(*)::int from public.catalog_game_release_controls
      where game_code='one_piece') as release_count,
    (select release_status from public.catalog_game_release_controls
      where game_code='one_piece') as release_status,
    (select release_version from public.catalog_game_release_controls
      where game_code='one_piece') as release_version`)).rows[0];
  for (const role of ["anon", "authenticated", "service_role"]) {
    await client.query("select set_config('request.jwt.claim.role',$1,true)", [role]);
    row[`${role}_visible`] = (await client.query(
      "select public.catalog_game_visible_to_request_v1('one_piece') as visible",
    )).rows[0]?.visible === true;
  }
  return normalizeNumbers(row);
}

async function captureBaseline(client) {
  const row = (await client.query(`select
    (select count(*)::int from public.sets where game='one_piece') as sets,
    (select count(*)::int from public.card_prints
      where game_id='4f504300-0000-4000-8000-000000000001'::uuid) as card_prints,
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
      as external_printing_mappings,
    (select coalesce(jsonb_agg(code order by code),'[]'::jsonb) from public.sets
      where game='one_piece') as set_codes`)).rows[0];
  return { ...normalizeNumbers(row), set_codes: row.set_codes };
}

async function captureSchema(client) {
  const result = {};
  for (const table of ONE_PIECE_COMPLETE_NUMBERED_REQUIRED_SCHEMA) {
    result[table] = (await client.query(
      "select to_regclass($1) is not null as present", [`public.${table}`],
    )).rows[0]?.present === true;
  }
  return result;
}

async function captureRetained(client, plan) {
  const products = plan.payload.retained_existing_rows.map((row) =>
    String(row.source_product_id));
  return (await client.query(`select em.external_id::bigint as source_product_id,
    cp.number as card_number,cp.id::text as card_print_id,
    ci.id::text as card_print_identity_id,em.source as external_mapping_source,
    em.external_id as external_mapping_id,cp.gv_id
    from public.external_mappings em
    join public.card_prints cp on cp.id=em.card_print_id
    join public.card_print_identity ci on ci.card_print_id=cp.id and ci.is_active
    where em.source='tcgplayer' and em.external_id=any($1::text[])
    order by em.external_id::bigint`, [products])).rows.map((row) => ({
    ...row,
    source_product_id: Number(row.source_product_id),
  }));
}

async function captureStaging(client, plan) {
  const ids = plan.payload.numbered_cards.map((row) => row.staging.staging_row_id);
  return (await client.query(`select id::text,batch_id::text,
    source_product_id::bigint,source_group_id::bigint,record_class,
    single_card_kind,language_key,promotion_state,payload_sha256,
    payload->>'source_payload_hash' as source_payload_hash
    from public.one_piece_canonical_import_rows where id=any($1::uuid[])
    order by source_product_id`, [ids])).rows.map((row) => ({
    ...row,
    source_product_id: Number(row.source_product_id),
    source_group_id: Number(row.source_group_id),
  }));
}

async function captureCollisions(client, plan) {
  const sets = plan.payload.set_rows;
  const rows = plan.payload.numbered_cards;
  const result = (await client.query(`select
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
    sets.map((row) => row.id),
    sets.map((row) => row.code),
    rows.map((row) => row.card_print.id),
    rows.map((row) => row.card_print.gv_id),
    rows.map((row) => row.external_mapping.external_id),
    rows.map((row) => row.identity.id),
    rows.map((row) => row.identity.identity_key_hash),
    rows.map((row) => row.source_evidence.id),
    rows.map((row) => row.source_evidence.evidence_key_hash),
    rows.map((row) => row.source_evidence.acquisition_key),
  ])).rows[0];
  return normalizeNumbers(result);
}

export async function captureOnePieceCompleteNumberedPreflightV1(
  connectionString,
  plan,
) {
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  try {
    await client.query("begin read only");
    await client.query("set local lock_timeout='5s'");
    await client.query("set local statement_timeout='300s'");
    const transactionReadOnly = (await client.query(
      "show transaction_read_only")).rows[0]?.transaction_read_only === "on";
    const foundation = await captureFoundation(client);
    const baseline = await captureBaseline(client);
    const schema = await captureSchema(client);
    const retainedRows = await captureRetained(client, plan);
    const stagingRows = await captureStaging(client, plan);
    const collisions = await captureCollisions(client, plan);
    const blockingPids = (await client.query(
      "select pg_blocking_pids(pg_backend_pid()) as pids",
    )).rows[0]?.pids ?? [];
    await client.query("rollback");
    return {
      transaction_read_only: transactionReadOnly,
      foundation,
      baseline,
      schema,
      retained_rows: retainedRows,
      staging_rows: stagingRows,
      collisions,
      blocking_pids: blockingPids,
    };
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
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
  const planBody = await fs.readFile(PLAN_PATH);
  const plan = JSON.parse(gunzipSync(planBody).toString("utf8"));
  const planValidation = validateOnePieceCompleteNumberedPromotionPlanV1(plan);
  if (!planValidation.valid) {
    throw new Error(`Frozen promotion plan invalid: ${planValidation.findings.join(",")}`);
  }
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_COMPLETE_NUMBERED_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    repository,
    plan_path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
    plan_sha256: sha256(planBody),
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    mode: "production_read_only",
    authorized_database_writes: 0,
    authorized_storage_writes: 0,
    authorized_visibility_changes: 0,
  };
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"),
    runPlan);
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const snapshot = await captureOnePieceCompleteNumberedPreflightV1(
    connectionString, plan);
  const evaluation = evaluateOnePieceCompleteNumberedPreflightV1({ plan, snapshot });
  const expectedStagingSummary = summarizeOnePieceCompleteNumberedStagingV1(
    plan.payload.numbered_cards.map((row) => ({
      id: row.staging.staging_row_id,
      batch_id: row.staging.staging_batch_id,
      source_product_id: row.source_product_id,
      source_group_id: row.source_group_id,
      record_class: "exact_single_card_candidate",
      single_card_kind: "numbered_card",
      language_key: "en",
      promotion_state: "current_candidate",
      payload_sha256: row.staging.staging_payload_sha256,
      source_payload_hash: row.staging.source_payload_hash,
    })),
  );
  const actualStagingSummary = summarizeOnePieceCompleteNumberedStagingV1(
    snapshot.staging_rows);
  const compactSnapshot = {
    transaction_read_only: snapshot.transaction_read_only,
    foundation: snapshot.foundation,
    baseline: snapshot.baseline,
    schema: snapshot.schema,
    retained_rows: snapshot.retained_rows,
    expected_staging: expectedStagingSummary,
    actual_staging: actualStagingSummary,
    collisions: snapshot.collisions,
    blocking_pids: snapshot.blocking_pids,
  };
  const preflightFingerprint = buildOnePieceCompleteNumberedPreflightFingerprintV1({
    producerCommitSha: repository.commit_sha,
    planFingerprint: plan.plan_fingerprint_sha256,
    compactSnapshot,
  });
  const artifacts = { "run_plan.json": runPlanBody };
  artifacts["production_readback.json"] = await writeJson(
    path.join(args.outDir, "production_readback.json"), compactSnapshot);
  const stagingBody = Buffer.from(`${snapshot.staging_rows.map(JSON.stringify)
    .join("\n")}\n`, "utf8");
  const stagingCompressed = gzipSync(stagingBody, { level: 9, mtime: 0 });
  await fs.writeFile(path.join(args.outDir, "staging_readback.jsonl.gz"),
    stagingCompressed);
  artifacts["staging_readback.jsonl.gz"] = stagingCompressed;
  const summary = {
    version: ONE_PIECE_COMPLETE_NUMBERED_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid
      ? "production_read_only_preflight_passed"
      : "production_read_only_preflight_failed",
    repository,
    plan_fingerprint_sha256: plan.plan_fingerprint_sha256,
    payload_fingerprint_sha256: plan.payload_fingerprint_sha256,
    preflight_fingerprint_sha256: preflightFingerprint,
    counts: plan.counts,
    baseline: snapshot.baseline,
    staging_readback: actualStagingSummary,
    collisions: snapshot.collisions,
    findings: evaluation.findings,
    boundaries: {
      database_writes: 0,
      storage_writes: 0,
      image_pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
      vault_writes: 0,
      app_visibility_changes: 0,
    },
    exact_next_gate: evaluation.valid
      ? "run a representative transaction rollback canary from this frozen plan"
      : "stop and resolve only the recorded preflight drift without writing",
  };
  artifacts["summary.json"] = await writeJson(path.join(args.outDir, "summary.json"),
    summary);
  const report = `# Complete One Piece Numbered Canonical Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Plan fingerprint: \`${summary.plan_fingerprint_sha256}\`\n` +
    `- Preflight fingerprint: \`${summary.preflight_fingerprint_sha256}\`\n` +
    `- Durable staging rows verified: \`${actualStagingSummary.row_count}/6513\`\n` +
    `- Collision classes with residue: \`${Object.values(snapshot.collisions)
      .filter((value) => Number(value) !== 0).length}\`\n` +
    `- Protected ST-01 baseline preserved: \`${evaluation.findings
      .includes("protected_st01_baseline_mismatch") ? "no" : "yes"}\`\n` +
    `- Database/Storage/publication writes: \`0 / 0 / 0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), report, "utf8");
  artifacts["REPORT.md"] = Buffer.from(report, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: Object.entries(artifacts).map(([artifactPath, body]) => ({
      path: artifactPath,
      bytes: body.length,
      sha256: sha256(body),
    })),
    bound_inputs: [{
      path: path.relative(ROOT, PLAN_PATH).replaceAll("\\", "/"),
      sha256: sha256(planBody),
    }],
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
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
