import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || '.env.local',
  quiet: true,
});

function parseArgs(argv) {
  const out = {
    setCode: null,
    dryRun: false,
    apply: false,
    detail: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--set') {
      out.setCode = (argv[i + 1] || '').trim();
      i += 1;
    } else if (arg === '--dry-run') {
      out.dryRun = true;
    } else if (arg === '--apply') {
      out.apply = true;
    } else if (arg === '--detail') {
      out.detail = true;
    } else if (arg === '--help' || arg === '-h') {
      out.help = true;
    }
  }

  return out;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node backend/tools/tcgdex_canonize_set.mjs --set <set_code> --dry-run [--detail]');
  console.log('  node backend/tools/tcgdex_canonize_set.mjs --set <set_code> --apply [--detail]');
}

function requireValidArgs(args) {
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (!args.setCode) {
    throw new Error('Missing required --set <set_code>.');
  }
  if (args.apply && args.dryRun) {
    throw new Error('--apply and --dry-run are mutually exclusive.');
  }
  if (!args.apply && !args.dryRun) {
    throw new Error('Choose exactly one mode: --dry-run or --apply.');
  }
}

function getMode(args) {
  return args.apply ? 'apply' : 'dry-run';
}

function printJson(label, obj) {
  console.log(`${label} ${JSON.stringify(obj)}`);
}

async function getConnectionInfo(client) {
  const { rows } = await client.query(`
    SELECT
      current_database() AS db_name,
      inet_server_addr()::text AS server_addr,
      inet_server_port() AS server_port,
      current_user AS db_user
  `);
  return rows[0] || {};
}

async function tableExists(client, tableName) {
  const { rows } = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${tableName}`]);
  return rows[0]?.exists === true;
}

async function getRequiredTableChecks(client) {
  const checks = await Promise.all([
    tableExists(client, 'raw_imports'),
    tableExists(client, 'sets'),
    tableExists(client, 'set_code_classification'),
    tableExists(client, 'card_prints'),
    tableExists(client, 'external_mappings'),
  ]);

  const missing = [];
  if (!checks[0]) missing.push('public.raw_imports');
  if (!checks[1]) missing.push('public.sets');
  if (!checks[2]) missing.push('public.set_code_classification');
  if (!checks[3]) missing.push('public.card_prints');
  if (!checks[4]) missing.push('public.external_mappings');
  return missing;
}

async function getTableColumns(client, tableName) {
  const { rows } = await client.query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name=$1
    ORDER BY ordinal_position
  `,
    [tableName],
  );
  return new Set(rows.map((r) => r.column_name));
}

const SET_RAW_SQL = `
  SELECT
    COUNT(*)::int AS set_raw_count,
    (ARRAY_AGG(COALESCE(ri.payload->'set'->>'name', ri.payload->>'name') ORDER BY ri.id DESC))[1] AS set_name,
    (ARRAY_AGG(
      COALESCE(
        ri.payload->'set'->'cardCount'->>'official',
        ri.payload->'cardCount'->>'official'
      ) ORDER BY ri.id DESC
    ))[1] AS official_count_text
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='set'
    AND ri.payload->>'_external_id'=$1
`;

const SET_ROW_SQL = `
  SELECT
    COUNT(*)::int AS set_row_count,
    (ARRAY_AGG(s.id ORDER BY s.id))[1] AS set_id,
    (ARRAY_AGG(s.name ORDER BY s.id))[1] AS existing_set_name
  FROM public.sets s
  WHERE s.code=$1
`;

const CARD_RAW_COUNT_SQL = `
  SELECT
    COUNT(*)::int AS raw_rows,
    COUNT(DISTINCT (ri.payload->>'_external_id'))::int AS card_raws
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
`;

function tcgdexCardsCte() {
  return `
    tcgdex_cards AS (
      SELECT DISTINCT ON ((ri.payload->>'_external_id'))
        (ri.payload->>'_external_id') AS external_id,
        NULLIF(ri.payload->'card'->>'localId', '') AS local_id,
        NULLIF(COALESCE(ri.payload->'card'->>'name', ri.payload->>'name'), '') AS card_name,
        NULLIF(ri.payload->'card'->>'rarity', '') AS rarity,
        NULLIF(ri.payload->'card'->>'illustrator', '') AS artist,
        CASE
          WHEN jsonb_typeof(ri.payload->'card'->'variants') = 'object' THEN ri.payload->'card'->'variants'
          ELSE NULL
        END AS variants,
        ri.id AS raw_import_id
      FROM public.raw_imports ri
      WHERE ri.source='tcgdex'
        AND ri.payload->>'_kind'='card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
        AND ri.payload ? '_external_id'
      ORDER BY (ri.payload->>'_external_id'), ri.id DESC
    )
  `;
}

function completePlanSql() {
  return `
    WITH
    ${tcgdexCardsCte()},
    missing_prints AS (
      SELECT DISTINCT ON (c.local_id)
        c.local_id,
        c.card_name,
        c.rarity,
        c.artist,
        COALESCE(c.variants, '{}'::jsonb) AS variants
      FROM tcgdex_cards c
      WHERE c.local_id IS NOT NULL
        AND c.card_name IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.card_prints cp
          WHERE cp.set_id = $2::uuid
            AND cp.number = c.local_id
            AND COALESCE(cp.variant_key, '') = ''
        )
      ORDER BY c.local_id, c.raw_import_id DESC
    ),
    existing_candidates AS (
      SELECT
        c.external_id,
        COUNT(cp.id)::int AS existing_candidate_count
      FROM tcgdex_cards c
      LEFT JOIN public.card_prints cp
        ON cp.set_id = $2::uuid
       AND cp.number = c.local_id
       AND COALESCE(cp.variant_key, '') = ''
      GROUP BY c.external_id
    ),
    mapping_state AS (
      SELECT
        c.external_id,
        c.local_id,
        c.card_name,
        EXISTS (
          SELECT 1
          FROM public.external_mappings em
          WHERE em.source='tcgdex'
            AND em.external_id=c.external_id
        ) AS has_mapping,
        ec.existing_candidate_count,
        EXISTS (
          SELECT 1
          FROM missing_prints mp
          WHERE mp.local_id = c.local_id
        ) AS will_create_print_for_local_id
      FROM tcgdex_cards c
      JOIN existing_candidates ec
        ON ec.external_id = c.external_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM missing_prints) AS would_insert_prints,
      COUNT(*) FILTER (
        WHERE NOT ms.has_mapping
          AND (
            CASE
              WHEN ms.existing_candidate_count > 0 THEN ms.existing_candidate_count
              WHEN ms.will_create_print_for_local_id THEN 1
              ELSE 0
            END
          ) = 1
      )::int AS would_insert_mappings,
      COUNT(*) FILTER (WHERE ms.local_id IS NULL)::int AS missing_local_id,
      COUNT(*) FILTER (WHERE ms.card_name IS NULL)::int AS missing_name,
      COUNT(*) FILTER (
        WHERE NOT ms.has_mapping
          AND (
            CASE
              WHEN ms.existing_candidate_count > 0 THEN ms.existing_candidate_count
              WHEN ms.will_create_print_for_local_id THEN 1
              ELSE 0
            END
          ) = 0
      )::int AS unmappable_after_materialization,
      COUNT(*) FILTER (
        WHERE NOT ms.has_mapping
          AND (
            CASE
              WHEN ms.existing_candidate_count > 0 THEN ms.existing_candidate_count
              WHEN ms.will_create_print_for_local_id THEN 1
              ELSE 0
            END
          ) > 1
      )::int AS ambiguous_candidates
    FROM mapping_state ms
  `;
}

const UPSERT_CLASSIFICATION_SQL = `
  INSERT INTO public.set_code_classification (
    set_code,
    is_canon,
    canon_source,
    tcgdex_set_id,
    notes
  )
  VALUES (
    $1,
    true,
    'tcgdex',
    $1,
    $2
  )
  ON CONFLICT (set_code) DO UPDATE
  SET
    is_canon = EXCLUDED.is_canon,
    canon_source = EXCLUDED.canon_source,
    tcgdex_set_id = EXCLUDED.tcgdex_set_id,
    notes = EXCLUDED.notes
  RETURNING set_code, is_canon, canon_source, tcgdex_set_id, notes
`;

const UPDATE_SET_SQL = `
  UPDATE public.sets s
  SET
    name = COALESCE($2, s.name),
    printed_total = $3::int,
    source = jsonb_set(
      COALESCE(s.source, '{}'::jsonb),
      '{tcgdex_set}',
      to_jsonb($1::text),
      true
    ),
    last_synced_at = now(),
    updated_at = now()
  WHERE s.id = $4::uuid
  RETURNING s.id, s.code, s.name, s.printed_total
`;

function insertPrintsSql() {
  return `
    WITH
    ${tcgdexCardsCte()},
    missing_prints AS (
      SELECT DISTINCT ON (c.local_id)
        c.local_id,
        c.card_name,
        c.rarity,
        c.artist,
        COALESCE(c.variants, '{}'::jsonb) AS variants
      FROM tcgdex_cards c
      WHERE c.local_id IS NOT NULL
        AND c.card_name IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM public.card_prints cp
          WHERE cp.set_id = $2::uuid
            AND cp.number = c.local_id
            AND COALESCE(cp.variant_key, '') = ''
        )
      ORDER BY c.local_id, c.raw_import_id DESC
    )
    INSERT INTO public.card_prints (
      set_id,
      set_code,
      number,
      variant_key,
      name,
      rarity,
      artist,
      variants
    )
    SELECT
      $2::uuid AS set_id,
      $1::text AS set_code,
      mp.local_id AS number,
      ''::text AS variant_key,
      mp.card_name AS name,
      mp.rarity AS rarity,
      mp.artist AS artist,
      mp.variants AS variants
    FROM missing_prints mp
    ON CONFLICT ON CONSTRAINT uq_card_prints_identity DO NOTHING
    RETURNING id, number
  `;
}

function insertMappingsSql() {
  return `
    WITH
    ${tcgdexCardsCte()},
    candidates AS (
      SELECT
        c.external_id,
        cp.id AS card_print_id
      FROM tcgdex_cards c
      JOIN public.card_prints cp
        ON cp.set_id = $2::uuid
       AND cp.number = c.local_id
       AND COALESCE(cp.variant_key, '') = ''
    ),
    candidate_counts AS (
      SELECT
        external_id,
        COUNT(*)::int AS candidate_count
      FROM candidates
      GROUP BY external_id
    ),
    unique_candidates AS (
      SELECT
        c.external_id,
        (ARRAY_AGG(c.card_print_id ORDER BY c.card_print_id))[1] AS card_print_id
      FROM candidates c
      JOIN candidate_counts cc
        ON cc.external_id = c.external_id
       AND cc.candidate_count = 1
      GROUP BY c.external_id
    )
    INSERT INTO public.external_mappings (
      card_print_id,
      source,
      external_id,
      active,
      synced_at,
      meta
    )
    SELECT
      uc.card_print_id,
      'tcgdex' AS source,
      uc.external_id,
      true AS active,
      now() AS synced_at,
      jsonb_build_object(
        'runner', 'tcgdex_canonize_set_v1',
        'set', $1,
        'join', 'set_id + localId -> number',
        'variant_key', ''
      ) AS meta
    FROM unique_candidates uc
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.external_mappings em
      WHERE em.source='tcgdex'
        AND em.external_id=uc.external_id
    )
    ON CONFLICT (source, external_id) DO NOTHING
    RETURNING external_id
  `;
}

const COVERAGE_V2_SQL = `
  WITH tcgdex_raws AS (
    SELECT DISTINCT
      (ri.payload->>'_external_id') AS external_id
    FROM public.raw_imports ri
    WHERE ri.source='tcgdex'
      AND ri.payload->>'_kind'='card'
      AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
      AND ri.payload ? '_external_id'
  ),
  canon_prints AS (
    SELECT cp.id, cp.number_plain
    FROM public.card_prints cp
    WHERE cp.set_id = $2::uuid
      AND COALESCE(cp.variant_key, '') = ''
  ),
  mapped AS (
    SELECT
      r.external_id,
      em.card_print_id
    FROM tcgdex_raws r
    LEFT JOIN public.external_mappings em
      ON em.source='tcgdex'
     AND em.external_id = r.external_id
  ),
  dupe_ids AS (
    SELECT cp.id
    FROM public.card_prints cp
    WHERE cp.set_id = $2::uuid
      AND COALESCE(cp.variant_key, '') = ''
      AND cp.number_plain ~ '^[0-9]+$'
      AND EXISTS (
        SELECT 1
        FROM public.card_prints cp2
        WHERE cp2.set_id = cp.set_id
          AND COALESCE(cp2.variant_key, '') = COALESCE(cp.variant_key, '')
          AND cp2.number_plain ~ '^[0-9]+$'
          AND cp2.number_plain::int = cp.number_plain::int
          AND cp2.id <> cp.id
      )
  )
  SELECT
    (SELECT COUNT(*)::int FROM canon_prints) AS canon_prints,
    (SELECT COUNT(*)::int FROM tcgdex_raws) AS tcgdex_card_raws,
    COUNT(*) FILTER (WHERE m.card_print_id IS NOT NULL)::int AS mapped_rows,
    COUNT(*) FILTER (
      WHERE m.card_print_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.card_prints cp
          WHERE cp.id = m.card_print_id
            AND cp.set_id = $2::uuid
        )
    )::int AS mapped_to_existing_prints,
    (SELECT COUNT(DISTINCT id)::int FROM dupe_ids) AS dupes,
    COUNT(*) FILTER (WHERE m.card_print_id IS NULL)::int AS still_unmapped
  FROM mapped m
`;

function buildNotes(mode, cardRaws, officialCount) {
  return `tcgdex_canonize_set_v1 mode=${mode.toLowerCase()} card_raws=${cardRaws}/${officialCount}`;
}

async function runApply(client, ctx) {
  await client.query('BEGIN');
  try {
    const notes = buildNotes(ctx.mode, ctx.cardRaws, ctx.officialCount);
    const classRes = await client.query(UPSERT_CLASSIFICATION_SQL, [ctx.setCode, notes]);
    const setRes = await client.query(UPDATE_SET_SQL, [ctx.setCode, ctx.setName, ctx.officialCount, ctx.setId]);

    let insertedPrints = 0;
    let insertedMappings = 0;
    if (ctx.mode === 'COMPLETE') {
      const printRes = await client.query(insertPrintsSql(), [ctx.setCode, ctx.setId]);
      const mapRes = await client.query(insertMappingsSql(), [ctx.setCode, ctx.setId]);
      insertedPrints = printRes.rowCount || 0;
      insertedMappings = mapRes.rowCount || 0;
    }

    await client.query('COMMIT');
    return {
      upserted_classification_rows: classRes.rowCount || 0,
      updated_set_rows: setRes.rowCount || 0,
      inserted_prints: insertedPrints,
      inserted_mappings: insertedMappings,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireValidArgs(args);

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set.');
  }

  const mode = getMode(args);
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const conn = await getConnectionInfo(client);
    printJson('connection', {
      database: conn.db_name || 'unknown',
      server_addr: conn.server_addr || 'unknown',
      server_port: conn.server_port || 'unknown',
      db_user: conn.db_user || 'unknown',
      mode,
      set: args.setCode,
    });

    const missingTables = await getRequiredTableChecks(client);
    if (missingTables.length > 0) {
      const summary = {
        set: args.setCode,
        official_count: null,
        card_raws: 0,
        mode: 'STOP',
        would_insert_prints: 0,
        would_insert_mappings: 0,
        coverage_v2: {
          canon_prints: 0,
          tcgdex_card_raws: 0,
          mapped_rows: 0,
          mapped_to_existing_prints: 0,
          dupes: 0,
          still_unmapped: 0,
        },
        stops: [`missing_required_tables=${missingTables.join(',')}`],
      };
      printJson('summary', summary);
      return;
    }

    const rawCols = await getTableColumns(client, 'raw_imports');
    const setsCols = await getTableColumns(client, 'sets');
    const sccCols = await getTableColumns(client, 'set_code_classification');
    const cpCols = await getTableColumns(client, 'card_prints');
    const emCols = await getTableColumns(client, 'external_mappings');

    const missingColumns = [];
    for (const col of ['source', 'payload']) {
      if (!rawCols.has(col)) missingColumns.push(`raw_imports.${col}`);
    }
    for (const col of ['id', 'code', 'name', 'printed_total', 'source', 'last_synced_at', 'updated_at']) {
      if (!setsCols.has(col)) missingColumns.push(`sets.${col}`);
    }
    for (const col of ['set_code', 'is_canon', 'canon_source', 'tcgdex_set_id', 'notes']) {
      if (!sccCols.has(col)) missingColumns.push(`set_code_classification.${col}`);
    }
    for (const col of ['set_id', 'set_code', 'number', 'variant_key', 'name', 'rarity', 'artist', 'variants']) {
      if (!cpCols.has(col)) missingColumns.push(`card_prints.${col}`);
    }
    for (const col of ['card_print_id', 'source', 'external_id', 'active', 'synced_at', 'meta']) {
      if (!emCols.has(col)) missingColumns.push(`external_mappings.${col}`);
    }
    if (missingColumns.length > 0) {
      const summary = {
        set: args.setCode,
        official_count: null,
        card_raws: 0,
        mode: 'STOP',
        would_insert_prints: 0,
        would_insert_mappings: 0,
        coverage_v2: {
          canon_prints: 0,
          tcgdex_card_raws: 0,
          mapped_rows: 0,
          mapped_to_existing_prints: 0,
          dupes: 0,
          still_unmapped: 0,
        },
        stops: [`missing_required_columns=${missingColumns.join(',')}`],
      };
      printJson('summary', summary);
      return;
    }

    const [setRawRes, setRowRes, cardRawRes] = await Promise.all([
      client.query(SET_RAW_SQL, [args.setCode]),
      client.query(SET_ROW_SQL, [args.setCode]),
      client.query(CARD_RAW_COUNT_SQL, [args.setCode]),
    ]);

    const setRaw = setRawRes.rows[0] || { set_raw_count: 0, set_name: null, official_count_text: null };
    const setRow = setRowRes.rows[0] || { set_row_count: 0, set_id: null, existing_set_name: null };
    const cardRaw = cardRawRes.rows[0] || { raw_rows: 0, card_raws: 0 };

    const setRawCount = Number(setRaw.set_raw_count || 0);
    const setRowCount = Number(setRow.set_row_count || 0);
    const cardRaws = Number(cardRaw.card_raws || 0);
    const rawRows = Number(cardRaw.raw_rows || 0);
    const officialCount = setRaw.official_count_text !== null && String(setRaw.official_count_text).match(/^[0-9]+$/)
      ? Number(setRaw.official_count_text)
      : null;
    const setName = setRaw.set_name || null;
    const setId = setRow.set_id || null;

    const stops = [];
    if (setRawCount !== 1) {
      stops.push(`canon_presence_gate_failed=set_raw_count:${setRawCount}`);
    }
    if (setRowCount !== 1 || !setId) {
      stops.push(`set_lookup_failed=set_rows:${setRowCount}`);
    }
    if (officialCount === null) {
      stops.push('official_count_missing_or_non_numeric');
    }
    if (officialCount !== null && cardRaws > officialCount) {
      stops.push(`card_raws_exceed_official=${cardRaws}/${officialCount}`);
    }

    let canonizeMode = 'STOP';
    if (stops.length === 0) {
      canonizeMode = cardRaws === officialCount ? 'COMPLETE' : 'INCOMPLETE';
    }

    let plan = {
      would_insert_prints: 0,
      would_insert_mappings: 0,
      missing_local_id: 0,
      missing_name: 0,
      unmappable_after_materialization: 0,
      ambiguous_candidates: 0,
    };
    if (canonizeMode === 'COMPLETE') {
      const { rows } = await client.query(completePlanSql(), [args.setCode, setId]);
      plan = rows[0] || plan;
      if (Number(plan.missing_local_id || 0) > 0) {
        stops.push(`complete_mode_missing_local_id=${plan.missing_local_id}`);
      }
      if (Number(plan.missing_name || 0) > 0) {
        stops.push(`complete_mode_missing_name=${plan.missing_name}`);
      }
      if (Number(plan.unmappable_after_materialization || 0) > 0) {
        stops.push(`complete_mode_unmappable_after_materialization=${plan.unmappable_after_materialization}`);
      }
      if (Number(plan.ambiguous_candidates || 0) > 0) {
        stops.push(`complete_mode_ambiguous_candidates=${plan.ambiguous_candidates}`);
      }
      if (stops.length > 0) {
        canonizeMode = 'STOP';
      }
    }

    if (args.detail) {
      printJson('preflight', {
        set_raw_count: setRawCount,
        set_row_count: setRowCount,
        official_count: officialCount,
        card_raws: cardRaws,
        raw_rows: rawRows,
        mode: canonizeMode,
      });
      printJson('detail', plan);
    }

    let applyResult = null;
    if (mode === 'apply' && canonizeMode !== 'STOP') {
      applyResult = await runApply(client, {
        setCode: args.setCode,
        setName,
        setId,
        cardRaws,
        officialCount,
        mode: canonizeMode,
      });
      printJson('apply', applyResult);
    }

    let coverageV2 = {
      canon_prints: 0,
      tcgdex_card_raws: cardRaws,
      mapped_rows: 0,
      mapped_to_existing_prints: 0,
      dupes: 0,
      still_unmapped: cardRaws,
    };
    if (setId) {
      const coverageRes = await client.query(COVERAGE_V2_SQL, [args.setCode, setId]);
      coverageV2 = coverageRes.rows[0] || coverageV2;
    }

    const summary = {
      set: args.setCode,
      official_count: officialCount,
      card_raws: cardRaws,
      mode: canonizeMode,
      would_insert_prints: canonizeMode === 'COMPLETE' ? Number(plan.would_insert_prints || 0) : 0,
      would_insert_mappings: canonizeMode === 'COMPLETE' ? Number(plan.would_insert_mappings || 0) : 0,
      coverage_v2: {
        canon_prints: Number(coverageV2.canon_prints || 0),
        tcgdex_card_raws: Number(coverageV2.tcgdex_card_raws || 0),
        mapped_rows: Number(coverageV2.mapped_rows || 0),
        mapped_to_existing_prints: Number(coverageV2.mapped_to_existing_prints || 0),
        dupes: Number(coverageV2.dupes || 0),
        still_unmapped: Number(coverageV2.still_unmapped || 0),
      },
    };

    if (canonizeMode === 'INCOMPLETE') {
      summary.note = mode === 'apply'
        ? `canonicalized_with_incomplete_card_coverage=${cardRaws}/${officialCount}`
        : `would_canonicalize_with_incomplete_card_coverage=${cardRaws}/${officialCount}`;
    }
    if (canonizeMode === 'STOP') {
      summary.stops = stops;
    }
    if (applyResult) {
      summary.apply = applyResult;
    }

    printJson('summary', summary);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`fatal error=${err.message}`);
  process.exit(1);
});
