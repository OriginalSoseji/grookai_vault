// Rollback-only behavioral checks in the new, empty 54200 fixture.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {inspectJungleFullV37} from './inspect_jungle_full_v37.mjs';
import {snapshotSql,compareSnapshots} from './vendor_billing_schema_v1.mjs';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001';
const hash=b=>createHash('sha256').update(b).digest('hex');
const file='supabase/migrations/20261004090000_jungle_discovery_projection_order_v1.sql';
const evidence=JSON.parse(fs.readFileSync(base+'/projection-v37/projection-evidence.json'));
const raw=fs.readFileSync(file,'utf8');assert.equal(hash(raw),evidence.migrationSha256);
const sql=raw.replace(/^begin;\r?\n/m,'').replace(/commit;\s*$/,'');
const runtime=inspectJungleFullV37(),c=new pg.Client({host:'127.0.0.1',port:54200,user:'postgres',password:'postgres',database:'postgres'});
await c.connect();
const snapshot=async()=>{const r=await c.query(snapshotSql);return r.find(x=>x.rows?.[0]?.receipt).rows[0].receipt;};
const results=[];
try{
 assert.equal((await c.query('select host(inet_server_addr()) a')).rows[0].a,runtime.address);
 assert.equal((await c.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
 assert.equal((await c.query('select count(*)::int n from vault_item_instances')).rows[0].n,0);
 const before=await snapshot();assert.equal(before.LEDGER.length,426);
 for(const [name,setup,expected]of [
  ['unknown column','alter view public.v_card_prints_discovery_v1 rename column id to unexpected_identity','JUNGLE_DISCOVERY_UNEXPECTED_PROJECTION'],
  ['security mode','alter view public.v_card_prints_discovery_v1 set (security_invoker=false)','JUNGLE_DISCOVERY_UNEXPECTED_SECURITY'],
  ['owner','grant create on schema public to authenticated; alter view public.v_card_prints_discovery_v1 owner to authenticated','JUNGLE_DISCOVERY_UNEXPECTED_SECURITY'],
 ]){
  await c.query('begin');try{await c.query(setup);await assert.rejects(()=>c.query(sql),e=>e.message.includes(expected));results.push({name,rejected:true});}finally{await c.query('rollback');}
 }
 await c.query('begin');try{
  const oid=(await c.query("select 'public.v_card_prints_discovery_v1'::regclass::oid o")).rows[0].o;
  await c.query('create view public.jungle_projection_guard_probe_v1 as select id from public.v_card_prints_discovery_v1');
  await c.query(sql);
  assert.equal((await c.query("select 'public.v_card_prints_discovery_v1'::regclass::oid o")).rows[0].o,oid);
  assert.deepEqual((await c.query('select * from public.jungle_projection_guard_probe_v1')).rows,[]);
  results.push({name:'canonical view retains OID and stored dependent',passed:true});
 }finally{await c.query('rollback');}
 const after=await snapshot();const out=base+'/projection-v37/guard-tests-'+Date.now();fs.mkdirSync(out);
 const comparison=await compareSnapshots(after,before,{output:out+'/parity'});assert.deepEqual(after.LEDGER,before.LEDGER);
 const receipt={at:new Date().toISOString(),status:'passed',tests:results.length,results,comparison,migrationSha256:hash(raw),productionWrites:0,out};
 fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});fs.writeFileSync(base+'/projection-v37/guard-tests-latest.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}finally{await c.end();}
