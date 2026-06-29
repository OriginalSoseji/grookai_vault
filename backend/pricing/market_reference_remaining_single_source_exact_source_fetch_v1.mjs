import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

import "../env.mjs";

import { createMarketEvidenceCandidateV1 } from "./market_evidence_source_registry_v1.mjs";

export const MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_FETCH_VERSION = "MEE_09Q_REMAINING_SINGLE_SOURCE_EXACT_SOURCE_FETCH_V1";
export const EXPECTED_MEE_09P_PACKAGE_FINGERPRINT = "aa015df3496947b1bc31c028c5c0fca848fccf85c129b94ddc80ef39c84aa077";
export const EXPECTED_MEE_09P_REQUEST_MANIFEST_HASH = "b1c26732b0c6b6e8e3044f6b021f5218dd277752efb54bc04482787ce19746a7";
export const EXPECTED_MEE_09O_PLAN_HASH = "26025f364fef1fc76213523120aa3b2515f866925bf2f3f7e7aa22a832eca47b";

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

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function browseBaseUrl() {
  const baseUrl = process.env.EBAY_BROWSE_BASE_URL || "https://api.ebay.com";
  return baseUrl.replace(/\/+$/, "");
}

async function getEbayBrowseTokenNoBudgetWrite() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN?.trim()) {
    return process.env.EBAY_BROWSE_ACCESS_TOKEN.trim();
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("[remaining-single-source-fetch] missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET");
  }

  const oauthBase = (process.env.EBAY_OAUTH_BASE_URL || "https://api.ebay.com").replace(/\/+$/, "");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });
  const response = await fetch(`${oauthBase}/identity/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`[remaining-single-source-fetch] eBay token failed: ${response.status} ${response.statusText} ${text.slice(0, 200)}`);
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
        reject(new Error(`[remaining-single-source-fetch] PowerShell HTTPS fallback failed (${code}): ${stderr.slice(0, 400)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`[remaining-single-source-fetch] PowerShell HTTPS fallback returned invalid JSON: ${error.message}`));
      }
    });
    child.stdin.end(`${JSON.stringify(input)}\n`);
  });
}

async function fetchEbayBrowseViaPowerShell(request, { limit }) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$base = if ($env:EBAY_BROWSE_BASE_URL) { $env:EBAY_BROWSE_BASE_URL.TrimEnd('/') } else { 'https://api.ebay.com' }
$oauth = if ($env:EBAY_OAUTH_BASE_URL) { $env:EBAY_OAUTH_BASE_URL.TrimEnd('/') } else { 'https://api.ebay.com' }
$pair = '{0}:{1}' -f $env:EBAY_CLIENT_ID, $env:EBAY_CLIENT_SECRET
$basic = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
$tokenBody = @{
  grant_type = 'client_credentials'
  scope = 'https://api.ebay.com/oauth/api_scope'
}
$token = Invoke-RestMethod -Method Post -Uri "$oauth/identity/v1/oauth2/token" -Headers @{ Authorization = "Basic $basic" } -ContentType 'application/x-www-form-urlencoded' -Body $tokenBody
$encodedQuery = [uri]::EscapeDataString([string]$payload.query)
$searchUrl = "$base/buy/browse/v1/item_summary/search?q=$encodedQuery&limit=$($payload.limit)&fieldgroups=EXTENDED"
$result = Invoke-RestMethod -Method Get -Uri $searchUrl -Headers @{
  Authorization = "Bearer $($token.access_token)"
  Accept = 'application/json'
  'X-EBAY-C-MARKETPLACE-ID' = 'EBAY_US'
}
[pscustomobject]@{
  source_fetch_url = $searchUrl
  payload = $result
} | ConvertTo-Json -Depth 30 -Compress
`;
  return invokePowerShellJson(script, {
    query: request.query_text,
    limit: Math.max(1, Math.min(Number(limit) || 3, 10)),
  });
}

function itemUrl(item) {
  return item?.itemWebUrl ?? item?.webUrl ?? item?.itemAffiliateWebUrl ?? null;
}

function listingToCandidate({ request, item, observedAt }) {
  return createMarketEvidenceCandidateV1({
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    source: "ebay_active",
    source_url: itemUrl(item),
    raw_title: item?.title ?? null,
    raw_price: safeNumber(item?.price?.value),
    currency: item?.price?.currency ?? "USD",
    condition_hint: item?.condition ?? item?.conditionDescription ?? null,
    finish_hint: null,
    observed_at: observedAt,
    match_confidence_hint: "exact_candidate",
    exclusion_flags: [],
    needs_review: true,
    raw_payload: {
      provider: "ebay_browse",
      item_id: item?.itemId ?? null,
      title: item?.title ?? null,
      price: item?.price ?? null,
      condition: item?.condition ?? null,
      buying_options: Array.isArray(item?.buyingOptions) ? item.buyingOptions : [],
      item_location_country: item?.itemLocation?.country ?? null,
      categories: item?.categories ?? null,
      query_text: request.query_text,
      acquisition_request_key: request.acquisition_request_key,
    },
  });
}

export async function fetchEbayBrowseActiveCandidatesNoDbWriteV1(request, { limit = 3, observedAt = new Date().toISOString() } = {}) {
  const searchUrl = new URL("/buy/browse/v1/item_summary/search", browseBaseUrl());
  searchUrl.searchParams.set("q", request.query_text);
  searchUrl.searchParams.set("limit", String(Math.max(1, Math.min(Number(limit) || 3, 10))));
  searchUrl.searchParams.set("fieldgroups", "EXTENDED");

  let payload = null;
  let sourceFetchUrl = searchUrl.toString();
  try {
    const token = await getEbayBrowseTokenNoBudgetWrite();
    const response = await fetch(sourceFetchUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { parse_error: true, raw_text_snippet: text.slice(0, 400) };
      }
    }

    if (!response.ok) {
      const error = new Error(`[remaining-single-source-fetch] eBay Browse search failed: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.response = payload ?? text.slice(0, 400);
      throw error;
    }
  } catch (error) {
    if (error?.cause?.code !== "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      throw error;
    }
    const fallback = await fetchEbayBrowseViaPowerShell(request, { limit });
    payload = fallback.payload;
    sourceFetchUrl = fallback.source_fetch_url;
  }

  const items = Array.isArray(payload?.itemSummaries) ? payload.itemSummaries : [];
  return {
    request,
    source_fetch_url: sourceFetchUrl,
    provider_result_count: Number(payload?.total ?? items.length),
    fetched_item_count: items.length,
    candidate_evidence: items
      .map((item) => listingToCandidate({ request, item, observedAt }))
      .filter(Boolean),
  };
}

function skippedResult(request, fetchStatus, reason) {
  return {
    acquisition_request_key: request.acquisition_request_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    source: request.source,
    query_text: request.query_text,
    source_fetch_url: null,
    fetch_status: fetchStatus,
    reason,
    provider_result_count: 0,
    fetched_item_count: 0,
    candidate_count: 0,
  };
}

function successResult(request, response) {
  return {
    acquisition_request_key: request.acquisition_request_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    source: request.source,
    query_text: request.query_text,
    source_fetch_url: response.source_fetch_url,
    fetch_status: "fetched_success",
    reason: null,
    provider_result_count: response.provider_result_count,
    fetched_item_count: response.fetched_item_count,
    candidate_count: response.candidate_evidence.length,
  };
}

function errorResult(request, error) {
  return {
    acquisition_request_key: request.acquisition_request_key,
    card_print_id: request.card_print_id,
    gv_id: request.gv_id,
    source: request.source,
    query_text: request.query_text,
    source_fetch_url: null,
    fetch_status: "fetched_error",
    reason: error?.message ?? String(error),
    provider_result_count: 0,
    fetched_item_count: 0,
    candidate_count: 0,
  };
}

export async function buildRemainingSingleSourceExactSourceFetchReportV1({
  acquisitionPlan,
  fetchActiveListings = fetchEbayBrowseActiveCandidatesNoDbWriteV1,
  generatedAt = new Date().toISOString(),
  activeLimit = 3,
} = {}) {
  if (!acquisitionPlan || typeof acquisitionPlan !== "object") {
    throw new Error("[remaining-single-source-fetch] acquisitionPlan is required");
  }
  if (!Array.isArray(acquisitionPlan.acquisition_requests)) {
    throw new Error("[remaining-single-source-fetch] acquisitionPlan.acquisition_requests must be an array");
  }

  const findings = [];
  if (acquisitionPlan.package_fingerprint_sha256 !== EXPECTED_MEE_09P_PACKAGE_FINGERPRINT) findings.push("package_fingerprint_mismatch");
  if (acquisitionPlan.acquisition_request_manifest_hash_sha256 !== EXPECTED_MEE_09P_REQUEST_MANIFEST_HASH) findings.push("request_manifest_hash_mismatch");
  if (acquisitionPlan.exact_plan_hash_sha256 !== EXPECTED_MEE_09O_PLAN_HASH) findings.push("exact_plan_hash_mismatch");
  if (acquisitionPlan.ready_for_fetch_approval !== true) findings.push("acquisition_plan_not_ready");

  const requestResults = [];
  const candidateEvidence = [];
  if (findings.length === 0) {
    for (const request of acquisitionPlan.acquisition_requests) {
      if (request.source === "manual_review_candidate") {
        requestResults.push(skippedResult(request, "seeded_no_provider_fetch", "manual review route is a local review seed"));
        continue;
      }
      if (request.source === "ebay_sold_candidate") {
        requestResults.push(skippedResult(request, "not_fetched_no_approved_sold_access_path", "sold/completed eBay access path is not implemented in this package"));
        continue;
      }
      if (request.source !== "ebay_active") {
        requestResults.push(skippedResult(request, "not_fetched_unexpected_source", "source is outside approved fetch implementation"));
        continue;
      }
      try {
        const response = await fetchActiveListings(request, { limit: activeLimit, observedAt: generatedAt });
        requestResults.push(successResult(request, response));
        candidateEvidence.push(...response.candidate_evidence);
      } catch (error) {
        requestResults.push(errorResult(request, error));
      }
    }
  }

  const candidateHash = sha256(candidateEvidence.map((candidate) => ({
    card_print_id: candidate.card_print_id,
    gv_id: candidate.gv_id,
    source: candidate.source,
    source_url: candidate.source_url,
    raw_title: candidate.raw_title,
    raw_price: candidate.raw_price,
    currency: candidate.currency,
    observed_at: candidate.observed_at,
  })));

  if (candidateEvidence.some((candidate) => candidate.can_publish_price_directly !== false)) findings.push("direct_publish_candidate_detected");
  if (candidateEvidence.some((candidate) => candidate.needs_review !== true)) findings.push("candidate_missing_review_gate");

  return {
    package_id: "MARKET-REFERENCE-REMAINING-SINGLE-SOURCE-EXACT-SOURCE-FETCH-V1",
    version: MARKET_REFERENCE_REMAINING_SINGLE_SOURCE_EXACT_FETCH_VERSION,
    generated_at: generatedAt,
    mode: "approved_provider_fetch_local_artifacts_only",
    source_package_fingerprint_sha256: acquisitionPlan.package_fingerprint_sha256 ?? null,
    request_manifest_hash_sha256: acquisitionPlan.acquisition_request_manifest_hash_sha256 ?? null,
    exact_plan_hash_sha256: acquisitionPlan.exact_plan_hash_sha256 ?? null,
    candidate_evidence_manifest_hash_sha256: candidateHash,
    summary: {
      request_count: acquisitionPlan.acquisition_requests.length,
      request_source_counts: countBy(acquisitionPlan.acquisition_requests, (request) => request.source),
      fetch_status_counts: countBy(requestResults, (result) => result.fetch_status),
      candidate_count: candidateEvidence.length,
      candidate_source_counts: countBy(candidateEvidence, (candidate) => candidate.source),
      unique_target_count_with_candidates: new Set(candidateEvidence.map((candidate) => candidate.card_print_id)).size,
    },
    boundary: {
      db_writes: false,
      pricing_observations_writes: false,
      ebay_active_prices_latest_writes: false,
      public_price_publication: false,
      app_visible_pricing: false,
      price_rollups: false,
      identity_table_writes: false,
      vault_writes: false,
      image_writes: false,
      deletes: false,
      merges: false,
      global_apply: false,
    },
    request_results: requestResults,
    candidate_evidence: candidateEvidence,
    findings,
    ready_for_review_backfill_plan: findings.length === 0 && candidateEvidence.length > 0,
  };
}
