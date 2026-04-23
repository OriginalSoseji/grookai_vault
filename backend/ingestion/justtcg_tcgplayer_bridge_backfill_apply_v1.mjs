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
const PHASE = 'JUSTTCG_TCGPLAYER_BRIDGE_BACKFILL_APPLY_V1';
const WORKER_VERSION = PHASE;
const SOURCE = 'justtcg';
const STAGING_TABLE = 'external_discovery_candidates';
const MAPPINGS_TABLE = 'external_mappings';
const CANONICAL_TABLE = 'card_prints';
const EXPECTED_STALE_ROWS = 3;
const EXPECTED_INSERT_ROWS = 26;
const EXPECTED_TOTAL_SCOPE = 29;

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
    select
      null::bigint as external_mapping_id,
      edc.upstream_id as justtcg_external_id,
      null::uuid as old_card_print_id,
      edc.card_print_id as new_card_print_id,
      cp.gv_id as new_gv_id,
      edc.raw_import_id,
      edc.name_raw,
      edc.number_raw,
      edc.set_id as raw_set,
      coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as proof_reason,
      coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') as matched_via,
      'INSERT'::text as mapping_action,
      'READY'::text as validation_status,
      1::int as target_candidate_count
    from public.${STAGING_TABLE} edc
    join public.${CANONICAL_TABLE} cp
      on cp.id = edc.card_print_id
    where edc.source = $1
      and cp.gv_id is not null
      and edc.card_print_id is not null
      and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
      and coalesce(edc.payload->'_grookai_ingestion_v1'->>'matched_via', '') = 'tcgplayer_external_mapping'
      and not exists (
        select 1
        from public.${MAPPINGS_TABLE} em
        where em.source = $1
          and em.external_id = edc.upstream_id
      )
    order by edc.raw_import_id, edc.upstream_id
  `;
}

function buildStaleSurfaceSql() {
  return `
    with stale as (
      select
        em.id as external_mapping_id,
        em.external_id as justtcg_external_id,
        em.card_print_id as old_card_print_id,
        old_cp.gv_id as old_gv_id,
        old_cp.name as old_name,
        old_cp.number as old_number,
        old_cp.number_plain as old_number_plain,
        coalesce(old_cp.variant_key, '') as old_variant_key,
        old_set.code as old_set_code,
        ri.id as raw_import_id,
        ri.payload->>'name' as raw_name,
        ri.payload->>'number' as raw_number,
        ri.payload->>'set' as raw_set
      from public.${MAPPINGS_TABLE} em
      join public.${CANONICAL_TABLE} old_cp
        on old_cp.id = em.card_print_id
      join public.sets old_set
        on old_set.id = old_cp.set_id
      left join public.raw_imports ri
        on ri.source = $1
       and ri.payload->>'_kind' = 'card'
       and coalesce(ri.payload->>'id', ri.payload->>'_external_id') = em.external_id
      where em.source = $1
        and em.active is true
        and old_cp.gv_id is null
    ),
    staged_candidates as (
      select
        edc.upstream_id as justtcg_external_id,
        edc.card_print_id as new_card_print_id,
        cp.gv_id as new_gv_id,
        coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification_reason', '') as proof_reason,
        row_number() over (
          partition by edc.upstream_id
          order by edc.raw_import_id, edc.id
        ) as candidate_rank,
        count(*) over (
          partition by edc.upstream_id
        )::int as target_candidate_count
      from public.${STAGING_TABLE} edc
      join public.${CANONICAL_TABLE} cp
        on cp.id = edc.card_print_id
      where edc.source = $1
        and edc.card_print_id is not null
        and cp.gv_id is not null
        and coalesce(edc.payload->'_grookai_ingestion_v1'->>'classification', '') = 'MATCHED'
    )
    select
      stale.external_mapping_id,
      stale.justtcg_external_id,
      stale.old_card_print_id,
      stale.old_gv_id,
      coalesce(stale.raw_import_id, 0)::bigint as raw_import_id,
      coalesce(stale.raw_name, stale.old_name) as name_raw,
      coalesce(stale.raw_number, stale.old_number) as number_raw,
      coalesce(stale.raw_set, stale.old_set_code) as raw_set,
      candidate.new_card_print_id,
      candidate.new_gv_id,
      coalesce(candidate.proof_reason, 'mapping_target_noncanonical') as proof_reason,
      'REMAP'::text as mapping_action,
      coalesce(candidate.target_candidate_count, 0)::int as target_candidate_count,
      case
        when coalesce(candidate.target_candidate_count, 0) = 1
          and candidate.new_card_print_id is not null
          then 'READY'
        when coalesce(candidate.target_candidate_count, 0) = 0
          then 'BLOCKED_NO_TARGET'
        else 'BLOCKED_AMBIGUOUS'
      end as validation_status
    from stale
    left join staged_candidates candidate
      on candidate.justtcg_external_id = stale.justtcg_external_id
     and candidate.candidate_rank = 1
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

async function loadInsertRows(client) {
  return queryRows(client, buildInsertSurfaceSql(), [SOURCE]);
}

async function loadStaleRows(client) {
  return queryRows(client, buildStaleSurfaceSql(), [SOURCE]);
}

function countDuplicates(values) {
  const seen = new Map();
  for (const value of values) {
    const key = String(value ?? '').trim();
    if (!key) {
      continue;
    }
    seen.set(key, normalizeCount(seen.get(key)) + 1);
  }

  let duplicateCount = 0;
  for (const count of seen.values()) {
    if (count > 1) {
      duplicateCount += 1;
    }
  }
  return duplicateCount;
}

function buildUpdateRows(staleRows) {
  const syncedAt = new Date().toISOString();
  return staleRows.map((row) => ({
    external_mapping_id: row.external_mapping_id,
    new_card_print_id: row.new_card_print_id,
    synced_at: syncedAt,
    meta: {
      remapped_by: WORKER_VERSION,
      source_phase: WORKER_VERSION,
      old_card_print_id: row.old_card_print_id,
      proof_reason: row.proof_reason,
      mapping_action: row.mapping_action,
    },
  }));
}

function buildInsertPayloadRows(insertRows) {
  const syncedAt = new Date().toISOString();
  return insertRows.map((row) => ({
    card_print_id: row.new_card_print_id,
    source: SOURCE,
    external_id: row.justtcg_external_id,
    active: true,
    synced_at: syncedAt,
    meta: {
      inserted_by: WORKER_VERSION,
      source_phase: WORKER_VERSION,
      raw_import_id: row.raw_import_id,
      raw_set: row.raw_set,
      matched_via: row.matched_via,
      proof_reason: row.proof_reason,
      mapping_action: row.mapping_action,
    },
  }));
}

async function applyUpdates(client, updateRows) {
  if (updateRows.length === 0) {
    return 0;
  }

  const payload = JSON.stringify(updateRows);
  const { rowCount } = await client.query(
    `
      with input_rows as (
        select *
        from jsonb_to_recordset($1::jsonb) as x(
          external_mapping_id bigint,
          new_card_print_id uuid,
          synced_at timestamptz,
          meta jsonb
        )
      )
      update public.${MAPPINGS_TABLE} em
      set
        card_print_id = input_rows.new_card_print_id,
        synced_at = input_rows.synced_at,
        meta = coalesce(em.meta, '{}'::jsonb) || input_rows.meta
      from input_rows
      where em.id = input_rows.external_mapping_id
    `,
    [payload],
  );

  return normalizeCount(rowCount);
}

async function applyInserts(client, insertRows) {
  if (insertRows.length === 0) {
    return 0;
  }

  const payload = JSON.stringify(insertRows);
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
          justtcg_external_id text,
          new_card_print_id uuid
        )
      )
      select count(*)::int as row_count
      from expected
      join public.${MAPPINGS_TABLE} em
        on em.source = $2
       and em.external_id = expected.justtcg_external_id
       and em.card_print_id = expected.new_card_print_id
       and em.active is true
    `,
    [payload, SOURCE],
  );
  return normalizeCount(row?.row_count);
}

function buildExpectedMappings(insertRows, staleRows) {
  return [
    ...insertRows.map((row) => ({
      justtcg_external_id: row.justtcg_external_id,
      new_card_print_id: row.new_card_print_id,
    })),
    ...staleRows.map((row) => ({
      justtcg_external_id: row.justtcg_external_id,
      new_card_print_id: row.new_card_print_id,
    })),
  ];
}

function buildSampleMappings(insertRows, staleRows) {
  return {
    insert_examples: insertRows.slice(0, 5).map((row) => ({
      justtcg_external_id: row.justtcg_external_id,
      old_card_print_id: row.old_card_print_id,
      new_card_print_id: row.new_card_print_id,
      new_gv_id: row.new_gv_id,
      mapping_action: row.mapping_action,
      validation_status: row.validation_status,
    })),
    stale_examples: staleRows.slice(0, 3).map((row) => ({
      external_mapping_id: row.external_mapping_id,
      justtcg_external_id: row.justtcg_external_id,
      old_card_print_id: row.old_card_print_id,
      new_card_print_id: row.new_card_print_id,
      new_gv_id: row.new_gv_id,
      mapping_action: row.mapping_action,
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
    stale_mapping_count: 0,
    newly_matchable_count: 0,
    total_candidate_scope: 0,
    total_ready_scope: 0,
    rows_updated: 0,
    rows_inserted: 0,
    total_rows_affected: 0,
    duplicate_insert_external_id_count: 0,
    duplicate_insert_target_count: 0,
    ambiguity_count: 0,
    collision_count: 0,
    stale_ready_count: 0,
    stale_blocked_count: 0,
    mapping_integrity_status: 'running',
    external_mappings_total_before: 0,
    external_mappings_total_after: 0,
    canonical_row_count_before: 0,
    canonical_row_count_after: 0,
    canonical_writes_detected: 0,
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
    report.fk_orphan_count_before = await countFkOrphans(client);

    const insertRows = await loadInsertRows(client);
    const staleRows = await loadStaleRows(client);
    report.sample_mappings = buildSampleMappings(insertRows, staleRows);

    report.stale_mapping_count = staleRows.length;
    report.newly_matchable_count = insertRows.length;
    report.total_candidate_scope = report.stale_mapping_count + report.newly_matchable_count;

    report.duplicate_insert_external_id_count = countDuplicates(
      insertRows.map((row) => row.justtcg_external_id),
    );
    report.duplicate_insert_target_count = countDuplicates(
      insertRows.map((row) => `${row.justtcg_external_id}::${row.new_card_print_id}`),
    );
    report.ambiguity_count = staleRows.filter(
      (row) => row.validation_status === 'BLOCKED_AMBIGUOUS',
    ).length;
    report.stale_ready_count = staleRows.filter(
      (row) => row.validation_status === 'READY',
    ).length;
    report.stale_blocked_count = staleRows.filter(
      (row) => row.validation_status !== 'READY',
    ).length;
    report.collision_count = await queryOne(
      client,
      `
        with insert_surface as (
          ${buildInsertSurfaceSql()}
        )
        select count(*)::int as row_count
        from insert_surface ins
        join public.${MAPPINGS_TABLE} em
          on em.source = $1
         and em.external_id = ins.justtcg_external_id
      `,
      [SOURCE],
    ).then((row) => normalizeCount(row?.row_count));

    report.total_ready_scope = report.newly_matchable_count + report.stale_ready_count;

    if (report.stale_mapping_count !== EXPECTED_STALE_ROWS) {
      throw new Error(
        `STALE_SCOPE_DRIFT:${report.stale_mapping_count}:${EXPECTED_STALE_ROWS}`,
      );
    }
    if (report.newly_matchable_count !== EXPECTED_INSERT_ROWS) {
      throw new Error(
        `INSERT_SCOPE_DRIFT:${report.newly_matchable_count}:${EXPECTED_INSERT_ROWS}`,
      );
    }
    if (report.total_candidate_scope !== EXPECTED_TOTAL_SCOPE) {
      throw new Error(
        `TOTAL_SCOPE_DRIFT:${report.total_candidate_scope}:${EXPECTED_TOTAL_SCOPE}`,
      );
    }
    if (report.duplicate_insert_external_id_count !== 0) {
      throw new Error(
        `DUPLICATE_INSERT_EXTERNAL_ID:${report.duplicate_insert_external_id_count}`,
      );
    }
    if (report.duplicate_insert_target_count !== 0) {
      throw new Error(
        `DUPLICATE_INSERT_TARGET:${report.duplicate_insert_target_count}`,
      );
    }
    if (report.ambiguity_count !== 0) {
      throw new Error(`AMBIGUITY_DETECTED:${report.ambiguity_count}`);
    }
    if (report.collision_count !== 0) {
      throw new Error(`INSERT_COLLISION_DETECTED:${report.collision_count}`);
    }
    if (report.stale_ready_count !== EXPECTED_STALE_ROWS) {
      throw new Error(
        `STALE_REMAP_TARGETS_NOT_DETERMINISTIC:${report.stale_ready_count}:${EXPECTED_STALE_ROWS}`,
      );
    }
    if (report.fk_orphan_count_before !== 0) {
      throw new Error(`FK_ORPHAN_BEFORE_DRIFT:${report.fk_orphan_count_before}`);
    }

    const readyStaleRows = staleRows.filter((row) => row.validation_status === 'READY');

    if (MODE === 'apply') {
      report.rows_updated = await applyUpdates(client, buildUpdateRows(readyStaleRows));
      report.rows_inserted = await applyInserts(client, buildInsertPayloadRows(insertRows));
    }

    report.total_rows_affected = report.rows_updated + report.rows_inserted;
    report.external_mappings_total_after = await loadTableCount(
      client,
      MAPPINGS_TABLE,
      'where source = $1',
      [SOURCE],
    );
    report.canonical_row_count_after = await loadTableCount(client, CANONICAL_TABLE);
    report.canonical_writes_detected =
      report.canonical_row_count_before === report.canonical_row_count_after ? 0 : 1;
    report.fk_orphan_count_after = await countFkOrphans(client);

    if (report.canonical_writes_detected !== 0) {
      throw new Error(
        `CANONICAL_WRITE_DETECTED:${report.canonical_row_count_before}:${report.canonical_row_count_after}`,
      );
    }

    if (MODE === 'apply') {
      if (report.rows_updated !== EXPECTED_STALE_ROWS) {
        throw new Error(`UPDATED_ROWS_DRIFT:${report.rows_updated}:${EXPECTED_STALE_ROWS}`);
      }
      if (report.rows_inserted !== EXPECTED_INSERT_ROWS) {
        throw new Error(`INSERTED_ROWS_DRIFT:${report.rows_inserted}:${EXPECTED_INSERT_ROWS}`);
      }
      if (report.total_rows_affected !== EXPECTED_TOTAL_SCOPE) {
        throw new Error(
          `TOTAL_ROWS_AFFECTED_DRIFT:${report.total_rows_affected}:${EXPECTED_TOTAL_SCOPE}`,
        );
      }
      if (
        report.external_mappings_total_after !==
        report.external_mappings_total_before + EXPECTED_INSERT_ROWS
      ) {
        throw new Error(
          `EXTERNAL_MAPPINGS_TOTAL_DRIFT:${report.external_mappings_total_after}:${report.external_mappings_total_before + EXPECTED_INSERT_ROWS}`,
        );
      }
      if (await countDuplicateMappings(client) !== 0) {
        throw new Error('DUPLICATE_MAPPINGS_AFTER_APPLY');
      }
      if (report.fk_orphan_count_after !== 0) {
        throw new Error(`FK_ORPHAN_AFTER_DRIFT:${report.fk_orphan_count_after}`);
      }

      const expectedMappings = buildExpectedMappings(insertRows, readyStaleRows);
      report.expected_mapping_count_after = await countExpectedMappings(client, expectedMappings);
      if (report.expected_mapping_count_after !== EXPECTED_TOTAL_SCOPE) {
        throw new Error(
          `EXPECTED_MAPPING_VERIFICATION_DRIFT:${report.expected_mapping_count_after}:${EXPECTED_TOTAL_SCOPE}`,
        );
      }
    } else {
      report.expected_mapping_count_after = report.total_ready_scope;
    }

    report.mapping_integrity_status = 'clean';
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

    if (report.external_mappings_total_after === 0) {
      report.external_mappings_total_after = report.external_mappings_total_before;
    }
    if (report.canonical_row_count_after === 0) {
      report.canonical_row_count_after = report.canonical_row_count_before;
    }
    if (report.fk_orphan_count_after === 0) {
      report.fk_orphan_count_after = report.fk_orphan_count_before;
    }
    report.canonical_writes_detected =
      report.canonical_row_count_before === report.canonical_row_count_after ? 0 : 1;
    report.mapping_integrity_status = 'blocked_hard_gate';
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

