import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const sharp = require('sharp');
const root = process.cwd();
const out = process.argv[2];
assert.ok(out, 'Expected artifact directory');
const hash = value => createHash('sha256').update(value).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const base = path.join(root, 'docs/audits/japanese_master_index_v4/sets');
const live = read(path.join(out, 'coverage.sql.result.json')).body[0].evidence.populated_japanese_sets;
const scope = read(path.join(base, 'jpn_official_product_scope_v1.json')).content.products;
const candidates = [];
for (const file of fs.readdirSync(path.join(base, 'raw')).filter(f => /^official_jp_products_.+\.json$/.test(f) && !f.endsWith('.http.json')).sort()) {
  const rawPath = path.join(base, 'raw', file);
  const raw = read(rawPath);
  for (const product of raw.products ?? []) {
    const cardList = new URL(product.link_cardList || '/', 'https://www.pokemon-card.com');
    const sourceId = cardList.searchParams.get('pg');
    if (!sourceId || !product.tumbsImg) continue;
    const entries = scope.filter(p => p.source_set_id === sourceId);
    if (entries.length !== 1) continue;
    const sets = live.filter(s => s.code.toLowerCase() === entries[0].registry_key.toLowerCase());
    if (sets.length !== 1 || sets[0].hero_image_url) continue;
    const url = new URL(product.tumbsImg, 'https://www.pokemon-card.com');
    if (url.protocol !== 'https:' || url.hostname !== 'www.pokemon-card.com' || !url.pathname.startsWith('/products/')) continue;
    candidates.push({ set_id: sets[0].id, code: sets[0].code, source_product_id: sourceId,
      source_url: entries[0].source_url, image_url: url.href,
      raw_file: `docs/audits/japanese_master_index_v4/sets/raw/${file}`, raw_sha256: hash(fs.readFileSync(rawPath)) });
  }
}
const selected = [...new Map(candidates.map(c => [c.set_id, c])).values()].sort((a,b) => a.code.localeCompare(b.code));
assert.ok(selected.length > 0 && selected.length <= 150);
const plan = { version: 'CATALOG_PACKAGE_COVER_ACQUISITION_V1', boundaries: 'local assets only; no DB, Storage, pointers, identity, pricing or deployment writes', selected };
const fingerprint = hash(JSON.stringify(plan));
const planPath = path.join(out, 'package-cover-plan.json');
if (!process.argv.includes('--acquire')) {
  fs.writeFileSync(planPath, JSON.stringify({ ...plan, fingerprint }, null, 2));
  console.log(JSON.stringify({ candidates: selected.length, fingerprint, planPath }));
} else {
  assert.equal(process.argv.find(a => a.startsWith('--fingerprint='))?.slice(14), fingerprint);
  assert.equal(read(planPath).fingerprint, fingerprint);
  const destination = path.join(root, 'apps/web/public/catalog-set-covers');
  fs.mkdirSync(destination, { recursive: true });
  const results = [];
  for (const candidate of selected) {
    try {
      const response = await fetch(candidate.image_url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
      if (response.status === 429) throw new Error('RATE_LIMIT_STOP');
      assert.ok(response.ok, `Source HTTP ${response.status}`);
      assert.ok(Number(response.headers.get('content-length') || 0) <= 8388608, 'Image too large');
      const chunks = []; let length = 0;
      for await (const chunk of response.body) {
        length += chunk.length; assert.ok(length <= 8388608, 'Image too large'); chunks.push(chunk);
      }
      const bytes = Buffer.concat(chunks);
      const info = await sharp(bytes, { limitInputPixels: 40000000 }).metadata();
      assert.ok(['jpeg','png','webp'].includes(info.format) && info.width >= 100 && info.height >= 100, 'Invalid image');
      const sha256 = hash(bytes);
      const filename = `${sha256}.${info.format === 'jpeg' ? 'jpg' : info.format}`;
      const target = path.join(destination, filename);
      if (fs.existsSync(target)) assert.equal(hash(fs.readFileSync(target)), sha256);
      else fs.writeFileSync(target, bytes, { flag: 'wx' });
      assert.equal(hash(fs.readFileSync(target)), sha256);
      results.push({ ...candidate, valid: true, local_url: `/catalog-set-covers/${filename}`, sha256, width: info.width, height: info.height, bytes: length });
    } catch (error) {
      results.push({ ...candidate, valid: false, error: error.message });
      if (error.message === 'RATE_LIMIT_STOP') break;
    }
    fs.writeFileSync(path.join(out, 'package-cover-readback.json'), JSON.stringify({ fingerprint, selected: selected.length, results }, null, 2));
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  fs.writeFileSync(path.join(out, 'package-cover-readback.json'), JSON.stringify({ fingerprint, selected: selected.length, results }, null, 2));
  console.log(JSON.stringify({ selected: selected.length, verified: results.filter(r => r.valid).length, failures: results.filter(r => !r.valid), unattempted: selected.length - results.length }));
}
