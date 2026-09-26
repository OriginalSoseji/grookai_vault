// Read-only canonical snapshot. Original images and private account data are never packaged.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { out, root, query, verified } from './ops.mjs';
import { scanDescriptor, VISUAL_VERSION } from '../../../apps/web/src/lib/stores/visualMatchCore.mjs';
const p = await verified(); assert.equal(p.id, 'hrtbjchobencariqclab');
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');
const key = JSON.parse(fs.readFileSync(path.join(out, 'keys.private.json'))).find(k => k.name === 'service_role').api_key;
const client = createClient(`https://${p.id}.supabase.co`, key, { auth: { persistSession: false } });
const rows = await query("select id,gv_id,name,number,image_path from card_prints where image_source='identity' and image_status='exact' and image_path is not null order by id");
const imageReceipt = JSON.parse(fs.readFileSync(path.join(out, 'images-readback.json')));
assert.equal(imageReceipt.target, p.id);
const cache = path.join(out, 'visual-reference-cache'); fs.mkdirSync(cache, { recursive: true });
const references = [], skipped = [];
for (const row of rows) {
  assert.match(row.image_path, /^warehouse-derived\//); assert.ok(!row.image_path.includes('..'));
  const file = path.join(cache, row.id + '.webp');
  let bytes;
  if (fs.existsSync(file)) bytes = fs.readFileSync(file);
  else { const r = await client.storage.from('user-card-images').download(row.image_path); assert.equal(r.error, null); bytes = Buffer.from(await r.data.arrayBuffer()); fs.writeFileSync(file, bytes, { flag: 'wx' }); }
  const digest = createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, imageReceipt.results.find(r => r.path === row.image_path && r.verified)?.sha256, 'Reference must match retained exact-image receipt');
  try { references.push({ ...row, sha256: digest, descriptor: await scanDescriptor(bytes) }); }
  catch (e) { skipped.push({ id: row.id, reason: e.message }); }
  if ((references.length + skipped.length) % 40 === 0) console.log('Processed ' + (references.length + skipped.length));
}
const artifact = { version: VISUAL_VERSION, scope: 'vendor-pilot-sample-catalog', database: p.id, generated_at: new Date().toISOString(), references };
assert.ok(references.length > 250);
fs.writeFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchIndex.json'), JSON.stringify(artifact));
fs.writeFileSync(path.join(root, 'apps/web/src/lib/stores/visualMatchCatalog.json'), JSON.stringify(references.map(({ id, gv_id, name, number }) => ({ id, gv_id, name, number }))));
fs.writeFileSync(path.join(out, 'visual-index-build-' + Date.now() + '.json'), JSON.stringify({ rows: rows.length, references: references.length, skipped }, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ references: references.length, skipped }));
