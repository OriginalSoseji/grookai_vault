import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

const execFileAsync = promisify(execFile);

const OUTPUT_DIR = 'docs/audits/image_truth_v1';
const RESIDUAL_PROBE_JSON = path.join(OUTPUT_DIR, 'image_truth_img14a_pricecharting_residual_exact_probe_v1.json');
const READINESS_JSON = path.join(OUTPUT_DIR, 'image_truth_exact_variant_readiness_v1.json');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'image_truth_img15a_ebay_browse_evidence_probe_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'image_truth_img15a_ebay_browse_evidence_probe_v1.md');
const PACKAGE_ID = 'IMG-15A-EBAY-BROWSE-EVIDENCE-ONLY-PROBE';

const SET_SEARCH_HINTS = {
  'sv03.5': ['151', 'scarlet violet 151'],
  sve: ['scarlet violet energy', 'scarlet and violet energy', 'scarlet violet energies', 'scarlet and violet energies', 'sve'],
  'swsh4.5': ['shining fates'],
  xy8: ['breakthrough'],
};

const NEGATIVE_TITLE_PATTERNS = [
  /\bproxy\b/i,
  /\bfake\b/i,
  /\breplica\b/i,
  /\bcustom\b/i,
  /\breprint\b/i,
  /\bjumbo\b/i,
  /\blot\b/i,
  /\bbundle\b/i,
  /\bplayset\b/i,
  /\bbulk\b/i,
  /\bchoose your card\b/i,
  /\bchoose\b/i,
];

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

function finishSearchPhrase(finishKey) {
  const finish = normalizeFinish(finishKey);
  if (finish === 'reverse') return 'reverse holo';
  if (finish === 'cosmos') return 'cosmos holo';
  if (finish === 'cracked_ice') return 'cracked ice holo';
  if (finish === 'holo') return 'holo';
  if (finish === 'normal') return '';
  return finish.replace(/_/g, ' ');
}

function titleHasNumber(row, title) {
  const normalized = normalizeText(title);
  const number = normalizeNumber(row.number);
  if (!number) return false;
  const escaped = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\D)0*${escaped}(?:\\D|$)`, 'i').test(normalized);
}

function titleMatchesEvidence(row, title) {
  const normalized = normalizeText(title);
  if (!normalized.includes(normalizeText(row.card_name))) return false;
  if (!titleHasNumber(row, title)) return false;
  const finishPhrase = finishSearchPhrase(row.finish_key);
  if (finishPhrase && !normalized.includes(normalizeText(finishPhrase))) return false;
  const hints = SET_SEARCH_HINTS[String(row.set_code).toLowerCase()] ?? [];
  if (hints.length > 0 && !hints.some((hint) => normalized.includes(normalizeText(hint)))) return false;
  if (NEGATIVE_TITLE_PATTERNS.some((regex) => regex.test(title))) return false;
  return true;
}

function buildQuery(row) {
  return [
    'Pokemon',
    SET_SEARCH_HINTS[String(row.set_code).toLowerCase()]?.[0],
    row.card_name,
    finishSearchPhrase(row.finish_key),
    row.number,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function browseApiBase() {
  const raw = clean(process.env.EBAY_BROWSE_BASE_URL) ?? 'https://api.ebay.com';
  return raw.replace(/\/buy\/browse\/v1\/?$/i, '').replace(/\/+$/, '');
}

function oauthBase() {
  return clean(process.env.EBAY_OAUTH_BASE_URL) ?? 'https://api.ebay.com';
}

async function getBrowseAccessToken() {
  const manual = clean(process.env.EBAY_BROWSE_ACCESS_TOKEN);
  if (manual) return manual;
  const clientId = clean(process.env.EBAY_CLIENT_ID);
  const clientSecret = clean(process.env.EBAY_CLIENT_SECRET);
  if (!clientId || !clientSecret) {
    throw new Error('missing_ebay_client_credentials');
  }
  const tokenUrl = `${oauthBase().replace(/\/+$/, '')}/identity/v1/oauth2/token`;
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, 'ascii').toString('base64');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope',
  });
  let response;
  try {
    response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch (error) {
    if (process.platform !== 'win32') {
      throw new Error(`ebay_oauth_fetch_failed:${error?.message ?? 'unknown'}`);
    }
    const result = await execFileAsync('curl.exe', [
      '--ssl-no-revoke',
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      '35',
      '--request',
      'POST',
      '--header',
      `Authorization: Basic ${basicAuth}`,
      '--header',
      'Content-Type: application/x-www-form-urlencoded',
      '--data',
      body.toString(),
      tokenUrl,
    ], {
      maxBuffer: 1024 * 1024,
      timeout: 45000,
    });
    const json = JSON.parse(result.stdout);
    if (!json?.access_token) throw new Error('ebay_oauth_missing_access_token_after_curl');
    return json.access_token;
  }
  if (!response.ok) {
    const snippet = await response.text().catch(() => '');
    throw new Error(`ebay_oauth_failed:${response.status}:${snippet.slice(0, 120)}`);
  }
  const json = await response.json();
  if (!json?.access_token) throw new Error('ebay_oauth_missing_access_token');
  return json.access_token;
}

async function searchBrowse(query, token, limit) {
  const url = new URL('/buy/browse/v1/item_summary/search', browseApiBase());
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  const authHeaderName = 'Authorization';
  const bearerAuth = ['Bearer', token].join(' ');
  const headers = {
    Accept: 'application/json',
    [authHeaderName]: bearerAuth,
    'X-EBAY-C-MARKETPLACE-ID': clean(process.env.EBAY_MARKETPLACE_ID) ?? 'EBAY_US',
  };
  let response;
  try {
    response = await fetch(url.toString(), { headers });
  } catch (error) {
    if (process.platform !== 'win32') throw new Error(`ebay_browse_fetch_failed:${error?.message ?? 'unknown'}`);
    const result = await execFileAsync('curl.exe', [
      '--ssl-no-revoke',
      '--location',
      '--silent',
      '--show-error',
      '--max-time',
      '35',
      '--header',
      `${authHeaderName}: ${bearerAuth}`,
      '--header',
      `X-EBAY-C-MARKETPLACE-ID: ${headers['X-EBAY-C-MARKETPLACE-ID']}`,
      '--header',
      'Accept: application/json',
      url.toString(),
    ], {
      maxBuffer: 5 * 1024 * 1024,
      timeout: 45000,
    });
    const json = JSON.parse(result.stdout);
    return Array.isArray(json?.itemSummaries) ? json.itemSummaries : [];
  }
  const body = await response.text();
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = null;
  }
  if (!response.ok) {
    const error = new Error(`ebay_browse_search_failed:${response.status}`);
    error.status = response.status;
    error.snippet = body.slice(0, 200);
    throw error;
  }
  return Array.isArray(json?.itemSummaries) ? json.itemSummaries : [];
}

async function loadProbeRows() {
  try {
    const residual = JSON.parse(await fs.readFile(RESIDUAL_PROBE_JSON, 'utf8'));
    const rows = Array.isArray(residual.rows) ? residual.rows : [];
    if (rows.length > 0) return rows;
  } catch {
    // Fall back to readiness.
  }
  const readiness = JSON.parse(await fs.readFile(READINESS_JSON, 'utf8'));
  return readiness.pricecharting_probe_candidates ?? [];
}

function summarizeListing(row, listing) {
  const title = clean(listing.title) ?? '';
  return {
    item_id: listing.itemId ?? null,
    title,
    item_web_url: listing.itemWebUrl ?? null,
    condition: listing.condition ?? null,
    buying_options: Array.isArray(listing.buyingOptions) ? listing.buyingOptions : [],
    price: listing.price?.value ?? null,
    currency: listing.price?.currency ?? null,
    title_evidence_match: titleMatchesEvidence(row, title),
    image_policy: 'ignored_for_canonical_image_truth',
  };
}

function markdownTable(rows) {
  if (rows.length === 0) return '_None._';
  const columns = [
    ['status', (row) => row.status],
    ['set', (row) => row.set_code],
    ['number', (row) => row.number],
    ['card', (row) => row.card_name],
    ['finish', (row) => row.finish_key],
    ['query', (row) => row.query],
    ['matches', (row) => row.title_evidence_matches],
    ['reason', (row) => row.reason],
  ];
  return [
    `| ${columns.map(([label]) => label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${columns.map(([, value]) => String(value(row) ?? '').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function buildMarkdown(report) {
  return `# Image Truth IMG-15A eBay Browse Evidence-Only Probe V1

Generated: ${report.generated_at}

This is audit-only. It does not update database rows, upload images, create migrations, clean up, quarantine, consume the Grookai eBay budget RPC, or promote listing images.

## Safety

- package_id: ${PACKAGE_ID}
- db_writes_performed: false
- storage_uploads_performed: false
- migrations_created: false
- cleanup_performed: false
- quarantine_performed: false
- listing_images_used: false
- canonical_image_promotion_allowed: false

## Summary

- source_rows: ${report.summary.source_rows}
- searched_rows: ${report.summary.searched_rows}
- source_unavailable_rows: ${report.summary.source_unavailable_rows}
- title_evidence_candidate_rows: ${report.summary.title_evidence_candidate_rows}
- no_title_evidence_rows: ${report.summary.no_title_evidence_rows}
- listings_seen: ${report.summary.listings_seen}
- fingerprint: \`${report.fingerprint}\`

## Rows

${markdownTable(report.rows)}

## Decision

eBay Browse may be useful as volatile listing evidence, but it is not approved as a canonical image source. Listing image URLs remain excluded until licensing, stability, and exact visual proof rules are separately approved.
`;
}

async function main() {
  const limit = Math.max(1, Math.min(Number(process.env.EBAY_IMAGE_TRUTH_PROBE_LIMIT ?? 5) || 5, 10));
  const sourceRows = await loadProbeRows();
  const rows = [];
  let token = null;
  let tokenError = null;
  try {
    token = await getBrowseAccessToken();
  } catch (error) {
    tokenError = error?.message ?? 'ebay_token_unavailable';
  }

  for (const sourceRow of sourceRows) {
    const row = {
      card_printing_id: sourceRow.card_printing_id,
      set_code: sourceRow.set_code,
      number: sourceRow.number,
      card_name: sourceRow.card_name,
      finish_key: sourceRow.finish_key,
      query: buildQuery(sourceRow),
      status: 'source_unavailable',
      reason: tokenError,
      title_evidence_matches: 0,
      listings: [],
    };
    if (token) {
      try {
        const listings = await searchBrowse(row.query, token, limit);
        row.listings = listings.map((listing) => summarizeListing(sourceRow, listing));
        row.title_evidence_matches = row.listings.filter((listing) => listing.title_evidence_match).length;
        row.status = row.title_evidence_matches > 0 ? 'evidence_candidate_title_only' : 'no_exact_title_evidence';
        row.reason = row.title_evidence_matches > 0
          ? 'ebay_listing_title_matches_identity_finish_but_images_excluded'
          : 'no_listing_title_matched_exact_identity_finish';
      } catch (error) {
        row.status = 'source_unavailable';
        row.reason = `${error?.message ?? 'ebay_browse_failed'}${error?.snippet ? `:${error.snippet}` : ''}`;
      }
    }
    rows.push(row);
  }

  const searchedRows = rows.filter((row) => row.status !== 'source_unavailable').length;
  const report = {
    generated_at: new Date().toISOString(),
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    storage_uploads_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    source_inputs: {
      residual_probe_json: RESIDUAL_PROBE_JSON,
      readiness_json: READINESS_JSON,
    },
    ebay_policy: {
      evidence_only: true,
      listing_images_used: false,
      canonical_image_promotion_allowed: false,
      budget_rpc_consumed: false,
      listing_metadata_preserved: true,
    },
    summary: {
      source_rows: rows.length,
      searched_rows: searchedRows,
      source_unavailable_rows: rows.length - searchedRows,
      title_evidence_candidate_rows: rows.filter((row) => row.status === 'evidence_candidate_title_only').length,
      no_title_evidence_rows: rows.filter((row) => row.status === 'no_exact_title_evidence').length,
      listings_seen: rows.reduce((total, row) => total + row.listings.length, 0),
    },
    rows,
  };
  report.fingerprint = proofHash({
    package_id: report.package_id,
    rows: rows.map((row) => ({
      card_printing_id: row.card_printing_id,
      set_code: row.set_code,
      number: row.number,
      card_name: row.card_name,
      finish_key: row.finish_key,
      query: row.query,
      status: row.status,
      reason: row.reason,
      title_evidence_matches: row.title_evidence_matches,
      listing_ids: row.listings.map((listing) => listing.item_id),
      listing_titles: row.listings.map((listing) => listing.title),
    })),
  });

  await fs.writeFile(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(OUTPUT_MD, buildMarkdown(report));
  console.log(JSON.stringify({
    generated: [OUTPUT_JSON, OUTPUT_MD],
    source_rows: report.summary.source_rows,
    title_evidence_candidate_rows: report.summary.title_evidence_candidate_rows,
    no_title_evidence_rows: report.summary.no_title_evidence_rows,
    source_unavailable_rows: report.summary.source_unavailable_rows,
    fingerprint: report.fingerprint,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
