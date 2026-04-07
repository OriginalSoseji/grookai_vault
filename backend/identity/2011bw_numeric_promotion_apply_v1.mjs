import '../env.mjs';
import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import { buildCardPrintGvIdV1 } from '../warehouse/buildCardPrintGvIdV1.mjs';

const PHASE = 'NUMERIC_PROMOTION_FOR_2011BW_V1';
const MODE = process.argv.includes('--apply') ? 'apply' : 'dry-run';
const TARGET_IDENTITY_DOMAIN = 'pokemon_eng_standard';
const TARGET_SET_CODE_IDENTITY = '2011bw';
const EXPECTED_CANDIDATE_COUNT = 12;
const BATCH_SIZE = 12;
const BACKUP_SCHEMA_PATH = path.join(process.cwd(), 'backups', '2011bw_preapply_schema.sql');
const BACKUP_DATA_PATH = path.join(process.cwd(), 'backups', '2011bw_preapply_data.sql');

const BACKUP_TABLES = [
  { table_name: 'card_prints', key_column: 'id', conflict_columns: ['id'] },
  { table_name: 'card_print_identity', key_column: 'card_print_id', conflict_columns: ['id'] },
];

function normalizeTextOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`NON_FINITE_NUMERIC_LITERAL:${value}`);
    }
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    return quoteLiteral(JSON.stringify(value));
  }
  return quoteLiteral(String(value));
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function sortRowsByPrintedNumber(left, right) {
  const leftNumber = normalizeTextOrNull(left.printed_number) ?? '';
  const rightNumber = normalizeTextOrNull(right.printed_number) ?? '';
  const numberOrder = leftNumber.localeCompare(rightNumber, 'en', { numeric: true });
  if (numberOrder !== 0) {
    return numberOrder;
  }
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
        cpi.id as card_print_identity_id,
        cpi.identity_domain,
        cpi.set_code_identity,
        cpi.printed_number,
        cpi.normalized_printed_name,
        s.printed_set_abbrev,
        s.printed_total
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      left join public.sets s
        on s.id = cp.set_id
      where cpi.is_active = true
        and cpi.identity_domain = $1
        and cpi.set_code_identity = $2
        and cp.gv_id is null
      order by cpi.printed_number::int, cp.id
    `,
    [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
  );
}

async function loadCanonicalBaseRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as canonical_card_print_id,
        cp.name as canonical_name,
        cp.number as canonical_number,
        cp.gv_id
      from public.card_prints cp
      where cp.gv_id is not null
        and cp.set_code = $1
      order by cp.number, cp.id
    `,
    [TARGET_SET_CODE_IDENTITY],
  );
}

async function loadExactCanonicalOverlapRows(client) {
  return queryRows(
    client,
    `
      select
        source.card_print_id,
        source.name,
        source.printed_number,
        canon.id as canonical_card_print_id,
        canon.name as canonical_name,
        canon.number as canonical_number,
        canon.gv_id
      from (
        select
          cp.id as card_print_id,
          cp.name,
          cpi.printed_number,
          cpi.normalized_printed_name
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      ) source
      join public.card_prints canon
        on canon.gv_id is not null
       and canon.set_code = $2
       and canon.number = source.printed_number
       and lower(regexp_replace(btrim(canon.name), '\\s+', ' ', 'g')) = source.normalized_printed_name
      order by source.printed_number::int, source.card_print_id
    `,
    [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
  );
}

function buildCandidateMap(sourceRows) {
  return sourceRows
    .map((row) => {
      const printedSetAbbrev = normalizeTextOrNull(row.printed_set_abbrev);
      const proposedGvId = printedSetAbbrev
        ? buildCardPrintGvIdV1({
            setCode: row.set_code_identity,
            printedSetAbbrev,
            number: row.printed_number,
            variantKey: row.variant_key,
          })
        : null;

      return {
        card_print_id: row.card_print_id,
        card_print_identity_id: row.card_print_identity_id,
        name: row.name,
        printed_number: row.printed_number,
        printed_set_abbrev: printedSetAbbrev,
        printed_total: row.printed_total,
        variant_key: row.variant_key,
        parent_set_code: row.parent_set_code,
        proposed_gv_id: proposedGvId,
      };
    })
    .sort(sortRowsByPrintedNumber);
}

async function loadLiveGvIdRows(client, gvIds) {
  if (gvIds.length === 0) {
    return [];
  }

  return queryRows(
    client,
    `
      select
        id,
        gv_id,
        set_code,
        number,
        name
      from public.card_prints
      where gv_id = any($1::text[])
      order by gv_id, id
    `,
    [gvIds],
  );
}

async function loadActiveIdentityCount(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.card_print_identity
      where is_active = true
    `,
  );

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

function buildPreconditions(sourceRows, canonicalBaseRows, exactCanonicalOverlapRows, candidateMap, liveCollisionRows) {
  const nonNullParentGvIdCount = sourceRows.filter((row) => normalizeTextOrNull(row.gv_id)).length;
  const numericRows = sourceRows.filter((row) => /^[0-9]+$/.test(normalizeTextOrNull(row.printed_number) ?? ''));
  const nonNumericRows = sourceRows.filter((row) => !/^[0-9]+$/.test(normalizeTextOrNull(row.printed_number) ?? ''));
  const distinctSetCodes = [...new Set(sourceRows.map((row) => row.set_code_identity))].sort();
  const printedSetAbbrevValues = [...new Set(sourceRows.map((row) => normalizeTextOrNull(row.printed_set_abbrev)).filter(Boolean))].sort();
  const printedTotalValues = [...new Set(sourceRows.map((row) => row.printed_total).filter((value) => value != null))]
    .sort((a, b) => Number(a) - Number(b));
  const duplicatePrintedNumbers = groupDuplicateCounts(sourceRows, (row) => row.printed_number);
  const internalCollisionRows = groupDuplicateCounts(candidateMap, (row) => row.proposed_gv_id);
  const stopReasons = [];

  if (sourceRows.length !== EXPECTED_CANDIDATE_COUNT) {
    stopReasons.push(`CANDIDATE_COUNT:${sourceRows.length}`);
  }
  if (distinctSetCodes.length !== 1 || distinctSetCodes[0] !== TARGET_SET_CODE_IDENTITY) {
    stopReasons.push(`OUT_OF_SCOPE_SET_CODES:${JSON.stringify(distinctSetCodes)}`);
  }
  if (nonNullParentGvIdCount !== 0) {
    stopReasons.push(`NON_NULL_PARENT_GVID_ROWS:${nonNullParentGvIdCount}`);
  }
  if (nonNumericRows.length > 0) {
    stopReasons.push(`NON_NUMERIC_ROWS:${nonNumericRows.length}`);
  }
  if (duplicatePrintedNumbers.length > 0) {
    stopReasons.push(`DUPLICATE_PRINTED_NUMBER_GROUPS:${duplicatePrintedNumbers.length}`);
  }
  if (printedSetAbbrevValues.length !== 1) {
    stopReasons.push(`PRINTED_SET_ABBREV_DRIFT:${printedSetAbbrevValues.length}`);
  }
  if (canonicalBaseRows.length > 0) {
    stopReasons.push(`CANONICAL_BASE_ROWS_PRESENT:${canonicalBaseRows.length}`);
  }
  if (exactCanonicalOverlapRows.length > 0) {
    stopReasons.push(`EXACT_CANONICAL_OVERLAP_ROWS:${exactCanonicalOverlapRows.length}`);
  }
  if (candidateMap.some((row) => !row.proposed_gv_id)) {
    stopReasons.push('PROPOSED_GVID_MISSING');
  }
  if (internalCollisionRows.length > 0) {
    stopReasons.push(`INTERNAL_PROPOSED_GVID_COLLISIONS:${internalCollisionRows.length}`);
  }
  if (liveCollisionRows.length > 0) {
    stopReasons.push(`LIVE_GVID_COLLISIONS:${liveCollisionRows.length}`);
  }

  return {
    candidate_count: sourceRows.length,
    all_candidates_parent_gvid_null: nonNullParentGvIdCount === 0,
    numeric_candidate_count: numericRows.length,
    non_numeric_candidate_count: nonNumericRows.length,
    distinct_set_code_identity_values: distinctSetCodes,
    printed_number_duplicate_groups: duplicatePrintedNumbers.map((row) => ({
      printed_number: row.key,
      row_count: row.row_count,
    })),
    distinct_printed_number_count: new Set(sourceRows.map((row) => row.printed_number)).size,
    printed_set_abbrev_present_for_all: printedSetAbbrevValues.length === 1,
    printed_set_abbrev_values: printedSetAbbrevValues,
    printed_total_values: printedTotalValues,
    canonical_base_count: canonicalBaseRows.length,
    exact_canonical_overlap_count: exactCanonicalOverlapRows.length,
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
    ),
    queryRows(
      client,
      `
        select
          c.conname as constraint_name,
          c.contype as constraint_type,
          pg_get_constraintdef(c.oid) as constraint_definition
        from pg_constraint c
        join pg_class t
          on t.oid = c.conrelid
        join pg_namespace n
          on n.oid = t.relnamespace
        where n.nspname = 'public'
          and t.relname = $1
        order by c.conname
      `,
      [tableName],
    ),
    queryRows(
      client,
      `
        select
          indexname,
          indexdef
        from pg_indexes
        where schemaname = 'public'
          and tablename = $1
        order by indexname
      `,
      [tableName],
    ),
  ]);

  return {
    table_name: tableName,
    columns,
    constraints,
    indexes,
  };
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

  return {
    table_name: tableName,
    key_column: keyColumn,
    rows,
  };
}

function buildSchemaBackupContent({ generatedAt, preconditions, schemaSnapshot }) {
  const lines = [
    `-- ${PHASE} PRE-APPLY SCHEMA SNAPSHOT`,
    `-- Generated at: ${generatedAt}`,
    `-- Mode: ${MODE}`,
    `-- target_set_code_identity: ${TARGET_SET_CODE_IDENTITY}`,
    `-- candidate_count: ${preconditions.candidate_count}`,
    `-- printed_set_abbrev: ${preconditions.printed_set_abbrev_values.join(', ')}`,
    '',
  ];

  for (const table of schemaSnapshot) {
    lines.push(`-- Table: public.${table.table_name}`);
    lines.push('-- Columns');
    for (const column of table.columns) {
      lines.push(
        `--   ${column.column_name} ${column.data_type} (${column.udt_name}) nullable=${column.is_nullable} default=${column.column_default ?? 'null'}`,
      );
    }
    lines.push('-- Constraints');
    for (const constraint of table.constraints) {
      lines.push(
        `--   ${constraint.constraint_name} [${constraint.constraint_type}] ${constraint.constraint_definition}`,
      );
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
  if (rows.length === 0) {
    return [`-- public.${tableName}: no rows captured`];
  }

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
        conflict_columns:
          BACKUP_TABLES.find((table) => table.table_name === tableSnapshot.table_name)?.conflict_columns ?? ['id'],
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

  const schemaContent = buildSchemaBackupContent({
    generatedAt,
    preconditions,
    schemaSnapshot,
  });
  const dataContent = buildDataBackupContent({
    generatedAt,
    candidateMap,
    tableSnapshots,
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

async function applyPromotionBatch(client, candidateMap) {
  const payload = JSON.stringify(
    candidateMap.map((row) => ({
      card_print_id: row.card_print_id,
      proposed_gv_id: row.proposed_gv_id,
    })),
  );

  const result = await client.query(
    `
      update public.card_prints cp
      set gv_id = payload.proposed_gv_id
      from jsonb_to_recordset($1::jsonb) as payload(
        card_print_id uuid,
        proposed_gv_id text
      )
      where cp.id = payload.card_print_id
        and cp.gv_id is null
      returning cp.id as card_print_id, cp.gv_id
    `,
    [payload],
  );

  if ((result.rowCount ?? 0) !== candidateMap.length) {
    throw new Error(`UPDATE_ROWCOUNT_MISMATCH:${result.rowCount ?? 0}:${candidateMap.length}`);
  }

  return {
    batch_number: 1,
    batch_size: candidateMap.length,
    updated_rows: result.rowCount ?? 0,
  };
}

async function loadPostValidation(client, candidateMap, activeIdentityTotalBefore, activeIdentityOnCandidateBefore) {
  const candidateIds = candidateMap.map((row) => row.card_print_id);
  const proposedGvIds = candidateMap.map((row) => row.proposed_gv_id);

  const [
    remainingNullRow,
    activeIdentityTotalRow,
    activeIdentityOnCandidatesRow,
    routeRowsRow,
    promotedMatchRow,
    liveCollisionRows,
  ] = await Promise.all([
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cpi.is_active = true
          and cpi.identity_domain = $1
          and cpi.set_code_identity = $2
          and cp.gv_id is null
      `,
      [TARGET_IDENTITY_DOMAIN, TARGET_SET_CODE_IDENTITY],
    ),
    queryOne(
      client,
      `
        select count(*)::int as row_count
        from public.card_print_identity
        where is_active = true
      `,
    ),
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
          from jsonb_to_recordset($1::jsonb) as payload(
            card_print_id uuid,
            proposed_gv_id text
          )
        )
        select count(*)::int as row_count
        from expected e
        join public.card_prints cp
          on cp.id = e.card_print_id
         and cp.gv_id = e.proposed_gv_id
      `,
      [
        JSON.stringify(
          candidateMap.map((row) => ({
            card_print_id: row.card_print_id,
            proposed_gv_id: row.proposed_gv_id,
          })),
        ),
      ],
    ),
    queryRows(
      client,
      `
        select
          gv_id,
          count(*)::int as row_count
        from public.card_prints
        where gv_id = any($1::text[])
        group by gv_id
        having count(*) > 1
        order by gv_id
      `,
      [proposedGvIds],
    ),
  ]);

  return {
    promoted_total: candidateMap.length,
    remaining_null_gvid_in_2011bw: normalizeCount(remainingNullRow?.row_count),
    active_identity_total_before: activeIdentityTotalBefore,
    active_identity_total_after: normalizeCount(activeIdentityTotalRow?.row_count),
    active_identity_on_candidate_before: activeIdentityOnCandidateBefore,
    active_identity_on_candidate_after: normalizeCount(activeIdentityOnCandidatesRow?.row_count),
    route_resolvable_candidate_count: normalizeCount(routeRowsRow?.row_count),
    promoted_rows_with_expected_gvid_count: normalizeCount(promotedMatchRow?.row_count),
    live_gvid_collision_count: liveCollisionRows.length,
    live_gvid_collision_groups: liveCollisionRows,
    same_card_prints_id_preserved: normalizeCount(routeRowsRow?.row_count) === candidateMap.length,
    same_card_print_identity_preserved:
      normalizeCount(activeIdentityOnCandidatesRow?.row_count) === activeIdentityOnCandidateBefore,
    unrelated_sets_affected: false,
  };
}

function assertPostValidation(postValidation) {
  if (postValidation.promoted_total !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`PROMOTED_TOTAL_DRIFT:${postValidation.promoted_total}`);
  }
  if (postValidation.remaining_null_gvid_in_2011bw !== 0) {
    throw new Error(`REMAINING_NULL_GVID:${postValidation.remaining_null_gvid_in_2011bw}`);
  }
  if (postValidation.live_gvid_collision_count !== 0) {
    throw new Error(`LIVE_GVID_COLLISION_AFTER:${postValidation.live_gvid_collision_count}`);
  }
  if (postValidation.active_identity_total_after !== postValidation.active_identity_total_before) {
    throw new Error(
      `ACTIVE_IDENTITY_TOTAL_DRIFT:${postValidation.active_identity_total_before}:${postValidation.active_identity_total_after}`,
    );
  }
  if (postValidation.route_resolvable_candidate_count !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`ROUTE_RESOLVABLE_COUNT_DRIFT:${postValidation.route_resolvable_candidate_count}`);
  }
  if (postValidation.promoted_rows_with_expected_gvid_count !== EXPECTED_CANDIDATE_COUNT) {
    throw new Error(`PROMOTED_MATCH_COUNT_DRIFT:${postValidation.promoted_rows_with_expected_gvid_count}`);
  }
  if (!postValidation.same_card_prints_id_preserved) {
    throw new Error('CARD_PRINT_ID_PRESERVATION_FAILED');
  }
  if (!postValidation.same_card_print_identity_preserved) {
    throw new Error('CARD_PRINT_IDENTITY_PRESERVATION_FAILED');
  }
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
          cpi.printed_number,
          cpi.set_code_identity,
          count(*) filter (where cpi.is_active = true)::int as active_identity_row_count
        from public.card_prints cp
        join public.card_print_identity cpi
          on cpi.card_print_id = cp.id
        where cp.id = $1
        group by cp.id, cp.name, cp.gv_id, cpi.printed_number, cpi.set_code_identity
      `,
      [sample.card_print_id],
    );

    result[key] = {
      ...sample,
      ...row,
    };
  }

  return result;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    batch_size: BATCH_SIZE,
    generated_at: new Date().toISOString(),
    target_identity_domain: TARGET_IDENTITY_DOMAIN,
    target_set_code_identity: TARGET_SET_CODE_IDENTITY,
    canonical_base_rows: null,
    exact_canonical_overlap_rows: null,
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
    application_name: `2011bw_numeric_promotion_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    const sourceRows = await loadCandidateRows(client);
    const candidateMap = buildCandidateMap(sourceRows);
    const proposedGvIds = candidateMap.map((row) => row.proposed_gv_id).filter(Boolean);
    const [canonicalBaseRows, exactCanonicalOverlapRows, liveCollisionRows, activeIdentityTotalBefore, activeIdentityOnCandidateBefore] =
      await Promise.all([
        loadCanonicalBaseRows(client),
        loadExactCanonicalOverlapRows(client),
        loadLiveGvIdRows(client, proposedGvIds),
        loadActiveIdentityCount(client),
        loadActiveIdentityCountOnCandidates(client, candidateMap.map((row) => row.card_print_id)),
      ]);

    report.canonical_base_rows = canonicalBaseRows;
    report.exact_canonical_overlap_rows = exactCanonicalOverlapRows;
    report.preconditions = buildPreconditions(
      sourceRows,
      canonicalBaseRows,
      exactCanonicalOverlapRows,
      candidateMap,
      liveCollisionRows,
    );
    assertPreconditions(report.preconditions);

    report.sample_rows_before = {
      first: candidateMap[0],
      middle: candidateMap[Math.floor(candidateMap.length / 2)],
      last: candidateMap[candidateMap.length - 1],
    };

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
    );
    assertPostValidation(report.post_validation);
    report.sample_rows_after = await loadSampleRowsAfter(client, report.sample_rows_before);

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
