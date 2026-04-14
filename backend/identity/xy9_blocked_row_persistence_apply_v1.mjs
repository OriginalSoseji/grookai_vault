import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'XY9_BLOCKED_ROW_PERSISTENCE_FAST_PATH_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_ROW_ID = 'a6d34131-d056-49ae-a8b7-21d808e351f6';
const TARGET_SET_CODE_IDENTITY = 'xy9';
const TARGET_NAME = 'Delinquent';
const TARGET_PRINTED_NUMBER = '98';
const FINAL_CLASSIFICATION = 'UNSAFE_SUFFIX_COLLAPSE';
const STATUS_FIELD_CANDIDATES = [
  'identity_status',
  'status',
  'resolution_status',
  'match_status',
  'blocked_reason',
  'blocked_at',
  'is_blocked',
  'unresolved_reason',
];

const EXPECTED = {
  targetRowCount: 1,
  blockedStatusFieldCount: 0,
  chosenPath: 'PATH_B_NO_STATUS_FIELD',
  duplicateExactMatchCount: 0,
  baseVariantApplyIncluded: false,
  fanInIncluded: false,
  promotionIncluded: false,
  dbRowsModifiedCount: 0,
};

function normalizeCount(value) {
  return Number(value ?? 0);
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) {
    throw new Error(`${code}:${actual}:${expected}`);
  }
}

function assertFalse(actual, code) {
  if (Boolean(actual)) {
    throw new Error(`${code}:${actual}`);
  }
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function loadStatusFields(client) {
  const { rows } = await client.query(
    `
      select table_name, column_name, data_type
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('card_prints', 'card_print_identity')
        and column_name = any($1::text[])
      order by table_name, column_name
    `,
    [STATUS_FIELD_CANDIDATES],
  );
  return rows;
}

async function loadTargetRow(client) {
  return queryOne(
    client,
    `
      select
        cp.id as row_id,
        cp.name,
        cp.gv_id,
        cp.number,
        cp.number_plain,
        cp.variant_key,
        cpi.set_code_identity,
        cpi.printed_number,
        cpi.normalized_printed_name,
        cpi.is_active
      from public.card_print_identity cpi
      join public.card_prints cp
        on cp.id = cpi.card_print_id
      where cp.id = $1
        and cpi.identity_domain = 'pokemon_eng_standard'
        and cpi.set_code_identity = $2
        and cpi.is_active = true
    `,
    [TARGET_ROW_ID, TARGET_SET_CODE_IDENTITY],
  );
}

async function loadExecutionSurfaceSummary(client) {
  return queryOne(
    client,
    `
      with target_row as (
        select
          cp.id as row_id,
          cpi.printed_number,
          lower(regexp_replace(btrim(coalesce(cpi.normalized_printed_name, cp.name)), '\\s+', ' ', 'g')) as exact_name_key,
          btrim(
            regexp_replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(lower(coalesce(cp.name, cpi.normalized_printed_name)), chr(8217), ''''),
                          chr(96),
                          ''''
                        ),
                        chr(180),
                        ''''
                      ),
                      chr(8212),
                      ' '
                    ),
                    chr(8211),
                    ' '
                  ),
                  '-gx',
                  ' gx'
                ),
                '-ex',
                ' ex'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ) as normalized_name,
          nullif(regexp_replace(cpi.printed_number, '[^0-9]', '', 'g'), '') as normalized_token
        from public.card_print_identity cpi
        join public.card_prints cp
          on cp.id = cpi.card_print_id
        where cp.id = $1
          and cpi.identity_domain = 'pokemon_eng_standard'
          and cpi.set_code_identity = $2
          and cpi.is_active = true
      ),
      canonical as (
        select
          cp.id,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.gv_id,
          lower(regexp_replace(btrim(cp.name), '\\s+', ' ', 'g')) as exact_name_key,
          btrim(
            regexp_replace(
              replace(
                replace(
                  replace(
                    replace(
                      replace(
                        replace(
                          replace(lower(cp.name), chr(8217), ''''),
                          chr(96),
                          ''''
                        ),
                        chr(180),
                        ''''
                      ),
                      chr(8212),
                      ' '
                    ),
                    chr(8211),
                    ' '
                  ),
                  '-gx',
                  ' gx'
                ),
                '-ex',
                ' ex'
              ),
              '\\s+',
              ' ',
              'g'
            )
          ) as normalized_name
        from public.card_prints cp
        where cp.set_code = $2
          and cp.gv_id is not null
      ),
      surface as (
        select
          t.row_id,
          count(*) filter (
            where c.number = t.printed_number
              and c.exact_name_key = t.exact_name_key
          )::int as duplicate_exact_match_count,
          count(*) filter (
            where c.number_plain = t.normalized_token
              and c.normalized_name = t.normalized_name
          )::int as base_variant_candidate_count
        from target_row t
        left join canonical c
          on c.number_plain = t.normalized_token
        group by t.row_id
      )
      select
        duplicate_exact_match_count,
        base_variant_candidate_count,
        (duplicate_exact_match_count = 1) as in_duplicate_collapse_surface,
        (base_variant_candidate_count = 1) as in_base_variant_apply_surface,
        false as in_fan_in_surface,
        (base_variant_candidate_count = 0) as in_promotion_surface
      from surface
    `,
    [TARGET_ROW_ID, TARGET_SET_CODE_IDENTITY],
  );
}

async function loadFkSnapshot(client) {
  return queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id = $1) as identity_rows,
        (select count(*)::int from public.card_print_traits where card_print_id = $1) as trait_rows,
        (select count(*)::int from public.card_printings where card_print_id = $1) as printing_rows,
        (select count(*)::int from public.external_mappings where card_print_id = $1) as external_rows,
        (select count(*)::int from public.vault_items where card_id = $1) as vault_rows
    `,
    [TARGET_ROW_ID],
  );
}

function choosePath(statusFields) {
  return statusFields.length > 0 ? 'PATH_A_EXISTING_STATUS_FIELD' : 'PATH_B_NO_STATUS_FIELD';
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    target_row_id: TARGET_ROW_ID,
    classification: FINAL_CLASSIFICATION,
    status_fields: [],
    chosen_path: null,
    target_row: null,
    execution_surface_summary: null,
    fk_snapshot: null,
    db_rows_modified_count: 0,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `xy9_blocked_row_persistence_apply_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    report.status_fields = await loadStatusFields(client);
    report.chosen_path = choosePath(report.status_fields);

    report.target_row = await loadTargetRow(client);
    if (!report.target_row) {
      throw new Error(`TARGET_ROW_MISSING:${TARGET_ROW_ID}`);
    }

    assertEqual(report.target_row.row_id, TARGET_ROW_ID, 'TARGET_ROW_ID_DRIFT');
    assertEqual(report.target_row.name, TARGET_NAME, 'TARGET_NAME_DRIFT');
    assertEqual(report.target_row.set_code_identity, TARGET_SET_CODE_IDENTITY, 'TARGET_SET_CODE_IDENTITY_DRIFT');
    assertEqual(report.target_row.printed_number, TARGET_PRINTED_NUMBER, 'TARGET_PRINTED_NUMBER_DRIFT');
    if (report.target_row.gv_id !== null) {
      throw new Error(`GVID_ASSIGNED_UNEXPECTEDLY:${report.target_row.gv_id}`);
    }

    report.execution_surface_summary = await loadExecutionSurfaceSummary(client);
    assertEqual(
      normalizeCount(report.execution_surface_summary?.duplicate_exact_match_count),
      EXPECTED.duplicateExactMatchCount,
      'DUPLICATE_EXACT_MATCH_COUNT_DRIFT',
    );
    assertFalse(report.execution_surface_summary?.in_duplicate_collapse_surface, 'IN_DUPLICATE_COLLAPSE_SURFACE');
    assertFalse(report.execution_surface_summary?.in_base_variant_apply_surface, 'IN_BASE_VARIANT_APPLY_SURFACE');
    assertFalse(report.execution_surface_summary?.in_fan_in_surface, 'IN_FAN_IN_SURFACE');
    assertFalse(report.execution_surface_summary?.in_promotion_surface, 'IN_PROMOTION_SURFACE');

    report.fk_snapshot = await loadFkSnapshot(client);

    assertEqual(report.classification, FINAL_CLASSIFICATION, 'CLASSIFICATION_DRIFT');
    assertEqual(report.status_fields.length, EXPECTED.blockedStatusFieldCount, 'STATUS_FIELD_COUNT_DRIFT');
    assertEqual(report.chosen_path, EXPECTED.chosenPath, 'CHOSEN_PATH_DRIFT');

    if (report.chosen_path === 'PATH_A_EXISTING_STATUS_FIELD') {
      throw new Error('PATH_A_NOT_LAWFUL_IN_LIVE_SCHEMA');
    }

    if (MODE === 'apply') {
      report.db_rows_modified_count = 0;
    }

    report.status = MODE === 'apply' ? 'apply_passed_no_mutation' : 'dry_run_passed';
    await client.query('rollback');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
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
