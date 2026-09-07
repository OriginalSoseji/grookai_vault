import fs from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import { validatePokemonSealedWorldPlanV1,pokemonSealedHashV1,POKEMON_SEALED_REVIEWER_ID } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { insertSealedWorldPlanV1 } from '../../backend/pricing/sealed_world_writer_v1.mjs';
import { pgSslConfig } from './japanese_master_index_v4/read_only_guard_v1.mjs';

const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const i=arg.indexOf('=');return [arg.slice(2,i),arg.slice(i+1)];}));
if(!['preflight','canary','apply','readback'].includes(args.mode)||!args.plan||!args.out||!args.fingerprint)
  throw new Error('--mode, --plan, --out, --fingerprint required');
const plan=JSON.parse(gunzipSync(await fs.readFile(args.plan)));
assert.equal(validatePokemonSealedWorldPlanV1(plan).valid,true,'Invalid plan');
assert.equal(plan.plan_fingerprint_sha256,args.fingerprint,'Wrong frozen fingerprint');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(head,plan.producer_commit,'Producer commit drift');
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Tracked worktree dirty');
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),
  connectionTimeoutMillis:30000,statement_timeout:120000,application_name:`pokemon-sealed-${args.mode}-v1`});
const tables={candidates:'sealed_product_candidates',families:'sealed_product_families',variants:'sealed_product_variants',
  reviews:'sealed_product_candidate_reviews',mappings:'sealed_product_source_mappings',evidence:'sealed_product_variant_evidence',
  qualifications:'sealed_product_pricing_lane_qualifications',releases:'sealed_product_releases',members:'sealed_product_release_members'};
function comparable(value){
  if(value instanceof Date) return value.toISOString();
  if(Array.isArray(value)) return value.map(comparable);
  if(value&&typeof value==='object') return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,comparable(v)]));
  return value;
}
async function verify(client){
  const counts={};
  for(const [key,table] of Object.entries(tables)){
    const expected=plan.payload[key];
    const actual=(await client.query(`select to_jsonb(row) value from public.${table} row where id=any($1::uuid[])`,[expected.map(r=>r.id)])).rows.map(r=>r.value);
    counts[key]=actual.length;
    assert.equal(actual.length,expected.length,`Readback count: ${key}`);
    const byId=new Map(actual.map(row=>[row.id,row]));
    for(const row of expected){
      const found=byId.get(row.id);
      for(const [field,want] of Object.entries(row)){
        if(key==='releases'&&field==='release_state'){assert.equal(found[field],'frozen');continue;}
        if(typeof want==='number'){assert.equal(Number(found[field]),want,`${key}.${field}`);continue;}
        assert.deepEqual(comparable(found[field]),comparable(want),`${key}.${field}:${row.id}`);
      }
    }
  }
  return counts;
}
async function protectedState(client){
  const result={};
  // Hash every existing non-Pokemon sealed record, including pointers and controls.
  for(const table of [...Object.values(tables),'sealed_product_release_pointer','sealed_product_game_release_controls',
    'sealed_product_image_releases','sealed_product_image_release_pointer']){
    const rows=(await client.query(`select to_jsonb(row) value from public.${table} row`)).rows.map(r=>r.value)
      .filter(row=>row.game_key!=='pokemon'&&!plan.payload[Object.keys(tables).find(k=>tables[k]===table)]?.some(p=>p.id===row.id));
    rows.sort((a,b)=>String(a.id??a.game_key).localeCompare(String(b.id??b.game_key)));
    result[table]={count:rows.length,hash:pokemonSealedHashV1(rows)};
  }
  return result;
}
await c.connect();
let committed=false;
try {
  await c.query(args.mode==='readback'||args.mode==='preflight'?'begin isolation level repeatable read read only':'begin isolation level serializable');
  if(['canary','apply'].includes(args.mode)) await c.query("select pg_advisory_xact_lock(hashtext('pokemon-sealed-world-v1'))");
  const current=(await c.query('select product_id,payload_hash,source_active from tcgcsv_source_products where product_id=any($1::bigint[])',
    [plan.payload.candidates.map(r=>r.source_product_id)])).rows;
  assert.equal(current.length,plan.payload.candidates.length,'Source count drift');
  const sourceMap=new Map(current.map(row=>[Number(row.product_id),row]));
  for(const row of plan.payload.candidates){assert.equal(sourceMap.get(row.source_product_id)?.payload_hash,row.source_payload_hash,'Source hash drift');assert.equal(sourceMap.get(row.source_product_id)?.source_active,true);}
  const mappingById=new Map(plan.payload.mappings.map(row=>[row.id,row]));
  for(let offset=0;offset<plan.payload.qualifications.length;offset+=100){
    const batch=plan.payload.qualifications.slice(offset,offset+100);
    const observations=(await c.query(`select source_price_row_identity,observed_on::text,payload_hash,market_price,currency
      from public.tcgcsv_source_price_daily_observations
      where product_id=any($1::bigint[]) and source_price_row_identity=any($2::text[])`,
      [batch.map(q=>mappingById.get(q.source_mapping_id).source_product_id),batch.map(q=>q.source_price_row_identity)])).rows;
    for(const q of batch){
      const matches=observations.filter(o=>o.source_price_row_identity===q.source_price_row_identity&&o.observed_on===q.observed_on);
      assert.equal(matches.length,1,'Exact price observation missing or duplicated');
      assert.equal(matches[0].payload_hash,q.source_observation_fingerprint,'Price evidence drift');
      assert.equal(matches[0].currency,q.currency,'Price currency drift');
      const expected=q.qualification_evidence.observation.market_price;
      assert.equal(matches[0].market_price===null?null:Number(matches[0].market_price),expected,'Price value drift');
      if(q.qualification_status==='qualified_exact'){
        const day=new Date().toISOString().slice(0,10);
        assert.ok(q.observed_on<=day&&Date.parse(day)-Date.parse(q.observed_on)<=7*86400000,'Price expired before apply');
      }
    }
  }
  const control=(await c.query("select release_status from sealed_product_game_release_controls where game_key='pokemon'")).rows[0];
  assert.equal(control?.release_status,'hidden','Initial apply requires hidden Pokemon lane');
  const before=await protectedState(c);
  const ids=(await c.query('select id from sealed_product_releases where id=$1',[plan.payload.releases[0].id])).rows;
  let written=0;
  let counts;
  if(ids.length){counts=await verify(c);}
  else if(args.mode==='readback'){throw new Error('Release not applied');}
  else {
    for(const [key,table] of Object.entries(tables)){
      const n=Number((await c.query(`select count(*) from public.${table} where id=any($1::uuid[])`,[plan.payload[key].map(row=>row.id)])).rows[0].count);
      assert.equal(n,0,`Collision in ${key}`);
    }
    const collisions=Number((await c.query(`select count(*) from sealed_product_source_mappings
      where source_provider='tcgplayer' and source_product_id=any($1::bigint[])`,[plan.payload.mappings.map(r=>r.source_product_id)])).rows[0].count);
    assert.equal(collisions,0,'Existing mapping owns source product');
    if(['canary','apply'].includes(args.mode)){
      await insertSealedWorldPlanV1(c,plan,{reviewerId:POKEMON_SEALED_REVIEWER_ID,activate:false});
      counts=await verify(c);
      written=Object.values(counts).reduce((a,b)=>a+b,0);
    }
  }
  assert.deepEqual(await protectedState(c),before,'Protected sealed state changed');
  if(args.mode==='apply'){await c.query('commit');committed=true;counts=await verify(c);}
  else await c.query('rollback');
  if(args.mode==='canary') for(const [key,table] of Object.entries(tables)){
    assert.equal(Number((await c.query(`select count(*) from public.${table} where id=any($1::uuid[])`,[plan.payload[key].map(row=>row.id)])).rows[0].count),0,'Rollback residue');
  }
  const summary={version:plan.version,mode:args.mode,producer_commit:head,plan_fingerprint:args.fingerprint,
    committed,rows_written:committed?written:0,transaction_rows_tested:written,counts,
    status:'passed',protected_state:before,readback:'exact',timestamp:new Date().toISOString()};
  await fs.mkdir(args.out,{recursive:true});
  await fs.writeFile(path.join(args.out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(JSON.stringify({...summary,protected_state:'unchanged'},null,2));
} catch(error){
  if(!committed) await c.query('rollback').catch(()=>{});
  await fs.mkdir(args.out,{recursive:true});
  await fs.writeFile(path.join(args.out,'failure.json'),JSON.stringify({committed,error:error.message,at:new Date().toISOString()},null,2));
  throw error;
} finally {await c.end();}
