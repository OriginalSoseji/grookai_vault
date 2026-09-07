import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import pg from 'pg';
import {pokemonSealedHashV1 as hash} from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import {stripSealedMigrationTransactionWrapperV1} from '../../backend/pricing/mtg_sealed_image_schema_apply_v1.mjs';
import {pgSslConfig} from './japanese_master_index_v4/read_only_guard_v1.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const i=a.indexOf('=');return[a.slice(2,i),a.slice(i+1)];}));
assert.ok(['plan','canary','apply','readback'].includes(args.mode)&&args.out,'--mode --out required');
const filters=args['catalog-filters']==='true';
const version=filters?'20260907070000':'20260907060000';
const filename=filters?`${version}_pokemon_sealed_catalog_filters_v1.sql`:`${version}_pokemon_sealed_production_foundation_v1.sql`;
const sql=await fs.readFile(path.join('supabase','migrations',filename),'utf8');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'','Tracked tree dirty');
const functions=filters?['get_active_pokemon_sealed_catalog_v1']:['get_active_pokemon_sealed_pricing_v1','pokemon_sealed_image_object_signing_authorized_v1'];
async function definitions(client,names){return(await client.query(`select p.proname,pg_get_functiondef(p.oid) definition,p.proacl::text acl
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1::text[]) order by p.proname`,[names])).rows;}
async function sealedBoundary(client){
  const routines=(await client.query(`select p.proname,pg_get_functiondef(p.oid) definition,p.proacl::text acl
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and
    p.proname like '%sealed%' and not(p.proname=any($1::text[])) order by p.oid::regprocedure::text`,[functions])).rows;
  const tables=(await client.query(`select tablename from pg_tables where schemaname='public' and tablename like 'sealed_product_%' order by tablename`)).rows;
  const data={};
  for(const {tablename} of tables){
    const rows=(await client.query(`select to_jsonb(r) value from public.${tablename} r`)).rows.map(r=>r.value)
      .filter(r=>tablename!=='sealed_product_game_release_controls'||r.game_key!=='pokemon');
    rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    data[tablename]={count:rows.length,hash:hash(rows)};
  }
  return {routines_hash:hash(routines),tables:data};
}
dotenv.config({path:args.env??'C:/grookai_vault/.env.local',override:true,quiet:true});
assert.equal(new URL(process.env.SUPABASE_URL).hostname,'ycdxbpibncqcchqiihfz.supabase.co');
const local=new pg.Client({connectionString:args.local??'postgresql://postgres:postgres@127.0.0.1:54322/postgres'});
await local.connect();
const localDefinitions=await definitions(local,functions);
assert.equal(localDefinitions.length,functions.length,'Local replay is missing Pokemon functions');
assert.equal((await local.query('select version from supabase_migrations.schema_migrations where version=$1',[version])).rowCount,1,'Local migration replay absent');
await local.end();
const c=new pg.Client({connectionString:process.env.SUPABASE_DB_URL,ssl:pgSslConfig(process.env.SUPABASE_DB_URL),statement_timeout:120000,connectionTimeoutMillis:30000});
await c.connect();
let committed=false;
try{
  await c.query(args.mode==='plan'||args.mode==='readback'?'begin isolation level repeatable read read only':'begin isolation level serializable');
  const before=await sealedBoundary(c);
  const ledger=(await c.query('select version,name,statements from supabase_migrations.schema_migrations order by version')).rows;
  const files=(await fs.readdir('supabase/migrations')).filter(f=>/^\d+_.+\.sql$/.test(f));
  const versions=files.map(f=>f.split('_')[0]);
  assert.equal(new Set(versions).size,versions.length,'Duplicate repository migration versions');
  assert.equal(ledger.filter(r=>!versions.includes(r.version)).length,0,'Remote-only migration');
  const allowedPending=['20260905120000',version];
  const pending=versions.filter(v=>!ledger.some(r=>r.version===v));
  assert.ok(pending.every(v=>allowedPending.includes(v)),'Unexpected pending migration');
  const body={version:'POKEMON_SEALED_SCHEMA_EXECUTION_V1',producer_commit:head,migration:filename,
    migration_sha256:hash(Buffer.from(sql)),local_definitions_hash:hash(localDefinitions),pending,
    protected_boundary:before,ledger_hash:hash(ledger),scope:filters?'one migration, one bounded Pokemon catalog RPC':'one migration, nullable manufacturer, hidden Pokemon control, two new RPCs'};
  const plan={...body,fingerprint:hash(body)};
  if(args.mode==='plan'){
    await c.query('rollback');await fs.mkdir(args.out,{recursive:true});
    await fs.writeFile(path.join(args.out,'run_plan.json'),JSON.stringify(plan,null,2));
    console.log(JSON.stringify({fingerprint:plan.fingerprint,migration_sha256:body.migration_sha256,pending}));
  }else{
    const frozen=JSON.parse(await fs.readFile(path.join(args.out,'run_plan.json'),'utf8'));
    assert.equal(frozen.fingerprint,args.fingerprint);
    assert.equal(frozen.producer_commit,head);assert.equal(frozen.migration_sha256,body.migration_sha256);
    assert.equal(frozen.local_definitions_hash,body.local_definitions_hash);
    const existing=ledger.find(r=>r.version===version);
    if(!existing){
      assert.notEqual(args.mode,'readback','Migration not applied');
      assert.equal(hash(ledger),frozen.ledger_hash,'Ledger drift');
      assert.deepEqual(before,frozen.protected_boundary,'Sealed state drift');
      assert.equal((await definitions(c,functions)).length,0,'Function collision');
      if(!filters)assert.equal((await c.query("select 1 from sealed_product_game_release_controls where game_key='pokemon'")).rowCount,0,'Control collision');
      await c.query("set local lock_timeout='5s'");
      await c.query(stripSealedMigrationTransactionWrapperV1(sql));
      await c.query('insert into supabase_migrations.schema_migrations(version,name,statements) values($1,$2,$3::text[])',
        [version,filename.slice(15,-4),[sql]]);
    }else assert.deepEqual(existing.statements,[sql],'Applied migration payload mismatch');
    assert.deepEqual(await definitions(c,functions),localDefinitions,'Production/local function parity failure');
    assert.equal((await c.query("select is_nullable from information_schema.columns where table_schema='public' and table_name='sealed_product_families' and column_name='manufacturer_name'")).rows[0].is_nullable,'YES');
    assert.equal((await c.query("select release_status from sealed_product_game_release_controls where game_key='pokemon'")).rows[0].release_status,'hidden');
    assert.deepEqual(await sealedBoundary(c),before,'Protected sealed data or routines changed');
    if(args.mode==='apply'){await c.query('commit');committed=true;}else await c.query('rollback');
    if(args.mode==='canary')assert.equal((await c.query('select 1 from supabase_migrations.schema_migrations where version=$1',[version])).rowCount,0,'Canary rollback residue');
    const summary={mode:args.mode,status:'passed',committed,rows_written:committed&&!existing?(filters?1:2):0,
      fingerprint:frozen.fingerprint,migration_sha256:body.migration_sha256,producer_commit:head,
      exact_function_parity:true,protected_sealed_state:'unchanged',timestamp:new Date().toISOString()};
    await fs.writeFile(path.join(args.out,`${args.mode}.json`),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
  }
}catch(error){if(!committed)await c.query('rollback').catch(()=>{});throw error;}finally{await c.end();}
