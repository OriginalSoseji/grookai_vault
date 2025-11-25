// backend/clients/ebay_browse_client.mjs
//
// Minimal helper for the eBay Browse API (item_summary/search endpoint).
// Reads EBAY_BROWSE_BASE_URL from the environment, fetches/normalizes listings,
// and handles Browse access tokens (manual token or client-credentials flow).

// Cached application access token for Browse API
let cachedToken = null;
let cachedTokenExpiresAt = 0; // ms since epoch

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error('[ebay-browse] Global fetch is not available. Use Node 18+.'); // Node 18+ ships fetch
  }
}

function getBrowseBaseUrl() {
  const raw = process.env.EBAY_BROWSE_BASE_URL;
  if (!raw) {
    throw new Error('[ebay-browse] EBAY_BROWSE_BASE_URL is not set.');
  }
  return raw.replace(/\/+$/, '');
}

async function getBrowseAccessToken() {
  if (process.env.EBAY_BROWSE_ACCESS_TOKEN && process.env.EBAY_BROWSE_ACCESS_TOKEN.trim()) {
    return process.env.EBAY_BROWSE_ACCESS_TOKEN.trim();
  }

  const now = Date.now();
  if (cachedToken && now < (cachedTokenExpiresAt - 60_000)) {
    return cachedToken;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('[ebay-oauth] Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET in env');
  }

  const oauthBase = process.env.EBAY_OAUTH_BASE_URL || 'https://api.ebay.com';
  const tokenUrl = `${oauthBase}/identity/v1/oauth2/token`;

  const pair = `${clientId}:${clientSecret}`;
  const basicAuth = Buffer.from(pair, 'ascii').toString('base64');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'https://api.ebay.com/oauth/api_scope',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const snippet = await response.text().catch(() => '');
    throw new Error(`[ebay-oauth] Failed token fetch: ${response.status} ${response.statusText} :: ${snippet}`);
  }

  const json = await response.json();
  const accessToken = json.access_token;
  const expiresIn = json.expires_in ?? 7200;

  cachedToken = accessToken;
  cachedTokenExpiresAt = Date.now() + expiresIn * 1000;

  console.log(`[ebay-oauth] fetched new token (expires in ${expiresIn}s)`);
  return accessToken;
}

function buildSearchUrl(baseUrl, query, limit) {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('limit', String(limit));

  const searchUrl = new URL('/buy/browse/v1/item_summary/search', baseUrl);
  searchUrl.search = params.toString();
  return searchUrl.toString();
}

function safeNumber(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickShippingCost(item) {
  const option = Array.isArray(item.shippingOptions) && item.shippingOptions.length > 0
    ? item.shippingOptions[0]
    : null;
  if (option?.shippingCost?.value !== undefined) {
    return safeNumber(option.shippingCost.value);
  }
  if (option?.minEstimatedDeliveryCost?.value !== undefined) {
    return safeNumber(option.minEstimatedDeliveryCost.value);
  }
  return null;
}

function normalizeListing(item) {
  const priceValue = safeNumber(item?.price?.value);
  if (!Number.isFinite(priceValue)) {
    return null;
  }

  return {
    price: priceValue,
    currency: item?.price?.currency || 'USD',
    itemId: item?.itemId || null,
    conditionText: item?.condition || item?.conditionDescription || null,
    itemCondition: item?.itemCondition || null,
    condition: item?.condition || null,
    conditionDescription: item?.conditionDescription || null,
    title: item?.title || '',
    sellerUsername: item?.seller?.username || null,
    buyingOptions: Array.isArray(item?.buyingOptions) ? item.buyingOptions : [],
    shippingCost: pickShippingCost(item),
    raw: item,
  };
}

export async function searchActiveListings({ query, limit = 50 }) {
  if (!query || typeof query !== 'string') {
    throw new Error('[ebay-browse] searchActiveListings requires a query string.');
  }
  ensureFetchAvailable();
  const baseUrl = getBrowseBaseUrl();
  const token = await getBrowseAccessToken();
  const trimmedLimit = Math.max(1, Math.min(Number(limit) || 50, 200));
  const normalizedQuery = query.trim();
  const url = buildSearchUrl(baseUrl, normalizedQuery, trimmedLimit);

  console.log(`[ebay-browse] searchActiveListings query="${query}" limit=${trimmedLimit}`);
  console.log('[ebay-browse] request URL =>', url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const bodyText = await res.text();
  let json = null;
  if (bodyText) {
    try {
      json = JSON.parse(bodyText);
    } catch (err) {
      console.error('[ebay-browse] Failed to parse JSON response:', err);
    }
  }

  if (!res.ok) {
    const snippet = bodyText?.slice?.(0, 400) || '';
    if (res.status === 401) {
      console.error(
        '[ebay-browse] 401 Unauthorized – application token rejected by eBay',
      );
    } else {
      console.error(`[ebay-browse] search failed: ${res.status} ${res.statusText} :: ${snippet}`);
    }
    const error = new Error(
      `[ebay-browse] item search failed with status ${res.status} ${res.statusText}`,
    );
    error.status = res.status;
    error.response = json ?? bodyText;
    error.snippet = snippet;
    throw error;
  }

  const summaries = Array.isArray(json?.itemSummaries) ? json.itemSummaries : null;
  if (!summaries) {
    console.warn('[ebay-browse] Response missing itemSummaries array.');
    return [];
  }

  const normalized = summaries
    .map(normalizeListing)
    .filter(Boolean);

  return normalized;
}

export async function fetchItemDetails(itemId, { marketplaceId = 'EBAY_US' } = {}) {
  if (!itemId) {
    throw new Error('[ebay-browse] fetchItemDetails called without itemId');
  }

  ensureFetchAvailable();
  const baseUrl = process.env.EBAY_BROWSE_BASE_URL || 'https://api.ebay.com';
  const accessToken = await getBrowseAccessToken();
  const url = new URL(`/buy/browse/v1/item/${encodeURIComponent(itemId)}`, baseUrl);

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
    Accept: 'application/json',
  };

  let response;
  try {
    response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });
  } catch (err) {
    console.error('[ebay-browse] item details network error:', err);
    throw new Error('[ebay-browse] item details request failed (network)');
  }

  if (!response.ok) {
    const snippet = await response.text().catch(() => '');
    console.error('[ebay-browse] item details failed:', response.status, response.statusText, snippet);
    throw new Error(`[ebay-browse] item details failed with status ${response.status}`);
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    console.error('[ebay-browse] item details parse error:', err);
    throw new Error('[ebay-browse] item details JSON parse error');
  }

  return json;
}
