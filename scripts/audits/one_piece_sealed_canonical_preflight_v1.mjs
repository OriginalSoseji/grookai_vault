import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

import dotenv from "dotenv";
import pg from "pg";

import {
  ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_VERSION,
  ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS,
  ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS,
  ONE_PIECE_SEALED_REQUIRED_TRIGGERS,
  buildOnePieceSealedCanonicalPreflightFingerprintV1,
  evaluateOnePieceSealedCanonicalPreflightV1,
  hashOnePieceSealedCanonicalPreflightV1,
} from "../../backend/pricing/one_piece_sealed_canonical_preflight_v1.mjs";
import { pgSslConfig } from
  "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const EVIDENCE_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_online_evidence_resolution_v1", "frozen_live_resolution_v1");
const PLAN_PATH = path.join(EVIDENCE_DIR, "canonical_plan.json.gz");
const HASH_PATH = path.join(EVIDENCE_DIR, "artifact_hashes.json");
const DEFAULT_OUT_DIR = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_sealed_canonical_preflight_v1", "production_read_only_v1");

function parseArgs(argv) {
  const args = {
    expectedHeadSha: "",
    expectedResolutionFingerprint: "",
    envFile: "C:\\grookai_vault\\.env.local",
    outDir: DEFAULT_OUT_DIR,
  };
  for (const arg of argv) {
    if (arg.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = arg.slice(20).trim().toLowerCase();
    } else if (arg.startsWith("--expected-resolution-fingerprint=")) {
      args.expectedResolutionFingerprint = arg.slice(34).trim().toLowerCase();
    } else if (arg.startsWith("--env-file=")) {
      args.envFile = path.resolve(arg.slice(11));
    } else if (arg.startsWith("--out-dir=")) {
      args.outDir = path.resolve(arg.slice(10));
    } else throw new Error(`Unsupported argument: ${arg}`);
  }
  if (!/^[0-9a-f]{40}$/.test(args.expectedHeadSha)) {
    throw new Error("--expected-head-sha=<40-character SHA> is required");
  }
  if (!/^[0-9a-f]{64}$/.test(args.expectedResolutionFingerprint)) {
    throw new Error(
      "--expected-resolution-fingerprint=<64-character SHA-256> is required",
    );
  }
  return args;
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function repository(args) {
  const result = {
    branch: git("branch", "--show-current"),
    commit_sha: git("rev-parse", "HEAD"),
    tracked_worktree_clean:
      git("status", "--porcelain", "--untracked-files=no") === "",
  };
  if (result.branch !== "agent/one-piece-ingestion-readiness-v1" ||
      result.commit_sha !== args.expectedHeadSha ||
      !result.tracked_worktree_clean) {
    throw new Error("Repository is not the exact clean preflight producer");
  }
  return result;
}

function options(connectionString) {
  return {
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 300_000,
    statement_timeout: 300_000,
    application_name: "one-piece-sealed-canonical-preflight-v1",
  };
}

async function loadPlan(args) {
  const [compressed, manifestText] = await Promise.all([
    fs.readFile(PLAN_PATH),
    fs.readFile(HASH_PATH, "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  const expectedHash = manifest.artifacts?.["canonical_plan.json.gz"]?.sha256;
  const actualHash = hashOnePieceSealedCanonicalPreflightV1(compressed);
  if (expectedHash !== actualHash) throw new Error("Canonical plan hash mismatch");
  const plan = JSON.parse(gunzipSync(compressed));
  if (plan.resolution_fingerprint_sha256 !==
      args.expectedResolutionFingerprint) {
    throw new Error("Resolution fingerprint mismatch");
  }
  return { plan, canonicalPlanSha256: actualHash, manifest };
}

function numericObject(row) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key,
    typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value]));
}

async function captureSchema(client) {
  const tableNames = Object.keys(ONE_PIECE_SEALED_CANONICAL_TABLE_COLUMNS);
  const tables = {};
  for (const table of tableNames) {
    tables[table] = (await client.query(`select
      to_regclass($1) is not null as present,
      coalesce((select relrowsecurity from pg_class where oid=to_regclass($1)),false)
        as rls_enabled,
      has_table_privilege('anon',$1,'select') as anon_select,
      has_table_privilege('authenticated',$1,'select') as authenticated_select,
      has_table_privilege('service_role',$1,'select') as service_select,
      has_table_privilege('service_role',$1,'insert') as service_insert`,
    [`public.${table}`])).rows[0];
  }
  const columnRows = (await client.query(`select table_name,column_name
    from information_schema.columns where table_schema='public'
      and table_name=any($1::text[]) order by table_name,ordinal_position`,
  [tableNames])).rows;
  const columns = Object.fromEntries(tableNames.map((table) => [table,
    columnRows.filter((row) => row.table_name === table)
      .map((row) => row.column_name)]));
  const constraints = (await client.query(`select conname
    from pg_constraint where conname=any($1::text[]) order by conname`,
  [ONE_PIECE_SEALED_REQUIRED_CONSTRAINTS])).rows.map((row) => row.conname);
  const triggers = (await client.query(`select tgname
    from pg_trigger where not tgisinternal and tgname=any($1::text[])
    order by tgname`, [ONE_PIECE_SEALED_REQUIRED_TRIGGERS])).rows
    .map((row) => row.tgname);
  return { tables, columns, constraints, triggers };
}

async function captureBaseline(client) {
  return numericObject((await client.query(`select
    (select count(*) from public.sealed_product_families) as sealed_product_families,
    (select count(*) from public.sealed_product_variants) as sealed_product_variants,
    (select count(*) from public.sealed_product_candidates) as sealed_product_candidates,
    (select count(*) from public.sealed_product_candidate_reviews) as sealed_product_candidate_reviews,
    (select count(*) from public.sealed_product_source_mappings) as sealed_product_source_mappings,
    (select count(*) from public.sealed_product_variant_evidence) as sealed_product_variant_evidence,
    (select count(*) from public.card_prints) as card_prints,
    (select count(*) from public.card_printings) as card_printings,
    (select count(*) from public.external_mappings) as external_mappings,
    (select count(*) from public.vault_item_instances) as vault_item_instances,
    (select count(*) from public.market_price_current_publication) as market_price_current_publication`))
    .rows[0]);
}

async function captureCandidateLineage(client, plan) {
  const expected = plan.payload.source_mappings.map((row) => ({
    id: row.candidate_id,
    source_provider: row.source_provider,
    source_category_id: row.source_category_id,
    source_group_id: row.source_group_id,
    source_product_id: row.source_product_id,
    source_product_name: row.source_product_name,
    source_payload_hash: row.source_payload_hash,
    classifier_version: row.classifier_version,
    classification: row.candidate_classification,
  }));
  const rows = (await client.query(`select id::text,source_provider,
    source_category_id::bigint,source_group_id::bigint,source_product_id::bigint,
    source_product_name,source_payload_hash,classifier_version,classification
    from public.sealed_product_candidates where id=any($1::uuid[])`,
  [expected.map((row) => row.id)])).rows.map((row) => ({ ...row,
    source_category_id: Number(row.source_category_id),
    source_group_id: Number(row.source_group_id),
    source_product_id: Number(row.source_product_id),
  }));
  const found = new Map(rows.map((row) => [row.id, row]));
  const mismatches = expected.filter((row) =>
    JSON.stringify(row) !== JSON.stringify(found.get(row.id) ?? null))
    .map((row) => row.source_product_id);
  return { expected: expected.length, found: rows.length, mismatches };
}

async function captureCollisions(client, plan) {
  const p = plan.payload;
  const families = JSON.stringify(p.families);
  const variants = JSON.stringify(p.variants);
  const mappings = JSON.stringify(p.source_mappings);
  const evidence = JSON.stringify(p.variant_evidence);
  const family = numericObject((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,game_key text,family_key text,identity_fingerprint text))
    select
      (select count(*) from public.sealed_product_families f join proposed p on f.id=p.id) as family_ids,
      (select count(*) from public.sealed_product_families f join proposed p on f.game_key=p.game_key and f.family_key=p.family_key) as family_keys,
      (select count(*) from public.sealed_product_families f join proposed p on f.identity_fingerprint=p.identity_fingerprint) as family_fingerprints`,
  [families])).rows[0]);
  const variant = numericObject((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,family_id uuid,variant_key text,identity_fingerprint text))
    select
      (select count(*) from public.sealed_product_variants v join proposed p on v.id=p.id) as variant_ids,
      (select count(*) from public.sealed_product_variants v join proposed p on v.family_id=p.family_id and v.variant_key=p.variant_key) as variant_keys,
      (select count(*) from public.sealed_product_variants v join proposed p on v.identity_fingerprint=p.identity_fingerprint) as variant_fingerprints`,
  [variants])).rows[0]);
  const reviewIds = Number((await client.query(`select count(*) from
    public.sealed_product_candidate_reviews where id=any($1::uuid[])`,
  [p.automated_reviews.map((row) => row.id)])).rows[0].count);
  const mapping = numericObject((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb) as x(id uuid,
      source_provider text,source_category_id bigint,source_group_id bigint,
      source_product_id bigint,mapping_fingerprint text))
    select
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.id=p.id) as mapping_ids,
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.source_provider=p.source_provider and m.source_category_id=p.source_category_id and m.source_group_id=p.source_group_id and m.source_product_id=p.source_product_id) as mapping_sources,
      (select count(*) from public.sealed_product_source_mappings m join proposed p on m.mapping_fingerprint=p.mapping_fingerprint) as mapping_fingerprints`,
  [mappings])).rows[0]);
  const evidenceResult = numericObject((await client.query(`with proposed as (
    select * from jsonb_to_recordset($1::jsonb)
      as x(id uuid,evidence_fingerprint text))
    select
      (select count(*) from public.sealed_product_variant_evidence e join proposed p on e.id=p.id) as evidence_ids,
      (select count(*) from public.sealed_product_variant_evidence e join proposed p on e.evidence_fingerprint=p.evidence_fingerprint) as evidence_fingerprints`,
  [evidence])).rows[0]);
  return { ...family, ...variant, review_ids: reviewIds, ...mapping,
    ...evidenceResult };
}

async function captureSnapshot(connectionString, plan) {
  const client = new Client(options(connectionString));
  await client.connect();
  let closed = false;
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const guard = {
      transaction_read_only: (await client.query("show transaction_read_only"))
        .rows[0].transaction_read_only === "on",
      default_transaction_read_only:
        (await client.query("show default_transaction_read_only"))
          .rows[0].default_transaction_read_only === "on",
      transaction_closed_before_artifacts: false,
    };
    const baselineBefore = await captureBaseline(client);
    const snapshot = {
      guard,
      schema: await captureSchema(client),
      baseline_before: baselineBefore,
      candidate_lineage: await captureCandidateLineage(client, plan),
      collisions: await captureCollisions(client, plan),
      blocking_pids: (await client.query(
        "select pg_blocking_pids(pg_backend_pid()) as pids"))
        .rows[0]?.pids ?? [],
      write_attribution: (await client.query(`select relname as table_name,
        n_tup_ins::bigint as inserted,n_tup_upd::bigint as updated,
        n_tup_del::bigint as deleted,n_tup_hot_upd::bigint as hot_updated
        from pg_stat_xact_user_tables where n_tup_ins<>0 or n_tup_upd<>0
          or n_tup_del<>0 or n_tup_hot_upd<>0 order by relname`)).rows,
      baseline_after: await captureBaseline(client),
    };
    await client.query("rollback");
    closed = true;
    snapshot.guard.transaction_closed_before_artifacts = true;
    return snapshot;
  } finally {
    if (!closed) await client.query("rollback").catch(() => {});
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
  const hashes = {};
  for (const [name, value] of Object.entries(files)) {
    const body = name.endsWith(".json")
      ? await writeJson(path.join(dir, name), value)
      : Buffer.from(String(value));
    if (!name.endsWith(".json")) await fs.writeFile(path.join(dir, name), body);
    hashes[name] = {
      sha256: hashOnePieceSealedCanonicalPreflightV1(body),
      bytes: body.length,
    };
  }
  await writeJson(path.join(dir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: hashes,
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  dotenv.config({ path: args.envFile });
  const repo = repository(args);
  const { plan, canonicalPlanSha256, manifest } = await loadPlan(args);
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlan = {
    version: ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    repository: repo,
    evidence_producer_commit_sha: manifest.producer_commit_sha,
    resolution_fingerprint_sha256: plan.resolution_fingerprint_sha256,
    canonical_plan_sha256: canonicalPlanSha256,
    boundaries: { transaction_read_only: true, database_writes: 0,
      storage_writes: 0, pricing_writes: 0, publication_writes: 0 },
  };
  await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error("SUPABASE_DB_URL is required");
  const snapshot = await captureSnapshot(connectionString, plan);
  const validation = evaluateOnePieceSealedCanonicalPreflightV1({
    plan,
    snapshot,
  });
  const fingerprint = buildOnePieceSealedCanonicalPreflightFingerprintV1({
    resolution_fingerprint_sha256: plan.resolution_fingerprint_sha256,
    canonical_plan_sha256: canonicalPlanSha256,
    snapshot,
  });
  const summary = {
    version: ONE_PIECE_SEALED_CANONICAL_PREFLIGHT_VERSION,
    recorded_at: new Date().toISOString(),
    status: validation.valid ? "production_read_only_preflight_passed" :
      "production_read_only_preflight_failed",
    repository: repo,
    evidence_producer_commit_sha: manifest.producer_commit_sha,
    resolution_fingerprint_sha256: plan.resolution_fingerprint_sha256,
    canonical_plan_sha256: canonicalPlanSha256,
    preflight_fingerprint_sha256: fingerprint,
    plan_counts: {
      families: plan.payload.families.length,
      variants: plan.payload.variants.length,
      reviews: plan.payload.automated_reviews.length,
      source_mappings: plan.payload.source_mappings.length,
      evidence: plan.payload.variant_evidence.length,
    },
    candidate_lineage: snapshot.candidate_lineage,
    collision_counts: snapshot.collisions,
    sealed_baseline: Object.fromEntries(Object.entries(snapshot.baseline_before)
      .filter(([key]) => key.startsWith("sealed_product_"))),
    validation,
    boundaries: { transaction_read_only: true, database_writes: 0,
      storage_writes: 0, pricing_writes: 0, publication_writes: 0,
      apply_authority: false },
    exact_next_gate: "rollback-only canonical sealed insertion canary bound to this preflight fingerprint",
  };
  const report = `# One Piece Sealed Canonical Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Candidate lineage: \`${summary.candidate_lineage.found}/${summary.candidate_lineage.expected}\`\n` +
    `- Planned rows: \`${summary.plan_counts.families} / ${summary.plan_counts.variants} / ${summary.plan_counts.reviews} / ${summary.plan_counts.source_mappings} / ${summary.plan_counts.evidence}\`\n` +
    `- Production collisions: \`${Object.values(summary.collision_counts).reduce((sum, value) => sum + Number(value), 0)}\`\n` +
    `- Findings: \`${validation.findings.length}\`\n` +
    `- Database writes: \`0\`\n- Storage writes: \`0\`\n` +
    `- Apply authority: \`false\`\n\n## Next Gate\n\n` +
    `Run a rollback-only insertion canary bound to preflight fingerprint \`${fingerprint}\`.\n`;
  await writeArtifacts(args.outDir, {
    "run_plan.json": runPlan,
    "production_readback.json": snapshot,
    "summary.json": summary,
    "REPORT.md": report,
  });
  console.log(JSON.stringify(summary, null, 2));
  if (!validation.valid) throw new Error(validation.findings.join(","));
}

await main();
