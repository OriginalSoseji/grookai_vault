// Freeze exact suffix records and provider candidates under a read-only snapshot.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'), require=createRequire(`${root}/backend/package.json`);
const config=require('dotenv').parse(fs.readFileSync(`${root}/.env.local`));
const ref='ycdxbpibncqcchqiihfz',url=new URL(config.SUPABASE_DB_URL);
assert.equal(new URL(config.SUPABASE_URL).hostname,`${ref}.supabase.co`);
assert.ok(`${url.hostname} ${decodeURIComponent(url.username)}`.includes(ref));
assert.match(fs.readFileSync(`${root}/supabase/config.toml`,'utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const {Client}=require('pg'),db=new Client({connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000});
console.log('REMOTE READ ONLY: canonical project');await db.connect();
try {
 await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='60s'");
 const sanity=(await db.query(`select current_setting('transaction_read_only') read_only,
  (select count(*)::int from public.card_prints) parents,(select count(*)::int from public.sets) sets,
  (select count(*)::int from public.card_print_traits) traits`)).rows[0];
 assert.equal(sanity.read_only,'on');assert.ok(sanity.parents>=40000&&sanity.sets>=150&&sanity.traits>=5000);
 const rows=async(sql,args)=>(await db.query(sql,args)).rows.map(r=>r.row);
 const ids=['2928d70e-b3ff-4c8e-914f-a361cff27396','46b9dcd9-3f90-4770-890e-6817eed4d388'];
 const parents=await rows('select to_jsonb(p) row from public.card_prints p where id=any($1::uuid[]) order by gv_id',[ids]);
 assert.equal(parents.length,2);assert.deepEqual(parents.map(p=>p.gv_id),['GV-PK-PR-XY-XY200A','GV-PK-PR-XY-XY67A']);
 const sets=await rows('select to_jsonb(s) row from public.sets s where id=any($1::uuid[]) order by id',[[...new Set(parents.map(p=>p.set_id))]]);
 const identities=await rows('select to_jsonb(i) row from public.card_print_identity i where card_print_id=any($1::uuid[]) and is_active order by id',[ids]);
 const traits=await rows('select to_jsonb(t) row from public.card_print_traits t where card_print_id=any($1::uuid[]) order by id',[ids]);
 const mappings=await rows(`with a as(select m.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
  select to_jsonb(a) row from a where card_print_id=any($1::uuid[]) order by id`,[ids]);
 const raw=(await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
  where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=any($1::text[])
  order by source,ingested_at desc,id desc`,[['xyp-XY67a','xyp-XY200a']])).rows;
 const products=(await db.query(`select to_jsonb(p) row,md5(p.raw_payload::text) raw_md5,
  coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from public.external_mappings m where m.source='tcgplayer' and m.active and m.external_id=p.product_id::text),'[]'::jsonb) active_mappings
  from public.tcgcsv_source_products p where p.category_id=3 and exists (select 1 from jsonb_array_elements(coalesce(p.extended_data,'[]'::jsonb)) x
  where x->>'name'='Number' and lower(x->>'value')=any($1::text[])) order by p.product_id`,[['xy67a','xy200a']])).rows;
 const groups=(await db.query('select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g where group_id=$1',[1938])).rows;
 const runIds=[...new Set([...products,...groups].map(x=>x.row.last_seen_run_id).filter(Boolean))];
 const runs=(await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows;
 const result={version:'XY_SUFFIX_RARITY_FROZEN_READBACK_V1',captured_at:new Date().toISOString(),project_ref:ref,sanity,parents,sets,identities,traits,mappings,raw,products,groups,runs,
  provenance:'Read-only database JSONB serialization; candidate discovery only, no mapping authority.'};
 await db.query('rollback');fs.writeFileSync(new URL('xy-suffix-rarity-frozen-20261119.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({parents:parents.map(p=>({gv_id:p.gv_id,rarity:p.rarity})),identities:identities.length,traits:traits.length,mappings:mappings.length,
  raw:raw.length,products:products.map(p=>({id:p.row.product_id,active_mappings:p.active_mappings.length})),groups:groups.length,runs:runs.map(r=>({status:r.status,failed_count:r.failed_count}))}));
} finally {await db.end();}
