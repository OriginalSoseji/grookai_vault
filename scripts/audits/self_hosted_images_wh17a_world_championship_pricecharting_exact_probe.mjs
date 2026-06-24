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
const STAGING_DIR = path.join(ROOT, 'tmp', 'nonproduction_image_staging', 'image_truth_v1', 'wh17a-world-championship-pricecharting-exact');
const SUMMARY_JSON = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_probe_summary_v1.json');
const SUMMARY_MD = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_probe_summary_v1.md');
const MANIFEST_JSONL = path.join(OUTPUT_DIR, 'self_hosted_images_wh17a_world_championship_pricecharting_exact_upload_manifest_v1.jsonl');
const PACKAGE_ID = 'IMG-HOST-WH-17A-WORLD-CHAMPIONSHIP-PRICECHARTING-EXACT-PROBE';
const USER_AGENT = 'GrookaiImageTruthAudit/1.0 (+read-only; world-championship-pricecharting-exact-probe)';

function parseArgs(argv) {
  const args = {
    limit: Number.parseInt(process.env.WH17A_LIMIT ?? '0', 10),
    offset: Number.parseInt(process.env.WH17A_OFFSET ?? '0', 10),
    delayMs: Number.parseInt(process.env.WH17A_DELAY_MS ?? '250', 10),
    timeoutSec: Number.parseInt(process.env.WH17A_TIMEOUT_SEC ?? '25', 10),
    skipAssetStage: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--limit') args.limit = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--offset') args.offset = Number.parseInt(argv[++index] ?? '0', 10);
    else if (arg === '--delay-ms') args.delayMs = Number.parseInt(argv[++index] ?? '250', 10);
    else if (arg === '--timeout-sec') args.timeoutSec = Number.parseInt(argv[++index] ?? '25', 10);
    else if (arg === '--skip-asset-stage') args.skipAssetStage = true;
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
  const match = String(row.set_code ?? row.set_name ?? '').match(/(?:wcd|world championships deck:?\s*)(\d{4})/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function candidateUrl(row) {
  const year = rowYear(row);
  const number = normalizeNumber(row.number);
  if (!year || !number) return null;
  return `https://www.pricecharting.com/game/pokemon-world-championships-${year}/${slug(row.name)}-${slug(number)}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    maxBuffer: 8 * 1024 * 1024,
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
    maxBuffer: 12 * 1024 * 1024,
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
  for (const [, href] of String(html ?? '').matchAll(anchorRegex)) {
    rows.push({ src: decodeHtml(href), alt: '', tag: 'anchor_full_image' });
  }

  return Array.from(new Map(rows.map((row) => [row.src, row])).values());
}

function directProductPage(row, html, title) {
  const year = rowYear(row);
  const titleText = normalizeText(title);
  const logoText = normalizeText(extractSetLogoTitle(html));
  const pageText = `${titleText} ${logoText}`;
  if (!pageText.includes(`pokemon world championships ${year}`)) return false;
  if (!titleText.includes(normalizeText(row.name))) return false;
  if (!titleText.includes(normalizeText(normalizeNumber(row.number)))) return false;
  return true;
}

function bestImage(row, html, title) {
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
        cp.image_note
      from public.card_prints cp
      join public.sets s on s.code = cp.set_code
      where cp.variant_key = 'world_championship_deck_replica'
        and cp.set_code like 'wcd%'
        and cp.image_status = 'representative_shared'
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

function table(rows) {
  if (!rows.length) return '_None._';
  return [
    '| status | set | number | card | reason | source |',
    '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.status} | ${row.set_code} | ${String(row.number).replace(/\|/g, '\\|')} | ${String(row.name).replace(/\|/g, '\\|')} | ${row.reason} | ${row.source_url ?? ''} |`),
  ].join('\n');
}

function renderMarkdown(summary, rows) {
  return `# ${PACKAGE_ID}

- Generated: ${summary.generated_at}
- Mode: ${summary.mode}
- Fingerprint: \`${summary.fingerprint}\`
- Rows probed: ${summary.rows_probed}
- Exact image candidates: ${summary.exact_image_candidate_rows}
- Blocked rows: ${summary.blocked_rows}
- Nonproduction assets staged: ${summary.nonproduction_assets_staged}
- DB writes performed: ${summary.db_writes_performed}
- Storage writes performed: ${summary.storage_writes_performed}
- Migrations created: ${summary.migrations_created}
- Exact image claim changes performed: ${summary.exact_image_claim_changes_performed}

## By Status

${Object.entries(summary.by_status).map(([key, count]) => `- ${key}: ${count}`).join('\n')}

## Samples

${table(rows.slice(0, 50))}

## Next Action

Exact candidates can move to a separate storage upload apply package only after approval. This report does not authorize storage writes, DB writes, identity-table writes, price writes, deletes, merges, migrations, or global apply.
`;
}

async function main() {
  const args = parseArgs(process.argv);
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const sourceRows = await fetchRows(args);
  const rows = [];

  for (const [index, row] of sourceRows.entries()) {
    if (index > 0 && args.delayMs > 0) await sleep(args.delayMs);
    const sourceUrl = candidateUrl(row);
    if (!sourceUrl) {
      rows.push({ ...row, status: 'blocked', reason: 'candidate_url_not_derivable', source_url: null });
      continue;
    }
    try {
      const html = await fetchText(sourceUrl, args.timeoutSec);
      const title = extractTitle(html);
      if (normalizeText(title) === 'just a moment') {
        rows.push({ ...row, status: 'blocked', reason: 'rate_limited_by_pricecharting', source_url: sourceUrl, page_title: title });
        continue;
      }
      if (!directProductPage(row, html, title)) {
        rows.push({ ...row, status: 'blocked', reason: 'not_direct_matching_pricecharting_product_page', source_url: sourceUrl, page_title: title });
        continue;
      }
      const image = bestImage(row, html, title);
      if (!image?.src) {
        rows.push({ ...row, status: 'blocked', reason: 'matching_product_page_but_no_asset', source_url: sourceUrl, page_title: title });
        continue;
      }
      let asset = null;
      if (!args.skipAssetStage) asset = await stageAsset(row, image.src, args.timeoutSec);
      rows.push({
        ...row,
        status: 'exact_candidate_staged',
        reason: 'pricecharting_direct_product_title_and_image_match',
        source_url: sourceUrl,
        page_title: title,
        asset_url: image.src,
        image_alt: image.alt,
        asset,
      });
    } catch (error) {
      rows.push({
        ...row,
        status: 'blocked',
        reason: `probe_failed:${error instanceof Error ? error.message : String(error)}`.slice(0, 240),
        source_url: sourceUrl,
      });
    }
  }

  const manifestRows = rows.filter((row) => row.status === 'exact_candidate_staged');
  await fs.writeFile(MANIFEST_JSONL, `${manifestRows.map((row) => JSON.stringify(row)).join('\n')}${manifestRows.length ? '\n' : ''}`, 'utf8');

  const summaryBase = {
    package_id: PACKAGE_ID,
    generated_at: new Date().toISOString(),
    mode: 'read_only_exact_source_probe_no_db_no_storage_writes',
    source: 'pricecharting_direct_product_pages',
    row_offset: args.offset,
    row_limit: args.limit,
    rows_probed: rows.length,
    exact_image_candidate_rows: manifestRows.length,
    blocked_rows: rows.length - manifestRows.length,
    nonproduction_assets_staged: args.skipAssetStage ? 0 : manifestRows.length,
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    by_status: countBy(rows, (row) => row.status),
    by_reason: countBy(rows, (row) => row.reason),
    by_set_code_exact_candidates: countBy(manifestRows, (row) => row.set_code),
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
      exact_candidates: manifestRows.slice(0, 25).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        source_url: row.source_url,
        asset_url: row.asset_url,
        target_storage_path: row.asset?.target_storage_path ?? null,
      })),
      blocked: rows.filter((row) => row.status === 'blocked').slice(0, 25).map((row) => ({
        gv_id: row.gv_id,
        set_code: row.set_code,
        name: row.name,
        number: row.number,
        reason: row.reason,
        source_url: row.source_url,
        page_title: row.page_title ?? null,
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
      number: row.number,
      name: row.name,
      status: row.status,
      reason: row.reason,
      source_url: row.source_url,
      asset_url: row.asset_url ?? null,
      sha256: row.asset?.normalized_sha256 ?? null,
    })),
  });

  await fs.writeFile(SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await fs.writeFile(SUMMARY_MD, renderMarkdown(summary, rows), 'utf8');

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    summary_json: path.relative(ROOT, SUMMARY_JSON),
    summary_md: path.relative(ROOT, SUMMARY_MD),
    manifest_jsonl: path.relative(ROOT, MANIFEST_JSONL),
    fingerprint: summary.fingerprint,
    rows_probed: summary.rows_probed,
    exact_image_candidate_rows: summary.exact_image_candidate_rows,
    blocked_rows: summary.blocked_rows,
    nonproduction_assets_staged: summary.nonproduction_assets_staged,
  }, null, 2));
}

main().catch((error) => {
  console.error(`[${PACKAGE_ID}] fatal:`, error);
  process.exitCode = 1;
});
