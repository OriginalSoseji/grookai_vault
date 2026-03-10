import dotenv from 'dotenv';
import pg from 'pg';

const { Pool } = pg;

dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || '.env.local',
  quiet: true,
});

const MANUAL_PLAYBOOK = 'docs/playbooks/SET_REPAIR_PROTOCOL_V1.md';

const SQL_SNIPPETS = {
  suffixOrOther: `
WITH missing AS (
  SELECT (ri.payload->>'_external_id') AS external_id, (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
)
SELECT external_id, local_id
FROM missing
WHERE NOT (local_id ~ '^\\d+$' OR local_id ~ '^TG\\d+$');
`.trim(),
  tgRouting: `
WITH missing_tg AS (
  SELECT (ri.payload->>'_external_id') AS external_id, (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
    AND (ri.payload->'card'->>'localId') ~ '^TG\\d+$'
)
SELECT mt.external_id, mt.local_id, cp.id AS card_print_id
FROM missing_tg mt
JOIN public.sets s ON s.code=$2
LEFT JOIN public.card_prints cp ON cp.set_id=s.id AND cp.number=mt.local_id;
`.trim(),
  rcLane: `
SELECT cp.id, cp.number, COALESCE(cp.variant_key,'') AS variant_key
FROM public.card_prints cp
JOIN public.sets s ON s.id=cp.set_id
WHERE s.code=$1
  AND cp.number ~ '^RC[0-9]+$'
  AND COALESCE(cp.variant_key,'')='';
`.trim(),
  numericJoin: `
WITH missing_numeric AS (
  SELECT (ri.payload->>'_external_id') AS external_id, (ri.payload->'card'->>'localId') AS local_id
  FROM public.raw_imports ri
  WHERE ri.source='tcgdex'
    AND ri.payload->>'_kind'='card'
    AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id')=$1
    AND (ri.payload->'card'->>'localId') ~ '^\\d+$'
),
canon AS (
  SELECT cp.id, cp.number_plain
  FROM public.card_prints cp
  JOIN public.sets s ON s.id=cp.set_id
  WHERE s.code=$1
    AND cp.number_plain ~ '^\\d+$'
    AND COALESCE(cp.variant_key,'')=''
)
SELECT mn.external_id, COUNT(c.id) AS candidate_count
FROM missing_numeric mn
LEFT JOIN canon c ON mn.local_id::int = c.number_plain::int
GROUP BY mn.external_id;
`.trim(),
  imageContamination: `
SELECT cp.id, cp.number, cp.image_url
FROM public.card_prints cp
JOIN public.sets s ON s.id=cp.set_id
WHERE s.code=$1
  AND cp.number_plain ~ '^\\d+$'
  AND cp.image_url ILIKE '%/TG%';
`.trim(),
};

function parseBooleanValue(raw, defaultValue) {
  if (raw === undefined) return defaultValue;
  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function parseArgs(argv) {
  const opts = {
    setCode: null,
    allAutoSafe: false,
    dryRun: true,
    apply: false,
    limit: null,
    includeReverse: true,
    includeTgRouting: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--set') {
      opts.setCode = (argv[i + 1] || '').trim();
      i += 1;
    } else if (arg === '--all-auto-safe') {
      opts.allAutoSafe = true;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
      opts.apply = false;
    } else if (arg === '--apply') {
      opts.apply = true;
      opts.dryRun = false;
    } else if (arg === '--limit') {
      const parsed = parseInt(argv[i + 1], 10);
      opts.limit = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
      i += 1;
    } else if (arg === '--include-reverse') {
      opts.includeReverse = parseBooleanValue(argv[i + 1], true);
      i += 1;
    } else if (arg === '--include-tg-routing') {
      opts.includeTgRouting = parseBooleanValue(argv[i + 1], true);
      i += 1;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }

  return opts;
}

function printUsage() {
  console.log('Usage:');
  console.log('  node backend/tools/set_repair_runner.mjs --set <code> --dry-run');
  console.log('  node backend/tools/set_repair_runner.mjs --set <code> --apply');
  console.log('  node backend/tools/set_repair_runner.mjs --all-auto-safe --dry-run [--limit 10]');
  console.log('  node backend/tools/set_repair_runner.mjs --all-auto-safe --apply [--limit 10]');
  console.log('Optional flags:');
  console.log('  --include-reverse <true|false> (default true)');
  console.log('  --include-tg-routing <true|false> (default true)');
}

function ensureCliValidity(opts) {
  if (opts.help) {
    printUsage();
    process.exit(0);
  }
  if (!opts.setCode && !opts.allAutoSafe) {
    throw new Error('Must provide --set <code> or --all-auto-safe.');
  }
  if (opts.setCode && opts.allAutoSafe) {
    throw new Error('Use either --set <code> or --all-auto-safe, not both.');
  }
}

function logHeader(title) {
  console.log(`\n=== ${title} ===`);
}

function printKeyValues(prefix, entries) {
  const chunks = Object.entries(entries).map(([k, v]) => `${k}=${v}`);
  console.log(`${prefix} ${chunks.join(' ')}`);
}

async function getConnectionInfo(client) {
  const { rows } = await client.query(`
    select
      current_database() as db_name,
      inet_server_addr()::text as server_addr,
      inet_server_port() as server_port,
      current_user as db_user
  `);
  return rows[0];
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `select to_regclass($1) is not null as exists`,
    [`public.${tableName}`],
  );
  return rows[0]?.exists === true;
}

async function getFeatureFlags(client) {
  const [
    hasExternalPrintingMappings,
    hasCardPrintings,
    hasFinishKeys,
    hasAdminCheckpoints,
  ] = await Promise.all([
    tableExists(client, 'external_printing_mappings'),
    tableExists(client, 'card_printings'),
    tableExists(client, 'finish_keys'),
    tableExists(client, 'admin_change_checkpoints'),
  ]);

  return {
    hasExternalPrintingMappings,
    hasCardPrintings,
    hasFinishKeys,
    hasAdminCheckpoints,
  };
}

function coverageV2Sql(hasExternalPrintingMappings) {
  if (hasExternalPrintingMappings) {
    return `
      WITH raws AS (
        SELECT DISTINCT (ri.payload->>'_external_id') AS external_id
        FROM public.raw_imports ri
        WHERE ri.source = 'tcgdex'
          AND ri.payload->>'_kind' = 'card'
          AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
          AND ri.payload ? '_external_id'
      ),
      coverage AS (
        SELECT
          r.external_id,
          EXISTS (
            SELECT 1
            FROM public.external_mappings em
            WHERE em.source = 'tcgdex'
              AND em.external_id = r.external_id
          ) AS has_canon,
          EXISTS (
            SELECT 1
            FROM public.external_printing_mappings epm
            WHERE epm.source = 'tcgdex'
              AND epm.external_id = r.external_id
          ) AS has_printing
        FROM raws r
      )
      SELECT
        COUNT(*)::int AS raw_cards,
        COUNT(*) FILTER (WHERE has_canon)::int AS mapped_canon,
        COUNT(*) FILTER (WHERE has_printing)::int AS mapped_printing,
        COUNT(*) FILTER (WHERE NOT has_canon AND NOT has_printing)::int AS still_unmapped
      FROM coverage
    `;
  }

  return `
    WITH raws AS (
      SELECT DISTINCT (ri.payload->>'_external_id') AS external_id
      FROM public.raw_imports ri
      WHERE ri.source = 'tcgdex'
        AND ri.payload->>'_kind' = 'card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
        AND ri.payload ? '_external_id'
    ),
    coverage AS (
      SELECT
        r.external_id,
        EXISTS (
          SELECT 1
          FROM public.external_mappings em
          WHERE em.source = 'tcgdex'
            AND em.external_id = r.external_id
        ) AS has_canon
      FROM raws r
    )
    SELECT
      COUNT(*)::int AS raw_cards,
      COUNT(*) FILTER (WHERE has_canon)::int AS mapped_canon,
      0::int AS mapped_printing,
      COUNT(*) FILTER (WHERE NOT has_canon)::int AS still_unmapped
    FROM coverage
  `;
}

function missingShapesSql(hasExternalPrintingMappings) {
  if (hasExternalPrintingMappings) {
    return `
      WITH raws AS (
        SELECT DISTINCT
          (ri.payload->>'_external_id') AS external_id,
          (ri.payload->'card'->>'localId') AS local_id
        FROM public.raw_imports ri
        WHERE ri.source = 'tcgdex'
          AND ri.payload->>'_kind' = 'card'
          AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
          AND ri.payload ? '_external_id'
      ),
      missing AS (
        SELECT r.external_id, r.local_id
        FROM raws r
        LEFT JOIN public.external_mappings em
          ON em.source = 'tcgdex'
         AND em.external_id = r.external_id
        LEFT JOIN public.external_printing_mappings epm
          ON epm.source = 'tcgdex'
         AND epm.external_id = r.external_id
        WHERE em.external_id IS NULL
          AND epm.external_id IS NULL
      )
      SELECT
        COUNT(*) FILTER (WHERE local_id ~ '^\\d+$')::int AS missing_numeric,
        COUNT(*) FILTER (WHERE local_id ~ '^TG\\d+$')::int AS missing_tg,
        COUNT(*) FILTER (WHERE local_id ~ '^\\d+[a-z]+$')::int AS missing_suffix,
        COUNT(*) FILTER (
          WHERE NOT (local_id ~ '^\\d+$' OR local_id ~ '^TG\\d+$' OR local_id ~ '^\\d+[a-z]+$')
        )::int AS missing_other
      FROM missing
    `;
  }

  return `
    WITH raws AS (
      SELECT DISTINCT
        (ri.payload->>'_external_id') AS external_id,
        (ri.payload->'card'->>'localId') AS local_id
      FROM public.raw_imports ri
      WHERE ri.source = 'tcgdex'
        AND ri.payload->>'_kind' = 'card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
        AND ri.payload ? '_external_id'
    ),
    missing AS (
      SELECT r.external_id, r.local_id
      FROM raws r
      LEFT JOIN public.external_mappings em
        ON em.source = 'tcgdex'
       AND em.external_id = r.external_id
      WHERE em.external_id IS NULL
    )
    SELECT
      COUNT(*) FILTER (WHERE local_id ~ '^\\d+$')::int AS missing_numeric,
      COUNT(*) FILTER (WHERE local_id ~ '^TG\\d+$')::int AS missing_tg,
      COUNT(*) FILTER (WHERE local_id ~ '^\\d+[a-z]+$')::int AS missing_suffix,
      COUNT(*) FILTER (
        WHERE NOT (local_id ~ '^\\d+$' OR local_id ~ '^TG\\d+$' OR local_id ~ '^\\d+[a-z]+$')
      )::int AS missing_other
    FROM missing
  `;
}

function missingRowsByLaneSql(hasExternalPrintingMappings, lanePredicateSql) {
  if (hasExternalPrintingMappings) {
    return `
      WITH raws AS (
        SELECT DISTINCT
          (ri.payload->>'_external_id') AS external_id,
          (ri.payload->'card'->>'localId') AS local_id
        FROM public.raw_imports ri
        WHERE ri.source = 'tcgdex'
          AND ri.payload->>'_kind' = 'card'
          AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
          AND ri.payload ? '_external_id'
      ),
      missing AS (
        SELECT r.external_id, r.local_id
        FROM raws r
        LEFT JOIN public.external_mappings em
          ON em.source = 'tcgdex'
         AND em.external_id = r.external_id
        LEFT JOIN public.external_printing_mappings epm
          ON epm.source = 'tcgdex'
         AND epm.external_id = r.external_id
        WHERE em.external_id IS NULL
          AND epm.external_id IS NULL
      )
      SELECT external_id, local_id
      FROM missing
      WHERE ${lanePredicateSql}
      ORDER BY local_id, external_id
    `;
  }

  return `
    WITH raws AS (
      SELECT DISTINCT
        (ri.payload->>'_external_id') AS external_id,
        (ri.payload->'card'->>'localId') AS local_id
      FROM public.raw_imports ri
      WHERE ri.source = 'tcgdex'
        AND ri.payload->>'_kind' = 'card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
        AND ri.payload ? '_external_id'
    ),
    missing AS (
      SELECT r.external_id, r.local_id
      FROM raws r
      LEFT JOIN public.external_mappings em
        ON em.source = 'tcgdex'
       AND em.external_id = r.external_id
      WHERE em.external_id IS NULL
    )
    SELECT external_id, local_id
    FROM missing
    WHERE ${lanePredicateSql}
    ORDER BY local_id, external_id
  `;
}

async function getCoverage(client, setCode, features) {
  const { rows } = await client.query(coverageV2Sql(features.hasExternalPrintingMappings), [setCode]);
  return rows[0] || {
    raw_cards: 0,
    mapped_canon: 0,
    mapped_printing: 0,
    still_unmapped: 0,
  };
}

async function getMissingShapes(client, setCode, features) {
  const { rows } = await client.query(missingShapesSql(features.hasExternalPrintingMappings), [setCode]);
  return rows[0] || {
    missing_numeric: 0,
    missing_tg: 0,
    missing_suffix: 0,
    missing_other: 0,
  };
}

async function getLaneSamples(client, setCode, features) {
  const [suffixRows, otherRows] = await Promise.all([
    client.query(
      `${missingRowsByLaneSql(features.hasExternalPrintingMappings, "local_id ~ '^\\d+[a-z]+$'")} LIMIT 10`,
      [setCode],
    ),
    client.query(
      `${missingRowsByLaneSql(features.hasExternalPrintingMappings, "NOT (local_id ~ '^\\d+$' OR local_id ~ '^TG\\d+$' OR local_id ~ '^\\d+[a-z]+$')")} LIMIT 10`,
      [setCode],
    ),
  ]);

  return {
    suffixRows: suffixRows.rows,
    otherRows: otherRows.rows,
  };
}

async function getRcRisk(client, setCode) {
  const { rows } = await client.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE cp.number ~ '^RC[0-9]+$')::int AS has_rc_prefix_rows,
      COUNT(*) FILTER (WHERE cp.number ~ '^RC[0-9]+$' AND COALESCE(cp.variant_key, '') = '')::int AS rc_blank_variant_count
    FROM public.card_prints cp
    JOIN public.sets s ON s.id = cp.set_id
    WHERE s.code = $1
  `,
    [setCode],
  );
  return rows[0] || { has_rc_prefix_rows: 0, rc_blank_variant_count: 0 };
}

async function getNumericJoinStats(client, setCode, features) {
  const { rows } = await client.query(
    `
    WITH missing_numeric AS (
      ${missingRowsByLaneSql(features.hasExternalPrintingMappings, "local_id ~ '^\\d+$'")}
    ),
    canon AS (
      SELECT cp.id AS card_print_id, cp.number_plain
      FROM public.card_prints cp
      JOIN public.sets s ON s.id = cp.set_id
      WHERE s.code = $1
        AND cp.number_plain ~ '^\\d+$'
        AND COALESCE(cp.variant_key, '') = ''
    ),
    matches AS (
      SELECT mn.external_id, mn.local_id, c.card_print_id
      FROM missing_numeric mn
      JOIN canon c ON mn.local_id::int = c.number_plain::int
    ),
    candidate_counts AS (
      SELECT mn.external_id, COUNT(m.card_print_id)::int AS candidate_count
      FROM missing_numeric mn
      LEFT JOIN matches m ON m.external_id = mn.external_id
      GROUP BY mn.external_id
    )
    SELECT
      COUNT(*)::int AS total_missing_numeric,
      COUNT(*) FILTER (WHERE candidate_count = 1)::int AS unique_match_count,
      COUNT(*) FILTER (WHERE candidate_count = 0)::int AS unmatched_count,
      COUNT(*) FILTER (WHERE candidate_count > 1)::int AS ambiguous_count
    FROM candidate_counts
  `,
    [setCode],
  );
  return rows[0] || {
    total_missing_numeric: 0,
    unique_match_count: 0,
    unmatched_count: 0,
    ambiguous_count: 0,
  };
}

async function getTgStats(client, setCode, features) {
  const tgSetCode = `${setCode}tg`;
  const { rows } = await client.query(
    `
    WITH subset AS (
      SELECT id FROM public.sets WHERE code = $2
    ),
    missing_tg AS (
      ${missingRowsByLaneSql(features.hasExternalPrintingMappings, "local_id ~ '^TG\\d+$'")}
    ),
    tg_candidates AS (
      SELECT cp.id AS card_print_id, cp.number
      FROM public.card_prints cp
      JOIN subset ss ON ss.id = cp.set_id
      WHERE cp.number ~ '^TG\\d+$'
    ),
    tg_matches AS (
      SELECT mt.external_id, mt.local_id, tc.card_print_id
      FROM missing_tg mt
      JOIN tg_candidates tc ON tc.number = mt.local_id
    ),
    tg_candidate_counts AS (
      SELECT mt.external_id, COUNT(tm.card_print_id)::int AS candidate_count
      FROM missing_tg mt
      LEFT JOIN tg_matches tm ON tm.external_id = mt.external_id
      GROUP BY mt.external_id
    )
    SELECT
      EXISTS (SELECT 1 FROM subset) AS has_tg_subset_set,
      EXISTS (SELECT 1 FROM tg_candidates) AS tg_prints_present,
      COALESCE((SELECT COUNT(*)::int FROM missing_tg), 0) AS total_missing_tg,
      COALESCE((SELECT COUNT(*)::int FROM tg_candidate_counts WHERE candidate_count = 1), 0) AS unique_match_count,
      COALESCE((SELECT COUNT(*)::int FROM tg_candidate_counts WHERE candidate_count = 0), 0) AS unmatched_count,
      COALESCE((SELECT COUNT(*)::int FROM tg_candidate_counts WHERE candidate_count > 1), 0) AS ambiguous_count
  `,
    [setCode, tgSetCode],
  );

  return rows[0] || {
    has_tg_subset_set: false,
    tg_prints_present: false,
    total_missing_tg: 0,
    unique_match_count: 0,
    unmatched_count: 0,
    ambiguous_count: 0,
  };
}

async function getFinishKeyReverseExists(client) {
  const { rows } = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM public.finish_keys fk
      WHERE to_jsonb(fk) @> '{"finish_key":"reverse"}'::jsonb
         OR to_jsonb(fk) @> '{"key":"reverse"}'::jsonb
         OR to_jsonb(fk) @> '{"code":"reverse"}'::jsonb
         OR to_jsonb(fk) @> '{"name":"reverse"}'::jsonb
         OR to_jsonb(fk) @> '{"id":"reverse"}'::jsonb
    ) AS has_reverse
  `);
  return rows[0]?.has_reverse === true;
}

async function getReverseStats(client, setCode, features) {
  if (!features.hasCardPrintings || !features.hasFinishKeys) {
    return {
      reverse_candidate_count: 0,
      unique_match_count: 0,
      unmatched_count: 0,
      ambiguous_count: 0,
      would_insert_reverse_count: 0,
      has_reverse_finish_key: false,
    };
  }

  const hasReverseFinishKey = await getFinishKeyReverseExists(client);

  const { rows } = await client.query(
    `
    WITH reverse_numeric AS (
      SELECT DISTINCT
        (ri.payload->>'_external_id') AS external_id,
        (ri.payload->'card'->>'localId') AS local_id
      FROM public.raw_imports ri
      WHERE ri.source = 'tcgdex'
        AND ri.payload->>'_kind' = 'card'
        AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
        AND (ri.payload->'card'->>'localId') ~ '^\\d+$'
        AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
    ),
    canon AS (
      SELECT cp.id AS card_print_id, cp.number_plain
      FROM public.card_prints cp
      JOIN public.sets s ON s.id = cp.set_id
      WHERE s.code = $1
        AND cp.number_plain ~ '^\\d+$'
        AND COALESCE(cp.variant_key, '') = ''
    ),
    matches AS (
      SELECT rn.external_id, rn.local_id, c.card_print_id
      FROM reverse_numeric rn
      JOIN canon c ON rn.local_id::int = c.number_plain::int
    ),
    candidate_counts AS (
      SELECT rn.external_id, COUNT(m.card_print_id)::int AS candidate_count
      FROM reverse_numeric rn
      LEFT JOIN matches m ON m.external_id = rn.external_id
      GROUP BY rn.external_id
    ),
    unique_cards AS (
      SELECT m.card_print_id
      FROM matches m
      JOIN candidate_counts cc ON cc.external_id = m.external_id
      WHERE cc.candidate_count = 1
      GROUP BY m.card_print_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM reverse_numeric) AS reverse_candidate_count,
      (SELECT COUNT(*)::int FROM candidate_counts WHERE candidate_count = 1) AS unique_match_count,
      (SELECT COUNT(*)::int FROM candidate_counts WHERE candidate_count = 0) AS unmatched_count,
      (SELECT COUNT(*)::int FROM candidate_counts WHERE candidate_count > 1) AS ambiguous_count,
      (
        SELECT COUNT(*)::int
        FROM unique_cards uc
        LEFT JOIN public.card_printings cpn
          ON cpn.card_print_id = uc.card_print_id
         AND cpn.finish_key = 'reverse'
        WHERE cpn.card_print_id IS NULL
      ) AS would_insert_reverse_count
  `,
    [setCode],
  );

  return {
    ...(rows[0] || {
      reverse_candidate_count: 0,
      unique_match_count: 0,
      unmatched_count: 0,
      ambiguous_count: 0,
      would_insert_reverse_count: 0,
    }),
    has_reverse_finish_key: hasReverseFinishKey,
  };
}

async function getImageContaminationCount(client, setCode) {
  const { rows } = await client.query(
    `
    SELECT COUNT(*)::int AS contaminated_count
    FROM public.card_prints cp
    JOIN public.sets s ON s.id = cp.set_id
    WHERE s.code = $1
      AND cp.number_plain ~ '^\\d+$'
      AND cp.image_url ILIKE '%/TG%'
  `,
    [setCode],
  );
  return rows[0]?.contaminated_count ?? 0;
}

async function getSetExists(client, setCode) {
  const { rows } = await client.query(
    `SELECT EXISTS (SELECT 1 FROM public.sets WHERE code = $1) AS set_exists`,
    [setCode],
  );
  return rows[0]?.set_exists === true;
}

function makeStopReason(code, reason, sqlSnippet, manualSection) {
  return { code, reason, sqlSnippet, manualSection };
}

function printStopReasons(setCode, stopReasons) {
  for (const stop of stopReasons) {
    console.log(`STOP set=${setCode} code=${stop.code} reason="${stop.reason}"`);
    console.log(`STOP next=${MANUAL_PLAYBOOK} ${stop.manualSection}`);
    console.log('STOP sql_snippet:');
    console.log(stop.sqlSnippet);
  }
}

async function preflight(client, setCode, options, features) {
  const setExists = await getSetExists(client, setCode);
  if (!setExists) {
    return {
      setCode,
      setExists: false,
      coverage: { raw_cards: 0, mapped_canon: 0, mapped_printing: 0, still_unmapped: 0 },
      missing: { missing_numeric: 0, missing_tg: 0, missing_suffix: 0, missing_other: 0 },
      rcRisk: { has_rc_prefix_rows: 0, rc_blank_variant_count: 0 },
      tg: {
        has_tg_subset_set: false,
        tg_prints_present: false,
        total_missing_tg: 0,
        unique_match_count: 0,
        unmatched_count: 0,
        ambiguous_count: 0,
      },
      numeric: {
        total_missing_numeric: 0,
        unique_match_count: 0,
        unmatched_count: 0,
        ambiguous_count: 0,
      },
      reverse: {
        reverse_candidate_count: 0,
        unique_match_count: 0,
        unmatched_count: 0,
        ambiguous_count: 0,
        would_insert_reverse_count: 0,
        has_reverse_finish_key: false,
      },
      imageContaminationCount: 0,
      laneSamples: { suffixRows: [], otherRows: [] },
      stopReasons: [makeStopReason('set_not_found', `Set ${setCode} does not exist.`, 'SELECT id, code FROM public.sets WHERE code=$1;', '§3')],
    };
  }

  const coverage = await getCoverage(client, setCode, features);
  const missing = await getMissingShapes(client, setCode, features);
  const rcRisk = await getRcRisk(client, setCode);
  const tg = await getTgStats(client, setCode, features);
  const numeric = await getNumericJoinStats(client, setCode, features);
  const reverse = await getReverseStats(client, setCode, features);
  const imageContaminationCount = await getImageContaminationCount(client, setCode);
  const laneSamples = await getLaneSamples(client, setCode, features);

  const stopReasons = [];
  const isClosed = Number(coverage.still_unmapped) === 0;

  if (!isClosed) {
    if (Number(missing.missing_suffix) > 0) {
      stopReasons.push(
        makeStopReason(
          'suffix_lane_requires_manual',
          `Missing suffix lane rows found (${missing.missing_suffix}).`,
          SQL_SNIPPETS.suffixOrOther,
          '§9',
        ),
      );
    }

    if (Number(missing.missing_other) > 0) {
      stopReasons.push(
        makeStopReason(
          'other_lane_requires_manual',
          `Missing non-numeric/non-TG lane rows found (${missing.missing_other}).`,
          SQL_SNIPPETS.suffixOrOther,
          '§3',
        ),
      );
    }

    if (Number(rcRisk.rc_blank_variant_count) > 0) {
      stopReasons.push(
        makeStopReason(
          'rc_lane_unisolated',
          `RC prefix rows with blank variant_key found (${rcRisk.rc_blank_variant_count}).`,
          SQL_SNIPPETS.rcLane,
          '§5',
        ),
      );
    }

    if (Number(numeric.ambiguous_count) > 0) {
      stopReasons.push(
        makeStopReason(
          'numeric_mapping_ambiguous',
          `Numeric mapping ambiguity detected (${numeric.ambiguous_count}).`,
          SQL_SNIPPETS.numericJoin,
          '§7',
        ),
      );
    }

    if (Number(numeric.unmatched_count) > 0) {
      stopReasons.push(
        makeStopReason(
          'canon_gap_numeric',
          `Numeric canon gaps detected (${numeric.unmatched_count}); canon creation is out of scope.`,
          SQL_SNIPPETS.numericJoin,
          '§6',
        ),
      );
    }

    if (Number(missing.missing_tg) > 0) {
      if (!options.includeTgRouting) {
        stopReasons.push(
          makeStopReason(
            'tg_routing_disabled',
            `TG lane rows exist (${missing.missing_tg}) but --include-tg-routing is false.`,
            SQL_SNIPPETS.tgRouting,
            '§4',
          ),
        );
      } else {
        if (!tg.has_tg_subset_set) {
          stopReasons.push(
            makeStopReason(
              'tg_subset_missing',
              `TG lane rows exist (${missing.missing_tg}) but subset set ${setCode}tg is missing.`,
              SQL_SNIPPETS.tgRouting,
              '§4',
            ),
          );
        }
        if (!tg.tg_prints_present) {
          stopReasons.push(
            makeStopReason(
              'tg_subset_prints_missing',
              `TG lane rows exist (${missing.missing_tg}) but TG canonical prints are missing in ${setCode}tg.`,
              SQL_SNIPPETS.tgRouting,
              '§4',
            ),
          );
        }
        if (Number(tg.ambiguous_count) > 0) {
          stopReasons.push(
            makeStopReason(
              'tg_mapping_ambiguous',
              `TG mapping ambiguity detected (${tg.ambiguous_count}).`,
              SQL_SNIPPETS.tgRouting,
              '§4',
            ),
          );
        }
        if (Number(tg.unmatched_count) > 0) {
          stopReasons.push(
            makeStopReason(
              'tg_mapping_unmatched',
              `TG mapping gaps detected (${tg.unmatched_count}).`,
              SQL_SNIPPETS.tgRouting,
              '§4',
            ),
          );
        }
      }
    }

    if (options.includeReverse) {
      if (!features.hasCardPrintings || !features.hasFinishKeys) {
        stopReasons.push(
          makeStopReason(
            'reverse_tables_missing',
            'Reverse generation requested but card_printings/finish_keys table(s) are missing.',
            'SELECT to_regclass(\'public.card_printings\'), to_regclass(\'public.finish_keys\');',
            '§8',
          ),
        );
      } else if (!reverse.has_reverse_finish_key) {
        stopReasons.push(
          makeStopReason(
            'reverse_finish_key_missing',
            'Reverse finish key is missing in finish_keys.',
            'SELECT * FROM public.finish_keys WHERE to_jsonb(finish_keys) @> \'{"finish_key":"reverse"}\';',
            '§8',
          ),
        );
      } else {
        if (Number(reverse.ambiguous_count) > 0) {
          stopReasons.push(
            makeStopReason(
              'reverse_mapping_ambiguous',
              `Reverse candidate mapping ambiguity detected (${reverse.ambiguous_count}).`,
              SQL_SNIPPETS.numericJoin,
              '§8',
            ),
          );
        }
        if (Number(reverse.unmatched_count) > 0) {
          stopReasons.push(
            makeStopReason(
              'reverse_mapping_unmatched',
              `Reverse candidate canon gaps detected (${reverse.unmatched_count}).`,
              SQL_SNIPPETS.numericJoin,
              '§8',
            ),
          );
        }
      }
    }

    if (Number(imageContaminationCount) > 0) {
      stopReasons.push(
        makeStopReason(
          'image_contamination_requires_manual_repair',
          `Detected numeric-lane TG image contamination (${imageContaminationCount} rows).`,
          SQL_SNIPPETS.imageContamination,
          '§10',
        ),
      );
    }
  }

  const plan = {
    would_insert_external_mappings_count: Number(numeric.unique_match_count),
    would_insert_tg_mappings_count: options.includeTgRouting ? Number(tg.unique_match_count) : 0,
    would_create_reverse_printings_count: options.includeReverse ? Number(reverse.would_insert_reverse_count) : 0,
  };

  return {
    setCode,
    setExists: true,
    coverage,
    missing,
    rcRisk,
    tg,
    numeric,
    reverse,
    imageContaminationCount,
    laneSamples,
    plan,
    stopReasons,
  };
}

function numericMappingInsertSql(hasExternalPrintingMappings) {
  return `
    WITH missing_numeric AS (
      ${missingRowsByLaneSql(hasExternalPrintingMappings, "local_id ~ '^\\d+$'")}
    ),
    canon AS (
      SELECT cp.id AS card_print_id, cp.number_plain
      FROM public.card_prints cp
      JOIN public.sets s ON s.id = cp.set_id
      WHERE s.code = $1
        AND cp.number_plain ~ '^\\d+$'
        AND COALESCE(cp.variant_key, '') = ''
    ),
    candidates AS (
      SELECT mn.external_id, mn.local_id, c.card_print_id
      FROM missing_numeric mn
      JOIN canon c ON mn.local_id::int = c.number_plain::int
    ),
    unique_matches AS (
      SELECT external_id, (ARRAY_AGG(card_print_id))[1] AS card_print_id
      FROM candidates
      GROUP BY external_id
      HAVING COUNT(*) = 1
    )
    INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
    SELECT
      um.card_print_id,
      'tcgdex',
      um.external_id,
      true,
      now(),
      jsonb_build_object('runner', 'SET_REPAIR_RUNNER_V1', 'join', 'localId::int = number_plain::int')
    FROM unique_matches um
    ON CONFLICT (source, external_id) DO NOTHING
    RETURNING external_id
  `;
}

function tgMappingInsertSql(hasExternalPrintingMappings) {
  return `
    WITH subset AS (
      SELECT id FROM public.sets WHERE code = $2
    ),
    missing_tg AS (
      ${missingRowsByLaneSql(hasExternalPrintingMappings, "local_id ~ '^TG\\d+$'")}
    ),
    tg_candidates AS (
      SELECT cp.id AS card_print_id, cp.number
      FROM public.card_prints cp
      JOIN subset ss ON ss.id = cp.set_id
      WHERE cp.number ~ '^TG\\d+$'
    ),
    candidates AS (
      SELECT mt.external_id, mt.local_id, tc.card_print_id
      FROM missing_tg mt
      JOIN tg_candidates tc ON tc.number = mt.local_id
    ),
    unique_matches AS (
      SELECT external_id, (ARRAY_AGG(card_print_id))[1] AS card_print_id
      FROM candidates
      GROUP BY external_id
      HAVING COUNT(*) = 1
    )
    INSERT INTO public.external_mappings (card_print_id, source, external_id, active, synced_at, meta)
    SELECT
      um.card_print_id,
      'tcgdex',
      um.external_id,
      true,
      now(),
      jsonb_build_object(
        'runner', 'SET_REPAIR_RUNNER_V1',
        'routed_from_set', $1,
        'routed_to_set', $2,
        'lane', 'TG'
      )
    FROM unique_matches um
    ON CONFLICT (source, external_id) DO NOTHING
    RETURNING external_id
  `;
}

const REVERSE_INSERT_SQL = `
  WITH reverse_numeric AS (
    SELECT DISTINCT
      (ri.payload->>'_external_id') AS external_id,
      (ri.payload->'card'->>'localId') AS local_id
    FROM public.raw_imports ri
    WHERE ri.source = 'tcgdex'
      AND ri.payload->>'_kind' = 'card'
      AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') = $1
      AND (ri.payload->'card'->>'localId') ~ '^\\d+$'
      AND COALESCE((ri.payload->'card'->'variants'->>'reverse')::boolean, false) = true
  ),
  canon AS (
    SELECT cp.id AS card_print_id, cp.number_plain
    FROM public.card_prints cp
    JOIN public.sets s ON s.id = cp.set_id
    WHERE s.code = $1
      AND cp.number_plain ~ '^\\d+$'
      AND COALESCE(cp.variant_key, '') = ''
  ),
  candidates AS (
    SELECT rn.external_id, rn.local_id, c.card_print_id
    FROM reverse_numeric rn
    JOIN canon c ON rn.local_id::int = c.number_plain::int
  ),
  unique_external AS (
    SELECT external_id
    FROM candidates
    GROUP BY external_id
    HAVING COUNT(*) = 1
  ),
  unique_cards AS (
    SELECT DISTINCT c.card_print_id
    FROM candidates c
    JOIN unique_external ue ON ue.external_id = c.external_id
  )
  INSERT INTO public.card_printings (card_print_id, finish_key)
  SELECT uc.card_print_id, 'reverse'
  FROM unique_cards uc
  ON CONFLICT DO NOTHING
  RETURNING card_print_id
`;

async function maybeInsertCheckpoint(client, setCode, mode, features) {
  if (!features.hasAdminCheckpoints) return;

  try {
    const { rows } = await client.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name='admin_change_checkpoints'
      ORDER BY ordinal_position
    `,
    );

    const columns = new Set(rows.map((r) => r.column_name));
    const label = `SET_REPAIR_RUNNER_V1:${setCode}:${mode}`;
    const insertCols = [];
    const placeholders = [];
    const values = [];
    let idx = 1;

    const pushCol = (col, val) => {
      if (!columns.has(col)) return;
      insertCols.push(col);
      placeholders.push(`$${idx}`);
      values.push(val);
      idx += 1;
    };

    pushCol('label', label);
    pushCol('notes', 'SET_REPAIR_RUNNER_V1 checkpoint');
    pushCol('meta', JSON.stringify({ set_code: setCode, mode }));
    pushCol('source', 'SET_REPAIR_RUNNER_V1');
    pushCol('set_code', setCode);
    pushCol('dry_run', mode === 'dry');
    pushCol('created_at', new Date().toISOString());
    pushCol('updated_at', new Date().toISOString());

    if (!insertCols.includes('label')) return;

    const sql = `INSERT INTO public.admin_change_checkpoints (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await client.query(sql, values);
  } catch {
    // Skip silently by requirement.
  }
}

async function applySet(client, setCode, options, features) {
  await client.query('BEGIN');

  try {
    const insertedExternal = await client.query(numericMappingInsertSql(features.hasExternalPrintingMappings), [setCode]);
    let insertedTg = { rowCount: 0 };
    if (options.includeTgRouting) {
      insertedTg = await client.query(tgMappingInsertSql(features.hasExternalPrintingMappings), [setCode, `${setCode}tg`]);
    }

    let insertedReverse = { rowCount: 0 };
    if (options.includeReverse && features.hasCardPrintings && features.hasFinishKeys) {
      insertedReverse = await client.query(REVERSE_INSERT_SQL, [setCode]);
    }

    const postCoverage = await getCoverage(client, setCode, features);
    if (Number(postCoverage.still_unmapped) !== 0) {
      throw new Error(`post_coverage_still_unmapped=${postCoverage.still_unmapped}`);
    }

    const contaminationCount = await getImageContaminationCount(client, setCode);
    if (Number(contaminationCount) > 0) {
      throw new Error(`image_contamination_requires_manual_repair=${contaminationCount}`);
    }

    await maybeInsertCheckpoint(client, setCode, 'apply', features);
    await client.query('COMMIT');

    return {
      inserted_external_mappings_count: insertedExternal.rowCount ?? 0,
      inserted_tg_mappings_count: insertedTg.rowCount ?? 0,
      inserted_reverse_printings_count: insertedReverse.rowCount ?? 0,
      post_still_unmapped: Number(postCoverage.still_unmapped),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
}

async function processOneSet(client, setCode, options, features) {
  logHeader(`set=${setCode}`);
  const pre = await preflight(client, setCode, options, features);

  printKeyValues('preflight', {
    still_unmapped: Number(pre.coverage.still_unmapped),
    missing_numeric: Number(pre.missing.missing_numeric),
    missing_tg: Number(pre.missing.missing_tg),
    missing_suffix: Number(pre.missing.missing_suffix),
    missing_other: Number(pre.missing.missing_other),
    has_tg_subset_set: Number(pre.missing.missing_tg) > 0 ? Boolean(pre.tg.has_tg_subset_set) : 'n/a',
    tg_prints_present: Number(pre.missing.missing_tg) > 0 ? Boolean(pre.tg.tg_prints_present) : 'n/a',
    has_rc_prefix_rows: Number(pre.rcRisk.has_rc_prefix_rows),
    rc_blank_variant_count: Number(pre.rcRisk.rc_blank_variant_count),
  });

  printKeyValues('plan', {
    would_insert_external_mappings_count: pre.plan.would_insert_external_mappings_count,
    would_insert_tg_mappings_count: pre.plan.would_insert_tg_mappings_count,
    would_create_reverse_printings_count: pre.plan.would_create_reverse_printings_count,
  });

  if (!pre.setExists) {
    printStopReasons(setCode, pre.stopReasons);
    return { status: 'stopped', preflight: pre };
  }

  if (Number(pre.coverage.still_unmapped) === 0) {
    console.log(`status set=${setCode} CLOSED still_unmapped=0 mode=${options.apply ? 'apply' : 'dry-run'} no_writes`);
    await maybeInsertCheckpoint(client, setCode, options.apply ? 'apply' : 'dry', features);
    return { status: 'closed', preflight: pre };
  }

  if (pre.stopReasons.length > 0) {
    printStopReasons(setCode, pre.stopReasons);
    if (pre.laneSamples.suffixRows.length > 0) {
      console.log(`STOP suffix_examples=${JSON.stringify(pre.laneSamples.suffixRows)}`);
    }
    if (pre.laneSamples.otherRows.length > 0) {
      console.log(`STOP other_examples=${JSON.stringify(pre.laneSamples.otherRows)}`);
    }
    return { status: 'stopped', preflight: pre };
  }

  if (!options.apply) {
    await maybeInsertCheckpoint(client, setCode, 'dry', features);
    console.log(`status set=${setCode} dry-run auto-safe`);
    return { status: 'dry-ok', preflight: pre };
  }

  const applyResult = await applySet(client, setCode, options, features);
  printKeyValues('apply', applyResult);
  console.log(`status set=${setCode} apply-ok`);
  return { status: 'apply-ok', preflight: pre, apply: applyResult };
}

async function getAllTcgdexSetCodes(client) {
  const { rows } = await client.query(`
    SELECT DISTINCT COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') AS set_code
    FROM public.raw_imports ri
    WHERE ri.source = 'tcgdex'
      AND ri.payload->>'_kind' = 'card'
      AND COALESCE(ri.payload->>'_set_external_id', ri.payload->>'set_external_id') IS NOT NULL
    ORDER BY set_code
  `);
  return rows.map((r) => r.set_code).filter((v) => !!v);
}

async function runAllAutoSafe(client, options, features) {
  const setCodes = await getAllTcgdexSetCodes(client);
  let processed = 0;
  let examined = 0;

  for (const setCode of setCodes) {
    if (options.limit && processed >= options.limit) break;
    examined += 1;

    const pre = await preflight(client, setCode, options, features);
    const hasWork = Number(pre.coverage.still_unmapped) > 0;
    const safe = hasWork && pre.stopReasons.length === 0;

    if (!safe) {
      if (hasWork) {
        console.log(`skip set=${setCode} reason=not_auto_safe still_unmapped=${pre.coverage.still_unmapped}`);
      }
      continue;
    }

    await processOneSet(client, setCode, options, features);
    processed += 1;
  }

  printKeyValues('all-auto-safe', {
    examined_sets: examined,
    processed_sets: processed,
    mode: options.apply ? 'apply' : 'dry-run',
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  ensureCliValidity(opts);

  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL (or SUPABASE_DB_URL) is required.');
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const conn = await getConnectionInfo(client);
    printKeyValues('connection', {
      database: conn.db_name ?? 'unknown',
      server_addr: conn.server_addr ?? 'unknown',
      server_port: conn.server_port ?? 'unknown',
      db_user: conn.db_user ?? 'unknown',
      mode: opts.apply ? 'apply' : 'dry-run',
    });

    const features = await getFeatureFlags(client);
    printKeyValues('features', {
      external_printing_mappings: features.hasExternalPrintingMappings,
      card_printings: features.hasCardPrintings,
      finish_keys: features.hasFinishKeys,
      admin_change_checkpoints: features.hasAdminCheckpoints,
      include_reverse: opts.includeReverse,
      include_tg_routing: opts.includeTgRouting,
    });

    if (opts.allAutoSafe) {
      await runAllAutoSafe(client, opts, features);
    } else {
      await processOneSet(client, opts.setCode, opts, features);
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
