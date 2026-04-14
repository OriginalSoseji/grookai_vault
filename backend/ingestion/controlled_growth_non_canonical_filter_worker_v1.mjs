import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'CONTROLLED_GROWTH_NON_CANONICAL_FILTER_HARDENING_V1';
const WORKER_VERSION = PHASE;
const SOURCE = 'justtcg';
const STAGING_TABLE = 'external_discovery_candidates';
const CANONICAL_TABLE = 'card_prints';
const EXPECTED_RECLASSIFIED_ROWS = 19;
const TARGET_RAW_SET_ID = 'sm-trainer-kit-lycanroc-alolan-raichu-pokemon';
const TARGET_SET_CODE = 'tk-sm-l';
const TARGET_RULE = 'TRAINER_KIT_DECK_SLOT_DISAMBIGUATION';
const TARGET_CLASSIFICATIONS = ['PROMOTION_CANDIDATE', 'NEEDS_REVIEW'];

const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

function buildTargetWhereSql() {
  return `
    where source = $1
      and set_id = $2
      and coalesce(payload->'_grookai_ingestion_v1'->'candidate_set_mapping'->>0, '') = $3
      and candidate_bucket = 'CLEAN_CANON_CANDIDATE'
      and match_status = 'UNMATCHED'
      and coalesce(payload->'_grookai_ingestion_v1'->>'classification', '') = any($4::text[])
      and coalesce(payload->'_grookai_ingestion_v1'->>'classification_reason', '') = 'no_same_set_canonical_match_on_clean_surface'
      and name_raw like '%Energy (#%'
      and jsonb_array_length(coalesce(payload->'_grookai_ingestion_v1'->'candidate_card_print_ids', '[]'::jsonb)) = 0
  `;
}

function buildAlreadyAppliedWhereSql() {
  return `
    where source = $1
      and set_id = $2
      and coalesce(payload->'_grookai_ingestion_v1'->'candidate_set_mapping'->>0, '') = $3
      and name_raw like '%Energy (#%'
      and coalesce(payload->'_grookai_ingestion_v1'->>'classification', '') = 'NON_CANONICAL'
      and coalesce(payload->'_grookai_noncanonical_filter_v1'->>'worker_version', '') = $4
      and coalesce(payload->'_grookai_noncanonical_filter_v1'->>'hardening_rule', '') = $5
  `;
}

function buildUpdatedPayload(row) {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const ingestionMeta =
    payload._grookai_ingestion_v1 && typeof payload._grookai_ingestion_v1 === 'object'
      ? payload._grookai_ingestion_v1
      : {};
  const hardeningMeta =
    payload._grookai_noncanonical_filter_v1 && typeof payload._grookai_noncanonical_filter_v1 === 'object'
      ? payload._grookai_noncanonical_filter_v1
      : {};

  return {
    ...payload,
    _grookai_ingestion_v1: {
      ...ingestionMeta,
      worker_version: WORKER_VERSION,
      source_phase: WORKER_VERSION,
      classification: 'NON_CANONICAL',
      classification_reason: 'trainer_kit_deck_slot_disambiguation',
      confidence_score: 0,
      candidate_card_print_id: null,
      candidate_card_print_ids: [],
      suppression_status: 'SUPPRESSED_NON_CANONICAL',
    },
    _grookai_noncanonical_filter_v1: {
      ...hardeningMeta,
      worker_version: WORKER_VERSION,
      hardening_rule: TARGET_RULE,
      previous_classification: row.current_classification,
      previous_classification_reason: row.current_classification_reason,
      previous_classifier_version: row.classifier_version,
      suppressed_from_promotion_queue: true,
      suppressed_from_review_queue: true,
      target_raw_set_id: TARGET_RAW_SET_ID,
      target_set_code: TARGET_SET_CODE,
    },
  };
}

function buildSampleRows(rows) {
  return rows.slice(0, 5).map((row) => ({
    id: row.id,
    raw_import_id: row.raw_import_id,
    name_raw: row.name_raw,
    number_raw: row.number_raw,
    set_id: row.set_id,
    current_classification: row.current_classification,
  }));
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function loadTableCount(client, tableName, whereSql = '', params = []) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.${tableName}
      ${whereSql}
    `,
    params,
  );
  return Number(row?.row_count ?? 0);
}

async function loadTargetRows(client) {
  return queryRows(
    client,
    `
      select
        id,
        raw_import_id,
        name_raw,
        number_raw,
        set_id,
        classifier_version,
        payload,
        coalesce(payload->'_grookai_ingestion_v1'->>'classification', '') as current_classification,
        coalesce(payload->'_grookai_ingestion_v1'->>'classification_reason', '') as current_classification_reason
      from public.${STAGING_TABLE}
      ${buildTargetWhereSql()}
      order by raw_import_id
    `,
    [SOURCE, TARGET_RAW_SET_ID, TARGET_SET_CODE, TARGET_CLASSIFICATIONS],
  );
}

async function countTargetRows(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.${STAGING_TABLE}
      ${buildTargetWhereSql()}
    `,
    [SOURCE, TARGET_RAW_SET_ID, TARGET_SET_CODE, TARGET_CLASSIFICATIONS],
  );
  return Number(row?.row_count ?? 0);
}

async function countAlreadyAppliedRows(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.${STAGING_TABLE}
      ${buildAlreadyAppliedWhereSql()}
    `,
    [SOURCE, TARGET_RAW_SET_ID, TARGET_SET_CODE, WORKER_VERSION, TARGET_RULE],
  );
  return Number(row?.row_count ?? 0);
}

async function countPromotionCandidates(client) {
  return loadTableCount(
    client,
    STAGING_TABLE,
    `where source = $1
       and coalesce(payload->'_grookai_ingestion_v1'->>'classification', '') = 'PROMOTION_CANDIDATE'`,
    [SOURCE],
  );
}

async function countHardenedNonCanonical(client) {
  return loadTableCount(
    client,
    STAGING_TABLE,
    `where source = $1
       and coalesce(payload->'_grookai_ingestion_v1'->>'classification', '') = 'NON_CANONICAL'
       and coalesce(payload->'_grookai_noncanonical_filter_v1'->>'worker_version', '') = $2
       and coalesce(payload->'_grookai_noncanonical_filter_v1'->>'hardening_rule', '') = $3`,
    [SOURCE, WORKER_VERSION, TARGET_RULE],
  );
}

async function applyUpdates(client, targetRows) {
  if (targetRows.length === 0) {
    return 0;
  }

  const updateRows = targetRows.map((row) => ({
    id: row.id,
    classifier_version: WORKER_VERSION,
    payload: buildUpdatedPayload(row),
  }));

  const payload = JSON.stringify(updateRows);
  const { rowCount } = await client.query(
    `
      with input_rows as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          id uuid,
          classifier_version text,
          payload jsonb
        )
      )
      update public.${STAGING_TABLE} edc
      set
        classifier_version = input_rows.classifier_version,
        payload = input_rows.payload
      from input_rows
      where edc.id = input_rows.id
    `,
    [payload],
  );

  return rowCount ?? 0;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    target_rule: TARGET_RULE,
    reclassified_rows: 0,
    promotion_candidate_count_before: 0,
    promotion_candidate_count_after: 0,
    non_canonical_count_before: 0,
    non_canonical_count_after: 0,
    pending_target_rows_before: 0,
    pending_target_rows_after: 0,
    already_applied_rows_before: 0,
    already_applied_rows_after: 0,
    canonical_row_count_before: 0,
    canonical_row_count_after: 0,
    canonical_writes_detected: 0,
    sample_rows: [],
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    application_name: `${PHASE}:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    report.canonical_row_count_before = await loadTableCount(client, CANONICAL_TABLE);
    report.promotion_candidate_count_before = await countPromotionCandidates(client);
    report.non_canonical_count_before = await countHardenedNonCanonical(client);

    const targetRows = await loadTargetRows(client);
    report.pending_target_rows_before = targetRows.length;
    report.already_applied_rows_before = await countAlreadyAppliedRows(client);
    report.sample_rows = buildSampleRows(targetRows);

    const isFreshRun =
      report.pending_target_rows_before === EXPECTED_RECLASSIFIED_ROWS &&
      report.already_applied_rows_before === 0;
    const isAlreadyApplied =
      report.pending_target_rows_before === 0 &&
      report.already_applied_rows_before === EXPECTED_RECLASSIFIED_ROWS;

    if (!isFreshRun && !isAlreadyApplied) {
      throw new Error(
        `TARGET_SCOPE_DRIFT:${report.pending_target_rows_before}:${report.already_applied_rows_before}`,
      );
    }

    if (isFreshRun) {
      report.reclassified_rows = await applyUpdates(client, targetRows);
    }

    report.pending_target_rows_after = await countTargetRows(client);
    report.already_applied_rows_after = await countAlreadyAppliedRows(client);
    report.promotion_candidate_count_after = await countPromotionCandidates(client);
    report.non_canonical_count_after = await countHardenedNonCanonical(client);
    report.canonical_row_count_after = await loadTableCount(client, CANONICAL_TABLE);
    report.canonical_writes_detected =
      report.canonical_row_count_before === report.canonical_row_count_after ? 0 : 1;

    if (report.canonical_writes_detected !== 0) {
      throw new Error(
        `CANONICAL_WRITE_DETECTED:${report.canonical_row_count_before}:${report.canonical_row_count_after}`,
      );
    }

    if (isFreshRun) {
      if (report.reclassified_rows !== EXPECTED_RECLASSIFIED_ROWS) {
        throw new Error(`RECLASSIFIED_ROWS_DRIFT:${report.reclassified_rows}:${EXPECTED_RECLASSIFIED_ROWS}`);
      }
      if (report.pending_target_rows_after !== 0) {
        throw new Error(`PENDING_TARGET_ROWS_AFTER_DRIFT:${report.pending_target_rows_after}:0`);
      }
      if (report.already_applied_rows_after !== EXPECTED_RECLASSIFIED_ROWS) {
        throw new Error(
          `ALREADY_APPLIED_ROWS_AFTER_DRIFT:${report.already_applied_rows_after}:${EXPECTED_RECLASSIFIED_ROWS}`,
        );
      }
      if (report.promotion_candidate_count_after !== 12) {
        throw new Error(`PROMOTION_CANDIDATE_COUNT_AFTER_DRIFT:${report.promotion_candidate_count_after}:12`);
      }
      if (report.non_canonical_count_after !== EXPECTED_RECLASSIFIED_ROWS) {
        throw new Error(`NON_CANONICAL_COUNT_AFTER_DRIFT:${report.non_canonical_count_after}:${EXPECTED_RECLASSIFIED_ROWS}`);
      }
    } else {
      report.reclassified_rows = 0;
      if (report.promotion_candidate_count_after !== 12) {
        throw new Error(`PROMOTION_CANDIDATE_COUNT_ALREADY_APPLIED_DRIFT:${report.promotion_candidate_count_after}:12`);
      }
      if (report.non_canonical_count_after !== EXPECTED_RECLASSIFIED_ROWS) {
        throw new Error(`NON_CANONICAL_COUNT_ALREADY_APPLIED_DRIFT:${report.non_canonical_count_after}:${EXPECTED_RECLASSIFIED_ROWS}`);
      }
    }

    report.status = MODE === 'apply' ? 'apply_passed' : 'dry_run_passed';

    if (MODE === 'apply') {
      await client.query('commit');
    } else {
      await client.query('rollback');
    }

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
