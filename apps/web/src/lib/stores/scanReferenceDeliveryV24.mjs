import { createHash } from 'node:crypto';
export const MAX_REFERENCE_COUNT = 32;
export const MAX_REFERENCE_BYTES = 3 * 1024 * 1024;
export const MAX_REFERENCE_TOTAL_BYTES = 24 * 1024 * 1024;
export const REFERENCE_CONCURRENCY = 4;
export const hashReference = bytes => createHash('sha256').update(bytes).digest('hex');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function validReferencePath(path) {
  return typeof path === 'string' && path.length <= 512
    && /^warehouse-derived\/(?:self-hosted-images-v1|image-truth-v1)\/[a-zA-Z0-9_./-]+\.(?:webp|png|jpe?g)$/.test(path)
    && !path.includes('..') && !path.includes('//');
}
export function validateReferenceIds(ids, byId) {
  if (!Array.isArray(ids) || !ids.length || ids.length > MAX_REFERENCE_COUNT
    || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !uuid.test(id) || !byId.has(id))) {
    throw new Error('Invalid reference request.');
  }
  return ids.map(id => byId.get(id));
}
export function validateReferencePackets(packets, ids, byId) {
  if (!Array.isArray(packets) || packets.length > ids.length) throw new Error('Invalid reference response.');
  const seen = new Set(); let total = 0;
  for (const packet of packets) {
    if (!packet || !ids.includes(packet.id) || seen.has(packet.id) || !(packet.bytes instanceof Uint8Array)
      || !packet.bytes.length || packet.bytes.length > MAX_REFERENCE_BYTES) throw new Error('Invalid reference bytes.');
    seen.add(packet.id); total += packet.bytes.length;
    if (total > MAX_REFERENCE_TOTAL_BYTES || hashReference(packet.bytes) !== byId.get(packet.id)?.sha256) throw new Error('Reference integrity failed.');
  }
  return packets;
}
export async function readBoundedResponse(response, maxBytes, signal) {
  if (!response.ok || !response.body) { void response.body?.cancel().catch(() => {}); throw new Error('Reference request failed.'); }
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > maxBytes)) {
    void response.body.cancel().catch(() => {}); throw new Error('Reference response too large.');
  }
  const reader = response.body.getReader(), chunks = []; let size = 0, abort;
  const reading = (async () => {
    try {
      while (true) {
        signal?.throwIfAborted(); const { value, done } = await reader.read(); if (done) break;
        size += value.length; if (size > maxBytes) throw new Error('Reference response too large.'); chunks.push(value);
      }
      signal?.throwIfAborted(); if (!size) throw new Error('Empty reference response.'); return Buffer.concat(chunks, size);
    } catch (error) { void reader.cancel().catch(() => {}); throw error; }
  })();
  try {
    return await Promise.race([reading, new Promise((_, reject) => {
      abort = () => { void reader.cancel().catch(() => {}); reject(new Error('Reference request cancelled.')); };
      signal?.addEventListener('abort', abort, { once: true }); if (signal?.aborted) abort();
    })]);
  } finally { signal?.removeEventListener('abort', abort); }
}
export function validateSignedReferenceUrl(value, origin, path) {
  if (!validReferencePath(path)) throw new Error('Invalid reference path.');
  const url = new URL(value);
  if (url.origin !== origin || url.username || url.password || url.hash
    || url.pathname !== '/storage/v1/object/sign/user-card-images/' + path
    || [...url.searchParams.keys()].some(key => key !== 'token') || !url.searchParams.get('token')) throw new Error('Invalid reference location.');
  return url.href;
}
export function eligibleReferenceIds(requested, currentRows, printings) {
  if (!Array.isArray(currentRows) || !Array.isArray(printings)) throw new Error('Invalid catalog response.');
  return requested.filter(reference => currentRows.some(row => row.id === reference.id && row.gv_id === reference.gv_id
    && row.image_path === reference.image_path && row.image_status === 'exact' && row.image_source === 'identity')
    && printings.some(row => row.card_print_id === reference.id && row.id && row.printing_gv_id && row.finish_is_active === true)).map(row => row.id);
}
// authorization returns only current, anonymously visible, eligible pinned rows.
// signing/fetching are injected server capabilities, never supplied by the browser.
export function createReferenceDelivery({ byId, origin, authorize, sign, fetchImage = fetch }) {
  return async (ids, { signal }) => {
    const requested = validateReferenceIds(ids, byId); signal.throwIfAborted();
    const approved = await authorize(requested, signal); signal.throwIfAborted();
    if (!Array.isArray(approved) || new Set(approved).size !== approved.length || approved.some(id => !ids.includes(id))) throw new Error('Invalid reference authorization.');
    const rows = requested.filter(row => approved.includes(row.id));
    if (!rows.length) return [];
    for (const row of rows) if (!validReferencePath(row.image_path)) throw new Error('Invalid pinned reference path.');
    const urls = await sign(rows, signal); signal.throwIfAborted();
    if (!Array.isArray(urls) || urls.length !== rows.length) throw new Error('Invalid signed references.');
    const locations = rows.map((row, i) => validateSignedReferenceUrl(urls[i], origin, row.image_path));
    const controller = new AbortController(), combined = AbortSignal.any([signal, controller.signal]);
    const packets = new Array(rows.length); let cursor = 0, total = 0;
    try {
      await Promise.all(Array.from({ length: Math.min(REFERENCE_CONCURRENCY, rows.length) }, async () => {
        while (cursor < rows.length) {
          combined.throwIfAborted(); const i = cursor++, row = rows[i];
          const response = await fetchImage(locations[i], { signal: combined, redirect: 'error', cache: 'no-store', credentials: 'omit' });
          if (!/^image\/(?:webp|png|jpeg)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) { void response.body?.cancel().catch(() => {}); throw new Error('Invalid reference content type.'); }
          const bytes = await readBoundedResponse(response, MAX_REFERENCE_BYTES, combined);
          total += bytes.length;
          if (total > MAX_REFERENCE_TOTAL_BYTES || hashReference(bytes) !== row.sha256) throw new Error('Reference integrity failed.');
          packets[i] = { id: row.id, bytes };
        }
      }));
      return validateReferencePackets(packets, ids, byId);
    } catch (error) { controller.abort(); throw error; }
  };
}
