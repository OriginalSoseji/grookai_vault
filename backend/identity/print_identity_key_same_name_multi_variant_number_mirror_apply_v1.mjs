import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';
const EXPECTED_TARGET_COUNT = 194;
const EXPECTED_OTHER_COUNT = 26;
const EXPECTED_BLOCKED_COUNT = 220;
const MODERN_SET_CODES = new Set(['sv04.5', 'sv06.5', 'swsh10.5']);
const LEGACY_SET_CODES = new Set(['ecard3', 'col1']);

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const APOSTROPHE_VARIANTS_RE = /[\u2018\u2019`´]/g;
const DELTA_VARIANTS_RE = /δ/gi;
const STAR_VARIANTS_RE = /[★*]/g;
const GX_SUFFIX_RE = /\s+GX\b/gi;
const EX_SUFFIX_RE = /\s+EX\b/gi;
const NON_ALNUM_RE = /[^a-zA-Z0-9]+/g;
const DASH_RUN_RE = /-+/g;
const EDGE_DASH_RE = /(^-|-$)/g;
const VARIANT_KEY_RE = /^[A-Za-z0-9_]+$/;
const PRINTED_IDENTITY_MODIFIER_RE = /^[a-z0-9_]+$/;

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

function normalizeVariantKey(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return '';
  }

  if (!VARIANT_KEY_RE.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizePrintedIdentityModifier(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return '';
  }

  if (!PRINTED_IDENTITY_MODIFIER_RE.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

async function loadBlockedBase(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_id,
        cp.set_code as current_set_code,
        s.code as joined_set_code,
        cp.name,
        cp.number as current_number,
        cp.number_plain as current_number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key as current_print_identity_key,
        em.external_id as tcgdex_external_id,
        coalesce(
          nullif(ri.payload->'card'->>'localId', ''),
          nullif(split_part(lower(em.external_id), '-', 2), '')
        ) as tcgdex_local_id
      from public.card_prints cp
      left join public.sets s
        on s.id = cp.set_id
      left join public.external_mappings em
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
      order by coalesce(cp.set_code, s.code), cp.name, cp.id
    `,
  );
}

function deriveBaseRow(row) {
  const currentSetCode = trimToNull(row.current_set_code);
  const joinedSetCode = trimToNull(row.joined_set_code)?.toLowerCase() ?? null;
  const effectiveSetCode = currentSetCode ?? joinedSetCode;
  const currentNumber = trimToNull(row.current_number);
  const currentNumberPlain = trimToNull(row.current_number_plain);
  const currentPrintIdentityKey = trimToNull(row.current_print_identity_key);
  const normalizedNameToken = normalizePrintedNameToken(row.name);
  const normalizedVariantKey = normalizeVariantKey(row.variant_key);
  const normalizedPrintedIdentityModifier = normalizePrintedIdentityModifier(
    row.printed_identity_modifier,
  );
  const mirroredNumberToken = trimToNull(row.tcgdex_local_id);
  const computedPrintIdentityKey =
    effectiveSetCode &&
    mirroredNumberToken &&
    normalizedNameToken &&
    normalizedVariantKey === '' &&
    normalizedPrintedIdentityModifier === ''
      ? [effectiveSetCode, mirroredNumberToken, normalizedNameToken].join(':').toLowerCase()
      : null;

  return {
    ...row,
    current_set_code: currentSetCode,
    joined_set_code: joinedSetCode,
    effective_set_code: effectiveSetCode,
    current_number: currentNumber,
    current_number_plain: currentNumberPlain,
    current_print_identity_key: currentPrintIdentityKey,
    normalized_name_token: normalizedNameToken,
    normalized_variant_key: normalizedVariantKey,
    normalized_printed_identity_modifier: normalizedPrintedIdentityModifier,
    mirrored_number_token: mirroredNumberToken,
    computed_print_identity_key: computedPrintIdentityKey,
  };
}

function annotateSameNameCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = [row.effective_set_code ?? '', row.normalized_name_token ?? ''].join('||');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    same_name_count: counts.get([row.effective_set_code ?? '', row.normalized_name_token ?? ''].join('||')),
  }));
}

function classifyFamily(row) {
  if (
    row.normalized_variant_key === '' &&
    row.normalized_printed_identity_modifier === '' &&
    MODERN_SET_CODES.has(row.effective_set_code) &&
    row.same_name_count > 1 &&
    /^\d+$/.test(row.mirrored_number_token ?? '')
  ) {
    return 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION';
  }

  if (
    row.normalized_variant_key === '' &&
    row.normalized_printed_identity_modifier === '' &&
    LEGACY_SET_CODES.has(row.effective_set_code)
  ) {
    return 'OTHER';
  }

  return 'UNCLASSIFIED';
}

function classifyRows(rows) {
  return rows.map((row) => ({
    ...row,
    family_name: classifyFamily(row),
  }));
}

function buildFamilyCounts(rows) {
  const counts = {
    SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION: 0,
    OTHER: 0,
    UNCLASSIFIED: 0,
  };

  for (const row of rows) {
    counts[row.family_name] = (counts[row.family_name] ?? 0) + 1;
  }

  return counts;
}

function assertFamilySurface(rows, counts) {
  assertEqual(rows.length, EXPECTED_BLOCKED_COUNT, 'BLOCKED_SURFACE_COUNT_DRIFT');
  assertEqual(
    normalizeCount(counts.SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION),
    EXPECTED_TARGET_COUNT,
    'TARGET_FAMILY_COUNT_DRIFT',
  );
  assertEqual(normalizeCount(counts.OTHER), EXPECTED_OTHER_COUNT, 'OTHER_FAMILY_COUNT_DRIFT');
  assertZero(normalizeCount(counts.UNCLASSIFIED), 'UNCLASSIFIED_ROWS');
}

function buildApplyMap(rows) {
  const seenIds = new Set();
  const seenKeys = new Set();

  return rows
    .filter((row) => row.family_name === 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION')
    .map((row) => {
      if (row.current_print_identity_key != null) {
        throw new Error(`TARGET_ROW_ALREADY_HYDRATED:${row.card_print_id}`);
      }
      if (!row.set_id || !row.gv_id) {
        throw new Error(`TARGET_ROW_MISSING_CANONICAL_IDENTITY:${row.card_print_id}`);
      }
      if (!row.effective_set_code) {
        throw new Error(`TARGET_ROW_MISSING_SET_CODE:${row.card_print_id}`);
      }
      if (!/^\d+$/.test(row.mirrored_number_token ?? '')) {
        throw new Error(`TARGET_ROW_MISSING_NUMERIC_SOURCE:${row.card_print_id}`);
      }
      if (!row.normalized_name_token) {
        throw new Error(`TARGET_ROW_MISSING_NORMALIZED_NAME:${row.card_print_id}`);
      }
      if (row.current_number != null || row.current_number_plain != null) {
        throw new Error(`TARGET_ROW_ALREADY_HAS_NUMBER_SURFACE:${row.card_print_id}`);
      }
      if (row.normalized_variant_key !== '' || row.normalized_printed_identity_modifier !== '') {
        throw new Error(`TARGET_ROW_NOT_IN_EMPTY_VARIANT_LANE:${row.card_print_id}`);
      }
      if (!row.computed_print_identity_key) {
        throw new Error(`TARGET_ROW_MISSING_COMPUTED_KEY:${row.card_print_id}`);
      }
      if (seenIds.has(row.card_print_id)) {
        throw new Error(`DUPLICATE_TARGET_ID:${row.card_print_id}`);
      }
      if (seenKeys.has([row.set_id, row.mirrored_number_token, row.computed_print_identity_key].join('||'))) {
        throw new Error(`DUPLICATE_TARGET_COMPUTED_KEY:${row.card_print_id}:${row.computed_print_identity_key}`);
      }

      seenIds.add(row.card_print_id);
      seenKeys.add([row.set_id, row.mirrored_number_token, row.computed_print_identity_key].join('||'));

      return {
        target_card_print_id: row.card_print_id,
        target_name: row.name,
        target_set_code: row.effective_set_code,
        target_number: row.current_number,
        target_number_plain: row.current_number_plain,
        target_variant_key: row.normalized_variant_key,
        target_printed_identity_modifier: row.normalized_printed_identity_modifier,
        source_card_print_id: row.card_print_id,
        source_print_identity_key: row.computed_print_identity_key,
        computed_print_identity_key: row.computed_print_identity_key,
        expected_gv_id: row.gv_id,
        expected_current_print_identity_key: row.current_print_identity_key,
        set_id: row.set_id,
        mirrored_number_token: row.mirrored_number_token,
      };
    });
}

async function loadExistingPopulatedIdentityRows(client) {
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
        and cp.set_id is not null
        and cp.number_plain is not null
        and cp.print_identity_key is not null
      order by cp.id
    `,
  );
}

function buildCollisionAudit(applyMap, existingRows) {
  const collisions = [];
  const internalSeen = new Map();
  const existingByCompositeKey = new Map();

  for (const row of existingRows) {
    existingByCompositeKey.set(
      [row.set_id, trimToNull(row.number_plain), trimToNull(row.print_identity_key), trimToNull(row.variant_key) ?? ''].join('||'),
      row,
    );
  }

  for (const row of applyMap) {
    const compositeKey = [
      row.set_id,
      row.mirrored_number_token,
      row.computed_print_identity_key,
      row.target_variant_key ?? '',
    ].join('||');

    const prior = internalSeen.get(compositeKey);
    if (prior) {
      collisions.push({
        collision_type: 'internal',
        composite_key: compositeKey,
        left_target_card_print_id: prior.target_card_print_id,
        right_target_card_print_id: row.target_card_print_id,
      });
      continue;
    }
    internalSeen.set(compositeKey, row);

    const existing = existingByCompositeKey.get(compositeKey);
    if (existing) {
      collisions.push({
        collision_type: 'external',
        composite_key: compositeKey,
        target_card_print_id: row.target_card_print_id,
        conflicting_card_print_id: existing.card_print_id,
        conflicting_print_identity_key: existing.print_identity_key,
      });
    }
  }

  return collisions;
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

async function loadRemainingBlockedRows(client) {
  const row = await queryOne(
    client,
    `
      select count(*)::int as remaining_blocked_rows
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

  return normalizeCount(row?.remaining_blocked_rows);
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

async function loadRowSnapshots(client, ids) {
  if (ids.length === 0) {
    return [];
  }

  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_code,
        cp.number,
        cp.number_plain,
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
        ) as stable_checksum,
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
            coalesce(cp.gv_id, ''),
            coalesce(cp.print_identity_key, '')
          )
        ) as full_checksum
      from public.card_prints cp
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [ids],
  );
}

function mapById(rows) {
  return new Map(rows.map((row) => [row.card_print_id, row]));
}

function buildSampleRows(applyMap) {
  return applyMap.slice(0, 5).map((row) => ({
    target_card_print_id: row.target_card_print_id,
    target_name: row.target_name,
    target_set_code: row.target_set_code,
    source_card_print_id: row.source_card_print_id,
    computed_print_identity_key: row.computed_print_identity_key,
  }));
}

async function applyBackfill(client, applyMap) {
  if (applyMap.length === 0) {
    return {
      rows_updated: 0,
      updated_rows: [],
    };
  }

  const values = [];
  const params = [];

  for (const row of applyMap) {
    const baseIndex = params.length + 1;
    values.push(
      `($${baseIndex}::uuid, $${baseIndex + 1}::text, $${baseIndex + 2}::text, $${baseIndex + 3}::text)`,
    );
    params.push(
      row.target_card_print_id,
      row.expected_gv_id,
      row.expected_current_print_identity_key,
      row.computed_print_identity_key,
    );
  }

  const { rows, rowCount } = await client.query(
    `
      with updates(target_card_print_id, expected_gv_id, expected_current_print_identity_key, computed_print_identity_key) as (
        values ${values.join(', ')}
      )
      update public.card_prints cp
      set print_identity_key = u.computed_print_identity_key
      from updates u
      where cp.id = u.target_card_print_id
        and cp.gv_id = u.expected_gv_id
        and cp.print_identity_key is not distinct from u.expected_current_print_identity_key
      returning
        cp.id as target_card_print_id,
        cp.name as target_name,
        cp.print_identity_key,
        cp.gv_id
    `,
    params,
  );

  assertEqual(rowCount ?? 0, applyMap.length, 'ROWS_UPDATED_COUNT_DRIFT');

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
    other_row_count: 0,
    rows_updated: 0,
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    collision_count: 0,
    collision_count_after: null,
    ambiguity_count: 0,
    other_rows_included: 0,
    persisted_hydrated_sibling_source_rows: 0,
    family_counts: null,
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    v3_duplicate_groups_before: [],
    v3_duplicate_groups_after: [],
    apply_operations: null,
    files_changed: [
      'backend/identity/print_identity_key_same_name_multi_variant_number_mirror_apply_v1.mjs',
      'docs/sql/print_identity_key_same_name_multi_variant_number_mirror_dry_run_v1.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_SAME_NAME_MULTI_VARIANT_NUMBER_MIRROR_APPLY_V1.md',
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

    const blockedBase = (await loadBlockedBase(client)).map(deriveBaseRow);
    const classifiedRows = classifyRows(annotateSameNameCounts(blockedBase));
    const familyCounts = buildFamilyCounts(classifiedRows);
    assertFamilySurface(classifiedRows, familyCounts);

    const targetRows = classifiedRows.filter(
      (row) => row.family_name === 'SAME_NUMBER_SAME_NAME_MULTI_VARIANT_COLLISION',
    );
    const otherRows = classifiedRows.filter((row) => row.family_name === 'OTHER');
    const unclassifiedRows = classifiedRows.filter((row) => row.family_name === 'UNCLASSIFIED');
    const applyMap = buildApplyMap(targetRows);
    const collisionAudit = buildCollisionAudit(
      applyMap,
      await loadExistingPopulatedIdentityRows(client),
    );

    report.target_row_count = applyMap.length;
    report.other_row_count = otherRows.length;
    report.family_counts = familyCounts;
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.collision_count = collisionAudit.length;
    report.ambiguity_count = unclassifiedRows.length;
    report.other_rows_included = otherRows.filter((row) =>
      applyMap.some((target) => target.target_card_print_id === row.card_print_id),
    ).length;
    report.sample_rows = buildSampleRows(applyMap);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_before = await loadV3DuplicateGroups(client);

    assertEqual(report.target_row_count, EXPECTED_TARGET_COUNT, 'TARGET_ROW_COUNT_DRIFT');
    assertEqual(report.other_row_count, EXPECTED_OTHER_COUNT, 'OTHER_ROW_COUNT_DRIFT');
    assertEqual(report.remaining_blocked_rows_before, EXPECTED_BLOCKED_COUNT, 'REMAINING_BLOCKED_ROWS_BEFORE_DRIFT');
    assertZero(report.collision_count, 'COLLISION_COUNT');
    assertZero(report.ambiguity_count, 'AMBIGUITY_COUNT');
    assertZero(report.other_rows_included, 'OTHER_ROWS_INCLUDED');
    assertZero(report.v3_duplicate_groups_before.length, 'V3_DUPLICATE_GROUPS_BEFORE');

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const targetIds = applyMap.map((row) => row.target_card_print_id);
    const otherIds = otherRows.map((row) => row.card_print_id);
    const targetSnapshotsBefore = mapById(await loadRowSnapshots(client, targetIds));
    const otherSnapshotsBefore = mapById(await loadRowSnapshots(client, otherIds));

    report.apply_operations = await applyBackfill(client, applyMap);
    report.rows_updated = normalizeCount(report.apply_operations?.rows_updated);

    const targetSnapshotsAfter = mapById(await loadRowSnapshots(client, targetIds));
    const otherSnapshotsAfter = mapById(await loadRowSnapshots(client, otherIds));

    for (const row of applyMap) {
      const beforeRow = targetSnapshotsBefore.get(row.target_card_print_id);
      const afterRow = targetSnapshotsAfter.get(row.target_card_print_id);

      if (!beforeRow || !afterRow) {
        throw new Error(`TARGET_ROW_SNAPSHOT_MISSING:${row.target_card_print_id}`);
      }

      if (trimToNull(afterRow.print_identity_key) !== row.computed_print_identity_key) {
        throw new Error(
          `PRINT_IDENTITY_KEY_POST_VERIFY_DRIFT:${row.target_card_print_id}:${trimToNull(
            afterRow.print_identity_key,
          )}:${row.computed_print_identity_key}`,
        );
      }

      if (beforeRow.stable_checksum !== afterRow.stable_checksum) {
        throw new Error(`NON_PRINT_IDENTITY_KEY_MUTATION_DETECTED:${row.target_card_print_id}`);
      }

      if (trimToNull(beforeRow.gv_id) !== trimToNull(afterRow.gv_id)) {
        throw new Error(`GV_ID_MUTATION_DETECTED:${row.target_card_print_id}`);
      }
    }

    for (const row of otherRows) {
      const beforeRow = otherSnapshotsBefore.get(row.card_print_id);
      const afterRow = otherSnapshotsAfter.get(row.card_print_id);

      if (!beforeRow || !afterRow) {
        throw new Error(`OTHER_ROW_SNAPSHOT_MISSING:${row.card_print_id}`);
      }

      if (beforeRow.full_checksum !== afterRow.full_checksum) {
        throw new Error(`OTHER_ROW_TOUCHED:${row.card_print_id}`);
      }
    }

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_after = await loadV3DuplicateGroups(client);
    report.collision_count_after = buildCollisionAudit(
      applyMap,
      await loadExistingPopulatedIdentityRows(client),
    ).length;

    assertEqual(report.rows_updated, report.target_row_count, 'ROWS_UPDATED_DRIFT');
    assertEqual(report.remaining_blocked_rows_after, EXPECTED_OTHER_COUNT, 'REMAINING_BLOCKED_ROWS_AFTER_DRIFT');
    assertZero(report.collision_count_after, 'COLLISION_COUNT_AFTER');
    assertZero(report.v3_duplicate_groups_after.length, 'V3_DUPLICATE_GROUPS_AFTER');
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

    report.status = 'apply_passed';

    await client.query('commit');
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    try {
      await client.query('rollback');
    } catch {
      // Preserve original failure.
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
