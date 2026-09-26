// Windows disposable worker + real, authorized private pilot storage.
// Does not test hosted owner middleware, Linux, UI, or physical devices.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { root, out, verified, query } from './ops.mjs';
import { loadReferenceMetadataV27 } from '../../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { loadFeatureManifestV29 } from '../../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { createFeatureDeliveryV29, FEATURE_BUCKET_V29, featurePathV29 } from '../../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
import { eligibleReferenceIds, readBoundedResponse } from '../../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
import { getPublicCardPrintingOptions } from '../../../apps/web/src/lib/cards/getPublicCardPrintingOptions.ts';
import { featureHashV28 as hash } from '../../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { runVisualProcessV24 } from '../../../apps/web/src/lib/stores/scanVisualProcessV24.mjs';
const origin = 'https://hrtbjchobencariqclab.supabase.co', dir = path.join(root, '.local/integration/vendor-scan-storage-v30');
const read = p => JSON.parse(fs.readFileSync(p)); assert.equal((await verified()).id, 'hrtbjchobencariqclab');
const uploaded = read(path.join(dir, 'uploaded.private.json')), readback = read(path.join(dir, 'readback.private.json'));
assert.equal(uploaded.verified, 19621); assert.equal(readback.exactInventory, true);
const retainedSql = `begin read only; select md5(jsonb_build_object(
 'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),
 'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),
 'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),
 'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),
 'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events),
 'catalog',(select jsonb_agg(jsonb_build_array(id,gv_id,image_path) order by id) from card_prints)
 )::text) as digest; rollback;`;
const beforeDigest = (await query(retainedSql))[0].digest; assert.equal(beforeDigest, readback.retainedDigest);
const source = read(path.join(root, 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json'));
function freeze() { for (const [file, sha] of Object.entries(source.sourceHashes)) assert.equal(hash(fs.readFileSync(path.join(root, file))), sha); }
freeze();
const byId = loadReferenceMetadataV27(path.join(root, 'apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz'));
const manifest = loadFeatureManifestV29(path.join(root, 'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz'), byId);
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url)), { createClient } = require('@supabase/supabase-js');
const keys = read(path.join(out, 'keys.private.json')); let fetched = 0;
async function loadReferences(ids, { signal: workerSignal }) {
  const signal = AbortSignal.any([workerSignal, AbortSignal.timeout(7000)]);
  const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); assert.equal(url.origin, origin);
    const response = await fetch(input, { ...init, signal, redirect: 'error', cache: 'no-store' });
    const bytes = await readBoundedResponse(response, 2 * 1024 * 1024, signal);
    return new Response(new Uint8Array(bytes), { status: response.status, headers: { 'content-type': 'application/json' } });
  } } };
  const publicClient = createClient(origin, keys.find(r => r.name === 'anon').api_key, options), admin = createClient(origin, keys.find(r => r.name === 'service_role').api_key, options);
  return createFeatureDeliveryV29({ byId, manifest, origin, authorize: async rows => {
    const r = await publicClient.from('card_prints').select('id,gv_id,image_path,image_status,image_source').in('id', rows.map(r => r.id)); assert.ok(!r.error);
    return eligibleReferenceIds(rows, r.data, await getPublicCardPrintingOptions(publicClient, r.data.map(row => row.id)));
  }, sign: async rows => {
    const paths = rows.map(featurePathV29), r = await admin.storage.from(FEATURE_BUCKET_V29).createSignedUrls(paths, 30); assert.ok(!r.error && r.data.length === paths.length);
    return paths.map(p => { const item = r.data.find(row => row.path === p); assert.ok(item?.signedUrl && !item.error); return item.signedUrl; });
  }, fetchFeature: (url, init) => { fetched++; return fetch(url, init); } })(ids, { signal });
}
const labels = read('.local/integration/vendor-scan-visual-v16/labels.private.json'), previous = read('.local/integration/vendor-scan-visual-v23/regression.private.json');
const lost = new Set(['holdout-0041.heic','holdout-0081.jpeg','holdout-0083.jpeg','holdout-0085.jpeg','holdout-0087.jpeg','holdout-0089.jpeg','holdout-0091.jpeg','holdout-0095.jpeg','holdout-0097.jpeg']);
const cases = labels.filter(r => ['gallery_v12','browser_heic','legacy'].includes(r.corpus) || r.corpus === 'v2_100' && lost.has(r.file))
  .map(r => ({ ...r, expectedResult: previous.rows.find(p => p.corpus === r.corpus && p.file === r.file) }));
const fresh = process.env.USERPROFILE + '/.codex/tmp/vendor-real-scans-20260923/holdout-visual-v23';
for (const file of ['fresh-01.jpeg', 'fresh-12.jpeg']) {
  const label = read(fresh + '/frozen-labels.private.json').labels.find(r => r.file === file);
  cases.push({ ...label, corpus: 'v23_reused12', path: fresh + '/derived/' + file, expectedResult: read(fresh + '/results.private.json').rows.find(r => r.file === file) });
}
assert.equal(cases.length, 17);
const report = { at: new Date().toISOString(), scope: '17 reused scans, Windows isolated worker, actual pilot private storage with current anonymous canonical/printing authority. Not hosted, Linux, or owner middleware proof.',
  sourceHashes: source.sourceHashes, beforeDigest, rows: [] };
const output = path.join(dir, 'worker-' + Date.now() + '.private.json'), save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
fs.writeFileSync(output, JSON.stringify(report), { flag: 'wx' });
const worker = new URL('../../../apps/web/src/lib/stores/scanVisualWorkerV29.mjs', import.meta.url), options = { byId, featureManifest: manifest, loadReferences, timeoutMs: 30000 };
try {
  for (const item of cases) {
    const bytes = fs.readFileSync(item.path); assert.equal(hash(bytes), item.sha256);
    const started = performance.now(), before = fetched, progress = []; let resources, result;
    try { result = await runVisualProcessV24(worker, bytes, { ...options, onProgress: p => progress.push(p), onResources: r => resources = r }); }
    catch (error) { report.failedCase = { corpus: item.corpus, file: item.file, progress, resources }; throw error; }
    assert.deepEqual(result.candidates, item.expectedResult.candidates.map(({ id, rotation }) => ({ id, rotation })));
    assert.equal(result.status, item.expectedResult.status);
    report.rows.push({ corpus: item.corpus, file: item.file, scanSha256: item.sha256, same: true, ms: Math.round(performance.now() - started), downloads: fetched - before, progress, resources, result });
    save(); console.log(JSON.stringify({ cases: report.rows.length, same: true, ms: report.rows.at(-1).ms }));
  }
  const controller = new AbortController(), bytes = fs.readFileSync(cases[0].path); let deliveryStarted = false, timer;
  try { await assert.rejects(runVisualProcessV24(worker, bytes, { ...options, signal: controller.signal, onProgress: p => {
    if (p.stage === 'delivery_start') { deliveryStarted = true; timer = setTimeout(() => controller.abort(), 50); }
  } }), error => error.code === 'aborted'); } finally { clearTimeout(timer); }
  assert.ok(deliveryStarted);
  const retry = await runVisualProcessV24(worker, bytes, options);
  assert.deepEqual(retry.candidates, cases[0].expectedResult.candidates.map(({ id, rotation }) => ({ id, rotation })));
  report.cancellation = { duringDelivery: true, firstRetryPassed: true }; freeze(); report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = String(error.code || error.message).slice(0, 300); process.exitCode = 1; }
try {
  report.afterDigest = (await query(retainedSql))[0].digest; report.retainedDataUnchanged = report.afterDigest === beforeDigest;
  assert.ok(report.retainedDataUnchanged, 'Retained data changed');
} catch { report.retainedDataUnchanged = false; report.status = 'failed'; process.exitCode = 1; }
report.finishedAt = new Date().toISOString(); save();
console.log(JSON.stringify({ status: report.status, cases: report.rows.length, same: report.rows.filter(r => r.same).length, cancellation: report.cancellation, error: report.error }));
