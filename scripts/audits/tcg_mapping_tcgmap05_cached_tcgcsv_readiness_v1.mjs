import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/tcg_mapping_v1';
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'tcgmap05_cached_tcgcsv_readiness_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'tcgmap05_cached_tcgcsv_readiness_v1.md');
const CACHE_DIRS = [
  'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_acquisition_v1/cache',
  'docs/audits/english_master_index_source_exhaustion_v1/tcgcsv_prize_pack_acquisition_v1/cache',
];

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

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
}

function markdownTable(rows, columns) {
  if (!rows.length) return '_None._';
  return [
    `| ${columns.map((column) => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map((column) => String(column.value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
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

function normalizeNumber(value) {
  const raw = String(value ?? '').trim();
  const left = raw.split('/')[0]?.trim() ?? raw;
  return left.replace(/^0+(?=\d)/, '').toLowerCase();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, '-');
}

function stripTcgplayerNumericDisambiguator(value) {
  return String(value ?? '').replace(/\s+\(\d+[a-z]?\)$/i, '').trim();
}

function displayFromSlug(slug) {
  return String(slug ?? '')
    .split('-')
    .filter(Boolean)
    .map((part) => part ? `${part.slice(0, 1).toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
}

function deriveSetName(product) {
  const explicit = product.setName ?? product.set_name ?? product.groupName ?? product.raw_payload?.setName ?? null;
  if (explicit) return explicit;

  const slug = String(product.url ?? '').split('/').filter(Boolean).at(-1) ?? '';
  if (!slug.startsWith('pokemon-')) return null;

  const withoutCategory = slug.slice('pokemon-'.length);
  const rawNameSlug = slugify(product.name);
  const cleanNameSlug = slugify(stripTcgplayerNumericDisambiguator(product.name));
  for (const nameSlug of [rawNameSlug, cleanNameSlug].filter(Boolean).sort((a, b) => b.length - a.length)) {
    const suffix = `-${nameSlug}`;
    if (withoutCategory.endsWith(suffix)) {
      return displayFromSlug(withoutCategory.slice(0, -suffix.length));
    }
  }

  return null;
}

function extendedValue(product, names) {
  const wanted = new Set(names.map((name) => normalizeText(name)));
  for (const row of product.extendedData ?? []) {
    if (wanted.has(normalizeText(row.name)) || wanted.has(normalizeText(row.displayName))) {
      return row.value ?? null;
    }
  }
  return null;
}

async function listJsonFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(dir, entry.name));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function loadProducts() {
  const files = (await Promise.all(CACHE_DIRS.map(listJsonFiles))).flat();
  const products = [];
  for (const file of files) {
    const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
    for (const product of parsed.results ?? []) {
      const productId = product.productId ?? product.tcgplayer_id ?? null;
      const setName = deriveSetName(product);
      const number = extendedValue(product, ['Number', 'Card Number']);
      if (!productId || !setName || !number || !product.name) continue;
      const cardName = stripTcgplayerNumericDisambiguator(product.name);
      products.push({
        product_id: String(productId),
        set_name: setName,
        card_number: String(number),
        card_name: cardName,
        rarity: extendedValue(product, ['Rarity']),
        url: product.url ?? `https://www.tcgplayer.com/product/${productId}`,
        image_url: product.imageUrl ?? null,
        source_cache_file: file,
        group_id: product.groupId ?? null,
        normalized_set_name: normalizeText(setName),
        normalized_number: normalizeNumber(number),
        normalized_name: normalizeText(cardName),
      });
    }
  }
  return products;
}

async function queryRows(client, sql, params = []) {
  const result = await client.query(sql, params);
  return result.rows;
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
    let classification = 'ready_from_cached_tcgcsv_exact_identity';
    if (externalIdExistsAnywhere) classification = 'blocked_existing_tcgplayer_external_id_collision';
    else if (rowsPerParent > 1) classification = 'blocked_multi_cached_products_for_parent';
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
    const value = out.get(key) ?? {
      key,
      rows: 0,
      parents: new Set(),
      sets: new Set(),
    };
    value.rows += 1;
    value.parents.add(row.card_print_id);
    value.sets.add(row.set_code);
    out.set(key, value);
  }
  return [...out.values()].map((value) => ({
    key: value.key,
    rows: value.rows,
    parents: value.parents.size,
    sets: value.sets.size,
  })).sort((a, b) => b.rows - a.rows || a.key.localeCompare(b.key));
}

function buildMarkdown(report) {
  const lines = [];
  lines.push('# TCGMAP-05 Cached TCGCSV Readiness V1');
  lines.push('');
  lines.push('Audit-only exact identity matcher from preserved TCGCSV/TCGplayer product cache. No DB writes, no migrations, no pricing writes.');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- fingerprint: \`${report.fingerprint_sha256}\``);
  lines.push(`- generated_at: \`${report.generated_at}\``);
  lines.push(`- cache_products_loaded: ${report.totals.cache_products_loaded}`);
  lines.push(`- missing_tcgplayer_parents: ${report.totals.missing_tcgplayer_parents}`);
  lines.push(`- candidate_rows: ${report.totals.candidate_rows}`);
  lines.push(`- ready_rows: ${report.totals.ready_rows}`);
  lines.push(`- blocked_rows: ${report.totals.blocked_rows}`);
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
  lines.push('## Ready By Set');
  lines.push('');
  lines.push(markdownTable(report.ready_by_set.slice(0, 30), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'name', value: (row) => row.set_name },
    { label: 'ready', value: (row) => row.ready_rows },
  ]));
  lines.push('');
  lines.push('## Ready Sample');
  lines.push('');
  lines.push(markdownTable(report.ready_rows.slice(0, 25), [
    { label: 'set', value: (row) => row.set_code },
    { label: 'number', value: (row) => row.number },
    { label: 'name', value: (row) => row.name },
    { label: 'card_print_id', value: (row) => `\`${row.card_print_id}\`` },
    { label: 'tcgplayer', value: (row) => `\`${row.tcgplayer_external_id}\`` },
  ]));
  lines.push('');
  lines.push('## Guardrails');
  lines.push('');
  lines.push('- db_writes_performed: false');
  lines.push('- migrations_created: false');
  lines.push('- cleanup_performed: false');
  lines.push('- pricing_writes_performed: false');
  lines.push('- image_writes_performed: false');
  lines.push('');
  if (report.recommended_next_package) {
    lines.push('## Recommended Next Package');
    lines.push('');
    lines.push(`\`${report.recommended_next_package.package_id}\` guarded dry-run only.`);
    lines.push(`Target rows: ${report.recommended_next_package.target_rows}`);
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection URL.');

  const products = await loadProducts();
  const productByKey = new Map();
  for (const product of products) {
    const key = `${product.normalized_set_name}|${product.normalized_number}|${product.normalized_name}`;
    if (!productByKey.has(key)) productByKey.set(key, []);
    productByKey.get(key).push(product);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'tcgmap05_cached_tcgcsv_readiness_v1',
  });

  await client.connect();
  try {
    const missingParents = await queryRows(client, `
      select
        cp.id::text as card_print_id,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.name,
        cp.gv_id
      from public.card_prints cp
      left join public.sets s on s.id = cp.set_id
      where cp.identity_domain = 'pokemon_eng_standard'
        and not exists (
          select 1
          from public.external_mappings em
          where em.card_print_id = cp.id
            and em.source = 'tcgplayer'
            and em.active = true
        )
      order by cp.set_code, cp.number, cp.name, cp.id`);

    const existingExternalIds = new Set((await queryRows(client, `
      select external_id
      from public.external_mappings
      where source = 'tcgplayer'
        and external_id is not null`)).map((row) => String(row.external_id)));

    const candidateRows = [];
    for (const parent of missingParents) {
      const key = `${normalizeText(parent.set_name)}|${normalizeNumber(parent.number)}|${normalizeText(parent.name)}`;
      for (const product of productByKey.get(key) ?? []) {
        candidateRows.push({
          card_print_id: parent.card_print_id,
          set_code: parent.set_code,
          set_name: parent.set_name,
          number: parent.number,
          name: parent.name,
          gv_id: parent.gv_id,
          tcgplayer_external_id: product.product_id,
          source_url: product.url,
          source_cache_file: product.source_cache_file,
          source_group_id: product.group_id,
          source_rarity: product.rarity,
          source_image_url: product.image_url,
          match_rule: 'normalized_set_name+number+name',
        });
      }
    }

    const classifiedRows = classifyCandidates(candidateRows, existingExternalIds);
    const readyRows = classifiedRows
      .filter((row) => row.classification === 'ready_from_cached_tcgcsv_exact_identity')
      .sort((a, b) => a.set_code.localeCompare(b.set_code) || a.number.localeCompare(b.number, undefined, { numeric: true }) || a.name.localeCompare(b.name));
    const blockedRows = classifiedRows.filter((row) => row.classification !== 'ready_from_cached_tcgcsv_exact_identity');
    const readyBySetMap = new Map();
    for (const row of readyRows) {
      const key = `${row.set_code}|${row.set_name}`;
      const value = readyBySetMap.get(key) ?? { set_code: row.set_code, set_name: row.set_name, ready_rows: 0 };
      value.ready_rows += 1;
      readyBySetMap.set(key, value);
    }

    const report = {
      contract: 'TCGMAP05_CACHED_TCGCSV_READINESS_V1',
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      pricing_writes_performed: false,
      image_writes_performed: false,
      scope: 'English physical card_prints missing active tcgplayer mapping matched to preserved TCGCSV/TCGplayer product cache by exact normalized set name, card number, and card name',
      cache_dirs: CACHE_DIRS,
      totals: {
        cache_products_loaded: products.length,
        cache_identity_keys: productByKey.size,
        missing_tcgplayer_parents: missingParents.length,
        candidate_rows: classifiedRows.length,
        ready_rows: readyRows.length,
        ready_parents: new Set(readyRows.map((row) => row.card_print_id)).size,
        blocked_rows: blockedRows.length,
      },
      classification_buckets: bucket(classifiedRows, (row) => row.classification),
      ready_by_set: [...readyBySetMap.values()].sort((a, b) => b.ready_rows - a.ready_rows || a.set_code.localeCompare(b.set_code)),
      ready_rows: readyRows,
      blocked_rows_sample: blockedRows.slice(0, 500),
      recommended_next_package: readyRows.length > 0
        ? {
            package_id: 'TCGMAP-05A-CACHED-TCGCSV-TCGPLAYER-MAPPING-INSERTS',
            mode: 'guarded_dry_run_only',
            target_rows: readyRows.length,
          }
        : null,
    };
    report.fingerprint_sha256 = sha256(stableJson({
      contract: report.contract,
      totals: report.totals,
      readyRows: readyRows.map((row) => ({
        card_print_id: row.card_print_id,
        tcgplayer_external_id: row.tcgplayer_external_id,
        source_url: row.source_url,
      })),
    }));

    await writeJson(OUTPUT_JSON, report);
    await writeText(OUTPUT_MD, buildMarkdown(report));

    console.log(JSON.stringify({
      output_json: OUTPUT_JSON,
      output_md: OUTPUT_MD,
      fingerprint_sha256: report.fingerprint_sha256,
      totals: report.totals,
      recommended_next_package: report.recommended_next_package,
      db_writes_performed: false,
      migrations_created: false,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('[tcgmap05-readiness] failed:', error);
  process.exit(1);
});
