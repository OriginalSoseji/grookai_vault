// Read-only exact-parent evidence capture. No database or storage writes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), dir = new URL('./', import.meta.url);
const require = createRequire(`${root}/backend/package.json`);
const config = require('dotenv').parse(fs.readFileSync(`${root}/.env.local`));
const project = 'ycdxbpibncqcchqiihfz';
assert.equal(new URL(config.SUPABASE_URL).hostname, `${project}.supabase.co`);
assert.match(fs.readFileSync(`${root}/supabase/config.toml`, 'utf8'), new RegExp(`project_id\\s*=\\s*"${project}"`));
const dburl = new URL(config.SUPABASE_DB_URL);
assert.ok(`${dburl.hostname} ${decodeURIComponent(dburl.username)}`.includes(project));
const { Client } = require('pg');
const db = new Client({ connectionString: config.SUPABASE_DB_URL, connectionTimeoutMillis: 10000 });
console.log('REMOTE READ ONLY: canonical project');
await db.connect();
try {
  await db.query('begin isolation level repeatable read read only');
  await db.query("set local statement_timeout='60s'");
  const sanity = (await db.query(`select current_setting('transaction_read_only') read_only,
    (select count(*)::int from public.card_prints) parents, (select count(*)::int from public.sets) sets,
    (select count(*)::int from public.card_print_traits) traits`)).rows[0];
  assert.equal(sanity.read_only, 'on'); assert.ok(sanity.parents >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000);
  const rows = async (sql, params) => (await db.query(sql, params)).rows.map(r => r.row);
  const parents = await rows('select to_jsonb(p) row from public.card_prints p where p.id=$1::uuid', ['28b773fa-ed21-47b8-a349-1d03f778c045']);
  assert.equal(parents.length, 1); assert.equal(parents[0].gv_id, 'GV-PK-PR-XY-XY150');
  const ids = parents.map(p => p.id);
  const sets = await rows('select to_jsonb(s) row from public.sets s where id=$1::uuid', [parents[0].set_id]);
  const identities = await rows('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) and is_active order by id', [ids]);
  const traits = await rows('select to_jsonb(t) row from public.card_print_traits t where card_print_id=any($1::uuid[]) order by id', [ids]);
  const mappings = await rows(`with a as (select m.*,count(*) over(partition by source,external_id)::int owners,
    count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
    select to_jsonb(a) row from a where card_print_id=any($1::uuid[]) order by id`, [ids]);
  const raw = (await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
    where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=$1
    order by source,ingested_at desc,id desc`, ['xyp-XY150'])).rows;
  const products = (await db.query('select to_jsonb(p) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_products p where product_id=$1', [121953])).rows;
  const groups = (await db.query('select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g where group_id=$1', [1451])).rows;
  const runIds = [...new Set([...products, ...groups].map(x => x.row.last_seen_run_id))];
  const runs = (await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id', [runIds])).rows;
  const groupSets = (await db.query(`select product.group_id,count(distinct p.set_id)::int set_count,array_agg(distinct p.set_code) set_codes
    from public.tcgcsv_source_products product join public.external_mappings m on m.source='tcgplayer' and m.active and m.external_id=product.product_id::text
    join public.card_prints p on p.id=m.card_print_id where product.group_id=$1 group by 1`, [1451])).rows;
  const result = { version:'XY150_FROZEN_READBACK_V1', captured_at:new Date().toISOString(), project_ref:project, sanity,
    parents, sets, identities, traits, mappings, raw, products, groups, runs, groupSets, provenance:'Database JSONB readback; not original HTTP response bytes.' };
  await db.query('rollback');
  fs.writeFileSync(new URL('xy150-frozen-readback-20261119.json', dir), JSON.stringify(result, null, 2) + '\n', { flag:'wx' });
  console.log(JSON.stringify({rarity:parents[0].rarity, identity_count:identities.length, trait_count:traits.length, mapping_count:mappings.length,
    raw_count:raw.length, product_count:products.length, group_count:groups.length, runs: runs.map(r => ({ status:r.status, sync_mode:r.sync_mode, failed_count:r.failed_count }))}));
} finally { await db.end(); }
