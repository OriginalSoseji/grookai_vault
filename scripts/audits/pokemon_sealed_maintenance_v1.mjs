import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';
import { inspectMtgSealedImageBytesV1 } from '../../backend/pricing/mtg_sealed_image_coverage_v1.mjs';
import { validatePokemonSealedImageRetryV1, comparePokemonSealedSourcePriceV1,
  buildPokemonSealedAgingDetailV1, createPokemonSealedSourceCircuitV1 } from '../../backend/pricing/pokemon_sealed_maintenance_v1.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const i = a.indexOf('='); assert.ok(i > 2); return [a.slice(2, i), a.slice(i + 1)];
}));
assert.ok(args.images && args.out);
assert.ok(process.execArgv.includes('--use-system-ca') && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0');
dotenv.config({ path: args.env ?? 'C:/grookai_vault/.env.local', quiet: true, override: true });
assert.equal(new URL(process.env.SUPABASE_URL).hostname, 'ycdxbpibncqcchqiihfz.supabase.co');
const hash = b => createHash('sha256').update(b).digest('hex');
const inputBytes = await fs.readFile(args.images);
const retries = JSON.parse(inputBytes).filter(r => r.status === 'excluded');
assert.ok(retries.length > 0 && retries.length <= 50);
assert.equal(new Set(retries.map(r => r.variant_id)).size, retries.length);
for (const r of retries) validatePokemonSealedImageRetryV1(r);
const c = new pg.Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: pgSslConfig(process.env.SUPABASE_DB_URL),
  statement_timeout: 60000, connectionTimeoutMillis: 30000, application_name: 'pokemon-sealed-maintenance-read-only-v1' });
await c.connect();
let aging, imageRows, sanity;
try {
  await c.query('begin isolation level repeatable read read only');
  sanity = (await c.query(`select (select count(*) from card_prints)::integer cards,
    (select count(*) from sets)::integer sets,(select count(*) from card_print_traits)::integer traits`)).rows[0];
  assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000);
  aging = buildPokemonSealedAgingDetailV1((await c.query(`select v.id::text variant_id,v.canonical_name,
    m.source_product_id::integer,s.category_id::integer,s.group_id::integer,q.observed_on::text,
    current_date-q.observed_on age_days,q.qualification_evidence#>>'{observation,market_price}' market_price
    from sealed_product_release_pointer p join sealed_product_release_members rm on rm.release_id=p.release_id
    join sealed_product_pricing_lane_qualifications q on q.id=rm.qualification_id
    join sealed_product_source_mappings m on m.id=q.source_mapping_id
    join sealed_product_variants v on v.id=q.variant_id
    join tcgcsv_source_products s on s.product_id=m.source_product_id and s.category_id=m.source_category_id
    where p.game_key='pokemon' and current_date-q.observed_on>=4 order by v.id`)).rows);
  assert.ok(aging.length <= 120, 'Maintenance price population exceeds bounded audit');
  imageRows = (await c.query(`select product_id::integer,category_id::integer,name,payload_hash,source_active
    from tcgcsv_source_products where product_id=any($1::bigint[]) and category_id in (3,85)`,
  [retries.map(r => r.source_product_id)])).rows;
  assert.equal(imageRows.length, retries.length);
  for (const row of retries) {
    const s = imageRows.find(s => s.product_id === row.source_product_id);
    assert.ok(s?.source_active && s.payload_hash === row.source_payload_hash, 'Image source identity drift');
  }
  await c.query('rollback');
} finally { await c.end(); }
const groups = [...new Set(aging.map(r => `${r.category_id}/${r.group_id}`))].sort();
assert.ok(groups.length <= 32);
for (const group of groups) assert.match(group, /^(3|85)\/[1-9][0-9]*$/);
const plan = { version: 'POKEMON_SEALED_MAINTENANCE_V1', producer_commit: execFileSync('git', ['rev-parse','HEAD'], {encoding:'utf8'}).trim(),
  operator_sha256: hash(await fs.readFile(new URL(import.meta.url))), source_results_sha256: hash(inputBytes),
  database_sanity: sanity, aging_prices: aging, image_retries: retries, price_groups: groups,
  max_requests: groups.length + retries.reduce((n,r) => n + r.urls.length, 0),
  attempts_per_url: 1, concurrency: 4, stop_origin_on_status:[401,403,429], database_writes: 0, storage_writes: 0, generated_at: new Date().toISOString() };
await fs.mkdir(args.out, { recursive: true });
await fs.writeFile(path.join(args.out, 'run_plan.json'), JSON.stringify(plan, null, 2), { flag: 'wx' });
await fs.mkdir(path.join(args.out, 'source'), { recursive: true });
await fs.mkdir(path.join(args.out, 'bytes'), { recursive: true });
let requests = 0;
const circuit = createPokemonSealedSourceCircuitV1();
async function get(url) {
  const blocked = circuit.status(url);
  if (blocked) return {status:blocked,skipped:'origin_circuit_open'};
  assert.ok(++requests <= plan.max_requests);
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(25000) });
  circuit.observe(url,response.status);
  if (!response.ok) { await response.body?.cancel(); return { status: response.status }; }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; assert.ok(size <= 12000000); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks);
  return { status: response.status, bytes, sha256: hash(bytes), type: response.headers.get('content-type') };
}
async function pool(items, action) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({length:Math.min(4, items.length)}, async () => {
    while (next < items.length) { const i = next++; results[i] = await action(items[i]); }
  })); return results;
}
const prices = await pool(groups, async group => {
  const url = `https://tcgcsv.com/tcgplayer/${group}/prices`;
  const groupRows = aging.filter(a => `${a.category_id}/${a.group_id}` === group);
  const unavailableRows = () => groupRows.map(row => ({...row,disposition:'source_unavailable'}));
  try {
    const r = await get(url);
    if (r.status !== 200) return {group,url,status:r.status,skipped:r.skipped??null,disposition:'source_unavailable',rows:unavailableRows()};
    const payload = JSON.parse(r.bytes);
    await fs.writeFile(path.join(args.out, 'source', `${group.replace('/','-')}-prices.json`), r.bytes, {flag:'wx'});
    return {group,url,status:r.status,sha256:r.sha256,rows:groupRows
      .map(row => ({...row,...comparePokemonSealedSourcePriceV1(row,payload)}))};
  } catch (error) { return {group,url,disposition:'source_unavailable',error:error.message,rows:unavailableRows()}; }
});
const images = await pool(retries, async row => {
  const attempts = [];
  for (const url of row.urls) {
    try {
      const r = await get(url); attempts.push({url,status:r.status,skipped:r.skipped??null});
      if (r.status !== 200) continue;
      const image = inspectMtgSealedImageBytesV1(r.bytes,r.type);
      if (!image.valid_image || image.placeholder_suspected) { attempts.at(-1).diagnostics = image.diagnostics; continue; }
      const filename = `${image.sha256}.${image.format === 'jpeg' ? 'jpg' : image.format}`;
      await fs.writeFile(path.join(args.out, 'bytes', filename),r.bytes);
      return {...row,name:imageRows.find(s => s.product_id===row.source_product_id).name,
        status:'recovered_local_candidate',source_image_url:url,image,local_filename:filename,attempts};
    } catch (error) { attempts.push({url,error:error.message}); }
  }
  return {...row,name:imageRows.find(s => s.product_id===row.source_product_id).name,status:'still_unavailable',attempts};
});
const count = rows => rows.reduce((a,r) => {a[r.disposition]=(a[r.disposition]??0)+1;return a;}, {});
const summary = {version:plan.version,requests,aging_products:aging.length,
  price_dispositions:count(prices.flatMap(p=>p.rows??[p])),image_retries:images.length,
  images_recovered:images.filter(r=>r.status==='recovered_local_candidate').length,
  images_unavailable:images.filter(r=>r.status==='still_unavailable').length,
  database_writes:0,storage_writes:0,publication_changes:0,finished_at:new Date().toISOString()};
const report = ['# Pokemon Sealed Source Maintenance', '', `Source requests: ${requests}. Database/Storage/publication writes: 0.`, '',
  '## Aging Prices', '', '| Product | Age (days) | Current source result |', '| --- | ---: | --- |',
  ...prices.flatMap(p => p.rows ? p.rows.map(r=>`| ${r.canonical_name.replaceAll('|','/')} | ${r.age_days} | ${r.disposition} |`)
    : [`| Source group ${p.group} | - | ${p.disposition} |`]), '', '## Image Gaps', '',
  '| Product | Product ID | Result |', '| --- | --- | --- |',
  ...images.map(r=>`| ${r.name.replaceAll('|','/')} | ${r.source_product_id} | ${r.status} |`), '',
  'Recovered bytes are candidates only, not uploaded or published. Missing evidence cannot authorize substitute prices or images.',''].join('\n');
const files = {'summary.json':JSON.stringify(summary,null,2),'price_results.json':JSON.stringify(prices,null,2),
  'image_results.json':JSON.stringify(images,null,2),'MAINTENANCE_REPORT.md':report};
for (const [name,value] of Object.entries(files)) await fs.writeFile(path.join(args.out,name),value,{flag:'wx'});
await fs.writeFile(path.join(args.out,'artifact_hashes.json'),JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),null,2),{flag:'wx'});
console.log(JSON.stringify(summary));
