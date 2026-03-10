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
const DETAIL_RETRY_DELAYS_MS = [250, 750, 1750];

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

function encodePathSegmentPreserveEscapes(s) {
  // encodeURIComponent encodes '%' to '%25' — revert existing percent-escapes back to '%XX'
  return encodeURIComponent(s).replace(/%25([0-9A-Fa-f]{2})/g, '%$1');
}

function decodePercentOnce(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!res.ok) {
    const snippet = text ? text.slice(0, 300) : '';
    const error = new Error(
      `[tcgdex-client] request failed: ${res.status} ${res.statusText} :: ${snippet}`,
    );
    error.status = res.status;
    throw error;
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

function clampConcurrency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 4;
  }
  return Math.max(1, Math.min(6, Math.trunc(numeric)));
}

async function mapWithConcurrency(items, concurrency, mapper) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const current = nextIndex;
      if (current >= items.length) {
        return;
      }
      nextIndex += 1;
      results[current] = await mapper(items[current], current);
    }
  };

  const workerCount = Math.min(clampConcurrency(concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
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

  async function fetchTcgdexSetById(setId) {
    if (!setId) {
      throw new Error('[tcgdex-client] fetchTcgdexSetById requires a setId.');
    }
    const body = await fetchTcgdexJson(`sets/${encodePathSegmentPreserveEscapes(setId)}`);
    const hasCards = Array.isArray(body?.cards);
    if (!body || typeof body !== 'object' || (!body.id && !hasCards)) {
      throw new Error('[tcgdex-client] Unexpected JSON shape for set detail.');
    }
    return body;
  }

  async function fetchTcgdexCardById(cardId) {
    if (!cardId) {
      throw new Error('[tcgdex-client] fetchTcgdexCardById requires a cardId.');
    }

    let retryIndex = 0;
    while (true) {
      try {
        const body = await fetchTcgdexJson(`cards/${encodePathSegmentPreserveEscapes(cardId)}`);
        if (!body || typeof body !== 'object' || !body.id) {
          throw new Error('[tcgdex-client] Unexpected JSON shape for card detail.');
        }
        return body;
      } catch (err) {
        const status = err?.status ?? null;
        if (status === 429 && retryIndex < DETAIL_RETRY_DELAYS_MS.length) {
          const delayMs = DETAIL_RETRY_DELAYS_MS[retryIndex];
          retryIndex += 1;
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
        throw err;
      }
    }
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

  async function fetchTcgdexCardsBySetId(setId, opts = {}) {
    if (!setId) {
      throw new Error('[tcgdex-client] fetchTcgdexCardsBySetId requires a setId.');
    }

    const setObj = await fetchTcgdexSetById(setId);
    if (!Array.isArray(setObj.cards)) {
      throw new Error(`[tcgdex-client] Set ${setId} has no cards array.`);
    }

    const stubs = setObj.cards;
    const cardIds = stubs.map((stub, idx) => {
      const id = stub?.id;
      if (typeof id !== 'string' || id.trim().length === 0) {
        throw new Error(`[tcgdex-client] Set ${setId} card stub at index ${idx} is missing id.`);
      }
      return id;
    });

    if (opts?.detail !== true) {
      return stubs;
    }

    const concurrency = clampConcurrency(opts?.concurrency ?? 4);

    if (setId === 'exu') {
      const exuPrefix = 'exu-';
      const hydrated = await mapWithConcurrency(cardIds, concurrency, async (requestedId) => {
        if (!requestedId.startsWith(exuPrefix)) {
          throw new Error(`[tcgdex-client] Unexpected exu card id format: ${requestedId}`);
        }
        const rawLocal = requestedId.substring(exuPrefix.length);
        const local = decodePercentOnce(rawLocal);
        const path = `sets/exu/${encodeURIComponent(local)}`;

        let detail;
        try {
          detail = await fetchTcgdexJson(path);
        } catch (err) {
          const status = err?.status ?? null;
          if (status === 400 && local === '?') {
            return null;
          }
          throw err;
        }

        const detailId = String(detail?.id ?? '');
        if (!detailId || !detailId.startsWith('exu-')) {
          throw new Error(
            `[tcgdex-client] Unexpected exu card detail shape for ${requestedId}: id=${detailId || '(missing)'}`,
          );
        }
        return detail;
      });
      return hydrated.filter((card) => card !== null);
    }

    return mapWithConcurrency(cardIds, concurrency, async (requestedId) => {
      const detail = await fetchTcgdexCardById(requestedId);
      const detailId = String(detail?.id ?? '');
      if (detailId !== String(requestedId)) {
        throw new Error(
          `[tcgdex-client] Card detail id mismatch for ${requestedId}: received ${detailId || '(missing)'}`,
        );
      }
      return detail;
    });
  }

  return {
    source: SOURCE,
    baseUrl,
    apiKey,
    fetchTcgdexJson,
    fetchTcgdexSets,
    fetchTcgdexSetById,
    fetchTcgdexCardById,
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
