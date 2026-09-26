import './vendor_storefront_network_guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeatureDeliveryV29, featurePathV29, FEATURE_BUCKET_V29, validateFeaturePacketsV29, validateSignedFeatureUrlV29 } from '../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
import { featureHashV28 as hash } from '../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const id = '00000000-0000-4000-8000-000000000001', foreign = '00000000-0000-4000-8000-000000000002';
const bytes = Buffer.from('cached features'), origin = 'https://hrtbjchobencariqclab.supabase.co';
const row = { id, gv_id: 'GV-PK-TST-1', image_path: 'warehouse-derived/self-hosted-images-v1/1.webp', sha256: hash(Buffer.from('original image')) };
const feature = { id, imageSha256: row.sha256, artifactSha256: hash(bytes), bytes: bytes.length };
const byId = new Map([[id, row]]), manifest = new Map([[id, feature]]), signal = () => new AbortController().signal;
const location = r => origin + '/storage/v1/object/sign/' + FEATURE_BUCKET_V29 + '/' + featurePathV29(r) + '?token=synthetic';
function loader(overrides = {}) { return createFeatureDeliveryV29({ byId, manifest, origin, authorize: async () => [id], sign: async rows => rows.map(location),
  fetchFeature: async (_, opts) => { assert.equal(opts.redirect, 'error'); assert.equal(opts.cache, 'no-store'); assert.equal(opts.credentials, 'omit'); return new Response(bytes, { headers: { 'content-type': 'application/octet-stream' } }); }, ...overrides }); }
test('only currently authorized references are signed and delivered', async () => {
  const sequence = []; const read = loader({ authorize: async rows => { assert.equal(rows[0], row); sequence.push('authorize'); return [id]; },
    sign: async rows => { sequence.push('sign'); assert.equal(rows[0], feature); return rows.map(location); } });
  assert.deepEqual(await read([id], { signal: signal() }), [{ id, bytes }]); assert.deepEqual(sequence, ['authorize', 'sign']);
});
test('revoked visibility on the next call never signs or fetches a cache entry', async () => {
  let visible = true, signed = 0; const read = loader({ authorize: async () => visible ? [id] : [], sign: async rows => { signed++; return rows.map(location); } });
  assert.equal((await read([id], { signal: signal() })).length, 1); visible = false;
  assert.deepEqual(await read([id], { signal: signal() }), []); assert.equal(signed, 1);
});
test('unknown, repeated and oversized ID requests reject before authorization', async () => {
  let called = 0; const read = loader({ authorize: async () => { called++; return []; } });
  for (const ids of [[], [foreign], [id, id], Array(33).fill(id)]) await assert.rejects(read(ids, { signal: signal() }));
  assert.equal(called, 0);
});
test('forged authorization and missing or stale manifest binding reject before signing', async () => {
  let signed = 0; const sign = async () => { signed++; return []; };
  for (const override of [{ authorize: async () => [foreign] }, { authorize: async () => [id, id] }, { manifest: new Map() },
    { manifest: new Map([[id, { ...feature, imageSha256: '0'.repeat(64) }]]) }, { manifest: new Map([[id, { ...feature, bytes: NaN }]]) }])
    await assert.rejects(loader({ sign, ...override })([id], { signal: signal() }));
  assert.equal(signed, 0);
});
test('signed URLs cannot escape the exact origin, private bucket or pinned path', () => {
  const url = location(feature); assert.equal(validateSignedFeatureUrlV29(url, origin, feature), url);
  for (const value of [url.replace(origin, 'https://example.com'), url.replace(FEATURE_BUCKET_V29, 'user-card-images'),
    url.replace(feature.artifactSha256, '0'.repeat(64)), url + '#fragment', url + '&download=1', url + '&token=second',
    url.replace('https://', 'https://user:pass@'), url.replace('?token=synthetic', '')])
    assert.throws(() => validateSignedFeatureUrlV29(value, origin, feature));
});
test('size, content type, malformed response, truncation and tampering fail closed', async () => {
  for (const make of [() => new Response(bytes, { headers: { 'content-type': 'image/webp' } }),
    () => new Response(bytes, { status: 403 }), () => new Response('x'.repeat(bytes.length + 1), { headers: { 'content-type': 'application/gzip' } }),
    () => new Response(bytes.subarray(0, -1), { headers: { 'content-type': 'application/gzip' } }),
    () => new Response(Buffer.alloc(bytes.length), { headers: { 'content-type': 'application/gzip' } }),
    () => new Response(bytes, { headers: { 'content-type': 'application/gzip', 'content-length': '9999999' } })])
    await assert.rejects(loader({ fetchFeature: async () => make() })([id], { signal: signal() }));
});
test('IPC validation rejects image substitution, duplicate, foreign and altered packets', () => {
  for (const packets of [[{ id, bytes: Buffer.from('original image') }], [{ id, bytes }, { id, bytes }], [{ id: foreign, bytes }], [{ id, bytes: Buffer.alloc(1024 * 1024 + 1) }]])
    assert.throws(() => validateFeaturePacketsV29(packets, [id], byId, manifest));
  assert.deepEqual(validateFeaturePacketsV29([], [id], byId, manifest), []);
});
test('caller cancellation interrupts a stalled body and closes its reader', async () => {
  const controller = new AbortController(); let cancelled = false;
  const read = loader({ fetchFeature: async () => new Response(new ReadableStream({ start() { setTimeout(() => controller.abort(), 20); }, cancel() { cancelled = true; } }), { headers: { 'content-type': 'application/gzip' } }) });
  await assert.rejects(read([id], { signal: controller.signal })); assert.equal(cancelled, true);
});
test('24 MiB packet-set cap applies even when every individual feature is valid', () => {
  const chunk = Buffer.alloc(1024 * 1024), refs = new Map(), features = new Map(), packets = [];
  for (let i = 0; i < 25; i++) { const key = '00000000-0000-4000-8000-' + i.toString(16).padStart(12, '0');
    refs.set(key, { ...row, id: key }); features.set(key, { ...feature, id: key, artifactSha256: hash(chunk), bytes: chunk.length }); packets.push({ id: key, bytes: chunk }); }
  assert.throws(() => validateFeaturePacketsV29(packets, [...refs.keys()], refs, features));
});
test('feature delivery keeps four downloads in flight and preserves request order', async () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ ...row, id: '00000000-0000-4000-8000-' + i.toString(16).padStart(12, '0') }));
  const refs = new Map(rows.map(r => [r.id, r])), features = new Map(rows.map(r => [r.id, { ...feature, id: r.id }]));
  let active = 0, peak = 0;
  const read = createFeatureDeliveryV29({ byId: refs, manifest: features, origin, authorize: async rows => rows.map(r => r.id), sign: async rows => rows.map(location),
    fetchFeature: async () => { active++; peak = Math.max(peak, active); await new Promise(resolve => setTimeout(resolve, 5)); active--; return new Response(bytes, { headers: { 'content-type': 'application/gzip' } }); } });
  const packets = await read(rows.map(r => r.id), { signal: signal() });
  assert.equal(peak, 4); assert.deepEqual(packets.map(r => r.id), rows.map(r => r.id));
});
test('a failed feature response cancels sibling downloads', async () => {
  const refs = new Map([[id, row], [foreign, { ...row, id: foreign }]]), features = new Map([[id, feature], [foreign, { ...feature, id: foreign }]]);
  let calls = 0, aborted = false;
  const read = createFeatureDeliveryV29({ byId: refs, manifest: features, origin, authorize: async rows => rows.map(r => r.id), sign: async rows => rows.map(location),
    fetchFeature: async (_, { signal }) => { if (++calls === 1) return new Response('bad', { headers: { 'content-type': 'text/html' } });
      return new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true })); } });
  await assert.rejects(read([id, foreign], { signal: signal() })); assert.equal(aborted, true);
});
