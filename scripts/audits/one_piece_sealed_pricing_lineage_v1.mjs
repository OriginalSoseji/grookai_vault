import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_PRICING_LINEAGE_VERSION,
  buildOnePieceSealedPricingLineageAuditV1,
  evaluateOnePieceSealedPricingLineageAuditV1,
  hashOnePieceSealedPricingLineageV1,
} from "../../backend/pricing/one_piece_sealed_pricing_lineage_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_pricing_lineage_v1", "production_read_only_v1");

function parseArgs(argv) {
  const args = { expectedHeadSha: "", envFile:
    "C:\\grookai_vault\\.env.local", outDir: DEFAULT_OUT };
  for (const argument of argv) {
    if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
    } else if (argument.startsWith("--env-file=")) {
      args.envFile = path.resolve(argument.slice(11));
    } else if (argument.startsWith("--out-dir=")) {
      args.outDir = path.resolve(argument.slice(10));
    } else throw new Error(`Unsupported argument: ${argument}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
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
    throw new Error("Repository is not the exact clean pricing audit producer");
  }
  return result;
}

function clientOptions(connectionString) {
  return { connectionString, ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000, query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: "one-piece-sealed-pricing-lineage-read-only-v1" };
}

function numeric(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function baseline(client) {
  return numeric((await client.query(`select
    (select count(*) from public.sealed_product_candidates) as sealed_product_candidates,
    (select count(*) from public.sealed_product_families) as sealed_product_families,
    (select count(*) from public.sealed_product_variants) as sealed_product_variants,
    (select count(*) from public.sealed_product_candidate_reviews) as sealed_product_candidate_reviews,
    (select count(*) from public.sealed_product_source_mappings) as sealed_product_source_mappings,
    (select count(*) from public.sealed_product_variant_evidence) as sealed_product_variant_evidence,
    (select count(*) from public.sealed_product_pricing_lane_qualifications) as sealed_product_pricing_lane_qualifications,
    (select count(*) from public.sealed_product_releases) as sealed_product_releases,
    (select count(*) from public.sealed_product_release_members) as sealed_product_release_members,
    (select count(*) from public.sealed_product_release_pointer) as sealed_product_release_pointer`))
    .rows[0]);
}

async function canonicalRows(client) {
  return (await client.query(`select
    v.id::text as variant_id,f.id::text as family_id,
    m.id::text as source_mapping_id,m.source_product_id::bigint,
    m.source_product_name,v.package_form,v.language_code,
    p.source_active,p.catalog_metadata_status,
    (m.source_provider='tcgplayer'
      and m.source_category_id=p.category_id
      and m.source_group_id=p.group_id
      and m.source_product_id=p.product_id
      and m.source_product_name=p.name
      and m.mapping_status='exact_reviewed'
      and m.promotion_authorized) as canonical_lineage_exact
    from public.sealed_product_variants v
    join public.sealed_product_families f on f.id=v.family_id
    join public.sealed_product_source_mappings m on m.variant_id=v.id
    join public.tcgcsv_source_products p on p.product_id=m.source_product_id
    where f.game_key='one_piece'
    order by v.id`)).rows.map((row) => ({ ...row,
    source_product_id: Number(row.source_product_id) }));
}

async function latestPriceRows(client, productIds) {
  return (await client.query(`select distinct on
    (p.product_id,p.subtype_name_normalized)
    p.product_id::bigint,p.source_price_row_identity,p.subtype_name_normalized,
    p.observed_on::text,p.currency,p.market_price::text,p.low_price::text,
    p.mid_price::text,p.high_price::text,p.direct_low_price::text,p.payload_hash
    from public.tcgcsv_source_price_daily_observations p
    where p.product_id=any($1::int[])
    order by p.product_id,p.subtype_name_normalized,p.observed_on desc,
      p.updated_at desc,p.id desc`, [productIds])).rows.map((row) => ({ ...row,
    product_id: Number(row.product_id),
    market_price: row.market_price === null ? null : Number(row.market_price),
    low_price: row.low_price === null ? null : Number(row.low_price),
    mid_price: row.mid_price === null ? null : Number(row.mid_price),
    high_price: row.high_price === null ? null : Number(row.high_price),
    direct_low_price: row.direct_low_price === null
      ? null
      : Number(row.direct_low_price) }));
}

async function latestSync(client) {
  const row = (await client.query(`select id::text,run_key,status,
    observed_on::text,product_count,price_row_count,finished_at,
    worker_version,parser_version,schema_contract_version,artifact_hash
    from public.tcgcsv_source_sync_runs
    where sync_mode='current_full_sync' and status='completed'
    order by created_at desc,id desc limit 1`)).rows[0];
  if (!row) return null;
  return { ...row, product_count: Number(row.product_count),
    price_row_count: Number(row.price_row_count),
    finished_at: row.finished_at ? new Date(row.finished_at).toISOString() : null };
}

async function snapshot(connectionString) {
  const client = new Client(clientOptions(connectionString));
  await client.connect();
  let open = false;
  try {
    await client.query("set default_transaction_read_only=on");
    await client.query("begin transaction isolation level repeatable read read only");
    open = true;
    const guard = { transaction_read_only:
      (await client.query("show transaction_read_only")).rows[0]
        .transaction_read_only === "on",
    default_transaction_read_only:
      (await client.query("show default_transaction_read_only")).rows[0]
        .default_transaction_read_only === "on",
    transaction_closed_before_artifacts: false };
    const before = await baseline(client);
    const canonical = await canonicalRows(client);
    const prices = await latestPriceRows(client,
      canonical.map((row) => row.source_product_id));
    const sync = await latestSync(client);
    const writeAttribution = (await client.query(`select relname as table_name,
      n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
      n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
      from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0 or
        n_tup_del<>0 or n_tup_hot_upd<>0 order by relname`)).rows;
    const after = await baseline(client);
    await client.query("rollback");
    open = false;
    guard.transaction_closed_before_artifacts = true;
    return { guard, baseline_before: before, baseline_after: after,
      canonical_rows: canonical, latest_price_rows: prices,
      latest_sync: sync, write_attribution: writeAttribution };
  } finally {
    if (open) await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return Buffer.from(body);
}

async function writeArtifacts(dir, files) {
  await fs.mkdir(dir, { recursive: true });
  const artifacts = [];
  for (const [name, value] of Object.entries(files)) {
    const body = Buffer.isBuffer(value) ? value : name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (Buffer.isBuffer(value) || !name.endsWith(".json")) {
      await fs.writeFile(path.join(dir, name), body);
    }
    artifacts.push({ path: name, bytes: body.length,
      sha256: hashOnePieceSealedPricingLineageV1(body) });
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256", artifacts,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repo = repository(args);
  const runPlan = { version: ONE_PIECE_SEALED_PRICING_LINEAGE_VERSION,
    recorded_at: new Date().toISOString(), repository: repo,
    mode: "production_repeatable_read_read_only",
    target: "390 durable current-English One Piece sealed variants",
    pricing_authority: "TCGPlayer marketPrice only",
    freshness_days_inclusive: 7,
    boundaries: { database_writes: 0, qualification_writes: 0,
      release_writes: 0, publication_writes: 0, storage_writes: 0,
      card_writes: 0, vault_writes: 0, app_visibility_changes: 0 } };
  await fs.mkdir(args.outDir, { recursive: true });
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const captured = await snapshot(connectionString);
  const audit = buildOnePieceSealedPricingLineageAuditV1({
    canonicalRows: captured.canonical_rows,
    latestPriceRows: captured.latest_price_rows,
    latestSync: captured.latest_sync,
  });
  const proof = { ...captured.guard,
    baseline_before: captured.baseline_before,
    baseline_after: captured.baseline_after,
    write_attribution: captured.write_attribution };
  const validation = evaluateOnePieceSealedPricingLineageAuditV1({
    audit, proof });
  const qualified = audit.rows.filter((row) =>
    row.qualification_status === "qualified_exact");
  const persistableBlocked = audit.rows.filter((row) =>
    row.qualification_status !== "qualified_exact" &&
    row.persistable_in_existing_qualification_table);
  const absenceHolds = audit.rows.filter((row) =>
    !row.persistable_in_existing_qualification_table);
  const summary = { ...runPlan, status: validation.valid
    ? "production_read_only_pricing_lineage_audit_passed"
    : "production_read_only_pricing_lineage_audit_failed",
  latest_sync: captured.latest_sync,
  canonical_variants: audit.rows.length,
  status_counts: audit.status_counts,
  qualified_release_candidates: qualified.length,
  persistable_blocked_qualifications: persistableBlocked.length,
  unpersistable_missing_observation_holds: absenceHolds.length,
  audit_fingerprint_sha256: audit.audit_fingerprint_sha256,
  validation, sealed_target_baseline: {
    qualifications: captured.baseline_before
      .sealed_product_pricing_lane_qualifications,
    releases: captured.baseline_before.sealed_product_releases,
    release_members: captured.baseline_before.sealed_product_release_members,
    release_pointer: captured.baseline_before.sealed_product_release_pointer,
  }, exact_next_gate: validation.valid
    ? "freeze a zero-write qualification apply plan for observed rows; keep missing-observation products as explicit holds"
    : "stop and repair the read-only audit before planning writes" };
  const report = `# One Piece Sealed Pricing Lineage Readiness V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Canonical variants: \`${summary.canonical_variants}\`\n` +
    `- Qualified exact: \`${audit.status_counts.qualified_exact ?? 0}\`\n` +
    `- Blocked stale: \`${audit.status_counts.blocked_stale ?? 0}\`\n` +
    `- Blocked null marketPrice: ` +
      `\`${audit.status_counts.blocked_missing_price ?? 0}\`\n` +
    `- Missing source observation: ` +
      `\`${audit.status_counts.blocked_missing_observation ?? 0}\`\n` +
    `- Existing qualification/release/member/pointer rows: ` +
      `\`${summary.sealed_target_baseline.qualifications} / ` +
      `${summary.sealed_target_baseline.releases} / ` +
      `${summary.sealed_target_baseline.release_members} / ` +
      `${summary.sealed_target_baseline.release_pointer}\`\n` +
    `- Database, pricing, release, and publication writes: \`0\`\n\n` +
    `The existing qualification table cannot truthfully persist a missing-source-` +
    `observation hold because it requires a real source price row identity. Those ` +
    `products remain artifact-level holds; no synthetic evidence identity is invented.\n`;
  const lineageBody = Buffer.from(`${JSON.stringify(audit, null, 2)}\n`);
  const plan = { version: "ONE_PIECE_SEALED_PRICING_QUALIFICATION_PLAN_V1",
    source_audit_fingerprint_sha256: audit.audit_fingerprint_sha256,
    qualification_rows: [...qualified, ...persistableBlocked],
    missing_observation_holds: absenceHolds,
    qualified_release_candidate_variant_ids:
      qualified.map((row) => row.variant_id),
    boundaries: runPlan.boundaries, plan_only: true };
  const planBody = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`);
  await writeArtifacts(args.outDir, { "run_plan.json": runPlan,
    "production_proof.json": proof,
    "pricing_lineage_audit.json.gz": gzipSync(lineageBody),
    "qualification_plan.json.gz": gzipSync(planBody),
    "summary.json": summary, "REPORT.md": report });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!validation.valid) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
