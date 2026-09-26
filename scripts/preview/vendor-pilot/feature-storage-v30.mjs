// Private, isolated staging only. Does not qualify Linux, enable matching,
// publish an alias or modify canonical/owner data. No production target.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { out, root, verified, query } from './ops.mjs';
import { featureHashV28 as hash, MAX_FEATURE_BYTES } from '../../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { loadReferenceMetadataV27 } from '../../../apps/web/src/lib/stores/scanReferenceMetadataV27.mjs';
import { loadFeatureManifestV29 } from '../../../apps/web/src/lib/stores/scanFeatureManifestV29.mjs';
import { FEATURE_BUCKET_V29 as bucket, featurePathV29 } from '../../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
import { readBoundedResponse } from '../../../apps/web/src/lib/stores/scanReferenceDeliveryV24.mjs';
const target = 'hrtbjchobencariqclab', origin = 'https://' + target + '.supabase.co', dir = path.join(root, '.local/integration/vendor-scan-storage-v30');
fs.mkdirSync(dir, { recursive: true });
const read = p => JSON.parse(fs.readFileSync(p)), save = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2), { flag: 'wx' });
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url)), { createClient } = require('@supabase/supabase-js');
const credentials = read(path.join(out, 'keys.private.json'));
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); assert.equal(url.origin, origin);
  const signal = AbortSignal.any([AbortSignal.timeout(30000), ...(init?.signal ? [init.signal] : [])]);
  const response = await fetch(input, { ...init, signal, redirect: 'error', cache: 'no-store' });
  if (!response.body) return response;
  // Retain HTTP errors for SDK interpretation while bounding every body.
  const bytes = await readBoundedResponse(new Response(response.body, { headers: response.headers }), 2 * 1024 * 1024, signal);
  return new Response(new Uint8Array(bytes), { status: response.status, headers: response.headers });
} } };
const admin = createClient(origin, credentials.find(r => r.name === 'service_role').api_key, options);
const anonymous = createClient(origin, credentials.find(r => r.name === 'anon').api_key, options);
const retainedSql = `select md5(jsonb_build_object(
 'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),
 'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),
 'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),
 'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),
 'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events),
 'catalog',(select jsonb_agg(jsonb_build_array(id,gv_id,image_path) order by id) from card_prints)
 )::text) as digest;`;
async function retained() { return (await query('begin read only;' + retainedSql + 'rollback;'))[0].digest; }
async function checkTarget() { const p = await verified(); assert.equal(p.id, target); assert.equal(p.status, 'ACTIVE_HEALTHY'); return p; }
function assertBucket(value) {
  assert.equal(value.id, bucket); assert.equal(value.name, bucket); assert.equal(value.public, false);
  assert.equal(Number(value.file_size_limit), MAX_FEATURE_BYTES); assert.deepEqual(value.allowed_mime_types, ['application/octet-stream']);
}
async function getBucket() { const r = await admin.storage.getBucket(bucket); assert.ok(!r.error, 'Private bucket unavailable'); assertBucket(r.data); return r.data; }
function localPlan() {
  const proof = read(path.join(root, 'docs/audits/vendor_scan_runtime_v29/PROOF_20260924.json'));
  for (const [file, sha] of Object.entries(proof.sourceHashes)) assert.equal(hash(fs.readFileSync(path.join(root, file))), sha);
  const file = path.join(root, '.local/integration/vendor-scan-runtime-v29/manifest.private.json');
  assert.equal(hash(fs.readFileSync(file)), proof.receiptHashes['manifest.private.json']);
  const local = read(file), byId = loadReferenceMetadataV27(path.join(root, 'apps/web/src/lib/stores/scanExpandedMetadataV27.json.gz'));
  const manifest = loadFeatureManifestV29(path.join(root, 'apps/web/src/lib/stores/scanExpandedFeaturesV29.json.gz'), byId);
  const allowed = ['.local/integration/vendor-scan-runtime-v28/regression2/features', '.local/integration/vendor-scan-runtime-v29/windows-generated/features'].map(p => fs.realpathSync(path.join(root, p)).toLowerCase() + path.sep);
  const unique = new Map();
  for (const row of local.references) {
    const expected = manifest.get(row.id); assert.ok(expected); assert.equal(row.artifactSha256, expected.artifactSha256); assert.equal(row.bytes, expected.bytes);
    const source = fs.realpathSync(path.resolve(root, row.localSource)); assert.ok(allowed.some(p => source.toLowerCase().startsWith(p)));
    const bytes = fs.readFileSync(source); assert.equal(bytes.length, row.bytes); assert.equal(hash(bytes), row.artifactSha256);
    unique.set(featurePathV29(expected), { path: featurePathV29(expected), sha256: row.artifactSha256, bytes: row.bytes, source });
  }
  assert.equal(local.references.length, 20079);
  return { target, bucket, references: manifest.size, manifestSha256: local.pins.sha256, objects: [...unique.values()],
    bytes: [...unique.values()].reduce((n, r) => n + r.bytes, 0), scope: 'Private staging only; Linux qualification and all serving flags unchanged.' };
}
function loadPlan() { const file = path.join(dir, 'plan.private.json'), bytes = fs.readFileSync(file), plan = JSON.parse(bytes);
  assert.equal(plan.target, target); assert.equal(plan.bucket, bucket); assert.equal(plan.references, 20079);
  return { plan, planSha256: hash(bytes) };
}
async function readObject(row) {
  const result = await admin.storage.from(bucket).download(row.path); assert.ok(!result.error, 'Feature readback failed');
  const bytes = Buffer.from(await result.data.arrayBuffer()); assert.equal(bytes.length, row.bytes); assert.equal(hash(bytes), row.sha256);
}
async function denied(client, row) {
  const positive = await client.from('card_prints').select('id').limit(1); assert.ok(!positive.error && positive.data.length, 'Public-key positive control failed');
  const get = await client.storage.from(bucket).download(row.path); assert.ok(get.error && [400,401,403,404].includes(Number(get.error.statusCode)), 'Private read was not denied');
  const sign = await client.storage.from(bucket).createSignedUrl(row.path, 30); assert.ok(sign.error && [400,401,403,404].includes(Number(sign.error.statusCode)), 'Private signing was not denied');
  const list = await client.storage.from(bucket).list('v29', { limit: 1 }); assert.ok(list.error || list.data.length === 0, 'Private listing disclosed data');
  return { read: Number(get.error.statusCode), sign: Number(sign.error.statusCode), listHidden: true, publicControl: true };
}
const mode = process.argv[2];
if (mode === 'audit') {
  await checkTarget();
  const counts = await query('begin read only; select (select count(*) from card_prints) cards,(select count(*) from sets) sets,(select count(*) from card_printings) printings,(select count(*) from card_print_traits) traits; rollback;');
  const policies = await query("begin read only; select policyname,roles,cmd,qual,with_check from pg_policies where schemaname='storage' and tablename='objects' order by policyname; rollback;");
  const buckets = await admin.storage.listBuckets(); assert.ok(!buckets.error); const existing = buckets.data.find(r => r.id === bucket); if (existing) assertBucket(existing);
  save('audit.private.json', { at: new Date().toISOString(), target, counts, policies, existingBucket: existing ?? null, retainedDigest: await retained() });
  console.log(JSON.stringify({ target, counts, bucketExists: !!existing, policies: policies.length }));
} else if (mode === 'plan') {
  const audit = read(path.join(dir, 'audit.private.json')); assert.equal(audit.target, target);
  const plan = localPlan(); save('plan.private.json', { at: new Date().toISOString(), ...plan });
  console.log(JSON.stringify({ objects: plan.objects.length, references: plan.references, bytes: plan.bytes, servingEnabled: false }));
} else if (mode === 'prepare') {
  await checkTarget(); const { plan, planSha256 } = loadPlan(); assert.ok(!fs.existsSync(path.join(dir, 'prepared.private.json')));
  const audit = read(path.join(dir, 'audit.private.json')); assert.equal(await retained(), audit.retainedDigest);
  // The audit must have been reviewed for policies that grant access to an
  // arbitrary bucket. No policy is created or broadened by this operation.
  save('prepare-intent.private.json', { at: new Date().toISOString(), target, bucket, planSha256, public: false, servingEnabled: false });
  const listed = await admin.storage.listBuckets(); assert.ok(!listed.error);
  if (!listed.data.some(r => r.id === bucket)) {
    const made = await admin.storage.createBucket(bucket, { public: false, fileSizeLimit: MAX_FEATURE_BYTES, allowedMimeTypes: ['application/octet-stream'] });
    assert.ok(!made.error, 'Private bucket creation failed');
  }
  await getBucket(); const first = plan.objects[0], bytes = fs.readFileSync(first.source); assert.equal(hash(bytes), first.sha256);
  const result = await admin.storage.from(bucket).upload(first.path, bytes, { upsert: false, contentType: 'application/octet-stream' });
  assert.ok(!result.error || [400,409].includes(Number(result.error.statusCode)) && /already exists|duplicate/i.test(result.error.message), 'Initial feature upload failed');
  await readObject(first); const access = { anonymous: await denied(anonymous, first), owners: [] };
  const accounts = read(path.join(out, 'proof-accounts.private.json'));
  for (const i of [0,2]) {
    const client = createClient(origin, credentials.find(r => r.name === 'anon').api_key, options);
    try { const login = await client.auth.signInWithPassword(accounts[i]); assert.ok(!login.error, 'Synthetic login failed'); access.owners.push(await denied(client, first)); }
    finally { await client.auth.signOut({ scope: 'local' }); }
  }
  const publicUrl = origin + '/storage/v1/object/public/' + bucket + '/' + first.path;
  const publicResponse = await fetch(publicUrl, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  assert.ok([400,401,403,404].includes(publicResponse.status), 'Public feature URL did not deny access'); await publicResponse.body?.cancel();
  assert.equal(await retained(), audit.retainedDigest);
  save('prepared.private.json', { at: new Date().toISOString(), target, bucket, planSha256, first: { path: first.path, sha256: first.sha256 }, access,
    publicUrlStatus: publicResponse.status, privateBucketVerified: true, retainedDigest: audit.retainedDigest });
  console.log(JSON.stringify({ privateBucketVerified: true, anonymousAndTwoOwnersDenied: true, publicUrlStatus: publicResponse.status, servingEnabled: false }));
} else if (mode === 'upload') {
  await checkTarget(); const { plan, planSha256 } = loadPlan(), prepared = read(path.join(dir, 'prepared.private.json'));
  assert.equal(prepared.planSha256, planSha256); assert.ok(prepared.privateBucketVerified); await getBucket();
  assert.ok(!fs.existsSync(path.join(dir, 'uploaded.private.json'))); assert.equal(await retained(), prepared.retainedDigest);
  const journal = path.join(dir, 'verified.private.jsonl'), expected = new Map(plan.objects.map(r => [r.path, r])), done = new Set();
  if (fs.existsSync(journal)) for (const line of fs.readFileSync(journal, 'utf8').trim().split('\n').filter(Boolean)) {
    const r = JSON.parse(line); assert.equal(r.planSha256, planSha256); assert.equal(r.sha256, expected.get(r.path)?.sha256); assert.equal(r.bytes, expected.get(r.path)?.bytes); assert.equal(r.verified, true); assert.ok(!done.has(r.path)); done.add(r.path);
  }
  const pending = plan.objects.filter(r => !done.has(r.path)); let cursor = 0, failed = false;
  const retry = async fn => { for (let attempt = 0; ; attempt++) {
    try { return await fn(); } catch (error) { if (attempt >= 3) throw error; await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000)); }
  } };
  const errors = [];
  await Promise.all(Array.from({ length: 8 }, async () => { while (!failed && cursor < pending.length) {
    const row = pending[cursor++]; try {
      const bytes = fs.readFileSync(row.source); assert.equal(hash(bytes), row.sha256); assert.equal(bytes.length, row.bytes);
      await retry(async () => { const r = await admin.storage.from(bucket).upload(row.path, bytes, { upsert: false, contentType: 'application/octet-stream' });
        assert.ok(!r.error || [400,409].includes(Number(r.error.statusCode)) && /already exists|duplicate/i.test(r.error.message), 'Upload failed'); });
      await retry(() => readObject(row));
      fs.appendFileSync(journal, JSON.stringify({ at: new Date().toISOString(), target, planSha256, path: row.path, sha256: row.sha256, bytes: row.bytes, verified: true }) + '\n');
      done.add(row.path); if (done.size % 200 === 0) console.log(JSON.stringify({ verified: done.size, total: plan.objects.length }));
    } catch (e) { failed = true; errors.push({ path: row.path, message: String(e.message).slice(0, 200) }); }
  } }));
  if (errors.length) { save('upload-errors-' + Date.now() + '.private.json', errors); throw new Error('Upload stopped; verified journal retained for resume.'); }
  assert.equal(done.size, plan.objects.length); await getBucket(); const digest = await retained(); assert.equal(digest, prepared.retainedDigest);
  save('uploaded.private.json', { at: new Date().toISOString(), target, bucket, planSha256, verified: done.size, references: plan.references,
    bytes: plan.bytes, journalSha256: hash(fs.readFileSync(journal)), retainedDigest: digest, servingEnabled: false, linuxQualified: false });
  console.log(JSON.stringify({ verified: done.size, references: plan.references, bytes: plan.bytes, servingEnabled: false }));
} else throw new Error('Choose audit, plan, prepare or upload.');
