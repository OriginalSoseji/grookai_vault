import '../env.mjs';

export const DEFAULT_JUSTTCG_API_BASE_URL = 'https://api.justtcg.com/v1';
export const DEFAULT_FETCH_TIMEOUT_MS = 8000;
export const DEFAULT_POST_BATCH_SIZE = 200;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;
const RATE_LIMIT_DELAY_MS = 1200;

export function getJustTcgApiConfig() {
  const apiKey = (process.env.JUSTTCG_API_KEY ?? '').trim();
  const baseUrl = (process.env.JUSTTCG_API_BASE_URL ?? DEFAULT_JUSTTCG_API_BASE_URL)
    .trim()
    .replace(/\/+$/, '');

  return { apiKey, baseUrl };
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveRetryAfterDelayMs(response, attempt) {
  const retryAfter = response.headers.get('retry-after');
  if (retryAfter) {
    const parsedSeconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(parsedSeconds) && parsedSeconds > 0) {
      return Math.ceil(parsedSeconds * 1000);
    }
  }

  return RATE_LIMIT_DELAY_MS * attempt;
}

export function uniqueValues(values) {
  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  );
}

export function resolveJustTcgPostBatchSize(overrideValue = null) {
  const rawValue =
    overrideValue !== null && overrideValue !== undefined && String(overrideValue).trim()
      ? overrideValue
      : process.env.JUSTTCG_BATCH_SIZE;
  const parsedValue = Number.parseInt(String(rawValue ?? DEFAULT_POST_BATCH_SIZE), 10);

  if (Number.isInteger(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return DEFAULT_POST_BATCH_SIZE;
}

export function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function unwrapJustTcgData(envelope) {
  const data = envelope?.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object') {
    return [data];
  }

  return [];
}

function normalizeRequestedTcgplayerId(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

export function assertNoUnsafeJustTcgGetBatchParams(path, params) {
  if (path !== '/cards') {
    return;
  }

  const tcgplayerIds = params.getAll('tcgplayerId').map((value) => value.trim()).filter(Boolean);
  const arrayStyleIds = params.getAll('tcgplayerId[]').map((value) => value.trim()).filter(Boolean);

  if (arrayStyleIds.length > 0) {
    throw new Error('[justtcg-client] Unsafe GET batch blocked: tcgplayerId[] query batching is not allowed.');
  }

  if (tcgplayerIds.length > 1) {
    throw new Error('[justtcg-client] Unsafe GET batch blocked: repeated tcgplayerId query params are not allowed.');
  }

  if (tcgplayerIds.length === 1 && tcgplayerIds[0].includes(',')) {
    throw new Error('[justtcg-client] Unsafe GET batch blocked: comma-separated tcgplayerId query batching is not allowed.');
  }
}

export async function requestJustTcgJson(method, path, { params = null, body = null } = {}) {
  const { apiKey, baseUrl } = getJustTcgApiConfig();
  if (!apiKey) {
    return {
      ok: false,
      status: 0,
      error: 'Missing JUSTTCG_API_KEY.',
      payload: null,
    };
  }

  const normalizedMethod = String(method ?? 'GET').toUpperCase();
  const pathValue = String(path ?? '');
  const [pathname, queryString = ''] = pathValue.split('?', 2);
  const searchParams = new URLSearchParams(queryString);
  const extraParams = params instanceof URLSearchParams ? params : new URLSearchParams(params ?? {});
  for (const [key, value] of extraParams.entries()) {
    searchParams.append(key, value);
  }

  if (normalizedMethod === 'GET') {
    assertNoUnsafeJustTcgGetBatchParams(pathname, searchParams);
  }

  const url = `${baseUrl}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_FETCH_TIMEOUT_MS);

    try {
      const headers = {
        'x-api-key': apiKey,
        Accept: 'application/json',
      };
      const init = {
        method: normalizedMethod,
        headers,
        cache: 'no-store',
        signal: controller.signal,
      };

      if (body !== null) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      const response = await fetch(url, init);
      const payload = await response.json().catch(() => null);

      clearTimeout(timeout);

      if (response.status === 429 && attempt < MAX_RETRIES) {
        await delay(resolveRetryAfterDelayMs(response, attempt));
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: payload?.error ?? payload?.message ?? `JustTCG request failed with status ${response.status}.`,
          payload,
        };
      }

      return {
        ok: true,
        status: response.status,
        error: null,
        payload,
      };
    } catch (error) {
      clearTimeout(timeout);

      const isTimeout = error instanceof Error && error.name === 'AbortError';
      if (!isTimeout) {
        return {
          ok: false,
          status: 0,
          error: error instanceof Error ? error.message : 'Unknown JustTCG fetch error.',
          payload: null,
        };
      }

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS);
      }
    }
  }

  return {
    ok: false,
    status: 0,
    error: 'JustTCG request timed out after retries.',
    payload: null,
  };
}

export async function fetchJustTcgCardsByTcgplayerIdsBatch(tcgplayerIds, { game = 'pokemon' } = {}) {
  const requestedIds = uniqueValues(tcgplayerIds.map(normalizeRequestedTcgplayerId));
  if (requestedIds.length === 0) {
    return {
      ok: true,
      status: 0,
      error: null,
      payload: { data: [] },
      requestedIds,
    };
  }

  const body = requestedIds.map((tcgplayerId) => ({
    tcgplayerId,
    game,
  }));

  const response = await requestJustTcgJson('POST', '/cards', { body });
  return {
    ...response,
    requestedIds,
  };
}

export function resolveJustTcgBatchByTcgplayerIds(requestedIds, payload) {
  const normalizedRequestedIds = uniqueValues(requestedIds.map(normalizeRequestedTcgplayerId));
  const requestedIdSet = new Set(normalizedRequestedIds);
  const cards = unwrapJustTcgData(payload);
  const results = Object.fromEntries(
    normalizedRequestedIds.map((tcgplayerId) => [
      tcgplayerId,
      {
        status: 'missing',
        card: null,
        reason: 'No JustTCG card was returned for this tcgplayerId.',
      },
    ]),
  );

  const returnedById = new Map();
  const duplicateReturnedIds = [];
  const unexpectedReturnedIds = [];
  const malformedRows = [];

  for (const card of cards) {
    const returnedId = normalizeRequestedTcgplayerId(card?.tcgplayerId);
    if (!returnedId) {
      malformedRows.push(card);
      continue;
    }

    if (!requestedIdSet.has(returnedId)) {
      unexpectedReturnedIds.push(returnedId);
      continue;
    }

    if (returnedById.has(returnedId)) {
      duplicateReturnedIds.push(returnedId);
      continue;
    }

    returnedById.set(returnedId, card);
  }

  const duplicateIds = uniqueValues(duplicateReturnedIds);
  const unexpectedIds = uniqueValues(unexpectedReturnedIds);

  for (const requestedId of normalizedRequestedIds) {
    if (duplicateIds.includes(requestedId)) {
      results[requestedId] = {
        status: 'duplicate',
        card: null,
        reason: `JustTCG returned duplicate rows for tcgplayerId ${requestedId}.`,
      };
      continue;
    }

    const card = returnedById.get(requestedId) ?? null;
    if (card) {
      results[requestedId] = {
        status: 'success',
        card,
        reason: 'Matched JustTCG card row by tcgplayerId.',
      };
    }
  }

  const summary = {
    success: 0,
    missing: 0,
    duplicate: 0,
    malformed: malformedRows.length,
    unexpected: unexpectedReturnedIds.length,
  };

  for (const requestedId of normalizedRequestedIds) {
    const status = results[requestedId]?.status ?? 'missing';
    if (status === 'success') {
      summary.success += 1;
    } else if (status === 'duplicate') {
      summary.duplicate += 1;
    } else {
      summary.missing += 1;
    }
  }

  return {
    cards,
    duplicateReturnedIds: duplicateIds,
    unexpectedReturnedIds: unexpectedIds,
    malformedRowCount: malformedRows.length,
    unexpectedRowCount: unexpectedReturnedIds.length,
    results,
    summary,
  };
}
