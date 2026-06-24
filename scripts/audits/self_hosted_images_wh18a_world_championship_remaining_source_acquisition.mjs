import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const execFileAsync = promisify(execFile);
const { Client } = pg;

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'audits', 'image_truth_v1');
const STAGING_DIR = path.join(ROOT, 'tmp', 'nonproduction_image_staging', 'image_truth_v1', 'wh18a-world-championship-remaining-source-acquisition');
const CACHE_DIR = path.join(OUTPUT_DIR, 'cache_wh18a_world_championship_sources_v1');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh18a_world_championship_remaining_source_acquisition_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh18a_world_championship_remaining_source_acquisition_summary_v1.md');
const ROWS_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh18a_world_championship_remaining_source_acquisition_rows_v1.jsonl');
const EXACT_MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh18a_world_championship_remaining_exact_upload_manifest_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-18A-WORLD-CHAMPIONSHIP-REMAINING-SOURCE-ACQUISITION';
const USER_AGENT = 'GrookaiImageTruthAudit/1.0 (+read-only; world-championship-source-acquisition)';

function parseArgs(argv) {
  const args = {
    limit: Number.parseInt(process.env.WH18A_LIMIT ?? '0', 10),
    offset: Number.parseInt(process.env.WH18A_OFFSET ?? '0', 10),
    delayMs: Number.parseInt(process.env.WH18A_DELAY_MS ?? '250', 10),
    timeoutSec: Number.parseInt(process.env.WH18A_TIMEOUT_SEC ?? '25', 10),
    skipAssetStage: false,
    refreshBulbapediaCache: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') args.limit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--offset') args.offset = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--delay-ms') args.delayMs = Number.parseInt(argv[++index] ?? '250', 10);
    else if (arg === '--timeout-sec') args.timeoutSec = Number.parseInt(argv[++index] ?? '25', 10);
    else if (arg === '--skip-asset-stage') args.skipAssetStage = true;
    else if (arg === '--refresh-bulbapedia-cache') args.refreshBulbapediaCache = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  args.limit = Math.max(0, args.limit || 0);
  args.offset = Math.max(0, args.offset || 0);
  args.delayMs = Math.max(0, args.delayMs || 0);
  args.timeoutSec = Math.max(10, args.timeoutSec || 25);
  return args;
}

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL
    ?? process.env.DATABASE_URL
    ?? process.env.POSTGRES_URL
    ?? process.env.POSTGRES_PRISMA_URL
    ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bex\b/g, ' ex ')
    .replace(/\bgx\b/g, ' gx ')
    .replace(/\blv\.?\s*x\b/g, ' lv x ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slug(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\blv\.?\s*x\b/g, 'lv-x')
    .replace(/['’]/g, '')
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeNumber(value) {
  const text = String(value ?? '').trim();
  const promo = text.match(/\b(?:dp|bw|xy|sm|swsh|sv)\s*0*(\d+)\b/i);
  if (promo) return `${promo[1]}`;
  const trailing = text.match(/(\d+[a-z]?)\s*$/i);
  return trailing ? trailing[1].toLowerCase().replace(/^0+(?=\d)/, '') : text.toLowerCase();
}

function rowYear(row) {
  const direct = Number.parseInt(row.deck_year ?? '0', 10);
  if (direct) return direct;
  const match = String(row.set_code ?? row.set_name ?? '').match(/(?:wcd|world championships deck:?\s*)(\d{4})/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function priceChartingUrl(row) {
  const year = rowYear(row);
  const number = normalizeNumber(row.number);
  if (!year || !number) return null;
  return `https://www.pricecharting.com/game/pokemon-world-championships-${year}/${slug(row.name)}-${slug(number)}`;
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce((acc, key) => {
      acc[key] = canonicalizeJson(value[key]);
      return acc;
    }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

async function fetchText(url, timeoutSec) {
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    String(timeoutSec),
    '--user-agent',
    USER_AGENT,
    url,
  ], {
    timeout: (timeoutSec + 10) * 1000,
    maxBuffer: 12 * 1024 * 1024,
  });
  return result.stdout;
}

async function fetchBuffer(url, timeoutSec) {
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    String(timeoutSec),
    '--user-agent',
    USER_AGENT,
    url,
  ], {
    encoding: 'buffer',
    timeout: (timeoutSec + 10) * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
  return result.stdout;
}

function extractTitle(html) {
  const ogTitle = String(html ?? '').match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const title = String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return clean(decodeHtml(ogTitle ?? title ?? ''));
}

function extractSetLogoTitle(html) {
  const logo = String(html ?? '').match(/<img\b[^>]*class=["'][^"']*set-logo[^"']*["'][^>]*>/i)?.[0];
  if (!logo) return null;
  return clean(decodeHtml(logo.match(/\btitle=["']([^"']+)["']/i)?.[1] ?? logo.match(/\balt=["']([^"']+)["']/i)?.[1] ?? ''));
}

function extractProductImages(html) {
  const rows = [];
  const imgRegex = /<img\b[^>]*>/gi;
  for (const [tag] of String(html ?? '').matchAll(imgRegex)) {
    const src = decodeHtml(tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? '');
    if (!src.includes('storage.googleapis.com/images.pricecharting.com/')) continue;
    const alt = decodeHtml(tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? '');
    rows.push({ src, alt, tag });
  }
  const anchorRegex = /<a\b[^>]*href=["']([^"']*storage\.googleapis\.com\/images\.pricecharting\.com\/[^"']+)["'][^>]*>/gi;
  for (const [, href] of String(html ?? '').matchAll(anchorRegex)) rows.push({ src: decodeHtml(href), alt: '', tag: 'anchor_full_image' });
  return Array.from(new Map(rows.map((row) => [row.src, row])).values());
}

function directPriceChartingProductPage(row, html, title) {
  const year = rowYear(row);
  const titleText = normalizeText(title);
  const logoText = normalizeText(extractSetLogoTitle(html));
  const pageText = `${titleText} ${logoText}`;
  if (!pageText.includes(`pokemon world championships ${year}`)) return false;
  if (!titleText.includes(normalizeText(row.name))) return false;
  if (!titleText.includes(normalizeText(normalizeNumber(row.number)))) return false;
  return true;
}

function bestPriceChartingImage(row, html, title) {
  const images = extractProductImages(html)
    .filter((image) => !image.src.includes('/60.jpg'))
    .filter((image) => !image.src.includes('/thumb'));
  images.sort((left, right) => {
    const leftScore = left.src.includes('/1600.') ? 2 : left.src.includes('/240.') ? 1 : 0;
    const rightScore = right.src.includes('/1600.') ? 2 : right.src.includes('/240.') ? 1 : 0;
    return rightScore - leftScore;
  });
  const titleMatch = normalizeText(title);
  const rowName = normalizeText(row.name);
  const rowNumber = normalizeText(normalizeNumber(row.number));
  return images.find((image) => {
    const text = normalizeText(`${image.alt} ${titleMatch}`);
    return text.includes(rowName) && text.includes(rowNumber);
  }) ?? images.find((image) => image.src.includes('/1600.')) ?? images.find((image) => image.src.includes('/240.'));
}

async function stageAsset(row, assetUrl, timeoutSec) {
  const buffer = await fetchBuffer(assetUrl, timeoutSec);
  if (!buffer || buffer.length < 1500) throw new Error('asset_too_small');
  const sha256 = sha256Hex(buffer);
  const contentType = assetUrl.toLowerCase().includes('.png') ? 'image/png' : assetUrl.toLowerCase().includes('.webp') ? 'image/webp' : 'image/jpeg';
  const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = [
    'warehouse-derived',
    'self-hosted-images-v1',
    'card_prints',
    row.set_code,
    String(row.gv_id).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    `${sha256.slice(0, 24)}.${extension}`,
  ].join('/');
  const localPath = path.join(STAGING_DIR, row.set_code, `${row.gv_id}_${sha256.slice(0, 16)}.${extension}`.replace(/[^A-Za-z0-9_.-]+/g, '_'));
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, buffer);
  return {
    local_nonproduction_asset_path: path.relative(ROOT, localPath).replaceAll('\\', '/'),
    normalized_sha256: sha256,
    normalized_size_bytes: buffer.length,
    content_type: contentType,
    target_storage_bucket: 'user-card-images',
    target_storage_path: storagePath,
  };
}

function bulbapediaRawUrlFromSourceUrl(sourceUrl) {
  if (!sourceUrl) return null;
  const match = String(sourceUrl).match(/\/wiki\/([^?#]+)/);
  if (!match) return null;
  const title = decodeURIComponent(match[1]);
  const url = new URL('https://bulbapedia.bulbagarden.net/w/index.php');
  url.searchParams.set('title', title);
  url.searchParams.set('action', 'raw');
  return url.toString();
}

function cacheFileForUrl(url) {
  return path.join(CACHE_DIR, `${sha256Hex(url).slice(0, 24)}.txt`);
}

async function cachedFetchText(url, args) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cacheFile = cacheFileForUrl(url);
  if (!args.refreshBulbapediaCache) {
    try {
      return { text: await fs.readFile(cacheFile, 'utf8'), from_cache: true };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  const text = await fetchText(url, args.timeoutSec);
  await fs.writeFile(cacheFile, text, 'utf8');
  return { text, from_cache: false };
}

function verifyBulbapediaIdentity(row, raw) {
  const text = normalizeText(raw);
  const name = normalizeText(row.name);
  const number = normalizeText(normalizeNumber(row.number));
  const sourceSet = normalizeText(row.source_set_name);
  const deckName = normalizeText(row.deck_name);
  const hasName = Boolean(name && text.includes(name));
  const hasNumber = Boolean(number && text.includes(number));
  const hasSet = sourceSet ? text.includes(sourceSet) : true;
  const hasDeck = deckName ? text.includes(deckName) : true;
  if (hasName && hasNumber && hasSet && hasDeck) return { status: 'identity_source_verified', reason: 'bulbapedia_decklist_contains_deck_card_name_number_and_source_set' };
  if (hasName && hasDeck) return { status: 'identity_source_partial', reason: 'bulbapedia_decklist_contains_deck_and_card_name_but_number_or_source_set_not_confirmed' };
  return { status: 'identity_source_unverified', reason: 'bulbapedia_decklist_source_available_but_card_match_not_confirmed' };
}

async function fetchRows(args) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL/DATABASE_URL/POSTGRES_URL.');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(`
      select
        cp.id::text,
        cp.gv_id,
        cp.name,
        cp.set_code,
        s.name as set_name,
        cp.number,
        cp.variant_key,
        cp.printed_identity_modifier,
        cp.image_source,
        cp.image_path,
        cp.image_status,
        cp.image_note,
        cp.external_ids #>> '{grookai,source_url}' as source_url,
        cp.external_ids #>> '{grookai,deck_year}' as deck_year,
        cp.external_ids #>> '{grookai,deck_name}' as deck_name,
        cp.external_ids #>> '{grookai,player_name}' as player_name,
        cp.external_ids #>> '{grookai,deck_quantity}' as deck_quantity,
        cp.external_ids #>> '{grookai,source_set_name}' as source_set_name,
        cp.external_ids #>> '{grookai,source_card_number}' as source_card_number,
        cp.external_ids #>> '{grookai,source_card_reference_kind}' as source_card_reference_kind,
        cp.external_ids #>> '{grookai,source_card_print_gv_id}' as source_card_print_gv_id
      from public.card_prints cp
      join public.sets s on s.code = cp.set_code
      where cp.variant_key = 'world_championship_deck_replica'
        and cp.set_code like 'wcd%'
        and cp.image_status like 'representative%'
      order by cp.set_code, cp.number_plain nulls last, cp.gv_id
      offset $1
      limit case when $2 = 0 then 1000000 else $2 end
    `, [args.offset, args.limit]);
    return result.rows;
  } finally {
    await client.end();
  }
}

function countBy(rows, fn) {
  const counts = {};
  for (const row of rows) {
    const key = fn(row) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function renderMarkdown(summary, rows) {
  const samples = rows.slice(0, 75).map((row) => (
    `| ${row.acquisition_status} | ${row.set_code} | ${String(row.number).replace(/\|/g, '\\|')} | ${String(row.name).replace(/\|/g, '\\|')} | ${row.identity_source_status} | ${row.exact_image_status} | ${row.source_url ?? ''} |`
  )).join('\n') || '| _None_ | | | | | | |';
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Rows processed: ${summary.rows_processed}
- Exact image candidates staged: ${summary.exact_image_candidate_rows}
- Identity sources verified: ${summary.identity_source_verified_rows}
- Identity sources partial: ${summary.identity_source_partial_rows}
- Identity sources unavailable/unverified: ${summary.identity_source_unverified_rows}
- Rows with some source outcome: ${summary.rows_with_any_source_outcome}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}

## Acquisition Statuses

${Object.entries(summary.by_acquisition_status).map(([key, count]) => `- ${key}: ${count}`).join('\n')}

## Exact Image Statuses

${Object.entries(summary.by_exact_image_status).map(([key, count]) => `- ${key}: ${count}`).join('\n')}

## Samples

| status | set | number | card | identity source | exact image | source |
| --- | --- | --- | --- | --- | --- | --- |
${samples}

## Next Action

Exact candidates can move to a separate storage upload apply package only after approval. Identity-only rows are source-covered but must remain representative unless a trusted exact WCD image is acquired later.
`;
}

async function acquireRow(row, args) {
  const result = {
    ...row,
    acquisition_status: 'blocked_or_ambiguous',
    identity_source_status: 'identity_source_missing',
    identity_source_reason: 'no_bulbapedia_source_url_on_row',
    exact_image_status: 'exact_image_not_found',
    exact_image_reason: 'not_attempted',
    exact_candidate: null,
    source_outcomes: [],
  };

  if (row.source_url) {
    const rawUrl = bulbapediaRawUrlFromSourceUrl(row.source_url);
    if (rawUrl) {
      try {
        const { text, from_cache: fromCache } = await cachedFetchText(rawUrl, args);
        const verification = verifyBulbapediaIdentity(row, text);
        result.identity_source_status = verification.status;
        result.identity_source_reason = verification.reason;
        result.source_outcomes.push({
          source_kind: 'identity_decklist',
          source_name: 'Bulbapedia',
          source_url: row.source_url,
          raw_url: rawUrl,
          status: verification.status,
          reason: verification.reason,
          from_cache: fromCache,
        });
      } catch (error) {
        result.identity_source_status = 'identity_source_fetch_failed';
        result.identity_source_reason = `bulbapedia_fetch_failed:${error instanceof Error ? error.message : String(error)}`.slice(0, 240);
        result.source_outcomes.push({
          source_kind: 'identity_decklist',
          source_name: 'Bulbapedia',
          source_url: row.source_url,
          raw_url: rawUrl,
          status: result.identity_source_status,
          reason: result.identity_source_reason,
        });
      }
    }
  }

  const sourceUrl = priceChartingUrl(row);
  if (!sourceUrl) {
    result.exact_image_status = 'exact_image_blocked';
    result.exact_image_reason = 'pricecharting_url_not_derivable';
  } else {
    try {
      const html = await fetchText(sourceUrl, args.timeoutSec);
      const title = extractTitle(html);
      if (normalizeText(title) === 'just a moment') {
        result.exact_image_status = 'exact_image_blocked';
        result.exact_image_reason = 'rate_limited_by_pricecharting';
      } else if (!directPriceChartingProductPage(row, html, title)) {
        result.exact_image_status = 'exact_image_not_found';
        result.exact_image_reason = 'not_direct_matching_pricecharting_product_page';
      } else {
        const image = bestPriceChartingImage(row, html, title);
        if (!image?.src) {
          result.exact_image_status = 'exact_image_not_found';
          result.exact_image_reason = 'matching_pricecharting_product_page_but_no_asset';
        } else {
          const asset = args.skipAssetStage ? null : await stageAsset(row, image.src, args.timeoutSec);
          result.exact_image_status = 'exact_image_candidate_staged';
          result.exact_image_reason = 'pricecharting_direct_product_title_and_image_match';
          result.exact_candidate = {
            status: 'exact_candidate_staged',
            reason: result.exact_image_reason,
            source_url: sourceUrl,
            page_title: title,
            asset_url: image.src,
            image_alt: image.alt,
            asset,
          };
        }
      }
      result.source_outcomes.push({
        source_kind: 'exact_image',
        source_name: 'PriceCharting',
        source_url: sourceUrl,
        status: result.exact_image_status,
        reason: result.exact_image_reason,
      });
    } catch (error) {
      result.exact_image_status = 'exact_image_fetch_failed';
      result.exact_image_reason = `pricecharting_probe_failed:${error instanceof Error ? error.message : String(error)}`.slice(0, 240);
      result.source_outcomes.push({
        source_kind: 'exact_image',
        source_name: 'PriceCharting',
        source_url: sourceUrl,
        status: result.exact_image_status,
        reason: result.exact_image_reason,
      });
    }
  }

  if (result.exact_image_status === 'exact_image_candidate_staged') result.acquisition_status = 'exact_image_candidate_staged';
  else if (result.identity_source_status === 'identity_source_verified') result.acquisition_status = 'identity_source_verified_only';
  else if (result.identity_source_status === 'identity_source_partial') result.acquisition_status = 'identity_source_partial_only';
  else result.acquisition_status = 'blocked_or_ambiguous';
  return result;
}

async function main() {
  const args = parseArgs(process.argv);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const sourceRows = await fetchRows(args);
  const rows = [];
  for (const [index, row] of sourceRows.entries()) {
    if (index > 0 && args.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, args.delayMs));
    rows.push(await acquireRow(row, args));
  }

  const exactRows = rows.filter((row) => row.exact_image_status === 'exact_image_candidate_staged');
  const exactManifestRows = exactRows.map((row) => ({
    ...row,
    status: 'exact_candidate_staged',
    reason: row.exact_candidate.reason,
    source_url: row.exact_candidate.source_url,
    page_title: row.exact_candidate.page_title,
    asset_url: row.exact_candidate.asset_url,
    image_alt: row.exact_candidate.image_alt,
    asset: row.exact_candidate.asset,
  }));

  await fs.writeFile(ROWS_JSONL, `${rows.map((row) => JSON.stringify(row)).join('\n')}${rows.length ? '\n' : ''}`, 'utf8');
  await fs.writeFile(EXACT_MANIFEST_JSONL, `${exactManifestRows.map((row) => JSON.stringify(row)).join('\n')}${exactManifestRows.length ? '\n' : ''}`, 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'remaining_source_acquisition_no_db_no_storage_writes',
    row_offset: args.offset,
    row_limit: args.limit,
    rows_processed: rows.length,
    exact_image_candidate_rows: exactRows.length,
    identity_source_verified_rows: rows.filter((row) => row.identity_source_status === 'identity_source_verified').length,
    identity_source_partial_rows: rows.filter((row) => row.identity_source_status === 'identity_source_partial').length,
    identity_source_unverified_rows: rows.filter((row) => !['identity_source_verified', 'identity_source_partial'].includes(row.identity_source_status)).length,
    rows_with_any_source_outcome: rows.filter((row) => row.source_outcomes.length > 0).length,
    rows_jsonl: path.relative(ROOT, ROWS_JSONL),
    exact_manifest_jsonl: path.relative(ROOT, EXACT_MANIFEST_JSONL),
    by_acquisition_status: countBy(rows, (row) => row.acquisition_status),
    by_identity_source_status: countBy(rows, (row) => row.identity_source_status),
    by_exact_image_status: countBy(rows, (row) => row.exact_image_status),
    by_set_code_exact_candidates: countBy(exactRows, (row) => row.set_code),
    db_writes_performed: false,
    storage_writes_performed: false,
    migrations_created: false,
    identity_table_writes_performed: false,
    price_writes_performed: false,
    deletes_or_merges_performed: false,
    exact_image_claim_changes_performed: false,
    global_apply_performed: false,
  };
  const summary = {
    ...summaryBase,
    samples: {
      exact_candidates: exactRows.slice(0, 50).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        source_url: row.exact_candidate.source_url,
        asset_url: row.exact_candidate.asset_url,
        target_storage_path: row.exact_candidate.asset?.target_storage_path ?? null,
      })),
      identity_only: rows.filter((row) => row.acquisition_status.endsWith('_only')).slice(0, 50).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        source_url: row.source_url,
        identity_source_status: row.identity_source_status,
        exact_image_reason: row.exact_image_reason,
      })),
      blocked_or_ambiguous: rows.filter((row) => row.acquisition_status === 'blocked_or_ambiguous').slice(0, 50).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        identity_source_status: row.identity_source_status,
        identity_source_reason: row.identity_source_reason,
        exact_image_status: row.exact_image_status,
        exact_image_reason: row.exact_image_reason,
      })),
    },
  };
  summary.fingerprint = proofHash({
    package_id: summary.package_id,
    row_offset: summary.row_offset,
    row_limit: summary.row_limit,
    rows: rows.map((row) => ({
      gv_id: row.gv_id,
      set_code: row.set_code,
      name: row.name,
      number: row.number,
      acquisition_status: row.acquisition_status,
      identity_source_status: row.identity_source_status,
      exact_image_status: row.exact_image_status,
      source_url: row.source_url,
      exact_source_url: row.exact_candidate?.source_url ?? null,
      exact_asset_url: row.exact_candidate?.asset_url ?? null,
      exact_sha256: row.exact_candidate?.asset?.normalized_sha256 ?? null,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary, rows), 'utf8');
  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    rows_jsonl: path.relative(ROOT, ROWS_JSONL),
    exact_manifest_jsonl: path.relative(ROOT, EXACT_MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    rows_processed: summary.rows_processed,
    exact_image_candidate_rows: summary.exact_image_candidate_rows,
    identity_source_verified_rows: summary.identity_source_verified_rows,
    identity_source_partial_rows: summary.identity_source_partial_rows,
    identity_source_unverified_rows: summary.identity_source_unverified_rows,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
