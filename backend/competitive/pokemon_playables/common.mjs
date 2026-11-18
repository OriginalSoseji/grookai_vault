import { createHash } from 'node:crypto';

export const ENGINE_VERSION = 'pokemon_playables_engine:v1';
export const DAY_MS = 86_400_000;
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const SHA256 = /^[0-9a-f]{64}$/;

export class EngineError extends Error {
  constructor(code, detail = code) {
    super(detail);
    this.name = 'EngineError';
    this.code = code;
  }
}

export function assert(condition, code, detail) {
  if (!condition) throw new EngineError(code, detail);
}

export function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => {
      assert(value[key] !== undefined, 'UNDEFINED_JSON_FIELD');
      return `${JSON.stringify(key)}:${stableJson(value[key])}`;
    }).join(',')}}`;
  }
  assert(value !== undefined && (typeof value !== 'number' || Number.isFinite(value)), 'INVALID_JSON_VALUE');
  return JSON.stringify(value);
}

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const digest = value => sha256(stableJson(value));
export const normalize = value => String(value ?? '').normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
export const collectorNumber = value => normalize(value).replace(/\d+/g, part => String(BigInt(part)));
export const uniqueSorted = values => [...new Set(values)].sort();
export const iso = value => new Date(timestamp(value)).toISOString();

export function timestamp(value) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value), 'TIMESTAMP_WITH_TIMEZONE_REQUIRED');
  const parsed = Date.parse(value);
  assert(Number.isFinite(parsed), 'INVALID_TIMESTAMP');
  const datePart = value.slice(0, 10);
  assert(new Date(`${datePart}T00:00:00Z`).toISOString().slice(0, 10) === datePart, 'INVALID_TIMESTAMP_DATE');
  return parsed;
}

export function text(value, code = 'NONEMPTY_TEXT_REQUIRED', max = 300) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= max, code);
  return value.trim();
}

export function boundedArray(value, max, code = 'INVALID_ARRAY') {
  assert(Array.isArray(value) && value.length <= max, code);
  return value;
}

export function safeId(value) {
  assert(typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value), 'INVALID_IDENTIFIER');
  return value;
}

export function httpsUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new EngineError('INVALID_SOURCE_URL'); }
  assert(url.protocol === 'https:' && !url.username && !url.password && !url.hash, 'INVALID_SOURCE_URL');
  return url.href;
}

export function admittedSourceUrl(source,value){
  const url=new URL(httpsUrl(value));
  assert(Array.isArray(source.allowed_origins)&&source.allowed_origins.includes(url.origin),'SOURCE_ORIGIN_NOT_ADMITTED');
  assert(![...url.searchParams.keys()].some(key=>/key|token|secret|auth|signature/i.test(key)),'SOURCE_SECRET_IN_URL');
  assert(!/^(?:localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(url.hostname),'SOURCE_PRIVATE_ADDRESS');
  return url;
}

export function mapUnique(rows, key, code = 'DUPLICATE_KEY') {
  const map = new Map();
  for (const row of rows) {
    const id = typeof key === 'function' ? key(row) : row[key];
    assert(!map.has(id), code, `${code}: ${String(id).slice(0, 160)}`);
    map.set(id, row);
  }
  return map;
}

export function reviewValid(review, asOf, policy) {
  return Boolean(review && review.status === 'approved' &&
    policy.reviewers.includes(review.reviewed_by) &&
    timestamp(review.reviewed_at) <= asOf && asOf < timestamp(review.valid_until) &&
    typeof review.basis === 'string' && review.basis.trim());
}

export function safeFailure(error) {
  // Source bodies, credentials, URLs with query parameters, and arbitrary provider errors never enter run logs.
  const failure = { error_code: error instanceof EngineError ? error.code : 'UNEXPECTED_FAILURE', error_detail: error instanceof EngineError ? error.code : 'See private worker diagnostics; no provider payload logged.' };
  const context = error instanceof EngineError && error.acquisition;
  if (context && SHA256.test(context.request_fingerprint) && Number.isInteger(context.http_status) && context.http_status >= 100 && context.http_status <= 599) {
    failure.acquisition = { request_fingerprint: context.request_fingerprint, http_status: context.http_status,
      retryable: [408,425,429,500,502,503,504].includes(context.http_status),
      ...(Number.isInteger(context.retry_after_seconds) && context.retry_after_seconds >= 0 && context.retry_after_seconds <= 99999
        ? { retry_after_seconds: context.retry_after_seconds } : {}) };
  }
  return failure;
}
