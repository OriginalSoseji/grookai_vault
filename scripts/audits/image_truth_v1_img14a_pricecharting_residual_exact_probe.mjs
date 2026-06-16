import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const execFileAsync = promisify(execFile);
const { Client } = pg;

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img14a_pricecharting_residual_exact_probe_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img14a_pricecharting_residual_exact_probe_v1.md');
const STAGING_ASSET_DIR = path.join('tmp', 'nonproduction_image_staging', 'image_truth_v1', 'img14a');
const PACKAGE_ID = 'IMG-14A-PRICECHARTING-RESIDUAL-EXACT-VARIANT-PROBE';

function requireDbUrl() {
  return process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL ?? null;
}

function clean(value) {
  const normalized = String(value ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNumber(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^0+(?=\d)/, '');
}

function normalizeFinish(value) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'reverse_holo') return 'reverse';
  if (normalized === 'cosmos_holo') return 'cosmos';
  if (normalized === 'poke_ball_reverse') return 'pokeball';
  if (normalized === 'master_ball_reverse') return 'masterball';
  return normalized;
}

function sha256Hex(bufferOrText) {
  return crypto.createHash('sha256').update(bufferOrText).digest('hex');
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return value.map((entry) => canonicalizeJson(entry));
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort((a, b) => a.localeCompare(b)).reduce((acc, key) => {
    acc[key] = canonicalizeJson(value[key]);
    return acc;
  }, {});
}

function proofHash(value) {
  return sha256Hex(JSON.stringify(canonicalizeJson(value)));
}

function decodeHtml(value) {
  return String(value ?? '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchHtmlWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    '35',
    '--user-agent',
    'GrookaiImageTruthAudit/1.0 (+audit-only; pricecharting-residual-exact-probe)',
    url,
  ], {
    maxBuffer: 5 * 1024 * 1024,
    timeout: 45000,
  });
  return result.stdout;
}

async function fetchHtmlWithPowerShell(url) {
  if (process.platform !== 'win32') return null;
  const encodedUrl = Buffer.from(url, 'utf8').toString('base64');
  const command = [
    `$u = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("${encodedUrl}"));`,
    '$ProgressPreference = "SilentlyContinue";',
    '[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;',
    '$response = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 25;',
    '[Console]::Out.Write($response.Content);',
  ].join(' ');
  const result = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command], {
    maxBuffer: 5 * 1024 * 1024,
    timeout: 35000,
  });
  return result.stdout;
}

async function fetchHtml(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; pricecharting-residual-exact-probe)',
        accept: 'text/html',
      },
    });
    if (response.ok) return await response.text();
  } catch {
    // Fall through to Windows-friendly fetchers.
  }
  try {
    const html = await fetchHtmlWithCurl(url);
    if (html) return html;
  } catch {
    // Fall through to PowerShell.
  }
  const html = await fetchHtmlWithPowerShell(url);
  if (!html) throw new Error(`html_fetch_failed:${url}`);
  return html;
}

async function fetchBufferWithCurl(url) {
  if (process.platform !== 'win32') return null;
  const result = await execFileAsync('curl.exe', [
    '--ssl-no-revoke',
    '--location',
    '--silent',
    '--show-error',
    '--max-time',
    '40',
    '--user-agent',
    'GrookaiImageTruthAudit/1.0 (+audit-only; nonproduction-staging)',
    url,
  ], {
    encoding: 'buffer',
    maxBuffer: 8 * 1024 * 1024,
    timeout: 50000,
  });
  return result.stdout;
}

async function fetchBuffer(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'GrookaiImageTruthAudit/1.0 (+audit-only; nonproduction-staging)',
        accept: 'image/*,*/*;q=0.8',
      },
    });
    if (response.ok && String(response.headers.get('content-type') ?? '').toLowerCase().includes('image/')) {
      return Buffer.from(await response.arrayBuffer());
    }
  } catch {
    // Fall through to curl.
  }
  const buffer = await fetchBufferWithCurl(url);
  if (buffer?.length > 0) return buffer;
  throw new Error(`asset_fetch_failed:${url}`);
}

function extractTitle(html) {
  const ogTitle = String(html ?? '').match(/<meta\b[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const title = String(html ?? '').match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  return clean(decodeHtml(ogTitle ?? title ?? '').replace(/\s+/g, ' '));
}

function extractImages(html) {
  const images = [];
  const imgRegex = /<img\b[^>]*>/gi;
  const attrRegex = /\b(src|alt)=["']([^"']*)["']/gi;
  for (const [tag] of String(html ?? '').matchAll(imgRegex)) {
    const image = {};
    for (const [, key, value] of tag.matchAll(attrRegex)) image[key.toLowerCase()] = decodeHtml(value);
    if (image.src) images.push(image);
  }
  return images;
}

function expectedFinishPhrases(row) {
  const finish = normalizeFinish(row.finish_key);
  const url = String(row.best_source?.source_url ?? '').toLowerCase();
  if (finish === 'reverse') return ['reverse holo'];
  if (finish === 'cosmos') return url.includes('reverse-cosmos') ? ['reverse cosmos holo', 'cosmos holo'] : ['cosmos holo'];
  if (finish === 'cracked_ice') return ['cracked ice holo'];
  if (finish === 'holo') return ['holo'];
  if (finish === 'normal') return [];
  return [finish.replace(/_/g, ' ')];
}

function exactTextMatches(row, text) {
  const normalized = normalizeText(text);
  if (!normalized.includes(normalizeText(row.card_name))) return false;
  if (!normalized.includes(normalizeNumber(row.number))) return false;
  return expectedFinishPhrases(row).every((phrase) => normalized.includes(normalizeText(phrase)));
}

function findExactPriceChartingImage(row, html) {
  const title = extractTitle(html);
  if (!exactTextMatches(row, title)) {
    return { status: 'blocked', reason: 'pricecharting_title_not_exact', title, asset_url: null, image_alt: null };
  }
  const match = extractImages(html).find((image) => {
    return String(image.src ?? '').includes('storage.googleapis.com/images.pricecharting.com/')
      && exactTextMatches(row, image.alt);
  });
  if (!match) {
    return { status: 'blocked', reason: 'pricecharting_exact_image_alt_not_found', title, asset_url: null, image_alt: null };
  }
  return {
    status: 'exact_image_found',
    reason: 'pricecharting_title_and_image_alt_exact',
    title,
    asset_url: match.src,
    image_alt: match.alt,
  };
}

async function stageAsset(row, assetUrl) {
  const buffer = await fetchBuffer(assetUrl);
  const normalizedSha256 = sha256Hex(buffer);
  const extension = assetUrl.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const fileName = `${row.set_code}_${normalizeNumber(row.number)}_${normalizeFinish(row.finish_key)}_${row.card_printing_id.slice(0, 8)}_${normalizedSha256.slice(0, 16)}.${extension}`
    .replace(/[^A-Za-z0-9_.-]+/g, '_');
  const localAssetPath = path.join(STAGING_ASSET_DIR, fileName);
  await fs.mkdir(STAGING_ASSET_DIR, { recursive: true });
  await fs.writeFile(localAssetPath, buffer);
  return {
    local_nonproduction_asset_path: localAssetPath.replaceAll('\\', '/'),
    normalized_sha256: normalizedSha256,
    normalized_size_bytes: buffer.length,
    content_type: extension === 'png' ? 'image/png' : 'image/jpeg',
    proposed_storage_path: [
      'warehouse-derived',
      'image-truth-v1',
      'img14a-pricecharting-residual-exact',
      row.set_code,
      row.card_printing_id,
      `${normalizedSha256.slice(0, 24)}.${extension}`,
    ].join('/'),
  };
}

async function fetchTargets(cardPrintingIds) {
  const dbUrl = requireDbUrl();
  if (!dbUrl) return new Map();
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query(
      `
        select
          cpi.id as card_printing_id,
          cpi.finish_key,
          cpi.image_source,
          cpi.image_path,
          cpi.image_url,
          cpi.image_alt_url,
          cpi.image_status,
          cp.set_code,
          cp.number,
          cp.name as card_name
        from public.card_printings cpi
        join public.card_prints cp on cp.id = cpi.card_print_id
        where cpi.id = any($1::uuid[])
      `,
      [cardPrintingIds],
    );
    return new Map(result.rows.map((row) => [row.card_printing_id, row]));
  } finally {
    await client.end();
  }
}

function validateTarget(expected, row) {
  const errors = [];
  if (!row) return ['target_card_printing_not_found_or_db_unavailable'];
  if (String(row.set_code).toLowerCase() !== String(expected.set_code).toLowerCase()) errors.push('set_code_mismatch');
  if (normalizeNumber(row.number) !== normalizeNumber(expected.number)) errors.push('number_mismatch');
  if (normalizeText(row.card_name) !== normalizeText(expected.card_name)) errors.push('card_name_mismatch');
  if (normalizeFinish(row.finish_key) !== normalizeFinish(expected.finish_key)) errors.push('finish_key_mismatch');
  if (clean(row.image_path)) errors.push('child_image_path_already_present');
  if (clean(row.image_url)) errors.push('child_image_url_already_present');
  if (clean(row.image_alt_url)) errors.push('child_image_alt_url_already_present');
  return errors;
}

function markdownTable(rows) {
  if (rows.length === 0) return '_None._';
  const columns = [
    ['status', (row) => row.status],
    ['set', (row) => row.set_code],
    ['number', (row) => row.number],
    ['card', (row) => row.card_name],
    ['finish', (row) => row.finish_key],
    ['reason', (row) => row.reason],
    ['image_alt', (row) => row.image_alt ?? '-'],
    ['source', (row) => row.source_url],
  ];
  return [
    `| ${columns.map(([label]) => label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map(([, value]) => String(value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth IMG-14A PriceCharting Residual Exact Probe V1

Generated: ${report.generated_at}

This is read-only. It does not update database rows, upload to production storage, create migrations, clean up, quarantine, or overwrite parent images.

## Safety

- package_id: ${PACKAGE_ID}
- db_writes_performed: false
- storage_uploads_performed: false
- nonproduction_assets_staged: ${report.nonproduction_assets_staged}
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- target_table: card_printings
- parent_overwrite_allowed: false

## Summary

- source_rows: ${report.summary.source_rows}
- exact_ready_rows: ${report.summary.exact_ready_rows}
- blocked_rows: ${report.summary.blocked_rows}
- fingerprint: \`${report.fingerprint}\`

## Rows

${markdownTable(report.rows)}

## Next Action

${report.summary.exact_ready_rows > 0
    ? 'Exact-ready rows may move to a separate guarded dry-run transaction artifact. No real apply is authorized by this report.'
    : 'No residual PriceCharting row is ready for exact image promotion. Keep these rows honestly representative until another source or asset proof exists.'}
`;
}

async function main() {
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  const candidates = readiness.pricecharting_probe_candidates ?? [];
  const targets = await fetchTargets(candidates.map((row) => row.card_printing_id));
  const rows = [];

  for (const candidate of candidates) {
    let probe;
    let asset = null;
    const validationErrors = validateTarget(candidate, targets.get(candidate.card_printing_id));
    try {
      const html = await fetchHtml(candidate.best_source.source_url);
      probe = findExactPriceChartingImage(candidate, html);
      if (probe.status === 'exact_image_found') {
        try {
          asset = await stageAsset(candidate, probe.asset_url);
        } catch (error) {
          validationErrors.push(`asset_stage_failed:${error.message}`);
        }
      } else {
        validationErrors.push(probe.reason);
      }
    } catch (error) {
      probe = { status: 'blocked', reason: `probe_failed:${error.message}`, title: null, asset_url: null, image_alt: null };
      validationErrors.push(probe.reason);
    }

    const status = probe.status === 'exact_image_found' && validationErrors.length === 0
      ? 'exact_ready_for_guarded_dry_run'
      : 'blocked';
    rows.push({
      card_printing_id: candidate.card_printing_id,
      card_print_id: candidate.card_print_id,
      set_code: candidate.set_code,
      number: candidate.number,
      card_name: candidate.card_name,
      finish_key: candidate.finish_key,
      source_url: candidate.best_source.source_url,
      source_key: candidate.best_source.source_key,
      status,
      reason: validationErrors.length > 0 ? validationErrors.join(',') : probe.reason,
      page_title: probe.title,
      image_alt: probe.image_alt,
      asset_url: probe.asset_url,
      asset,
    });
  }

  const exactRows = rows.filter((row) => row.status === 'exact_ready_for_guarded_dry_run');
  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    nonproduction_assets_staged: exactRows.length,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    target_table: 'card_printings',
    parent_overwrite_allowed: false,
    summary: {
      source_rows: rows.length,
      exact_ready_rows: exactRows.length,
      blocked_rows: rows.length - exactRows.length,
      by_status: rows.reduce((acc, row) => {
        acc[row.status] = (acc[row.status] ?? 0) + 1;
        return acc;
      }, {}),
      by_reason: rows.reduce((acc, row) => {
        acc[row.reason] = (acc[row.reason] ?? 0) + 1;
        return acc;
      }, {}),
    },
    rows,
  };
  report.fingerprint = proofHash({
    package_id: report.package_id,
    rows: report.rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      source_url: row.source_url,
      status: row.status,
      reason: row.reason,
      image_alt: row.image_alt,
      asset_sha256: row.asset?.normalized_sha256 ?? null,
    })),
  });

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD],
    source_rows: report.summary.source_rows,
    exact_ready_rows: report.summary.exact_ready_rows,
    blocked_rows: report.summary.blocked_rows,
    fingerprint: report.fingerprint,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
