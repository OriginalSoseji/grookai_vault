import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'PRINT_IDENTITY_KEY_NUMBERLESS_MODERN_MAINSET_NUMBER_RECOVERY_APPLY_V1';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const EXPECTED_TARGET_COUNT = 1125;
const EXPECTED_REMAINING_BLOCKED_ROWS_AFTER = 207;
const MODERN_SET_CODES = [
  'sv02',
  'sv04',
  'sv04.5',
  'sv06',
  'sv06.5',
  'sv07',
  'sv08',
  'sv09',
  'sv10',
  'swsh10.5',
];

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

function normalizeModernNumberPlain(value) {
  const raw = trimToNull(value);
  if (!raw) {
    return null;
  }

  return raw.replace(/^0+(?!$)/, '');
}

function extractTcgdexSuffix(externalId, setCode) {
  const external = trimToNull(externalId);
  const set = trimToNull(setCode);
  if (!external || !set) {
    return null;
  }

  const prefix = `${set}-`;
  if (!external.startsWith(prefix)) {
    return null;
  }

  return external.slice(prefix.length);
}

function extractNumericToken(value) {
  const raw = trimToNull(value);
  if (!raw) {
    return null;
  }

  const match = raw.match(/^([0-9]+)[A-Za-z]*$/);
  return match ? match[1] : null;
}

function buildIdentityKey({ set_id, number_plain, variant_key }) {
  return [
    String(set_id ?? ''),
    String(number_plain ?? ''),
    String(variant_key ?? ''),
  ].join('||');
}

async function queryRows(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return rows;
}

async function queryOne(client, sql, params = []) {
  const rows = await queryRows(client, sql, params);
  return rows[0] ?? null;
}

async function loadTargetSurface(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.gv_id,
        cp.set_id,
        s.code as set_code,
        cp.name as current_name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
        cp.print_identity_key,
        map.active_mapping_count,
        map.distinct_external_id_count,
        map.tcgdex_external_id,
        raw.raw_hit_count,
        raw.raw_import_id,
        raw.raw_local_id,
        raw.raw_card_id,
        raw.raw_name,
        raw.raw_set_id
      from public.card_prints cp
      join public.sets s
        on s.id = cp.set_id
      left join lateral (
        select
          count(*)::int as active_mapping_count,
          count(distinct em.external_id)::int as distinct_external_id_count,
          min(em.external_id) as tcgdex_external_id
        from public.external_mappings em
        where em.card_print_id = cp.id
          and em.source = 'tcgdex'
          and em.active is true
      ) map
        on true
      left join lateral (
        select
          count(*)::int as raw_hit_count,
          min(ri.id) as raw_import_id,
          min(ri.payload->'card'->>'localId') as raw_local_id,
          min(ri.payload->'card'->>'id') as raw_card_id,
          min(ri.payload->'card'->>'name') as raw_name,
          min(ri.payload->'card'->'set'->>'id') as raw_set_id
        from public.raw_imports ri
        where ri.source = 'tcgdex'
          and coalesce(
                ri.payload->>'_external_id',
                ri.payload->>'id',
                ri.payload->'card'->>'id',
                ri.payload->'card'->>'_id'
              ) = map.tcgdex_external_id
      ) raw
        on true
      where cp.gv_id is not null
        and cp.print_identity_key is null
        and (cp.set_code is null or btrim(cp.set_code) = '')
        and (cp.number is null or btrim(cp.number) = '')
        and s.code = any($1::text[])
      order by s.code, cp.name, cp.id
    `,
    [MODERN_SET_CODES],
  );
}

async function loadCanonicalNumberedRows(client) {
  return queryRows(
    client,
    `
      select
        cp.id as card_print_id,
        cp.set_id,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key
      from public.card_prints cp
      where cp.gv_id is not null
        and cp.number_plain is not null
        and btrim(cp.number_plain) <> ''
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

async function loadIdentityDuplicateGroups(client) {
  return queryRows(
    client,
    `
      select
        set_id,
        number_plain,
        coalesce(variant_key, '') as variant_key,
        count(*)::int as rows_per_identity
      from public.card_prints
      where gv_id is not null
        and number_plain is not null
        and btrim(number_plain) <> ''
      group by
        set_id,
        number_plain,
        coalesce(variant_key, '')
      having count(*) > 1
      order by rows_per_identity desc, set_id, number_plain, variant_key
    `,
  );
}

async function loadRemainingBlockedRows(client) {
  const result = await queryOne(
    client,
    `
      with blocker_surface as (
        select
          cp.id as card_print_id,
          cp.set_code,
          s.code as joined_set_code,
          cp.name,
          cp.number,
          cp.number_plain,
          coalesce(cp.variant_key, '') as variant_key,
          coalesce(cp.printed_identity_modifier, '') as printed_identity_modifier,
          case
            when cp.set_code is not null and btrim(cp.set_code) <> '' then cp.set_code
            when s.code is not null and btrim(s.code) <> '' then s.code
            else null
          end as effective_set_code,
          case
            when cp.number_plain is not null and btrim(cp.number_plain) <> '' then cp.number_plain
            when cp.number is not null
              and regexp_replace(cp.number, '[^0-9]+', '', 'g') <> ''
              then regexp_replace(cp.number, '[^0-9]+', '', 'g')
            when cp.number is not null
              and btrim(cp.number) <> ''
              and trim(
                    both '-' from regexp_replace(
                      regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
                      '-+',
                      '-',
                      'g'
                    )
                  ) <> ''
              then lower(
                trim(
                  both '-' from regexp_replace(
                    regexp_replace(trim(cp.number), '[^A-Za-z0-9]+', '-', 'g'),
                    '-+',
                    '-',
                    'g'
                  )
                )
              )
            else null
          end as effective_number_plain,
          lower(
            regexp_replace(
              trim(
                both '-' from regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          regexp_replace(
                            regexp_replace(coalesce(cp.name, ''), '’', '''', 'g'),
                            'δ',
                            ' delta ',
                            'g'
                          ),
                          '[★*]',
                          ' star ',
                          'g'
                        ),
                        '\s+EX\b',
                        '-ex',
                        'gi'
                      ),
                      '\s+GX\b',
                      '-gx',
                      'gi'
                    ),
                    '[^a-zA-Z0-9]+',
                    '-',
                    'g'
                  ),
                  '-+',
                  '-',
                  'g'
                )
              ),
              '(^-|-$)',
              '',
              'g'
            )
          ) as normalized_printed_name_token,
          case
            when coalesce(cp.variant_key, '') = '' then ''
            when cp.variant_key ~ '^[A-Za-z0-9_]+$' then lower(cp.variant_key)
            when s.code = 'ex10'
              and cp.name = 'Unown'
              and cp.number_plain is not null
              and btrim(cp.number_plain) <> ''
              and cp.variant_key = cp.number_plain
              then cp.variant_key
            else null
          end as normalized_variant_key,
          case
            when coalesce(cp.printed_identity_modifier, '') = '' then ''
            when cp.printed_identity_modifier ~ '^[a-z0-9_]+$' then cp.printed_identity_modifier
            else null
          end as normalized_printed_identity_modifier
        from public.card_prints cp
        left join public.sets s
          on s.id = cp.set_id
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
      )
      select
        count(*)::int as blocked_row_count
      from blocker_surface
      where not (
        effective_set_code is not null
        and effective_number_plain is not null
        and normalized_printed_name_token is not null
        and normalized_printed_name_token <> ''
        and normalized_variant_key is not null
        and normalized_printed_identity_modifier is not null
      )
    `,
  );

  return normalizeCount(result?.blocked_row_count);
}

function deriveRecoveryRow(row) {
  const setCode = trimToNull(row.set_code);
  const tcgdexExternalId = trimToNull(row.tcgdex_external_id);
  const rawLocalId = trimToNull(row.raw_local_id);
  const rawName = trimToNull(row.raw_name);
  const rawSetId = trimToNull(row.raw_set_id);
  const currentNumberPlain = trimToNull(row.number_plain);
  const suffix = extractTcgdexSuffix(tcgdexExternalId, setCode);
  const externalDigits = extractNumericToken(suffix);
  const localIdDigits = extractNumericToken(rawLocalId);
  const extractedNumberPlain = normalizeModernNumberPlain(externalDigits);
  const localIdNumberPlain = normalizeModernNumberPlain(localIdDigits);

  let validationStatus = 'SAFE_UPDATE';
  let validationReason = 'authoritative tcgdex mapping and raw localId agree';

  if (normalizeCount(row.active_mapping_count) !== 1) {
    validationStatus = 'INVALID_ACTIVE_MAPPING_COUNT';
    validationReason = 'target row does not have exactly one active tcgdex mapping';
  } else if (normalizeCount(row.distinct_external_id_count) !== 1) {
    validationStatus = 'INVALID_DISTINCT_EXTERNAL_ID_COUNT';
    validationReason = 'target row does not resolve to exactly one tcgdex external id';
  } else if (normalizeCount(row.raw_hit_count) !== 1) {
    validationStatus = 'INVALID_RAW_IMPORT_HIT_COUNT';
    validationReason = 'tcgdex raw import is missing or duplicated';
  } else if (!suffix) {
    validationStatus = 'INVALID_EXTERNAL_ID_SHAPE';
    validationReason = 'tcgdex external id does not align with canonical set code';
  } else if (!externalDigits) {
    validationStatus = 'INVALID_EXTERNAL_ID_NUMERIC_TOKEN';
    validationReason = 'tcgdex external id does not expose a numeric suffix';
  } else if (!localIdDigits) {
    validationStatus = 'INVALID_TCGDEX_LOCAL_ID';
    validationReason = 'tcgdex raw card localId is absent or non-numeric';
  } else if (rawName !== trimToNull(row.current_name)) {
    validationStatus = 'RAW_NAME_MISMATCH';
    validationReason = 'tcgdex raw card name does not match the canonical row';
  } else if (rawSetId !== setCode) {
    validationStatus = 'RAW_SET_MISMATCH';
    validationReason = 'tcgdex raw card set id does not match the canonical set';
  } else if (localIdNumberPlain !== extractedNumberPlain) {
    validationStatus = 'LOCAL_ID_EXTERNAL_ID_MISMATCH';
    validationReason = 'tcgdex localId and external id suffix disagree after normalization';
  } else if (!extractedNumberPlain) {
    validationStatus = 'EXTRACTION_FAILED';
    validationReason = 'number_plain extraction produced an empty result';
  } else if (currentNumberPlain != null && currentNumberPlain !== extractedNumberPlain) {
    validationStatus = 'CURRENT_NUMBER_PLAIN_DRIFT';
    validationReason = 'existing number_plain does not match the authoritative tcgdex value';
  } else if (currentNumberPlain === extractedNumberPlain) {
    validationStatus = 'ALREADY_APPLIED';
    validationReason = 'number_plain already matches the authoritative tcgdex value';
  }

  return {
    ...row,
    tcgdex_number: rawLocalId,
    extracted_number_plain: extractedNumberPlain,
    validation_status: validationStatus,
    validation_reason: validationReason,
  };
}

function splitRecoverySurface(rows) {
  const needsUpdate = [];
  const alreadyApplied = [];
  const invalidRows = [];

  for (const row of rows) {
    if (row.validation_status === 'SAFE_UPDATE') {
      needsUpdate.push(row);
    } else if (row.validation_status === 'ALREADY_APPLIED') {
      alreadyApplied.push(row);
    } else {
      invalidRows.push(row);
    }
  }

  return {
    needsUpdate,
    alreadyApplied,
    invalidRows,
  };
}

function buildCollisionAudit(targetRows, existingRows) {
  const collisions = [];
  const targetIds = new Set(targetRows.map((row) => row.card_print_id));
  const combined = new Map();

  for (const row of existingRows) {
    if (targetIds.has(row.card_print_id)) {
      continue;
    }

    const key = buildIdentityKey(row);
    if (!combined.has(key)) {
      combined.set(key, []);
    }
    combined.get(key).push({
      source: 'existing',
      card_print_id: row.card_print_id,
      set_id: row.set_id,
      number_plain: row.number_plain,
      variant_key: row.variant_key,
    });
  }

  for (const row of targetRows) {
    const key = buildIdentityKey({
      set_id: row.set_id,
      number_plain: row.extracted_number_plain,
      variant_key: row.variant_key,
    });

    if (!combined.has(key)) {
      combined.set(key, []);
    }
    combined.get(key).push({
      source: 'target',
      card_print_id: row.card_print_id,
      set_id: row.set_id,
      number_plain: row.extracted_number_plain,
      variant_key: row.variant_key,
      current_name: row.current_name,
      set_code: row.set_code,
      tcgdex_external_id: row.tcgdex_external_id,
    });
  }

  for (const [collisionKey, members] of combined.entries()) {
    if (members.length > 1) {
      collisions.push({
        collision_key: collisionKey,
        members,
      });
    }
  }

  return collisions;
}

async function applyRecovery(client, targetRows) {
  if (targetRows.length === 0) {
    return {
      rows_updated: 0,
      updated_rows: [],
    };
  }

  const values = [];
  const params = [];

  for (const row of targetRows) {
    const baseIndex = params.length + 1;
    values.push(
      `($${baseIndex}::uuid, $${baseIndex + 1}::text, $${baseIndex + 2}::text, $${baseIndex + 3}::text)`,
    );
    params.push(
      row.card_print_id,
      row.gv_id,
      row.number_plain,
      row.extracted_number_plain,
    );
  }

  const { rows, rowCount } = await client.query(
    `
      with updates(card_print_id, expected_gv_id, expected_number_plain, extracted_number_plain) as (
        values ${values.join(', ')}
      )
      update public.card_prints cp
      set number_plain = u.extracted_number_plain
      from updates u
      where cp.id = u.card_print_id
        and cp.gv_id = u.expected_gv_id
        and cp.number_plain is not distinct from u.expected_number_plain
      returning
        cp.id as card_print_id,
        cp.name as current_name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.gv_id
    `,
    params,
  );

  assertEqual(rowCount ?? 0, targetRows.length, 'ROWS_UPDATED_COUNT_DRIFT');

  return {
    rows_updated: rowCount ?? 0,
    updated_rows: rows,
  };
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
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.print_identity_key
      from public.card_prints cp
      where cp.id = any($1::uuid[])
      order by cp.id
    `,
    [ids],
  );
}

function buildSampleRows(rows) {
  return rows
    .slice()
    .sort((left, right) => {
      const leftKey = [left.set_code ?? '', left.current_name ?? '', left.card_print_id ?? ''].join(
        '||',
      );
      const rightKey = [
        right.set_code ?? '',
        right.current_name ?? '',
        right.card_print_id ?? '',
      ].join('||');
      return leftKey.localeCompare(rightKey);
    })
    .slice(0, 5)
    .map((row) => ({
      card_print_id: row.card_print_id,
      current_name: row.current_name,
      set_code: row.set_code,
      tcgdex_external_id: row.tcgdex_external_id,
      tcgdex_number: row.tcgdex_number,
      extracted_number_plain: row.extracted_number_plain,
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
      target_rows: EXPECTED_TARGET_COUNT,
      remaining_blocked_rows_after: EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
    },
    target_row_count: 0,
    successful_extractions: 0,
    ambiguity_count: 0,
    collision_count: 0,
    rows_needing_update: 0,
    rows_already_applied: 0,
    remaining_blocked_rows_before: null,
    remaining_blocked_rows_after: null,
    sample_rows: [],
    canonical_snapshot_before: null,
    canonical_snapshot_after: null,
    identity_duplicate_groups_before: [],
    identity_duplicate_groups_after: [],
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

    const targetSurface = (await loadTargetSurface(client)).map(deriveRecoveryRow);
    const { needsUpdate, alreadyApplied, invalidRows } = splitRecoverySurface(targetSurface);
    const existingNumberedRows = await loadCanonicalNumberedRows(client);
    const collisionAudit = buildCollisionAudit(targetSurface, existingNumberedRows);

    report.target_row_count = targetSurface.length;
    report.successful_extractions = targetSurface.filter(
      (row) =>
        row.validation_status === 'SAFE_UPDATE' || row.validation_status === 'ALREADY_APPLIED',
    ).length;
    report.ambiguity_count = invalidRows.length;
    report.collision_count = collisionAudit.length;
    report.rows_needing_update = needsUpdate.length;
    report.rows_already_applied = alreadyApplied.length;
    report.sample_rows = buildSampleRows(targetSurface);
    report.remaining_blocked_rows_before = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_before = await loadCanonicalSnapshot(client);
    report.identity_duplicate_groups_before = await loadIdentityDuplicateGroups(client);

    assertEqual(report.target_row_count, EXPECTED_TARGET_COUNT, 'TARGET_ROW_COUNT_DRIFT');
    assertEqual(report.successful_extractions, EXPECTED_TARGET_COUNT, 'SUCCESSFUL_EXTRACTIONS_DRIFT');
    assertZero(report.ambiguity_count, 'AMBIGUITY_COUNT_DRIFT');
    assertZero(report.collision_count, 'COLLISION_COUNT_DRIFT');
    assertZero(report.identity_duplicate_groups_before.length, 'IDENTITY_DUPLICATES_BEFORE');

    if (
      !(
        (needsUpdate.length === EXPECTED_TARGET_COUNT && alreadyApplied.length === 0) ||
        (needsUpdate.length === 0 && alreadyApplied.length === EXPECTED_TARGET_COUNT)
      )
    ) {
      throw new Error(
        `NUMBER_RECOVERY_HYDRATION_STATE_DRIFT:${needsUpdate.length}:${alreadyApplied.length}:${EXPECTED_TARGET_COUNT}`,
      );
    }

    if (MODE !== 'apply') {
      report.status = needsUpdate.length === 0 ? 'dry_run_already_applied' : 'dry_run_passed';
      console.log(JSON.stringify(report, null, 2));
      await client.query('rollback');
      return;
    }

    report.apply_operations = await applyRecovery(client, needsUpdate);

    const targetRowsAfter = await loadRowsByIds(
      client,
      targetSurface.map((row) => row.card_print_id),
    );

    const targetRowsAfterById = new Map(targetRowsAfter.map((row) => [row.card_print_id, row]));

    for (const row of targetSurface) {
      const afterRow = targetRowsAfterById.get(row.card_print_id);
      if (!afterRow) {
        throw new Error(`TARGET_ROW_MISSING_AFTER:${row.card_print_id}`);
      }

      if (trimToNull(afterRow.number_plain) !== row.extracted_number_plain) {
        throw new Error(
          `NUMBER_PLAIN_DRIFT_AFTER:${row.card_print_id}:${trimToNull(
            afterRow.number_plain,
          )}:${row.extracted_number_plain}`,
        );
      }
    }

    report.remaining_blocked_rows_after = await loadRemainingBlockedRows(client);
    report.canonical_snapshot_after = await loadCanonicalSnapshot(client);
    report.identity_duplicate_groups_after = await loadIdentityDuplicateGroups(client);

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
    assertZero(report.identity_duplicate_groups_after.length, 'IDENTITY_DUPLICATES_AFTER');
    assertEqual(
      report.remaining_blocked_rows_after,
      EXPECTED_REMAINING_BLOCKED_ROWS_AFTER,
      'REMAINING_BLOCKED_ROWS_AFTER_DRIFT',
    );

    report.status = needsUpdate.length === 0 ? 'apply_already_applied' : 'apply_passed';

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
