import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

import {
  EXPECTED_NUMBERED_CARD_COUNT,
  ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
  ONE_PIECE_FOUNDATION_VERSION,
  ONE_PIECE_GAME,
  evaluateOnePieceFoundationPreflightV1,
  foundationRunPlanFingerprint,
} from "../../backend/pricing/one_piece_canonical_catalog_foundation_v1.mjs";
import { sha256 } from "../../backend/pricing/one_piece_st01_language_and_image_readiness_v1.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { pgSslConfig } from "./japanese_master_index_v4/read_only_guard_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BRANCH = "agent/one-piece-ingestion-readiness-v1";
const MIGRATION = path.join(ROOT, "supabase", "migrations",
  `${ONE_PIECE_FOUNDATION_MIGRATION_VERSION}_one_piece_canonical_catalog_foundation_v1.sql`);
const STORAGE_PLAN = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_st01_storage_permanent_plan_v1", "st01_18_objects_v1",
  "permanent_upload_plan.json");
const DEFAULT_OUT = path.join(ROOT, "docs", "audits", "pricing",
  "one_piece_canonical_catalog_foundation_preflight_v1", "production_read_only_v1");

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function parseArgs(argv) {
  const args = {
    envFile: "C:\\grookai_vault\\.env.local",
    expectedHeadSha: "",
    outDir: DEFAULT_OUT,
  };
  for (const argument of argv) {
    if (argument.startsWith("--env-file=")) args.envFile = path.resolve(argument.slice(11));
    else if (argument.startsWith("--expected-head-sha=")) {
      args.expectedHeadSha = argument.slice(20).trim().toLowerCase();
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

async function captureReadback(connectionString, productIds, gvIds) {
  const client = new Client({
    connectionString,
    ssl: pgSslConfig(connectionString),
    connectionTimeoutMillis: 20_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "one-piece-foundation-preflight-v1",
  });
  await client.connect();
  try {
    await client.query("set default_transaction_read_only = on");
    await client.query("begin transaction isolation level repeatable read read only");
    const result = await client.query(`select jsonb_build_object(
      'transaction_read_only', current_setting('transaction_read_only')::boolean,
      'database_user', current_user,
      'latest_migration', (select max(version) from supabase_migrations.schema_migrations),
      'candidate_migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version = $1),
      'later_migration_count', (select count(*) from supabase_migrations.schema_migrations
        where version > $1),
      'game_code_count', (select count(*) from public.games where code = $2),
      'game_id_count', (select count(*) from public.games where id = $3::uuid),
      'release_control_table_present', to_regclass('public.catalog_game_release_controls') is not null,
      'release_control_count', (select count(*) from public.catalog_game_release_controls
        where game_code = $2),
      'release_control_rls_enabled', (select relrowsecurity from pg_class
        where oid = 'public.catalog_game_release_controls'::regclass),
      'anon_release_control_select', has_table_privilege(
        'anon', 'public.catalog_game_release_controls', 'select'),
      'authenticated_release_control_select', has_table_privilege(
        'authenticated', 'public.catalog_game_release_controls', 'select'),
      'service_release_control_select', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'select'),
      'service_release_control_insert', has_table_privilege(
        'service_role', 'public.catalog_game_release_controls', 'insert'),
      'visibility_function_count', (select count(*) from pg_proc procedure
        join pg_namespace namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'public' and procedure.proname in (
          'catalog_game_visible_to_request_v1', 'catalog_game_id_visible_to_request_v1',
          'catalog_card_print_visible_to_request_v1',
          'catalog_parent_gv_id_visible_to_request_v1')),
      'visibility_policy_count', (select count(*) from pg_policies
        where schemaname = 'public' and policyname in (
          'games_catalog_release_visibility_v1', 'sets_catalog_release_visibility_v1',
          'card_prints_catalog_release_visibility_v1',
          'card_print_identity_catalog_release_visibility_v1',
          'card_printings_catalog_release_visibility_v1')),
      'normal_finish_count', (select count(*) from public.finish_keys
        where key = 'normal' and is_active),
      'identity_domain_constraint', (select pg_get_constraintdef(oid)
        from pg_constraint where conrelid = 'public.card_print_identity'::regclass
          and conname = 'card_print_identity_identity_domain_check'),
      'staged_total_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189),
      'staged_numbered_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and single_card_kind = 'numbered_card'),
      'staged_don_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and single_card_kind = 'don_card'),
      'staged_sealed_rows', (select count(*) from public.one_piece_canonical_import_rows
        where source_group_id = 3189 and record_class = 'sealed_product_candidate'),
      'st01_set_count', (select count(*) from public.sets
        where game = $2 and lower(code) in ('st01', 'st-01')),
      'gv_id_collision_count', (select count(*) from public.card_prints
        where gv_id = any($4::text[])),
      'tcgplayer_id_collision_count', (select count(*) from public.card_prints
        where tcgplayer_id = any($5::text[])),
      'parent_mapping_collision_count', (select count(*) from public.external_mappings
        where source in ('tcgplayer', 'tcgplayer_catalog')
          and external_id = any($5::text[])),
      'conflicting_lock_count', (select count(*) from pg_locks lock
        where not lock.granted and lock.relation in (
          'public.games'::regclass, 'public.catalog_game_release_controls'::regclass,
          'public.card_print_identity'::regclass)),
      'protected_counts', jsonb_build_object(
        'games', (select count(*) from public.games),
        'sets', (select count(*) from public.sets),
        'card_prints', (select count(*) from public.card_prints),
        'identity_rows', (select count(*) from public.card_print_identity),
        'printing_rows', (select count(*) from public.card_printings),
        'external_mappings', (select count(*) from public.external_mappings),
        'external_printing_mappings', (select count(*) from public.external_printing_mappings),
        'sealed_families', (select count(*) from public.sealed_product_families),
        'sealed_variants', (select count(*) from public.sealed_product_variants),
        'sealed_candidates', (select count(*) from public.sealed_product_candidates),
        'sealed_releases', (select count(*) from public.sealed_product_releases),
        'vault_items', (select count(*) from public.vault_items),
        'vault_item_instances', (select count(*) from public.vault_item_instances),
        'vault_owners', (select count(*) from public.vault_owners)
      )
    ) as value`, [
      ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
      ONE_PIECE_GAME.code,
      ONE_PIECE_GAME.id,
      gvIds,
      productIds,
    ]);
    await client.query("commit");
    return result.rows[0].value;
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
  };
  if (repository.commit_sha !== args.expectedHeadSha || repository.branch !== BRANCH ||
      git("status", "--porcelain", "--untracked-files=no") !== "") {
    throw new Error("Repository is not the exact clean foundation-preflight producer");
  }
  const [migrationBody, storagePlan] = await Promise.all([
    fs.readFile(MIGRATION),
    fs.readFile(STORAGE_PLAN, "utf8").then(JSON.parse),
  ]);
  const numbered = storagePlan.assets.filter((asset) =>
    asset.review_lane === "numbered_card_parent_identity_review");
  if (numbered.length !== EXPECTED_NUMBERED_CARD_COUNT) {
    throw new Error("Exact numbered-card scope changed");
  }
  const runPlanCore = {
    version: ONE_PIECE_FOUNDATION_VERSION,
    repository,
    migration: {
      version: ONE_PIECE_FOUNDATION_MIGRATION_VERSION,
      path: path.relative(ROOT, MIGRATION).replaceAll("\\", "/"),
      sha256: sha256(migrationBody),
    },
    target_game: ONE_PIECE_GAME,
    numbered_card_scope: {
      count: numbered.length,
      product_ids: numbered.map((row) => String(row.source_product_id)),
      gv_ids: numbered.map((row) => row.proposed_parent_gv_id),
    },
    boundaries: {
      transaction_read_only: true,
      database_writes: false,
      migration_apply: false,
      canonical_writes: false,
      sealed_writes: false,
      storage_writes: false,
      pointer_writes: false,
      pricing_writes: false,
      publication_writes: false,
    },
  };
  const runPlan = {
    ...runPlanCore,
    run_plan_fingerprint_sha256: foundationRunPlanFingerprint(runPlanCore),
  };
  await fs.mkdir(args.outDir, { recursive: true });
  const runPlanBody = await writeJson(path.join(args.outDir, "run_plan.json"), runPlan);

  dotenv.config({ path: args.envFile, quiet: true });
  const connectionString = marketEvidenceDbUrl();
  if (!connectionString) throw new Error("Production database URL is unavailable");
  const readback = await captureReadback(
    connectionString,
    runPlan.numbered_card_scope.product_ids,
    runPlan.numbered_card_scope.gv_ids,
  );
  const evaluation = evaluateOnePieceFoundationPreflightV1(readback);
  const summaryCore = {
    version: ONE_PIECE_FOUNDATION_VERSION,
    recorded_at: new Date().toISOString(),
    status: evaluation.valid ? "foundation_preflight_passed_no_writes" : "blocked",
    repository,
    migration: runPlan.migration,
    run_plan_fingerprint_sha256: runPlan.run_plan_fingerprint_sha256,
    production: readback,
    findings: evaluation.findings,
    boundaries: {
      run_plan_written_before_database_access: true,
      database_connections: 1,
      read_only_transactions: 1,
      database_writes: 0,
      migration_apply: 0,
      canonical_writes: 0,
      sealed_writes: 0,
      storage_writes: 0,
      pointer_writes: 0,
      pricing_writes: 0,
      publication_writes: 0,
    },
  };
  const summary = {
    ...summaryCore,
    preflight_fingerprint_sha256: sha256(JSON.stringify(summaryCore)),
  };
  const readbackBody = await writeJson(path.join(args.outDir, "production_readback.json"), readback);
  const summaryBody = await writeJson(path.join(args.outDir, "summary.json"), summary);
  const reportBody = `# One Piece Canonical Catalog Foundation Preflight V1\n\n` +
    `- Status: \`${summary.status}\`\n` +
    `- Migration: \`${runPlan.migration.version}\`\n` +
    `- Migration SHA-256: \`${runPlan.migration.sha256}\`\n` +
    `- Numbered-card scope: \`${numbered.length}\`\n` +
    `- Findings: \`${evaluation.findings.length}\`\n` +
    `- Transaction read-only: \`${readback.transaction_read_only}\`\n` +
    `- Existing One Piece game/release rows: ` +
    `\`${readback.game_code_count} / ${readback.release_control_count}\`\n` +
    `- Canonical collisions (set/GV/source mapping): ` +
    `\`${readback.st01_set_count} / ${readback.gv_id_collision_count} / ` +
    `${readback.parent_mapping_collision_count}\`\n` +
    `- Database writes: \`0\`\n`;
  await fs.writeFile(path.join(args.outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(args.outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: [
      { path: "run_plan.json", sha256: sha256(runPlanBody) },
      { path: "production_readback.json", sha256: sha256(readbackBody) },
      { path: "summary.json", sha256: sha256(summaryBody) },
      { path: "REPORT.md", sha256: sha256(reportBody) },
    ],
  });
  process.stdout.write(`${JSON.stringify({
    status: summary.status,
    preflight_fingerprint_sha256: summary.preflight_fingerprint_sha256,
    migration_sha256: runPlan.migration.sha256,
    findings: evaluation.findings,
    boundaries: summary.boundaries,
    output_directory: path.relative(ROOT, args.outDir).replaceAll("\\", "/"),
  }, null, 2)}\n`);
  if (!evaluation.valid) process.exitCode = 1;
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
