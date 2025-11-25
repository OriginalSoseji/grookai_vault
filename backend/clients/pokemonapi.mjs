// Shared Pokemon TCG API client (non-pricing fields only).
// Uses env vars:
// - POKEMONAPI_BASE_URL (default: https://api.pokemontcg.io/v2)
// - POKEMONAPI_API_KEY (optional; sent as X-Api-Key)

const DEFAULT_BASE_URL = 'https://api.pokemontcg.io/v2';

function getBaseUrl() {
  const base = process.env.POKEMONAPI_BASE_URL || DEFAULT_BASE_URL;
  return base.endsWith('/') ? base : `${base}/`;
}

function buildUrl(path, query = {}) {
  const url = new URL(path.replace(/^\//, ''), getBaseUrl());
  Object.entries(query || {}).forEach(([key, value]) => {
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
      `PokemonAPI request failed: ${res.status} ${res.statusText} :: ${snippet}`,
    );
  }
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new Error(`PokemonAPI response parse error: ${err?.message ?? err}`);
  }
}

export async function pokemonApiFetch(path, query = {}) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable; use Node 18+ or add a fetch polyfill.');
  }

  const url = buildUrl(path, query);
  const headers = { Accept: 'application/json' };
  const apiKey = process.env.POKEMONAPI_API_KEY;
  if (apiKey) headers['X-Api-Key'] = apiKey;

  const res = await fetch(url, { headers });
  return parseJsonResponse(res);
}

export async function fetchPokemonSets(page = 1, pageSize = 250) {
  const body = await pokemonApiFetch('/sets', { page, pageSize });
  return {
    data: body?.data ?? [],
    page: body?.page ?? page,
    pageSize: body?.pageSize ?? pageSize,
    totalCount: body?.totalCount ?? body?.total ?? 0,
  };
}

export async function fetchPokemonCardsBySetId(setId, page = 1, pageSize = 250) {
  const body = await pokemonApiFetch('/cards', {
    q: `set.id:${setId}`,
    page,
    pageSize,
  });
  return {
    data: body?.data ?? [],
    page: body?.page ?? page,
    pageSize: body?.pageSize ?? pageSize,
    totalCount: body?.totalCount ?? body?.total ?? 0,
  };
}
