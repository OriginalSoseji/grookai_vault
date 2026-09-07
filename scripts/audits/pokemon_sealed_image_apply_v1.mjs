import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import {pokemonSealedHashV1 as hash,POKEMON_SEALED_REVIEWER_ID} from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import {imageReleaseManifestFingerprintV1} from '../../backend/pricing/mtg_sealed_image_release_plan_v1.mjs';
import {insertDataset,exactReadback,writeAttribution} from './mtg_sealed_image_release_rollback_canary_v1.mjs';
import {pgSslConfig} from './japanese_master_index_v4/read_only_guard_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(['canary','apply','readback'].includes(args.mode)&&args.plan&&args.out&&args.fingerprint);
const plan=JSON.parse(gunzipSync(await fs.readFile(args.plan)));
const {fingerprint,...body}=plan;assert.equal(fingerprint,hash(body));assert.equal(fingerprint,args.fingerprint);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),plan.producer_commit);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'');
const tables={evidence:'sealed_product_image_evidence',objects:'sealed_product_image_objects',assertions:'sealed_product_variant_image_assertions',
  releases:'sealed_product_image_releases',release_members:'sealed_product_image_release_members'};
for(const [key,rows] of Object.entries(plan.payload)){
  assert.ok(tables[key]);assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);assert.equal(rows.length,plan.counts[key]);
  assert.ok(rows.every(r=>r.game_key==='pokemon'),'Cross-game payload');
}
const release=plan.payload.releases[0];
assert.equal(plan.payload.releases.length,1);assert.equal(release.expected_member_count,plan.payload.release_members.length);
assert.equal(release.manifest_fingerprint,imageReleaseManifestFingerprintV1(release,plan.payload.release_members));
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
const options={connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),statement_timeout:120000,connectionTimeoutMillis:30000};
async function protectedState(c){
  const state={};for(const table of [...Object.values(tables),'sealed_product_release_pointer','sealed_product_image_release_pointer','sealed_product_game_release_controls']){
    const rows=(await c.query(`select to_jsonb(r) value from public.${table} r where game_key<>'pokemon' order by to_jsonb(r)::text`)).rows;
    state[table]={count:rows.length,hash:hash(rows)};
  }return state;
}
async function verify(c){
  const result={};for(const [name,rows] of Object.entries(plan.payload)){
    const checked=await exactReadback(c,name,rows,name==='releases');
    assert.equal(checked.mismatch_count,0,`Exact ${name} readback mismatch`);
    assert.equal(checked.actual_count,rows.length);result[name]=checked.actual_count;
  }
  assert.equal((await c.query('select public.sealed_product_image_release_manifest_fingerprint_v1($1) value',[release.id])).rows[0].value,release.manifest_fingerprint);
  return result;
}
let c=new pg.Client(options);await c.connect();let committed=false;
try{
  await c.query(args.mode==='readback'?'begin isolation level repeatable read read only':'begin isolation level serializable');
  if(args.mode!=='readback')await c.query("select pg_advisory_xact_lock(hashtext('pokemon-sealed-image-release-v1'))");
  const before=await protectedState(c);
  const price=(await c.query('select game_key,release_state from sealed_product_releases where id=$1',[release.source_price_release_id])).rows[0];
  assert.deepEqual(price,{game_key:'pokemon',release_state:'frozen'});
  const pointers=(await c.query("select to_jsonb(r) value from sealed_product_image_release_pointer r where game_key='pokemon'")).rows;
  const existing=(await c.query('select id from sealed_product_image_releases where id=$1',[release.id])).rowCount;
  if(!existing){
    assert.notEqual(args.mode,'readback','Image release not applied');
    for(const [key,table] of Object.entries(tables))assert.equal((await c.query(`select 1 from public.${table} where id=any($1::uuid[])`,[plan.payload[key].map(r=>r.id)])).rowCount,0,`Collision: ${key}`);
    for(const [name,rows] of Object.entries(plan.payload))await insertDataset(c,name,rows);
    assert.equal((await c.query('select public.sealed_product_image_release_manifest_fingerprint_v1($1) value',[release.id])).rows[0].value,release.manifest_fingerprint);
    await c.query('select public.sealed_product_freeze_image_release_v1($1,$2,$3)',[release.id,release.manifest_fingerprint,POKEMON_SEALED_REVIEWER_ID]);
  }
  const counts=await verify(c),writes=await writeAttribution(c);
  assert.ok(writes.every(r=>Object.values(tables).includes(r.table_name)),'Unexpected table write');
  assert.ok(writes.every(r=>r.deleted===0),'Unexpected deletion');
  assert.deepEqual(await protectedState(c),before,'Protected image state changed');
  assert.deepEqual((await c.query("select to_jsonb(r) value from sealed_product_image_release_pointer r where game_key='pokemon'")).rows,pointers,'Pointer changed during evidence apply');
  if(args.mode==='apply'){await c.query('commit');committed=true;}else await c.query('rollback');
  await c.end();c=new pg.Client(options);await c.connect();
  if(args.mode==='canary'&&!existing){
    for(const [key,table] of Object.entries(tables))assert.equal((await c.query(`select 1 from public.${table} where id=any($1::uuid[])`,[plan.payload[key].map(r=>r.id)])).rowCount,0,'Rollback residue');
  }else await verify(c);
  const summary={version:plan.version,mode:args.mode,committed,inserted:committed&&!existing?Object.values(counts).reduce((a,b)=>a+b,0):0,
    counts,fingerprint,producer_commit:plan.producer_commit,protected_state:'unchanged',pointer_writes:0,storage_writes:0,
    independent_readback:true,status:'passed',timestamp:new Date().toISOString(),write_attribution:writes};
  await fs.mkdir(args.out,{recursive:true});await fs.writeFile(path.join(args.out,`${args.mode}.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
}catch(error){if(!committed)await c.query('rollback').catch(()=>{});await fs.mkdir(args.out,{recursive:true});
  await fs.writeFile(path.join(args.out,'failure.json'),JSON.stringify({committed,message:error.message}));throw error;
}finally{await c.end();}
