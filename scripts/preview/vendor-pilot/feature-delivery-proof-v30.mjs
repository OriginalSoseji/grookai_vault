// Real private storage delivery from Windows, not a hosted route/owner test.
// No signed URLs, keys or cached bytes are written into the proof.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { root, out, verified } from './ops.mjs';
import { loadReferenceMetadataV27 } from '../../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { loadFeatureManifestV29 } from '../../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { createFeatureDeliveryV29, FEATURE_BUCKET_V29, featurePathV29 } from '../../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
import { eligibleReferenceIds, readBoundedResponse } from '../../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
import { getPublicCardPrintingOptions } from '../../../apps/web/src/lib/cards/getPublicCardPrintingOptions.ts';
import { featureHashV28 as hash } from '../../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
const origin = 'https://hrtbjchobencariqclab.supabase.co', dir = path.join(root, '.local/integration/vendor-scan-storage-v30');
assert.equal((await verified()).id, 'hrtbjchobencariqclab');
const proof = JSON.parse(fs.readFileSync(path.join(root, 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json')));
for (const [file, sha] of Object.entries(proof.sourceHashes)) assert.equal(hash(fs.readFileSync(path.join(root, file))), sha);
const byId = loadReferenceMetadataV27(path.join(root, 'apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz'));
const manifest = loadFeatureManifestV29(path.join(root, 'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz'), byId);
// Only use objects already hash-read-back by the concurrently resumable upload.
const lines = fs.readFileSync(path.join(dir, 'verified.private.jsonl'), 'utf8');
const verifiedPaths = new Set(lines.slice(0, lines.lastIndexOf('\n')).split('\n').filter(Boolean).map(line => JSON.parse(line).path));
const selected = [...manifest.values()].filter(row => verifiedPaths.has(featurePathV29(row))).slice(0, 32).map(row => row.id); assert.equal(selected.length, 32);
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url)), { createClient } = require('@supabase/supabase-js');
const keys = JSON.parse(fs.readFileSync(path.join(out, 'keys.private.json')));
const output = path.join(dir, 'delivery-' + Date.now() + '.private.json');
const report = { at: new Date().toISOString(), scope: 'Windows to actual pilot storage; current anonymous canonical/printing authorization; no hosted or owner-route claim', rows: [] };
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
try {
  for (const count of [4, 32]) {
    const signal = AbortSignal.timeout(7000), started = performance.now(); let signed = 0, fetched = 0;
    const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
      const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); assert.equal(url.origin, origin);
      const response = await fetch(input, { ...init, signal, redirect: 'error', cache: 'no-store' });
      const bytes = await readBoundedResponse(response, 2 * 1024 * 1024, signal);
      return new Response(new Uint8Array(bytes), { status: response.status, headers: { 'content-type': 'application/json' } });
    } } };
    const publicClient = createClient(origin, keys.find(r => r.name === 'anon').api_key, options), admin = createClient(origin, keys.find(r => r.name === 'service_role').api_key, options);
    const loader = createFeatureDeliveryV29({ byId, manifest, origin, authorize: async rows => {
      const r = await publicClient.from('card_prints').select('id,gv_id,image_path,image_status,image_source').in('id', rows.map(r => r.id)); assert.ok(!r.error);
      return eligibleReferenceIds(rows, r.data, await getPublicCardPrintingOptions(publicClient, r.data.map(row => row.id)));
    }, sign: async rows => {
      const paths = rows.map(featurePathV29), r = await admin.storage.from(FEATURE_BUCKET_V29).createSignedUrls(paths, 30); assert.ok(!r.error && r.data.length === paths.length);
      signed += paths.length;
      return paths.map(p => { const item = r.data.find(row => row.path === p); assert.ok(item?.signedUrl && !item.error); return item.signedUrl; });
    }, fetchFeature: (url, init) => { fetched++; return fetch(url, init); } });
    const packets = await loader(selected.slice(0, count), { signal }); assert.equal(packets.length, count); assert.equal(signed, count); assert.equal(fetched, count);
    report.rows.push({ count, bytes: packets.reduce((n, r) => n + r.bytes.length, 0), ms: Math.round(performance.now() - started), currentAnonymousAuthority: true, hashesVerified: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
  }
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; process.exitCode = 1; }
report.finishedAt = new Date().toISOString(); fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
