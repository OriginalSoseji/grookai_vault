import { admittedSourceUrl, assert, digest, EngineError, reviewValid, sha256, timestamp } from './common.mjs';
import { setTimeout as delay } from 'node:timers/promises';

export async function acquireApprovedReceipt({ request, source, policy, observedAt, fetchImpl = globalThis.fetch }) {
  assert(source?.adapter!=='pokemon_legality_browser_reference_v1'&&request.adapter!=='pokemon_legality_browser_reference_v1','BROWSER_REFERENCE_OFFLINE_ONLY');
  const at = timestamp(observedAt);
  assert(source?.allow_ingest === true && reviewValid(source.review, at, policy), 'SOURCE_NOT_ADMITTED');
  assert(source.allowed_kinds.includes(request.kind), 'SOURCE_KIND_NOT_ADMITTED');
  const url = admittedSourceUrl(source,request.url);
  const response = await fetchImpl(url.href, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20_000),
    headers: { Accept: 'application/json', 'User-Agent': 'grookai-vault-playables/1.0' } });
  if (!response.ok) {
    const failure = new EngineError(response.status === 429 ? 'SOURCE_RATE_LIMITED' : 'SOURCE_HTTP_FAILURE');
    const retryAfter = response.headers.get('retry-after');
    failure.acquisition = { request_fingerprint: digest({ id: request.id, source_id: source.id, url: url.href }),
      http_status: response.status, retryable: [408,425,429,500,502,503,504].includes(response.status),
      ...(/^\d{1,5}$/.test(retryAfter ?? '') ? { retry_after_seconds: Number(retryAfter) } : {}) };
    await response.body?.cancel().catch(() => {});
    throw failure;
  }
  const contentLength = Number(response.headers.get('content-length'));
  assert(!Number.isFinite(contentLength) || contentLength <= policy.maximum_receipt_bytes, 'RECEIPT_SIZE');
  const chunks = []; let size = 0;
  if (response.body) {
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > policy.maximum_receipt_bytes) { await response.body.cancel().catch(() => {}); throw new EngineError('RECEIPT_SIZE'); }
      chunks.push(Buffer.from(chunk));
    }
  }
  const body = Buffer.concat(chunks).toString('utf8');
  const receipt = { id: request.id, source_id: source.id, kind: request.kind, url: url.href,
    observed_at: observedAt, body_text: body, body_sha256: sha256(body) };
  return { receipt, acquisition_hash: digest(receipt) };
}

export async function acquireInputReceipts(input, policy, observedAt, fetchImpl, onReceipt) {
  const receipts = [...input.receipts];
  const requests = input.acquisitions ?? [];
  assert(Array.isArray(requests) && requests.length <= 100, 'ACQUISITION_LIMIT');
  // Deliberately serial: respect per-source limits and preserve deterministic receipt ordering.
  for (const request of requests) {
    const source = input.sources.find(value => value.id === request.source_id);
    assert(source?.adapter!=='pokemon_legality_browser_reference_v1'&&request.adapter!=='pokemon_legality_browser_reference_v1','BROWSER_REFERENCE_OFFLINE_ONLY');
    if (receipts.some(receipt => receipt.source_id === request.source_id && receipt.observed_at === observedAt)) {
      await delay(Math.max(1000, source?.request_interval_ms ?? 1000));
    }
    const result = (source?.adapter==='pokemon_legality_document_v1'||request.adapter === 'pokemon_legality_document_v1')
      ? await (await import('./adapters/legality_document_capture_v1.mjs')).captureLegalityDocument({request:{...request,adapter:request.adapter??source.adapter},source,policy,observedAt,fetchImpl,onSnapshot:onReceipt})
      : request.adapter === 'limitless_event_v1'
      ? await (await import('./adapters/limitless_v1.mjs')).captureLimitlessEvent({ request, source, policy, observedAt, fetchImpl })
      : request.adapter === 'tcgdex_repository_card_v1'
        ? await (await import('./adapters/tcgdex_repository_v1.mjs')).captureRepositoryCard({ request, source, policy, observedAt, fetchImpl, onSnapshot:onReceipt })
        : request.adapter === 'tcgdex_repository_set_v1'
          ? await (await import('./adapters/tcgdex_repository_set_v1.mjs')).captureRepositorySet({request,source,policy,observedAt,fetchImpl,onSnapshot:onReceipt})
          : await acquireApprovedReceipt({ request, source, policy, observedAt, fetchImpl });
    // A later source failure must not discard earlier successful acquisitions.
    if (onReceipt&&!result.receipt_persisted) await onReceipt(result.receipt, source);
    receipts.push(result.receipt);
  }
  const { acquisitions, ...rest } = input;
  return { ...rest, receipts };
}
