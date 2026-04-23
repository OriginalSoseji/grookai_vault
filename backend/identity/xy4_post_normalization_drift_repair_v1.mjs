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
const PHASE = 'XY4_POST_NORMALIZATION_DRIFT_REPAIR_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'xy4';
const TARGET_ROW_ID = 'f0a82330-0795-40cf-9994-0b77c9494ba8';
const TARGET_GV_ID = 'GV-PK-PHF-24A';
const TARGET_OLD_NAME = 'M Manectric EX';
const TARGET_NEW_NAME = 'M Manectric-EX';
const EXPECTED_CANONICAL_COUNT = 123;
const MAX_EXPECTED_DRIFT_ROWS = 1;

const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019`´]/g;
const DASH_SEPARATOR_VARIANTS_RE = /[\u2013\u2014]/g;
const TERMINAL_EX_RE = /([A-Za-z0-9])(?:\s*-\s*|\s+)+EX$/i;
const TERMINAL_GX_RE = /([A-Za-z0-9])(?:\s*-\s*|\s+)+GX$/i;

function normalizeCount(value) {
  return Number(value ?? 0);
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

function collapseWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function toCanonicalDisplayNameV3(name) {
  let value = String(name ?? '');
  value = value.replace(APOSTROPHE_VARIANTS_RE, "'");
  value = value.replace(DASH_SEPARATOR_VARIANTS_RE, ' ');
  value = collapseWhitespace(value);
  value = value.replace(TERMINAL_GX_RE, '$1-GX');
  value = value.replace(TERMINAL_EX_RE, '$1-EX');
  value = collapseWhitespace(value);
  return value;
}

function toNameNormalizeV3Key(name) {
  let value = String(name ?? '');
  value = value.replace(APOSTROPHE_VARIANTS_RE, "'");
  value = value.replace(DASH_SEPARATOR_VARIANTS_RE, ' ');
  value = collapseWhitespace(value);
  value = value.replace(TERMINAL_GX_RE, '$1 GX');
  value = value.replace(TERMINAL_EX_RE, '$1 EX');
  value = collapseWhitespace(value).toLowerCase();
  return value;
}

async function loadCanonicalRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id,
        cp.name as current_name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.gv_id
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
      order by cp.number_plain, coalesce(cp.variant_key, ''), cp.id
    `,
    [TARGET_SET_CODE],
  );
}

function buildNormalizationSurface(canonicalRows) {
  return canonicalRows.map((row) => {
    const proposed_name = toCanonicalDisplayNameV3(row.current_name);
    const current_key = toNameNormalizeV3Key(row.current_name);
    const proposed_key = toNameNormalizeV3Key(proposed_name);
    return {
      ...row,
      proposed_name,
      current_key,
      proposed_key,
      is_drift: proposed_name !== row.current_name,
    };
  });
}

function buildCollisionAudit(surface) {
  const collisions = new Map();
  for (const row of surface) {
    const key = [row.number_plain ?? '', row.variant_key ?? '', row.proposed_name].join('||');
    if (!collisions.has(key)) collisions.set(key, []);
    collisions.get(key).push({
      id: row.id,
      gv_id: row.gv_id,
      current_name: row.current_name,
      proposed_name: row.proposed_name,
      variant_key: row.variant_key,
      number_plain: row.number_plain,
    });
  }
  return [...collisions.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([collision_key, rows]) => ({ collision_key, rows }));
}

function assertNormalizationSurface(surface, collisionAudit) {
  const driftRows = surface.filter((row) => row.is_drift);
  for (const row of surface) {
    if (!row.gv_id) {
      throw new Error(`NON_CANONICAL_ROW_ENTERED_SCOPE:${row.id}`);
    }
    if (row.current_key !== row.proposed_key) {
      throw new Error(`NORMALIZATION_KEY_DRIFT:${row.id}:${row.current_key}:${row.proposed_key}`);
    }
  }
  if (driftRows.length > MAX_EXPECTED_DRIFT_ROWS) {
    throw new Error(`DRIFT_SCOPE_COUNT_DRIFT:${driftRows.length}:${MAX_EXPECTED_DRIFT_ROWS}`);
  }
  if (collisionAudit.length > 0) {
    throw new Error(`NORMALIZATION_COLLISION:${JSON.stringify(collisionAudit)}`);
  }
}

function assertDriftRows(driftRows) {
  assertEqual(driftRows.length, 1, 'DRIFT_ROW_COUNT_DRIFT');
  const row = driftRows[0];
  assertEqual(row.id, TARGET_ROW_ID, 'TARGET_ROW_ID_DRIFT');
  assertEqual(row.current_name, TARGET_OLD_NAME, 'TARGET_OLD_NAME_DRIFT');
  assertEqual(row.proposed_name, TARGET_NEW_NAME, 'TARGET_NEW_NAME_DRIFT');
  assertEqual(row.number, '24a', 'TARGET_NUMBER_DRIFT');
  assertEqual(row.number_plain, '24', 'TARGET_NUMBER_PLAIN_DRIFT');
  assertEqual(row.variant_key, 'a', 'TARGET_VARIANT_KEY_DRIFT');
  assertEqual(row.gv_id, TARGET_GV_ID, 'TARGET_GVID_DRIFT');
}

async function loadRegexDriftRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.gv_id
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
        and (
          cp.name like '%' || chr(8217) || '%'
          or cp.name like '% GX%'
          or cp.name like '% EX%'
          or cp.name like '%' || chr(8212) || '%'
          or cp.name like '%' || chr(8211) || '%'
        )
      order by cp.number_plain, coalesce(cp.variant_key, ''), cp.id
    `,
    [TARGET_SET_CODE],
  );
}

async function loadFkOrphanCounts(client) {
  return (
    await queryOne(
      client,
      `
        select
          (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)) as card_print_identity_orphans,
          (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)) as card_print_traits_orphans,
          (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)) as card_printings_orphans,
          (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)) as external_mappings_orphans,
          (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints)) as vault_items_orphans
      `,
    )
  ) ?? {
    card_print_identity_orphans: 0,
    card_print_traits_orphans: 0,
    card_printings_orphans: 0,
    external_mappings_orphans: 0,
    vault_items_orphans: 0,
  };
}

function assertZeroFkOrphans(fkCounts, prefix) {
  assertZero(fkCounts?.card_print_identity_orphans, `${prefix}_CARD_PRINT_IDENTITY_ORPHANS`);
  assertZero(fkCounts?.card_print_traits_orphans, `${prefix}_CARD_PRINT_TRAITS_ORPHANS`);
  assertZero(fkCounts?.card_printings_orphans, `${prefix}_CARD_PRINTINGS_ORPHANS`);
  assertZero(fkCounts?.external_mappings_orphans, `${prefix}_EXTERNAL_MAPPINGS_ORPHANS`);
  assertZero(fkCounts?.vault_items_orphans, `${prefix}_VAULT_ITEMS_ORPHANS`);
}

async function loadCanonicalCount(client) {
  return queryOne(
    client,
    `
      select count(*)::int as canonical_count
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
    `,
    [TARGET_SET_CODE],
  );
}

async function applyNameUpdate(client, driftRow) {
  const { rows, rowCount } = await client.query(
    `
      update public.card_prints cp
      set name = $2
      where cp.id = $1
        and cp.name = $3
        and cp.gv_id = $4
      returning
        cp.id,
        $3::text as old_name,
        cp.name as new_name,
        cp.gv_id
    `,
    [driftRow.id, driftRow.proposed_name, driftRow.current_name, driftRow.gv_id],
  );

  if ((rowCount ?? 0) !== 1) {
    throw new Error(`ROWS_UPDATED_COUNT_DRIFT:${rowCount ?? 0}:1`);
  }

  return {
    rows_updated: rowCount ?? 0,
    updated_row: rows[0] ?? null,
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
    target_set_code: TARGET_SET_CODE,
    target_row_id: TARGET_ROW_ID,
    target_gv_id: TARGET_GV_ID,
    normalization_contract: {
      name_normalize: 'NAME_NORMALIZE_V3',
      case_preserving_storage: true,
      canonical_suffix_tokens: ['EX', 'GX'],
      max_expected_drift_rows: MAX_EXPECTED_DRIFT_ROWS,
    },
    drift_rows_detected: 0,
    drift_rows: [],
    collision_audit: [],
    regex_drift_rows_before: [],
    regex_drift_rows_after: [],
    fk_orphan_counts_before: null,
    fk_orphan_counts_after: null,
    canonical_count_before: null,
    canonical_count_after: null,
    apply_operations: null,
    status: 'running',
  };

  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    application_name: `xy4_post_normalization_drift_repair_v1:${MODE}`,
  });

  await client.connect();

  try {
    await client.query('begin');

    const canonicalRowsBefore = await loadCanonicalRows(client);
    const surfaceBefore = buildNormalizationSurface(canonicalRowsBefore);
    const driftRowsBefore = surfaceBefore.filter((row) => row.is_drift);
    const collisionAuditBefore = buildCollisionAudit(surfaceBefore);

    assertNormalizationSurface(surfaceBefore, collisionAuditBefore);
    assertDriftRows(driftRowsBefore);

    report.drift_rows_detected = driftRowsBefore.length;
    report.drift_rows = driftRowsBefore.map((row) => ({
      id: row.id,
      current_name: row.current_name,
      normalized_name: row.proposed_name,
      number: row.number,
      number_plain: row.number_plain,
      variant_key: row.variant_key,
      gv_id: row.gv_id,
    }));
    report.collision_audit = collisionAuditBefore;

    report.regex_drift_rows_before = await loadRegexDriftRows(client);
    assertEqual(report.regex_drift_rows_before.length, 1, 'REGEX_DRIFT_COUNT_BEFORE_DRIFT');
    assertEqual(report.regex_drift_rows_before[0]?.id, TARGET_ROW_ID, 'REGEX_DRIFT_ROW_ID_DRIFT');

    report.fk_orphan_counts_before = await loadFkOrphanCounts(client);
    assertZeroFkOrphans(report.fk_orphan_counts_before, 'BEFORE');

    report.canonical_count_before = await loadCanonicalCount(client);
    assertEqual(normalizeCount(report.canonical_count_before?.canonical_count), EXPECTED_CANONICAL_COUNT, 'CANONICAL_COUNT_BEFORE_DRIFT');

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyNameUpdate(client, driftRowsBefore[0]);
    assertEqual(report.apply_operations?.updated_row?.id, TARGET_ROW_ID, 'UPDATED_ROW_ID_DRIFT');
    assertEqual(report.apply_operations?.updated_row?.old_name, TARGET_OLD_NAME, 'UPDATED_ROW_OLD_NAME_DRIFT');
    assertEqual(report.apply_operations?.updated_row?.new_name, TARGET_NEW_NAME, 'UPDATED_ROW_NEW_NAME_DRIFT');
    assertEqual(report.apply_operations?.updated_row?.gv_id, TARGET_GV_ID, 'UPDATED_ROW_GVID_DRIFT');

    const canonicalRowsAfter = await loadCanonicalRows(client);
    const surfaceAfter = buildNormalizationSurface(canonicalRowsAfter);
    const driftRowsAfter = surfaceAfter.filter((row) => row.is_drift);
    const collisionAuditAfter = buildCollisionAudit(surfaceAfter);

    if (collisionAuditAfter.length > 0) {
      throw new Error(`POST_APPLY_COLLISION:${JSON.stringify(collisionAuditAfter)}`);
    }
    for (const row of surfaceAfter) {
      if (row.current_key !== row.proposed_key) {
        throw new Error(`POST_APPLY_NORMALIZATION_KEY_DRIFT:${row.id}:${row.current_key}:${row.proposed_key}`);
      }
    }

    report.regex_drift_rows_after = await loadRegexDriftRows(client);
    report.fk_orphan_counts_after = await loadFkOrphanCounts(client);
    report.canonical_count_after = await loadCanonicalCount(client);

    assertEqual(driftRowsAfter.length, 0, 'DRIFT_ROWS_AFTER_DRIFT');
    assertEqual(report.regex_drift_rows_after.length, 0, 'REGEX_DRIFT_ROWS_AFTER_DRIFT');
    assertZeroFkOrphans(report.fk_orphan_counts_after, 'AFTER');
    assertEqual(
      normalizeCount(report.canonical_count_after?.canonical_count),
      normalizeCount(report.canonical_count_before?.canonical_count),
      'CANONICAL_COUNT_AFTER_DRIFT',
    );

    report.status = 'apply_passed';
    await client.query('commit');
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
