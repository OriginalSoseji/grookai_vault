// Fixed, unlinked synthetic laboratory only. No owner environment is loaded.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import pg from 'pg';
export const root='C:/grookai_stamp_completion_20261122';
export const base='C:/grookai_vault_operator_artifacts/stamp_price_completion_20261122';
export const lab=base+'/fresh-513',project='stamp-fresh513-20261122';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
export function guard(){
  assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
  const docker=a=>JSON.parse(execFileSync('docker',a,{encoding:'utf8',windowsHide:true}));
  const info=docker(['inspect','supabase_db_'+project])[0];
  assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
  assert.equal(docker(['network','inspect',project])[0].Internal,true);
  for(const bindings of Object.values(docker(['inspect',project+'-relay'])[0].NetworkSettings.Ports))
    for(const binding of bindings)assert.equal(binding.HostIp,'127.0.0.1');
  assert.equal(read(lab+'/replay-proof.json').pass,true);
  return info;
}
export function client(database='postgres'){
  assert.ok(['postgres','tcg_search_retained_513'].includes(database));
  return new pg.Client({host:'127.0.0.1',port:55240,user:'postgres',password:'postgres',database,
    connectionTimeoutMillis:15000,statement_timeout:120000,query_timeout:125000,
    application_name:'cross_tcg_search_synthetic_local_v1'});
}
export async function state(c){return(await c.query("select jsonb_build_object('ledger',(select count(*) from supabase_migrations.schema_migrations),'cards',(select count(*) from public.card_prints),'users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'workers',current_setting('max_worker_processes')) value")).rows[0].value;}
export async function fingerprints(c){
  const rows=(await c.query("select schemaname,tablename from pg_tables where schemaname in('public','grookai_square','grookai_inventory','grookai_vendor_pricing','auth') order by schemaname,tablename")).rows,out={};
  for(const row of rows){
    assert.match(row.schemaname,/^[a-z_]+$/);assert.match(row.tablename,/^[a-z0-9_]+$/);
    out[row.schemaname+'.'+row.tablename]=(await c.query(`select count(*)::integer count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) digest from "${row.schemaname}"."${row.tablename}" t`)).rows[0];
  }
  return out;
}
export function cli(database,out,label){
  const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|^PG/.test(key))delete env[key];
  const executable=fs.realpathSync('C:/Users/ccabr/scoop/apps/supabase/current/supabase.exe');
  assert.equal(execFileSync(executable,['--version'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],windowsHide:true}).trim(),'2.90.0');
  assert.ok(['postgres','tcg_search_retained_513'].includes(database));
  const args=database==='postgres'?['db','push','--local','--yes']:['db','push','--db-url','postgresql://postgres:postgres@127.0.0.1:55240/'+database,'--yes'];
  const fd=fs.openSync(out+'/'+label+'.log','wx');let result;
  try{result=spawnSync(executable,[...args,'--workdir',lab,'--network-id',project],{cwd:lab,env,windowsHide:true,timeout:180000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  assert.ifError(result.error);assert.equal(result.status,0,label+' failed; preserve the local laboratory');
}
