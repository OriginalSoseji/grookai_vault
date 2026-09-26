import { MAX_REFERENCE_TOTAL_BYTES, REFERENCE_CONCURRENCY, validateReferenceIds, readBoundedResponse } from './scanReferenceDeliveryV24.mjs';
import { MAX_FEATURE_BYTES, featureHashV28 } from './scanReferenceFeaturesV28.mjs';
export const FEATURE_BUCKET_V29 = 'vendor-scan-features-v29';
export const featurePathV29 = row => {
  if (!row || typeof row.artifactSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(row.artifactSha256)) throw new Error('Invalid feature path.');
  return 'v29/' + row.artifactSha256 + '.gz';
};
export function validateFeaturePacketsV29(packets, ids, byId, manifest) {
  validateReferenceIds(ids, byId);
  if (!(manifest instanceof Map) || !Array.isArray(packets) || packets.length > ids.length) throw new Error('Invalid feature response.');
  const seen = new Set(); let total = 0;
  for (const packet of packets) {
    const row = manifest.get(packet?.id);
    if (!row || !ids.includes(packet.id) || seen.has(packet.id) || row.imageSha256 !== byId.get(packet.id)?.sha256
      || !(packet.bytes instanceof Uint8Array) || !packet.bytes.length || packet.bytes.length > MAX_FEATURE_BYTES
      || packet.bytes.length !== row.bytes || featureHashV28(packet.bytes) !== row.artifactSha256) throw new Error('Feature integrity failed.');
    seen.add(packet.id); total += packet.bytes.length;
    if (total > MAX_REFERENCE_TOTAL_BYTES) throw new Error('Feature response too large.');
  }
  return packets;
}
export function validateSignedFeatureUrlV29(value, origin, row) {
  const url = new URL(value);
  if (url.origin !== origin || url.username || url.password || url.hash
    || url.pathname !== '/storage/v1/object/sign/' + FEATURE_BUCKET_V29 + '/' + featurePathV29(row)
    || url.searchParams.size !== 1 || [...url.searchParams.keys()].some(k => k !== 'token') || !url.searchParams.get('token')) throw new Error('Invalid feature location.');
  return url.href;
}
// Authorization remains over canonical image identities, before any signing.
// A trusted bundled manifest is necessary but never sufficient for disclosure.
export function createFeatureDeliveryV29({ byId, manifest, origin, authorize, sign, fetchFeature = fetch }) {
  return async (ids, { signal }) => {
    const requested = validateReferenceIds(ids, byId); signal.throwIfAborted();
    const approved = await authorize(requested, signal); signal.throwIfAborted();
    if (!Array.isArray(approved) || new Set(approved).size !== approved.length || approved.some(id => !ids.includes(id))) throw new Error('Invalid reference authorization.');
    const rows = requested.filter(r => approved.includes(r.id)).map(r => {
      const feature = manifest.get(r.id);
      if (!feature || feature.imageSha256 !== r.sha256 || !Number.isSafeInteger(feature.bytes)
        || feature.bytes < 1 || feature.bytes > MAX_FEATURE_BYTES) throw new Error('Feature binding unavailable.');
      return feature;
    });
    if (!rows.length) return [];
    const urls = await sign(rows, signal); signal.throwIfAborted();
    if (!Array.isArray(urls) || urls.length !== rows.length) throw new Error('Invalid signed features.');
    const locations = rows.map((r, i) => validateSignedFeatureUrlV29(urls[i], origin, r));
    const controller = new AbortController(), combined = AbortSignal.any([signal, controller.signal]);
    const packets = new Array(rows.length); let cursor = 0, total = 0;
    try {
      await Promise.all(Array.from({ length: Math.min(REFERENCE_CONCURRENCY, rows.length) }, async () => {
        while (cursor < rows.length) {
          combined.throwIfAborted(); const i = cursor++, row = rows[i];
          const response = await fetchFeature(locations[i], { signal: combined, redirect: 'error', cache: 'no-store', credentials: 'omit' });
          if (!/^application\/(?:octet-stream|gzip)(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
            void response.body?.cancel().catch(() => {}); throw new Error('Invalid feature content type.');
          }
          const bytes = await readBoundedResponse(response, Math.min(MAX_FEATURE_BYTES, row.bytes), combined);
          total += bytes.length;
          if (total > MAX_REFERENCE_TOTAL_BYTES || bytes.length !== row.bytes || featureHashV28(bytes) !== row.artifactSha256) throw new Error('Feature integrity failed.');
          packets[i] = { id: row.id, bytes };
        }
      }));
      return validateFeaturePacketsV29(packets, ids, byId, manifest);
    } catch (error) { controller.abort(); throw error; }
  };
}
