import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const RETRY_HTTP = new Set([408, 500, 502, 503, 504]);
const RETRY_CURL = new Set([6, 7, 18, 28, 52, 55, 56]);

function failure(code, attempts, httpStatus = null) {
  return Object.assign(new Error(code), { code, attempts, http_status: httpStatus });
}

// Do not preserve raw child-process errors: they can contain the API-key header.
export function pokemonReferenceFailureV1(error) {
  const code = /^POKEMON_REFERENCE_[A-Z0-9_]+$/.test(error?.code ?? '')
    ? error.code : 'POKEMON_REFERENCE_FETCH_FAILED';
  return { error: code, code, http_status: Number.isInteger(error?.http_status) ? error.http_status : null,
    attempts: Number.isInteger(error?.attempts) ? error.attempts : null };
}

export async function fetchPokemonCardByIdViaCurl(cardId, options = {}) {
  if (typeof cardId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(cardId))
    throw failure('POKEMON_REFERENCE_INVALID_ID', 0);
  return fetchReferenceViaCurl(`cards/${encodeURIComponent(cardId)}`, (payload, attempt) => {
    if (payload.data === null) return null;
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data) || payload.data.id !== cardId)
      throw failure('POKEMON_REFERENCE_ID_MISMATCH', attempt, 200);
    return payload.data;
  }, options);
}

export async function fetchPokemonCardsPageViaCurl(page, options = {}) {
  if (!Number.isInteger(page) || page < 1 || page > 200) throw failure('POKEMON_REFERENCE_INVALID_PAGE', 0);
  return fetchReferenceViaCurl(`cards?page=${page}&pageSize=250&orderBy=id`, (payload, attempt) => {
    if (!Array.isArray(payload.data) || payload.page !== page || payload.pageSize !== 250 ||
        !Number.isInteger(payload.totalCount) || payload.totalCount < 1 || payload.totalCount > 50000 ||
        payload.count !== payload.data.length || payload.count !== Math.min(250, payload.totalCount - (page - 1) * 250) ||
        payload.data.some(card => !card || typeof card !== 'object' || !/^[a-zA-Z0-9_-]{1,100}$/.test(card.id ?? '')) ||
        new Set(payload.data.map(card => card.id)).size !== payload.data.length)
      throw failure('POKEMON_REFERENCE_INVALID_PAGE', attempt, 200);
    return payload;
  }, options);
}

async function fetchReferenceViaCurl(relativePath, validate, {
  run = execute, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  baseUrl = process.env.POKEMONAPI_BASE_URL || 'https://api.pokemontcg.io/v2',
  apiKey = process.env.POKEMONAPI_API_KEY, platform = process.platform,
  beforeAttempt = async () => {},
} = {}) {
  let base;
  try { base = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`); }
  catch { throw failure('POKEMON_REFERENCE_INVALID_ENDPOINT', 0); }
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash)
    throw failure('POKEMON_REFERENCE_INVALID_ENDPOINT', 0);
  if (apiKey && (typeof apiKey !== 'string' || /[\r\n]/.test(apiKey)))
    throw failure('POKEMON_REFERENCE_INVALID_CREDENTIAL', 0);
  const args = ['--disable', '--silent', '--show-error', '--proto', '=https',
    '--max-time', '60', '--connect-timeout', '15', '--user-agent', 'GrookaiMarketEvidenceAudit/1.0',
    '--header', 'Accept: application/json', '--write-out', '\n%{http_code}'];
  if (platform === 'win32') args.push('--ssl-no-revoke');
  if (apiKey) args.push('--header', `X-Api-Key: ${apiKey}`);
  // Redirects are deliberately not followed with a custom credential header.
  args.push(new URL(relativePath, base).toString());
  for (let attempt = 1; attempt <= 3; attempt++) {
    await beforeAttempt();
    let error, retry = false, stdout;
    try {
      ({ stdout } = await run(platform === 'win32' ? 'curl.exe' : 'curl', args,
        { timeout: 80000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }));
    } catch (caught) {
      retry = RETRY_CURL.has(caught?.code) || caught?.killed === true;
      error = failure('POKEMON_REFERENCE_TRANSPORT_FAILED', attempt);
    }
    if (!error) {
      const match = /\n(\d{3})$/.exec(stdout ?? '');
      if (!match) error = failure('POKEMON_REFERENCE_STATUS_MISSING', attempt);
      else {
        const status = Number(match[1]);
        if (status !== 200) {
          error = failure(`POKEMON_REFERENCE_HTTP_${status}`, attempt, status);
          // Rate limits and auth/missing IDs wait for a later governed run.
          retry = RETRY_HTTP.has(status);
        } else {
          let payload;
          try { payload = JSON.parse(stdout.slice(0, match.index)); }
          catch { error = failure('POKEMON_REFERENCE_INVALID_JSON', attempt, status); retry = true; }
          if (!error) {
            if (!payload || Array.isArray(payload) || typeof payload !== 'object' || !Object.hasOwn(payload, 'data'))
              error = failure('POKEMON_REFERENCE_INVALID_PAYLOAD', attempt, status);
            else return validate(payload, attempt);
          }
        }
      }
    }
    if (!retry || attempt === 3) throw error;
    await sleep(750 * attempt);
  }
}
