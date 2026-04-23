/**
 * CANON MAINTENANCE-ONLY EXECUTION BOUNDARY
 *
 * This script mutates canonical data outside runtime executor.
 * It is NOT part of the runtime authority system.
 *
 * RULES:
 * - must never be executed implicitly
 * - must never be called by workers
 * - must never be used in normal flows
 * - must require explicit operator intent
 */
import '../env.mjs';
import { Client } from 'pg';

import { installCanonMaintenanceBoundaryV1 } from '../maintenance/canon_maintenance_boundary_v1.mjs';

if (!process.env.ENABLE_CANON_MAINTENANCE_MODE) {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance is disabled. Set ENABLE_CANON_MAINTENANCE_MODE=true.',
  );
}

if (process.env.CANON_MAINTENANCE_MODE !== 'EXPLICIT') {
  throw new Error(
    "RUNTIME_ENFORCEMENT: CANON_MAINTENANCE_MODE must be 'EXPLICIT'.",
  );
}

if (process.env.CANON_MAINTENANCE_ENTRYPOINT !== 'backend/maintenance/run_canon_maintenance_v1.mjs') {
  throw new Error(
    'RUNTIME_ENFORCEMENT: canon maintenance scripts must be launched from backend/maintenance/run_canon_maintenance_v1.mjs',
  );
}

const DRY_RUN = process.env.CANON_MAINTENANCE_DRY_RUN !== 'false';
const { assertCanonMaintenanceWriteAllowed } = installCanonMaintenanceBoundaryV1(import.meta.url);

if (DRY_RUN) {
  console.log('CANON MAINTENANCE: DRY RUN');
}

void assertCanonMaintenanceWriteAllowed;
const PHASE = 'JUSTTCG_BRIDGE_SPLIT_REMAP_AND_INSERT_V1';
const WORKER_VERSION = 'JUSTTCG_BRIDGE_INSERT_ONLY_APPLY_V1';
const SOURCE = 'justtcg';
const STAGING_TABLE = 'external_discovery_candidates';
const MAPPINGS_TABLE = 'external_mappings';
const CANONICAL_TABLE = 'card_prints';
const EXPECTED_INSERT_SURFACE_COUNT = 26;
const EXPECTED_STALE_BLOCKED_COUNT = 3;

const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

function buildInsertSurfaceSql() {
  return `
    with base_surface as (
      select
        edc.upstream_id as external_id,
        edc.card_print_id as target_card_print_id,
        cp.gv_id as target_gv_id,
        min(edc.raw_import_id)::bigint as raw_import_id,
        min(edc.name_raw) as raw_name,
        min(edc.number_raw) as raw_number,
        min(edc.set_id) as raw_set,
        min(coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '')) as proof_reason,
        min(coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '')) as matched_via
      from public.${STAGING_TABLE} edc
      join public.${CANONICAL_TABLE} cp
        on cp.id = edc.card_print_id
      where edc.source = $1
        and edc.card_print_id is not null
        and cp.gv_id is not null
        and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
        and coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') = 'tcgplayer_external_mapping'
      group by edc.upstream_id, edc.card_print_id, cp.gv_id
    ),
    candidate_counts as (
      select
        external_id,
        count(distinct target_card_print_id)::int as target_candidate_count
      from base_surface
      group by external_id
    ),
    existing_mappings as (
      select
        em.external_id,
        count(*)::int as existing_mapping_count,
        min(em.id)::bigint as existing_mapping_id,
        min(em.card_print_id::text)::uuid as existing_card_print_id
      from public.${MAPPINGS_TABLE} em
      where em.source = $1
      group by em.external_id
    )
    select
      bs.external_id,
      bs.target_card_print_id,
      bs.target_gv_id,
      bs.raw_import_id,
      bs.raw_name,
      bs.raw_number,
      bs.raw_set,
      bs.proof_reason,
      bs.matched_via,
      cc.target_candidate_count,
      coalesce(em.existing_mapping_count, 0)::int as existing_mapping_count,
      em.existing_mapping_id,
      em.existing_card_print_id,
      case
        when cc.target_candidate_count <> 1 then 'BLOCKED_AMBIGUOUS'
        when coalesce(em.existing_mapping_count, 0) > 1 then 'BLOCKED_EXISTING_CONFLICT'
        when em.existing_mapping_id is not null and em.existing_card_print_id <> bs.target_card_print_id then 'BLOCKED_EXISTING_CONFLICT'
        when em.existing_mapping_id is not null and em.existing_card_print_id = bs.target_card_print_id then 'ALREADY_INSERTED'
        else 'SAFE_INSERT'
      end as validation_status
    from base_surface bs
    join candidate_counts cc
      on cc.external_id = bs.external_id
    left join existing_mappings em
      on em.external_id = bs.external_id
    order by bs.raw_import_id, bs.external_id
  `;
}

function buildStaleBlockedSql() {
  return `
    with stale as (
      select
        em.id as external_mapping_id,
        em.external_id,
        em.card_print_id as old_card_print_id
      from public.${MAPPINGS_TABLE} em
      join public.${CANONICAL_TABLE} cp
        on cp.id = em.card_print_id
      where em.source = $1
        and em.active is true
        and cp.gv_id is null
    ),
    staged_targets as (
      select
        edc.upstream_id as external_id,
        count(distinct edc.card_print_id)::int as target_candidate_count,
        min(edc.card_print_id::text)::uuid as candidate_card_print_id
      from public.${STAGING_TABLE} edc
      join public.${CANONICAL_TABLE} cp
        on cp.id = edc.card_print_id
      where edc.source = $1
        and edc.card_print_id is not null
        and cp.gv_id is not null
        and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
      group by edc.upstream_id
    )
    select
      stale.external_mapping_id,
      stale.external_id as justtcg_external_id,
      stale.old_card_print_id,
      staged.candidate_card_print_id as target_card_print_id,
      coalesce(staged.target_candidate_count, 0)::int as target_candidate_count,
      case
        when coalesce(staged.target_candidate_count, 0) = 0 then 'BLOCKED_NO_TARGET'
        when staged.target_candidate_count = 1 then 'READY'
        else 'BLOCKED_AMBIGUOUS'
      end as validation_status
    from stale
    left join staged_targets staged
      on staged.external_id = stale.external_id
    order by stale.external_mapping_id
  `;
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
  return normalizeCount(row?.row_count);
}

async function loadInsertSurfaceRows(client) {
  return queryRows(client, buildInsertSurfaceSql(), [SOURCE]);
}

async function loadStaleBlockedRows(client) {
  return queryRows(client, buildStaleBlockedSql(), [SOURCE]);
}

function buildInsertPayloadRows(rows) {
  const syncedAt = new Date().toISOString();
  return rows.map((row) => ({
    card_print_id: row.target_card_print_id,
    source: SOURCE,
    external_id: row.external_id,
    active: true,
    synced_at: syncedAt,
    meta: {
      inserted_by: WORKER_VERSION,
      source_phase: PHASE,
      raw_import_id: row.raw_import_id,
      raw_set: row.raw_set,
      matched_via: row.matched_via,
      proof_reason: row.proof_reason,
      validation_status: row.validation_status,
    },
  }));
}

async function applyInserts(client, rows) {
  if (rows.length === 0) {
    return 0;
  }

  const payload = JSON.stringify(rows);
  const { rowCount } = await client.query(
    `
      with input_rows as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          card_print_id uuid,
          source text,
          external_id text,
          active boolean,
          synced_at timestamptz,
          meta jsonb
        )
      )
      insert into public.${MAPPINGS_TABLE} (
        card_print_id,
        source,
        external_id,
        active,
        synced_at,
        meta
      )
      select
        card_print_id,
        source,
        external_id,
        active,
        synced_at,
        meta
      from input_rows
    `,
    [payload],
  );

  return normalizeCount(rowCount);
}

async function countDuplicateMappings(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from (
        select source, external_id
        from public.${MAPPINGS_TABLE}
        where source = $1
        group by source, external_id
        having count(*) > 1
      ) dupes
    `,
    [SOURCE],
  );
  return normalizeCount(row?.row_count);
}

async function countFkOrphans(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as row_count
      from public.${MAPPINGS_TABLE}
      where card_print_id not in (select id from public.${CANONICAL_TABLE})
    `,
  );
  return normalizeCount(row?.row_count);
}

async function countExpectedMappings(client, expectedRows) {
  if (expectedRows.length === 0) {
    return 0;
  }

  const payload = JSON.stringify(expectedRows);
  const row = await queryOne(
    client,
    `
      with expected as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          external_id text,
          target_card_print_id uuid
        )
      )
      select count(*)::int as row_count
      from expected
      join public.${MAPPINGS_TABLE} em
        on em.source = $2
       and em.external_id = expected.external_id
       and em.card_print_id = expected.target_card_print_id
       and em.active is true
    `,
    [payload, SOURCE],
  );
  return normalizeCount(row?.row_count);
}

function buildExpectedRows(rows) {
  return rows.map((row) => ({
    external_id: row.external_id,
    target_card_print_id: row.target_card_print_id,
  }));
}

function countByStatus(rows, status) {
  return rows.filter((row) => row.validation_status === status).length;
}

function buildSampleMappings(insertRows, staleRows) {
  return {
    safe_insert_examples: insertRows
      .filter((row) => row.validation_status === 'SAFE_INSERT')
      .slice(0, 5)
      .map((row) => ({
        external_id: row.external_id,
        target_card_print_id: row.target_card_print_id,
        target_gv_id: row.target_gv_id,
        validation_status: row.validation_status,
      })),
    stale_blocked_examples: staleRows.slice(0, 3).map((row) => ({
      external_mapping_id: row.external_mapping_id,
      external_id: row.justtcg_external_id,
      old_card_print_id: row.old_card_print_id,
      validation_status: row.validation_status,
    })),
  };
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    audited_insert_surface_count: 0,
    safe_insert_count: 0,
    already_inserted_count: 0,
    ambiguity_count: 0,
    collision_count: 0,
    stale_rows_blocked: 0,
    rows_inserted: 0,
    canonical_writes_detected: 0,
    external_mappings_total_before: 0,
    external_mappings_total_after: 0,
    canonical_row_count_before: 0,
    canonical_row_count_after: 0,
    duplicate_mapping_count_before: 0,
    duplicate_mapping_count_after: 0,
    fk_orphan_count_before: 0,
    fk_orphan_count_after: 0,
    expected_mapping_count_after: 0,
    sample_mappings: null,
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

    report.external_mappings_total_before = await loadTableCount(
      client,
      MAPPINGS_TABLE,
      'where source = $1',
      [SOURCE],
    );
    report.canonical_row_count_before = await loadTableCount(client, CANONICAL_TABLE);
    report.duplicate_mapping_count_before = await countDuplicateMappings(client);
    report.fk_orphan_count_before = await countFkOrphans(client);

    const insertSurfaceRows = await loadInsertSurfaceRows(client);
    const staleRows = await loadStaleBlockedRows(client);
    report.sample_mappings = buildSampleMappings(insertSurfaceRows, staleRows);

    report.audited_insert_surface_count = insertSurfaceRows.length;
    report.safe_insert_count = countByStatus(insertSurfaceRows, 'SAFE_INSERT');
    report.already_inserted_count = countByStatus(insertSurfaceRows, 'ALREADY_INSERTED');
    report.ambiguity_count = countByStatus(insertSurfaceRows, 'BLOCKED_AMBIGUOUS');
    report.collision_count = countByStatus(insertSurfaceRows, 'BLOCKED_EXISTING_CONFLICT');
    report.stale_rows_blocked = staleRows.filter((row) => row.validation_status !== 'READY').length;

    if (report.audited_insert_surface_count !== EXPECTED_INSERT_SURFACE_COUNT) {
      throw new Error(
        `INSERT_SURFACE_DRIFT:${report.audited_insert_surface_count}:${EXPECTED_INSERT_SURFACE_COUNT}`,
      );
    }
    if (report.ambiguity_count !== 0) {
      throw new Error(`AMBIGUITY_DETECTED:${report.ambiguity_count}`);
    }
    if (report.collision_count !== 0) {
      throw new Error(`COLLISION_DETECTED:${report.collision_count}`);
    }
    if (report.stale_rows_blocked !== EXPECTED_STALE_BLOCKED_COUNT) {
      throw new Error(
        `STALE_BLOCKED_DRIFT:${report.stale_rows_blocked}:${EXPECTED_STALE_BLOCKED_COUNT}`,
      );
    }
    if (report.duplicate_mapping_count_before !== 0) {
      throw new Error(`DUPLICATE_MAPPINGS_BEFORE:${report.duplicate_mapping_count_before}`);
    }
    if (report.fk_orphan_count_before !== 0) {
      throw new Error(`FK_ORPHANS_BEFORE:${report.fk_orphan_count_before}`);
    }

    const shouldInsertFresh = report.safe_insert_count === EXPECTED_INSERT_SURFACE_COUNT && report.already_inserted_count === 0;
    const isAlreadyApplied = report.safe_insert_count === 0 && report.already_inserted_count === EXPECTED_INSERT_SURFACE_COUNT;

    if (!shouldInsertFresh && !isAlreadyApplied) {
      throw new Error(
        `INSERT_SURFACE_STATE_DRIFT:${report.safe_insert_count}:${report.already_inserted_count}:${EXPECTED_INSERT_SURFACE_COUNT}`,
      );
    }

    const rowsToInsert = shouldInsertFresh
      ? insertSurfaceRows.filter((row) => row.validation_status === 'SAFE_INSERT')
      : [];

    report.rows_inserted = await applyInserts(client, buildInsertPayloadRows(rowsToInsert));

    report.external_mappings_total_after = await loadTableCount(
      client,
      MAPPINGS_TABLE,
      'where source = $1',
      [SOURCE],
    );
    report.canonical_row_count_after = await loadTableCount(client, CANONICAL_TABLE);
    report.duplicate_mapping_count_after = await countDuplicateMappings(client);
    report.fk_orphan_count_after = await countFkOrphans(client);
    report.canonical_writes_detected =
      report.canonical_row_count_before === report.canonical_row_count_after ? 0 : 1;

    if (report.canonical_writes_detected !== 0) {
      throw new Error(
        `CANONICAL_WRITE_DETECTED:${report.canonical_row_count_before}:${report.canonical_row_count_after}`,
      );
    }
    if (report.duplicate_mapping_count_after !== 0) {
      throw new Error(`DUPLICATE_MAPPINGS_AFTER:${report.duplicate_mapping_count_after}`);
    }
    if (report.fk_orphan_count_after !== 0) {
      throw new Error(`FK_ORPHANS_AFTER:${report.fk_orphan_count_after}`);
    }

    const expectedRows = buildExpectedRows(insertSurfaceRows);
    report.expected_mapping_count_after = await countExpectedMappings(client, expectedRows);
    if (report.expected_mapping_count_after !== EXPECTED_INSERT_SURFACE_COUNT) {
      throw new Error(
        `EXPECTED_MAPPING_COUNT_DRIFT:${report.expected_mapping_count_after}:${EXPECTED_INSERT_SURFACE_COUNT}`,
      );
    }

    if (shouldInsertFresh) {
      if (report.rows_inserted !== EXPECTED_INSERT_SURFACE_COUNT) {
        throw new Error(`ROWS_INSERTED_DRIFT:${report.rows_inserted}:${EXPECTED_INSERT_SURFACE_COUNT}`);
      }
      if (
        report.external_mappings_total_after !==
        report.external_mappings_total_before + EXPECTED_INSERT_SURFACE_COUNT
      ) {
        throw new Error(
          `EXTERNAL_MAPPINGS_TOTAL_DRIFT:${report.external_mappings_total_after}:${report.external_mappings_total_before + EXPECTED_INSERT_SURFACE_COUNT}`,
        );
      }
    } else {
      if (report.rows_inserted !== 0) {
        throw new Error(`ALREADY_APPLIED_INSERT_DRIFT:${report.rows_inserted}:0`);
      }
      if (report.external_mappings_total_after !== report.external_mappings_total_before) {
        throw new Error(
          `ALREADY_APPLIED_TOTAL_DRIFT:${report.external_mappings_total_after}:${report.external_mappings_total_before}`,
        );
      }
    }

    report.status = MODE === 'apply'
      ? shouldInsertFresh
        ? 'apply_passed'
        : 'apply_already_applied'
      : shouldInsertFresh
        ? 'dry_run_passed'
        : 'dry_run_already_applied';

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

    if (report.external_mappings_total_after === 0) {
      report.external_mappings_total_after = report.external_mappings_total_before;
    }
    if (report.canonical_row_count_after === 0) {
      report.canonical_row_count_after = report.canonical_row_count_before;
    }
    if (report.duplicate_mapping_count_after === 0) {
      report.duplicate_mapping_count_after = report.duplicate_mapping_count_before;
    }
    if (report.fk_orphan_count_after === 0) {
      report.fk_orphan_count_after = report.fk_orphan_count_before;
    }
    report.canonical_writes_detected =
      report.canonical_row_count_before === report.canonical_row_count_after ? 0 : 1;
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

