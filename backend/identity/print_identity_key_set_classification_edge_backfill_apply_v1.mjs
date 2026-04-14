import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';
const EXPECTED_TARGET_COUNT = 238;

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
const EXCLUDED_SET_CODES = new Set(['ecard3', 'col1']);

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
        split_part(lower(em.external_id), '-', 1) as tcgdex_set_code,
        coalesce(
          nullif(ri.payload->'card'->>'localId', ''),
          nullif(split_part(lower(em.external_id), '-', 2), '')
        ) as tcgdex_local_id
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
      order by s.code, cp.name, cp.id
    `,
  );
}

function deriveBaseRow(row) {
  const currentSetCode = trimToNull(row.current_set_code);
  const joinedSetCode = trimToNull(row.joined_set_code)?.toLowerCase() ?? null;
  const tcgdexSetCode = trimToNull(row.tcgdex_set_code)?.toLowerCase() ?? null;
  const currentNumber = trimToNull(row.current_number);
  const currentNumberPlain = trimToNull(row.current_number_plain);
  const derivedNumberPlain = trimToNull(row.tcgdex_local_id);
  const storedVariantKey = normalizeVariantKey(row.variant_key);
  const normalizedPrintedIdentityModifier = normalizePrintedIdentityModifier(
    row.printed_identity_modifier,
  );
  const normalizedNameToken = normalizePrintedNameToken(row.name);
  const computedPrintIdentityKey =
    joinedSetCode &&
    derivedNumberPlain &&
    normalizedNameToken &&
    storedVariantKey != null &&
    normalizedPrintedIdentityModifier != null
      ? [joinedSetCode, derivedNumberPlain, normalizedNameToken, normalizedPrintedIdentityModifier]
          .filter((part) => part != null && part !== '')
          .join(':')
          .toLowerCase()
      : null;

  return {
    ...row,
    current_set_code: currentSetCode,
    joined_set_code: joinedSetCode,
    tcgdex_set_code: tcgdexSetCode,
    current_number: currentNumber,
    current_number_plain: currentNumberPlain,
    derived_set_code: joinedSetCode,
    derived_number_plain: derivedNumberPlain,
    stored_variant_key: storedVariantKey,
    normalized_printed_identity_modifier: normalizedPrintedIdentityModifier,
    normalized_name_token: normalizedNameToken,
    current_print_identity_key: trimToNull(row.current_print_identity_key),
    computed_print_identity_key: computedPrintIdentityKey,
  };
}

function annotateSameNameCounts(rows) {
  const counts = new Map();
  for (const row of rows) {
    const key = [row.joined_set_code ?? '', row.normalized_name_token ?? ''].join('||');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    same_name_count: counts.get([row.joined_set_code ?? '', row.normalized_name_token ?? ''].join('||')),
  }));
}

function buildTargetRows(rows) {
  return rows
    .filter((row) => {
      if (!row.set_id || !row.gv_id) {
        return false;
      }
      if (!row.derived_set_code || EXCLUDED_SET_CODES.has(row.derived_set_code)) {
        return false;
      }
      if (row.current_print_identity_key != null) {
        return false;
      }
      if (!/^\d+$/.test(row.derived_number_plain ?? '')) {
        return false;
      }
      if (row.tcgdex_set_code !== row.derived_set_code) {
        return false;
      }
      if (!row.normalized_name_token) {
        return false;
      }
      if (row.same_name_count !== 1) {
        return false;
      }
      if (row.stored_variant_key == null) {
        return false;
      }
      if (row.normalized_printed_identity_modifier == null) {
        return false;
      }
      if (
        row.current_set_code != null &&
        row.current_set_code !== '' &&
        row.current_set_code === row.derived_set_code
      ) {
        return false;
      }
      if (
        row.current_number != null &&
        row.current_number !== '' &&
        row.current_number !== row.derived_number_plain
      ) {
        throw new Error(
          `NUMBER_DRIFT_IN_TARGET_SCOPE:${row.card_print_id}:${row.current_number}:${row.derived_number_plain}`,
        );
      }
      if (!row.computed_print_identity_key) {
        throw new Error(`TARGET_ROW_MISSING_COMPUTED_KEY:${row.card_print_id}`);
      }
      return true;
    })
    .sort((left, right) => {
      const leftKey = [
        left.derived_set_code ?? '',
        left.derived_number_plain ?? '',
        left.normalized_name_token ?? '',
        left.card_print_id ?? '',
      ].join('||');
      const rightKey = [
        right.derived_set_code ?? '',
        right.derived_number_plain ?? '',
        right.normalized_name_token ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    });
}

function assertTargetSurface(targetRows) {
  assertEqual(targetRows.length, EXPECTED_TARGET_COUNT, 'TARGET_ROW_COUNT_DRIFT');

  for (const row of targetRows) {
    if (!row.derived_set_code) {
      throw new Error(`SET_CODE_UNRESOLVED:${row.card_print_id}`);
    }
    if (!row.set_id) {
      throw new Error(`SET_ID_MISSING:${row.card_print_id}`);
    }
    if (row.tcgdex_set_code !== row.derived_set_code) {
      throw new Error(
        `TCGDEX_SET_MISMATCH:${row.card_print_id}:${row.tcgdex_set_code}:${row.derived_set_code}`,
      );
    }
    if (!/^\d+$/.test(row.derived_number_plain ?? '')) {
      throw new Error(`NUMBER_PLAIN_NOT_DERIVABLE:${row.card_print_id}:${row.derived_number_plain}`);
    }
    if (row.same_name_count !== 1) {
      throw new Error(`SAME_NAME_AMBIGUITY:${row.card_print_id}:${row.same_name_count}`);
    }
    if (row.current_print_identity_key != null) {
      throw new Error(`TARGET_ROW_ALREADY_HYDRATED:${row.card_print_id}`);
    }
  }
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

function buildCollisionAudit(targetRows, existingRows) {
  const collisions = [];
  const internalSeen = new Map();

  for (const row of targetRows) {
    const compositeKey = [
      row.set_id,
      row.derived_number_plain,
      row.computed_print_identity_key,
      row.stored_variant_key ?? '',
    ].join('||');

    const prior = internalSeen.get(compositeKey);
    if (prior) {
      collisions.push({
        collision_type: 'internal',
        composite_key: compositeKey,
        left_card_print_id: prior.card_print_id,
        right_card_print_id: row.card_print_id,
      });
      continue;
    }

    internalSeen.set(compositeKey, row);
  }

  const existingByCompositeKey = new Map();
  for (const row of existingRows) {
    const compositeKey = [
      row.set_id,
      trimToNull(row.number_plain),
      trimToNull(row.print_identity_key),
      trimToNull(row.variant_key) ?? '',
    ].join('||');
    existingByCompositeKey.set(compositeKey, row);
  }

  for (const row of targetRows) {
    const compositeKey = [
      row.set_id,
      row.derived_number_plain,
      row.computed_print_identity_key,
      row.stored_variant_key ?? '',
    ].join('||');
    const existing = existingByCompositeKey.get(compositeKey);
    if (!existing) {
      continue;
    }
    collisions.push({
      collision_type: 'external',
      composite_key: compositeKey,
      target_card_print_id: row.card_print_id,
      conflicting_card_print_id: existing.card_print_id,
      conflicting_print_identity_key: existing.print_identity_key,
    });
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
        cp.set_code,
        cp.number,
        cp.number_plain,
        cp.print_identity_key,
        md5(
          concat_ws(
            '|',
            cp.id::text,
            cp.set_id::text,
            coalesce(cp.name, ''),
            coalesce(cp.variant_key, ''),
            coalesce(cp.printed_identity_modifier, ''),
            coalesce(cp.gv_id, '')
          )
        ) as stable_checksum
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

function buildSampleRows(rows) {
  return rows.slice(0, 5).map((row) => ({
    card_print_id: row.card_print_id,
    name: row.name,
    old_set_code: row.current_set_code,
    derived_set_code: row.derived_set_code,
    old_number: row.current_number,
    derived_number: row.derived_number_plain,
    number_plain: row.derived_number_plain,
    variant_key: row.stored_variant_key,
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
      `($${baseIndex}::uuid, $${baseIndex + 1}::text, $${baseIndex + 2}::text, $${baseIndex + 3}::text, $${baseIndex + 4}::text, $${baseIndex + 5}::text, $${baseIndex + 6}::text, $${baseIndex + 7}::text)`,
    );
    params.push(
      row.card_print_id,
      row.gv_id,
      row.current_set_code,
      row.current_number,
      row.current_print_identity_key,
      row.derived_set_code,
      row.derived_number_plain,
      row.computed_print_identity_key,
    );
  }

  const { rows, rowCount } = await client.query(
    `
      with updates(
        card_print_id,
        expected_gv_id,
        expected_current_set_code,
        expected_current_number,
        expected_current_print_identity_key,
        derived_set_code,
        derived_number_plain,
        computed_print_identity_key
      ) as (
        values ${values.join(', ')}
      )
      update public.card_prints cp
      set
        set_code = u.derived_set_code,
        number = u.derived_number_plain,
        print_identity_key = u.computed_print_identity_key
      from updates u
      where cp.id = u.card_print_id
        and cp.gv_id = u.expected_gv_id
        and cp.set_code is not distinct from u.expected_current_set_code
        and cp.number is not distinct from u.expected_current_number
        and cp.print_identity_key is not distinct from u.expected_current_print_identity_key
      returning
        cp.id as card_print_id,
        cp.name,
        cp.set_code,
        cp.number,
        cp.number_plain,
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
    ambiguity_count: 0,
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    v3_duplicate_groups_before: [],
    v3_duplicate_groups_after: [],
    apply_operations: null,
    files_changed: [
      'backend/identity/print_identity_key_set_classification_edge_backfill_apply_v1.mjs',
      'docs/sql/print_identity_key_set_classification_edge_backfill_dry_run_v1.sql',
      'docs/checkpoints/PRINT_IDENTITY_KEY_SET_CLASSIFICATION_EDGE_BACKFILL_APPLY_V1.md',
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
    const annotatedRows = annotateSameNameCounts(blockedBase);
    const targetRows = buildTargetRows(annotatedRows);
    assertTargetSurface(targetRows);

    const collisionAudit = buildCollisionAudit(
      targetRows,
      await loadExistingPopulatedIdentityRows(client),
    );

    report.target_row_count = targetRows.length;
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.collision_count = collisionAudit.length;
    report.sample_rows = buildSampleRows(targetRows);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_before = await loadV3DuplicateGroups(client);

    assertZero(report.collision_count, 'COLLISION_COUNT');
    assertZero(report.ambiguity_count, 'AMBIGUITY_COUNT');
    assertZero(report.v3_duplicate_groups_before.length, 'V3_DUPLICATE_GROUPS_BEFORE');

    if (MODE !== 'apply') {
      report.status = 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    const targetIds = targetRows.map((row) => row.card_print_id);
    const beforeSnapshotsById = mapById(await loadTargetSnapshots(client, targetIds));
    report.apply_operations = await applyBackfill(client, targetRows);
    report.rows_updated = normalizeCount(report.apply_operations?.rows_updated);

    const afterSnapshotsById = mapById(await loadTargetSnapshots(client, targetIds));
    for (const row of targetRows) {
      const beforeRow = beforeSnapshotsById.get(row.card_print_id);
      const afterRow = afterSnapshotsById.get(row.card_print_id);

      if (!beforeRow || !afterRow) {
        throw new Error(`TARGET_ROW_SNAPSHOT_MISSING:${row.card_print_id}`);
      }

      if (trimToNull(afterRow.set_code) !== row.derived_set_code) {
        throw new Error(
          `SET_CODE_POST_VERIFY_DRIFT:${row.card_print_id}:${trimToNull(afterRow.set_code)}:${row.derived_set_code}`,
        );
      }

      if (trimToNull(afterRow.number_plain) !== row.derived_number_plain) {
        throw new Error(
          `NUMBER_PLAIN_POST_VERIFY_DRIFT:${row.card_print_id}:${trimToNull(afterRow.number_plain)}:${row.derived_number_plain}`,
        );
      }

      if (trimToNull(afterRow.number) !== row.derived_number_plain) {
        throw new Error(
          `NUMBER_POST_VERIFY_DRIFT:${row.card_print_id}:${trimToNull(afterRow.number)}:${row.derived_number_plain}`,
        );
      }

      if (trimToNull(afterRow.print_identity_key) !== row.computed_print_identity_key) {
        throw new Error(
          `PRINT_IDENTITY_KEY_POST_VERIFY_DRIFT:${row.card_print_id}:${trimToNull(
            afterRow.print_identity_key,
          )}:${row.computed_print_identity_key}`,
        );
      }

      if (trimToNull(afterRow.gv_id) !== trimToNull(beforeRow.gv_id)) {
        throw new Error(`GV_ID_MUTATION_DETECTED:${row.card_print_id}`);
      }

      if (beforeRow.stable_checksum !== afterRow.stable_checksum) {
        throw new Error(`NON_TARGET_FIELD_MUTATION_DETECTED:${row.card_print_id}`);
      }
    }

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.v3_duplicate_groups_after = await loadV3DuplicateGroups(client);

    assertEqual(report.rows_updated, report.target_row_count, 'ROWS_UPDATED_DRIFT');
    assertEqual(
      normalizeCount(report.remaining_blocked_rows_before) - report.target_row_count,
      normalizeCount(report.remaining_blocked_rows_after),
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
