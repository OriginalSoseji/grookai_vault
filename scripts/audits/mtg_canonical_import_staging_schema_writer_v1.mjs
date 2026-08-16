import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

import "../../backend/env.mjs";
import { marketEvidenceDbUrl } from "../lib/market_evidence_db_query_v1.mjs";
import { stableJson, stripMigrationTransactionV1 } from "./mtg_canonical_catalog_canary_stage_v1.mjs";

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const VERSION = "MTG_CANONICAL_IMPORT_STAGING_SCHEMA_WRITER_V1";
const MIGRATION_VERSION = "20260813185000";
const MIGRATION_NAME = "mtg_canonical_import_staging_v1";
const MIGRATION_FILE = path.join(
  ROOT,
  "supabase",
  "migrations",
  `${MIGRATION_VERSION}_${MIGRATION_NAME}.sql`,
);
const EXPECTED_MIGRATION_SHA256 =
  "20d449155373d423a4ea0feb5ba7d0a604270aedf1211c064776edf78f5301b8";
const APPROVAL_ENV = "MTG_CANONICAL_STAGING_SCHEMA_APPROVAL";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildMtgStagingLedgerRowV1(migrationSql) {
  return {
    version: MIGRATION_VERSION,
    statements: [stripMigrationTransactionV1(migrationSql)],
    name: MIGRATION_NAME,
  };
}

export function buildMtgStagingSchemaApprovalV1(migrationSha256, ledgerRow) {
  const ledgerFingerprint = sha256(stableJson(ledgerRow));
  return {
    ledger_fingerprint_sha256: ledgerFingerprint,
    required_approval_message:
      `I approve only MTG service-only staging migration ${MIGRATION_VERSION} ` +
      `with SQL SHA-256 ${migrationSha256} and ledger fingerprint ` +
      `${ledgerFingerprint}. I approve no canonical game, set, card, printing, ` +
      `mapping, image, Storage, pricing, publication, app-visibility, Pokemon, ` +
      `payload-row, update, delete, truncate, cleanup, promotion, global db ` +
      `push, or other migration writes.`,
  };
}

function parseArgs(argv) {
  const args = { mode: "plan", outDir: null };
  for (const arg of argv) {
    if (arg === "--dry-run") args.mode = "dry-run";
    else if (arg === "--apply") args.mode = "apply";
    else if (arg.startsWith("--out-dir=")) args.outDir = path.resolve(arg.slice(10));
    else throw new Error(`Unsupported argument: ${arg}`);
  }
  return args;
}

async function captureState(client) {
  const result = await client.query(
    `select jsonb_build_object(
       'ledger_rows', (
         select count(*) from supabase_migrations.schema_migrations where version = $1
       ),
       'ledger_name', (
         select name from supabase_migrations.schema_migrations where version = $1 limit 1
       ),
       'latest_earlier_version', (
         select max(version) from supabase_migrations.schema_migrations where version < $1
       ),
       'later_version_count', (
         select count(*) from supabase_migrations.schema_migrations where version > $1
       ),
       'batch_table_present', to_regclass('public.mtg_canonical_import_batches') is not null,
       'row_table_present', to_regclass('public.mtg_canonical_import_rows') is not null,
       'mtg_game_count', (select count(*) from public.games where code = 'mtg'),
       'mtg_set_count', (select count(*) from public.sets where game = 'mtg'),
       'pokemon_card_count', (
         select count(*)
         from public.card_prints card
         join public.games game on game.id = card.game_id
         where game.code = 'pokemon'
       )
     ) as value`,
    [MIGRATION_VERSION],
  );
  return result.rows[0].value;
}

async function captureSecurity(client) {
  const result = await client.query(`
    select jsonb_build_object(
      'batch_rls_enabled', (
        select relrowsecurity from pg_class
        where oid = 'public.mtg_canonical_import_batches'::regclass
      ),
      'row_rls_enabled', (
        select relrowsecurity from pg_class
        where oid = 'public.mtg_canonical_import_rows'::regclass
      ),
      'anon_batch_select', has_table_privilege('anon', 'public.mtg_canonical_import_batches', 'select'),
      'authenticated_batch_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_batches', 'select'),
      'anon_row_select', has_table_privilege('anon', 'public.mtg_canonical_import_rows', 'select'),
      'authenticated_row_select', has_table_privilege('authenticated', 'public.mtg_canonical_import_rows', 'select'),
      'service_batch_select', has_table_privilege('service_role', 'public.mtg_canonical_import_batches', 'select'),
      'service_batch_insert', has_table_privilege('service_role', 'public.mtg_canonical_import_batches', 'insert'),
      'service_row_select', has_table_privilege('service_role', 'public.mtg_canonical_import_rows', 'select'),
      'service_row_insert', has_table_privilege('service_role', 'public.mtg_canonical_import_rows', 'insert')
    ) as value
  `);
  return result.rows[0].value;
}

function assertSecurity(security) {
  const expected = {
    batch_rls_enabled: true,
    row_rls_enabled: true,
    anon_batch_select: false,
    authenticated_batch_select: false,
    anon_row_select: false,
    authenticated_row_select: false,
    service_batch_select: true,
    service_batch_insert: true,
    service_row_select: true,
    service_row_insert: true,
  };
  if (stableJson(security) !== stableJson(expected)) {
    throw new Error(`Staging security mismatch: ${stableJson(security)}`);
  }
}

async function executeDatabaseMode({ mode, migrationSql, ledgerRow }) {
  const client = new Client({
    connectionString: marketEvidenceDbUrl(),
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15_000,
    query_timeout: 180_000,
    statement_timeout: 180_000,
  });
  await client.connect();
  try {
    const before = await captureState(client);
    if (Number(before.ledger_rows) !== 0) throw new Error("Migration ledger row already exists");
    if (before.batch_table_present || before.row_table_present) {
      throw new Error("Unrecorded MTG staging schema already exists");
    }
    if (Number(before.later_version_count) !== 0) {
      throw new Error("A later migration is already recorded; targeted apply order is unsafe");
    }
    await client.query("begin");
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      await client.query(stripMigrationTransactionV1(migrationSql));
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, statements, name)
         values ($1, $2::text[], $3)`,
        [ledgerRow.version, ledgerRow.statements, ledgerRow.name],
      );
      const inside = await captureState(client);
      const security = await captureSecurity(client);
      assertSecurity(security);
      if (
        Number(inside.ledger_rows) !== 1 ||
        inside.ledger_name !== MIGRATION_NAME ||
        !inside.batch_table_present ||
        !inside.row_table_present ||
        Number(inside.mtg_game_count) !== Number(before.mtg_game_count) ||
        Number(inside.mtg_set_count) !== Number(before.mtg_set_count) ||
        Number(inside.pokemon_card_count) !== Number(before.pokemon_card_count)
      ) {
        throw new Error(`Schema transaction readback mismatch: ${stableJson(inside)}`);
      }
      if (mode === "apply") await client.query("commit");
      else await client.query("rollback");
      const durable = await captureState(client);
      if (mode === "apply") {
        if (
          Number(durable.ledger_rows) !== 1 ||
          durable.ledger_name !== MIGRATION_NAME ||
          !durable.batch_table_present ||
          !durable.row_table_present
        ) {
          throw new Error(`Durable schema readback mismatch: ${stableJson(durable)}`);
        }
        assertSecurity(await captureSecurity(client));
      } else if (
        Number(durable.ledger_rows) !== 0 ||
        durable.batch_table_present ||
        durable.row_table_present
      ) {
        throw new Error(`Rollback left schema state: ${stableJson(durable)}`);
      }
      if (
        Number(durable.mtg_game_count) !== Number(before.mtg_game_count) ||
        Number(durable.mtg_set_count) !== Number(before.mtg_set_count) ||
        Number(durable.pokemon_card_count) !== Number(before.pokemon_card_count)
      ) {
        throw new Error("Canonical boundary changed durably");
      }
      return { before, transaction: inside, transaction_security: security, durable };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

async function writeJson(file, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(file, body, "utf8");
  return body;
}

function report(result) {
  return `# MTG Service-Only Staging Schema Writer

- Status: **${result.status.toUpperCase()}**
- Mode: \`${result.mode}\`
- Migration: \`${result.migration.version}_${result.migration.name}\`
- Migration SHA-256: \`${result.migration.sha256}\`
- Ledger fingerprint: \`${result.migration.ledger_fingerprint_sha256}\`
- Durable database writes: \`${result.boundaries.database_writes}\`

## Approval Boundary

\`\`\`text
${result.required_approval_message}
\`\`\`

This writer applies only the service-only MTG staging schema and its exact
migration-history row. It never runs global db push or applies the later MTG
canonical foundation migration.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const migrationSql = await fs.readFile(MIGRATION_FILE, "utf8");
  const migrationHash = sha256(migrationSql);
  if (migrationHash !== EXPECTED_MIGRATION_SHA256) {
    throw new Error(`Migration hash changed: ${migrationHash}`);
  }
  const ledgerRow = buildMtgStagingLedgerRowV1(migrationSql);
  const approval = buildMtgStagingSchemaApprovalV1(migrationHash, ledgerRow);
  if (args.mode === "apply" && process.env[APPROVAL_ENV] !== approval.required_approval_message) {
    throw new Error(`Exact approval missing from ${APPROVAL_ENV}`);
  }
  const proof =
    args.mode === "plan"
      ? null
      : await executeDatabaseMode({ mode: args.mode, migrationSql, ledgerRow });
  const result = {
    version: VERSION,
    recorded_at: new Date().toISOString(),
    mode: args.mode,
    status:
      args.mode === "plan"
        ? "schema_plan_complete_no_database_access"
        : args.mode === "dry-run"
          ? "schema_rollback_proof_passed"
          : "schema_applied_and_read_back",
    migration: {
      version: MIGRATION_VERSION,
      name: MIGRATION_NAME,
      sha256: migrationHash,
      ledger_fingerprint_sha256: approval.ledger_fingerprint_sha256,
    },
    required_approval_message: approval.required_approval_message,
    database_proof: proof,
    boundaries: {
      database_writes: args.mode === "apply",
      transaction_rolled_back: args.mode === "dry-run",
      canonical_writes: false,
      payload_row_writes: false,
      app_visibility: false,
      storage_writes: false,
      pricing_writes: false,
      pokemon_mutation: false,
      global_db_push: false,
      foundation_migration_apply: false,
    },
  };
  const outDir =
    args.outDir ??
    path.join(ROOT, "docs", "audits", "pricing", "mtg_canonical_import_staging_schema_v1");
  await fs.mkdir(outDir, { recursive: true });
  const summaryBody = await writeJson(path.join(outDir, "summary.json"), result);
  const reportBody = report(result);
  await fs.writeFile(path.join(outDir, "REPORT.md"), reportBody, "utf8");
  await writeJson(path.join(outDir, "artifact_hashes.json"), {
    hash_algorithm: "sha256",
    artifacts: {
      "summary.json": sha256(summaryBody),
      "REPORT.md": sha256(reportBody),
    },
  });
  process.stdout.write(
    `${JSON.stringify({ out_dir: outDir, status: result.status, migration: result.migration })}\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
