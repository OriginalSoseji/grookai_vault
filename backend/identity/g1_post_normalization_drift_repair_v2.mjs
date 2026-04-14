import '../env.mjs';
import { Client } from 'pg';

const PHASE = 'G1_POST_NORMALIZATION_DRIFT_REPAIR_V2';
const HAS_APPLY = process.argv.includes('--apply');
const HAS_DRY_RUN = process.argv.includes('--dry-run');
const MODE = HAS_APPLY ? 'apply' : 'dry-run';

if (HAS_APPLY && HAS_DRY_RUN) {
  throw new Error('MODE_CONFLICT:use either --dry-run or --apply');
}

const TARGET_SET_CODE = 'g1';
const EXPECTED_CANONICAL_COUNT = 116;
const MAX_EXPECTED_DRIFT_ROWS = 6;

const EXPECTED_DRIFT_ROWS = [
  {
    id: '095e74cb-e9fd-46c8-8ffb-15f165195672',
    current_name: 'Venusaur EX',
    proposed_name: 'Venusaur-EX',
    number: '1',
    number_plain: '1',
    variant_key: '',
    gv_id: 'GV-PK-GEN-1',
  },
  {
    id: 'dddd1e45-be0c-4c57-95c8-4538d224f98e',
    current_name: 'Leafeon EX',
    proposed_name: 'Leafeon-EX',
    number: '10',
    number_plain: '10',
    variant_key: '',
    gv_id: 'GV-PK-GEN-10',
  },
  {
    id: '2b0e08a7-d030-452d-bd69-2f4ead71f7d2',
    current_name: 'Charizard EX',
    proposed_name: 'Charizard-EX',
    number: '11',
    number_plain: '11',
    variant_key: '',
    gv_id: 'GV-PK-GEN-11',
  },
  {
    id: 'e41576b3-63ad-4d3f-b54b-74659ee56475',
    current_name: 'Vaporeon EX',
    proposed_name: 'Vaporeon-EX',
    number: '24',
    number_plain: '24',
    variant_key: '',
    gv_id: 'GV-PK-GEN-24',
  },
  {
    id: 'ff741f35-d525-4725-bb8e-9878d2a12856',
    current_name: 'Jolteon EX',
    proposed_name: 'Jolteon-EX',
    number: '28',
    number_plain: '28',
    variant_key: '',
    gv_id: 'GV-PK-GEN-28',
  },
  {
    id: '8498f4ed-a36c-5463-85d6-f4f697136385',
    current_name: 'Gardevoir EX',
    proposed_name: 'Gardevoir-EX',
    number: 'RC30',
    number_plain: '30',
    variant_key: 'rc',
    gv_id: 'GV-PK-GEN-RC30',
  },
];

const EXPECTED_BY_ID = new Map(EXPECTED_DRIFT_ROWS.map((row) => [row.id, row]));

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
    if (!collisions.has(key)) {
      collisions.set(key, []);
    }
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
    if (row.current_key !== row.proposed_key) {
      throw new Error(`NORMALIZATION_KEY_DRIFT:${row.id}:${row.current_key}:${row.proposed_key}`);
    }
    if (!row.gv_id) {
      throw new Error(`NON_CANONICAL_ROW_ENTERED_SCOPE:${row.id}`);
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
  assertEqual(driftRows.length, MAX_EXPECTED_DRIFT_ROWS, 'DRIFT_ROW_COUNT_DRIFT');

  const liveById = new Map(driftRows.map((row) => [row.id, row]));

  for (const expected of EXPECTED_DRIFT_ROWS) {
    const row = liveById.get(expected.id);
    if (!row) {
      throw new Error(`DRIFT_ROW_MISSING:${expected.id}`);
    }

    assertEqual(row.current_name, expected.current_name, 'TARGET_OLD_NAME_DRIFT');
    assertEqual(row.proposed_name, expected.proposed_name, 'TARGET_NEW_NAME_DRIFT');
    assertEqual(row.number, expected.number, 'TARGET_NUMBER_DRIFT');
    assertEqual(String(row.number_plain), expected.number_plain, 'TARGET_NUMBER_PLAIN_DRIFT');
    assertEqual(row.variant_key, expected.variant_key, 'TARGET_VARIANT_KEY_DRIFT');
    assertEqual(row.gv_id, expected.gv_id, 'TARGET_GVID_DRIFT');
  }

  for (const row of driftRows) {
    if (!EXPECTED_BY_ID.has(row.id)) {
      throw new Error(`UNEXPECTED_DRIFT_ROW:${row.id}`);
    }
  }
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

async function loadDuplicateCanonicalRows(client) {
  return queryRows(
    client,
    `
      select
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        count(*)::int as rows_per_identity_key
      from public.card_prints cp
      where cp.set_code = $1
        and cp.gv_id is not null
      group by cp.number_plain, coalesce(cp.variant_key, '')
      having count(*) > 1
      order by cp.number_plain, coalesce(cp.variant_key, '')
    `,
    [TARGET_SET_CODE],
  );
}

async function loadFkOrphanCounts(client) {
  const row = await queryOne(
    client,
    `
      select
        (select count(*)::int from public.card_print_identity where card_print_id not in (select id from public.card_prints)) as card_print_identity_orphans,
        (select count(*)::int from public.card_print_traits where card_print_id not in (select id from public.card_prints)) as card_print_traits_orphans,
        (select count(*)::int from public.card_printings where card_print_id not in (select id from public.card_prints)) as card_printings_orphans,
        (select count(*)::int from public.external_mappings where card_print_id not in (select id from public.card_prints)) as external_mappings_orphans,
        (select count(*)::int from public.vault_items where card_id not in (select id from public.card_prints)) as vault_items_orphans
    `,
  );

  return row ?? {
    card_print_identity_orphans: 0,
    card_print_traits_orphans: 0,
    card_printings_orphans: 0,
    external_mappings_orphans: 0,
    vault_items_orphans: 0,
  };
}

function assertZeroFkOrphans(fkCounts, codePrefix) {
  assertZero(fkCounts?.card_print_identity_orphans, `${codePrefix}_CARD_PRINT_IDENTITY_ORPHANS`);
  assertZero(fkCounts?.card_print_traits_orphans, `${codePrefix}_CARD_PRINT_TRAITS_ORPHANS`);
  assertZero(fkCounts?.card_printings_orphans, `${codePrefix}_CARD_PRINTINGS_ORPHANS`);
  assertZero(fkCounts?.external_mappings_orphans, `${codePrefix}_EXTERNAL_MAPPINGS_ORPHANS`);
  assertZero(fkCounts?.vault_items_orphans, `${codePrefix}_VAULT_ITEMS_ORPHANS`);
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

async function applyNameUpdates(client, driftRows) {
  if (driftRows.length === 0) {
    return {
      rows_updated: 0,
      updated_rows: [],
    };
  }

  const values = [];
  const params = [];

  for (const row of driftRows) {
    const baseIndex = params.length + 1;
    values.push(`($${baseIndex}::uuid, $${baseIndex + 1}::text, $${baseIndex + 2}::text, $${baseIndex + 3}::text)`);
    params.push(row.id, row.current_name, row.proposed_name, row.gv_id);
  }

  const { rows, rowCount } = await client.query(
    `
      with updates(id, expected_current_name, proposed_name, expected_gv_id) as (
        values ${values.join(', ')}
      )
      update public.card_prints cp
      set name = u.proposed_name
      from updates u
      where cp.id = u.id
        and cp.name = u.expected_current_name
        and cp.gv_id = u.expected_gv_id
        and cp.name is distinct from u.proposed_name
      returning
        cp.id,
        u.expected_current_name as old_name,
        cp.name as new_name,
        cp.number,
        cp.number_plain,
        coalesce(cp.variant_key, '') as variant_key,
        cp.gv_id
    `,
    params,
  );

  if ((rowCount ?? 0) !== driftRows.length) {
    throw new Error(`ROWS_UPDATED_COUNT_DRIFT:${rowCount ?? 0}:${driftRows.length}`);
  }

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
    target_set_code: TARGET_SET_CODE,
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
    duplicate_canonical_rows_before: [],
    duplicate_canonical_rows_after: [],
    canonical_count_before: null,
    canonical_count_after: null,
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

    const canonicalRowsBefore = await loadCanonicalRows(client);
    const surfaceBefore = buildNormalizationSurface(canonicalRowsBefore);
    const driftRowsBefore = surfaceBefore.filter((row) => row.is_drift);
    const collisionAudit = buildCollisionAudit(surfaceBefore);

    assertNormalizationSurface(surfaceBefore, collisionAudit);
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
    report.collision_audit = collisionAudit;

    report.regex_drift_rows_before = await loadRegexDriftRows(client);
    assertEqual(report.regex_drift_rows_before.length, driftRowsBefore.length, 'REGEX_DRIFT_COUNT_BEFORE_DRIFT');

    report.duplicate_canonical_rows_before = await loadDuplicateCanonicalRows(client);
    assertEqual(report.duplicate_canonical_rows_before.length, 0, 'DUPLICATE_CANONICAL_ROWS_BEFORE_DRIFT');

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

    report.apply_operations = await applyNameUpdates(client, driftRowsBefore);

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
    report.duplicate_canonical_rows_after = await loadDuplicateCanonicalRows(client);
    report.fk_orphan_counts_after = await loadFkOrphanCounts(client);
    report.canonical_count_after = await loadCanonicalCount(client);

    assertEqual(driftRowsAfter.length, 0, 'DRIFT_ROWS_AFTER_DRIFT');
    assertEqual(report.regex_drift_rows_after.length, 0, 'REGEX_DRIFT_ROWS_AFTER_DRIFT');
    assertEqual(report.duplicate_canonical_rows_after.length, 0, 'DUPLICATE_CANONICAL_ROWS_AFTER_DRIFT');
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
