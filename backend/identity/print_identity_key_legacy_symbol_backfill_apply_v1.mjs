import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';
const EXPECTED_TARGET_COUNT = 26;
const EXPECTED_REMAINING_AFTER = 0;
const LEGACY_SET_CODES = new Set(['col1', 'ecard3']);
const VALID_VARIANT_KEY_RE = /^[A-Za-z0-9_]+$/;
const VALID_PRINTED_IDENTITY_MODIFIER_RE = /^[a-z0-9_]+$/;
const LEGACY_LOCAL_ID_RE = /^[A-Za-z0-9!?._-]+$/;

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
const WHITESPACE_RE = /\s+/g;
const DASH_VARIANTS_RE = /[\u2010-\u2015\u2212]/g;

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

  if (!VALID_VARIANT_KEY_RE.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizePrintedIdentityModifier(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return '';
  }

  if (!VALID_PRINTED_IDENTITY_MODIFIER_RE.test(trimmed)) {
    return null;
  }

  return trimmed.toLowerCase();
}

function normalizeLegacyLocalIdToken(value) {
  const trimmed = trimToNull(value);
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed
    .normalize('NFKC')
    .replace(DASH_VARIANTS_RE, '-')
    .replace(WHITESPACE_RE, '')
    .toUpperCase();

  if (!LEGACY_LOCAL_ID_RE.test(normalized)) {
    return null;
  }

  return normalized;
}

function extractGvIdIdentityToken(gvId) {
  const trimmed = trimToNull(gvId);
  if (!trimmed) {
    return null;
  }

  const parts = trimmed.split('-');
  return parts.length >= 4 ? parts.slice(3).join('-').toUpperCase() : null;
}

async function loadTargetBase(client) {
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
        coalesce(ri.payload->'card'->>'name', ri.payload->>'name', cp.name) as original_name,
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
  const currentSetCode = trimToNull(row.current_set_code)?.toLowerCase() ?? null;
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
  const normalizedLocalIdToken = normalizeLegacyLocalIdToken(row.tcgdex_local_id);
  const gvIdIdentityToken = extractGvIdIdentityToken(row.gv_id);
  const computedPrintIdentityKey =
    effectiveSetCode &&
    normalizedLocalIdToken &&
    normalizedNameToken &&
    normalizedVariantKey === '' &&
    normalizedPrintedIdentityModifier === ''
      ? [effectiveSetCode, normalizedLocalIdToken.toLowerCase(), normalizedNameToken].join(':')
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
    normalized_local_id_token: normalizedLocalIdToken,
    gv_id_identity_token: gvIdIdentityToken,
    computed_print_identity_key: computedPrintIdentityKey,
  };
}

function classifyTargetRows(rows) {
  return rows.map((row) => {
    const isLegacyTarget =
      LEGACY_SET_CODES.has(row.effective_set_code) &&
      row.current_number === null &&
      row.current_number_plain === null &&
      row.normalized_variant_key === '' &&
      row.normalized_printed_identity_modifier === '' &&
      row.normalized_local_id_token != null;

    return {
      ...row,
      family_name: isLegacyTarget
        ? 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE'
        : 'NON_TARGET',
      validation_status:
        isLegacyTarget &&
        row.gv_id_identity_token === row.normalized_local_id_token &&
        row.computed_print_identity_key
          ? 'SAFE_LEGACY_LOCALID_BACKFILL'
          : 'BLOCKED',
    };
  });
}

function buildApplyMap(rows) {
  const seenIds = new Set();
  const seenKeys = new Set();

  return rows
    .filter((row) => row.family_name === 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE')
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
      if (!row.normalized_name_token) {
        throw new Error(`TARGET_ROW_MISSING_NORMALIZED_NAME:${row.card_print_id}`);
      }
      if (!row.normalized_local_id_token) {
        throw new Error(`TARGET_ROW_MISSING_LEGACY_LOCAL_ID:${row.card_print_id}`);
      }
      if (row.normalized_variant_key !== '' || row.normalized_printed_identity_modifier !== '') {
        throw new Error(`TARGET_ROW_NOT_IN_EMPTY_VARIANT_LANE:${row.card_print_id}`);
      }
      if (row.gv_id_identity_token !== row.normalized_local_id_token) {
        throw new Error(
          `GV_ID_LOCAL_ID_MISMATCH:${row.card_print_id}:${row.gv_id_identity_token}:${row.normalized_local_id_token}`,
        );
      }
      if (!row.computed_print_identity_key) {
        throw new Error(`TARGET_ROW_MISSING_COMPUTED_KEY:${row.card_print_id}`);
      }
      if (seenIds.has(row.card_print_id)) {
        throw new Error(`DUPLICATE_TARGET_ID:${row.card_print_id}`);
      }
      if (seenKeys.has(row.computed_print_identity_key)) {
        throw new Error(
          `DUPLICATE_TARGET_COMPUTED_KEY:${row.card_print_id}:${row.computed_print_identity_key}`,
        );
      }

      seenIds.add(row.card_print_id);
      seenKeys.add(row.computed_print_identity_key);

      return {
        target_card_print_id: row.card_print_id,
        target_name: row.name,
        original_name: trimToNull(row.original_name) ?? row.name,
        target_set_code: row.effective_set_code,
        target_number_plain: row.current_number_plain,
        target_variant_key: row.normalized_variant_key,
        normalized_name_token: row.normalized_name_token,
        normalized_local_id_token: row.normalized_local_id_token,
        computed_print_identity_key: row.computed_print_identity_key,
        expected_gv_id: row.gv_id,
        expected_current_print_identity_key: row.current_print_identity_key,
        set_id: row.set_id,
      };
    });
}

async function loadExistingPrintIdentityRows(client) {
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

function buildCollisionAudit(applyMap, existingRows) {
  const collisions = [];
  const internalSeen = new Map();
  const existingByKey = new Map();

  for (const row of existingRows) {
    const key = trimToNull(row.print_identity_key);
    if (!key) {
      continue;
    }

    const bucket = existingByKey.get(key) ?? [];
    bucket.push(row.card_print_id);
    existingByKey.set(key, bucket);
  }

  for (const row of applyMap) {
    const prior = internalSeen.get(row.computed_print_identity_key);
    if (prior) {
      collisions.push({
        collision_type: 'internal',
        print_identity_key: row.computed_print_identity_key,
        left_target_card_print_id: prior.target_card_print_id,
        right_target_card_print_id: row.target_card_print_id,
      });
      continue;
    }
    internalSeen.set(row.computed_print_identity_key, row);

    const existingIds = existingByKey.get(row.computed_print_identity_key) ?? [];
    const conflictingIds = existingIds.filter((id) => id !== row.target_card_print_id);
    if (conflictingIds.length > 0) {
      collisions.push({
        collision_type: 'external',
        print_identity_key: row.computed_print_identity_key,
        target_card_print_id: row.target_card_print_id,
        conflicting_card_print_ids: conflictingIds,
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
    card_print_id: row.target_card_print_id,
    name: row.target_name,
    set_code: row.target_set_code,
    normalized_local_id_token: row.normalized_local_id_token,
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
    rows_updated: 0,
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    collision_count: 0,
    collision_count_after: null,
    ambiguity_count: 0,
    files_changed: [
      'backend/identity/print_identity_key_legacy_symbol_backfill_apply_v1.mjs',
      'docs/sql/print_identity_key_legacy_symbol_backfill_dry_run_v1.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_LEGACY_SYMBOL_LOCAL_ID_BACKFILL_APPLY_V1.md',
    ],
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
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

    const targetBase = (await loadTargetBase(client)).map(deriveBaseRow);
    const classifiedRows = classifyTargetRows(targetBase);
    const targetRows = classifiedRows.filter(
      (row) => row.family_name === 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE',
    );
    const nonTargetRows = classifiedRows.filter(
      (row) => row.family_name !== 'LEGACY_SYMBOL_OR_PUNCTUATION_IDENTITY_EDGE',
    );
    const blockedRows = targetRows.filter(
      (row) => row.validation_status !== 'SAFE_LEGACY_LOCALID_BACKFILL',
    );
    const applyMap = buildApplyMap(targetRows);
    const collisionAudit = buildCollisionAudit(
      applyMap,
      await loadExistingPrintIdentityRows(client),
    );

    report.target_row_count = applyMap.length;
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.collision_count = collisionAudit.length;
    report.ambiguity_count = blockedRows.length;
    report.sample_rows = buildSampleRows(applyMap);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);

    assertEqual(report.target_row_count, EXPECTED_TARGET_COUNT, 'TARGET_ROW_COUNT_DRIFT');
    assertEqual(
      report.remaining_blocked_rows_before,
      EXPECTED_TARGET_COUNT,
      'REMAINING_BLOCKED_ROWS_BEFORE_DRIFT',
    );
    assertZero(report.collision_count, 'COLLISION_COUNT');
    assertZero(report.ambiguity_count, 'AMBIGUITY_COUNT');
    assertZero(nonTargetRows.length, 'NON_TARGET_ROWS_INCLUDED');

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const targetIds = applyMap.map((row) => row.target_card_print_id);
    const targetSnapshotsBefore = mapById(await loadRowSnapshots(client, targetIds));

    report.apply_operations = await applyBackfill(client, applyMap);
    report.rows_updated = normalizeCount(report.apply_operations?.rows_updated);

    const targetSnapshotsAfter = mapById(await loadRowSnapshots(client, targetIds));

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

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.collision_count_after = buildCollisionAudit(
      applyMap,
      await loadExistingPrintIdentityRows(client),
    ).length;

    assertEqual(report.rows_updated, report.target_row_count, 'ROWS_UPDATED_DRIFT');
    assertEqual(
      report.remaining_blocked_rows_after,
      EXPECTED_REMAINING_AFTER,
      'REMAINING_BLOCKED_ROWS_AFTER_DRIFT',
    );
    assertZero(report.collision_count_after, 'COLLISION_COUNT_AFTER');
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
