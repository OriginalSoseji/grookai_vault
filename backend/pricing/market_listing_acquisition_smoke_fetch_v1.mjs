import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

import "../env.mjs";
import { classifyMarketListingEvidence } from "./market_listing_evidence_classification_v1.mjs";

export const MARKET_LISTING_ACQUISITION_SMOKE_FETCH_VERSION = "MEE_11E_MARKET_LISTING_ACQUISITION_SMOKE_FETCH_V1";
export const EXPECTED_MEE_11D_PACKAGE_FINGERPRINT = "d559f29dccb92922cf9e945e3a00e4e6ac4221779f7d91b8fba789f0005362cb";
export const EXPECTED_MEE_11D_REQUEST_MANIFEST_HASH = "4752a516ed812b95cf34c555b2520ae628b7babe7fddffbe96bc9cfc446ad277";
export const EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH = "2ee4623c3e22e5d67cba9016113e9e9f999dc808aab1f03b665bcb25a72f2af4";

export const DEFAULT_SMOKE_REQUEST_LIMIT = 5;
export const DEFAULT_SMOKE_RESULT_LIMIT = 5;
export const MAX_EBAY_BROWSE_RESULT_LIMIT = 200;

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stable(nested)]));
  }
  return value;
}

function sha256(value) {
  const text = typeof value === "string" ? value : JSON.stringify(stable(value));
  return createHash("sha256").update(text).digest("hex");
}

function countBy(rows, getKey) {
  const counts = {};
  for (const row of rows) {
    const key = getKey(row);
    if (key === null || key === undefined || key === "") continue;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function browseBaseUrl() {
  return (process.env.EBAY_BROWSE_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
}

function oauthBaseUrl() {
  return (process.env.EBAY_OAUTH_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
}

function marketplaceId() {
  return process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function itemPrice(item, key) {
  return {
    value: safeNumber(item?.[key]?.value),
    currency: item?.[key]?.currency ?? null,
  };
}

async function getEbayBrowseToken() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) {
    return process.env.EBAY_BROWSE_ACCESS_TOKEN.trim();
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID?.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("[market-listing-smoke-fetch] missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });
  const response = await fetch(`${oauthBaseUrl()}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`[market-listing-smoke-fetch] eBay token failed: ${response.status} ${response.statusText} ${text.slice(0, 240)}`);
  }
  const payload = JSON.parse(text);
  cachedToken = payload.access_token;
  cachedTokenExpiresAt = Date.now() + Number(payload.expires_in ?? 7200) * 1000;
  return cachedToken;
}

function invokePowerShellJson(script, input) {
  return new Promise((resolve, reject) => {
    const child = spawn("powershell", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`[market-listing-smoke-fetch] PowerShell HTTPS fallback failed (${code}): ${stderr.slice(0, 500)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`[market-listing-smoke-fetch] PowerShell HTTPS fallback returned invalid JSON: ${error.message}`));
      }
    });
    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

function buildSearchUrl(request, { resultLimit }) {
  const url = new URL("/buy/browse/v1/item_summary/search", browseBaseUrl());
  url.searchParams.set("q", request.query_text);
  url.searchParams.set("limit", String(Math.max(1, Math.min(Number(resultLimit) || DEFAULT_SMOKE_RESULT_LIMIT, MAX_EBAY_BROWSE_RESULT_LIMIT))));
  if (Number.isFinite(Number(request.offset)) && Number(request.offset) > 0) {
    url.searchParams.set("offset", String(Number(request.offset)));
  }
  url.searchParams.set("category_ids", "183454");
  url.searchParams.set("fieldgroups", "MATCHING_ITEMS");
  return url;
}

async function fetchEbayBrowseSummaryViaPowerShell(request, { resultLimit }) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$base = if ($env:EBAY_BROWSE_BASE_URL) { $env:EBAY_BROWSE_BASE_URL.TrimEnd('/') } else { 'https://api.ebay.com' }
$oauth = if ($env:EBAY_OAUTH_BASE_URL) { $env:EBAY_OAUTH_BASE_URL.TrimEnd('/') } else { 'https://api.ebay.com' }
$marketplace = if ($env:EBAY_MARKETPLACE_ID) { $env:EBAY_MARKETPLACE_ID } else { 'EBAY_US' }
if ($env:EBAY_BROWSE_ACCESS_TOKEN) {
  $accessToken = $env:EBAY_BROWSE_ACCESS_TOKEN
} else {
  $pair = '{0}:{1}' -f $env:EBAY_CLIENT_ID, $env:EBAY_CLIENT_SECRET
  $basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
  $tokenBody = @{
    grant_type = 'client_credentials'
    scope = 'https://api.ebay.com/oauth/api_scope'
  }
  $token = Invoke-RestMethod -Method Post -Uri "$oauth/identity/v1/oauth2/token" -Headers @{ Authorization = "Basic $basic" } -ContentType 'application/x-www-form-urlencoded' -Body $tokenBody
  $accessToken = $token.access_token
}
$encodedQuery = [uri]::EscapeDataString([string]$payload.query)
$offsetPart = if ($payload.offset -and $payload.offset -gt 0) { "&offset=$($payload.offset)" } else { "" }
$searchUrl = "$base/buy/browse/v1/item_summary/search?q=$encodedQuery&limit=$($payload.limit)$offsetPart&category_ids=183454&fieldgroups=MATCHING_ITEMS"
$statusFormat = [Environment]::NewLine + '__HTTP_STATUS__:%{http_code}'
$curlArgs = @(
  '-sS',
  '-L',
  '--ssl-no-revoke',
  '-w',
  $statusFormat,
  '-H',
  ('Authorization' + ': ' + 'Bearer ' + $accessToken),
  '-H',
  'Accept: application/json',
  '-H',
  "X-EBAY-C-MARKETPLACE-ID: $marketplace",
  "$searchUrl"
)
$curlResult = & curl.exe @curlArgs
if ($LASTEXITCODE -ne 0) {
  throw "curl.exe failed with exit code $LASTEXITCODE"
}
$rawText = ($curlResult -join [Environment]::NewLine)
$marker = [Environment]::NewLine + '__HTTP_STATUS__:'
$markerIndex = $rawText.LastIndexOf($marker)
if ($markerIndex -lt 0) {
  throw "curl.exe response missing HTTP status marker"
}
$content = $rawText.Substring(0, $markerIndex)
$statusCode = [int]$rawText.Substring($markerIndex + $marker.Length)
$payloadBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content))
[pscustomobject]@{
  source_fetch_url = $searchUrl
  response_status = $statusCode
  payload_base64 = $payloadBase64
} | ConvertTo-Json -Depth 80 -Compress
`;
  const fallback = await invokePowerShellJson(script, {
    query: request.query_text,
    offset: Number.isFinite(Number(request.offset)) ? Number(request.offset) : 0,
    limit: Math.max(1, Math.min(Number(resultLimit) || DEFAULT_SMOKE_RESULT_LIMIT, MAX_EBAY_BROWSE_RESULT_LIMIT)),
  });
  return {
    source_fetch_url: fallback.source_fetch_url,
    response_status: fallback.response_status,
    payload: JSON.parse(Buffer.from(fallback.payload_base64, "base64").toString("utf8")),
  };
}

function projectObservation({ request, item, observedAt }) {
  const price = itemPrice(item, "price");
  const shipping = item?.shippingOptions?.[0]?.shippingCost
    ? {
        value: safeNumber(item.shippingOptions[0].shippingCost.value),
        currency: item.shippingOptions[0].shippingCost.currency ?? price.currency,
      }
    : { value: null, currency: price.currency };
  const total = price.value === null
    ? null
    : price.value + (shipping.value ?? 0);

  return {
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    source_listing_id: item?.itemId ?? null,
    source_url: item?.itemWebUrl ?? item?.itemAffiliateWebUrl ?? null,
    listing_title: item?.title ?? null,
    listing_status: "active",
    listing_format: Array.isArray(item?.buyingOptions) && item.buyingOptions.includes("AUCTION")
      ? "auction"
      : "fixed_price",
    ask_price: price.value,
    shipping_price: shipping.value,
    total_ask_price: total,
    currency: price.currency ?? shipping.currency ?? null,
    condition_text: item?.condition ?? item?.conditionDescription ?? null,
    item_location: item?.itemLocation?.country ?? null,
    seller_key: item?.seller?.username ?? item?.seller?.sellerAccountType ?? null,
    observed_at: observedAt,
    ...classifyMarketListingEvidence({
      title: item?.title,
      conditionText: item?.condition ?? item?.conditionDescription,
    }),
    target: {
      card_print_id: request.card_print_id,
      gv_id: request.gv_id,
      card_printing_id: request.card_printing_id ?? null,
      printing_gv_id: request.printing_gv_id ?? null,
      finish_key: request.finish_key ?? null,
      query_key: request.query_key,
      strategy: request.strategy,
      query_text: request.query_text,
      offset: Number.isFinite(Number(request.offset)) ? Number(request.offset) : 0,
      target_kind: request.target_hints?.target_kind ?? (request.strategy?.startsWith("set_shelf_") ? "set_shelf" : "card_identity"),
      set_code: request.target_hints?.set_code ?? null,
      set_name: request.target_hints?.set_name ?? null,
      shelf_intelligence_allowed: request.target_hints?.shelf_intelligence_allowed === true,
      query_score: request.target_hints?.query_score ?? null,
    },
  };
}

export async function fetchEbayBrowseSummary(request, { resultLimit, observedAt }) {
  const searchUrl = buildSearchUrl(request, { resultLimit });
  let payload = null;
  let responseStatus = null;
  let sourceFetchUrl = searchUrl.toString();

  try {
    const token = await getEbayBrowseToken();
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId(),
      },
    });
    responseStatus = response.status;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { parse_error: true, raw_text_snippet: text.slice(0, 1000) };
      }
    }
    if (!response.ok) {
      const error = new Error(`[market-listing-smoke-fetch] eBay Browse search failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
  } catch (error) {
    if (error?.status) throw error;
    const fallback = await fetchEbayBrowseSummaryViaPowerShell(request, { resultLimit });
    responseStatus = fallback.response_status ?? 200;
    payload = fallback.payload;
    sourceFetchUrl = fallback.source_fetch_url;
  }

  const items = Array.isArray(payload?.itemSummaries) ? payload.itemSummaries : [];
  return {
    query_key: request.query_key,
    source: "ebay_active",
    provider_route: "ebay_browse_api",
    source_fetch_url: sourceFetchUrl,
    response_status: responseStatus,
    provider_total: safeNumber(payload?.total) ?? items.length,
    fetched_item_count: items.length,
    raw_payload: payload,
    projected_observations: items.map((item) => projectObservation({ request, item, observedAt })),
    payload_hash: sha256(payload ?? {}),
  };
}

function validateDryRunPlan(plan, findings) {
  if (plan?.package_fingerprint_sha256 !== EXPECTED_MEE_11D_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (plan?.request_manifest_hash_sha256 !== EXPECTED_MEE_11D_REQUEST_MANIFEST_HASH) findings.push("request_manifest_hash_mismatch");
  if (plan?.schema_migration_hash_sha256 !== EXPECTED_MARKET_LISTING_SCHEMA_MIGRATION_HASH) findings.push("schema_migration_hash_mismatch");
  if (plan?.ready_for_acquisition_approval !== true) findings.push("dry_run_plan_not_ready");
  if (!Array.isArray(plan?.acquisition_requests)) findings.push("missing_acquisition_requests");
}

function errorReason(error) {
  const reason = error?.message ?? String(error);
  const cause = error?.cause?.code || error?.cause?.message;
  return cause ? `${reason} (${cause})` : reason;
}

export async function buildMarketListingAcquisitionSmokeFetchReportV1({
  dryRunPlan,
  requestLimit = DEFAULT_SMOKE_REQUEST_LIMIT,
  resultLimit = DEFAULT_SMOKE_RESULT_LIMIT,
  generatedAt = new Date().toISOString(),
  fetchListing = fetchEbayBrowseSummary,
} = {}) {
  const findings = [];
  validateDryRunPlan(dryRunPlan, findings);

  const cappedRequestLimit = Math.max(1, Math.min(Number(requestLimit) || DEFAULT_SMOKE_REQUEST_LIMIT, 25));
  const cappedResultLimit = Math.max(1, Math.min(Number(resultLimit) || DEFAULT_SMOKE_RESULT_LIMIT, 10));
  const approvedRequests = Array.isArray(dryRunPlan?.acquisition_requests)
    ? dryRunPlan.acquisition_requests.slice(0, cappedRequestLimit)
    : [];

  const requestResults = [];
  const rawSnapshots = [];
  const projectedObservations = [];

  if (findings.length === 0) {
    for (const request of approvedRequests) {
      try {
        const response = await fetchListing(request, {
          resultLimit: cappedResultLimit,
          observedAt: generatedAt,
        });
        requestResults.push({
          query_key: request.query_key,
          gv_id: request.gv_id,
          strategy: request.strategy,
          query_text: request.query_text,
          fetch_status: "fetched_success",
          response_status: response.response_status,
          provider_total: response.provider_total,
          fetched_item_count: response.fetched_item_count,
          payload_hash: response.payload_hash,
        });
        const observations = response.projected_observations.map((observation) => ({
          ...observation,
          ...classifyMarketListingEvidence({
            title: observation.listing_title,
            conditionText: observation.condition_text,
          }),
        }));
        rawSnapshots.push({
          ...response,
          projected_observations: observations,
        });
        projectedObservations.push(...observations);
      } catch (error) {
        requestResults.push({
          query_key: request.query_key,
          gv_id: request.gv_id,
          strategy: request.strategy,
          query_text: request.query_text,
          fetch_status: "fetched_error",
          response_status: error?.status ?? null,
          reason: errorReason(error),
          provider_total: 0,
          fetched_item_count: 0,
        });
      }
    }
  }

  const rawSnapshotManifestHash = sha256(rawSnapshots.map((snapshot) => ({
    query_key: snapshot.query_key,
    source_fetch_url: snapshot.source_fetch_url,
    response_status: snapshot.response_status,
    provider_total: snapshot.provider_total,
    fetched_item_count: snapshot.fetched_item_count,
    payload_hash: snapshot.payload_hash,
  })));
  const observationManifestHash = sha256(projectedObservations.map((observation) => ({
    source_listing_id: observation.source_listing_id,
    listing_title: observation.listing_title,
    total_ask_price: observation.total_ask_price,
    currency: observation.currency,
    gv_id: observation.target.gv_id,
    printing_gv_id: observation.target.printing_gv_id ?? null,
    finish_key: observation.target.finish_key ?? null,
    listing_evidence_class: observation.listing_evidence_class,
    listing_evidence_tags: observation.listing_evidence_tags,
  })));

  if (projectedObservations.some((observation) => observation.source !== "ebay_active")) findings.push("unexpected_observation_source");

  const packageFingerprint = sha256({
    package_id: "MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1",
    version: MARKET_LISTING_ACQUISITION_SMOKE_FETCH_VERSION,
    dry_run_package_fingerprint: dryRunPlan?.package_fingerprint_sha256 ?? null,
    dry_run_request_manifest_hash: dryRunPlan?.request_manifest_hash_sha256 ?? null,
    request_limit: cappedRequestLimit,
    result_limit: cappedResultLimit,
    request_results: requestResults,
    raw_snapshot_manifest_hash: rawSnapshotManifestHash,
    observation_manifest_hash: observationManifestHash,
    boundary: {
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      public_pricing: false,
    },
  });

  return {
    package_id: "MARKET-LISTING-ACQUISITION-SMOKE-FETCH-V1",
    version: MARKET_LISTING_ACQUISITION_SMOKE_FETCH_VERSION,
    generated_at: generatedAt,
    mode: "approved_provider_fetch_local_artifacts_only",
    source_package_fingerprint_sha256: dryRunPlan?.package_fingerprint_sha256 ?? null,
    request_manifest_hash_sha256: dryRunPlan?.request_manifest_hash_sha256 ?? null,
    schema_migration_hash_sha256: dryRunPlan?.schema_migration_hash_sha256 ?? null,
    package_fingerprint_sha256: packageFingerprint,
    raw_snapshot_manifest_hash_sha256: rawSnapshotManifestHash,
    projected_observation_manifest_hash_sha256: observationManifestHash,
    summary: {
      approved_request_count: approvedRequests.length,
      attempted_request_count: requestResults.length,
      request_limit: cappedRequestLimit,
      result_limit: cappedResultLimit,
      fetch_status_counts: countBy(requestResults, (result) => result.fetch_status),
      provider_total_sum: requestResults.reduce((sum, result) => sum + (result.provider_total ?? 0), 0),
      fetched_item_count: rawSnapshots.reduce((sum, snapshot) => sum + snapshot.fetched_item_count, 0),
      projected_observation_count: projectedObservations.length,
      unique_listing_count: new Set(projectedObservations.map((observation) => observation.source_listing_id).filter(Boolean)).size,
      unique_target_count_with_results: new Set(projectedObservations.map((observation) => observation.target.card_print_id).filter(Boolean)).size,
      unique_printing_target_count_with_results: new Set(projectedObservations.map((observation) => observation.target.card_printing_id).filter(Boolean)).size,
    },
    boundary: {
      provider_calls: true,
      source_fetches: true,
      local_artifacts_only: true,
      db_writes: false,
      market_listing_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_pricing_views: false,
      app_visible_pricing: false,
      public_price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    request_results: requestResults,
    raw_snapshots: rawSnapshots,
    projected_observations: projectedObservations,
    findings,
    ready_for_local_db_backfill_plan: findings.length === 0 && rawSnapshots.length > 0,
  };
}
