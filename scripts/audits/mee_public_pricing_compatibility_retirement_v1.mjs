import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";

const { Client } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const VERSION = "MEE_PUBLIC_PRICING_COMPATIBILITY_RETIREMENT_V1";
const MIGRATION_VERSION = "20260826053000";
const MIGRATION_NAME = "retire_mee_public_pricing_compatibility_v1";
const EXPECTED_PREVIOUS_VERSION = "20260824174500";
const MIGRATION_FILE = path.join(
  ROOT,
  "supabase",
  "migrations",
  `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`,
);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  const input = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(input).digest("hex");
}

function parseArgs(argv) {
  const mode = argv.includes("--apply")
    ? "apply"
    : argv.includes("--dry-run")
      ? "dry-run"
      : "plan";
  const outDirArg = argv.find((arg) => arg.startsWith("--out-dir="));
  const expectedMigrationShaArg = argv.find((arg) => arg.startsWith("--expected-migration-sha256="));
  const unsupported = argv.filter((arg) =>
    !["--apply", "--dry-run"].includes(arg)
    && !arg.startsWith("--out-dir=")
    && !arg.startsWith("--expected-migration-sha256="));
  if (unsupported.length) throw new Error(`Unsupported arguments: ${unsupported.join(", ")}`);
  return {
    mode,
    outDir: path.resolve(outDirArg?.slice("--out-dir=".length)
      ?? path.join(ROOT, "docs", "audits", "production_backend_launch_v1", "mee_public_pricing_compatibility_retirement_v1")),
    expectedMigrationSha256: expectedMigrationShaArg?.slice("--expected-migration-sha256=".length) ?? "",
  };
}

async function captureState(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'ledger_count', (
        select count(*)::integer from supabase_migrations.schema_migrations where version = $1
      ),
      'ledger_name', (
        select name from supabase_migrations.schema_migrations where version = $1 limit 1
      ),
      'latest_version', (select max(version) from supabase_migrations.schema_migrations),
      'later_version_count', (
        select count(*)::integer from supabase_migrations.schema_migrations where version > $1
      ),
      'view_exists', to_regclass('public.v_card_pricing_ui_v1') is not null,
      'view_rows', (select count(*)::bigint from public.v_card_pricing_ui_v1),
      'view_definition', (
        select definition from pg_views
        where schemaname = 'public' and viewname = 'v_card_pricing_ui_v1'
      ),
      'view_comment', obj_description('public.v_card_pricing_ui_v1'::regclass, 'pg_class'),
      'anon_select', has_table_privilege('anon', 'public.v_card_pricing_ui_v1', 'select'),
      'authenticated_select', has_table_privilege('authenticated', 'public.v_card_pricing_ui_v1', 'select'),
      'service_select', has_table_privilege('service_role', 'public.v_card_pricing_ui_v1', 'select'),
      'anon_rpc_execute', has_function_privilege(
        'anon', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute'
      ),
      'authenticated_rpc_execute', has_function_privilege(
        'authenticated', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute'
      ),
      'service_rpc_execute', has_function_privilege(
        'service_role', 'public.get_market_pricing_read_model_v1(uuid[],uuid[])', 'execute'
      ),
      'protected_counts', jsonb_build_object(
        'card_prints', (select count(*)::bigint from public.card_prints),
        'card_printings', (select count(*)::bigint from public.card_printings),
        'vault_items', (select count(*)::bigint from public.vault_items),
        'market_price_pipeline_runs', (select count(*)::bigint from public.market_price_pipeline_runs),
        'market_price_publication_sets', (select count(*)::bigint from public.market_price_publication_sets),
        'market_price_current_publication', (select count(*)::bigint from public.market_price_current_publication),
        'market_price_publication_snapshots', (select count(*)::bigint from public.market_price_publication_snapshots),
        'market_evidence_observations', (select count(*)::bigint from public.market_evidence_observations),
        'market_evidence_lifecycle_events', (select count(*)::bigint from public.market_evidence_lifecycle_events),
        'market_evidence_review_dispositions', (select count(*)::bigint from public.market_evidence_review_dispositions),
        'market_evidence_review_action_events', (select count(*)::bigint from public.market_evidence_review_action_events)
      )
    ) as value
  `, [MIGRATION_VERSION]);
  return result.rows[0].value;
}

function preflightFindings(state) {
  const findings = [];
  if (Number(state.ledger_count) !== 0) findings.push("migration_ledger_already_present");
  if (state.latest_version !== EXPECTED_PREVIOUS_VERSION) findings.push("unexpected_migration_head");
  if (Number(state.later_version_count) !== 0) findings.push("later_migration_present");
  if (state.view_exists !== true) findings.push("compatibility_view_missing");
  if (!String(state.view_definition ?? "").includes("market_evidence")) {
    findings.push("expected_legacy_mee_reference_not_present");
  }
  if (state.authenticated_rpc_execute !== true || state.service_rpc_execute !== true) {
    findings.push("governed_market_rpc_not_available");
  }
  if (state.anon_rpc_execute !== false) findings.push("governed_market_rpc_anonymous_access_widened");
  return findings;
}

function appliedFindings(before, after) {
  const findings = [];
  const definition = String(after.view_definition ?? "").toLowerCase();
  if (Number(after.ledger_count) !== 1 || after.ledger_name !== MIGRATION_NAME) {
    findings.push("migration_ledger_mismatch");
  }
  if (after.latest_version !== MIGRATION_VERSION || Number(after.later_version_count) !== 0) {
    findings.push("migration_order_mismatch");
  }
  if (after.view_exists !== true || Number(after.view_rows) !== 0) findings.push("compatibility_view_not_empty");
  for (const forbidden of ["market_evidence", "ebay_active_prices", "market_price_publication"]) {
    if (definition.includes(forbidden)) findings.push(`compatibility_view_references_${forbidden}`);
  }
  if (after.anon_select !== false || after.authenticated_select !== false || after.service_select !== true) {
    findings.push("compatibility_view_grants_mismatch");
  }
  if (after.anon_rpc_execute !== false
      || after.authenticated_rpc_execute !== true
      || after.service_rpc_execute !== true) {
    findings.push("governed_market_rpc_grants_mismatch");
  }
  if (JSON.stringify(stable(before.protected_counts)) !== JSON.stringify(stable(after.protected_counts))) {
    findings.push("protected_row_counts_changed");
  }
  return findings;
}

async function execute(mode, migrationSql) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
    application_name: "mee-public-pricing-compatibility-retirement-v1",
  });
  await client.connect();
  try {
    const before = await captureState(client);
    const beforeFindings = preflightFindings(before);
    if (beforeFindings.length) throw new Error(`Preflight failed: ${beforeFindings.join(", ")}`);
    await client.query("begin");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext('mee_public_pricing_compatibility_retirement_v1'))");
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      await client.query(migrationSql);
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, statements, name)
         values ($1, $2::text[], $3)`,
        [MIGRATION_VERSION, [migrationSql], MIGRATION_NAME],
      );
      const transaction = await captureState(client);
      const transactionFindings = appliedFindings(before, transaction);
      if (transactionFindings.length) {
        throw new Error(`Transaction readback failed: ${transactionFindings.join(", ")}`);
      }
      await client.query(mode === "apply" ? "commit" : "rollback");
      const durable = await captureState(client);
      const durableFindings = mode === "apply"
        ? appliedFindings(before, durable)
        : preflightFindings(durable);
      if (durableFindings.length) {
        throw new Error(`Durable readback failed: ${durableFindings.join(", ")}`);
      }
      return { before, transaction, durable };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

function markdown(report) {
  return [
    `# ${VERSION}`,
    "",
    `- Mode: \`${report.mode}\``,
    `- Status: **${report.status.toUpperCase()}**`,
    `- Migration: \`${MIGRATION_VERSION}_${MIGRATION_NAME}\``,
    `- Migration SHA-256: \`${report.migration_sha256}\``,
    `- Database writes committed: \`${report.boundaries.database_writes_committed}\``,
    `- Compatibility rows after: \`${report.execution?.durable?.view_rows ?? "not executed"}\``,
    `- Protected rows changed: \`${report.boundaries.protected_rows_changed}\``,
    "",
    "## Boundaries",
    "",
    "Only the obsolete compatibility view definition, its grants, comment, and one migration-ledger row may change.",
    "No canonical, Vault, publication, pricing observation, MEE evidence, Storage, or client data rows may change.",
    "",
  ].join("\n");
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const migrationSql = await fs.readFile(MIGRATION_FILE, "utf8");
  const migrationSha = sha256(migrationSql);
  if (args.mode !== "plan" && args.expectedMigrationSha256 !== migrationSha) {
    throw new Error(`Migration SHA guard mismatch: expected ${args.expectedMigrationSha256 || "<missing>"}, actual ${migrationSha}`);
  }
  if (/\b(?:begin|commit|rollback)\s*;/i.test(migrationSql)) {
    throw new Error("Migration must not control its own transaction");
  }
  const execution = args.mode === "plan" ? null : await execute(args.mode, migrationSql);
  const reportBody = {
    package_id: VERSION,
    observed_at: new Date().toISOString(),
    mode: args.mode,
    status: "succeeded",
    migration_version: MIGRATION_VERSION,
    migration_name: MIGRATION_NAME,
    migration_sha256: migrationSha,
    execution,
    boundaries: {
      database_writes_committed: args.mode === "apply",
      migration_ledger_rows_committed: args.mode === "apply" ? 1 : 0,
      compatibility_view_definition_changed: args.mode === "apply",
      compatibility_view_grants_changed: args.mode === "apply",
      protected_rows_changed: false,
      canonical_writes: 0,
      vault_writes: 0,
      publication_row_writes: 0,
      pricing_observation_writes: 0,
      mee_evidence_writes: 0,
    },
  };
  const report = { ...reportBody, report_fingerprint_sha256: sha256(reportBody) };
  await fs.mkdir(args.outDir, { recursive: true });
  const jsonContent = `${JSON.stringify(report, null, 2)}\n`;
  const jsonPath = path.join(args.outDir, "report.json");
  await Promise.all([
    fs.writeFile(jsonPath, jsonContent),
    fs.writeFile(`${jsonPath}.sha256`, `${sha256(jsonContent)}  report.json\n`),
    fs.writeFile(path.join(args.outDir, "REPORT.md"), markdown(report)),
  ]);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    mode: report.mode,
    migration_sha256: migrationSha,
    report_fingerprint_sha256: report.report_fingerprint_sha256,
    report_path: jsonPath,
  }, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[mee-public-pricing-compatibility-retirement-v1] ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
