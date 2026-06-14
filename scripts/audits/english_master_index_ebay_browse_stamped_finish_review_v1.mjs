import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import dotenv from 'dotenv';

import {
  DEFAULT_OUTPUT_DIR,
  markdownTable,
  normalizeText,
} from './verified_master_set_index_v1/shared.mjs';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env.local'), quiet: true });
dotenv.config({ path: path.join(process.cwd(), '.env.local'), quiet: true });

const ROOT = process.cwd();
const INPUT_JSON = path.join(
  DEFAULT_OUTPUT_DIR,
  'english_master_index_v1',
  'english_master_index_pkg15k_stamped_identity_expansion_candidates_v1.json',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'ebay_browse_stamped_finish_review_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'ebay_browse_stamped_finish_review_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'ebay_browse_stamped_finish_review_v1.md');

const PACKAGE_ID = 'PKG-15L-EBAY-BROWSE-STAMPED-FINISH-REVIEW';
const DEFAULT_ROW_LIMIT = 25;
const DEFAULT_LISTING_LIMIT = 5;
const TOKEN_REFRESH_SKEW_MS = 60_000;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value);
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

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => (
    Number(right[1]) - Number(left[1]) || String(left[0]).localeCompare(String(right[0]))
  )));
}

function cliValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function activeFinishPhrase(finishKey) {
  if (finishKey === 'reverse') return 'reverse holo';
  if (finishKey === 'holo') return 'holo';
  if (finishKey === 'normal') return 'non holo';
  return finishKey;
}

function queryForRow(row) {
  const identityTerms = [
    row.card_name,
    row.card_number,
    row.set_name,
    row.expanded_stamp_label?.replace(/\bStamp\b/gi, '').trim(),
    activeFinishPhrase(row.finish_key),
    'Pokemon',
  ].filter(Boolean);
  return identityTerms.join(' ');
}

async function getBrowseAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - TOKEN_REFRESH_SKEW_MS) {
    return cachedToken;
  }

  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) {
    cachedToken = process.env.EBAY_BROWSE_ACCESS_TOKEN.trim();
    cachedTokenExpiresAt = now + 60 * 60 * 1000;
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET. The audit did not run any Browse searches.');
  }

  const oauthBase = (process.env.EBAY_OAUTH_BASE_URL || 'https://api.ebay.com').replace(/\/+$/, '');
  const response = await fetch(`${oauthBase}/identity/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'ascii').toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'https://api.ebay.com/oauth/api_scope',
    }),
  });

  if (!response.ok) {
    const snippet = (await response.text().catch(() => '')).slice(0, 300);
    throw new Error(`eBay OAuth token request failed: ${response.status} ${response.statusText} ${snippet}`);
  }

  const json = await response.json();
  cachedToken = json.access_token;
  cachedTokenExpiresAt = Date.now() + Number(json.expires_in ?? 7200) * 1000;
  return cachedToken;
}

async function searchBrowse({ query, limit }) {
  const baseUrl = (process.env.EBAY_BROWSE_BASE_URL || 'https://api.ebay.com').replace(/\/+$/, '');
  const url = new URL('/buy/browse/v1/item_summary/search', baseUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(Math.max(1, Math.min(Number(limit) || DEFAULT_LISTING_LIMIT, 20))));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${await getBrowseAccessToken()}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });

  const bodyText = await response.text();
  let json = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText);
    } catch {
      json = null;
    }
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      statusText: response.statusText,
      error_snippet: bodyText.slice(0, 300),
      listings: [],
    };
  }

  return {
    ok: true,
    status: response.status,
    statusText: response.statusText,
    listings: (json?.itemSummaries ?? []).map((item) => ({
      item_id: item.itemId ?? null,
      title: item.title ?? '',
      item_web_url: item.itemWebUrl ?? item.itemAffiliateWebUrl ?? null,
      condition: item.condition ?? item.conditionDescription ?? null,
      price: item.price?.value ?? null,
      currency: item.price?.currency ?? null,
    })),
  };
}

function titleHasCardName(titleNorm, cardName) {
  const tokens = normalizeText(cardName).split(' ').filter(Boolean);
  return tokens.every((token) => titleNorm.includes(token));
}

function titleHasCardNumber(title, cardNumber) {
  const raw = String(cardNumber ?? '').trim();
  if (!raw) return false;
  const normalized = raw.replace(/^0+(?=\d)/, '');
  const patterns = [
    new RegExp(`(?:^|[^a-z0-9])#?0*${escapeRegex(normalized)}(?:\\s*/|[^a-z0-9]|$)`, 'i'),
    new RegExp(`(?:^|[^a-z0-9])#?${escapeRegex(raw)}(?:\\s*/|[^a-z0-9]|$)`, 'i'),
  ];
  return patterns.some((pattern) => pattern.test(title));
}

function titleHasSetName(titleNorm, setName) {
  const ignored = new Set(['and', 'the']);
  const tokens = normalizeText(setName).split(' ').filter((token) => token && !ignored.has(token));
  return tokens.length > 0 && tokens.every((token) => titleNorm.includes(token));
}

function titleHasVariant(titleNorm, variantKey) {
  const key = normalizeText(variantKey);
  const checks = [];
  if (key.includes('staff')) checks.push(['staff']);
  if (key.includes('regional')) checks.push(['regional', 'championship']);
  if (key.includes('national')) checks.push(['national', 'championship']);
  if (key.includes('city')) checks.push(['city', 'championship']);
  if (key.includes('state')) checks.push(['state', 'championship']);
  if (key.includes('europe')) checks.push(['europe', 'championship']);
  if (key.includes('oceania')) checks.push(['oceania', 'championship']);
  if (key.includes('league')) checks.push(['league']);
  if (key.includes('gamestop')) checks.push(['gamestop']);
  if (key.includes('eb games')) checks.push(['eb', 'games']);
  if (key.includes('prerelease')) checks.push(['prerelease']);
  if (checks.length === 0) return false;
  return checks.every((terms) => terms.every((term) => titleNorm.includes(term)));
}

function titleHasFinish(titleNorm, finishKey) {
  if (finishKey === 'reverse') {
    return titleNorm.includes('reverse') && (titleNorm.includes('holo') || titleNorm.includes('foil'));
  }
  if (finishKey === 'holo') {
    return (
      !titleNorm.includes('reverse')
      && !titleNorm.includes('cosmo')
      && !titleNorm.includes('cracked ice')
      && (titleNorm.includes('holo') || titleNorm.includes('foil'))
    );
  }
  if (finishKey === 'normal') {
    return (
      titleNorm.includes('non holo')
      || titleNorm.includes('nonholo')
      || titleNorm.includes('no holo')
      || titleNorm.includes('regular')
    ) && !titleNorm.includes('reverse');
  }
  return false;
}

function hasUnsafeListingTerms(titleNorm) {
  const unsafeTerms = [
    'proxy',
    'custom',
    'digital',
    'orica',
    'sticker',
    'jumbo',
    'oversized',
    'lot',
    'bundle',
    'pack',
  ];
  return unsafeTerms.some((term) => titleNorm.includes(term));
}

function validateListing(row, listing) {
  const title = String(listing.title ?? '');
  const titleNorm = normalizeText(title);
  const checks = {
    card_name: titleHasCardName(titleNorm, row.card_name),
    card_number: titleHasCardNumber(title, row.card_number),
    set_name: titleHasSetName(titleNorm, row.set_name),
    variant: titleHasVariant(titleNorm, row.expanded_variant_key),
    active_finish: titleHasFinish(titleNorm, row.finish_key),
    unsafe_terms_absent: !hasUnsafeListingTerms(titleNorm),
  };
  const accepted = Object.values(checks).every(Boolean);
  return {
    accepted,
    checks,
    rejection_reasons: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key),
  };
}

function targetRows(input) {
  const seen = new Set();
  return input.rows
    .filter((row) => Number(row.identity_source_count_for_exact_expanded_identity ?? 0) >= 2)
    .filter((row) => Number(row.finish_source_count_for_exact_expanded_identity ?? 0) < 2)
    .filter((row) => {
      const key = [
        normalizeText(row.set_key),
        normalizeText(row.card_number),
        normalizeText(row.card_name),
        normalizeText(row.expanded_variant_key),
        normalizeText(row.finish_key),
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (
      String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
      || String(left.expanded_variant_key).localeCompare(String(right.expanded_variant_key))
    ));
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_review_status).map(([status, count]) => [status, count]);
  const matchRows = report.rows
    .filter((row) => row.exact_title_match_count > 0 || row.partial_title_match_count > 0 || row.search_status !== 'ok')
    .slice(0, 60)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.expanded_variant_key,
      row.finish_key,
      row.search_status,
      row.exact_title_match_count,
      row.partial_title_match_count,
      row.review_status,
    ]);

  return [
    '# eBay Browse Stamped Finish Review V1',
    '',
    'Audit-only source review for stamped Master Index blockers. This report does not promote eBay listings into canonical truth and does not perform DB writes.',
    '',
    '## Safety',
    '',
    `- audit_only: ${report.audit_only}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- write_ready_now: ${report.write_ready_now}`,
    `- source_policy: ${report.source_policy}`,
    '',
    '## Summary',
    '',
    `- rows_targeted: ${report.summary.rows_targeted}`,
    `- browse_queries_attempted: ${report.summary.browse_queries_attempted}`,
    `- browse_queries_succeeded: ${report.summary.browse_queries_succeeded}`,
    `- exact_title_match_rows: ${report.summary.exact_title_match_rows}`,
    `- exact_title_matches: ${report.summary.exact_title_matches}`,
    `- partial_title_match_rows: ${report.summary.partial_title_match_rows}`,
    '',
    markdownTable(['review_status', 'count'], summaryRows),
    '',
    '## Review Rows',
    '',
    matchRows.length
      ? markdownTable(['set', 'number', 'card', 'variant', 'finish', 'search', 'exact', 'partial', 'status'], matchRows)
      : 'No exact or partial title evidence was found.',
    '',
    '## Governance',
    '',
    '- eBay Browse evidence is volatile marketplace evidence.',
    '- Exact title matches are review candidates only.',
    '- A future promotion path must preserve item URL, retrieval timestamp, and title validation checks, and must not overwrite stronger preserved source evidence.',
    '',
  ].join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rowLimit = Math.max(1, Number(cliValue('limit', DEFAULT_ROW_LIMIT)) || DEFAULT_ROW_LIMIT);
  const listingLimit = Math.max(1, Number(cliValue('listing-limit', DEFAULT_LISTING_LIMIT)) || DEFAULT_LISTING_LIMIT);
  const dryRun = hasFlag('dry-run');
  const rows = targetRows(input).slice(0, rowLimit);
  const results = [];

  for (const row of rows) {
    const query = queryForRow(row);
    if (dryRun) {
      results.push({
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        expanded_variant_key: row.expanded_variant_key,
        expanded_stamp_label: row.expanded_stamp_label,
        finish_key: row.finish_key,
        query,
        search_status: 'dry_run_not_queried',
        exact_title_match_count: 0,
        partial_title_match_count: 0,
        exact_title_matches: [],
        partial_title_matches: [],
        rejected_title_samples: [],
        review_status: 'not_queried',
      });
      continue;
    }

    let search;
    try {
      search = await searchBrowse({ query, limit: listingLimit });
    } catch (error) {
      results.push({
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        expanded_variant_key: row.expanded_variant_key,
        expanded_stamp_label: row.expanded_stamp_label,
        finish_key: row.finish_key,
        query,
        search_status: 'source_error',
        search_error: error?.cause?.code
          ? `${error.message} (${error.cause.code}: ${error.cause.message})`
          : (error?.message ?? String(error)),
        exact_title_match_count: 0,
        partial_title_match_count: 0,
        exact_title_matches: [],
        partial_title_matches: [],
        rejected_title_samples: [],
        review_status: 'source_error',
      });
      continue;
    }
    if (!search.ok) {
      results.push({
        set_key: row.set_key,
        set_name: row.set_name,
        card_number: row.card_number,
        card_name: row.card_name,
        expanded_variant_key: row.expanded_variant_key,
        expanded_stamp_label: row.expanded_stamp_label,
        finish_key: row.finish_key,
        query,
        search_status: `error_${search.status}`,
        search_error: search.error_snippet,
        exact_title_match_count: 0,
        partial_title_match_count: 0,
        exact_title_matches: [],
        partial_title_matches: [],
        rejected_title_samples: [],
        review_status: 'source_error',
      });
      continue;
    }

    const reviewed = search.listings.map((listing) => ({
      ...listing,
      validation: validateListing(row, listing),
    }));
    const exactTitleMatches = reviewed.filter((listing) => listing.validation.accepted);
    const partialTitleMatches = reviewed
      .filter((listing) => !listing.validation.accepted)
      .filter((listing) => {
        const checks = listing.validation.checks;
        return checks.card_name && checks.card_number && checks.variant && checks.active_finish && checks.unsafe_terms_absent;
      });
    const rejected = reviewed
      .filter((listing) => !listing.validation.accepted)
      .slice(0, 3)
      .map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        rejection_reasons: listing.validation.rejection_reasons,
      }));

    results.push({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      expanded_variant_key: row.expanded_variant_key,
      expanded_stamp_label: row.expanded_stamp_label,
      finish_key: row.finish_key,
      query,
      search_status: 'ok',
      listings_reviewed: reviewed.length,
      exact_title_match_count: exactTitleMatches.length,
      partial_title_match_count: partialTitleMatches.length,
      exact_title_matches: exactTitleMatches.map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        item_id: listing.item_id,
        condition: listing.condition,
        validation_checks: listing.validation.checks,
      })),
      partial_title_matches: partialTitleMatches.map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        item_id: listing.item_id,
        condition: listing.condition,
        validation_checks: listing.validation.checks,
        missing_checks: listing.validation.rejection_reasons,
      })),
      rejected_title_samples: rejected,
      review_status: exactTitleMatches.length > 0
        ? 'exact_title_review_candidate_not_promotable'
        : (partialTitleMatches.length > 0 ? 'partial_title_review_only' : 'no_usable_title_evidence'),
    });
  }

  const exactTitleMatchRows = results.filter((row) => row.exact_title_match_count > 0).length;
  const partialTitleMatchRows = results.filter((row) => row.partial_title_match_count > 0).length;
  const reportBase = {
    generated_at: new Date().toISOString(),
    version: 'ebay_browse_stamped_finish_review_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    write_ready_now: 0,
    source_policy: 'eBay Browse listing titles are volatile review evidence only; they are not automatically promoted into Master Index truth.',
    runtime_environment: {
      node_tls_reject_unauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? null,
      local_tls_override_used: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
      tls_note: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
        ? 'Local Node TLS verification was disabled for this bounded audit run because Node could not verify the local certificate chain. This is not the script default and must not be promoted into source policy.'
        : 'Default Node TLS verification was used.',
    },
    input_artifact: path.relative(ROOT, INPUT_JSON).replace(/\\/g, '/'),
    source_query_limits: {
      row_limit: rowLimit,
      listing_limit: listingLimit,
      dry_run: dryRun,
    },
    summary: {
      rows_available_from_pkg15k: targetRows(input).length,
      rows_targeted: rows.length,
      browse_queries_attempted: dryRun ? 0 : results.length,
      browse_queries_succeeded: results.filter((row) => row.search_status === 'ok').length,
      exact_title_match_rows: exactTitleMatchRows,
      exact_title_matches: results.reduce((sum, row) => sum + Number(row.exact_title_match_count ?? 0), 0),
      partial_title_match_rows: partialTitleMatchRows,
      by_review_status: countBy(results, (row) => row.review_status),
      by_set: countBy(results, (row) => row.set_key),
      by_finish_key: countBy(results, (row) => row.finish_key),
    },
    rows: results,
  };
  const report = {
    ...reportBase,
    fingerprint_sha256: sha256(stableJson({
      package_id: PACKAGE_ID,
      source_policy: reportBase.source_policy,
      source_query_limits: reportBase.source_query_limits,
      rows: results,
    })),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: path.relative(ROOT, OUTPUT_JSON),
    rows_targeted: report.summary.rows_targeted,
    exact_title_match_rows: report.summary.exact_title_match_rows,
    partial_title_match_rows: report.summary.partial_title_match_rows,
    write_ready_now: report.write_ready_now,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
