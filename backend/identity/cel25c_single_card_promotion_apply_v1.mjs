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
const PHASE = 'CEL25C_HERE_COMES_TEAM_ROCKET_CANONICAL_PROMOTION_V1';
const TARGET_SET_CODE = 'cel25c';
const TARGET_NAME = 'Here Comes Team Rocket!';
const TARGET_NUMBER = '15';
const TARGET_NUMBER_PLAIN = '15';
const TARGET_VARIANT_KEY = 'cc';
const TARGET_GV_ID = 'GV-PK-CEL-15CC';
const TARGET_EXTERNAL_ID = 'pokemon-celebrations-classic-collection-here-comes-team-rocket-classic-collection';

const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

function normalizeCount(value) {
  return Number(value ?? 0);
}

async function queryOne(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows[0] ?? null;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function loadSetMetadata(client) {
  const row = await queryOne(
    client,
    `
      select id, code, name, printed_set_abbrev
      from public.sets
      where code = $1
    `,
    [TARGET_SET_CODE],
  );

  if (!row) {
    throw new Error(`TARGET_SET_NOT_FOUND:${TARGET_SET_CODE}`);
  }

  return row;
}

async function loadCurrentState(client, setId) {
  const [
    canonicalCountRow,
    existingCanonicalRow,
    sourcePlaceholderRows,
    identityKeyCollisions,
    gvIdCollisions,
    staleMappingRow,
  ] = await Promise.all([
    queryOne(
      client,
      `
        select count(*)::int as canonical_count
        from public.card_prints
        where set_id = $1
          and gv_id is not null
      `,
      [setId],
    ),
    queryOne(
      client,
      `
        select
          cp.id,
          cp.name,
          cp.number,
          cp.number_plain,
          coalesce(cp.variant_key, '') as variant_key,
          coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
          cp.gv_id
        from public.card_prints cp
        where cp.set_id = $1
          and cp.gv_id is not null
          and cp.name = $2
          and cp.number = $3
          and coalesce(cp.variant_key, '') = $4
      `,
      [setId, TARGET_NAME, TARGET_NUMBER, TARGET_VARIANT_KEY],
    ),
    queryRows(
      client,
      `
        select
          cp.id,
          cp.name,
          cp.number,
          cp.number_plain,
          coalesce(cp.variant_key, '') as variant_key,
          coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
          cp.gv_id
        from public.card_prints cp
        where cp.set_id = $1
          and cp.gv_id is null
          and cp.name = $2
          and cp.number = $3
        order by cp.id
      `,
      [setId, TARGET_NAME, TARGET_NUMBER],
    ),
    queryRows(
      client,
      `
        select
          cp.id as collision_target_id,
          cp.name as collision_target_name,
          cp.number as collision_target_number,
          cp.number_plain as collision_target_number_plain,
          coalesce(cp.variant_key, '') as collision_target_variant_key,
          coalesce(cp.printed_identity_modifier, '') as collision_target_printed_identity_modifier,
          cp.gv_id as collision_target_gv_id
        from public.card_prints cp
        where cp.set_id = $1
          and cp.gv_id is not null
          and cp.number_plain = $2
          and coalesce(cp.variant_key, '') = $3
        order by cp.id
      `,
      [setId, TARGET_NUMBER_PLAIN, TARGET_VARIANT_KEY],
    ),
    queryRows(
      client,
      `
        select
          cp.id as collision_target_id,
          cp.name as collision_target_name,
          cp.number as collision_target_number,
          cp.number_plain as collision_target_number_plain,
          coalesce(cp.variant_key, '') as collision_target_variant_key,
          coalesce(cp.printed_identity_modifier, '') as collision_target_printed_identity_modifier,
          cp.gv_id as collision_target_gv_id,
          s.code as collision_target_set_code
        from public.card_prints cp
        join public.sets s
          on s.id = cp.set_id
        where cp.gv_id = $1
        order by cp.id
      `,
      [TARGET_GV_ID],
    ),
    queryOne(
      client,
      `
        select
          em.id as external_mapping_id,
          em.external_id,
          em.card_print_id as current_card_print_id,
          cp.name as current_name,
          cp.number as current_number,
          cp.gv_id as current_gv_id
        from public.external_mappings em
        join public.card_prints cp
          on cp.id = em.card_print_id
        where em.source = 'justtcg'
          and em.active is true
          and em.external_id = $1
      `,
      [TARGET_EXTERNAL_ID],
    ),
  ]);

  return {
    canonical_count_before: normalizeCount(canonicalCountRow?.canonical_count),
    existing_canonical_row: existingCanonicalRow,
    source_placeholder_rows: sourcePlaceholderRows,
    identity_key_collisions: identityKeyCollisions,
    gv_id_collisions: gvIdCollisions,
    stale_mapping_row: staleMappingRow,
  };
}

function buildProposedRow(setMetadata) {
  return {
    set_id: setMetadata.id,
    set_code: setMetadata.code,
    name: TARGET_NAME,
    number: TARGET_NUMBER,
    number_plain: TARGET_NUMBER_PLAIN,
    variant_key: TARGET_VARIANT_KEY,
    printed_identity_modifier: '',
    proposed_gv_id: TARGET_GV_ID,
  };
}

function buildPreconditions(state) {
  return {
    set_exists: true,
    existing_row_count: state.existing_canonical_row ? 1 : 0,
    source_placeholder_count: state.source_placeholder_rows.length,
    identity_key_collision_count: state.identity_key_collisions.length,
    gv_id_collision_count: state.gv_id_collisions.length,
  };
}

function assertHardGates(preconditions, state) {
  if (preconditions.source_placeholder_count !== 1) {
    throw new Error(`SOURCE_PLACEHOLDER_COUNT_DRIFT:${preconditions.source_placeholder_count}:expected=1`);
  }

  if (preconditions.existing_row_count !== 0) {
    throw new Error(`CANONICAL_ROW_ALREADY_EXISTS:${state.existing_canonical_row.id}`);
  }

  if (preconditions.identity_key_collision_count !== 0) {
    throw new Error(`IDENTITY_KEY_COLLISION:${preconditions.identity_key_collision_count}`);
  }

  if (preconditions.gv_id_collision_count !== 0) {
    throw new Error(`GV_ID_COLLISION:${preconditions.gv_id_collision_count}`);
  }
}

async function insertCanonicalRow(client, proposedRow) {
  const inserted = await queryOne(
    client,
    `
      insert into public.card_prints (
        set_id,
        name,
        number,
        number_plain,
        variant_key,
        printed_identity_modifier,
        set_code,
        gv_id
      )
      values ($1, $2, $3, $4, $5, nullif($6, ''), $7, $8)
      returning
        id,
        set_id,
        set_code,
        name,
        number,
        number_plain,
        coalesce(variant_key, '') as variant_key,
        coalesce(printed_identity_modifier, '') as printed_identity_modifier,
        gv_id
    `,
    [
      proposedRow.set_id,
      proposedRow.name,
      proposedRow.number,
      proposedRow.number_plain,
      proposedRow.variant_key,
      proposedRow.printed_identity_modifier,
      proposedRow.set_code,
      proposedRow.proposed_gv_id,
    ],
  );

  if (!inserted) {
    throw new Error('INSERT_FAILED:NO_ROW_RETURNED');
  }

  return inserted;
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    set_code: TARGET_SET_CODE,
    proposed_row: null,
    preconditions: null,
    source_placeholder_rows: [],
    identity_key_collisions: [],
    gv_id_collisions: [],
    stale_mapping_row: null,
    rows_inserted: 0,
    canonical_count_delta: 0,
    gv_id_created: null,
    sample_row: null,
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

    const setMetadata = await loadSetMetadata(client);
    const proposedRow = buildProposedRow(setMetadata);
    const state = await loadCurrentState(client, setMetadata.id);
    const preconditions = buildPreconditions(state);

    report.proposed_row = proposedRow;
    report.preconditions = preconditions;
    report.source_placeholder_rows = state.source_placeholder_rows;
    report.identity_key_collisions = state.identity_key_collisions;
    report.gv_id_collisions = state.gv_id_collisions;
    report.stale_mapping_row = state.stale_mapping_row;
    report.sample_row = {
      source_placeholder_id: state.source_placeholder_rows[0]?.id ?? null,
      name: proposedRow.name,
      number: proposedRow.number,
      number_plain: proposedRow.number_plain,
      variant_key: proposedRow.variant_key,
      proposed_gv_id: proposedRow.proposed_gv_id,
      collision_targets: {
        identity_key: state.identity_key_collisions.map((row) => ({
          id: row.collision_target_id,
          name: row.collision_target_name,
          number: row.collision_target_number,
          gv_id: row.collision_target_gv_id,
        })),
        gv_id: state.gv_id_collisions.map((row) => ({
          id: row.collision_target_id,
          name: row.collision_target_name,
          set_code: row.collision_target_set_code,
          gv_id: row.collision_target_gv_id,
        })),
      },
    };

    assertHardGates(preconditions, state);

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const inserted = await insertCanonicalRow(client, proposedRow);
    const canonicalCountAfterRow = await queryOne(
      client,
      `
        select count(*)::int as canonical_count
        from public.card_prints
        where set_id = $1
          and gv_id is not null
      `,
      [setMetadata.id],
    );

    report.rows_inserted = 1;
    report.canonical_count_delta = normalizeCount(canonicalCountAfterRow?.canonical_count) - state.canonical_count_before;
    report.gv_id_created = inserted.gv_id;
    report.sample_row = inserted;
    report.status = 'apply_passed';

    if (report.canonical_count_delta !== 1) {
      throw new Error(`CANONICAL_COUNT_DELTA_DRIFT:${report.canonical_count_delta}:expected=1`);
    }

    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }

    report.status = 'blocked_hard_gate';
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
