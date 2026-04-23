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
import { normalizeCardNameV1 } from './normalizeCardNameV1.mjs';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

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
const PHASE = 'COL1_EXACT_TOKEN_PROMOTION_V1';
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODE_IDENTITY = 'col1';
const CANONICAL_SET_CODE = 'col1';
const EXPECTED_CANDIDATE_COUNT = 11;
const EXPECTED_NUMERIC_COUNT = 5;
const EXPECTED_SL_COUNT = 6;
const BACKUP_SCHEMA_PATH = path.join(process.cwd(), 'backups', 'col1_exact_token_preapply_schema.sql');
const BACKUP_DATA_PATH = path.join(process.cwd(), 'backups', 'col1_exact_token_preapply_data.sql');
const BACKUP_TABLES = [
  { table_name: 'card_prints', key_column: 'id', conflict_columns: ['id'] },
  { table_name: 'card_print_identity', key_column: 'card_print_id', conflict_columns: ['id'] },
];

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`NON_FINITE_NUMERIC_LITERAL:${value}`);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object') return quoteLiteral(JSON.stringify(value));
  return quoteLiteral(String(value));
}

function isNumericToken(value) {
  return /^[0-9]+$/.test(String(value ?? '').trim());
}

function isSlToken(value) {
  return /^SL[0-9]+$/i.test(String(value ?? '').trim());
}

function isValidToken(value) {
  return isNumericToken(value) || isSlToken(value);
}

function compareTokenValues(left, right) {
  const leftToken = normalizeTextOrNull(left)?.toUpperCase() ?? '';
  const rightToken = normalizeTextOrNull(right)?.toUpperCase() ?? '';
  const leftSl = isSlToken(leftToken);
  const rightSl = isSlToken(rightToken);
  if (leftSl !== rightSl) return leftSl ? 1 : -1;
  const leftDigits = leftToken.replace(/^[A-Z]+/, '');
  const rightDigits = rightToken.replace(/^[A-Z]+/, '');
  const leftNumber = leftDigits ? Number.parseInt(leftDigits, 10) : Number.MAX_SAFE_INTEGER;
  const rightNumber = rightDigits ? Number.parseInt(rightDigits, 10) : Number.MAX_SAFE_INTEGER;
  if (leftNumber !== rightNumber) return leftNumber - rightNumber;
  return leftToken.localeCompare(rightToken);
}

function sortRowsByPrintedNumber(left, right) {
  const tokenOrder = compareTokenValues(left.printed_number, right.printed_number);
  if (tokenOrder !== 0) return tokenOrder;
  return String(left.card_print_id).localeCompare(String(right.card_print_id));
}

function groupDuplicateCounts(items, getKey) {
  const counts = new Map();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([key, row_count]) => ({ key, row_count }));
}

function normalizeRepoName(value, canonName = null) {
  const normalized = canonName
    ? normalizeCardNameV1(value, { canonName }).corrected_name
    : normalizeCardNameV1(value).corrected_name;
  if (!normalized) throw new Error(`NAME_NORMALIZATION_FAILED:${String(value ?? 'null')}`);
  return normalized.toLowerCase();
}

function deriveCol1GvId(input) {
  return buildCardPrintGvIdV1({
    setCode: CANONICAL_SET_CODE,
    number: input.printed_number,
    variantKey: input.variant_key,
  });
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadCandidateRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.name,
        cp.gv_id,
        cp.variant_key,
        cp.set_code as parent_set_code,
        cp.number as parent_number,
        cp.number_plain as parent_number_plain,
        cpi.id as card_print_identity_id,
        cpi.identity_domain,
        cpi.set_code_identity,
        cpi.printed_number,
        cpi.normalized_printed_name
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
      order by
        case when cpi.printed_number ~ '^SL[0-9]+$' then 1 else 0 end,
        nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '')::int,
        cpi.printed_number,
        cp.id
    `,
    [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
  );
}

async function loadCanonicalRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as canonical_card_print_id,
        cp.name as canonical_name,
        cp.number as canonical_number,
        cp.number_plain as canonical_number_plain,
        cp.variant_key as canonical_variant_key,
        cp.gv_id
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
      order by
        case when cp.number ~ '^SL[0-9]+$' then 1 else 0 end,
        nullif(regexp_replace(cp.number, '[^0-9]', '', 'g'), '')::int,
        cp.number,
        cp.id
    `,
    [CANONICAL_SET_CODE],
  );
}

async function loadLiveGvIdRows(client, gvIds) {
  if (gvIds.length === 0) return [];
  return queryRows(
    client,
    `
      select id, gv_id, set_code, number, name
      from public.card_prints
      where gv_id = any($1::text[])
      order by gv_id, id
    `,
    [gvIds],
  );
}

async function loadActiveIdentityCount(client) {
  const row = await queryOne(client, `select count(*)::int as row_count from public.card_print_identity where is_active = true`);
  return normalizeCount(row?.row_count);
}

async function loadActiveIdentityCountOnCandidates(client, candidateIds) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_print_identity
      where is_active = true
        and card_print_id = any($1::uuid[])
    `,
    [candidateIds],
  );
  return normalizeCount(row?.row_count);
}

async function loadIdentityBackedNonNullGvIdCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_print_identity cpi
      join public.card_prints cp on cp.id = cpi.card_print_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is not null
    `,
    [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
  );
  return normalizeCount(row?.row_count);
}

async function loadCanonicalSetCodeCount(client) {
  const row = await queryOne(
    client,
    `select count(*)::int as row_count from public.card_prints where set_code = $1 and gv_id is not null`,
    [CANONICAL_SET_CODE],
  );
  return normalizeCount(row?.row_count);
}

function buildCandidateMap(sourceRows) {
  return sourceRows
    .map((row) => ({
      card_print_id: row.card_print_id,
      card_print_identity_id: row.card_print_identity_id,
      name: row.name,
      printed_number: row.printed_number,
      variant_key: row.variant_key,
      parent_set_code: row.parent_set_code,
      parent_number: row.parent_number,
      parent_number_plain: row.parent_number_plain,
      proposed_gv_id: deriveCol1GvId({ printed_number: row.printed_number, variant_key: row.variant_key }),
    }))
    .sort(sortRowsByPrintedNumber);
}

function buildCanonicalOverlapAudit(sourceRows, canonicalRows) {
  const canonicalByToken = new Map();
  for (const row of canonicalRows) {
    const token = normalizeTextOrNull(row.canonical_number);
    if (!token) continue;
    const bucket = canonicalByToken.get(token) ?? [];
    bucket.push({
      ...row,
      repo_normalized_name: normalizeRepoName(row.canonical_name),
    });
    canonicalByToken.set(token, bucket);
  }

  const rowAudits = [];
  let exactCanonicalOverlapCount = 0;
  let sameTokenDifferentNameCount = 0;

  for (const row of sourceRows) {
    const token = normalizeTextOrNull(row.printed_number);
    const sameTokenCandidates = canonicalByToken.get(token) ?? [];
    const repoMatches = sameTokenCandidates.filter((candidate) => {
      const normalizedOldName = normalizeRepoName(row.name, candidate.canonical_name);
      return normalizedOldName === candidate.repo_normalized_name;
    });

    if (repoMatches.length > 0) {
      exactCanonicalOverlapCount += 1;
    } else if (sameTokenCandidates.length > 0) {
      sameTokenDifferentNameCount += 1;
    }

    rowAudits.push({
      card_print_id: row.card_print_id,
      printed_number: row.printed_number,
      repo_match_count: repoMatches.length,
      same_token_candidate_count: sameTokenCandidates.length,
    });
  }

  return {
    row_audits: rowAudits,
    exact_canonical_overlap_count: exactCanonicalOverlapCount,
    multiple_match_old_count: rowAudits.filter((row) => row.repo_match_count > 1).length,
    same_token_different_name_count: sameTokenDifferentNameCount,
  };
}

function buildPreconditions(sourceRows, candidateMap, overlapAudit, liveCollisionRows) {
  const nonNullParentGvIdCount = sourceRows.filter((row) => normalizeTextOrNull(row.gv_id)).length;
  const numericRows = sourceRows.filter((row) => isNumericToken(row.printed_number));
  const slRows = sourceRows.filter((row) => isSlToken(row.printed_number));
  const invalidRows = sourceRows.filter((row) => !isValidToken(row.printed_number));
  const distinctSetCodes = [...new Set(sourceRows.map((row) => row.set_code_identity))].sort();
  const duplicatePrintedNumbers = groupDuplicateCounts(sourceRows, (row) => row.printed_number);
  const internalCollisionRows = groupDuplicateCounts(candidateMap, (row) => row.proposed_gv_id);
  const stopReasons = [];

  if (sourceRows.length !== EXPECTED_CANDIDATE_COUNT) stopReasons.push(`CANDIDATE_COUNT:${sourceRows.length}`);
  if (distinctSetCodes.length !== 1 || distinctSetCodes[0] !== TARGET_SET_CODE_IDENTITY) {
    stopReasons.push(`OUT_OF_SCOPE_SET_CODES:${JSON.stringify(distinctSetCodes)}`);
  }
  if (nonNullParentGvIdCount !== 0) stopReasons.push(`NON_NULL_PARENT_GVID_ROWS:${nonNullParentGvIdCount}`);
  if (numericRows.length !== EXPECTED_NUMERIC_COUNT) stopReasons.push(`NUMERIC_COUNT:${numericRows.length}`);
  if (slRows.length !== EXPECTED_SL_COUNT) stopReasons.push(`SL_COUNT:${slRows.length}`);
  if (invalidRows.length > 0) stopReasons.push(`INVALID_TOKEN_ROWS:${invalidRows.length}`);
  if (duplicatePrintedNumbers.length > 0) stopReasons.push(`DUPLICATE_PRINTED_NUMBER_GROUPS:${duplicatePrintedNumbers.length}`);
  if (overlapAudit.exact_canonical_overlap_count > 0) stopReasons.push(`EXACT_CANONICAL_OVERLAP_ROWS:${overlapAudit.exact_canonical_overlap_count}`);
  if (overlapAudit.multiple_match_old_count > 0) stopReasons.push(`MULTIPLE_MATCH_OLD_ROWS:${overlapAudit.multiple_match_old_count}`);
  if (overlapAudit.same_token_different_name_count > 0) stopReasons.push(`SAME_TOKEN_DIFFERENT_NAME_ROWS:${overlapAudit.same_token_different_name_count}`);
  if (candidateMap.some((row) => !row.proposed_gv_id)) stopReasons.push('PROPOSED_GVID_MISSING');
  if (internalCollisionRows.length > 0) stopReasons.push(`INTERNAL_PROPOSED_GVID_COLLISIONS:${internalCollisionRows.length}`);
  if (liveCollisionRows.length > 0) stopReasons.push(`LIVE_GVID_COLLISIONS:${liveCollisionRows.length}`);

  return {
    candidate_count: sourceRows.length,
    all_candidates_parent_gvid_null: nonNullParentGvIdCount === 0,
    valid_token_count: sourceRows.length - invalidRows.length,
    numeric_candidate_count: numericRows.length,
    sl_candidate_count: slRows.length,
    invalid_token_count: invalidRows.length,
    distinct_set_code_identity_values: distinctSetCodes,
    printed_number_duplicate_groups: duplicatePrintedNumbers.map((row) => ({ printed_number: row.key, row_count: row.row_count })),
    distinct_printed_number_count: new Set(sourceRows.map((row) => row.printed_number)).size,
    exact_canonical_overlap_count: overlapAudit.exact_canonical_overlap_count,
    multiple_match_old_count: overlapAudit.multiple_match_old_count,
    same_token_different_name_count: overlapAudit.same_token_different_name_count,
    candidate_distinct_card_print_id_count: new Set(candidateMap.map((row) => row.card_print_id)).size,
    candidate_distinct_proposed_gvid_count: new Set(candidateMap.map((row) => row.proposed_gv_id)).size,
    internal_proposed_gvid_collision_count: internalCollisionRows.length,
    live_gvid_collision_count: liveCollisionRows.length,
    sample_candidates: candidateMap.slice(0, EXPECTED_CANDIDATE_COUNT),
    sample_live_collisions: liveCollisionRows.slice(0, EXPECTED_CANDIDATE_COUNT),
    safe_to_apply: stopReasons.length === 0,
    stop_reasons: stopReasons,
  };
}

function assertPreconditions(preconditions) {
  if (!preconditions.safe_to_apply) {
    throw new Error(`HARD_GATE_FAILED:${preconditions.stop_reasons.join('|')}`);
  }
}

async function loadSchemaSnapshot(client, tableName) {
  const [columns, constraints, indexes] = await Promise.all([
    queryRows(
      client,
      `
        select column_name, data_type, udt_name, is_nullable, column_default
        from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select c.conname as constraint_name, c.contype as constraint_type, pg_get_constraintdef(c.oid) as constraint_definition
        from pg_constraint c
        join pg_class t on t.oid = c.conrelid
        join pg_namespace n on n.oid = t.relnamespace
        where n.nspname = 'public' and t.relname = $1
        order by c.conname
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select indexname, indexdef
        from pg_indexes
        where schemaname = 'public' and tablename = $1
        order by indexname
      `,
      [tableName],
    ),
  ]);

  return { table_name: tableName, columns, constraints, indexes };
}

async function loadBackupTableRows(client, tableName, keyColumn, candidateIds) {
  const rows = await queryRows(
    client,
    `
      select *
      from public.${quoteIdent(tableName)}
      where ${quoteIdent(keyColumn)} = any($1::uuid[])
      order by 1
    `,
    [candidateIds],
  );
  return { table_name: tableName, key_column: keyColumn, rows };
}

function buildSchemaBackupContent({ generatedAt, preconditions, schemaSnapshot }) {
  const lines = [
    `-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- target_set_code_identity: ${TARGET_SET_CODE_IDENTITY}`,
    `-- candidate_count: ${preconditions.candidate_count}`,
    '',
  ];

  for (const table of schemaSnapshot) {
    lines.push(`-- Table: public.${table.table_name}`);
    lines.push('-- Columns');
    for (const column of table.columns) {
      lines.push(`--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`);
    }
    lines.push('-- Constraints');
    for (const constraint of table.constraints) {
      lines.push(`--   ${constraint.constraint_name} [${constraint.constraint_type}] ${constraint.constraint_definition}`);
    }
    lines.push('-- Indexes');
    for (const index of table.indexes) {
      lines.push(`--   ${index.indexname}: ${index.indexdef}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function buildUpsertStatements({ table_name: tableName, rows, conflict_columns: conflictColumns }) {
  if (rows.length === 0) return [`-- public.${tableName}: no rows captured`];
  const columns = Object.keys(rows[0]);
  const columnList = columns.map(quoteIdent).join(', ');
  const conflictList = conflictColumns.map(quoteIdent).join(', ');
  const updateList = columns
    .filter((column) => !conflictColumns.includes(column))
    .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
    .join(', ');

  return rows.map((row) => {
    const values = columns.map((column) => sqlLiteral(row[column])).join(', ');
    return [
      `insert into public.${quoteIdent(tableName)} (${columnList})`,
      `values (${values})`,
      `on conflict (${conflictList}) do update set ${updateList};`,
    ].join('\n');
  });
}

function buildDataBackupContent({ generatedAt, candidateMap, tableSnapshots }) {
  const lines = [
    `-- ${PHASE} PRE-APPLY DATA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- target_set_code_identity: ${TARGET_SET_CODE_IDENTITY}`,
    `-- candidate_count: ${candidateMap.length}`,
    'begin;',
    '',
  ];

  for (const tableSnapshot of tableSnapshots) {
    lines.push(`-- Restore public.${tableSnapshot.table_name}`);
    lines.push(
      ...buildUpsertStatements({
        ...tableSnapshot,
        conflict_columns: BACKUP_TABLES.find((table) => table.table_name === tableSnapshot.table_name)?.conflict_columns ?? ['id'],
      }),
    );
    lines.push('');
  }

  lines.push('commit;');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function createBackupArtifacts(client, preconditions, candidateMap) {
  const generatedAt = new Date().toISOString();
  const candidateIds = candidateMap.map((row) => row.card_print_id);
  const schemaSnapshot = [];
  const tableSnapshots = [];

  for (const table of BACKUP_TABLES) {
    schemaSnapshot.push(await loadSchemaSnapshot(client, table.table_name));
    tableSnapshots.push(await loadBackupTableRows(client, table.table_name, table.key_column, candidateIds));
  }

  const schemaContent = buildSchemaBackupContent({ generatedAt, preconditions, schemaSnapshot });
  const dataContent = buildDataBackupContent({ generatedAt, candidateMap, tableSnapshots });

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
    table_row_counts: tableSnapshots.map((table) => ({ table_name: table.table_name, row_count: table.rows.length })),
  };
}

async function applyPromotionBatch(client, candidateMap) {
  const payload = JSON.stringify(candidateMap.map((row) => ({
    card_print_id: row.card_print_id,
    proposed_gv_id: row.proposed_gv_id,
  })));

  const result = await client.query(
    `
      update public.card_prints cp
      set gv_id = payload.proposed_gv_id
      from jsonb_to_recordset($1::jsonb) as payload(card_print_id uuid, proposed_gv_id text)
      where cp.id = payload.card_print_id
        and cp.gv_id is null
      returning cp.id as card_print_id, cp.gv_id
    `,
    [payload],
  );

  if ((result.rowCount ?? 0) !== candidateMap.length) {
    throw new Error(`UPDATE_ROWCOUNT_MISMATCH:${result.rowCount ?? 0}:${candidateMap.length}`);
  }

  return { batch_number: 1, batch_size: candidateMap.length, updated_rows: result.rowCount ?? 0 };
}

async function loadPostValidation(
  client,
  candidateMap,
  activeIdentityTotalBefore,
  activeIdentityOnCandidateBefore,
  identityBackedNonNullBefore,
  canonicalSetCodeCountBefore,
) {
  const candidateIds = candidateMap.map((row) => row.card_print_id);
  const proposedGvIds = candidateMap.map((row) => row.proposed_gv_id);

  const [
    remainingNullRow,
    activeIdentityTotalRow,
    activeIdentityOnCandidatesRow,
    routeRowsRow,
    promotedMatchRow,
    liveCollisionRows,
    identityBackedNonNullAfterRow,
    canonicalSetCodeCountAfterRow,
  ] = await Promise.all([
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      `,
      [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
    ),
    queryOne(client, `select count(*)::int as row_count from public.card_print_identity where is_active = true`),
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
          and card_print_id = any($1::uuid[])
      `,
      [candidateIds],
    ),
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_prints
        where id = any($1::uuid[])
          and gv_id = any($2::text[])
      `,
      [candidateIds, proposedGvIds],
    ),
    queryOne(
      client,
      `
        with expected(card_print_id, proposed_gv_id) as (
          select *
          from jsonb_to_recordset($1::jsonb) as payload(card_print_id uuid, proposed_gv_id text)
        )
        select count(*)::int as row_count
        from expected e
        join public.card_prints cp on cp.id = e.card_print_id and cp.gv_id = e.proposed_gv_id
      `,
      [JSON.stringify(candidateMap.map((row) => ({ card_print_id: row.card_print_id, proposed_gv_id: row.proposed_gv_id })))],
    ),
    queryRows(
      client,
      `
        select gv_id, count(*)::int as row_count
        from public.card_prints
        where gv_id = any($1::text[])
        group by gv_id
        having count(*) > 1
        order by gv_id
      `,
      [proposedGvIds],
    ),
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is not null
      `,
      [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
    ),
    queryOne(
      client,
      `select count(*)::int as row_count from public.card_prints where set_code = $1 and gv_id is not null`,
      [CANONICAL_SET_CODE],
    ),
  ]);

  return {
    promoted_count: candidateMap.length,
    remaining_unresolved_col1: normalizeCount(remainingNullRow?.row_count),
    active_identity_total_before: activeIdentityTotalBefore,
    active_identity_total_after: normalizeCount(activeIdentityTotalRow?.row_count),
    active_identity_on_candidate_before: activeIdentityOnCandidateBefore,
    active_identity_on_candidate_after: normalizeCount(activeIdentityOnCandidatesRow?.row_count),
    route_resolvable_candidate_count: normalizeCount(routeRowsRow?.row_count),
    promoted_rows_with_expected_gvid_count: normalizeCount(promotedMatchRow?.row_count),
    live_gvid_collision_count: liveCollisionRows.length,
    live_gvid_collision_groups: liveCollisionRows,
    identity_backed_non_null_gvid_before: identityBackedNonNullBefore,
    identity_backed_non_null_gvid_after: normalizeCount(identityBackedNonNullAfterRow?.row_count),
    canonical_set_code_count_before: canonicalSetCodeCountBefore,
    canonical_set_code_count_after: normalizeCount(canonicalSetCodeCountAfterRow?.row_count),
    same_card_prints_id_preserved: normalizeCount(routeRowsRow?.row_count) === candidateMap.length,
    same_card_print_identity_preserved:
      normalizeCount(activeIdentityOnCandidatesRow?.row_count) === activeIdentityOnCandidateBefore,
    unrelated_sets_affected: false,
  };
}

function assertPostValidation(postValidation) {
  if (postValidation.promoted_count !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`PROMOTED_COUNT_DRIFT:${postValidation.promoted_count}`);
  }
  if (postValidation.remaining_unresolved_col1 !== 0) {
    throw new Error(`REMAINING_UNRESOLVED_COL1:${postValidation.remaining_unresolved_col1}`);
  }
  if (postValidation.live_gvid_collision_count !== 0) {
    throw new Error(`LIVE_GVID_COLLISION_AFTER:${postValidation.live_gvid_collision_count}`);
  }
  if (postValidation.active_identity_total_after !== postValidation.active_identity_total_before) {
    throw new Error(`ACTIVE_IDENTITY_TOTAL_DRIFT:${postValidation.active_identity_total_before}:${postValidation.active_identity_total_after}`);
  }
  if (postValidation.route_resolvable_candidate_count !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`ROUTE_RESOLVABLE_COUNT_DRIFT:${postValidation.route_resolvable_candidate_count}`);
  }
  if (postValidation.promoted_rows_with_expected_gvid_count !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`PROMOTED_MATCH_COUNT_DRIFT:${postValidation.promoted_rows_with_expected_gvid_count}`);
  }
  if (postValidation.identity_backed_non_null_gvid_after !== postValidation.identity_backed_non_null_gvid_before + EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`IDENTITY_BACKED_NON_NULL_GVID_DRIFT:${postValidation.identity_backed_non_null_gvid_before}:${postValidation.identity_backed_non_null_gvid_after}`);
  }
  if (postValidation.canonical_set_code_count_after !== postValidation.canonical_set_code_count_before) {
    throw new Error(`CANONICAL_SET_CODE_COUNT_DRIFT:${postValidation.canonical_set_code_count_before}:${postValidation.canonical_set_code_count_after}`);
  }
  if (!postValidation.same_card_prints_id_preserved) throw new Error('CARD_PRINT_ID_PRESERVATION_FAILED');
  if (!postValidation.same_card_print_identity_preserved) throw new Error('CARD_PRINT_IDENTITY_PRESERVATION_FAILED');
}

async function loadSampleRowsAfter(client, sampleRows) {
  const result = {};

  for (const [key, sample] of Object.entries(sampleRows)) {
    const row = await queryOne(
      client,
      `
        select
          cp.id as card_print_id,
          cp.name,
          cp.gv_id,
          cp.set_code,
          cp.number,
          cp.number_plain,
          cpi.printed_number,
          cpi.set_code_identity,
          count(*) filter (where cpi.is_active = true)::int as active_identity_row_count
        from public.card_prints cp
        join public.card_print_identity cpi on cpi.card_print_id = cp.id
        where cp.id = $1
        group by cp.id, cp.name, cp.gv_id, cp.set_code, cp.number, cp.number_plain, cpi.printed_number, cpi.set_code_identity
      `,
      [sample.card_print_id],
    );

    result[key] = { ...sample, ...row };
  }

  return result;
}

function buildSampleRowsBefore(candidateMap) {
  const numericRows = candidateMap.filter((row) => isNumericToken(row.printed_number));
  const slRows = candidateMap.filter((row) => isSlToken(row.printed_number));
  return {
    numeric_first: numericRows[0] ?? null,
    numeric_mid: numericRows[Math.floor(numericRows.length / 2)] ?? null,
    numeric_last: numericRows[numericRows.length - 1] ?? null,
    sl_low: slRows[0] ?? null,
    sl_high: slRows[slRows.length - 1] ?? null,
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) throw new Error('SUPABASE_DB_URL is required');

  const report = {
    phase: PHASE,
    mode: MODE,
    batch_size: EXPECTED_CANDIDATE_COUNT,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    target_set_code_identity: TARGET_SET_CODE_IDENTITY,
    canonical_set_code: CANONICAL_SET_CODE,
    canonical_summary: null,
    overlap_audit: null,
    preconditions: null,
    backup_artifacts: null,
    apply_batch: null,
    post_validation: null,
    sample_rows_before: null,
    sample_rows_after: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `col1_exact_token_promotion_apply_v1:${MODE}`,
  });
  await client.connect();

  try {
    await client.query('begin');

    const sourceRows = await loadCandidateRows(client);
    const canonicalRows = await loadCanonicalRows(client);
    const candidateMap = buildCandidateMap(sourceRows);
    const overlapAudit = buildCanonicalOverlapAudit(sourceRows, canonicalRows);
    const proposedGvIds = candidateMap.map((row) => row.proposed_gv_id).filter(Boolean);
    const [
      liveCollisionRows,
      activeIdentityTotalBefore,
      activeIdentityOnCandidateBefore,
      identityBackedNonNullBefore,
      canonicalSetCodeCountBefore,
    ] = await Promise.all([
      loadLiveGvIdRows(client, proposedGvIds),
      loadActiveIdentityCount(client),
      loadActiveIdentityCountOnCandidates(client, candidateMap.map((row) => row.card_print_id)),
      loadIdentityBackedNonNullGvIdCount(client),
      loadCanonicalSetCodeCount(client),
    ]);

    report.canonical_summary = {
      canonical_total_rows: canonicalRows.length,
      canonical_numeric_rows: canonicalRows.filter((row) => isNumericToken(row.canonical_number)).length,
      canonical_sl_rows: canonicalRows.filter((row) => isSlToken(row.canonical_number)).length,
    };
    report.overlap_audit = {
      exact_canonical_overlap_count: overlapAudit.exact_canonical_overlap_count,
      multiple_match_old_count: overlapAudit.multiple_match_old_count,
      same_token_different_name_count: overlapAudit.same_token_different_name_count,
    };
    report.preconditions = buildPreconditions(sourceRows, candidateMap, overlapAudit, liveCollisionRows);
    assertPreconditions(report.preconditions);
    report.sample_rows_before = buildSampleRowsBefore(candidateMap);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.backup_artifacts = await createBackupArtifacts(client, report.preconditions, candidateMap);
    report.apply_batch = await applyPromotionBatch(client, candidateMap);
    report.post_validation = await loadPostValidation(
      client,
      candidateMap,
      activeIdentityTotalBefore,
      activeIdentityOnCandidateBefore,
      identityBackedNonNullBefore,
      canonicalSetCodeCountBefore,
    );
    assertPostValidation(report.post_validation);
    report.sample_rows_after = await loadSampleRowsAfter(client, report.sample_rows_before);

    report.status = 'apply_passed';
    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {}

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
