// Sends a bounded set of user-authorized QA derivatives only to the isolated
// Grookai pilot, using an existing synthetic owner. No inventory/photo writes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { out, verified } from './ops.mjs';
const origin = process.argv[2], canonical = 'https://grookai-vendor-preview.vercel.app';
assert.ok(origin === canonical || /^https:\/\/grookai-vendor-preview-[a-z0-9]+-sosejis-projects\.vercel\.app$/.test(origin ?? ''));
const project = await verified(); assert.equal(project.id, 'hrtbjchobencariqclab');
const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const { createServerClient } = require('@supabase/ssr'), sharp = require('sharp');
const account = JSON.parse(fs.readFileSync(path.join(out, 'proof-accounts.private.json')))[2];
const key = JSON.parse(fs.readFileSync(path.join(out, 'keys.private.json'))).find(k => k.name === 'anon').api_key;
const jar = new Map();
const client = createServerClient(`https://${project.id}.supabase.co`, key, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: xs => xs.forEach(x => jar.set(x.name, x.value)) } });
assert.equal((await client.auth.signInWithPassword(account)).error, null);
const request = async bytes => {
  const started = Date.now();
  const response = await fetch(origin + '/api/stores/owner/intake/match', { method: 'POST',
    headers: { Origin: canonical, 'Content-Type': 'image/jpeg', cookie: [...jar].map(([k, v]) => k + '=' + v).join('; ') }, body: bytes, signal: AbortSignal.timeout(40000) });
  return { http: response.status, cacheControl: response.headers.get('cache-control'), ms: Date.now() - started, data: await response.json() };
};
const base = path.join(process.env.USERPROFILE, '.codex/tmp/vendor-real-scans-20260923');
const cases = [
  { file: 'derived/scan-0075.jpeg.jpg', label: 'upside-down Venusaur ex', expected: 'GV-PK-MEW-003', rotation: 180 },
  { file: 'holdout-v2/derived/holdout-0010.heic.jpg', label: 'upside-down Bills Transfer HEIC derivative', expected: 'GV-PK-MEW-156', rotation: 180 },
  { file: 'derived/scan-0144.heic.jpg', label: 'outside-pilot Greedent, former false suggestion', expected: null },
  { file: 'derived/scan-0146.heic.jpg', label: 'outside-pilot Revavroom, former false suggestion', expected: null },
  { file: 'holdout-v2/derived/holdout-0051.heic.jpg', label: 'held-out outside-pilot Aegislash', expected: null },
  { file: 'holdout-v2/derived/holdout-0082.jpeg.jpg', label: 'held-out Pokemon back', expected: null },
];
const results = [];
try {
  for (const c of cases) {
    const response = await request(fs.readFileSync(path.join(base, c.file)));
    assert.equal(response.http, 200, c.label);
    assert.match(response.cacheControl, /no-store/);
    if (c.expected) {
      assert.equal(response.data.cards[0]?.gv_id, c.expected, c.label);
      assert.equal(response.data.cards[0]?.rotation, c.rotation, c.label);
      assert.ok(response.data.cards[0].printings.every(p => p.printing_gv_id));
      assert.ok(response.data.cards[0].printings.length > 0);
    } else assert.deepEqual(response.data.cards, [], c.label);
    assert.ok(!('text' in response.data) && !('confidence' in response.data));
    results.push({ case: c.label, http: response.http, ms: response.ms, status: response.data.status,
      candidates: response.data.cards.map(r => ({ gvId: r.gv_id, rotation: r.rotation })) });
    console.log('PASS ' + c.label);
  }
  const index = JSON.parse(fs.readFileSync('apps/web/src/lib/stores/visualMatchIndex.json'));
  const ref = index.references.find(r => r.gv_id === 'GV-PK-MEW-173');
  const bytes = await sharp(fs.readFileSync(path.join(out, 'visual-reference-cache', ref.id + '.webp'))).rotate(90).jpeg().toBuffer();
  const sideways = await request(bytes);
  // Preserve the observed V1->V2 recall regression: this compressed full-art
  // reference may abstain. It must never return another identity.
  assert.equal(sideways.http, 200);
  assert.ok(sideways.data.cards.every(c => c.gv_id === ref.gv_id));
  results.push({ case: 'sideways compressed full-art reference, conservative abstention allowed', http: sideways.http, ms: sideways.ms,
    status: sideways.data.status, candidates: sideways.data.cards.map(c => ({ gvId: c.gv_id, rotation: c.rotation })) });
  const realFront = fs.readFileSync(path.join(base, 'holdout-v2/derived/holdout-0001.heic.jpg'));
  const upright = await sharp(realFront).autoOrient().toBuffer();
  const realSideways = await request(await sharp(upright).rotate(90).jpeg({ quality: 88 }).toBuffer());
  assert.equal(realSideways.http, 200);
  assert.equal(realSideways.data.cards[0]?.gv_id, 'GV-PK-MEW-081');
  assert.equal(realSideways.data.cards[0]?.rotation, 270);
  results.push({ case: 'sideways held-out Magnemite, required correct identity and rotation', http: realSideways.http, ms: realSideways.ms, expected: 'GV-PK-MEW-081', rotation: 270 });
  assert.equal((await request(Buffer.alloc(4 * 1024 * 1024 + 1))).http, 413);
  console.log('PASS sideways real scan and oversized body rejection; compressed reference outcome retained');
  fs.writeFileSync(path.join(out, 'scan-matching-v2-hosted-' + Date.now() + '.json'), JSON.stringify({ at: new Date().toISOString(), origin, database: project.id,
    results, privateDerivativesProcessedInMemory: cases.length + 1, inventoryWrites: 0, storedPhotos: 0 }, null, 2), { flag: 'wx' });
} catch (error) {
  fs.writeFileSync(path.join(out, 'scan-matching-v2-hosted-failure-' + Date.now() + '.json'), JSON.stringify({ at: new Date().toISOString(), origin, results,
    error: error.message, inventoryWrites: 0 }, null, 2), { flag: 'wx' });
  throw error;
} finally { await client.auth.signOut({ scope: 'local' }); }
