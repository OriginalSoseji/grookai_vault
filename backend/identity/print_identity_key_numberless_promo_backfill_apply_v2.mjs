import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V2';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

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

function slugifyError(message) {
  return String(message ?? 'unknown_error')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
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

function normalizePromoNumber(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase();
}

function extractPromoNumber(tcgdexExternalId, setCode) {
  const externalId = trimToNull(tcgdexExternalId)?.toLowerCase() ?? null;
  const normalizedSetCode = trimToNull(setCode)?.toLowerCase() ?? null;

  if (!externalId || !normalizedSetCode) {
    return null;
  }

  const prefix = `${normalizedSetCode}-`;
  if (!externalId.startsWith(prefix)) {
    return null;
  }

  return normalizePromoNumber(externalId.slice(prefix.length));
}

function derivePromoSurfaceRow(row) {
  const setCode =
    trimToNull(row.joined_set_code)?.toLowerCase() ??
    trimToNull(row.raw_set_code)?.toLowerCase() ??
    null;
  const normalizedName = normalizePrintedNameToken(row.name);
  const printedIdentityModifier =
    trimToNull(row.printed_identity_modifier)?.toLowerCase() ?? null;
  const promoNumber =
    normalizePromoNumber(row.tcgdex_local_id) ??
    extractPromoNumber(row.tcgdex_external_id, setCode);

  let computedPrintIdentityKey = null;
  let derivationBranch = 'blocked';
  if (promoNumber) {
    computedPrintIdentityKey = [setCode, promoNumber, normalizedName]
      .filter((part) => part != null && part !== '')
      .join(':')
      .toLowerCase();
    derivationBranch = 'promo_number';
  } else if (printedIdentityModifier) {
    computedPrintIdentityKey = [setCode, normalizedName, printedIdentityModifier]
      .filter((part) => part != null && part !== '')
      .join(':')
      .toLowerCase();
    derivationBranch = 'modifier';
  }

  return {
    ...row,
    effective_set_code: setCode,
    current_print_identity_key: trimToNull(row.current_print_identity_key),
    normalized_promo_number: promoNumber,
    normalized_name_token: normalizedName,
    normalized_printed_identity_modifier: printedIdentityModifier,
    derivation_branch: derivationBranch,
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
        cp.set_code as raw_set_code,
        s.code as joined_set_code,
        s.name as joined_set_name,
        cp.name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key as current_print_identity_key,
        em.external_id as tcgdex_external_id,
        ri.payload->'card'->>'localId' as tcgdex_local_id
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

async function loadTargetSnapshots(client, ids) {
  if (ids.length === 0) {
    return [];
  }

  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.print_identity_key,
        md5(
          concat_ws(
            '|',
            cp.id::text,
            cp.set_id::text,
            coalesce(cp.set_code, ''),
            coalesce(cp.name, ''),
            coalesce(cp.number, ''),
            coalesce(cp.number_plain, ''),
            coalesce(cp.variant_key, ''),
            coalesce(cp.printed_identity_modifier, ''),
            coalesce(cp.gv_id, '')
          )
        ) as non_key_checksum
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
    const sameNameKey = `${row.effective_set_code ?? ''}||${row.normalized_name_token ?? ''}`;
    sameNameCounts.set(sameNameKey, (sameNameCounts.get(sameNameKey) ?? 0) + 1);

    if (row.computed_print_identity_key) {
      exactKeyCounts.set(
        row.computed_print_identity_key,
        (exactKeyCounts.get(row.computed_print_identity_key) ?? 0) + 1,
      );
    }
  }

  return rows.map((row) => {
    const sameNameKey = `${row.effective_set_code ?? ''}||${row.normalized_name_token ?? ''}`;
    const sameNameInSetCount = sameNameCounts.get(sameNameKey) ?? 0;
    const exactPromoIdentityCount = row.computed_print_identity_key
      ? exactKeyCounts.get(row.computed_print_identity_key) ?? 0
      : 0;

    let classification = 'PROMO_CANONICAL';
    let classificationReason = 'unique promo identity';

    if (!row.computed_print_identity_key) {
      classification = 'NON_CANONICAL';
      classificationReason = 'missing promo number and lawful printed identity modifier';
    } else if (exactPromoIdentityCount > 1) {
      classification = 'NON_CANONICAL';
      classificationReason = 'duplicate exact promo identity inside live promo lane';
    } else if (sameNameInSetCount > 1) {
      classification = 'PROMO_VARIANT';
      classificationReason =
        'same normalized name repeats inside promo set but promo number disambiguates';
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
          set_code: row.effective_set_code,
          promo_number: row.normalized_promo_number,
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
          set_code: row.effective_set_code,
          promo_number: row.normalized_promo_number,
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

function buildApplyMap(rowsNeedingUpdate) {
  const seenIds = new Set();
  const seenKeys = new Set();

  return rowsNeedingUpdate
    .slice()
    .sort((left, right) => {
      const leftKey = [
        left.effective_set_code ?? '',
        left.normalized_promo_number ?? '',
        left.normalized_name_token ?? '',
        left.card_print_id ?? '',
      ].join('||');
      const rightKey = [
        right.effective_set_code ?? '',
        right.normalized_promo_number ?? '',
        right.normalized_name_token ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    })
    .map((row) => {
      if (seenIds.has(row.card_print_id)) {
        throw new Error(`DUPLICATE_TARGET_ROW:${row.card_print_id}`);
      }
      if (seenKeys.has(row.computed_print_identity_key)) {
        throw new Error(`DUPLICATE_DERIVED_KEY:${row.computed_print_identity_key}`);
      }

      seenIds.add(row.card_print_id);
      seenKeys.add(row.computed_print_identity_key);

      return {
        card_print_id: row.card_print_id,
        gv_id: row.gv_id,
        current_print_identity_key: row.current_print_identity_key,
        computed_print_identity_key: row.computed_print_identity_key,
        name: row.name,
        set_code: row.effective_set_code,
        promo_number: row.normalized_promo_number,
        classification: row.classification,
      };
    });
}

function buildSampleRows(rows) {
  return rows
    .filter((row) => row.classification !== 'NON_CANONICAL')
    .slice()
    .sort((left, right) => {
      const leftKey = [
        left.effective_set_code ?? '',
        left.normalized_promo_number ?? '',
        left.name ?? '',
        left.card_print_id ?? '',
      ].join('||');
      const rightKey = [
        right.effective_set_code ?? '',
        right.normalized_promo_number ?? '',
        right.name ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, 5)
    .map((row) => ({
      card_print_id: row.card_print_id,
      name: row.name,
      set_code: row.effective_set_code,
      promo_number: row.normalized_promo_number,
      classification: row.classification,
      computed_print_identity_key: row.computed_print_identity_key,
    }));
}

function mapSnapshotsById(rows) {
  return new Map(rows.map((row) => [row.card_print_id, row]));
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
    target_row_count: 0,
    excluded_rows_count: 0,
    classification_counts: null,
    rows_already_applied: 0,
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    collision_count: 0,
    collision_count_after: null,
    ambiguity_count: 0,
    ambiguity_count_after: null,
    collision_samples: [],
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    v3_duplicate_groups_before: [],
    v3_duplicate_groups_after: [],
    apply_operations: null,
    files_changed: [
      'backend/identity/print_identity_key_numberless_promo_backfill_apply_v2.mjs',
      'docs/sql/print_identity_key_numberless_promo_backfill_dry_run_v2.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_NUMBERLESS_PROMO_BACKFILL_APPLY_V2.md',
    ],
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
    const applyMap = buildApplyMap(hydrationState.rowsNeedingUpdate);

    report.target_row_count = applyMap.length;
    report.excluded_rows_count =
      normalizeCount(classificationCounts.NON_CANONICAL) + hydrationState.rowsAlreadyApplied.length;
    report.classification_counts = classificationCounts;
    report.rows_already_applied = hydrationState.rowsAlreadyApplied.length;
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.collision_count = collisionAudit.length;
    report.ambiguity_count = normalizeCount(classificationCounts.NON_CANONICAL);
    report.collision_samples = collisionAudit.slice(0, 5);
    report.sample_rows = buildSampleRows(classifiedRows);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_before = await loadV3DuplicateGroups(client);

    if (classifiedRows.length === 0) {
      throw new Error('PROMO_SCOPE_EMPTY');
    }
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

    if (MODE !== 'apply') {
      report.status = report.target_row_count === 0 ? 'dry_run_already_applied' : 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    if (applyMap.length === 0) {
      report.remaining_blocked_rows_after = report.remaining_blocked_rows_before;
      report.canonical_snapshot_after = report.canonical_snapshot_before;
      report.collision_count_after = 0;
      report.ambiguity_count_after = 0;
      report.apply_operations = {
        rows_updated: 0,
        updated_rows: [],
      };
      report.status = 'apply_already_applied';
      await client.query('rollback');
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const targetIds = applyMap.map((row) => row.card_print_id);
    const targetSnapshotsBefore = mapSnapshotsById(await loadTargetSnapshots(client, targetIds));

    report.apply_operations = await applyBackfill(client, applyMap);

    const targetSnapshotsAfter = mapSnapshotsById(await loadTargetSnapshots(client, targetIds));
    for (const row of applyMap) {
      const beforeRow = targetSnapshotsBefore.get(row.card_print_id);
      const afterRow = targetSnapshotsAfter.get(row.card_print_id);

      if (!beforeRow || !afterRow) {
        throw new Error(`TARGET_ROW_SNAPSHOT_MISSING:${row.card_print_id}`);
      }

      if (trimToNull(afterRow.print_identity_key) !== row.computed_print_identity_key) {
        throw new Error(
          `PRINT_IDENTITY_KEY_POST_VERIFY_DRIFT:${row.card_print_id}:${trimToNull(
            afterRow.print_identity_key,
          )}:${row.computed_print_identity_key}`,
        );
      }

      if (trimToNull(beforeRow.gv_id) !== trimToNull(afterRow.gv_id)) {
        throw new Error(`GV_ID_MUTATION_DETECTED:${row.card_print_id}`);
      }

      if (beforeRow.non_key_checksum !== afterRow.non_key_checksum) {
        throw new Error(`NON_KEY_ROW_MUTATION_DETECTED:${row.card_print_id}`);
      }
    }

    const promoSurfaceAfter = (await loadPromoSurface(client)).map(derivePromoSurfaceRow);
    const classifiedRowsAfter = classifyPromoRows(promoSurfaceAfter);
    const classificationCountsAfter = buildClassificationCounts(classifiedRowsAfter);
    const collisionAuditAfter = buildCollisionAudit(
      classifiedRowsAfter,
      await loadExistingNonNullPrintIdentityRows(client),
    );
    const hydrationStateAfter = classifyHydrationState(classifiedRowsAfter);

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_after = await loadV3DuplicateGroups(client);
    report.collision_count_after = collisionAuditAfter.length;
    report.ambiguity_count_after = normalizeCount(classificationCountsAfter.NON_CANONICAL);

    assertEqual(
      normalizeCount(report.apply_operations?.rows_updated),
      report.target_row_count,
      'ROWS_UPDATED_DRIFT',
    );
    assertEqual(
      normalizeCount(report.remaining_blocked_rows_before) - report.target_row_count,
      normalizeCount(report.remaining_blocked_rows_after),
      'REMAINING_BLOCKED_ROWS_AFTER_DRIFT',
    );
    assertEqual(hydrationStateAfter.rowsNeedingUpdate.length, 0, 'ROWS_NEEDING_UPDATE_AFTER_DRIFT');
    assertZero(report.collision_count_after, 'PROMO_COLLISION_COUNT_AFTER');
    assertZero(report.ambiguity_count_after, 'PROMO_AMBIGUITY_COUNT_AFTER');
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

    report.status = 'apply_passed';

    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve the original failure.
    }

    report.status = `failed_closed_on_${slugifyError(error.message)}`;
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

run().catch(() => {
  process.exit(1);
});
