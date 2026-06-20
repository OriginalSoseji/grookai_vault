import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const CACHE_DIR = path.join(OUTPUT_DIR, 'tcgmap06a_tcgcsv_snapshot_cache_v1');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap06a_tcgcsv_snapshot_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap06a_tcgcsv_snapshot_readiness_v1.md');
const CATEGORY_ID = 3;
const BASE_URL = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}`;

const GROUP_NAME_ALIASES_BY_SET = {
  basep: ['WoTC Promo', 'Wizards Black Star Promos'],
  bwp: ['Black and White Promos', 'BW Black Star Promos'],
  dpp: ['Diamond and Pearl Promos', 'DP Black Star Promos'],
  hsp: ['HGSS Promos', 'HGSS Black Star Promos'],
  mep: ['ME: Mega Evolution Promo', 'MEP Black Star Promos'],
  np: ['Nintendo Promos', 'Nintendo Black Star Promos'],
  smp: ['SM Promos', 'SM Black Star Promos'],
  swshp: ['SWSH: Sword & Shield Promo Cards', 'SWSH Black Star Promos'],
  svp: ['SV: Scarlet & Violet Promo Cards', 'Scarlet & Violet Black Star Promos'],
  xyp: ['XY Promos', 'XY Black Star Promos'],
  '2023sv': ["McDonald's Promos 2023", "McDonald's Collection 2023"],
  '2024sv': ["McDonald's Promos 2024", "McDonald's Collection 2024"],
  mcd11: ["McDonald's Promos 2011", "McDonald's Collection 2011"],
  mcd12: ["McDonald's Promos 2012", "McDonald's Collection 2012"],
  mcd14: ["McDonald's Promos 2014", "McDonald's Collection 2014"],
  mcd15: ["McDonald's Promos 2015", "McDonald's Collection 2015"],
  mcd16: ["McDonald's Promos 2016", "McDonald's Collection 2016"],
  mcd17: ["McDonald's Promos 2017", "McDonald's Collection 2017"],
  mcd18: ["McDonald's Promos 2018", "McDonald's Collection 2018"],
  mcd19: ["McDonald's Promos 2019", "McDonald's Collection 2019"],
  mcd22: ["McDonald's Promos 2022", "McDonald's Collection 2022"],
  sm1: ['SM Base Set'],
  sv4pt5: ['Paldean Fates'],
  sv8pt5: ['Prismatic Evolutions'],
  'sv10.5b': ['Black Bolt'],
  'sv06.5': ['Shrouded Fable'],
  swsh45sv: ['Shining Fates Shiny Vault'],
  sm115: ['Hidden Fates Shiny Vault', 'Hidden Fates'],
  swsh12pt5gg: ['Crown Zenith: Galarian Gallery', 'Crown Zenith Galarian Gallery'],
};

function parseArgs(argv) {
  const options = { limitSets: 30, refreshCache: false, sets: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--limit-sets') {
      options.limitSets = Number.parseInt(next, 10);
      index += 1;
    } else if (arg === '--sets') {
      options.sets = new Set(next.split(',').map((value) => value.trim()).filter(Boolean));
      index += 1;
    } else if (arg === '--refresh-cache') {
      options.refreshCache = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isFinite(options.limitSets) || options.limitSets < 1) {
    throw new Error('--limit-sets must be a positive integer');
  }
  return options;
}

function connectionString() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function comparable(value) {
  return normalizeText(value)
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\bpokemon\b/g, ' ')
    .replace(/\blv\s*x\b/g, ' ')
    .replace(/\blv\s*\.?\s*x\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function setComparable(value) {
  return comparable(value)
    .replace(/^(sv|swsh|sm|xy|bw|dp|ex|me)\d+(?:pt\d+)?\s+/g, ' ')
    .replace(/^sve\s+/g, ' ')
    .replace(/^mep\s+/g, ' ')
    .replace(/\bblack star promos\b/g, 'black star promos')
    .replace(/\s+/g, ' ')
    .trim();
}

function cardComparable(value) {
  return comparable(String(value ?? '').replace(/\s*\([^)]*\)\s*/g, ' '))
    .replace(/\b(team aqua|team magma|team galactic) s\b/g, '$1')
    .replace(/\bimposter professor oak\b/g, 'impostor professor oak')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  const left = raw.split('/')[0]?.trim() ?? raw;
  return left.replace(/^0+(?=\d)/, '').toLowerCase();
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function productCardName(product) {
  return String(product.name ?? '')
    .replace(/\s*\(#?\d+\s*-\s*(?:non-?holo|holo)\)\s*/ig, ' ')
    .split(/\s+-\s+/)[0]
    .trim();
}

function identityKey(row) {
  return [
    row.set_code,
    normalizeNumber(row.number),
    cardComparable(row.name),
  ].join('|');
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

async function fetchJsonCached(url, cacheName, options) {
  const cacheFile = path.join(CACHE_DIR, cacheName);
  if (!options.refreshCache) {
    try {
      return JSON.parse(await fs.readFile(cacheFile, 'utf8'));
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }

  let stdout = null;
  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      ({ stdout } = await execFileAsync('curl.exe', [
        '--ssl-no-revoke',
        '--silent',
        '--show-error',
        '--location',
        '--max-time',
        '120',
        '--user-agent',
        'Grookai TCG Mapping Audit/1.0',
        url,
      ], { timeout: 140000, maxBuffer: 100 * 1024 * 1024 }));
      break;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
  if (stdout === null) throw lastError;
  const json = JSON.parse(stdout);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cacheFile, `${JSON.stringify(json)}\n`);
  return json;
}

async function fetchGroups(options) {
  const payload = await fetchJsonCached(`${BASE_URL}/groups`, 'groups.json', options);
  return payload.results ?? [];
}

async function fetchProducts(groupId, options) {
  const payload = await fetchJsonCached(`${BASE_URL}/${groupId}/products`, `${groupId}_products.json`, options);
  return payload.results ?? [];
}

function matchingGroups(row, groups) {
  const target = setComparable(row.set_name);
  const aliases = new Set([target, ...(GROUP_NAME_ALIASES_BY_SET[row.set_code] ?? []).map(setComparable)]);
  return groups.filter((group) => {
    const name = setComparable(group.name);
    for (const alias of aliases) {
      if (name === alias || name.endsWith(alias) || alias.endsWith(name)) return true;
    }
    return false;
  });
}

function classifyCandidates(candidateRows, existingExternalIds) {
  const byParent = new Map();
  const byProduct = new Map();
  for (const row of candidateRows) {
    if (!byParent.has(row.card_print_id)) byParent.set(row.card_print_id, []);
    byParent.get(row.card_print_id).push(row);
    if (!byProduct.has(row.tcgplayer_external_id)) byProduct.set(row.tcgplayer_external_id, []);
    byProduct.get(row.tcgplayer_external_id).push(row);
  }

  return candidateRows.map((row) => {
    const rowsPerParent = byParent.get(row.card_print_id)?.length ?? 0;
    const rowsPerProduct = byProduct.get(row.tcgplayer_external_id)?.length ?? 0;
    const externalIdExistsAnywhere = existingExternalIds.has(row.tcgplayer_external_id);
    let classification = 'ready_from_fresh_tcgcsv_exact_identity';
    if (externalIdExistsAnywhere) classification = 'blocked_existing_tcgplayer_external_id_collision';
    else if (rowsPerParent > 1) classification = 'blocked_multi_products_for_parent';
    else if (rowsPerProduct > 1) classification = 'blocked_batch_duplicate_tcgplayer_id';
    return {
      ...row,
      rows_per_parent: rowsPerParent,
      rows_per_tcgplayer_id: rowsPerProduct,
      external_id_exists_anywhere: externalIdExistsAnywhere,
      classification,
    };
  });
}

function bucket(rows, keyFn) {
  const out = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const value = out.get(key) ?? { key, rows: 0, parents: new Set(), sets: new Set() };
    value.rows += 1;
    value.parents.add(row.card_print_id);
    value.sets.add(row.set_code);
    out.set(key, value);
  }
  return [...out.values()]
    .map((value) => ({
      key: value.key,
      rows: value.rows,
      parents: value.parents.size,
      sets: value.sets.size,
    }))
    .sort((a, b) => b.rows - a.rows || a.key.localeCompare(b.key));
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-06A TCGCSV Snapshot Readiness V1');
  lines.push('');
  lines.push('Audit-only local snapshot/readiness pass. This fetched or reused TCGCSV product JSON into a local audit cache and classified exact identity matches. No DB writes, migrations, pricing writes, image writes, or canonical mapping inserts were performed.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- sets_attempted: ${report.summary.sets_attempted}`);
  lines.push(`- groups_matched: ${report.summary.groups_matched}`);
  lines.push(`- products_loaded: ${report.summary.products_loaded}`);
  lines.push(`- candidate_rows: ${report.summary.candidate_rows}`);
  lines.push(`- ready_rows: ${report.summary.ready_rows}`);
  lines.push(`- blocked_rows: ${report.summary.blocked_rows}`);
  lines.push('');
  lines.push('## Classification Buckets');
  lines.push('');
  lines.push(markdownTable(report.classification_buckets, [
    { label: 'classification', value: (row) => row.key },
    { label: 'rows', value: (row) => row.rows },
    { label: 'parents', value: (row) => row.parents },
    { label: 'sets', value: (row) => row.sets },
  ]));
  lines.push('');
  lines.push('## Set Outcomes');
  lines.push('');
  lines.push(markdownTable(report.set_results, [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'missing parents', value: (row) => row.missing_parent_rows },
    { label: 'groups', value: (row) => row.group_names.join('; ') },
    { label: 'products', value: (row) => row.products_loaded },
    { label: 'candidates', value: (row) => row.candidate_rows },
    { label: 'status', value: (row) => row.status },
  ]));
  lines.push('');
  lines.push('## Ready By Set');
  lines.push('');
  lines.push(markdownTable(report.ready_by_set.slice(0, 40), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'ready', value: (row) => row.ready_rows },
  ]));
  lines.push('');
  lines.push('## Ready Sample');
  lines.push('');
  lines.push(markdownTable(report.ready_rows.slice(0, 30), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'name', value: (row) => row.name },
    { label: 'card_print_id', value: (row) => `\`${row.card_print_id}\`` },
    { label: 'tcgplayer', value: (row) => `\`${row.tcgplayer_external_id}\`` },
    { label: 'source', value: (row) => row.source_url },
  ]));
  lines.push('');
  lines.push('## Recommended Next Package');
  lines.push('');
  if (report.summary.ready_rows > 0) {
    lines.push('Recommended next package: `TCGMAP-06B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS` guarded rollback-only dry-run.');
    lines.push('');
    lines.push('The package should insert only rows classified as `ready_from_fresh_tcgcsv_exact_identity` from this fingerprint.');
  } else {
    lines.push('No mapping insert package is recommended from this snapshot.');
  }
  lines.push('');
  lines.push('## Safety Confirmation');
  lines.push('');
  for (const [key, value] of Object.entries(report.safety)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

async function main() {
  const options = parseArgs(process.argv);
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap06a_tcgcsv_snapshot_readiness_v1',
  });

  await client.connect();
  try {
    const missingRows = await queryRows(client, `
      with child_agg as (
        select card_print_id, count(*)::int as child_printings
        from public.card_printings
        group by card_print_id
      ),
      mapping_agg as (
        select
          card_print_id,
          bool_or(source = 'tcgplayer' and active) as has_tcgplayer,
          bool_or(source = 'justtcg' and active) as has_justtcg,
          bool_or(source = 'tcgdex' and active) as has_tcgdex,
          bool_or(source = 'pricecharting' and active) as has_pricecharting
        from public.external_mappings
        where active = true
        group by card_print_id
      )
      select
        cp.id::text as card_print_id,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.name,
        cp.gv_id,
        coalesce(ca.child_printings, 0) as child_printings,
        coalesce(ma.has_justtcg, false) as has_justtcg,
        coalesce(ma.has_tcgdex, false) as has_tcgdex,
        coalesce(ma.has_pricecharting, false) as has_pricecharting
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      left join child_agg ca on ca.card_print_id = cp.id
      left join mapping_agg ma on ma.card_print_id = cp.id
      where cp.identity_domain = 'pokemon_eng_standard'
        and coalesce(ma.has_tcgplayer, false) = false
      order by
        coalesce(ca.child_printings, 0) desc,
        cp.set_code,
        cp.number,
        cp.name
    `);

    const existingExternalIds = new Set((await queryRows(client, `
      select distinct external_id
      from public.external_mappings
      where source = 'tcgplayer'
    `)).map((row) => String(row.external_id)));

    const bySet = new Map();
    for (const row of missingRows) {
      if (options.sets && !options.sets.has(row.set_code)) continue;
      const key = row.set_code;
      const entry = bySet.get(key) ?? {
        set_code: row.set_code,
        set_name: row.set_name,
        rows: [],
        children: 0,
      };
      entry.rows.push(row);
      entry.children += Number(row.child_printings ?? 0);
      bySet.set(key, entry);
    }

    const selectedSets = [...bySet.values()]
      .sort((a, b) => b.rows.length - a.rows.length || b.children - a.children || a.set_code.localeCompare(b.set_code))
      .slice(0, options.sets ? bySet.size : options.limitSets);

    const generatedAt = new Date().toISOString();
    const groups = await fetchGroups(options);
    const allCandidates = [];
    const setResults = [];
    let groupsMatched = 0;
    let productsLoaded = 0;

    for (const setEntry of selectedSets) {
      const groupsForSet = matchingGroups(setEntry, groups);
      groupsMatched += groupsForSet.length;
      const targetsByKey = new Map(setEntry.rows.map((row) => [identityKey(row), row]));
      let setProductsLoaded = 0;
      let setCandidateRows = 0;

      for (const group of groupsForSet) {
        const products = await fetchProducts(group.groupId, options);
        setProductsLoaded += products.length;
        productsLoaded += products.length;
        for (const product of products) {
          const productId = product.productId ?? product.tcgplayer_id ?? null;
          const number = extendedValue(product, 'Number');
          if (!productId || !number || !product.name) continue;
          const candidateKey = [
            setEntry.set_code,
            normalizeNumber(String(number).split('/')[0]),
            cardComparable(productCardName(product)),
          ].join('|');
          const target = targetsByKey.get(candidateKey);
          if (!target) continue;
          setCandidateRows += 1;
          allCandidates.push({
            card_print_id: target.card_print_id,
            set_code: target.set_code,
            set_name: target.set_name,
            number: target.number,
            name: target.name,
            gv_id: target.gv_id,
            child_printings: target.child_printings,
            tcgplayer_external_id: String(productId),
            tcgcsv_group_id: String(group.groupId),
            tcgcsv_group_name: group.name,
            product_name: product.name,
            product_number: String(number),
            product_rarity: extendedValue(product, 'Rarity'),
            source_url: product.url ?? `https://www.tcgplayer.com/product/${productId}`,
            image_url: product.imageUrl ?? null,
            raw_snapshot_ref: `tcgcsv:${group.groupId}:${productId}`,
            retrieved_at: generatedAt,
          });
        }
      }

      setResults.push({
        set_code: setEntry.set_code,
        set_name: setEntry.set_name,
        missing_parent_rows: setEntry.rows.length,
        missing_child_printings: setEntry.children,
        group_ids: groupsForSet.map((group) => String(group.groupId)),
        group_names: groupsForSet.map((group) => group.name),
        products_loaded: setProductsLoaded,
        candidate_rows: setCandidateRows,
        status: groupsForSet.length === 0
          ? 'source_group_not_found'
          : setCandidateRows === 0
            ? 'snapshot_loaded_no_exact_candidates'
            : 'candidate_rows_found',
      });
    }

    const classifiedRows = classifyCandidates(allCandidates, existingExternalIds)
      .sort((a, b) => a.classification.localeCompare(b.classification)
        || a.set_code.localeCompare(b.set_code)
        || normalizeNumber(a.number).localeCompare(normalizeNumber(b.number), undefined, { numeric: true })
        || a.name.localeCompare(b.name));
    const readyRows = classifiedRows.filter((row) => row.classification === 'ready_from_fresh_tcgcsv_exact_identity');
    const blockedRows = classifiedRows.filter((row) => row.classification !== 'ready_from_fresh_tcgcsv_exact_identity');

    const readyBySetMap = new Map();
    for (const row of readyRows) {
      const key = row.set_code;
      const current = readyBySetMap.get(key) ?? { set_code: row.set_code, set_name: row.set_name, ready_rows: 0 };
      current.ready_rows += 1;
      readyBySetMap.set(key, current);
    }

    const reportCore = {
      contract: 'TCGMAP06A_TCGCSV_SNAPSHOT_READINESS_V1',
      generated_at: generatedAt,
      audit_only: true,
      source_url: 'https://tcgcsv.com/docs',
      base_url: BASE_URL,
      options: {
        limit_sets: options.limitSets,
        refresh_cache: options.refreshCache,
        sets: options.sets ? [...options.sets] : null,
      },
      cache_dir: CACHE_DIR,
      summary: {
        missing_parent_rows_total: missingRows.length,
        selected_sets: selectedSets.length,
        sets_attempted: setResults.length,
        groups_matched: groupsMatched,
        products_loaded: productsLoaded,
        candidate_rows: classifiedRows.length,
        ready_rows: readyRows.length,
        blocked_rows: blockedRows.length,
      },
      classification_buckets: bucket(classifiedRows, (row) => row.classification),
      set_results: setResults,
      ready_by_set: [...readyBySetMap.values()].sort((a, b) => b.ready_rows - a.ready_rows || a.set_code.localeCompare(b.set_code)),
      ready_rows: readyRows,
      blocked_rows: blockedRows.slice(0, 1000),
      recommended_next_package: readyRows.length > 0
        ? {
            package_id: 'TCGMAP-06B-FRESH-TCGCSV-TCGPLAYER-MAPPING-INSERTS',
            allowed_after: 'guarded rollback-only dry-run using this fingerprint',
            scope_rows: readyRows.length,
            canonical_mapping_inserts_allowed_now: false,
          }
        : null,
      safety: {
        db_writes_performed: false,
        migrations_created: false,
        cleanup_performed: false,
        pricing_writes_performed: false,
        image_writes_performed: false,
        card_identity_writes_performed: false,
        child_printing_writes_performed: false,
        canonical_mapping_writes_performed: false,
      },
    };

    const fingerprint = sha256(stableJson({
      options: reportCore.options,
      summary: reportCore.summary,
      classification_buckets: reportCore.classification_buckets,
      set_results: reportCore.set_results,
      ready_rows: reportCore.ready_rows.map((row) => ({
        card_print_id: row.card_print_id,
        tcgplayer_external_id: row.tcgplayer_external_id,
        source_url: row.source_url,
      })),
      safety: reportCore.safety,
    }));

    const report = { ...reportCore, fingerprint_sha256: fingerprint };
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
    console.log(`Wrote ${OUTPUT_JSON}`);
    console.log(`Wrote ${OUTPUT_MD}`);
    console.log(`fingerprint=${fingerprint}`);
    console.log(`ready_rows=${readyRows.length}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
