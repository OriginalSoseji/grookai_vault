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
const PHASE = 'PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const EXPECTED_PROMO_ROW_COUNT = 181;
const EXPECTED_PROMO_CANONICAL_COUNT = 167;
const EXPECTED_PROMO_VARIANT_COUNT = 14;
const EXPECTED_NON_CANONICAL_COUNT = 0;
const EXPECTED_REMAINING_BLOCKED_ROWS_BEFORE = 639;
const EXPECTED_REMAINING_BLOCKED_ROWS_AFTER = 458;
const PROMO_SET_CODES = ['2021swsh', 'me01', 'svp'];

const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019`´]/g;
const DELTA_VARIANTS_RE = /δ/gi;
const STAR_VARIANTS_RE = /[★*]/g;
const GX_SUFFIX_RE = /\s+GX\b/gi;
const EX_SUFFIX_RE = /\s+EX\b/gi;
const NON_ALNUM_RE = /[^a-zA-Z0-9]+/g;
const DASH_RUN_RE = /-+/g;
const EDGE_DASH_RE = /(^-|-$)/g;

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

function extractPromoNumber(tcgdexExternalId, setCode) {
  const externalId = trimToNull(tcgdexExternalId);
  const normalizedSetCode = trimToNull(setCode);

  if (!externalId || !normalizedSetCode) {
    return null;
  }

  const prefix = `${normalizedSetCode}-`;
  if (!externalId.startsWith(prefix)) {
    return null;
  }

  const suffix = trimToNull(externalId.slice(prefix.length));
  return suffix;
}

function derivePromoSurfaceRow(row) {
  const setCode = trimToNull(row.joined_set_code);
  const normalizedName = normalizePrintedNameToken(row.name);
  const printedIdentityModifier = trimToNull(row.printed_identity_modifier);
  const promoNumber =
    trimToNull(row.tcgdex_local_id) ?? extractPromoNumber(row.tcgdex_external_id, setCode);

  let numberingClass = 'PROMO_NUMBER_ABSENT';
  if (promoNumber) {
    numberingClass = 'PROMO_NUMBER_PRESENT';
  } else if (printedIdentityModifier) {
    numberingClass = 'STAMP_VARIANT';
  } else if (trimToNull(row.tcgdex_external_id)) {
    numberingClass = 'EVENT_IDENTIFIER_PRESENT';
  }

  let computedPrintIdentityKey = null;
  if (promoNumber) {
    computedPrintIdentityKey = [setCode, promoNumber, normalizedName]
      .filter((part) => part != null && part !== '')
      .join(':')
      .toLowerCase();
  } else if (printedIdentityModifier) {
    computedPrintIdentityKey = [setCode, normalizedName, printedIdentityModifier]
      .filter((part) => part != null && part !== '')
      .join(':')
      .toLowerCase();
  }

  return {
    ...row,
    observed_set_code: setCode,
    current_print_identity_key: trimToNull(row.current_print_identity_key),
    promo_number: promoNumber,
    normalized_name: normalizedName,
    numbering_class: numberingClass,
    computed_print_identity_key: computedPrintIdentityKey,
  };
}

async function loadPromoSurface(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_id,
        s.code as joined_set_code,
        s.name as joined_set_name,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key as current_print_identity_key,
        em.external_id as tcgdex_external_id,
        ri.payload->'card'->>'localId' as tcgdex_local_id,
        ri.payload->'card'->>'number' as tcgdex_number,
        ri.payload->'card'->'set'->>'id' as tcgdex_set_id,
        ri.payload->'card'->'set'->>'name' as tcgdex_set_name
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
      join public.external_mappings em
        on em.card_print_id = cp.id
       and em.source = 'tcgdex'
       and em.active is true
      left join public.raw_imports ri
        on ri.source = 'tcgdex'
       and coalesce(
            ri.payload->>'_external_id',
            ri.payload->>'id',
            ri.payload->'card'->>'id',
            ri.payload->'card'->>'_id'
          ) = em.external_id
      where cp.gv_id is not null
        and (cp.set_code is null or btrim(cp.set_code) = '')
        and (cp.number is null or btrim(cp.number) = '')
        and (cp.number_plain is null or btrim(cp.number_plain) = '')
        and s.code = any($1::text[])
      order by s.code, cp.name, cp.id
    `,
    [PROMO_SET_CODES],
  );
}

async function loadExistingNonNullPrintIdentityRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.print_identity_key
      from public.card_prints cp
      where cp.print_identity_key is not null
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
        cp.name,
        cp.print_identity_key
      from public.card_prints cp
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [ids],
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

async function loadRemainingBlockedRows(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as blocked_row_count
      from public.card_prints cp
      where cp.gv_id is not null
        and cp.print_identity_key is null
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
    `,
  );

  return normalizeCount(row?.blocked_row_count);
}

function classifyPromoRows(rows) {
  const sameNameCounts = new Map();
  const exactKeyCounts = new Map();

  for (const row of rows) {
    const sameNameKey = `${row.observed_set_code ?? ''}||${row.normalized_name ?? ''}`;
    sameNameCounts.set(sameNameKey, (sameNameCounts.get(sameNameKey) ?? 0) + 1);

    if (row.computed_print_identity_key) {
      exactKeyCounts.set(
        row.computed_print_identity_key,
        (exactKeyCounts.get(row.computed_print_identity_key) ?? 0) + 1,
      );
    }
  }

  return rows.map((row) => {
    const sameNameKey = `${row.observed_set_code ?? ''}||${row.normalized_name ?? ''}`;
    const sameNameInSetCount = sameNameCounts.get(sameNameKey) ?? 0;
    const exactPromoIdentityCount = row.computed_print_identity_key
      ? exactKeyCounts.get(row.computed_print_identity_key) ?? 0
      : 0;

    let classification = 'PROMO_CANONICAL';
    let classificationReason = 'unique promo identity';

    if (!row.computed_print_identity_key) {
      classification = 'NON_CANONICAL';
      classificationReason = 'missing promo number and printed identity modifier';
    } else if (exactPromoIdentityCount > 1) {
      classification = 'NON_CANONICAL';
      classificationReason = 'duplicate exact promo identity';
    } else if (sameNameInSetCount > 1) {
      classification = 'PROMO_VARIANT';
      classificationReason = 'same normalized name repeats in promo set but promo number disambiguates';
    }

    return {
      ...row,
      same_name_in_set_count: sameNameInSetCount,
      exact_promo_identity_count: exactPromoIdentityCount,
      classification,
      classification_reason: classificationReason,
    };
  });
}

function buildCollisionAudit(rows, existingRows) {
  const collisions = [];
  const safeRowsByKey = new Map();
  const existingByKey = new Map();

  for (const row of existingRows) {
    const key = trimToNull(row.print_identity_key);
    if (!key) {
      continue;
    }

    if (!existingByKey.has(key)) {
      existingByKey.set(key, []);
    }

    existingByKey.get(key).push(row);
  }

  for (const row of rows) {
    if (row.classification === 'NON_CANONICAL') {
      continue;
    }

    const key = row.computed_print_identity_key;
    if (!safeRowsByKey.has(key)) {
      safeRowsByKey.set(key, []);
    }

    safeRowsByKey.get(key).push(row);
  }

  for (const [collisionKey, members] of safeRowsByKey.entries()) {
    if (members.length > 1) {
      collisions.push({
        collision_type: 'PROMO_INTERNAL_DUPLICATE',
        collision_key: collisionKey,
        members: members.map((row) => ({
          card_print_id: row.card_print_id,
          name: row.name,
          set_code: row.observed_set_code,
          promo_number: row.promo_number,
          classification: row.classification,
        })),
      });
    }
  }

  for (const row of rows) {
    if (row.classification === 'NON_CANONICAL') {
      continue;
    }

    const conflictingExistingRows = (existingByKey.get(row.computed_print_identity_key) ?? [])
      .filter((existingRow) => existingRow.card_print_id !== row.card_print_id);

    if (conflictingExistingRows.length > 0) {
      collisions.push({
        collision_type: 'EXISTING_PRINT_IDENTITY_KEY_CONFLICT',
        collision_key: row.computed_print_identity_key,
        source_row: {
          card_print_id: row.card_print_id,
          name: row.name,
          set_code: row.observed_set_code,
          promo_number: row.promo_number,
          classification: row.classification,
        },
        conflicting_existing_rows: conflictingExistingRows,
      });
    }
  }

  return collisions;
}

function classifyHydrationState(rows) {
  const rowsNeedingUpdate = [];
  const rowsAlreadyApplied = [];
  const unexpectedHydratedRows = [];

  for (const row of rows) {
    if (row.classification === 'NON_CANONICAL') {
      continue;
    }

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

function buildClassificationCounts(rows) {
  const counts = {
    PROMO_CANONICAL: 0,
    PROMO_VARIANT: 0,
    NON_CANONICAL: 0,
  };

  for (const row of rows) {
    counts[row.classification] += 1;
  }

  return counts;
}

function buildSampleRows(rows) {
  return rows
    .filter((row) => row.classification !== 'NON_CANONICAL')
    .slice()
    .sort((left, right) => {
      const leftKey = [
        left.observed_set_code ?? '',
        left.promo_number ?? '',
        left.name ?? '',
        left.card_print_id ?? '',
      ].join('||');
      const rightKey = [
        right.observed_set_code ?? '',
        right.promo_number ?? '',
        right.name ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, 5)
    .map((row) => ({
      card_print_id: row.card_print_id,
      name: row.name,
      set_code: row.observed_set_code,
      promo_number: row.promo_number,
      classification: row.classification,
      computed_print_identity_key: row.computed_print_identity_key,
    }));
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
        cp.name,
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

async function run() {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required');
  }

  const report = {
    phase: PHASE,
    mode: MODE,
    generated_at: new Date().toISOString(),
    expected_counts: {
      promo_rows: EXPECTED_PROMO_ROW_COUNT,
      promo_canonical: EXPECTED_PROMO_CANONICAL_COUNT,
      promo_variant: EXPECTED_PROMO_VARIANT_COUNT,
      non_canonical: EXPECTED_NON_CANONICAL_COUNT,
      remaining_blocked_rows_before: EXPECTED_REMAINING_BLOCKED_ROWS_BEFORE,
      remaining_blocked_rows_after: EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
    },
    promo_row_count: 0,
    classification_counts: null,
    rows_needing_update: 0,
    rows_already_applied: 0,
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    collision_count: 0,
    ambiguity_count: 0,
    collision_samples: [],
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    v3_duplicate_groups_before: [],
    v3_duplicate_groups_after: [],
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

    const promoSurface = (await loadPromoSurface(client)).map(derivePromoSurfaceRow);
    const classifiedRows = classifyPromoRows(promoSurface);
    const classificationCounts = buildClassificationCounts(classifiedRows);
    const existingNonNullPrintIdentityRows = await loadExistingNonNullPrintIdentityRows(client);
    const collisionAudit = buildCollisionAudit(classifiedRows, existingNonNullPrintIdentityRows);
    const hydrationState = classifyHydrationState(classifiedRows);

    report.promo_row_count = classifiedRows.length;
    report.classification_counts = classificationCounts;
    report.rows_needing_update = hydrationState.rowsNeedingUpdate.length;
    report.rows_already_applied = hydrationState.rowsAlreadyApplied.length;
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.collision_count = collisionAudit.length;
    report.ambiguity_count = normalizeCount(classificationCounts.NON_CANONICAL);
    report.collision_samples = collisionAudit.slice(0, 5);
    report.sample_rows = buildSampleRows(classifiedRows);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_before = await loadV3DuplicateGroups(client);

    assertEqual(report.promo_row_count, EXPECTED_PROMO_ROW_COUNT, 'PROMO_ROW_COUNT_DRIFT');
    assertEqual(
      normalizeCount(classificationCounts.PROMO_CANONICAL),
      EXPECTED_PROMO_CANONICAL_COUNT,
      'PROMO_CANONICAL_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(classificationCounts.PROMO_VARIANT),
      EXPECTED_PROMO_VARIANT_COUNT,
      'PROMO_VARIANT_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(classificationCounts.NON_CANONICAL),
      EXPECTED_NON_CANONICAL_COUNT,
      'NON_CANONICAL_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.remaining_blocked_rows_before),
      EXPECTED_REMAINING_BLOCKED_ROWS_BEFORE,
      'REMAINING_BLOCKED_ROWS_BEFORE_DRIFT',
    );
    if (report.collision_count > 0) {
      throw new Error(
        `PROMO_COLLISION_COUNT_DRIFT:${report.collision_count}:${JSON.stringify(
          report.collision_samples,
        )}`,
      );
    }
    assertZero(report.ambiguity_count, 'PROMO_AMBIGUITY_COUNT_DRIFT');
    assertZero(report.v3_duplicate_groups_before.length, 'V3_DUPLICATE_GROUPS_BEFORE');

    if (hydrationState.unexpectedHydratedRows.length > 0) {
      throw new Error(
        `PROMO_PRINT_IDENTITY_KEY_DRIFT:${JSON.stringify(
          hydrationState.unexpectedHydratedRows.map((row) => ({
            card_print_id: row.card_print_id,
            current_print_identity_key: row.current_print_identity_key,
            computed_print_identity_key: row.computed_print_identity_key,
          })),
        )}`,
      );
    }

    if (
      !(
        (hydrationState.rowsNeedingUpdate.length === EXPECTED_PROMO_ROW_COUNT &&
          hydrationState.rowsAlreadyApplied.length === 0) ||
        (hydrationState.rowsNeedingUpdate.length === 0 &&
          hydrationState.rowsAlreadyApplied.length === EXPECTED_PROMO_ROW_COUNT)
      )
    ) {
      throw new Error(
        `PROMO_HYDRATION_STATE_DRIFT:${hydrationState.rowsNeedingUpdate.length}:${hydrationState.rowsAlreadyApplied.length}:${EXPECTED_PROMO_ROW_COUNT}`,
      );
    }

    if (MODE !== 'apply') {
      report.status =
        hydrationState.rowsNeedingUpdate.length === 0
          ? 'dry_run_already_applied'
          : 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyBackfill(client, hydrationState.rowsNeedingUpdate);

    const targetRowsAfter = await loadRowsByIds(
      client,
      classifiedRows.map((row) => row.card_print_id),
    );

    const targetRowsAfterById = new Map(targetRowsAfter.map((row) => [row.card_print_id, row]));
    for (const row of classifiedRows) {
      const afterRow = targetRowsAfterById.get(row.card_print_id);
      if (!afterRow) {
        throw new Error(`PROMO_ROW_MISSING_AFTER:${row.card_print_id}`);
      }

      if (trimToNull(afterRow.print_identity_key) !== row.computed_print_identity_key) {
        throw new Error(
          `PROMO_PRINT_IDENTITY_KEY_DRIFT_AFTER:${row.card_print_id}:${trimToNull(
            afterRow.print_identity_key,
          )}:${row.computed_print_identity_key}`,
        );
      }
    }

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_after = await loadV3DuplicateGroups(client);

    assertEqual(
      normalizeCount(report.apply_operations?.rows_updated),
      EXPECTED_PROMO_ROW_COUNT,
      'ROWS_UPDATED_DRIFT',
    );
    assertEqual(
      normalizeCount(report.remaining_blocked_rows_after),
      EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
      'REMAINING_BLOCKED_ROWS_AFTER_DRIFT',
    );
    assertEqual(
      normalizeCount(report.canonical_snapshot_after?.total_rows),
      normalizeCount(report.canonical_snapshot_before?.total_rows),
      'TOTAL_ROW_COUNT_DRIFT',
    );
    assertEqual(
      normalizeCount(report.canonical_snapshot_after?.canonical_rows),
      normalizeCount(report.canonical_snapshot_before?.canonical_rows),
      'CANONICAL_ROW_COUNT_DRIFT',
    );
    assertEqual(
      report.canonical_snapshot_after?.gvid_checksum ?? null,
      report.canonical_snapshot_before?.gvid_checksum ?? null,
      'GVID_CHECKSUM_DRIFT',
    );
    assertZero(report.v3_duplicate_groups_after.length, 'V3_DUPLICATE_GROUPS_AFTER');

    report.status =
      hydrationState.rowsNeedingUpdate.length === 0
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
