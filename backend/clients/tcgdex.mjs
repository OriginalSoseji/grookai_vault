// backend/clients/tcgdex.mjs
//
// === TCGdex API Reference ===
// According to official TCGdex documentation (https://tcgdex.dev):
// - Base URL: https://api.tcgdex.net/v2
// - Language prefix: https://api.tcgdex.net/v2/{lang}/..., default lang = "en" via TCGDEX_LANG
// - Supported languages (per TCGdex docs): en, fr, es, es-mx, it, pt, pt-br, pt-pt, de, n
// - HTTPS required (HTTP is redirected to HTTPS)
// - All REST requests MUST be GET requests
// - No API key is required for basic usage (“Every bit of information … freely available and open source!”)
//
// If TCGdex adds authentication or rate limits in the future, populate TCGDEX_API_KEY
// in your environment files. For now, empty/undefined is correct.
//
// NOTE: Keep TODO markers where endpoints/pagination must be confirmed.
// Do not guess endpoint shapes until verified against live TCGdex docs.
//
// Shared TCGdex client modeled after backend/clients/pokemonapi.mjs.
// Reads env vars:
//   - TCGDEX_BASE_URL (required; no default to avoid guessing)
//   - TCGDEX_API_KEY (optional; sent as X-Api-Key style header)

const SOURCE = 'tcgdex';
const SUPPORTED_LANGS = ['en', 'fr', 'es', 'es-mx', 'it', 'pt', 'pt-br', 'pt-pt', 'de', 'n'];

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
  const rawBase = process.env.TCGDEX_BASE_URL;
  const rawLang = process.env.TCGDEX_LANG || 'en';
  const baseRoot = normalizeBaseUrl(rawBase);
  if (!SUPPORTED_LANGS.includes(rawLang)) {
    console.warn(
      `[tcgdex-client] Warning: TCGDEX_LANG="${rawLang}" is not in the known language list (${SUPPORTED_LANGS.join(
        ', ',
      )}). Proceeding anyway.`,
    );
  }
  const baseUrl = `${baseRoot}${rawLang}/`;
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

  async function fetchTcgdexSets({ page = null, pageSize = null } = {}) {
    if (page != null || pageSize != null) {
      console.warn('[tcgdex-client] fetchTcgdexSets: page/pageSize are ignored; /sets endpoint is not paginated.');
    }
    // TODO: Confirm TCGdex sets endpoint path and supported pagination params.
    // NOTE: Endpoints and query params must be confirmed against official TCGdex docs
    // before enabling this in production; do not guess them here.
    const path = 'sets';
    const body = await fetchTcgdexJson(path);
    let items = [];
    if (Array.isArray(body)) {
      items = body;
    } else if (Array.isArray(body?.items)) {
      items = body.items;
    } else if (Array.isArray(body?.data)) {
      items = body.data;
    } else if (body && Array.isArray(body?.results)) {
      items = body.results;
    } else {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      throw new Error(
        `[tcgdex-client] Unexpected JSON shape for sets: ${keys.length > 0 ? keys.join(',') : 'non-object response'}`,
      );
    }
    return items;
  }

  async function fetchTcgdexCardsBySetId(setId) {
    if (!setId) {
      throw new Error('[tcgdex-client] fetchTcgdexCardsBySetId requires a setId.');
    }
    // TODO: Confirm TCGdex cards-by-set endpoint structure.
    // NOTE: Verify this route & params against official TCGdex docs prior to usage.
    const path = 'cards';
    const body = await fetchTcgdexJson(path, { set: setId });
    let items = [];
    if (Array.isArray(body)) {
      items = body;
    } else if (Array.isArray(body?.items)) {
      items = body.items;
    } else if (Array.isArray(body?.data)) {
      items = body.data;
    } else if (body && Array.isArray(body?.results)) {
      items = body.results;
    } else {
      const keys = body && typeof body === 'object' ? Object.keys(body) : [];
      throw new Error(
        `[tcgdex-client] Unexpected JSON shape for cards: ${keys.length > 0 ? keys.join(',') : 'non-object response'}`,
      );
    }
    return items;
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
