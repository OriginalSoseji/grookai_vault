import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import dotenv from 'dotenv';
import pg from 'pg';

import {
  buildArtifact,
  contentFingerprint,
  stableJson,
  writeJsonArtifact,
} from './deterministic_artifact_v1.mjs';
import {
  captureReviewSchemaContract,
  MIGRATION_PATH,
  MIGRATION_VERSION,
} from './schema_history_preflight_v1.mjs';

const { Client } = pg;

export const SCHEMA_HISTORY_WRITER_VERSION =
  'JPN-MASTER-INDEX-SCHEMA-HISTORY-WRITER-V1';
export const EXPECTED_MIGRATION_SHA256 =
  '2cd8c70026d74296a469afdb5017944bb37c3a640e064288e4d55d140c037fb6';
export const EXPECTED_CONTRACT_FINGERPRINT =
  '6f319dc8805fc871c4da5339814372015f0bdec0f796d0ae6bfa18458557147c';
export const APPROVAL_ENV = 'JPN_V4_SCHEMA_HISTORY_APPLY_APPROVAL';

const MIGRATION_NAME =
  'master_identity_graph_jpn_review_surfaces_schema_repair_v1';
const DEFAULT_LOCAL_URL =
  'postgresql://postgres:postgres@127.0.0.1:54330/postgres';
const DEFAULT_OUTPUT_ROOT =
  'docs/audits/japanese_master_index_v4/schema_history_writer_v1';

function parseArgs(argv) {
  const options = {
    mode: 'plan',
    envFile: null,
    localUrl: DEFAULT_LOCAL_URL,
    outputRoot: DEFAULT_OUTPUT_ROOT,
  };
  for (const argument of argv) {
    if (argument === '--dry-run') options.mode = 'dry-run';
    else if (argument === '--apply') options.mode = 'apply';
    else if (argument.startsWith('--env-file=')) {
      options.envFile = argument.slice('--env-file='.length);
    } else if (argument.startsWith('--local-url=')) {
      options.localUrl = argument.slice('--local-url='.length);
    } else if (argument.startsWith('--output-root=')) {
      options.outputRoot = argument.slice('--output-root='.length);
    } else {
      throw new Error(`Unsupported argument: ${argument}`);
    }
  }
  return options;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function stripTransactionWrapper(sql) {
  const withoutBegin = sql.replace(
    /(^|\r?\n)\s*begin;\s*(?=\r?\n)/i,
    '$1',
  );
  const withoutCommit = withoutBegin.replace(
    /\r?\n\s*commit;\s*$/i,
    '\n',
  );
  if (withoutCommit === sql || /(^|\n)\s*(begin|commit);/i.test(
    withoutCommit,
  )) {
    throw new Error('Migration transaction wrapper was not isolated.');
  }
  return withoutCommit;
}

async function loadLocalLedgerRow(connectionString) {
  const client = new Client({
    connectionString,
    application_name: 'jpn_v4_schema_history_local_read_only',
  });
  await client.connect();
  try {
    await client.query('begin read only');
    const rows = (await client.query(`
      select version, name, statements
      from supabase_migrations.schema_migrations
      where version = $1
    `, [MIGRATION_VERSION])).rows;
    await client.query('rollback');
    if (rows.length !== 1) {
      throw new Error('Local migration ledger row is not exact.');
    }
    if (rows[0].name !== MIGRATION_NAME) {
      throw new Error('Local migration ledger name changed.');
    }
    return rows[0];
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

async function captureRowCounts(client) {
  const rows = await client.query(`
    select
      (select count(*)::int
       from public.card_print_identity_source_evidence) as evidence_rows,
      (select count(*)::int
       from public.card_print_family_review_queue) as family_review_rows
  `);
  return rows.rows[0];
}

async function captureLedger(client) {
  return (await client.query(`
    select version, name, statements
    from supabase_migrations.schema_migrations
    where version = $1
  `, [MIGRATION_VERSION])).rows;
}

function assertContract(contract, label) {
  const fingerprint = contentFingerprint(contract);
  if (fingerprint !== EXPECTED_CONTRACT_FINGERPRINT) {
    throw new Error(
      `${label} schema contract changed: ${fingerprint}`,
    );
  }
  return fingerprint;
}

async function executeDatabaseMode({
  connectionString,
  mode,
  migrationSql,
  ledgerRow,
}) {
  const client = new Client({
    connectionString,
    application_name: 'jpn_v4_schema_history_writer_v1',
    connectionTimeoutMillis: 30_000,
  });
  await client.connect();
  try {
    const beforeLedger = await captureLedger(client);
    if (beforeLedger.length !== 0) {
      throw new Error('Production migration ledger is not empty.');
    }
    const beforeRows = await captureRowCounts(client);
    const beforeContract = await captureReviewSchemaContract(client);
    const beforeFingerprint = assertContract(beforeContract, 'Before');

    await client.query('begin');
    try {
      await client.query("set local lock_timeout = '5s'");
      await client.query("set local statement_timeout = '180s'");
      await client.query(migrationSql);
      await client.query(`
        insert into supabase_migrations.schema_migrations (
          version,
          statements,
          name
        ) values ($1, $2::text[], $3)
      `, [ledgerRow.version, ledgerRow.statements, ledgerRow.name]);

      const insideLedger = await captureLedger(client);
      if (stableJson(insideLedger) !== stableJson([ledgerRow])) {
        throw new Error('Transaction migration ledger readback mismatch.');
      }
      const insideRows = await captureRowCounts(client);
      if (stableJson(insideRows) !== stableJson(beforeRows)) {
        throw new Error('Migration changed governed table row counts.');
      }
      const insideContract = await captureReviewSchemaContract(client);
      const insideFingerprint = assertContract(insideContract, 'Inside');

      if (mode === 'apply') await client.query('commit');
      else await client.query('rollback');

      const durableLedger = await captureLedger(client);
      const expectedLedger = mode === 'apply' ? [ledgerRow] : [];
      if (stableJson(durableLedger) !== stableJson(expectedLedger)) {
        throw new Error('Durable migration ledger readback mismatch.');
      }
      const durableRows = await captureRowCounts(client);
      if (stableJson(durableRows) !== stableJson(beforeRows)) {
        throw new Error('Durable governed table row counts changed.');
      }
      const durableContract = await captureReviewSchemaContract(client);
      const durableFingerprint = assertContract(durableContract, 'Durable');
      return {
        before_ledger: beforeLedger,
        transaction_ledger: insideLedger,
        durable_ledger: durableLedger,
        row_counts_before: beforeRows,
        row_counts_inside: insideRows,
        row_counts_durable: durableRows,
        contract_fingerprint_before: beforeFingerprint,
        contract_fingerprint_inside: insideFingerprint,
        contract_fingerprint_durable: durableFingerprint,
      };
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  } finally {
    await client.end();
  }
}

function markdown(report) {
  return `# Japanese V4 Schema History Writer V1

Generated: ${report.generated_at}

## Result

- Mode: \`${report.mode}\`
- Status: \`${report.status}\`
- Migration version: \`${report.migration.version}\`
- Migration SHA-256: \`${report.migration.sha256}\`
- Ledger statement count: ${report.migration.statement_count}
- Contract fingerprint: \`${report.expected_contract_fingerprint_sha256}\`
- Durable database writes: ${report.execution_boundary.database_writes}

## Approval Boundary

\`\`\`text
${report.required_approval_message}
\`\`\`

This writer executes only the exact checked-in schema-only migration and
records only its exact locally replayed migration-ledger row. It does not use
global db push and does not mutate card, identity, evidence, review, pricing,
vault, image, Storage, or visibility rows.
`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.envFile) {
    dotenv.config({ path: options.envFile, quiet: true });
  }
  dotenv.config({ quiet: true });
  const productionUrl = process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL;
  const migrationBuffer = await fs.readFile(MIGRATION_PATH);
  const migrationHash = sha256(migrationBuffer);
  if (migrationHash !== EXPECTED_MIGRATION_SHA256) {
    throw new Error(`Migration hash changed: ${migrationHash}`);
  }
  const migrationSql = stripTransactionWrapper(
    migrationBuffer.toString('utf8'),
  );
  const ledgerRow = await loadLocalLedgerRow(options.localUrl);
  const ledgerFingerprint = contentFingerprint(ledgerRow);
  const requiredApprovalMessage =
    'I approve applying only Japanese V4 schema-history migration '
    + `${MIGRATION_VERSION} with SQL SHA-256 ${migrationHash}, `
    + `local ledger fingerprint ${ledgerFingerprint}, and schema contract `
    + `${EXPECTED_CONTRACT_FINGERPRINT}. I approve no card rows, identity `
    + 'rows, evidence rows, family-review rows, child printings, Storage, '
    + 'images, pricing, vault data, English data, deletes, cleanup, '
    + 'quarantine, or global db push.';
  if (
    options.mode === 'apply'
    && process.env[APPROVAL_ENV] !== requiredApprovalMessage
  ) {
    throw new Error(`Exact approval missing from ${APPROVAL_ENV}.`);
  }

  let databaseProof = null;
  if (options.mode !== 'plan') {
    if (!productionUrl) throw new Error('Production database URL is missing.');
    databaseProof = await executeDatabaseMode({
      connectionString: productionUrl,
      mode: options.mode,
      migrationSql,
      ledgerRow,
    });
  }
  const report = {
    generated_at: new Date().toISOString(),
    writer_version: SCHEMA_HISTORY_WRITER_VERSION,
    mode: options.mode,
    status: options.mode === 'plan'
      ? 'schema_history_plan_complete_no_production_access'
      : options.mode === 'dry-run'
        ? 'schema_history_rollback_proof_passed'
        : 'schema_history_applied_and_read_back',
    migration: {
      version: MIGRATION_VERSION,
      name: MIGRATION_NAME,
      path: MIGRATION_PATH,
      sha256: migrationHash,
      bytes: migrationBuffer.length,
      statement_count: ledgerRow.statements.length,
      ledger_fingerprint_sha256: ledgerFingerprint,
    },
    expected_contract_fingerprint_sha256:
      EXPECTED_CONTRACT_FINGERPRINT,
    required_approval_message: requiredApprovalMessage,
    database_proof: databaseProof,
    execution_boundary: {
      production_database_access: options.mode !== 'plan',
      transactional_schema_execution: options.mode !== 'plan',
      database_writes: options.mode === 'apply',
      transaction_rolled_back: options.mode === 'dry-run',
      target_table_row_mutation: false,
      card_or_identity_writes: false,
      public_child_writes: false,
      storage_or_image_writes: false,
      pricing_or_vault_writes: false,
      deletes_or_truncates: false,
      global_db_push: false,
    },
  };
  const generatedAt = report.generated_at;
  const retrieval = {
    access_mode: options.mode === 'plan'
      ? 'verified_migration_and_local_ledger_only'
      : 'guarded_targeted_production_transaction',
    database_reads: options.mode !== 'plan',
    database_writes: options.mode === 'apply',
    source_fetches: false,
    storage_access: false,
  };
  await fs.mkdir(options.outputRoot, { recursive: true });
  await writeJsonArtifact(
    path.join(options.outputRoot, 'jpn_schema_history_writer_v1.json'),
    buildArtifact({
      packageId: SCHEMA_HISTORY_WRITER_VERSION,
      generatedAt,
      retrieval,
      content: report,
    }),
  );
  await fs.writeFile(
    path.join(options.outputRoot, 'jpn_schema_history_writer_v1.md'),
    markdown(report),
  );
  process.stdout.write(stableJson({
    status: report.status,
    migration: report.migration,
    output_root: options.outputRoot,
  }));
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
