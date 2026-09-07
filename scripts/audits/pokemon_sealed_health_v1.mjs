import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import {pgSslConfig} from './japanese_master_index_v4/read_only_guard_v1.mjs';
import {evaluatePokemonSealedHealthV1} from '../../backend/pricing/pokemon_sealed_health_v1.mjs';
import {classifyPokemonSealedProductV1,pokemonSealedHashV1 as hash} from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(args.out&&args.inventory);
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
const bytes=await fs.readFile(path.join(args.inventory,'source_products.jsonl.gz'));
const manifest=JSON.parse(await fs.readFile(path.join(args.inventory,'artifact_hashes.json'),'utf8'));
assert.equal(hash(bytes),manifest['source_products.jsonl.gz']);
const source=gunzipSync(bytes).toString().trim().split('\n').map(JSON.parse);
const client=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),
  statement_timeout:60000,connectionTimeoutMillis:30000,application_name:'pokemon-sealed-health-read-only-v1'});
await client.connect();
try {
  await client.query('begin isolation level repeatable read read only');
  await client.query(`select set_config('request.jwt.claims','{"role":"authenticated"}',true)`);
  const control=(await client.query(`select r.expected_member_count expected,
    r.source_price_release_id=p.release_id aligned from sealed_product_release_pointer p
    join sealed_product_image_release_pointer ip using(game_key)
    join sealed_product_image_releases r on r.id=ip.image_release_id where p.game_key='pokemon'`)).rows[0];
  const published=[];
  for(let offset=0;offset<10000;offset+=100){
    const rows=(await client.query(`select * from get_active_pokemon_sealed_catalog_v1('pokemon',null,100,$1,null,null)`,[offset])).rows;
    published.push(...rows);if(rows.length<100)break;
  }
  const ages=(await client.query(`select max(current_date-q.observed_on)::integer oldest,
    (select current_date-max(observed_on)::date from tcgcsv_source_sync_runs
     where status='completed' and sync_mode='current_full_sync')::integer source_age
    from sealed_product_release_pointer p join sealed_product_release_members m on m.release_id=p.release_id
    join sealed_product_pricing_lane_qualifications q on q.id=m.qualification_id where p.game_key='pokemon'`)).rows[0];
  const mappings=(await client.query(`select m.source_product_id,m.source_category_id,m.source_payload_hash
    from sealed_product_source_mappings m join sealed_product_variants v on v.id=m.variant_id
    join sealed_product_families f on f.id=v.family_id where f.game_key='pokemon' and m.mapping_status='exact_reviewed'`)).rows;
  const index=new Map(mappings.map(m=>[`${m.source_category_id}:${m.source_product_id}`,m]));
  const newProducts=source.filter(s=>classifyPokemonSealedProductV1(s).classification==='sealed_candidate'&&!index.has(`${s.category_id}:${s.product_id}`));
  const changed=source.filter(s=>{const m=index.get(`${s.category_id}:${s.product_id}`);return m&&m.source_payload_hash!==s.payload_hash;});
  const privilege=(await client.query(`select has_function_privilege('anon',
    'get_active_pokemon_sealed_catalog_v1(text,text,integer,integer,text,text)','EXECUTE') allowed`)).rows[0].allowed;
  await client.query('rollback');
  const result={...evaluatePokemonSealedHealthV1({published:published.length,expected:control?.expected,
    oldestAgeDays:ages.oldest,sourceAgeDays:ages.source_age,newProducts:newProducts.length,
    changedMappings:changed.length,anonymousPrivilege:privilege,pointersAligned:control?.aligned===true}),
    producer_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),generated_at:new Date().toISOString()};
  await fs.mkdir(args.out,{recursive:true});
  const files={'summary.json':JSON.stringify(result,null,2),
    'new_candidates.json':JSON.stringify(newProducts.map(s=>({category_id:s.category_id,product_id:s.product_id,name:s.name,payload_hash:s.payload_hash}))),
    'source_changes.json':JSON.stringify(changed.map(s=>({category_id:s.category_id,product_id:s.product_id,name:s.name,payload_hash:s.payload_hash})))};
  for(const [name,value] of Object.entries(files))await fs.writeFile(path.join(args.out,name),value);
  await fs.writeFile(path.join(args.out,'artifact_hashes.json'),JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(Buffer.from(v))])),null,2));
  console.log(JSON.stringify(result));
}finally{await client.end();}
