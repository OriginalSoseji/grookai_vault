// backend/clients/ebay_client.mjs
//
// Lightweight HTTP wrapper around the eBay REST APIs.
// Responsibilities:
// - Builds base URLs based on EBAY_ENV ('production' vs 'sandbox').
// - Attaches OAuth bearer tokens supplied by the caller.
// - Provides simple GET/POST helpers with optional query params.
//
// TODO:
// - Add automatic OAuth token refresh once we persist refresh tokens.
// - Expand with PUT/PATCH helpers for inventory/listing surfaces.
// - Add retry/backoff helpers for rate-limit scenarios.

const BASE_URLS = {
  production: 'https://api.ebay.com',
  sandbox: 'https://api.sandbox.ebay.com',
};

function resolveEnv() {
  const raw = (process.env.EBAY_ENV || 'production').toLowerCase();
  return raw === 'sandbox' ? 'sandbox' : 'production';
}

function buildUrl(baseUrl, path, query = {}) {
  const normalizedPath =
    path.startsWith('http://') || path.startsWith('https://')
      ? path
      : new URL(path.replace(/^\//, ''), `${baseUrl}/`).toString();

  const url = new URL(normalizedPath);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.length === 0)
    ) {
      return;
    }
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}

function ensureFetchAvailable() {
  if (typeof fetch !== 'function') {
    throw new Error(
      '[ebay-client] Global fetch unavailable. Use Node 18+ or add a fetch polyfill.',
    );
  }
}

export class EbayClient {
  constructor(options = {}) {
    const env = options.env || resolveEnv();
    this.baseUrl = BASE_URLS[env];
    if (!this.baseUrl) {
      throw new Error(`[ebay-client] Unsupported EBAY_ENV: ${env}`);
    }

    this.env = env;
    this.accessToken = options.accessToken || null;
    this.marketplaceId =
      options.marketplaceId || process.env.EBAY_MARKETPLACE_ID || 'EBAY_US';
  }

  setAccessToken(token) {
    this.accessToken = token;
  }

  async request(method, path, opts = {}) {
    if (!this.accessToken) {
      throw new Error('[ebay-client] Access token is required before requests');
    }
    ensureFetchAvailable();

    const url = buildUrl(this.baseUrl, path, opts.query);
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      'X-EBAY-C-MARKETPLACE-ID': this.marketplaceId,
      ...opts.headers,
    };

    let body = opts.body;
    if (body && typeof body !== 'string' && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
    }

    console.log(
      `[ebay-client] ${method.toUpperCase()} ${url} env=${this.env} marketplace=${this.marketplaceId}`,
    );

    const res = await fetch(url, {
      method: method.toUpperCase(),
      headers,
      body,
    });

    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch (err) {
        console.warn('[ebay-client] Failed to parse JSON response', err);
      }
    }

    if (!res.ok) {
      const snippet = text ? text.slice(0, 400) : '';
      const error = new Error(
        `[ebay-client] ${method} ${path} failed: ${res.status} ${res.statusText} :: ${snippet}`,
      );
      error.status = res.status;
      error.response = json ?? text;
      throw error;
    }

    return json ?? {};
  }

  get(path, opts = {}) {
    return this.request('GET', path, opts);
  }

  post(path, body, opts = {}) {
    return this.request('POST', path, { ...opts, body });
  }
}
