import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || '.env.local',
  quiet: true,
});

const TARGET_FINISH_KEYS = ['normal', 'reverse', 'holo'];

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
  console.log('  node backend/tools/tk_safe_printing_mapper.mjs --set <tk-set-code> [--dry-run|--apply] [--detail]');
  console.log('Examples:');
  console.log('  node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --dry-run');
  console.log('  node backend/tools/tk_safe_printing_mapper.mjs --set tk-hs-g --apply --detail');
}

function requireValidArgs(args) {
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  if (!args.setCode) {
    throw new Error('Missing required --set <tk-set-code>.');
  }
  if (args.apply && args.dryRun) {
    throw new Error('--apply and --dry-run are mutually exclusive.');
  }
}

function getMode(args) {
  if (args.apply) return 'apply';
  if (args.dryRun) return 'dry-run';
  return 'check';
}

function parseAllowlist() {
  const raw = (process.env.TK_VARIANT_TYPE_ALLOWLIST || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => !!s);
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
    tableExists(client, 'card_prints'),
    tableExists(client, 'card_print_traits'),
    tableExists(client, 'card_printings'),
    tableExists(client, 'external_printing_mappings'),
  ]);

  const missing = [];
  if (!checks[0]) missing.push('public.raw_imports');
  if (!checks[1]) missing.push('public.card_prints');
  if (!checks[2]) missing.push('public.card_print_traits');
  if (!checks[3]) missing.push('public.card_printings');
  if (!checks[4]) missing.push('public.external_printing_mappings');

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

function rowEvalCte() {
  return `
    WITH tk_raw AS (
      SELECT
        ri.id AS raw_import_id,
        (ri.payload->>'_external_id') AS external_id,
        (ri.payload->'card') AS card_json
      FROM public.raw_imports ri
      WHERE ri.source='tcgdex'
        AND ri.payload->>'_kind'='card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
    ),
    normalized AS (
      SELECT
        tr.raw_import_id,
        tr.external_id,
        NULLIF(tr.card_json->>'name', '') AS card_name,
        NULLIF(tr.card_json->>'illustrator', '') AS illustrator,
        (tr.card_json->'dexId'->>0) AS dex_text,
        (jsonb_typeof(tr.card_json->'variants_detailed') = 'array') AS has_variants_detailed,
        COALESCE(
          ARRAY(
            SELECT DISTINCT LOWER(v->>'type')
            FROM jsonb_array_elements(
              CASE
                WHEN jsonb_typeof(tr.card_json->'variants_detailed') = 'array' THEN tr.card_json->'variants_detailed'
                ELSE '[]'::jsonb
              END
            ) v
            WHERE NULLIF(LOWER(v->>'type'), '') IS NOT NULL
          ),
          ARRAY[]::text[]
        ) AS variant_types
      FROM tk_raw tr
    ),
    row_eval AS (
      SELECT
        n.raw_import_id,
        n.external_id,
        n.card_name,
        n.illustrator,
        n.dex_text,
        CASE WHEN n.dex_text ~ '^[0-9]+$' THEN n.dex_text::int ELSE NULL END AS national_dex,
        n.has_variants_detailed,
        n.variant_types,
        (
          n.card_name IS NOT NULL
          AND n.illustrator IS NOT NULL
          AND n.dex_text ~ '^[0-9]+$'
          AND n.has_variants_detailed
          AND CARDINALITY(n.variant_types) > 0
        ) AS required_ok,
        COALESCE((
          SELECT COUNT(*)::int
          FROM unnest(n.variant_types) AS t(finish_type)
          WHERE t.finish_type = ANY($2::text[])
        ), 0) AS supported_finish_count,
        EXISTS (
          SELECT 1
          FROM unnest(n.variant_types) AS t(finish_type)
          WHERE NOT (
            t.finish_type = ANY($2::text[])
            OR t.finish_type = ANY($3::text[])
          )
        ) AS has_unexpected_variant,
        COALESCE(cs.candidate_count, 0) AS candidate_count,
        cs.card_print_id,
        COALESCE(nm.near_miss_name_count, 0) AS near_miss_name_count,
        COALESCE(nm.near_miss_artist_count, 0) AS near_miss_artist_count
      FROM normalized n
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS candidate_count,
          (ARRAY_AGG(c.card_print_id))[1] AS card_print_id
        FROM (
          SELECT DISTINCT cp.id AS card_print_id
          FROM public.card_prints cp
          JOIN public.card_print_traits cpt
            ON cpt.card_print_id = cp.id
          WHERE cpt.national_dex = CASE WHEN n.dex_text ~ '^[0-9]+$' THEN n.dex_text::int ELSE NULL END
            AND cp.name = n.card_name
            AND cp.artist = n.illustrator
        ) c
      ) cs ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(cp.name)) = LOWER(TRIM(n.card_name))
              AND cp.name <> n.card_name
          )::int AS near_miss_name_count,
          COUNT(*) FILTER (
            WHERE LOWER(TRIM(cp.artist)) = LOWER(TRIM(n.illustrator))
              AND cp.artist <> n.illustrator
          )::int AS near_miss_artist_count
        FROM (
          SELECT DISTINCT cp.id, cp.name, cp.artist
          FROM public.card_prints cp
          JOIN public.card_print_traits cpt
            ON cpt.card_print_id = cp.id
          WHERE cpt.national_dex = CASE WHEN n.dex_text ~ '^[0-9]+$' THEN n.dex_text::int ELSE NULL END
        ) cp
      ) nm ON TRUE
    )
  `;
}

function preflightSummarySql() {
  return `
    ${rowEvalCte()}
    SELECT
      COUNT(*)::int AS tk_rows,
      COUNT(*) FILTER (
        WHERE required_ok
          AND supported_finish_count > 0
          AND NOT has_unexpected_variant
          AND candidate_count = 1
      )::int AS unique_ok,
      COUNT(*) FILTER (WHERE required_ok AND candidate_count = 0)::int AS no_match,
      COUNT(*) FILTER (WHERE required_ok AND candidate_count > 1)::int AS ambiguous,
      COUNT(*) FILTER (WHERE NOT required_ok)::int AS missing_required,
      COUNT(*) FILTER (WHERE has_unexpected_variant)::int AS unexpected_variant,
      COALESCE(SUM(CASE WHEN required_ok THEN near_miss_name_count ELSE 0 END), 0)::int AS near_miss_name,
      COALESCE(SUM(CASE WHEN required_ok THEN near_miss_artist_count ELSE 0 END), 0)::int AS near_miss_artist,
      COUNT(*) FILTER (
        WHERE required_ok
          AND NOT has_unexpected_variant
          AND candidate_count = 1
          AND supported_finish_count = 0
      )::int AS no_supported_finish
    FROM row_eval
  `;
}

function stopSampleSql() {
  return `
    ${rowEvalCte()}
    SELECT
      external_id,
      card_name,
      illustrator,
      dex_text,
      variant_types,
      required_ok,
      supported_finish_count,
      has_unexpected_variant,
      candidate_count
    FROM row_eval
    WHERE NOT required_ok
       OR has_unexpected_variant
       OR candidate_count <> 1
       OR supported_finish_count = 0
    ORDER BY external_id
    LIMIT 25
  `;
}

function pairRowsCte() {
  return `
    ${rowEvalCte()},
    resolved AS (
      SELECT
        re.external_id,
        re.card_print_id,
        re.variant_types
      FROM row_eval re
      WHERE re.required_ok
        AND re.supported_finish_count > 0
        AND NOT re.has_unexpected_variant
        AND re.candidate_count = 1
    ),
    pair_rows AS (
      SELECT DISTINCT
        r.external_id,
        r.card_print_id,
        f.finish_key
      FROM resolved r
      JOIN LATERAL (
        SELECT t.finish_type AS finish_key
        FROM unnest(r.variant_types) AS t(finish_type)
        WHERE t.finish_type = ANY($2::text[])
      ) f ON TRUE
    )
  `;
}

function pairCountsSql() {
  return `
    ${pairRowsCte()}
    , pair_status AS (
      SELECT
        p.external_id,
        p.card_print_id,
        p.finish_key,
        EXISTS (
          SELECT 1
          FROM public.card_printings cpn
          WHERE cpn.card_print_id = p.card_print_id
            AND cpn.finish_key = p.finish_key
        ) AS has_printing,
        EXISTS (
          SELECT 1
          FROM public.external_printing_mappings epm
          WHERE epm.source = 'tcgdex'
            AND epm.external_id = (p.external_id || ':' || p.finish_key)
        ) AS has_mapping,
        (
          SELECT COUNT(*)::int
          FROM public.card_printings cpn
          WHERE cpn.card_print_id = p.card_print_id
            AND cpn.finish_key = p.finish_key
        ) AS printing_row_count
      FROM pair_rows p
    )
    SELECT
      COUNT(*)::int AS expected_pairs,
      COUNT(*) FILTER (WHERE NOT has_printing)::int AS would_insert_printings,
      COUNT(*) FILTER (WHERE NOT has_mapping)::int AS would_insert_printing_mappings,
      COUNT(*) FILTER (WHERE has_printing)::int AS existing_printings,
      COUNT(*) FILTER (WHERE has_mapping)::int AS existing_printing_mappings,
      COUNT(*) FILTER (WHERE printing_row_count > 1)::int AS ambiguous_printing_children
    FROM pair_status
  `;
}

function insertPrintingsSql() {
  return `
    ${pairRowsCte()}
    INSERT INTO public.card_printings (id, card_print_id, finish_key, created_at)
    SELECT
      gen_random_uuid() AS id,
      p.card_print_id,
      p.finish_key,
      now() AS created_at
    FROM pair_rows p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.card_printings cpn
      WHERE cpn.card_print_id = p.card_print_id
        AND cpn.finish_key = p.finish_key
    )
    RETURNING card_print_id, finish_key
  `;
}

function insertPrintingMappingsSql() {
  return `
    ${pairRowsCte()}
    , resolved_printing AS (
      SELECT
        p.external_id,
        p.finish_key,
        (
          SELECT (ARRAY_AGG(cpn.id))[1]
          FROM public.card_printings cpn
          WHERE cpn.card_print_id = p.card_print_id
            AND cpn.finish_key = p.finish_key
        ) AS card_printing_id,
        (
          SELECT COUNT(*)::int
          FROM public.card_printings cpn
          WHERE cpn.card_print_id = p.card_print_id
            AND cpn.finish_key = p.finish_key
        ) AS printing_row_count
      FROM pair_rows p
    )
    INSERT INTO public.external_printing_mappings (id, card_printing_id, source, external_id, active, synced_at, meta)
    SELECT
      gen_random_uuid() AS id,
      rp.card_printing_id,
      'tcgdex' AS source,
      (rp.external_id || ':' || rp.finish_key) AS external_id,
      true AS active,
      now() AS synced_at,
      jsonb_build_object(
        'tk_set', $1,
        'tk_card_external_id', rp.external_id,
        'finish_key', rp.finish_key,
        'join', 'national_dex + illustrator + name'
      ) AS meta
    FROM resolved_printing rp
    WHERE rp.card_printing_id IS NOT NULL
      AND rp.printing_row_count = 1
      AND NOT EXISTS (
        SELECT 1
        FROM public.external_printing_mappings epm
        WHERE epm.source = 'tcgdex'
          AND epm.external_id = (rp.external_id || ':' || rp.finish_key)
      )
    RETURNING external_id
  `;
}

const VERIFY_SQL = `
  WITH tk_raw AS (
    SELECT DISTINCT (ri.payload->>'_external_id') AS external_id
    FROM public.raw_imports ri
    WHERE ri.source='tcgdex'
      AND ri.payload->>'_kind'='card'
      AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
      AND ri.payload ? '_external_id'
  )
  SELECT
    (SELECT COUNT(*)::int FROM tk_raw) AS raw_cards,
    (
      SELECT COUNT(*)::int
      FROM tk_raw r
      WHERE EXISTS (
        SELECT 1
        FROM public.external_printing_mappings epm
        WHERE epm.source='tcgdex'
          AND epm.external_id LIKE (r.external_id || ':%')
      )
    ) AS raw_cards_with_printing_mapping,
    (
      SELECT COUNT(*)::int
      FROM public.external_printing_mappings epm
      WHERE epm.source='tcgdex'
        AND EXISTS (
          SELECT 1
          FROM tk_raw r
          WHERE epm.external_id LIKE (r.external_id || ':%')
        )
    ) AS total_printing_mappings_for_set
`;

async function preflight(client, setCode, allowVariantTypes, detail) {
  const params = [setCode, TARGET_FINISH_KEYS, allowVariantTypes];
  const summaryRes = await client.query(preflightSummarySql(), params);
  const summary = summaryRes.rows[0] || {
    tk_rows: 0,
    unique_ok: 0,
    no_match: 0,
    ambiguous: 0,
    missing_required: 0,
    unexpected_variant: 0,
    near_miss_name: 0,
    near_miss_artist: 0,
    no_supported_finish: 0,
  };

  const stops = [];
  if (Number(summary.tk_rows) === 0) {
    stops.push('no_raw_rows_for_set');
  }
  if (Number(summary.missing_required) > 0) {
    stops.push(`missing_required_fields=${summary.missing_required}`);
  }
  if (Number(summary.unexpected_variant) > 0) {
    stops.push(`unexpected_variant_type=${summary.unexpected_variant}`);
  }
  if (Number(summary.no_match) > 0) {
    stops.push(`no_match=${summary.no_match}`);
  }
  if (Number(summary.ambiguous) > 0) {
    stops.push(`ambiguous=${summary.ambiguous}`);
  }
  if (Number(summary.no_supported_finish) > 0) {
    stops.push(`no_supported_finish=${summary.no_supported_finish}`);
  }

  let samples = [];
  if (detail || stops.length > 0) {
    const sampleRes = await client.query(stopSampleSql(), params);
    samples = sampleRes.rows;
  }

  return { summary, stops, samples };
}

async function getPairCounts(client, setCode, allowVariantTypes) {
  const { rows } = await client.query(pairCountsSql(), [setCode, TARGET_FINISH_KEYS, allowVariantTypes]);
  return rows[0] || {
    expected_pairs: 0,
    would_insert_printings: 0,
    would_insert_printing_mappings: 0,
    existing_printings: 0,
    existing_printing_mappings: 0,
    ambiguous_printing_children: 0,
  };
}

async function runApply(client, setCode, allowVariantTypes) {
  await client.query('BEGIN');
  try {
    const insertPrintingsRes = await client.query(insertPrintingsSql(), [setCode, TARGET_FINISH_KEYS, allowVariantTypes]);
    const insertMappingsRes = await client.query(insertPrintingMappingsSql(), [setCode, TARGET_FINISH_KEYS, allowVariantTypes]);
    await client.query('COMMIT');
    return {
      insertedPrintings: insertPrintingsRes.rowCount || 0,
      insertedPrintingMappings: insertMappingsRes.rowCount || 0,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function verify(client, setCode) {
  const { rows } = await client.query(VERIFY_SQL, [setCode]);
  return rows[0] || {
    raw_cards: 0,
    raw_cards_with_printing_mapping: 0,
    total_printing_mappings_for_set: 0,
  };
}

function printJson(label, obj) {
  console.log(`${label} ${JSON.stringify(obj)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  requireValidArgs(args);

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('SUPABASE_DB_URL or DATABASE_URL must be set.');
  }

  const mode = getMode(args);
  const allowVariantTypes = parseAllowlist();

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
        raw_cards: 0,
        matched_ok: 0,
        inserted_printings: 0,
        inserted_printing_mappings: 0,
        skipped_existing: 0,
        stops: [`missing_required_tables=${missingTables.join(',')}`],
      };
      printJson('summary', summary);
      return;
    }

    const cpnCols = await getTableColumns(client, 'card_printings');
    const epmCols = await getTableColumns(client, 'external_printing_mappings');
    const missingColumns = [];
    for (const col of ['id', 'card_print_id', 'finish_key', 'created_at']) {
      if (!cpnCols.has(col)) missingColumns.push(`card_printings.${col}`);
    }
    for (const col of ['id', 'card_printing_id', 'source', 'external_id', 'active', 'synced_at', 'meta']) {
      if (!epmCols.has(col)) missingColumns.push(`external_printing_mappings.${col}`);
    }
    if (missingColumns.length > 0) {
      const summary = {
        set: args.setCode,
        raw_cards: 0,
        matched_ok: 0,
        inserted_printings: 0,
        inserted_printing_mappings: 0,
        skipped_existing: 0,
        stops: [`missing_required_columns=${missingColumns.join(',')}`],
      };
      printJson('summary', summary);
      return;
    }

    printJson('config', {
      target_finish_keys: TARGET_FINISH_KEYS,
      allow_variant_types: allowVariantTypes,
      detail: args.detail,
    });

    const pre = await preflight(client, args.setCode, allowVariantTypes, args.detail);
    printJson('preflight', pre.summary);

    if (pre.samples.length > 0) {
      printJson('preflight_samples', pre.samples);
    }

  const pairCounts = await getPairCounts(client, args.setCode, allowVariantTypes);
  printJson('pair_counts', pairCounts);

  if (Number(pairCounts.ambiguous_printing_children) > 0) {
    pre.stops.push(`ambiguous_printing_children=${pairCounts.ambiguous_printing_children}`);
  }

    let insertedPrintings = Number(pairCounts.would_insert_printings);
    let insertedPrintingMappings = Number(pairCounts.would_insert_printing_mappings);

    if (pre.stops.length > 0) {
      const summary = {
        set: args.setCode,
        raw_cards: Number(pre.summary.tk_rows),
        matched_ok: Number(pre.summary.unique_ok),
        inserted_printings: mode === 'apply' ? 0 : insertedPrintings,
        inserted_printing_mappings: mode === 'apply' ? 0 : insertedPrintingMappings,
        skipped_existing: Number(pairCounts.existing_printings) + Number(pairCounts.existing_printing_mappings),
        stops: pre.stops,
      };
      printJson('summary', summary);
      return;
    }

    if (mode === 'apply') {
      const applyRes = await runApply(client, args.setCode, allowVariantTypes);
      insertedPrintings = applyRes.insertedPrintings;
      insertedPrintingMappings = applyRes.insertedPrintingMappings;
      printJson('apply', applyRes);
    }

    const summary = {
      set: args.setCode,
      raw_cards: Number(pre.summary.tk_rows),
      matched_ok: Number(pre.summary.unique_ok),
      inserted_printings: insertedPrintings,
      inserted_printing_mappings: insertedPrintingMappings,
      skipped_existing: Number(pairCounts.existing_printings) + Number(pairCounts.existing_printing_mappings),
      stops: [],
    };
    printJson('summary', summary);

    if (mode === 'apply') {
      const verifyRes = await verify(client, args.setCode);
      printJson('verify', verifyRes);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(`fatal error=${err.message}`);
  process.exit(1);
});
