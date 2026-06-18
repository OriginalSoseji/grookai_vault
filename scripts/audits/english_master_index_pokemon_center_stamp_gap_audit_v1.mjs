import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { config as loadDotenv } from 'dotenv';
import pg from 'pg';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

loadDotenv({ path: '.env.local', quiet: true });

const { Client } = pg;
const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const OUT_DIR = path.join(DEFAULT_OUTPUT_DIR, 'english_master_index_v1', 'pokemon_center_stamp_gap_v1');
const OUT_JSON = path.join(OUT_DIR, 'pokemon_center_stamp_gap_audit_v1.json');
const OUT_MD = path.join(OUT_DIR, 'pokemon_center_stamp_gap_audit_v1.md');

const PACKAGE_ID = 'POKEMON-CENTER-STAMP-GAP-AUDIT-V1';
const TCGCSV_CATEGORY_ID = 3;
const TCGCSV_GROUPS = [
  { group_id: 22872, set_key: 'svp', set_name: 'Scarlet & Violet Black Star Promos' },
  { group_id: 24451, set_key: 'mep', set_name: 'MEP Black Star Promos' },
];

const PRICECHARTING_SOURCE_URL = 'https://www.pricecharting.com/price-guide/download-custom?category=pokemon-cards';

function connectionString() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).replaceAll('\\', '/');
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

function cleanName(value) {
  return String(value ?? '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/\s*\[[^\]]+\]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().replace(/^0+(?=\d)/, '');
}

function pad3(value) {
  const raw = normalizeNumber(value);
  return /^\d+$/.test(raw) ? raw.padStart(3, '0') : raw;
}

function sourceKey(setKey, cardNumber, cardName, variantKey = 'pokemon_center_stamp') {
  return `${setKey}:${pad3(cardNumber)}:${normalizeText(cardName)}:${variantKey}`;
}

function extendedValue(product, name) {
  return product.extendedData?.find((entry) => entry.name === name || entry.displayName === name)?.value ?? null;
}

function priceSubtypeToFinish(subtypes) {
  const values = new Set((subtypes ?? []).map((item) => normalizeText(item)));
  if (values.has('holofoil') || values.has('holo')) return 'holo';
  if (values.has('reverse holofoil') || values.has('reverse holo')) return 'reverse';
  if (values.has('normal')) return 'normal';
  return null;
}

function isRelevantPokemonCenterProductName(name) {
  const text = normalizeText(searchText(name));
  if (!text.includes('pokemon center')) return false;
  if (text.includes('elite trainer box') || text.includes('code card') || text.includes('case')) return false;
  if (text === 'pokemon center' || text.startsWith('pokemon center ') || text.includes(' pokemon center lady')) return false;
  return text.includes('exclusive') || text.includes('stamp') || /\bpokemon center\b/.test(text);
}

function parseTcgcsvProduct(product, group, priceSubtypes) {
  const number = extendedValue(product, 'Number');
  const productName = String(product.name ?? '');
  const cardName = cleanName(productName.split(/\s+-\s+/)[0]);
  if (!number || !cardName || !isRelevantPokemonCenterProductName(productName)) return null;
  return {
    key: sourceKey(group.set_key, number, cardName),
    set_key: group.set_key,
    set_name: group.set_name,
    card_number: pad3(number),
    card_name: cardName,
    variant_key: 'pokemon_center_stamp',
    printed_identity_modifier: 'pokemon_center_stamp',
    child_finish_key: priceSubtypeToFinish(priceSubtypes) ?? 'needs_finish_review',
    source_key: 'tcgcsv_tcgplayer_product',
    source_kind: 'marketplace_checklist',
    source_url: product.url,
    evidence_label: `TCGCSV/TCGplayer exact product: ${productName}${priceSubtypes.length ? ` / ${priceSubtypes.join(', ')}` : ''}.`,
    product_id: product.productId,
    source_set_group_id: group.group_id,
  };
}

function parsePriceChartingLine(line, header) {
  const columns = parseCsvLine(line);
  const row = Object.fromEntries(header.map((name, index) => [name, columns[index] ?? '']));
  const consoleName = row['console-name'];
  const productName = row['product-name'];
  if (!consoleName || !productName) return null;
  if (/Japanese|Chinese|Korean/i.test(consoleName)) return null;
  if (!/pokemon center/i.test(productName)) return null;
  if (/Elite Trainer Box|Code Card|Foil Pack|Set$|Gym Box|Special Box/i.test(productName)) return null;
  if (/^Pokemon Center(?:\s|$)|Pokemon Center \[|Pokemon Center #[0-9]/i.test(productName)) return null;

  const numberMatch = productName.match(/#\s*([A-Za-z0-9.]+)/);
  if (!numberMatch) return null;
  const rawNumber = numberMatch[1];
  const cardName = cleanName(productName.replace(/\s*\[[^\]]*Pokemon Center[^\]]*\]\s*/i, ' ').replace(/\s*#\s*[A-Za-z0-9.]+.*$/i, ''));
  if (!cardName) return null;

  let setKey = null;
  if (consoleName === 'Pokemon Promo') setKey = 'svp';
  if (consoleName === 'Pokemon Scarlet & Violet') setKey = 'sv01';
  if (consoleName === 'Pokemon Scarlet & Violet 151') setKey = 'sv03.5';
  if (consoleName === 'Pokemon Promo' && ['51', '52'].includes(normalizeNumber(rawNumber)) && /NY/i.test(productName)) setKey = 'basep';
  if (consoleName === 'Pokemon Promo' && ['9', '10', '22', '31', '70', '80'].includes(normalizeNumber(rawNumber))) setKey = 'mep';
  if (!setKey) return null;

  const variantKey = /NY/i.test(productName) && setKey === 'basep' ? 'pokemon_center_ny_stamp' : 'pokemon_center_stamp';
  return {
    key: sourceKey(setKey, rawNumber, cardName, variantKey),
    set_key: setKey,
    set_name: consoleName,
    card_number: pad3(rawNumber),
    card_name: cardName,
    variant_key: variantKey,
    printed_identity_modifier: variantKey,
    child_finish_key: setKey === 'basep' ? 'normal' : (setKey === 'sv03.5' && normalizeText(cardName) === 'squirtle' ? 'reverse' : null),
    source_key: 'pricecharting_csv_promo_exact',
    source_kind: 'marketplace_checklist',
    source_url: `https://www.pricecharting.com/game/${slugConsole(consoleName)}/${slugProduct(productName)}`,
    evidence_label: `PriceCharting CSV exact product ${row.id}: ${productName} (${consoleName}).`,
    product_id: row.id,
    tcg_id: row['tcg-id'] || null,
    release_date: row['release-date'] || null,
  };
}

function slugConsole(consoleName) {
  if (consoleName === 'Pokemon Promo') return 'pokemon-promo';
  if (consoleName === 'Pokemon Scarlet & Violet') return 'pokemon-scarlet-%26-violet';
  if (consoleName === 'Pokemon Scarlet & Violet 151') return 'pokemon-scarlet-%26-violet-151';
  return normalizeText(consoleName).replaceAll(' ', '-');
}

function slugProduct(productName) {
  return String(productName)
    .toLowerCase()
    .replace(/&/g, '%26')
    .replace(/'/g, '%27')
    .replace(/\[/g, '')
    .replace(/\]/g, '')
    .replace(/#/g, '')
    .replace(/[^a-z0-9%]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        cur += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  out.push(cur);
  return out;
}

async function fetchJson(url) {
  const { stdout } = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--silent',
    '--show-error',
    '--location',
    '--max-time',
    '120',
    '--user-agent',
    'Grookai Pokemon Center Stamp Audit/1.0',
    url,
  ], { timeout: 140000, maxBuffer: 80 * 1024 * 1024 });
  return JSON.parse(stdout);
}

async function fetchTcgcsvEvidence() {
  const evidence = [];
  for (const group of TCGCSV_GROUPS) {
    const [productsPayload, pricesPayload] = await Promise.all([
      fetchJson(`https://tcgcsv.com/tcgplayer/${TCGCSV_CATEGORY_ID}/${group.group_id}/products`),
      fetchJson(`https://tcgcsv.com/tcgplayer/${TCGCSV_CATEGORY_ID}/${group.group_id}/prices`),
    ]);
    const pricesByProductId = new Map();
    for (const price of pricesPayload.results ?? []) {
      const productId = String(price.productId);
      const list = pricesByProductId.get(productId) ?? [];
      list.push(price.subTypeName ?? price.subType ?? price.printing ?? null);
      pricesByProductId.set(productId, list.filter(Boolean));
    }
    for (const product of productsPayload.results ?? []) {
      const parsed = parseTcgcsvProduct(product, group, pricesByProductId.get(String(product.productId)) ?? []);
      if (parsed) evidence.push(parsed);
    }
  }
  return evidence;
}

async function fetchPriceChartingEvidence() {
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) return { evidence: [], status: 'token_unavailable' };

  const tmpFile = path.join(os.tmpdir(), `grookai_pricecharting_pokemon_cards_${Date.now()}.csv`);
  const url = `https://www.pricecharting.com/price-guide/download-custom?t=${encodeURIComponent(token)}&category=pokemon-cards`;
  try {
    await execFileAsync('curl.exe', [
      '--ssl-no-revoke',
      '--silent',
      '--show-error',
      '--location',
      '--max-time',
      '120',
      '--user-agent',
      'Grookai Pokemon Center Stamp Audit/1.0',
      '--output',
      tmpFile,
      url,
    ], { timeout: 140000, maxBuffer: 512 * 1024 });
    const text = await fs.readFile(tmpFile, 'utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = parseCsvLine(lines[0]);
    const evidence = lines.slice(1)
      .map((line) => parsePriceChartingLine(line, header))
      .filter(Boolean);
    return { evidence, status: 'loaded_with_local_tls_workaround', row_count: lines.length - 1 };
  } finally {
    await fs.rm(tmpFile, { force: true }).catch(() => {});
  }
}

async function readPublishableStampedEvidence() {
  const out = [];
  for (const setKey of ['basep', 'svp', 'sv03.5']) {
    const filePath = path.join(ROOT, 'docs', 'audits', 'english_master_index_publishable_v1', 'sets', setKey, 'printings.json');
    const payload = JSON.parse(await fs.readFile(filePath, 'utf8'));
    for (const row of payload.printings ?? []) {
      if (row.finish_key !== 'stamped') continue;
      const isExplicitPokemonCenterLane = (
        (setKey === 'basep' && ['51', '52'].includes(normalizeNumber(row.card_number)))
        || (setKey === 'sv03.5' && normalizeNumber(row.card_number) === '7' && normalizeText(row.card_name) === 'squirtle')
        || (row.evidence_urls ?? []).some((url) => /pokemon-center|pokemon_center/i.test(String(url)))
      );
      if (!isExplicitPokemonCenterLane) continue;
      out.push({
        key: sourceKey(setKey, row.card_number, row.card_name, setKey === 'basep' ? 'pokemon_center_ny_stamp' : 'pokemon_center_stamp'),
        set_key: setKey,
        set_name: row.set_name,
        card_number: pad3(row.card_number),
        card_name: row.card_name,
        variant_key: setKey === 'basep' ? 'pokemon_center_ny_stamp' : 'pokemon_center_stamp',
        printed_identity_modifier: setKey === 'basep' ? 'pokemon_center_ny_stamp' : 'pokemon_center_stamp',
        child_finish_key: setKey === 'basep' ? 'normal' : (setKey === 'sv03.5' && normalizeText(row.card_name) === 'squirtle' ? 'reverse' : null),
        source_key: 'verified_master_index_publishable',
        source_kind: 'collector_reference',
        source_url: row.evidence_urls?.[0] ?? null,
        evidence_label: `Verified Master Index publishable stamped lane: ${row.card_name} #${row.card_number}.`,
        evidence_urls: row.evidence_urls ?? [],
      });
    }
  }
  return out;
}

function curatedExactEvidence() {
  return [
    {
      key: sourceKey('sv01', '155', 'Lechonk'),
      set_key: 'sv01',
      set_name: 'Pokemon Scarlet & Violet',
      card_number: '155',
      card_name: 'Lechonk',
      variant_key: 'pokemon_center_stamp',
      printed_identity_modifier: 'pokemon_center_stamp',
      child_finish_key: 'reverse',
      source_key: 'official_pokemon_center_product',
      source_kind: 'official_gallery',
      source_url: 'https://www.pokemoncenter.com/product/158-85487/lechonk-promo-card',
      evidence_label: 'Official Pokemon Center product page identifies the Lechonk promo as a special foil card with the Pokemon Center logo.',
    },
    {
      key: sourceKey('sv01', '155', 'Lechonk'),
      set_key: 'sv01',
      set_name: 'Pokemon Scarlet & Violet',
      card_number: '155',
      card_name: 'Lechonk',
      variant_key: 'pokemon_center_stamp',
      printed_identity_modifier: 'pokemon_center_stamp',
      child_finish_key: 'reverse',
      source_key: 'tcgplayer_product_page',
      source_kind: 'marketplace_checklist',
      source_url: 'https://www.tcgplayer.com/product/485260/pokemon-miscellaneous-cards-and-products-lechonk-pokemon-center-exclusive',
      evidence_label: 'TCGplayer product page identifies Lechonk (Pokemon Center Exclusive) as the foil Pokemon Center stamped release.',
    },
    {
      key: sourceKey('sv01', '155', 'Lechonk'),
      set_key: 'sv01',
      set_name: 'Pokemon Scarlet & Violet',
      card_number: '155',
      card_name: 'Lechonk',
      variant_key: 'pokemon_center_stamp',
      printed_identity_modifier: 'pokemon_center_stamp',
      child_finish_key: 'reverse',
      source_key: 'collector_retail_checklist',
      source_kind: 'marketplace_checklist',
      source_url: 'https://store.401games.ca/products/lechonk-pokemon-center-155-198-common-reverse-holo',
      evidence_label: '401 Games exact product page labels Lechonk [Pokemon Center] 155/198 as Common Reverse Holo.',
    },
  ];
}

async function readDbState(client) {
  const result = await client.query(
    `select
       cp.id::text,
       cp.gv_id,
       cp.name,
       cp.set_code,
       cp.number,
       cp.number_plain,
       cp.rarity,
       coalesce(cp.variant_key, '') as variant_key,
       cp.printed_identity_modifier,
       array_agg(distinct cpr.finish_key order by cpr.finish_key) filter (where cpr.id is not null) as finishes
     from public.card_prints cp
     left join public.card_printings cpr on cpr.card_print_id = cp.id
     where cp.set_code in ('basep', 'mep', 'sv01', 'sv03.5', 'svp')
     group by cp.id, cp.gv_id, cp.name, cp.set_code, cp.number, cp.number_plain, cp.rarity, cp.variant_key, cp.printed_identity_modifier`,
  );
  return result.rows;
}

function mergeEvidence(...sources) {
  const byKey = new Map();
  for (const source of sources.flat()) {
    const existing = byKey.get(source.key) ?? {
      key: source.key,
      set_key: source.set_key,
      set_name: source.set_name,
      card_number: source.card_number,
      card_name: source.card_name,
      variant_key: source.variant_key,
      printed_identity_modifier: source.printed_identity_modifier,
      child_finish_key: source.child_finish_key,
      evidence: [],
    };
    if (!existing.child_finish_key && source.child_finish_key) existing.child_finish_key = source.child_finish_key;
    existing.evidence.push({
      source_key: source.source_key,
      source_kind: source.source_kind,
      source_url: source.source_url,
      evidence_label: source.evidence_label,
      product_id: source.product_id ?? null,
      tcg_id: source.tcg_id ?? null,
      release_date: source.release_date ?? null,
      evidence_urls: source.evidence_urls ?? undefined,
    });
    byKey.set(source.key, existing);
  }
  return Array.from(byKey.values()).sort((left, right) => (
    String(left.set_key).localeCompare(String(right.set_key))
    || normalizeNumber(left.card_number).localeCompare(normalizeNumber(right.card_number), undefined, { numeric: true })
    || String(left.card_name).localeCompare(String(right.card_name))
  ));
}

function classifyCandidates(candidates, dbRows) {
  const baseByKey = new Map();
  const variantByKey = new Map();
  for (const row of dbRows) {
    const baseKey = `${row.set_code}:${pad3(row.number)}:${normalizeText(row.name)}`;
    if (!row.variant_key && !row.printed_identity_modifier) baseByKey.set(baseKey, row);
    if (row.variant_key || row.printed_identity_modifier) {
      variantByKey.set(sourceKey(row.set_code, row.number, row.name, row.variant_key || row.printed_identity_modifier), row);
    }
  }

  return candidates.map((candidate) => {
    const baseKey = `${candidate.set_key}:${pad3(candidate.card_number)}:${normalizeText(candidate.card_name)}`;
    const baseParent = baseByKey.get(baseKey) ?? null;
    const variantParent = variantByKey.get(candidate.key) ?? null;
    const sourceFamilies = new Set(candidate.evidence.map((item) => item.source_key));
    const hasTcgcsv = sourceFamilies.has('tcgcsv_tcgplayer_product');
    const hasPriceCharting = sourceFamilies.has('pricecharting_csv_promo_exact');
    const hasMasterIndex = sourceFamilies.has('verified_master_index_publishable');
    const hasOfficial = sourceFamilies.has('official_pokemon_center_product');
    const hasCollectorRetail = sourceFamilies.has('collector_retail_checklist') || sourceFamilies.has('tcgplayer_product_page');
    const finish = candidate.child_finish_key;
    let status = 'blocked_needs_review';
    let reason = 'not_enough_independent_source_or_finish_evidence';

    if (!baseParent) {
      status = 'blocked_base_parent_missing';
      reason = 'underlying canonical parent not found';
    } else if (!finish || finish === 'needs_finish_review') {
      status = 'blocked_finish_needs_review';
      reason = 'exact child finish could not be resolved';
    } else if (variantParent && (variantParent.finishes ?? []).includes(finish)) {
      status = 'existing_complete';
      reason = 'variant parent and target child finish already exist';
    } else if (variantParent) {
      status = 'ready_child_missing_existing_parent';
      reason = 'variant parent exists but target child finish is missing';
    } else if (
      (hasTcgcsv && hasPriceCharting)
      || (hasTcgcsv && hasMasterIndex)
      || (hasPriceCharting && hasMasterIndex)
      || (hasPriceCharting && hasOfficial)
      || (hasPriceCharting && hasCollectorRetail)
      || (hasOfficial && hasCollectorRetail)
    ) {
      status = 'ready_parent_and_child_missing';
      reason = 'two source families support exact identity; target parent is missing';
    }

    return {
      ...candidate,
      status,
      reason,
      source_count: candidate.evidence.length,
      source_families: Array.from(sourceFamilies).sort(),
      base_parent_id: baseParent?.id ?? null,
      base_parent_gv_id: baseParent?.gv_id ?? null,
      base_finishes: baseParent?.finishes ?? [],
      existing_variant_parent_id: variantParent?.id ?? null,
      existing_variant_gv_id: variantParent?.gv_id ?? null,
      existing_variant_finishes: variantParent?.finishes ?? [],
    };
  });
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function renderMarkdown(report) {
  const rows = report.rows;
  const actionable = rows.filter((row) => row.status.startsWith('ready_'));
  const blocked = rows.filter((row) => row.status.startsWith('blocked_'));
  const existing = rows.filter((row) => row.status === 'existing_complete');
  return `# Pokemon Center Stamp Gap Audit V1

Audit-only source discovery and DB comparison for English physical Pokemon Center stamped card identity variants.

## Safety

- db_writes_performed: ${report.db_writes_performed}
- migrations_created: ${report.migrations_created}
- cleanup_performed: ${report.cleanup_performed}
- raw_pricecharting_csv_committed: ${report.raw_pricecharting_csv_committed}
- source_tls_note: ${report.source_tls_note}

## Summary

- candidate_rows: ${rows.length}
- ready_parent_and_child_missing: ${report.summary.by_status.ready_parent_and_child_missing ?? 0}
- ready_child_missing_existing_parent: ${report.summary.by_status.ready_child_missing_existing_parent ?? 0}
- existing_complete: ${report.summary.by_status.existing_complete ?? 0}
- blocked: ${blocked.length}

## Ready Rows

${markdownTable(['set', 'number', 'card', 'variant', 'finish', 'status', 'sources'], actionable.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.child_finish_key,
    row.status,
    row.source_families.join(', '),
  ]))}

## Existing Complete

${markdownTable(['set', 'number', 'card', 'variant', 'finish'], existing.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.variant_key,
    row.child_finish_key,
  ]))}

## Blocked / Review

${markdownTable(['set', 'number', 'card', 'finish', 'status', 'reason', 'sources'], blocked.map((row) => [
    row.set_key,
    row.card_number,
    row.card_name,
    row.child_finish_key ?? '',
    row.status,
    row.reason,
    row.source_families.join(', '),
  ]))}

## Notes

- Pokemon Center stamps are parent identity variants, not \`finish_key=stamped\` child rows.
- Child printings must use the real active finish such as \`holo\`, \`reverse\`, or \`normal\`.
- Ordinary Trainer cards named "Pokemon Center" and sealed Pokemon Center ETB products are excluded.
- This report does not authorize DB writes. Ready rows still require guarded dry-run proof before apply.
`;
}

async function main() {
  const dbUrl = connectionString();
  if (!dbUrl) throw new Error('Missing database connection string.');

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const [tcgcsvEvidence, priceChartingResult, masterEvidence, dbRows] = await Promise.all([
      fetchTcgcsvEvidence(),
      fetchPriceChartingEvidence(),
      readPublishableStampedEvidence(),
      readDbState(client),
    ]);

    const curatedEvidence = curatedExactEvidence();
    const candidates = mergeEvidence(tcgcsvEvidence, priceChartingResult.evidence, masterEvidence, curatedEvidence);
    const rows = classifyCandidates(candidates, dbRows);
    const report = {
      package_id: PACKAGE_ID,
      generated_at: new Date().toISOString(),
      audit_only: true,
      db_writes_performed: false,
      migrations_created: false,
      cleanup_performed: false,
      quarantine_performed: false,
      raw_pricecharting_csv_committed: false,
      source_tls_note: priceChartingResult.status === 'loaded_with_local_tls_workaround'
        ? 'PriceCharting CSV acquisition used curl --ssl-no-revoke due local Windows TLS chain behavior; no insecure behavior is used by runtime code.'
        : priceChartingResult.status,
      source_counts: {
        tcgcsv_tcgplayer_product: tcgcsvEvidence.length,
        pricecharting_csv_promo_exact: priceChartingResult.evidence.length,
        verified_master_index_publishable: masterEvidence.length,
        curated_exact_evidence: curatedEvidence.length,
      },
      pricecharting_rows_scanned: priceChartingResult.row_count ?? null,
      summary: {
        by_status: countBy(rows, (row) => row.status),
        by_set: countBy(rows, (row) => row.set_key),
        by_finish: countBy(rows, (row) => row.child_finish_key ?? 'unknown'),
      },
      fingerprint_sha256: sha256(stableJson({
        candidates: rows.map((row) => ({
          key: row.key,
          status: row.status,
          finish: row.child_finish_key,
          base_parent_id: row.base_parent_id,
          existing_variant_parent_id: row.existing_variant_parent_id,
          sources: row.source_families,
        })),
      })),
      rows,
      output_files: {
        json: rel(OUT_JSON),
        md: rel(OUT_MD),
      },
    };

    await writeJson(OUT_JSON, report);
    await writeText(OUT_MD, renderMarkdown(report));
    console.log(JSON.stringify({
      output_json: rel(OUT_JSON),
      output_md: rel(OUT_MD),
      fingerprint_sha256: report.fingerprint_sha256,
      summary: report.summary,
      source_counts: report.source_counts,
    }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
