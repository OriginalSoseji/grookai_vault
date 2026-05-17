import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const requireFromBackend = createRequire(path.join(ROOT, 'backend', 'package.json'));
const dotenv = requireFromBackend('dotenv');
const pg = requireFromBackend('pg');

for (const envPath of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, envPath), override: false });
}

const OUT_DIR = path.join(ROOT, 'docs', 'plans', 'pokemon_db_remediation_v1');
const MATRIX_PATH = path.join(OUT_DIR, 'set_alias_prewrite_evidence_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'set_alias_prewrite_evidence_20260517.md');
const SOURCE_MATRIX_PATH = path.join(OUT_DIR, 'set_alias_write_plan_matrix_20260517.json');

const ALIAS_PAIRS = [
  ['151', 'sv03.5', 'sv3pt5'],
  ['black bolt', 'sv10.5b', 'zsv10pt5'],
  ['champions path', 'swsh3.5', 'swsh35'],
  ['crown zenith', 'swsh12.5', 'swsh12pt5'],
  ['dragon majesty', 'sm75', 'sm7.5'],
  ['heartgold soulsilver promos', 'hsp', 'hgssp'],
  ['journey together', 'sv09', 'sv9'],
  ['legendary collection', 'base6', 'lc'],
  ['mega evolution', 'me01', 'me1'],
  ['obsidian flames', 'sv03', 'sv3'],
  ['paradox rift', 'sv04', 'sv4'],
  ['phantasmal flames', 'me02', 'me2'],
  ['scarlet and violet', 'sv01', 'sv1'],
  ['shining fates', 'swsh4.5', 'swsh45'],
  ['shining legends', 'sm3.5', 'sm35'],
  ['stellar crown', 'sv07', 'sv7'],
  ['surging sparks', 'sv08', 'sv8'],
  ['temporal forces', 'sv05', 'sv5'],
  ['twilight masquerade', 'sv06', 'sv6'],
  ['white flare', 'sv10.5w', 'rsv10pt5'],
].map(([nameKey, canonicalCode, aliasCode]) => ({
  nameKey,
  canonicalCode,
  aliasCode,
}));

const EXCLUDED_CODES = new Set([
  'bog',
  'bp',
  'tk-ex-m',
  'tk2b',
  'tk-ex-p',
  'tk2a',
  'tk-ex-latia',
  'tk1a',
  'tk-ex-latio',
  'tk1b',
  'sv04.5',
  'sv4pt5',
  'pgo',
  'swsh10.5',
  'sv08.5',
  'sv8pt5',
  'sv06.5',
  'sv6pt5',
]);

const METADATA_FIELDS = [
  'release_date',
  'printed_total',
  'printed_set_abbrev',
  'logo_url',
  'symbol_url',
  'hero_image_url',
  'hero_image_source',
  'identity_domain_default',
  'identity_model',
  'source',
];

const REQUIRED_CLASSIFICATION_COLUMNS = [
  'set_code',
  'is_canon',
  'canonical_set_code',
  'pokemonapi_set_id',
  'tcgdex_set_id',
  'tcgdex_asset_code',
];

const CODE_COLUMN_NAMES = [
  'set_code',
  'canonical_set_code',
  'db_set_code',
  'source_set_code',
  'target_set_code',
];

function quoteIdent(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error(`Unsafe identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

function normalizeName(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function present(value) {
  return value !== null && value !== undefined && value !== '';
}

function stableValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function sum(rows, field = 'rows') {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function rowsBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function table(entries) {
  if (!entries.length) return '_None._\n';
  const [headers, ...rows] = entries;
  const line = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => {
    return `| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`;
  });
  return `${[line, sep, ...body].join('\n')}\n`;
}

function gate(status, evidence, severity = status === 'FAIL' ? 'BLOCKER' : 'INFO') {
  return { status, severity, evidence };
}

function assertAliasScope() {
  if (ALIAS_PAIRS.length !== 20) {
    throw new Error(`Expected 20 alias pairs, found ${ALIAS_PAIRS.length}.`);
  }
  for (const pair of ALIAS_PAIRS) {
    if (EXCLUDED_CODES.has(pair.canonicalCode) || EXCLUDED_CODES.has(pair.aliasCode)) {
      throw new Error(`Excluded review/hard-stop code leaked into prewrite evidence: ${pair.canonicalCode}/${pair.aliasCode}`);
    }
  }
}

async function assertSourceMatrixStillMatches() {
  const raw = await fs.readFile(SOURCE_MATRIX_PATH, 'utf8');
  const sourceRows = JSON.parse(raw);
  const expected = new Set(ALIAS_PAIRS.map((pair) => `${pair.canonicalCode}->${pair.aliasCode}`));
  const actual = new Set(sourceRows.map((row) => `${row.canonical_target_row}->${row.permanent_alias_row}`));

  for (const key of expected) {
    if (!actual.has(key)) throw new Error(`Source write-plan matrix is missing ${key}.`);
  }
  for (const key of actual) {
    if (!expected.has(key)) throw new Error(`Source write-plan matrix has unexpected pair ${key}.`);
  }
}

async function tableExists(client, tableName) {
  const { rows } = await client.query(
    `
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = $1
      limit 1
    `,
    [tableName],
  );
  return rows.length > 0;
}

async function fetchColumns(client, tableName) {
  const { rows } = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
        and table_name = $1
      order by ordinal_position
    `,
    [tableName],
  );
  return rows.map((row) => row.column_name);
}

async function countBySetId(client, tableName, columnName, setIds) {
  if (!setIds.length) return [];
  const sql = `
    select ${quoteIdent(columnName)}::text as set_id, count(*)::int as rows
    from public.${quoteIdent(tableName)}
    where ${quoteIdent(columnName)} = any($1::uuid[])
    group by ${quoteIdent(columnName)}
  `;
  return (await client.query(sql, [setIds])).rows;
}

async function countByCodeColumn(client, tableName, columnName, codes) {
  const sql = `
    select lower(${quoteIdent(columnName)}::text) as code, count(*)::int as rows
    from public.${quoteIdent(tableName)}
    where lower(${quoteIdent(columnName)}::text) = any($1::text[])
    group by lower(${quoteIdent(columnName)}::text)
  `;
  return (await client.query(sql, [codes.map((code) => code.toLowerCase())])).rows;
}

function discoverLocalCodeHits(codes) {
  const fsSync = requireFromBackend('fs');
  const roots = ['apps', 'backend', 'lib', 'scripts', 'supabase'];
  const skip = new Set(['node_modules', '.git', '.cache', '.next', 'build', '.dart_tool']);
  const extensions = new Set(['.dart', '.ts', '.tsx', '.js', '.mjs', '.sql', '.ps1', '.py', '.md']);
  const hits = new Map(codes.map((code) => [code, []]));

  function walk(dir) {
    let entries = [];
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const relative = path.relative(ROOT, full).replace(/\\/g, '/');
      if (relative === 'scripts/audits/set_alias_prewrite_evidence_v1.mjs') continue;
      if (!extensions.has(path.extname(entry.name))) continue;
      let body = '';
      try {
        body = fsSync.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      for (const code of codes) {
        if (body.includes(code)) hits.get(code).push(relative);
      }
    }
  }

  for (const root of roots) walk(path.join(ROOT, root));
  return hits;
}

function compareMetadata(canonicalSet, aliasSet) {
  return METADATA_FIELDS.map((field) => {
    const canonicalValue = stableValue(canonicalSet[field]);
    const aliasValue = stableValue(aliasSet[field]);
    if (!present(aliasValue)) {
      return { field, status: 'NO_ALIAS_VALUE', canonicalValue, aliasValue };
    }
    if (!present(canonicalValue)) {
      return { field, status: 'NULL_ONLY_COPY_CANDIDATE', canonicalValue, aliasValue };
    }
    if (canonicalValue === aliasValue) {
      return { field, status: 'MATCHING_VALUE', canonicalValue, aliasValue };
    }
    return { field, status: 'MANUAL_REVIEW_REQUIRED', canonicalValue, aliasValue };
  });
}

function gateListToOverall(gates) {
  if (Object.values(gates).some((item) => item.status === 'FAIL')) return 'BLOCKED';
  if (Object.values(gates).some((item) => item.status === 'REVIEW')) return 'PASS_WITH_REVIEW';
  return 'PASS';
}

async function main() {
  assertAliasScope();
  await assertSourceMatrixStillMatches();

  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const { Client } = pg;
  const client = new Client({
    connectionString,
    application_name: 'set_alias_prewrite_evidence_v1:readonly',
    statement_timeout: 60000,
  });

  const codes = [...new Set(ALIAS_PAIRS.flatMap((pair) => [pair.canonicalCode, pair.aliasCode]))];
  const localCodeHits = discoverLocalCodeHits(codes);

  await client.connect();
  try {
    await client.query('begin transaction read only');

    const classificationColumns = await fetchColumns(client, 'set_code_classification');
    const classificationColumnsPresent = REQUIRED_CLASSIFICATION_COLUMNS.every((column) => classificationColumns.includes(column));
    const cardsTableExists = await tableExists(client, 'cards');
    const justtcgTableExists = await tableExists(client, 'justtcg_set_mappings');

    const { rows: sets } = await client.query(
      `
        select
          id::text,
          code,
          name,
          release_date::text,
          printed_total,
          printed_set_abbrev,
          set_role,
          source,
          logo_url,
          symbol_url,
          hero_image_url,
          hero_image_source,
          identity_domain_default,
          identity_model
        from public.sets
        where game = 'pokemon'
          and code = any($1::text[])
      `,
      [codes],
    );
    const setByCode = new Map(sets.map((row) => [row.code, row]));
    const setIds = sets.map((row) => row.id);

    const { rows: cardPrintCounts } = await client.query(
      `
        select s.id::text as set_id, s.code, count(cp.id)::int as rows
        from public.sets s
        left join public.card_prints cp on cp.set_id = s.id
        where s.id = any($1::uuid[])
        group by s.id, s.code
      `,
      [setIds],
    );

    const { rows: uniqueIdentityCounts } = await client.query(
      `
        select
          s.id::text as set_id,
          s.code,
          count(distinct coalesce(nullif(cp.print_identity_key, ''), cp.number_plain, cp.number, cp.name))::int as rows
        from public.sets s
        left join public.card_prints cp on cp.set_id = s.id
        where s.id = any($1::uuid[])
        group by s.id, s.code
      `,
      [setIds],
    );

    let legacyCardCounts = [];
    if (cardsTableExists) {
      legacyCardCounts = await countBySetId(client, 'cards', 'set_id', setIds);
    }

    const { rows: externalMappings } = await client.query(
      `
        select cp.set_id::text, s.code, em.source, em.active, count(*)::int as rows
        from public.external_mappings em
        join public.card_prints cp on cp.id = em.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_id = any($1::uuid[])
        group by cp.set_id, s.code, em.source, em.active
      `,
      [setIds],
    );

    const { rows: externalPrintingMappings } = await client.query(
      `
        select cp.set_id::text, s.code, epm.source, epm.active, count(*)::int as rows
        from public.external_printing_mappings epm
        join public.card_printings cpn on cpn.id = epm.card_printing_id
        join public.card_prints cp on cp.id = cpn.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_id = any($1::uuid[])
        group by cp.set_id, s.code, epm.source, epm.active
      `,
      [setIds],
    );

    let justtcgSetMappings = [];
    if (justtcgTableExists) {
      justtcgSetMappings = await countBySetId(client, 'justtcg_set_mappings', 'grookai_set_id', setIds);
    }

    const { rows: setFkColumns } = await client.query(`
      select tc.table_name, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY'
        and ccu.table_schema = 'public'
        and ccu.table_name = 'sets'
        and ccu.column_name = 'id'
        and tc.table_schema = 'public'
      order by tc.table_name, kcu.column_name
    `);

    const setFkRows = [];
    for (const fk of setFkColumns) {
      const rows = await countBySetId(client, fk.table_name, fk.column_name, setIds);
      for (const row of rows) setFkRows.push({ ...fk, ...row });
    }

    const { rows: codeColumns } = await client.query(
      `
        select table_name, column_name
        from information_schema.columns
        where table_schema = 'public'
          and column_name = any($1::text[])
        order by table_name, column_name
      `,
      [CODE_COLUMN_NAMES],
    );
    const codeSurfaceRows = [];
    for (const column of codeColumns) {
      try {
        const rows = await countByCodeColumn(client, column.table_name, column.column_name, codes);
        for (const row of rows) codeSurfaceRows.push({ ...column, ...row });
      } catch (error) {
        codeSurfaceRows.push({ ...column, code: '<query_failed>', rows: 0, error: error.message });
      }
    }

    const { rows: classificationRows } = await client.query(
      `
        select set_code, is_canon, canonical_set_code, pokemonapi_set_id, tcgdex_set_id, tcgdex_asset_code, notes
        from public.set_code_classification
        where set_code = any($1::text[])
        order by set_code
      `,
      [codes],
    );

    const { rows: viewRows } = await client.query(`
      select viewname
      from pg_views
      where schemaname = 'public'
        and definition ilike '%set_code%'
      order by viewname
    `);

    const { rows: functionRows } = await client.query(`
      select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and (
          p.proname ilike '%set%'
          or pg_get_functiondef(p.oid) ilike '%set_code%'
          or pg_get_functiondef(p.oid) ilike '%set_code_classification%'
        )
      order by p.proname
    `);

    await client.query('rollback');

    const cardPrintsBySet = rowsBy(cardPrintCounts, 'set_id');
    const uniqueKeysBySet = rowsBy(uniqueIdentityCounts, 'set_id');
    const legacyCardsBySet = rowsBy(legacyCardCounts, 'set_id');
    const externalMappingsBySet = rowsBy(externalMappings, 'set_id');
    const externalPrintingBySet = rowsBy(externalPrintingMappings, 'set_id');
    const justtcgBySet = rowsBy(justtcgSetMappings, 'set_id');
    const setFksBySet = rowsBy(setFkRows, 'set_id');
    const codeSurfacesByCode = rowsBy(codeSurfaceRows, 'code');
    const classificationByCode = new Map(classificationRows.map((row) => [row.set_code, row]));

    const routeLayerEvidence = {
      set_code_classification_columns_present: classificationColumnsPresent,
      required_columns: REQUIRED_CLASSIFICATION_COLUMNS,
      actual_columns: classificationColumns,
      views_with_set_code: viewRows.map((row) => row.viewname),
      functions_with_set_code: functionRows.map((row) => row.proname),
    };

    const matrix = ALIAS_PAIRS.map((pair) => {
      const canonicalSet = setByCode.get(pair.canonicalCode);
      const aliasSet = setByCode.get(pair.aliasCode);
      const rowPresencePass = Boolean(canonicalSet && aliasSet);

      const canonicalCardCount = canonicalSet ? sum(cardPrintsBySet.get(canonicalSet.id) ?? []) : 0;
      const aliasCardCount = aliasSet ? sum(cardPrintsBySet.get(aliasSet.id) ?? []) : 0;
      const canonicalUniqueIdentityCount = canonicalSet ? sum(uniqueKeysBySet.get(canonicalSet.id) ?? []) : 0;
      const aliasUniqueIdentityCount = aliasSet ? sum(uniqueKeysBySet.get(aliasSet.id) ?? []) : 0;
      const aliasLegacyCards = aliasSet ? sum(legacyCardsBySet.get(aliasSet.id) ?? []) : 0;
      const canonicalExternalMappings = canonicalSet ? sum(externalMappingsBySet.get(canonicalSet.id) ?? []) : 0;
      const aliasExternalMappings = aliasSet ? sum(externalMappingsBySet.get(aliasSet.id) ?? []) : 0;
      const canonicalExternalPrintingMappings = canonicalSet ? sum(externalPrintingBySet.get(canonicalSet.id) ?? []) : 0;
      const aliasExternalPrintingMappings = aliasSet ? sum(externalPrintingBySet.get(aliasSet.id) ?? []) : 0;
      const aliasJusttcgMappings = aliasSet ? sum(justtcgBySet.get(aliasSet.id) ?? []) : 0;
      const canonicalJusttcgMappings = canonicalSet ? sum(justtcgBySet.get(canonicalSet.id) ?? []) : 0;
      const aliasSetFks = aliasSet ? setFksBySet.get(aliasSet.id) ?? [] : [];
      const canonicalSetFks = canonicalSet ? setFksBySet.get(canonicalSet.id) ?? [] : [];
      const aliasNonCardSetFks = aliasSetFks.filter((row) => row.table_name !== 'card_prints');
      const aliasCodeSurfaces = codeSurfacesByCode.get(pair.aliasCode.toLowerCase()) ?? [];
      const canonicalCodeSurfaces = codeSurfacesByCode.get(pair.canonicalCode.toLowerCase()) ?? [];
      const aliasClassification = classificationByCode.get(pair.aliasCode) ?? null;
      const canonicalClassification = classificationByCode.get(pair.canonicalCode) ?? null;
      const metadataComparisons = rowPresencePass ? compareMetadata(canonicalSet, aliasSet) : [];
      const manualMetadata = metadataComparisons.filter((item) => item.status === 'MANUAL_REVIEW_REQUIRED');
      const nullOnlyMetadata = metadataComparisons.filter((item) => item.status === 'NULL_ONLY_COPY_CANDIDATE');
      const aliasRepoHits = localCodeHits.get(pair.aliasCode) ?? [];
      const canonicalRepoHits = localCodeHits.get(pair.canonicalCode) ?? [];
      const normalizedCanonicalName = normalizeName(canonicalSet?.name ?? '');
      const normalizedAliasName = normalizeName(aliasSet?.name ?? '');

      const routeEvidence = [];
      if (aliasClassification?.canonical_set_code === pair.canonicalCode) {
        routeEvidence.push('alias is already classified to expected canonical code');
      } else if (aliasClassification) {
        routeEvidence.push(`alias classification exists but points to ${aliasClassification.canonical_set_code ?? 'null'}`);
      } else {
        routeEvidence.push('alias classification row is absent and would be required in a future write');
      }
      if (aliasRepoHits.length) {
        routeEvidence.push(`alias code appears in local route/search/source files (${aliasRepoHits.length} file hits)`);
      }
      if (aliasCodeSurfaces.length) {
        routeEvidence.push(`alias code appears in set-code DB surfaces (${aliasCodeSurfaces.length} surface hits)`);
      }
      const routeGateStatus = classificationColumnsPresent
        ? aliasClassification?.canonical_set_code === pair.canonicalCode
          ? 'PASS'
          : 'REVIEW'
        : 'FAIL';

      const gates = {
        scope_exclusion: gate('PASS', 'pair is in the 20-candidate source matrix and no excluded code is present'),
        row_presence: rowPresencePass
          ? gate('PASS', 'canonical and alias rows both exist')
          : gate('FAIL', 'canonical or alias row is missing'),
        alias_zero_cards: aliasCardCount === 0 && aliasLegacyCards === 0
          ? gate('PASS', `alias card_prints=${aliasCardCount}, legacy cards=${aliasLegacyCards}`)
          : gate('FAIL', `alias card_prints=${aliasCardCount}, legacy cards=${aliasLegacyCards}`),
        alias_no_hidden_fk_dependencies: aliasNonCardSetFks.length === 0
          ? gate('PASS', 'alias row has no non-card direct FK dependencies')
          : gate('FAIL', aliasNonCardSetFks.map((row) => `${row.table_name}.${row.column_name}=${row.rows}`).join(', ')),
        alias_no_external_mappings: aliasExternalMappings === 0 && aliasExternalPrintingMappings === 0
          ? gate('PASS', `alias external_mappings=${aliasExternalMappings}, external_printing_mappings=${aliasExternalPrintingMappings}`)
          : gate('FAIL', `alias external_mappings=${aliasExternalMappings}, external_printing_mappings=${aliasExternalPrintingMappings}`),
        alias_no_set_mapping_ownership: aliasJusttcgMappings === 0
          ? gate('PASS', `alias justtcg_set_mappings=${aliasJusttcgMappings}`)
          : gate('FAIL', `alias justtcg_set_mappings=${aliasJusttcgMappings}`),
        canonical_owns_real_cards: canonicalCardCount > 0
          ? gate('PASS', `canonical card_prints=${canonicalCardCount}`)
          : gate('FAIL', `canonical card_prints=${canonicalCardCount}`),
        metadata_behavior: manualMetadata.length
          ? gate('REVIEW', `manual-review metadata fields: ${manualMetadata.map((item) => item.field).join(', ')}`, 'REVIEW')
          : gate('PASS', nullOnlyMetadata.length
            ? `null-only metadata candidates: ${nullOnlyMetadata.map((item) => item.field).join(', ')}`
            : 'no alias metadata conflict'),
        route_search_preservation: routeGateStatus === 'FAIL'
          ? gate('FAIL', 'set_code_classification is missing required routing columns')
          : routeGateStatus === 'REVIEW'
            ? gate('REVIEW', routeEvidence.join('; '), 'REVIEW')
            : gate('PASS', routeEvidence.join('; '))
      };

      const nameAlignment = normalizedCanonicalName === normalizedAliasName ? 'MATCH' : 'DIFFERENT_REVIEW';
      const overallStatus = gateListToOverall(gates);

      return {
        name_key: pair.nameKey,
        canonical_target_row: pair.canonicalCode,
        permanent_alias_row: pair.aliasCode,
        overall_status: overallStatus,
        hard_stop: false,
        review_stop: false,
        gates,
        counts: {
          canonical_card_prints: canonicalCardCount,
          canonical_unique_identity_keys: canonicalUniqueIdentityCount,
          alias_card_prints: aliasCardCount,
          alias_unique_identity_keys: aliasUniqueIdentityCount,
          alias_legacy_cards: aliasLegacyCards,
          canonical_external_mappings: canonicalExternalMappings,
          alias_external_mappings: aliasExternalMappings,
          canonical_external_printing_mappings: canonicalExternalPrintingMappings,
          alias_external_printing_mappings: aliasExternalPrintingMappings,
          canonical_justtcg_set_mappings: canonicalJusttcgMappings,
          alias_justtcg_set_mappings: aliasJusttcgMappings,
        },
        metadata: {
          behavior: manualMetadata.length ? 'MANUAL_REVIEW_REQUIRED' : 'NULL_ONLY_OR_NO_CONFLICT',
          null_only_copy_candidates: nullOnlyMetadata.map((item) => item.field),
          manual_review_required: manualMetadata.map((item) => ({
            field: item.field,
            canonical_value: item.canonicalValue,
            alias_value: item.aliasValue,
          })),
          comparisons: metadataComparisons,
        },
        route_search: {
          route_layer_supported_by_set_code_classification: classificationColumnsPresent,
          alias_classification: aliasClassification,
          canonical_classification: canonicalClassification,
          alias_code_surfaces: aliasCodeSurfaces,
          canonical_code_surfaces: canonicalCodeSurfaces,
          alias_repo_hits: aliasRepoHits,
          canonical_repo_hits: canonicalRepoHits,
        },
        fk_evidence: {
          alias_set_fk_dependencies: aliasSetFks,
          alias_non_card_set_fk_dependencies: aliasNonCardSetFks,
          canonical_set_fk_dependencies: canonicalSetFks,
        },
        set_evidence: {
          canonical_set: canonicalSet,
          alias_set: aliasSet,
          normalized_canonical_name: normalizedCanonicalName,
          normalized_alias_name: normalizedAliasName,
          name_alignment: nameAlignment,
        },
      };
    });

    const report = buildMarkdown(matrix, routeLayerEvidence);
    await fs.writeFile(MATRIX_PATH, `${JSON.stringify({ route_layer_evidence: routeLayerEvidence, pairs: matrix }, null, 2)}\n`, 'utf8');
    await fs.writeFile(REPORT_PATH, report, 'utf8');

    console.log(`Wrote ${path.relative(ROOT, MATRIX_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
  } finally {
    await client.end();
  }
}

function buildMarkdown(matrix, routeLayerEvidence) {
  const passed = matrix.filter((row) => row.overall_status === 'PASS');
  const passedWithReview = matrix.filter((row) => row.overall_status === 'PASS_WITH_REVIEW');
  const blocked = matrix.filter((row) => row.overall_status === 'BLOCKED');
  const aliasZeroCards = matrix.filter((row) => row.gates.alias_zero_cards.status === 'PASS');
  const aliasNoHiddenFks = matrix.filter((row) => row.gates.alias_no_hidden_fk_dependencies.status === 'PASS');
  const canonicalOwnsCards = matrix.filter((row) => row.gates.canonical_owns_real_cards.status === 'PASS');
  const metadataReview = matrix.filter((row) => row.metadata.manual_review_required.length > 0);
  const routeReview = matrix.filter((row) => row.gates.route_search_preservation.status === 'REVIEW');
  const aliasClassificationMissing = matrix.filter((row) => !row.route_search.alias_classification);
  const aliasClassificationMismatched = matrix.filter((row) => {
    const classification = row.route_search.alias_classification;
    return classification && classification.canonical_set_code !== row.canonical_target_row;
  });

  const lines = [];
  lines.push('# Set Alias Prewrite Evidence - 2026-05-17');
  lines.push('');
  lines.push('Status: no-write evidence pack for the 20 approved alias candidates only. The script used live read-only Supabase queries inside `begin transaction read only`; it did not perform writes, migrations, inserts, updates, deletes, merge operations, alias changes, migration repair, `db pull`, or production mutation.');
  lines.push('');
  lines.push('## Source Inputs');
  lines.push('');
  lines.push('- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_dry_run_20260517.md`');
  lines.push('- `docs/plans/pokemon_db_remediation_v1/set_alias_write_plan_matrix_20260517.json`');
  lines.push('- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_audit_20260517.md`');
  lines.push('- `docs/plans/pokemon_db_remediation_v1/set_alias_dependency_matrix_20260517.json`');
  lines.push('');
  lines.push('## Scope Guard');
  lines.push('');
  lines.push('The audit fails closed if any hard-stop or review-stop code appears in the input. The scoped hard stops remain excluded: `sv04.5`/`sv4pt5`, `pgo`/`swsh10.5`, `sv08.5`/`sv8pt5`, and `sv06.5`/`sv6pt5`. The scoped review stops remain excluded: `bog`/`bp`, `tk-ex-m`/`tk2b`, `tk-ex-p`/`tk2a`, `tk-ex-latia`/`tk1a`, and `tk-ex-latio`/`tk1b`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(table([
    ['Metric', 'Count'],
    ['Alias pairs audited', matrix.length],
    ['Pass', passed.length],
    ['Pass with metadata/route review', passedWithReview.length],
    ['Blocked', blocked.length],
    ['Alias rows with zero card ownership', aliasZeroCards.length],
    ['Alias rows with no hidden non-card FK dependencies', aliasNoHiddenFks.length],
    ['Canonical rows owning card_prints', canonicalOwnsCards.length],
    ['Pairs requiring metadata manual review', metadataReview.length],
    ['Pairs requiring route classification review', routeReview.length],
    ['Alias classification rows currently missing', aliasClassificationMissing.length],
    ['Alias classification rows currently mismatched', aliasClassificationMismatched.length],
  ]));
  lines.push('');
  lines.push('## Route Layer Evidence');
  lines.push('');
  lines.push(`- \`set_code_classification\` has required routing columns: ${routeLayerEvidence.set_code_classification_columns_present ? 'yes' : 'no'}.`);
  lines.push(`- Views with set-code dependencies: ${routeLayerEvidence.views_with_set_code.length ? routeLayerEvidence.views_with_set_code.map((name) => `\`${name}\``).join(', ') : 'none'}.`);
  lines.push(`- Functions with set-code dependencies: ${routeLayerEvidence.functions_with_set_code.length ? routeLayerEvidence.functions_with_set_code.map((name) => `\`${name}\``).join(', ') : 'none'}.`);
  lines.push('');
  lines.push('Finding: route/search preservation can be handled through an alias classification layer, not row deletion, because the required classification columns exist. Missing or mismatched alias classification rows are future write-plan inputs, not approval to delete alias set rows.');
  lines.push('');
  lines.push('## Pass/Fail Matrix');
  lines.push('');
  lines.push(table([
    ['Name key', 'Canonical', 'Alias', 'Overall', 'Alias cards', 'Canonical cards', 'Hidden FK gate', 'Metadata gate', 'Route gate'],
    ...matrix.map((row) => [
      row.name_key,
      `\`${row.canonical_target_row}\``,
      `\`${row.permanent_alias_row}\``,
      row.overall_status,
      row.counts.alias_card_prints,
      row.counts.canonical_card_prints,
      row.gates.alias_no_hidden_fk_dependencies.status,
      row.gates.metadata_behavior.status,
      row.gates.route_search_preservation.status,
    ]),
  ]));
  lines.push('');
  lines.push('## Pair Evidence');
  lines.push('');
  for (const row of matrix) {
    lines.push(`### ${row.canonical_target_row} <- ${row.permanent_alias_row}`);
    lines.push('');
    lines.push(`- Overall status: ${row.overall_status}.`);
    lines.push(`- Card ownership: canonical card_prints=${row.counts.canonical_card_prints}, alias card_prints=${row.counts.alias_card_prints}, alias legacy cards=${row.counts.alias_legacy_cards}.`);
    lines.push(`- External mappings: canonical=${row.counts.canonical_external_mappings}, alias=${row.counts.alias_external_mappings}; external printing mappings canonical=${row.counts.canonical_external_printing_mappings}, alias=${row.counts.alias_external_printing_mappings}.`);
    lines.push(`- Set mappings: canonical justtcg=${row.counts.canonical_justtcg_set_mappings}, alias justtcg=${row.counts.alias_justtcg_set_mappings}.`);
    lines.push(`- Hidden FK dependencies on alias row: ${row.fk_evidence.alias_non_card_set_fk_dependencies.length ? row.fk_evidence.alias_non_card_set_fk_dependencies.map((item) => `${item.table_name}.${item.column_name}=${item.rows}`).join(', ') : 'none'}.`);
    lines.push(`- Metadata behavior: ${row.metadata.behavior}${row.metadata.manual_review_required.length ? ` (${row.metadata.manual_review_required.map((item) => item.field).join(', ')})` : ''}.`);
    lines.push(`- Route/search preservation: ${row.gates.route_search_preservation.evidence}.`);
    lines.push('');
  }
  lines.push('## Blockers');
  lines.push('');
  lines.push(blocked.length ? blocked.map((row) => `- \`${row.canonical_target_row}\` / \`${row.permanent_alias_row}\`: ${Object.entries(row.gates).filter(([, item]) => item.status === 'FAIL').map(([name, item]) => `${name}: ${item.evidence}`).join('; ')}.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Manual Review Queue');
  lines.push('');
  lines.push(metadataReview.length ? metadataReview.map((row) => `- \`${row.permanent_alias_row}\` -> \`${row.canonical_target_row}\`: ${row.metadata.manual_review_required.map((item) => item.field).join(', ')}.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Route Review Queue');
  lines.push('');
  lines.push(routeReview.length ? routeReview.map((row) => `- \`${row.permanent_alias_row}\` -> \`${row.canonical_target_row}\`: ${row.gates.route_search_preservation.evidence}.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Future Write-Plan Implications');
  lines.push('');
  lines.push('- No card movement is expected for any pair that remains in this candidate set.');
  lines.push('- Alias rows must remain as permanent route/search/source aliases.');
  lines.push('- Missing alias classification rows are future routing work, not evidence for deletion.');
  lines.push('- Metadata copy behavior must stay null-only unless a reviewer approves a specific conflicting field.');
  lines.push('- Any future write script must rerun these gates immediately before opening a writable transaction.');
  lines.push('');
  lines.push('## No-Write Confirmation');
  lines.push('');
  lines.push('- No Supabase writes.');
  lines.push('- No migrations.');
  lines.push('- No inserts.');
  lines.push('- No updates.');
  lines.push('- No deletes.');
  lines.push('- No merge operations.');
  lines.push('- No alias changes.');
  lines.push('- No migration repair.');
  lines.push('- No `db pull`.');
  lines.push('- No production mutation.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
