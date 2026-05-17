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
const MATRIX_PATH = path.join(OUT_DIR, 'set_alias_dependency_matrix_20260517.json');
const REPORT_PATH = path.join(OUT_DIR, 'set_alias_dependency_audit_20260517.md');

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
].map(([name_key, canonical_candidate, alias_candidate]) => ({
  name_key,
  canonical_candidate,
  alias_candidate,
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

function assertAliasScope() {
  for (const pair of ALIAS_PAIRS) {
    if (EXCLUDED_CODES.has(pair.canonical_candidate) || EXCLUDED_CODES.has(pair.alias_candidate)) {
      throw new Error(`Excluded review/hard-stop code leaked into alias audit: ${pair.canonical_candidate}/${pair.alias_candidate}`);
    }
  }
}

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

function normalizeNumber(value) {
  if (value == null) return null;
  let text = String(value).trim();
  if (!text) return null;
  text = text.replace(/^#/, '').replace(/\s+/g, '').split('/')[0].toUpperCase();
  if (!text) return null;
  if (/^\d+$/.test(text)) return String(Number(text));
  const prefixed = text.match(/^([A-Z]+)0*([0-9]+)([A-Z]*)$/);
  if (prefixed) return `${prefixed[1]}${Number(prefixed[2])}${prefixed[3]}`;
  return text;
}

function identityKey(card) {
  const numberKey = normalizeNumber(card.number) ?? normalizeNumber(card.number_plain);
  return numberKey ? `N:${numberKey}` : `U:${normalizeName(card.name)}`;
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

function sum(rows, field = 'rows') {
  return rows.reduce((total, row) => total + Number(row[field] ?? 0), 0);
}

function summarizeMappings(rows) {
  const bySource = new Map();
  for (const row of rows) {
    const key = row.source ?? 'unknown';
    if (!bySource.has(key)) bySource.set(key, { source: key, rows: 0, active_rows: 0 });
    const current = bySource.get(key);
    current.rows += Number(row.rows ?? 0);
    if (row.active === true) current.active_rows += Number(row.rows ?? 0);
  }
  return [...bySource.values()].sort((a, b) => a.source.localeCompare(b.source));
}

function metadataFields(set) {
  const fields = [];
  for (const field of [
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
  ]) {
    const value = set?.[field];
    if (value !== null && value !== undefined && value !== '') fields.push(field);
  }
  return fields;
}

function table(entries) {
  if (!entries.length) return '_None._\n';
  const [headers, ...rows] = entries;
  const line = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  return `${[line, sep, ...rows.map((row) => `| ${row.map((value) => String(value ?? '').replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n')}\n`;
}

function discoverCodeHits() {
  const roots = ['apps', 'lib', 'backend', 'scripts', 'supabase'];
  const skip = new Set(['node_modules', '.git', '.cache', '.next', 'build', '.dart_tool']);
  const extensions = new Set(['.dart', '.ts', '.tsx', '.js', '.mjs', '.sql', '.ps1', '.py', '.md']);
  const codes = new Set(ALIAS_PAIRS.flatMap((pair) => [pair.canonical_candidate, pair.alias_candidate]));
  const hits = new Map([...codes].map((code) => [code, []]));

  function walk(dir) {
    let entries = [];
    try {
      entries = requireFromBackend('fs').readdirSync(dir, { withFileTypes: true });
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
      if (path.relative(ROOT, full).replace(/\\/g, '/') === 'scripts/audits/set_alias_dependency_audit_v1.mjs') {
        continue;
      }
      if (!extensions.has(path.extname(entry.name))) continue;
      let body = '';
      try {
        body = requireFromBackend('fs').readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      for (const code of codes) {
        if (body.includes(code)) hits.get(code).push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
  }

  for (const root of roots) walk(path.join(ROOT, root));
  return hits;
}

async function countBySetId(client, tableName, columnName, setIds) {
  const sql = `
    select ${quoteIdent(columnName)}::text as set_id, count(*)::int as rows
    from public.${quoteIdent(tableName)}
    where ${quoteIdent(columnName)} = any($1::uuid[])
    group by ${quoteIdent(columnName)}
  `;
  return (await client.query(sql, [setIds])).rows;
}

async function countBySetCode(client, tableName, columnName, codes) {
  const sql = `
    select lower(${quoteIdent(columnName)}::text) as code, count(*)::int as rows
    from public.${quoteIdent(tableName)}
    where lower(${quoteIdent(columnName)}::text) = any($1::text[])
    group by lower(${quoteIdent(columnName)}::text)
  `;
  return (await client.query(sql, [codes.map((code) => code.toLowerCase())])).rows;
}

async function main() {
  assertAliasScope();
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) throw new Error('SUPABASE_DB_URL is not set.');

  const { Client } = pg;
  const client = new Client({ connectionString, statement_timeout: 60000 });
  const codeHits = discoverCodeHits();
  const codes = [...new Set(ALIAS_PAIRS.flatMap((pair) => [pair.canonical_candidate, pair.alias_candidate]))];

  await client.connect();
  try {
    await client.query('begin transaction read only');

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
    const setIds = sets.map((set) => set.id);
    const setByCode = new Map(sets.map((set) => [set.code, set]));

    const { rows: cardPrints } = await client.query(
      `
        select
          cp.id::text,
          cp.set_id::text,
          s.code as set_code,
          cp.name,
          cp.number,
          cp.number_plain,
          cp.variant_key,
          cp.tcgplayer_id,
          cp.external_ids,
          cp.print_identity_key,
          cp.gv_id,
          cp.image_url
        from public.card_prints cp
        join public.sets s on s.id = cp.set_id
        where cp.set_id = any($1::uuid[])
      `,
      [setIds],
    );

    const cardIds = cardPrints.map((card) => card.id);
    const cardsBySet = rowsBy(cardPrints, 'set_id');

    const { rows: externalMappings } = await client.query(
      `
        select cp.set_id::text, s.code as set_code, em.source, em.active, count(*)::int as rows
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
        select cp.set_id::text, s.code as set_code, epm.source, epm.active, count(*)::int as rows
        from public.external_printing_mappings epm
        join public.card_printings cpn on cpn.id = epm.card_printing_id
        join public.card_prints cp on cp.id = cpn.card_print_id
        join public.sets s on s.id = cp.set_id
        where cp.set_id = any($1::uuid[])
        group by cp.set_id, s.code, epm.source, epm.active
      `,
      [setIds],
    );

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

    const { rows: cardFkColumns } = await client.query(`
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
        and ccu.table_name = 'card_prints'
        and ccu.column_name = 'id'
        and tc.table_schema = 'public'
      order by tc.table_name, kcu.column_name
    `);

    const setFkRows = [];
    for (const fk of setFkColumns) {
      const rows = await countBySetId(client, fk.table_name, fk.column_name, setIds);
      for (const row of rows) setFkRows.push({ ...fk, ...row });
    }

    const cardFkRows = [];
    for (const fk of cardFkColumns) {
      const sql = `
        select cp.set_id::text, s.code as set_code, count(*)::int as rows
        from public.${quoteIdent(fk.table_name)} dep
        join public.card_prints cp on cp.id = dep.${quoteIdent(fk.column_name)}
        join public.sets s on s.id = cp.set_id
        where dep.${quoteIdent(fk.column_name)} = any($1::uuid[])
        group by cp.set_id, s.code
      `;
      const { rows } = await client.query(sql, [cardIds]);
      for (const row of rows) cardFkRows.push({ ...fk, ...row });
    }

    const { rows: mappingConflictRows } = await client.query(
      `
        select cp.set_id::text, s.code as set_code, count(*)::int as rows
        from public.mapping_conflicts mc
        join public.card_prints cp on cp.id = any(mc.candidate_print_uuids)
        join public.sets s on s.id = cp.set_id
        where cp.id = any($1::uuid[])
        group by cp.set_id, s.code
      `,
      [cardIds],
    );

    const { rows: setCodeColumns } = await client.query(`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and column_name in ('set_code', 'db_set_code', 'source_set_code', 'target_set_code')
      order by table_name, column_name
    `);
    const setCodeRows = [];
    for (const column of setCodeColumns) {
      try {
        const rows = await countBySetCode(client, column.table_name, column.column_name, codes);
        for (const row of rows) setCodeRows.push({ ...column, ...row });
      } catch (error) {
        setCodeRows.push({ ...column, code: '<query_failed>', rows: 0, error: error.message });
      }
    }

    const { rows: viewSetCodeRows } = await client.query(`
      select viewname
      from pg_views
      where schemaname = 'public'
        and definition ilike '%set_code%'
      order by viewname
    `);
    const { rows: functionSetCodeRows } = await client.query(`
      select p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind in ('f', 'p')
        and (p.proname ilike '%set%' or pg_get_functiondef(p.oid) ilike '%set_code%')
      order by p.proname
    `);

    await client.query('rollback');

    const externalMappingsBySet = rowsBy(externalMappings, 'set_id');
    const externalPrintingBySet = rowsBy(externalPrintingMappings, 'set_id');
    const setFkBySet = rowsBy(setFkRows, 'set_id');
    const cardFkBySet = rowsBy(cardFkRows, 'set_id');
    const conflictsBySet = rowsBy(mappingConflictRows, 'set_id');
    const setCodeByCode = rowsBy(setCodeRows, 'code');

    const matrix = ALIAS_PAIRS.map((pair) => {
      const canonicalSet = setByCode.get(pair.canonical_candidate);
      const aliasSet = setByCode.get(pair.alias_candidate);
      if (!canonicalSet || !aliasSet) {
        throw new Error(`Missing set row for pair ${pair.canonical_candidate}/${pair.alias_candidate}`);
      }
      const canonicalCards = cardsBySet.get(canonicalSet.id) ?? [];
      const aliasCards = cardsBySet.get(aliasSet.id) ?? [];
      const canonicalKeys = new Set(canonicalCards.map(identityKey));
      const aliasKeys = new Set(aliasCards.map(identityKey));
      const overlap = [...canonicalKeys].filter((key) => aliasKeys.has(key));

      const canonicalExternal = externalMappingsBySet.get(canonicalSet.id) ?? [];
      const aliasExternal = externalMappingsBySet.get(aliasSet.id) ?? [];
      const canonicalPrinting = externalPrintingBySet.get(canonicalSet.id) ?? [];
      const aliasPrinting = externalPrintingBySet.get(aliasSet.id) ?? [];
      const canonicalSetFks = setFkBySet.get(canonicalSet.id) ?? [];
      const aliasSetFks = setFkBySet.get(aliasSet.id) ?? [];
      const canonicalCardFks = cardFkBySet.get(canonicalSet.id) ?? [];
      const aliasCardFks = cardFkBySet.get(aliasSet.id) ?? [];
      const canonicalConflicts = conflictsBySet.get(canonicalSet.id) ?? [];
      const aliasConflicts = conflictsBySet.get(aliasSet.id) ?? [];
      const canonicalCodeRows = setCodeByCode.get(pair.canonical_candidate.toLowerCase()) ?? [];
      const aliasCodeRows = setCodeByCode.get(pair.alias_candidate.toLowerCase()) ?? [];

      const aliasMetadata = metadataFields(aliasSet);
      const publicRouteRisk = [
        'set-code based public/query surfaces exist: list_set_codes, search_cards_in_set, card_history, pricing/search/vault views',
      ];
      if (aliasMetadata.length) publicRouteRisk.push('alias row has metadata; preserve as redirect/search alias');
      const aliasRepoHits = codeHits.get(pair.alias_candidate) ?? [];
      if (aliasRepoHits.length) publicRouteRisk.push(`alias code appears in repo files: ${aliasRepoHits.slice(0, 8).join(', ')}${aliasRepoHits.length > 8 ? '...' : ''}`);
      if (aliasCodeRows.length) publicRouteRisk.push(`alias code appears in set_code columns/views: ${aliasCodeRows.map((row) => `${row.table_name}.${row.column_name}=${row.rows}`).join(', ')}`);

      const fkDependencyRisk = [];
      if (aliasSetFks.some((row) => row.table_name !== 'card_prints') || aliasCards.length > 0 || aliasCardFks.length > 0) {
        fkDependencyRisk.push('alias side has direct data dependencies');
      }
      if (sum(canonicalCardFks) > 0) fkDependencyRisk.push('canonical card_print rows have downstream dependencies that must be preserved');
      if (sum(canonicalSetFks.filter((row) => row.table_name === 'justtcg_set_mappings')) > 0) fkDependencyRisk.push('canonical set has justtcg_set_mappings dependency');
      if (sum(aliasSetFks.filter((row) => row.table_name === 'justtcg_set_mappings')) > 0) fkDependencyRisk.push('alias set has justtcg_set_mappings dependency');
      if (sum(aliasCodeRows) > 0) fkDependencyRisk.push('alias code exists in set_code based surfaces');

      const notes = [
        'Hard stops and review stops intentionally excluded from this audit.',
        'Future design should use canonical physical set plus permanent alias/source-routing layer.',
      ];
      if (aliasCards.length === 0) notes.push('Alias side has zero card_print rows in this dry run.');
      if (sum(aliasExternal) === 0 && sum(aliasPrinting) === 0) notes.push('Alias side has no card-level or printing-level external mappings.');
      if (aliasMetadata.length) notes.push(`Alias metadata fields present: ${aliasMetadata.join(', ')}`);

      const safeForFutureWritePlan =
        aliasCards.length === 0 &&
        sum(aliasExternal) === 0 &&
        sum(aliasPrinting) === 0 &&
        sum(aliasCardFks) === 0 &&
        sum(aliasSetFks.filter((row) => row.table_name !== 'card_prints')) === 0;

      return {
        name_key: pair.name_key,
        canonical_candidate: pair.canonical_candidate,
        alias_candidate: pair.alias_candidate,
        safe_for_future_write_plan: safeForFutureWritePlan,
        hard_stop: false,
        review_stop: false,
        card_overlap_count: overlap.length,
        canonical_card_count: canonicalCards.length,
        alias_card_count: aliasCards.length,
        mapping_owner: sum(aliasExternal) || sum(aliasPrinting) ? 'mixed_or_alias' : 'canonical',
        fk_dependency_risk: fkDependencyRisk,
        metadata_preservation_required: aliasMetadata,
        public_route_risk: publicRouteRisk,
        notes,
        details: {
          canonical_set: canonicalSet,
          alias_set: aliasSet,
          canonical_unique_identity_key_count: canonicalKeys.size,
          alias_unique_identity_key_count: aliasKeys.size,
          orphan_risk: aliasCards.length === 0 ? 'low_alias_card_orphan_risk' : 'blocked_alias_has_cards',
          external_mappings: {
            canonical: summarizeMappings(canonicalExternal),
            alias: summarizeMappings(aliasExternal),
          },
          external_printing_mappings: {
            canonical: summarizeMappings(canonicalPrinting),
            alias: summarizeMappings(aliasPrinting),
          },
          set_fk_dependencies: {
            canonical: canonicalSetFks,
            alias: aliasSetFks,
          },
          card_print_fk_dependencies: {
            canonical: canonicalCardFks,
            alias: aliasCardFks,
          },
          mapping_conflicts_candidate_refs: {
            canonical: canonicalConflicts,
            alias: aliasConflicts,
          },
          set_code_surface_counts: {
            canonical: canonicalCodeRows,
            alias: aliasCodeRows,
          },
          repo_code_hits: {
            canonical: codeHits.get(pair.canonical_candidate) ?? [],
            alias: codeHits.get(pair.alias_candidate) ?? [],
          },
        },
      };
    });

    const report = buildMarkdown(matrix, {
      views: viewSetCodeRows.map((row) => row.viewname),
      functions: functionSetCodeRows.map((row) => row.proname),
    });
    await fs.writeFile(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`, 'utf8');
    await fs.writeFile(REPORT_PATH, report, 'utf8');
    console.log(`Wrote ${path.relative(ROOT, MATRIX_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT, REPORT_PATH)}`);
  } finally {
    await client.end();
  }
}

function buildMarkdown(matrix, dbCodeSurfaces) {
  const safeLooking = matrix.filter((row) => row.safe_for_future_write_plan);
  const blocked = matrix.filter((row) => !row.safe_for_future_write_plan);
  const metadataOnly = matrix.filter((row) => row.alias_card_count === 0 && row.metadata_preservation_required.length > 0);
  const routePreserve = matrix.filter((row) => row.public_route_risk.length > 0);

  const lines = [];
  lines.push('# Set Alias Dependency Audit - 2026-05-17');
  lines.push('');
  lines.push('Status: dependency discovery only. This audit performed read-only Supabase queries inside `begin transaction read only` and made no database changes.');
  lines.push('');
  lines.push('## Scope');
  lines.push('');
  lines.push('- Alias-candidate groups audited: 20');
  lines.push('- Review stops excluded: 5');
  lines.push('- Hard stops excluded: 4');
  lines.push('- Future architecture assumption: canonical physical set plus permanent alias/source-routing layer.');
  lines.push('');
  lines.push('Excluded hard stops: `sv04.5` vs `sv4pt5`, `pgo` vs `swsh10.5`, `sv08.5` vs `sv8pt5`, `sv06.5` vs `sv6pt5`.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(table([
    ['Metric', 'Count'],
    ['Alias pairs audited', matrix.length],
    ['Safe-looking for future write-plan design', safeLooking.length],
    ['Blocked or unexpectedly risky', blocked.length],
    ['Metadata-only alias rows', metadataOnly.length],
    ['Route-preservation candidates', routePreserve.length],
  ]));
  lines.push('');
  lines.push('## Pair Matrix');
  lines.push('');
  lines.push(table([
    ['Name key', 'Canonical candidate', 'Alias candidate', 'Canonical cards', 'Alias cards', 'Overlap', 'Mapping owner', 'Future write-plan candidate'],
    ...matrix.map((row) => [
      row.name_key,
      `\`${row.canonical_candidate}\``,
      `\`${row.alias_candidate}\``,
      row.canonical_card_count,
      row.alias_card_count,
      row.card_overlap_count,
      row.mapping_owner,
      row.safe_for_future_write_plan ? 'yes' : 'no',
    ]),
  ]));
  lines.push('');
  lines.push('## Dependency Findings');
  lines.push('');
  for (const row of matrix) {
    lines.push(`### ${row.canonical_candidate} -> ${row.alias_candidate}`);
    lines.push('');
    lines.push(`- Card ownership: canonical=${row.canonical_card_count}, alias=${row.alias_card_count}, overlap=${row.card_overlap_count}.`);
    lines.push(`- Unique identity keys: canonical=${row.details.canonical_unique_identity_key_count}, alias=${row.details.alias_unique_identity_key_count}.`);
    lines.push(`- Orphan risk: ${row.details.orphan_risk}.`);
    lines.push(`- External mappings: canonical=${sum(row.details.external_mappings.canonical)}, alias=${sum(row.details.external_mappings.alias)}.`);
    lines.push(`- External printing mappings: canonical=${sum(row.details.external_printing_mappings.canonical)}, alias=${sum(row.details.external_printing_mappings.alias)}.`);
    lines.push(`- Set FK dependencies on canonical side: ${row.details.set_fk_dependencies.canonical.length ? row.details.set_fk_dependencies.canonical.map((item) => `${item.table_name}.${item.column_name}=${item.rows}`).join(', ') : 'none'}.`);
    lines.push(`- Set FK dependencies on alias side: ${row.details.set_fk_dependencies.alias.length ? row.details.set_fk_dependencies.alias.map((item) => `${item.table_name}.${item.column_name}=${item.rows}`).join(', ') : 'none'}.`);
    lines.push(`- Card-print FK dependencies on canonical side: ${row.details.card_print_fk_dependencies.canonical.length ? row.details.card_print_fk_dependencies.canonical.map((item) => `${item.table_name}.${item.column_name}=${item.rows}`).join(', ') : 'none'}.`);
    lines.push(`- Metadata preservation required: ${row.metadata_preservation_required.length ? row.metadata_preservation_required.join(', ') : 'none'}.`);
    lines.push(`- Public/API route risk: ${row.public_route_risk.join('; ')}.`);
    lines.push('');
  }
  lines.push('## Public/API Dependency Surface');
  lines.push('');
  lines.push('Mapping tables audited: `external_mappings`, `external_printing_mappings`, and `justtcg_set_mappings`. Other mapping/provenance-like card dependencies were discovered through card-print FK introspection and are listed per pair.');
  lines.push('');
  lines.push('Set-code based DB surfaces found during discovery include:');
  lines.push('');
  lines.push(`- Views with set-code dependencies: ${dbCodeSurfaces.views.length ? dbCodeSurfaces.views.map((name) => `\`${name}\``).join(', ') : 'none'}.`);
  lines.push(`- Functions with set-code dependencies: ${dbCodeSurfaces.functions.length ? dbCodeSurfaces.functions.map((name) => `\`${name}\``).join(', ') : 'none'}.`);
  lines.push('');
  lines.push('Local code search also found historical set-code literals in identity and audit workers. This supports a permanent alias/source-routing layer instead of deleting alias rows or pretending aliases never existed.');
  lines.push('');
  lines.push('## Safe-looking alias candidates');
  lines.push('');
  lines.push(safeLooking.length ? safeLooking.map((row) => `- \`${row.canonical_candidate}\` canonical candidate with \`${row.alias_candidate}\` as alias candidate.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Metadata-only alias rows');
  lines.push('');
  lines.push(metadataOnly.length ? metadataOnly.map((row) => `- \`${row.alias_candidate}\`: ${row.metadata_preservation_required.join(', ')}.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Route-preservation candidates');
  lines.push('');
  lines.push(routePreserve.length ? routePreserve.map((row) => `- \`${row.alias_candidate}\` should remain available as a redirect/search/source alias for \`${row.canonical_candidate}\`.`).join('\n') : '_None._');
  lines.push('');
  lines.push('');
  lines.push('## Blocked alias candidates');
  lines.push('');
  lines.push(blocked.length ? blocked.map((row) => `- \`${row.canonical_candidate}\` / \`${row.alias_candidate}\`: ${row.fk_dependency_risk.join('; ') || 'not safe for future write plan from current evidence'}.`).join('\n') : '_None discovered among the 20 alias-candidate groups._');
  lines.push('');
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
