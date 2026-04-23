/**
 * MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical identity outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

import { installIdentityMaintenanceBoundaryV1 } from './identity_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_IDENTITY_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts are disabled. Set ENABLE_IDENTITY_MAINTENANCE_MODE=true for explicit use.',
  );
}

if (process.env.IDENTITY_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: IDENTITY_MAINTENANCE_MODE must be 'EXPLICIT'",
  );
}

if (process.env.IDENTITY_MAINTENANCE_ENTRYPOINT !== 'backend/identity/run_identity_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: identity maintenance scripts must be launched from backend/identity/run_identity_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.IDENTITY_MAINTENANCE_DRY_RUN !== 'false';
const { assertMaintenanceWriteAllowed } = installIdentityMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('IDENTITY MAINTENANCE: running in DRY RUN mode');
}

void assertMaintenanceWriteAllowed;
const PHASE = 'COL1_NAMESPACE_MIGRATION_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'col1';
const LEGACY_PREFIX = 'GV-PK-CL-';
const TARGET_PREFIX = 'GV-PK-COL-';
const EXPECTED = {
  candidateCount: 95,
};

const BACKUP_SCHEMA_PATH = path.join(
  process.cwd(),
  'backups',
  'col1_namespace_preapply_schema.sql',
);
const BACKUP_DATA_PATH = path.join(
  process.cwd(),
  'backups',
  'col1_namespace_preapply_data.sql',
);

const BACKUP_TABLE_CONFIG = [
  { table_name: 'card_prints', key_column: 'id' },
  { table_name: 'vault_items', key_column: 'card_id' },
  { table_name: 'shared_cards', key_column: 'card_id' },
];

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`;
}

function sqlQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function escapePgArrayElement(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (Array.isArray(value)) {
    return buildPgArrayLiteral(value);
  }

  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildPgArrayLiteral(values) {
  return `{${values.map((value) => escapePgArrayElement(value)).join(',')}}`;
}

function toSqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'null';
  }

  if (value instanceof Date) {
    return sqlQuote(value.toISOString());
  }

  if (Array.isArray(value)) {
    return sqlQuote(buildPgArrayLiteral(value));
  }

  if (typeof value === 'object') {
    return sqlQuote(JSON.stringify(value));
  }

  return sqlQuote(value);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

function assertZero(actual, code) {
  if (normalizeCount(actual) !== 0) {
    throw new Error(`${code}:${actual}`);
  }
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function buildTempCandidateSurface(client) {
  await client.query(`
    drop table if exists tmp_col1_namespace_candidates;

    create temp table tmp_col1_namespace_candidates on commit drop as
    select
      cp.id as card_print_id,
      cp.name,
      cp.number,
      cp.set_code,
      cp.gv_id as old_gv_id,
      replace(cp.gv_id, '${LEGACY_PREFIX}', '${TARGET_PREFIX}') as new_gv_id
    from public.card_prints cp
    where cp.set_code = '${TARGET_SET_CODE}'
      and cp.gv_id like '${LEGACY_PREFIX}%';

    create unique index tmp_col1_namespace_candidates_card_print_uidx
      on tmp_col1_namespace_candidates (card_print_id);

    create unique index tmp_col1_namespace_candidates_old_gvid_uidx
      on tmp_col1_namespace_candidates (old_gv_id);

    create unique index tmp_col1_namespace_candidates_new_gvid_uidx
      on tmp_col1_namespace_candidates (new_gv_id);
  `);
}

async function loadPreconditionSummary(client) {
  return queryOne(
    client,
    `
      with candidate_summary as (
        select
          count(*)::int as candidate_count,
          count(distinct new_gv_id)::int as distinct_new_gv_id_count,
          count(*) filter (where new_gv_id is null)::int as null_new_gv_id_count
        from tmp_col1_namespace_candidates
      ),
      internal_collisions as (
        select count(*)::int as row_count
        from (
          select new_gv_id
          from tmp_col1_namespace_candidates
          group by new_gv_id
          having count(*) > 1
        ) dup
      ),
      live_collisions as (
        select count(*)::int as row_count
        from public.card_prints cp
        join tmp_col1_namespace_candidates c
          on cp.gv_id = c.new_gv_id
         and cp.id <> c.card_print_id
      ),
      canonical_summary as (
        select count(*)::int as canonical_target_count
        from public.card_prints
        where set_code = $1
          and gv_id is not null
      ),
      already_new_namespace as (
        select count(*)::int as row_count
        from public.card_prints
        where set_code = $1
          and gv_id like $2
      ),
      gv_id_fk_references as (
        select count(*)::int as row_count
        from (
          select con.oid
          from pg_constraint con
          join pg_class referenced_table
            on referenced_table.oid = con.confrelid
          join pg_namespace referenced_namespace
            on referenced_namespace.oid = referenced_table.relnamespace
          join unnest(con.confkey) with ordinality as referenced_cols(attnum, ordinality)
            on true
          join pg_attribute referenced_attr
            on referenced_attr.attrelid = con.confrelid
           and referenced_attr.attnum = referenced_cols.attnum
          where con.contype = 'f'
            and referenced_namespace.nspname = 'public'
            and referenced_table.relname = 'card_prints'
          group by con.oid
          having bool_or(referenced_attr.attname = 'gv_id')
        ) fk_refs
      ),
      vault_item_counts as (
        select
          count(*) filter (where vi.gv_id = c.old_gv_id)::int as old_match_count,
          count(*) filter (where vi.gv_id = c.new_gv_id)::int as new_match_count,
          count(*) filter (
            where vi.gv_id is not null
              and vi.gv_id <> c.old_gv_id
              and vi.gv_id <> c.new_gv_id
          )::int as mismatch_count
        from public.vault_items vi
        join tmp_col1_namespace_candidates c
          on c.card_print_id = vi.card_id
      ),
      shared_card_counts as (
        select
          count(*) filter (where sc.gv_id = c.old_gv_id)::int as old_match_count,
          count(*) filter (where sc.gv_id = c.new_gv_id)::int as new_match_count,
          count(*) filter (
            where sc.gv_id is not null
              and sc.gv_id <> c.old_gv_id
              and sc.gv_id <> c.new_gv_id
          )::int as mismatch_count
        from public.shared_cards sc
        join tmp_col1_namespace_candidates c
          on c.card_print_id = sc.card_id
      ),
      web_event_counts as (
        select count(*)::int as legacy_event_count
        from public.web_events
        where gv_id like $3
      )
      select
        candidate_summary.candidate_count,
        candidate_summary.distinct_new_gv_id_count,
        candidate_summary.null_new_gv_id_count,
        internal_collisions.row_count as internal_collision_count,
        live_collisions.row_count as live_collision_count,
        canonical_summary.canonical_target_count,
        already_new_namespace.row_count as already_new_namespace_count,
        gv_id_fk_references.row_count as gv_id_fk_reference_count,
        vault_item_counts.old_match_count as vault_items_old_match_count,
        vault_item_counts.new_match_count as vault_items_new_match_count,
        vault_item_counts.mismatch_count as vault_items_mismatch_count,
        shared_card_counts.old_match_count as shared_cards_old_match_count,
        shared_card_counts.new_match_count as shared_cards_new_match_count,
        shared_card_counts.mismatch_count as shared_cards_mismatch_count,
        web_event_counts.legacy_event_count as web_events_legacy_count
      from candidate_summary
      cross join internal_collisions
      cross join live_collisions
      cross join canonical_summary
      cross join already_new_namespace
      cross join gv_id_fk_references
      cross join vault_item_counts
      cross join shared_card_counts
      cross join web_event_counts
    `,
    [TARGET_SET_CODE, `${TARGET_PREFIX}%`, `${LEGACY_PREFIX}%`],
  );
}

function assertPreconditions(summary) {
  assertEqual(normalizeCount(summary?.candidate_count), EXPECTED.candidateCount, 'CANDIDATE_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.canonical_target_count), EXPECTED.candidateCount, 'CANONICAL_TARGET_COUNT_DRIFT');
  assertEqual(normalizeCount(summary?.distinct_new_gv_id_count), EXPECTED.candidateCount, 'DISTINCT_NEW_GV_ID_COUNT_DRIFT');
  assertZero(summary?.null_new_gv_id_count, 'NULL_NEW_GV_ID_COUNT');
  assertZero(summary?.internal_collision_count, 'INTERNAL_GV_ID_COLLISIONS');
  assertZero(summary?.live_collision_count, 'LIVE_GV_ID_COLLISIONS');
  assertZero(summary?.already_new_namespace_count, 'ALREADY_NEW_NAMESPACE_COUNT');
  assertZero(summary?.gv_id_fk_reference_count, 'GV_ID_FOREIGN_KEY_REFERENCES');
  assertZero(summary?.vault_items_mismatch_count, 'VAULT_ITEMS_GV_ID_MISMATCH');
  assertZero(summary?.shared_cards_mismatch_count, 'SHARED_CARDS_GV_ID_MISMATCH');
}

async function loadSampleRows(client) {
  return queryRows(
    client,
    `
      select
        card_print_id,
        name,
        number,
        old_gv_id,
        new_gv_id
      from tmp_col1_namespace_candidates
      order by
        case when number ~ '^SL[0-9]+$' then 1 else 0 end,
        nullif(regexp_replace(number, '^[^0-9]+', ''), '')::int,
        number,
        card_print_id
      limit 25
    `,
  );
}

async function loadTableColumns(client, tableName) {
  return queryRows(
    client,
    `
      select
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName],
  );
}

async function loadSchemaSnapshot(client, tableNames) {
  const columns = await queryRows(
    client,
    `
      select
        table_name,
        column_name,
        ordinal_position,
        data_type,
        udt_name,
        is_nullable,
        column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name = any($1::text[])
      order by table_name, ordinal_position
    `,
    [tableNames],
  );

  const constraints = await queryRows(
    client,
    `
      select
        c.relname as table_name,
        con.conname as constraint_name,
        con.contype,
        pg_get_constraintdef(con.oid) as constraint_def
      from pg_constraint con
      join pg_class c
        on c.oid = con.conrelid
      join pg_namespace n
        on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = any($1::text[])
      order by c.relname, con.conname
    `,
    [tableNames],
  );

  const indexes = await queryRows(
    client,
    `
      select
        tablename as table_name,
        indexname,
        indexdef
      from pg_indexes
      where schemaname = 'public'
        and tablename = any($1::text[])
      order by tablename, indexname
    `,
    [tableNames],
  );

  return { columns, constraints, indexes };
}

async function loadBackupTableRows(client, tableName, keyColumn, ids) {
  const columns = await loadTableColumns(client, tableName);
  const columnNames = columns.map((column) => column.column_name);
  const orderTerms = [quoteIdent(keyColumn)];
  if (columnNames.includes('id') && keyColumn !== 'id') {
    orderTerms.push(quoteIdent('id'));
  }

  const rows = await queryRows(
    client,
    `
      select ${columnNames.map((columnName) => quoteIdent(columnName)).join(', ')}
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(keyColumn)} = any($1::uuid[])
      order by ${orderTerms.join(', ')}
    `,
    [ids],
  );

  return {
    table_name: tableName,
    key_column: keyColumn,
    columns: columnNames,
    rows,
  };
}

function buildSchemaBackupContent({ generatedAt, sampleRows, preconditions, schemaSnapshot }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- Mode: apply`);
  sections.push(`-- candidate_count: ${normalizeCount(preconditions?.candidate_count)}`);
  sections.push(`-- vault_items_old_match_count: ${normalizeCount(preconditions?.vault_items_old_match_count)}`);
  sections.push(`-- shared_cards_old_match_count: ${normalizeCount(preconditions?.shared_cards_old_match_count)}`);

  for (const sample of sampleRows) {
    sections.push(`-- sample_number=${sample.number} old_gv_id=${sample.old_gv_id} new_gv_id=${sample.new_gv_id}`);
  }

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name)) {
    sections.push('');
    sections.push(`-- Table: public.${tableName}`);
    sections.push('-- Columns');

    for (const column of schemaSnapshot.columns.filter((row) => row.table_name === tableName)) {
      sections.push(
        `--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`,
      );
    }

    sections.push('-- Constraints');
    const tableConstraints = schemaSnapshot.constraints.filter((row) => row.table_name === tableName);
    if (tableConstraints.length === 0) {
      sections.push('--   none');
    } else {
      for (const constraint of tableConstraints) {
        sections.push(
          `--   ${constraint.constraint_name} [${constraint.contype}] ${constraint.constraint_def}`,
        );
      }
    }

    sections.push('-- Indexes');
    const tableIndexes = schemaSnapshot.indexes.filter((row) => row.table_name === tableName);
    if (tableIndexes.length === 0) {
      sections.push('--   none');
    } else {
      for (const index of tableIndexes) {
        sections.push(`--   ${index.indexname}: ${index.indexdef}`);
      }
    }
  }

  sections.push('');
  return `${sections.join('\n')}\n`;
}

function buildUpsertStatements(tableSnapshot) {
  if (tableSnapshot.rows.length === 0) {
    return [`-- public.${tableSnapshot.table_name}: no rows captured`];
  }

  const columnList = tableSnapshot.columns.map((columnName) => quoteIdent(columnName)).join(', ');
  const updateSet = tableSnapshot.columns
    .filter((columnName) => columnName !== 'id')
    .map((columnName) => `${quoteIdent(columnName)} = excluded.${quoteIdent(columnName)}`)
    .join(', ');

  return tableSnapshot.rows.map((row) => {
    const values = tableSnapshot.columns.map((columnName) => toSqlLiteral(row[columnName])).join(', ');
    return [
      `insert into public.${quoteIdent(tableSnapshot.table_name)} (${columnList})`,
      `values (${values})`,
      `on conflict (${quoteIdent('id')}) do update set ${updateSet};`,
    ].join('\n');
  });
}

function buildDataBackupContent({ generatedAt, tableSnapshots, candidateCount }) {
  const sections = [];

  sections.push(`-- ${PHASE} PRE-APPLY DATA SNAPSHOT`);
  sections.push(`-- Generated at: ${generatedAt}`);
  sections.push(`-- candidate_count: ${candidateCount}`);
  sections.push('begin;');
  sections.push('');

  const cardPrintsSnapshot = tableSnapshots.find((table) => table.table_name === 'card_prints');
  sections.push(...buildUpsertStatements(cardPrintsSnapshot));

  for (const tableName of BACKUP_TABLE_CONFIG.map((table) => table.table_name).filter((name) => name !== 'card_prints')) {
    sections.push('');
    sections.push(`-- Restore public.${tableName}`);
    const snapshot = tableSnapshots.find((table) => table.table_name === tableName);
    sections.push(...buildUpsertStatements(snapshot));
  }

  sections.push('');
  sections.push('commit;');
  sections.push('');
  return `${sections.join('\n')}\n`;
}

async function createBackupArtifacts(client, sampleRows, preconditions) {
  const generatedAt = new Date().toISOString();
  const tableNames = BACKUP_TABLE_CONFIG.map((table) => table.table_name);
  const schemaSnapshot = await loadSchemaSnapshot(client, tableNames);
  const ids = (
    await queryRows(client, `select card_print_id from tmp_col1_namespace_candidates order by card_print_id`)
  ).map((row) => row.card_print_id);
  const tableSnapshots = [];

  for (const tableConfig of BACKUP_TABLE_CONFIG) {
    tableSnapshots.push(
      await loadBackupTableRows(client, tableConfig.table_name, tableConfig.key_column, ids),
    );
  }

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    sampleRows,
    preconditions,
    schemaSnapshot,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    tableSnapshots,
    candidateCount: ids.length,
  });

  ensureParentDir(BACKUP_SCHEMA_PATH);
  ensureParentDir(BACKUP_DATA_PATH);
  fs.writeFileSync(BACKUP_SCHEMA_PATH, schemaContent);
  fs.writeFileSync(BACKUP_DATA_PATH, dataContent);

  if (!fs.existsSync(BACKUP_SCHEMA_PATH) || !fs.existsSync(BACKUP_DATA_PATH)) {
    throw new Error('BACKUP_WRITE_FAILED');
  }

  return {
    schema_path: BACKUP_SCHEMA_PATH,
    data_path: BACKUP_DATA_PATH,
    table_row_counts: tableSnapshots.map((table) => ({
      table_name: table.table_name,
      row_count: table.rows.length,
    })),
  };
}

async function applyMigration(client) {
  const updatedCardPrints = await client.query(`
    update public.card_prints cp
    set gv_id = c.new_gv_id
    from tmp_col1_namespace_candidates c
    where cp.id = c.card_print_id
      and cp.gv_id = c.old_gv_id
  `);

  const updatedVaultItems = await client.query(`
    update public.vault_items vi
    set gv_id = c.new_gv_id
    from tmp_col1_namespace_candidates c
    where vi.card_id = c.card_print_id
      and vi.gv_id = c.old_gv_id
  `);

  const updatedSharedCards = await client.query(`
    update public.shared_cards sc
    set gv_id = c.new_gv_id
    from tmp_col1_namespace_candidates c
    where sc.card_id = c.card_print_id
      and sc.gv_id = c.old_gv_id
  `);

  return {
    updated_card_prints: updatedCardPrints.rowCount ?? 0,
    updated_vault_items: updatedVaultItems.rowCount ?? 0,
    updated_shared_cards: updatedSharedCards.rowCount ?? 0,
  };
}

async function loadPostValidation(client) {
  return queryOne(
    client,
    `
      with card_print_collisions as (
        select count(*)::int as row_count
        from (
          select gv_id
          from public.card_prints
          where gv_id is not null
          group by gv_id
          having count(*) > 1
        ) dup
      )
      select
        (select count(*)::int from public.card_prints where set_code = $1 and gv_id like $2) as remaining_legacy_count,
        (select count(*)::int from public.card_prints where set_code = $1 and gv_id like $3) as new_namespace_count,
        (select row_count from card_print_collisions) as live_collision_count,
        (select count(*)::int from public.vault_items vi join public.card_prints cp on cp.id = vi.card_id where cp.set_code = $1 and vi.gv_id like $2) as remaining_legacy_vault_items_count,
        (select count(*)::int from public.shared_cards sc join public.card_prints cp on cp.id = sc.card_id where cp.set_code = $1 and sc.gv_id like $2) as remaining_legacy_shared_cards_count,
        (select count(*)::int from public.web_events where gv_id like $2) as remaining_legacy_web_events_count
    `,
    [TARGET_SET_CODE, `${LEGACY_PREFIX}%`, `${TARGET_PREFIX}%`],
  );
}

function assertPostValidation(summary, preconditions, applyOperations) {
  assertEqual(normalizeCount(applyOperations.updated_card_prints), EXPECTED.candidateCount, 'UPDATED_CARD_PRINTS_COUNT_DRIFT');
  assertEqual(normalizeCount(applyOperations.updated_vault_items), normalizeCount(preconditions?.vault_items_old_match_count), 'UPDATED_VAULT_ITEMS_COUNT_DRIFT');
  assertEqual(normalizeCount(applyOperations.updated_shared_cards), normalizeCount(preconditions?.shared_cards_old_match_count), 'UPDATED_SHARED_CARDS_COUNT_DRIFT');
  assertZero(summary?.remaining_legacy_count, 'REMAINING_LEGACY_CARD_PRINTS');
  assertEqual(normalizeCount(summary?.new_namespace_count), EXPECTED.candidateCount, 'NEW_NAMESPACE_COUNT_DRIFT');
  assertZero(summary?.live_collision_count, 'LIVE_GV_ID_COLLISIONS_AFTER');
  assertZero(summary?.remaining_legacy_vault_items_count, 'REMAINING_LEGACY_VAULT_ITEMS');
  assertZero(summary?.remaining_legacy_shared_cards_count, 'REMAINING_LEGACY_SHARED_CARDS');
}

async function loadSampleAfterRows(client) {
  return queryRows(
    client,
    `
      select
        id as card_print_id,
        name,
        number,
        gv_id
      from public.card_prints
      where set_code = $1
        and gv_id like $2
      order by
        case when number ~ '^SL[0-9]+$' then 1 else 0 end,
        nullif(regexp_replace(number, '^[^0-9]+', ''), '')::int,
        number,
        id
      limit 25
    `,
    [TARGET_SET_CODE, `${TARGET_PREFIX}%`],
  );
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    target_set_code: TARGET_SET_CODE,
    legacy_prefix: LEGACY_PREFIX,
    target_prefix: TARGET_PREFIX,
    preconditions: null,
    sample_rows_before: null,
    backup_artifacts: null,
    apply_operations: null,
    post_validation: null,
    sample_rows_after: null,
    routing_compatibility: {
      legacy_resolution_enabled: true,
      implementation_files: [
        'apps/web/src/lib/gvIdAlias.ts',
        'apps/web/src/lib/getPublicCardByGvId.ts',
        'apps/web/src/lib/getAdjacentPublicCardsByGvId.ts',
        'apps/web/src/lib/publicSearchResolver.ts',
        'apps/web/src/lib/cards/getPublicCardsByGvIds.ts',
        'apps/web/src/app/card/[gv_id]/page.tsx',
        'apps/web/src/app/card/[gv_id]/market/page.tsx',
      ],
    },
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `col1_namespace_migration_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');
    await buildTempCandidateSurface(client);

    report.preconditions = await loadPreconditionSummary(client);
    assertPreconditions(report.preconditions);
    report.sample_rows_before = await loadSampleRows(client);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.backup_artifacts = await createBackupArtifacts(
      client,
      report.sample_rows_before,
      report.preconditions,
    );

    report.apply_operations = await applyMigration(client);
    report.post_validation = await loadPostValidation(client);
    assertPostValidation(report.post_validation, report.preconditions, report.apply_operations);
    report.sample_rows_after = await loadSampleAfterRows(client);

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
    }

    report.status = 'failed';
    report.failure = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack ?? null : null,
    };
    console.error(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
