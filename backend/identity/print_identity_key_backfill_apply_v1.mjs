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
const PHASE = 'PRINT_IDENTITY_KEY_BACKFILL_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const EXPECTED_SAFE_BACKFILL_COUNT = 31;
const EXPECTED_BLOCKED_COUNT = 1332;
const EXPECTED_BLOCKER_SURFACE_COUNT = 1363;

const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019`´]/g;
const DELTA_VARIANTS_RE = /δ/gi;
const STAR_VARIANTS_RE = /[★*]/g;
const GX_SUFFIX_RE = /\s+GX\b/gi;
const EX_SUFFIX_RE = /\s+EX\b/gi;
const NON_ALNUM_RE = /[^a-zA-Z0-9]+/g;
const DASH_RUN_RE = /-+/g;
const EDGE_DASH_RE = /(^-|-$)/g;
const LEGACY_VARIANT_KEY_RE = /^[A-Za-z0-9_]+$/;
const PRINTED_IDENTITY_MODIFIER_RE = /^[a-z0-9_]+$/;

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

function trimToNull(value) {
  if (value == null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

function normalizePrintedNameToken(name) {
  let value = String(name ?? '');
  value = value.replace(APOSTROPHE_VARIANTS_RE, "'");
  value = value.replace(DELTA_VARIANTS_RE, ' delta ');
  value = value.replace(STAR_VARIANTS_RE, ' star ');
  value = value.replace(EX_SUFFIX_RE, '-ex');
  value = value.replace(GX_SUFFIX_RE, '-gx');
  value = value.replace(NON_ALNUM_RE, '-');
  value = value.replace(DASH_RUN_RE, '-');
  value = value.replace(EDGE_DASH_RE, '');
  return value.toLowerCase();
}

function deriveNumberPlainFromNumber(number) {
  const raw = trimToNull(number);
  if (!raw) {
    return null;
  }

  const numericOnly = raw.replace(/[^0-9]+/g, '');
  if (numericOnly !== '') {
    return numericOnly;
  }

  const normalized = raw
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(DASH_RUN_RE, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return normalized || null;
}

function normalizeVariantKey(row) {
  const variantKey = trimToNull(row.variant_key) ?? '';
  if (variantKey === '') {
    return '';
  }

  if (LEGACY_VARIANT_KEY_RE.test(variantKey)) {
    return variantKey.toLowerCase();
  }

  const joinedSetCode = trimToNull(row.joined_set_code);
  const numberPlain = trimToNull(row.number_plain);

  if (
    joinedSetCode === 'ex10' &&
    row.name === 'Unown' &&
    numberPlain &&
    variantKey === numberPlain
  ) {
    return variantKey;
  }

  return null;
}

function normalizePrintedIdentityModifier(value) {
  const modifier = trimToNull(value) ?? '';
  if (modifier === '') {
    return '';
  }

  if (PRINTED_IDENTITY_MODIFIER_RE.test(modifier)) {
    return modifier;
  }

  return null;
}

function deriveBackfillSurfaceRow(row) {
  const effectiveSetCode = trimToNull(row.set_code) ?? trimToNull(row.joined_set_code);
  const effectiveNumberPlain =
    trimToNull(row.number_plain) ?? deriveNumberPlainFromNumber(row.number);
  const normalizedPrintedNameToken = normalizePrintedNameToken(row.name);
  const normalizedVariantKey = normalizeVariantKey(row);
  const normalizedPrintedIdentityModifier = normalizePrintedIdentityModifier(
    row.printed_identity_modifier,
  );

  let executionLane = 'SAFE_BACKFILL_LANE';
  let laneReason = 'derivable under bounded extended rules';

  if (!effectiveSetCode) {
    executionLane = 'BLOCKED_LANE';
    laneReason = 'set_code unresolved after fallback';
  } else if (!effectiveNumberPlain) {
    executionLane = 'BLOCKED_LANE';
    laneReason = 'number_plain missing and not derivable';
  } else if (!normalizedPrintedNameToken) {
    executionLane = 'BLOCKED_LANE';
    laneReason = 'normalized printed name missing';
  } else if (normalizedVariantKey == null) {
    executionLane = 'BLOCKED_LANE';
    laneReason = 'variant_key outside bounded legacy contract';
  } else if (normalizedPrintedIdentityModifier == null) {
    executionLane = 'BLOCKED_LANE';
    laneReason = 'printed_identity_modifier malformed';
  }

  const computedPrintIdentityKey =
    executionLane === 'SAFE_BACKFILL_LANE'
      ? [
          effectiveSetCode,
          effectiveNumberPlain,
          normalizedPrintedNameToken,
          normalizedPrintedIdentityModifier || null,
        ]
          .filter((part) => part != null && part !== '')
          .join(':')
          .toLowerCase()
      : null;

  return {
    ...row,
    observed_set_code: trimToNull(row.joined_set_code) ?? trimToNull(row.set_code),
    current_print_identity_key: trimToNull(row.current_print_identity_key),
    effective_set_code: effectiveSetCode,
    effective_number_plain: effectiveNumberPlain,
    normalized_printed_name_token: normalizedPrintedNameToken,
    normalized_variant_key: normalizedVariantKey,
    normalized_printed_identity_modifier: normalizedPrintedIdentityModifier,
    execution_lane: executionLane,
    lane_reason: laneReason,
    computed_print_identity_key: computedPrintIdentityKey,
  };
}

async function loadCanonicalBlockerSurface(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_id,
        cp.set_code,
        s.code as joined_set_code,
        s.name as joined_set_name,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key as current_print_identity_key
      from public.card_prints cp
      left join public.sets s
        on s.id = cp.set_id
      where cp.gv_id is not null
        and (
          cp.set_code is null
          or btrim(cp.set_code) = ''
          or cp.number_plain is null
          or btrim(cp.number_plain) = ''
          or cp.name is null
          or btrim(cp.name) = ''
          or (
            coalesce(cp.variant_key, '') <> ''
            and cp.variant_key !~ '^[A-Za-z0-9_]+$'
          )
          or (
            coalesce(cp.printed_identity_modifier, '') <> ''
            and cp.printed_identity_modifier !~ '^[a-z0-9_]+$'
          )
        )
      order by coalesce(s.code, cp.set_code), cp.name, cp.id
    `,
  );
}

async function loadExistingNonNullPrintIdentityRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.set_id,
        cp.number_plain,
        cp.print_identity_key,
        coalesce(cp.variant_key, '') as variant_key
      from public.card_prints cp
      where cp.gv_id is not null
        and cp.print_identity_key is not null
      order by cp.id
    `,
  );
}

async function loadCanonicalSnapshot(client) {
  return queryOne(
    client,
    `
      select
        count(*)::int as total_rows,
        count(*) filter (where gv_id is not null)::int as canonical_rows,
        md5(
          string_agg(
            md5(concat_ws('|', id::text, coalesce(gv_id, ''))),
            '' order by id::text
          )
        ) as gvid_checksum
      from public.card_prints
    `,
  );
}

async function loadV3DuplicateGroups(client) {
  return queryRows(
    client,
    `
      select
        set_id,
        number_plain,
        print_identity_key,
        coalesce(variant_key, '') as variant_key,
        count(*)::int as rows_per_identity
      from public.card_prints
      where set_id is not null
        and number_plain is not null
        and print_identity_key is not null
      group by
        set_id,
        number_plain,
        print_identity_key,
        coalesce(variant_key, '')
      having count(*) > 1
      order by rows_per_identity desc, set_id, number_plain, print_identity_key
    `,
  );
}

async function loadRowsByIds(client, ids) {
  if (ids.length === 0) {
    return [];
  }

  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_id,
        cp.set_code,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key
      from public.card_prints cp
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [ids],
  );
}

function buildCompositeKey({ set_id, number_plain, print_identity_key, variant_key }) {
  return [
    String(set_id ?? ''),
    String(number_plain ?? ''),
    String(print_identity_key ?? ''),
    String(variant_key ?? ''),
  ].join('||');
}

function buildCollisionAudit(safeRows, existingRows) {
  const collisions = [];
  const safeByKey = new Map();
  const existingByKey = new Map();

  for (const row of existingRows) {
    const key = buildCompositeKey(row);
    if (!existingByKey.has(key)) {
      existingByKey.set(key, []);
    }
    existingByKey.get(key).push(row);
  }

  for (const row of safeRows) {
    const key = buildCompositeKey({
      set_id: row.set_id,
      number_plain: row.effective_number_plain,
      print_identity_key: row.computed_print_identity_key,
      variant_key: row.normalized_variant_key,
    });

    if (!safeByKey.has(key)) {
      safeByKey.set(key, []);
    }

    safeByKey.get(key).push(row);
  }

  for (const [collisionKey, rows] of safeByKey.entries()) {
    if (rows.length > 1) {
      collisions.push({
        collision_type: 'SAFE_LANE_INTERNAL_DUPLICATE',
        collision_key: collisionKey,
        rows: rows.map((row) => ({
          card_print_id: row.card_print_id,
          name: row.name,
          observed_set_code: row.observed_set_code,
          effective_number_plain: row.effective_number_plain,
          normalized_variant_key: row.normalized_variant_key,
          computed_print_identity_key: row.computed_print_identity_key,
        })),
      });
    }
  }

  for (const row of safeRows) {
    const key = buildCompositeKey({
      set_id: row.set_id,
      number_plain: row.effective_number_plain,
      print_identity_key: row.computed_print_identity_key,
      variant_key: row.normalized_variant_key,
    });

    const existing = existingByKey.get(key) ?? [];
    const conflictingExisting = existing.filter(
      (existingRow) => existingRow.card_print_id !== row.card_print_id,
    );

    if (conflictingExisting.length > 0) {
      collisions.push({
        collision_type: 'EXISTING_SURFACE_CONFLICT',
        collision_key: key,
        source_row: {
          card_print_id: row.card_print_id,
          name: row.name,
          observed_set_code: row.observed_set_code,
          effective_number_plain: row.effective_number_plain,
          normalized_variant_key: row.normalized_variant_key,
          computed_print_identity_key: row.computed_print_identity_key,
        },
        conflicting_existing_rows: conflictingExisting,
      });
    }
  }

  return collisions;
}

function assertLaneSurface(surface) {
  const safeRows = surface.filter((row) => row.execution_lane === 'SAFE_BACKFILL_LANE');
  const blockedRows = surface.filter((row) => row.execution_lane === 'BLOCKED_LANE');

  assertEqual(surface.length, EXPECTED_BLOCKER_SURFACE_COUNT, 'BLOCKER_SURFACE_COUNT_DRIFT');
  assertEqual(safeRows.length, EXPECTED_SAFE_BACKFILL_COUNT, 'SAFE_BACKFILL_COUNT_DRIFT');
  assertEqual(blockedRows.length, EXPECTED_BLOCKED_COUNT, 'BLOCKED_COUNT_DRIFT');

  for (const row of safeRows) {
    if (!row.gv_id) {
      throw new Error(`NON_CANONICAL_ROW_ENTERED_SAFE_SCOPE:${row.card_print_id}`);
    }
    if (!row.computed_print_identity_key) {
      throw new Error(`SAFE_ROW_MISSING_COMPUTED_KEY:${row.card_print_id}`);
    }
  }

  return {
    safeRows,
    blockedRows,
  };
}

function classifySafeRows(safeRows) {
  const rowsNeedingUpdate = [];
  const rowsAlreadyApplied = [];
  const unexpectedHydratedRows = [];

  for (const row of safeRows) {
    if (row.current_print_identity_key == null) {
      rowsNeedingUpdate.push(row);
      continue;
    }

    if (row.current_print_identity_key === row.computed_print_identity_key) {
      rowsAlreadyApplied.push(row);
      continue;
    }

    unexpectedHydratedRows.push(row);
  }

  return {
    rowsNeedingUpdate,
    rowsAlreadyApplied,
    unexpectedHydratedRows,
  };
}

async function applyBackfill(client, rowsNeedingUpdate) {
  if (rowsNeedingUpdate.length === 0) {
    return {
      rows_updated: 0,
      updated_rows: [],
    };
  }

  const values = [];
  const params = [];

  for (const row of rowsNeedingUpdate) {
    const baseIndex = params.length + 1;
    values.push(
      `($${baseIndex}::uuid, $${baseIndex + 1}::text, $${baseIndex + 2}::text, $${baseIndex + 3}::text)`,
    );
    params.push(
      row.card_print_id,
      row.gv_id,
      row.current_print_identity_key,
      row.computed_print_identity_key,
    );
  }

  const { rows, rowCount } = await client.query(
    `
      with updates(card_print_id, expected_gv_id, expected_current_print_identity_key, computed_print_identity_key) as (
        values ${values.join(', ')}
      )
      update public.card_prints cp
      set print_identity_key = u.computed_print_identity_key
      from updates u
      where cp.id = u.card_print_id
        and cp.gv_id = u.expected_gv_id
        and cp.print_identity_key is not distinct from u.expected_current_print_identity_key
      returning
        cp.id as card_print_id,
        cp.name as current_name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.print_identity_key,
        cp.gv_id
    `,
    params,
  );

  assertEqual(rowCount ?? 0, rowsNeedingUpdate.length, 'ROWS_UPDATED_COUNT_DRIFT');

  return {
    rows_updated: rowCount ?? 0,
    updated_rows: rows,
  };
}

function buildSampleRows(rows) {
  return rows
    .slice()
    .sort((left, right) => {
      const leftKey = [
        left.observed_set_code ?? '',
        left.name ?? '',
        left.card_print_id ?? '',
      ].join('||');
      const rightKey = [
        right.observed_set_code ?? '',
        right.name ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, 5)
    .map((row) => ({
      card_print_id: row.card_print_id,
      current_name: row.name,
      set_code: row.effective_set_code ?? row.observed_set_code,
      number_plain: row.effective_number_plain,
      variant_key: row.normalized_variant_key,
      computed_print_identity_key: row.computed_print_identity_key,
    }));
}

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    expected_counts: {
      blocker_surface: EXPECTED_BLOCKER_SURFACE_COUNT,
      safe_backfill: EXPECTED_SAFE_BACKFILL_COUNT,
      blocked: EXPECTED_BLOCKED_COUNT,
    },
    blocker_surface_count: 0,
    safe_backfill_count: 0,
    blocked_count: 0,
    rows_needing_update: 0,
    rows_already_applied: 0,
    collision_count: 0,
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    v3_duplicate_groups_before: [],
    v3_duplicate_groups_after: [],
    blocked_rows_nonnull_before: 0,
    blocked_rows_nonnull_after: 0,
    apply_operations: null,
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

    const blockerRows = await loadCanonicalBlockerSurface(client);
    const derivedSurface = blockerRows.map(deriveBackfillSurfaceRow);
    const { safeRows, blockedRows } = assertLaneSurface(derivedSurface);
    const safeRowClassification = classifySafeRows(safeRows);
    const existingNonNullRows = await loadExistingNonNullPrintIdentityRows(client);
    const collisionAudit = buildCollisionAudit(safeRows, existingNonNullRows);

    if (safeRowClassification.unexpectedHydratedRows.length > 0) {
      throw new Error(
        `SAFE_ROW_PRINT_IDENTITY_KEY_DRIFT:${JSON.stringify(
          safeRowClassification.unexpectedHydratedRows.map((row) => ({
            card_print_id: row.card_print_id,
            current_print_identity_key: row.current_print_identity_key,
            computed_print_identity_key: row.computed_print_identity_key,
          })),
        )}`,
      );
    }

    if (
      !(
        (safeRowClassification.rowsNeedingUpdate.length === EXPECTED_SAFE_BACKFILL_COUNT &&
          safeRowClassification.rowsAlreadyApplied.length === 0) ||
        (safeRowClassification.rowsNeedingUpdate.length === 0 &&
          safeRowClassification.rowsAlreadyApplied.length === EXPECTED_SAFE_BACKFILL_COUNT)
      )
    ) {
      throw new Error(
        `SAFE_BACKFILL_HYDRATION_STATE_DRIFT:${safeRowClassification.rowsNeedingUpdate.length}:${safeRowClassification.rowsAlreadyApplied.length}:${EXPECTED_SAFE_BACKFILL_COUNT}`,
      );
    }

    if (collisionAudit.length > 0) {
      throw new Error(`SAFE_BACKFILL_COLLISION:${JSON.stringify(collisionAudit)}`);
    }

    report.blocker_surface_count = derivedSurface.length;
    report.safe_backfill_count = safeRows.length;
    report.blocked_count = blockedRows.length;
    report.rows_needing_update = safeRowClassification.rowsNeedingUpdate.length;
    report.rows_already_applied = safeRowClassification.rowsAlreadyApplied.length;
    report.collision_count = collisionAudit.length;
    report.sample_rows = buildSampleRows(safeRows);

    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_before = await loadV3DuplicateGroups(client);
    report.blocked_rows_nonnull_before = blockedRows.filter(
      (row) => row.current_print_identity_key != null,
    ).length;

    assertZero(report.blocked_rows_nonnull_before, 'BLOCKED_ROWS_ALREADY_TOUCHED');
    assertZero(report.v3_duplicate_groups_before.length, 'V3_DUPLICATE_GROUPS_BEFORE');

    if (MODE !== 'apply') {
      report.status =
        safeRowClassification.rowsNeedingUpdate.length === 0
          ? 'dry_run_already_applied'
          : 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyBackfill(client, safeRowClassification.rowsNeedingUpdate);

    const postApplyCanonicalSnapshot = await loadCanonicalSnapshot(client);
    const postApplyV3DuplicateGroups = await loadV3DuplicateGroups(client);
    const blockedRowsAfter = await loadRowsByIds(
      client,
      blockedRows.map((row) => row.card_print_id),
    );
    const targetRowsAfter = await loadRowsByIds(
      client,
      safeRows.map((row) => row.card_print_id),
    );

    report.canonical_snapshot_after = postApplyCanonicalSnapshot;
    report.v3_duplicate_groups_after = postApplyV3DuplicateGroups;
    report.blocked_rows_nonnull_after = blockedRowsAfter.filter(
      (row) => trimToNull(row.print_identity_key) != null,
    ).length;

    assertEqual(
      normalizeCount(postApplyCanonicalSnapshot?.total_rows),
      normalizeCount(report.canonical_snapshot_before?.total_rows),
      'TOTAL_ROW_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(postApplyCanonicalSnapshot?.canonical_rows),
      normalizeCount(report.canonical_snapshot_before?.canonical_rows),
      'CANONICAL_ROW_COUNT_DRIFT',
    );
    assertEqual(
      postApplyCanonicalSnapshot?.gvid_checksum ?? null,
      report.canonical_snapshot_before?.gvid_checksum ?? null,
      'GVID_CHECKSUM_DRIFT',
    );
    assertZero(postApplyV3DuplicateGroups.length, 'V3_DUPLICATE_GROUPS_AFTER');
    assertZero(report.blocked_rows_nonnull_after, 'BLOCKED_ROWS_TOUCHED_AFTER');

    const targetAfterById = new Map(targetRowsAfter.map((row) => [row.card_print_id, row]));

    for (const row of safeRows) {
      const afterRow = targetAfterById.get(row.card_print_id);
      if (!afterRow) {
        throw new Error(`TARGET_ROW_MISSING_AFTER:${row.card_print_id}`);
      }

      if (trimToNull(afterRow.print_identity_key) !== row.computed_print_identity_key) {
        throw new Error(
          `TARGET_PRINT_IDENTITY_KEY_DRIFT_AFTER:${row.card_print_id}:${trimToNull(
            afterRow.print_identity_key,
          )}:${row.computed_print_identity_key}`,
        );
      }
    }

    report.status =
      safeRowClassification.rowsNeedingUpdate.length === 0
        ? 'apply_already_applied'
        : 'apply_passed';

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
