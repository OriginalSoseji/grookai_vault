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
  'english_master_index_stamped_special_post_collexy_source_packet_v1.json',
);
const OUTPUT_DIR = path.join(
  ROOT,
  'docs',
  'audits',
  'english_master_index_source_exhaustion_v1',
  'league_marketplace_scan_sources_v1',
);
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'league_marketplace_scan_sources_v1.json');
const OUTPUT_MD = path.join(OUTPUT_DIR, 'league_marketplace_scan_sources_v1.md');

const PACKAGE_ID = 'LEAGUE-MARKETPLACE-SCAN-SOURCES-V1';
const DEFAULT_ROW_LIMIT = 48;
const DEFAULT_QUERY_LIMIT = 2;
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

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, '/');
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row) || 'unknown';
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
  return String(finishKey ?? '').replace(/_/g, ' ');
}

function compactQuery(terms) {
  return terms
    .filter(Boolean)
    .map((term) => String(term).replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
}

function searchQueriesForRow(row) {
  const sourceQueries = Array.isArray(row.search_queries) ? row.search_queries : [];
  const primary = compactQuery([
    row.card_name,
    row.card_number,
    row.set_name,
    row.stamp_label,
    activeFinishPhrase(row.finish_key),
    'Pokemon card',
  ]);
  const tighter = compactQuery([
    row.card_name,
    row.card_number,
    row.stamp_label,
    activeFinishPhrase(row.finish_key),
    'Pokemon',
  ]);
  const sourceDerived = sourceQueries
    .filter((query) => !String(query).includes('site:'))
    .map((query) => String(query).replaceAll('"', '').replace(/\s+/g, ' ').trim());
  return [...new Set([primary, tighter, ...sourceDerived].filter(Boolean))];
}

function sourceCredentialsState() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) return 'access_token_configured';
  if (process.env.EBAY_CLIENT_ID?.trim() && process.env.EBAY_CLIENT_SECRET?.trim()) return 'oauth_client_configured';
  return 'missing_credentials';
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
  return tokens.length > 0 && tokens.every((token) => titleNorm.includes(token));
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

function titleHasVariant(titleNorm, row) {
  const label = normalizeText(row.stamp_label || row.variant_key);
  const key = normalizeText(row.variant_key);
  const checks = [];
  if (label.includes('league cup staff') || key.includes('league cup staff')) checks.push(['league', 'cup', 'staff']);
  if (label.includes('league') || key.includes('league')) checks.push(['league']);
  if (label.includes('staff') || key.includes('staff')) checks.push(['staff']);
  if (checks.length === 0) return false;
  return checks.some((terms) => terms.every((term) => titleNorm.includes(term)));
}

function titleHasFinish(titleNorm, finishKey) {
  if (!finishKey) return false;
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

function observedFinishKeys(titleNorm) {
  const finishes = [];
  if (titleNorm.includes('reverse') && (titleNorm.includes('holo') || titleNorm.includes('foil'))) {
    finishes.push('reverse');
  }
  if (
    !titleNorm.includes('reverse')
    && !titleNorm.includes('cosmo')
    && !titleNorm.includes('cracked ice')
    && (titleNorm.includes('holo') || titleNorm.includes('foil'))
  ) {
    finishes.push('holo');
  }
  if (
    titleNorm.includes('non holo')
    || titleNorm.includes('nonholo')
    || titleNorm.includes('no holo')
    || titleNorm.includes('regular')
  ) {
    finishes.push('normal');
  }
  return finishes;
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
    'repack',
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
    variant: titleHasVariant(titleNorm, row),
    active_finish: titleHasFinish(titleNorm, row.finish_key),
    unsafe_terms_absent: !hasUnsafeListingTerms(titleNorm),
  };
  const accepted = Object.values(checks).every(Boolean);
  return {
    accepted,
    checks,
    observed_finish_keys: observedFinishKeys(titleNorm),
    rejection_reasons: Object.entries(checks)
      .filter(([, passed]) => !passed)
      .map(([key]) => key),
  };
}

function targetRows(input) {
  const seen = new Set();
  return (input.rows ?? [])
    .filter((row) => row.next_source_family === 'league_marketplace_scan_sources')
    .filter((row) => row.action_bucket === 'league_finish_exact_source')
    .filter((row) => {
      const key = [
        normalizeText(row.set_key),
        normalizeText(row.card_number),
        normalizeText(row.card_name),
        normalizeText(row.variant_key),
        normalizeText(row.finish_key),
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => (
      Number(left.priority_rank ?? 999) - Number(right.priority_rank ?? 999)
      || String(left.set_key).localeCompare(String(right.set_key))
      || String(left.card_number).localeCompare(String(right.card_number), undefined, { numeric: true })
      || String(left.card_name).localeCompare(String(right.card_name))
    ));
}

function unavailableRow(row, queries, sourceStatus, searchError = null) {
  return {
    set_key: row.set_key,
    set_name: row.set_name,
    card_number: row.card_number,
    card_name: row.card_name,
    variant_key: row.variant_key,
    stamp_label: row.stamp_label,
    finish_key: row.finish_key,
    queries,
    source_status: sourceStatus,
    search_status: sourceStatus,
    search_error: searchError,
    listings_reviewed: 0,
    exact_title_match_count: 0,
    partial_title_match_count: 0,
    exact_title_matches: [],
    partial_title_matches: [],
    rejected_title_samples: [],
    review_status: sourceStatus,
  };
}

function renderMarkdown(report) {
  const summaryRows = Object.entries(report.summary.by_review_status).map(([status, count]) => [status, count]);
  const matchRows = report.rows
    .filter((row) => (
      row.exact_title_match_count > 0
      || row.partial_title_match_count > 0
      || row.variant_title_review_count > 0
      || row.search_status !== 'ok'
    ))
    .slice(0, 80)
    .map((row) => [
      row.set_key,
      row.card_number,
      row.card_name,
      row.stamp_label,
      row.finish_key,
      row.search_status,
      row.exact_title_match_count,
      row.partial_title_match_count,
      row.variant_title_review_count,
      row.review_status,
    ]);

  return [
    '# League Marketplace Scan Sources V1',
    '',
    'Audit-only marketplace scan for the post-Collexy League Stamp finish-source bucket. This report does not promote marketplace listings into canonical truth and does not perform DB writes.',
    '',
    '## Safety',
    '',
    `- audit_only: ${report.audit_only}`,
    `- db_writes_performed: ${report.db_writes_performed}`,
    `- migrations_created: ${report.migrations_created}`,
    `- cleanup_performed: ${report.cleanup_performed}`,
    `- write_ready_now: ${report.write_ready_now}`,
    `- source_policy: ${report.source_policy}`,
    '',
    '## Summary',
    '',
    `- rows_available_from_packet: ${report.summary.rows_available_from_packet}`,
    `- rows_targeted: ${report.summary.rows_targeted}`,
    `- browse_queries_attempted: ${report.summary.browse_queries_attempted}`,
    `- browse_queries_succeeded: ${report.summary.browse_queries_succeeded}`,
    `- exact_title_match_rows: ${report.summary.exact_title_match_rows}`,
    `- exact_title_matches: ${report.summary.exact_title_matches}`,
    `- partial_title_match_rows: ${report.summary.partial_title_match_rows}`,
    `- variant_title_review_rows: ${report.summary.variant_title_review_rows}`,
    `- credentials_state: ${report.source_runtime.credentials_state}`,
    `- fingerprint_sha256: \`${report.fingerprint_sha256}\``,
    '',
    markdownTable(['review_status', 'count'], summaryRows),
    '',
    '## Review Rows',
    '',
    matchRows.length
      ? markdownTable(['set', 'number', 'card', 'stamp', 'finish', 'search', 'exact', 'partial', 'variant review', 'status'], matchRows)
      : 'No exact or partial title evidence was found.',
    '',
    '## Governance',
    '',
    '- Marketplace listings are volatile review evidence only.',
    '- Exact title matches are not Master Index truth without preserved source URLs and a separate source-delta/adjudication pass.',
    '- Generic League Stamp rows must not be promoted from broad listing language.',
    '- This lane can reduce manual search time but cannot close rows by itself.',
    '',
  ].join('\n');
}

async function main() {
  const input = await readJson(INPUT_JSON);
  const rowLimit = Math.max(1, Number(cliValue('limit', DEFAULT_ROW_LIMIT)) || DEFAULT_ROW_LIMIT);
  const queryLimit = Math.max(1, Number(cliValue('query-limit', DEFAULT_QUERY_LIMIT)) || DEFAULT_QUERY_LIMIT);
  const listingLimit = Math.max(1, Number(cliValue('listing-limit', DEFAULT_LISTING_LIMIT)) || DEFAULT_LISTING_LIMIT);
  const dryRun = hasFlag('dry-run');
  const availableRows = targetRows(input);
  const rows = availableRows.slice(0, rowLimit);
  const credentialsState = sourceCredentialsState();
  const results = [];
  let browseQueriesAttempted = 0;
  let browseQueriesSucceeded = 0;

  for (const row of rows) {
    const queries = searchQueriesForRow(row).slice(0, queryLimit);
    if (dryRun) {
      results.push(unavailableRow(row, queries, 'dry_run_not_queried'));
      continue;
    }
    if (credentialsState === 'missing_credentials') {
      results.push(unavailableRow(row, queries, 'source_unavailable_missing_credentials'));
      continue;
    }

    const reviewedListings = [];
    const queryErrors = [];
    for (const query of queries) {
      browseQueriesAttempted += 1;
      let search;
      try {
        search = await searchBrowse({ query, limit: listingLimit });
      } catch (error) {
        queryErrors.push({
          query,
          error: error?.cause?.code
            ? `${error.message} (${error.cause.code}: ${error.cause.message})`
            : (error?.message ?? String(error)),
        });
        continue;
      }
      if (!search.ok) {
        queryErrors.push({
          query,
          error: `error_${search.status}`,
          error_snippet: search.error_snippet,
        });
        continue;
      }
      browseQueriesSucceeded += 1;
      for (const listing of search.listings) {
        if (reviewedListings.some((existing) => existing.item_id && existing.item_id === listing.item_id)) continue;
        reviewedListings.push({
          ...listing,
          source_query: query,
          validation: validateListing(row, listing),
        });
      }
    }

    const exactTitleMatches = reviewedListings.filter((listing) => listing.validation.accepted);
    const partialTitleMatches = reviewedListings
      .filter((listing) => !listing.validation.accepted)
      .filter((listing) => {
        const checks = listing.validation.checks;
        return checks.card_name && checks.card_number && checks.variant && checks.active_finish && checks.unsafe_terms_absent;
      });
    const variantTitleMatches = reviewedListings
      .filter((listing) => !listing.validation.accepted)
      .filter((listing) => {
        const checks = listing.validation.checks;
        return checks.card_name && checks.card_number && checks.variant && checks.unsafe_terms_absent;
      });
    const rejected = reviewedListings
      .filter((listing) => !listing.validation.accepted)
      .slice(0, 3)
      .map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        source_query: listing.source_query,
        rejection_reasons: listing.validation.rejection_reasons,
      }));

    results.push({
      set_key: row.set_key,
      set_name: row.set_name,
      card_number: row.card_number,
      card_name: row.card_name,
      variant_key: row.variant_key,
      stamp_label: row.stamp_label,
      finish_key: row.finish_key,
      queries,
      source_status: queryErrors.length === queries.length ? 'source_error' : 'available',
      search_status: queryErrors.length === queries.length ? 'source_error' : 'ok',
      search_errors: queryErrors,
      listings_reviewed: reviewedListings.length,
      exact_title_match_count: exactTitleMatches.length,
      partial_title_match_count: partialTitleMatches.length,
      variant_title_review_count: variantTitleMatches.length,
      exact_title_matches: exactTitleMatches.map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        item_id: listing.item_id,
        source_query: listing.source_query,
        condition: listing.condition,
        validation_checks: listing.validation.checks,
        observed_finish_keys: listing.validation.observed_finish_keys,
      })),
      partial_title_matches: partialTitleMatches.map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        item_id: listing.item_id,
        source_query: listing.source_query,
        condition: listing.condition,
        validation_checks: listing.validation.checks,
        observed_finish_keys: listing.validation.observed_finish_keys,
        missing_checks: listing.validation.rejection_reasons,
      })),
      variant_title_review_matches: variantTitleMatches.map((listing) => ({
        title: listing.title,
        item_web_url: listing.item_web_url,
        item_id: listing.item_id,
        source_query: listing.source_query,
        condition: listing.condition,
        validation_checks: listing.validation.checks,
        observed_finish_keys: listing.validation.observed_finish_keys,
        missing_checks: listing.validation.rejection_reasons,
      })),
      rejected_title_samples: rejected,
      review_status: exactTitleMatches.length > 0
        ? 'exact_title_review_candidate_not_promotable'
        : (partialTitleMatches.length > 0
          ? 'partial_title_review_only'
          : (variantTitleMatches.length > 0
            ? 'variant_title_finish_review_only'
            : (queryErrors.length === queries.length ? 'source_error' : 'no_usable_title_evidence'))),
    });
  }

  const exactTitleMatchRows = results.filter((row) => row.exact_title_match_count > 0).length;
  const partialTitleMatchRows = results.filter((row) => row.partial_title_match_count > 0).length;
  const variantTitleReviewRows = results.filter((row) => row.variant_title_review_count > 0).length;
  const reportBase = {
    generated_at: new Date().toISOString(),
    version: 'league_marketplace_scan_sources_v1',
    package_id: PACKAGE_ID,
    audit_only: true,
    db_writes_performed: false,
    durable_db_writes_performed: false,
    migrations_created: false,
    cleanup_performed: false,
    quarantine_performed: false,
    apply_performed: false,
    write_ready_now: 0,
    source_policy: 'eBay Browse listing titles are volatile review evidence only; they are not automatically promoted into Master Index truth.',
    source_runtime: {
      source_kind: 'marketplace_checklist',
      source_key: 'ebay_browse',
      credentials_state: credentialsState,
      node_tls_reject_unauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? null,
      local_tls_override_used: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0',
    },
    input_artifact: rel(INPUT_JSON),
    source_query_limits: {
      row_limit: rowLimit,
      query_limit: queryLimit,
      listing_limit: listingLimit,
      dry_run: dryRun,
    },
    summary: {
      rows_available_from_packet: availableRows.length,
      rows_targeted: rows.length,
      browse_queries_attempted: browseQueriesAttempted,
      browse_queries_succeeded: browseQueriesSucceeded,
      exact_title_match_rows: exactTitleMatchRows,
      exact_title_matches: results.reduce((sum, row) => sum + Number(row.exact_title_match_count ?? 0), 0),
      partial_title_match_rows: partialTitleMatchRows,
      variant_title_review_rows: variantTitleReviewRows,
      variant_title_review_matches: results.reduce((sum, row) => sum + Number(row.variant_title_review_count ?? 0), 0),
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
      input_artifact: reportBase.input_artifact,
      source_policy: reportBase.source_policy,
      source_query_limits: reportBase.source_query_limits,
      rows: results,
    })),
  };

  await writeJson(OUTPUT_JSON, report);
  await writeText(OUTPUT_MD, renderMarkdown(report));

  console.log(JSON.stringify({
    package_id: PACKAGE_ID,
    output_json: rel(OUTPUT_JSON),
    rows_targeted: report.summary.rows_targeted,
    browse_queries_attempted: report.summary.browse_queries_attempted,
    browse_queries_succeeded: report.summary.browse_queries_succeeded,
    exact_title_match_rows: report.summary.exact_title_match_rows,
    partial_title_match_rows: report.summary.partial_title_match_rows,
    variant_title_review_rows: report.summary.variant_title_review_rows,
    write_ready_now: report.write_ready_now,
    credentials_state: credentialsState,
    fingerprint_sha256: report.fingerprint_sha256,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
