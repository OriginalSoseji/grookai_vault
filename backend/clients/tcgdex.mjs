// backend/clients/tcgdex.mjs
//
// Shared TCGdex client modeled after backend/clients/pokemonapi.mjs.
// Reads env vars:
//   - TCGDEX_BASE_URL (required; no default to avoid guessing)
//   - TCGDEX_API_KEY (optional; sent as X-Api-Key style header)

const SOURCE = 'tcgdex';

function normalizeBaseUrl(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('[tcgdex-client] TCGDEX_BASE_URL is required but missing.');
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('[tcgdex-client] TCGDEX_BASE_URL is empty.');
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function buildUrl(baseUrl, path, query = {}) {
  const sanitizedPath = path.replace(/^\//, '');
  const url = new URL(sanitizedPath, baseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.append(key, String(value));
  });
  return url.toString();
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    const snippet = text ? text.slice(0, 300) : '';
    throw new Error(
      `[tcgdex-client] request failed: ${res.status} ${res.statusText} :: ${snippet}`,
    );
  }

  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`[tcgdex-client] response parse error: ${err?.message ?? err}`);
  }
}

function ensureFetch() {
  if (typeof fetch !== 'function') {
    throw new Error('[tcgdex-client] Global fetch is unavailable; use Node 18+ or install a fetch polyfill.');
  }
}

export function createTcgdexClient() {
  const baseUrl = normalizeBaseUrl(process.env.TCGDEX_BASE_URL);
  const apiKey = process.env.TCGDEX_API_KEY || null;

  async function fetchTcgdexJson(path, searchParams = {}) {
    ensureFetch();
    const url = buildUrl(baseUrl, path, searchParams);
    const headers = { Accept: 'application/json' };
    if (apiKey) {
      // TODO: Confirm whether TCGdex expects `X-Api-Key`, `Authorization`, or another header name.
      headers['X-Api-Key'] = apiKey;
    }
    const res = await fetch(url, { headers });
    return parseJsonResponse(res);
  }

  async function fetchTcgdexSets({ page = 1, pageSize = 250 } = {}) {
    // TODO: Confirm TCGdex sets endpoint path and supported pagination params.
    // NOTE: Endpoints and query params must be confirmed against official TCGdex docs
    // before enabling this in production; do not guess them here.
    const path = '/v2/sets';
    const body = await fetchTcgdexJson(path, { page, pageSize });
    return {
      data: body?.data ?? body?.results ?? [],
      page: body?.page ?? page,
      pageSize: body?.pageSize ?? body?.limit ?? pageSize,
      totalCount: body?.totalCount ?? body?.total ?? null,
    };
  }

  async function fetchTcgdexCardsBySetId(setId, { page = 1, pageSize = 250 } = {}) {
    if (!setId) {
      throw new Error('[tcgdex-client] fetchTcgdexCardsBySetId requires a setId.');
    }
    // TODO: Confirm TCGdex cards-by-set endpoint structure.
    // NOTE: Verify this route & params against official TCGdex docs prior to usage.
    const path = `/v2/sets/${encodeURIComponent(setId)}/cards`;
    const body = await fetchTcgdexJson(path, { page, pageSize });
    return {
      data: body?.data ?? body?.results ?? [],
      page: body?.page ?? page,
      pageSize: body?.pageSize ?? body?.limit ?? pageSize,
      totalCount: body?.totalCount ?? body?.total ?? null,
    };
  }

  return {
    source: SOURCE,
    baseUrl,
    apiKey,
    fetchTcgdexJson,
    fetchTcgdexSets,
    fetchTcgdexCardsBySetId,
  };
}

export async function fetchTcgdexSets(options) {
  const client = createTcgdexClient();
  return client.fetchTcgdexSets(options);
}

export async function fetchTcgdexCardsBySetId(setId, options) {
  const client = createTcgdexClient();
  return client.fetchTcgdexCardsBySetId(setId, options);
}
