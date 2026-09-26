// Read-only completion check of the private pilot cache. No serving activation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { out, root, verified, query } from './ops.mjs';
import { featureHashV28 as hash, MAX_FEATURE_BYTES } from '../../../apps/web/src/lib/stores/scanReferenceFeaturesV28.mjs';
import { FEATURE_BUCKET_V29 as bucket } from '../../../apps/web/src/lib/stores/scanFeatureDeliveryV29.mjs';
const target = 'hrtbjchobencariqclab', origin = 'https://' + target + '.supabase.co', dir = path.join(root, '.local/integration/vendor-scan-storage-v30');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name))), output = path.join(dir, 'readback.private.json');
assert.ok(!fs.existsSync(output));
const plan = read('plan.private.json'), prepared = read('prepared.private.json'), uploaded = read('uploaded.private.json');
assert.equal(uploaded.target, target); assert.equal(plan.target, target); assert.equal(uploaded.bucket, bucket);
assert.equal(hash(fs.readFileSync(path.join(dir, 'plan.private.json'))), uploaded.planSha256);
assert.equal(hash(fs.readFileSync(path.join(dir, 'verified.private.jsonl'))), uploaded.journalSha256);
assert.equal(uploaded.verified, plan.objects.length); assert.equal(uploaded.references, 20079);
assert.equal((await verified()).id, target);
const objects = await query("begin read only; select name,(metadata->>'size')::bigint bytes,metadata->>'mimetype' mime from storage.objects where bucket_id='vendor-scan-features-v29' order by name; rollback;");
const expected = new Map(plan.objects.map(r => [r.path, r])); assert.equal(objects.length, expected.size);
for (const r of objects) { const p = expected.get(r.name); assert.ok(p); assert.equal(Number(r.bytes), p.bytes); assert.equal(r.mime, 'application/octet-stream'); }
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url)), { createClient } = require('@supabase/supabase-js');
const keys = JSON.parse(fs.readFileSync(path.join(out, 'keys.private.json'))), anonKey = keys.find(r => r.name === 'anon').api_key;
const options = { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url); assert.equal(url.origin, origin);
  return fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(30000), cache: 'no-store' });
} } };
const admin = createClient(origin, keys.find(r => r.name === 'service_role').api_key, options);
const b = await admin.storage.getBucket(bucket); assert.ok(!b.error); assert.equal(b.data.public, false);
assert.equal(Number(b.data.file_size_limit), MAX_FEATURE_BYTES); assert.deepEqual(b.data.allowed_mime_types, ['application/octet-stream']);
async function denied(client) {
  const positive = await client.from('card_prints').select('id').limit(1); assert.ok(!positive.error && positive.data.length);
  for (const row of [plan.objects[0], plan.objects.at(-1)]) {
    const get = await client.storage.from(bucket).download(row.path); assert.ok(get.error && [400,401,403,404].includes(Number(get.error.statusCode)), 'Private read must remain denied');
    const sign = await client.storage.from(bucket).createSignedUrl(row.path, 30); assert.ok(sign.error && [400,401,403,404].includes(Number(sign.error.statusCode)), 'Private signing must remain denied');
  }
  const list = await client.storage.from(bucket).list('v29', { limit: 1 }); assert.ok(list.error || !list.data.length);
  return { positivePublicControl: true, firstAndLastReadDenied: true, firstAndLastSigningDenied: true, listingHidden: true };
}
const access = { anonymous: await denied(createClient(origin, anonKey, options)), owners: [] };
const accounts = JSON.parse(fs.readFileSync(path.join(out, 'proof-accounts.private.json')));
for (const i of [0, 2]) {
  const client = createClient(origin, anonKey, options);
  try { const login = await client.auth.signInWithPassword(accounts[i]); assert.ok(!login.error, 'Synthetic login failed'); access.owners.push(await denied(client)); }
  finally { await client.auth.signOut({ scope: 'local' }); }
}
const publicResponse = await fetch(origin + '/storage/v1/object/public/' + bucket + '/' + plan.objects.at(-1).path, { redirect: 'error', signal: AbortSignal.timeout(30000) });
assert.ok([400,401,403,404].includes(publicResponse.status)); await publicResponse.body?.cancel();
const retained = await query(`begin read only; select md5(jsonb_build_object(
 'copies',(select jsonb_agg(to_jsonb(v) order by id) from vault_item_instances v),
 'profiles',(select jsonb_agg(to_jsonb(p) order by user_id) from public_profiles p),
 'stores',(select jsonb_agg(to_jsonb(s) order by id) from vendor_stores s),
 'grants',(select jsonb_agg(to_jsonb(e) order by id) from user_entitlements e),
 'orders',(select count(*) from vendor_orders),'telemetry',(select count(*) from web_events),
 'catalog',(select jsonb_agg(jsonb_build_array(id,gv_id,image_path) order by id) from card_prints)
 )::text) as digest; rollback;`);
assert.equal(retained[0].digest, prepared.retainedDigest); assert.equal(retained[0].digest, uploaded.retainedDigest);
const proof = { at: new Date().toISOString(), target, bucket, objects: objects.length, bytes: plan.bytes, references: plan.references,
  exactInventory: true, allObjectsHashReadBack: true, uploadReceiptSha256: hash(fs.readFileSync(path.join(dir, 'uploaded.private.json'))),
  access, publicUrlStatus: publicResponse.status, retainedDigest: retained[0].digest, servingEnabled: false };
fs.writeFileSync(output, JSON.stringify(proof, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ objects: proof.objects, references: proof.references, exactInventory: true, anonymousAndTwoOwnersDenied: true, retainedDataUnchanged: true, servingEnabled: false }));
