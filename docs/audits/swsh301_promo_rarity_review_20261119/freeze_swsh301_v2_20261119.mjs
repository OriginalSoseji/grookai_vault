// Read-only evidence capture for Lugia V SWSH301; no writes or image claims.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..'),require=createRequire(`${root}/backend/package.json`),config=require('dotenv').parse(fs.readFileSync(`${root}/.env.local`));
const ref='ycdxbpibncqcchqiihfz',url=new URL(config.SUPABASE_DB_URL),id='af831a08-6e93-4e7a-8e8b-1b02d38c9ff1';
assert.equal(new URL(config.SUPABASE_URL).hostname,`${ref}.supabase.co`);assert.ok(`${url.hostname} ${decodeURIComponent(url.username)}`.includes(ref));
assert.match(fs.readFileSync(`${root}/supabase/config.toml`,'utf8'),new RegExp(`project_id\\s*=\\s*"${ref}"`));
const {Client}=require('pg'),db=new Client({connectionString:config.SUPABASE_DB_URL,connectionTimeoutMillis:10000});
console.log('REMOTE READ ONLY: canonical project');await db.connect();
try{
 await db.query('begin isolation level repeatable read read only');await db.query("set local statement_timeout='60s'");
 const sanity=(await db.query(`select current_setting('transaction_read_only') read_only,(select count(*)::int from public.card_prints) parents,
  (select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
 assert.equal(sanity.read_only,'on');assert.ok(sanity.parents>=40000&&sanity.sets>=150&&sanity.traits>=5000);
 const rows=async(sql,args)=>(await db.query(sql,args)).rows.map(x=>x.row);
 const parents=await rows('select to_jsonb(p) row from public.card_prints p where id=$1::uuid',[id]);
 assert.equal(parents.length,1);assert.equal(parents[0].gv_id,'GV-PK-PR-SW-SWSH301');
 const sets=await rows('select to_jsonb(s) row from public.sets s where id=$1::uuid',[parents[0].set_id]);
 const identities=await rows('select to_jsonb(i) row from public.card_print_identity i where card_print_id=$1::uuid and is_active order by id',[id]);
 const traits=await rows('select to_jsonb(t) row from public.card_print_traits t where card_print_id=$1::uuid order by id',[id]);
 const printings=await rows('select to_jsonb(p) row from public.card_printings p where card_print_id=$1::uuid order by id',[id]);
 const mappings=await rows(`with a as(select m.*,count(*) over(partition by source,external_id)::int owners,
  count(*) over(partition by source,card_print_id)::int parent_mappings from public.external_mappings m where active)
  select to_jsonb(a) row from a where card_print_id=$1::uuid order by id`,[id]);
 const raw=(await db.query(`select id::text,source,status,ingested_at,md5(payload::text) payload_md5,payload from public.raw_imports
  where source in ('tcgdex','pokemonapi') and coalesce(payload->>'_external_id',payload->'card'->>'id',payload->>'id')=$1 order by source,ingested_at desc,id desc`,['swshp-SWSH301'])).rows;
 const products=(await db.query('select to_jsonb(p) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_products p where product_id=$1',[505996])).rows;
 const groups=(await db.query('select to_jsonb(g) row,md5(raw_payload::text) raw_md5 from public.tcgcsv_source_groups g where group_id=$1',[2545])).rows;
 const runIds=[...new Set([...products,...groups].map(x=>x.row.last_seen_run_id).filter(Boolean))];
 const runs=(await db.query('select id,status,sync_mode,failed_count,started_at,finished_at from public.tcgcsv_source_sync_runs where id=any($1::uuid[]) order by id',[runIds])).rows;
 const groupSets=(await db.query(`select product.group_id,count(distinct p.set_id)::int set_count,array_agg(distinct p.set_code) set_codes
  from public.tcgcsv_source_products product join public.external_mappings m on m.source='tcgplayer' and m.active and m.external_id=product.product_id::text
  join public.card_prints p on p.id=m.card_print_id where product.group_id=$1 group by 1`,[2545])).rows;
 const result={version:'SWSH301_SOURCE_REVIEW_V2',captured_at:new Date().toISOString(),project_ref:ref,sanity,parents,sets,identities,traits,printings,mappings,raw,products,groups,runs,groupSets,
  provenance:'Read-only database JSONB serialization, not original HTTP bytes. Representative catalog image is not proof of exact parent artwork.'};
 await db.query('rollback');fs.writeFileSync(new URL('swsh301-frozen-readback-v2-20261119.json',import.meta.url),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({rarity:parents[0].rarity,image_status:parents[0].image_status,identities:identities.length,traits:traits.length,printings:printings.length,mappings:mappings.length,raw:raw.length,products:products.length,groups:groups.length,groupSets,runs:runs.map(r=>({status:r.status,failed_count:r.failed_count}))}));
}finally{await db.end();}
