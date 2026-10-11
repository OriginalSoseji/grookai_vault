// Actual Auth and database boundaries. All writes are isolated synthetic fixtures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_inventory_export_20261008',base='C:/grookai_vault_operator_artifacts/product_inventory_export_20261008',lab=base+'/full-439-v2',project='inventory-full-439-v2-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);assert.equal(process.argv.length,3);const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(n,a)=>execFileSync(n,a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:120000,maxBuffer:64*1024*1024});
command(process.execPath,['scripts/audits/product_inventory_export_fixture_v1.mjs','verify',run]);
const f=read(run+'/fixture.private.json'),freeze=read(lab+'/freeze.json');assert.equal(f.state,'prepared');assert.equal(f.project,project);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35941');
const out=run+'/rpc-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const require=createRequire(root+'/apps/web/package.json'),ts=require('typescript'),context={exports:{},TextEncoder};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/apps/web/src/lib/vault/inventoryExport.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {inventoryExport:parse,inventoryExportJson:json,inventoryExportCsv:csv}=context.exports;
const auth={persistSession:false,autoRefreshToken:false},clients=[],checks=[];
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;},passed=name=>{checks.push(name);save('check-'+checks.length+'.json',{status:'passed',name});};
const url='postgresql://postgres:postgres@127.0.0.1:35940/postgres',db=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});await db.connect();const q=async(s,a=[])=>(await db.query(s,a)).rows;
try{
 for(const user of f.users){const c=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});ok(await c.auth.signInWithPassword({email:user.email,password:user.password}));clients.push(c);}
 const anon=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});assert.ok((await anon.rpc('vault_inventory_export_v1')).error);
 const svc=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth});assert.ok((await svc.rpc('vault_inventory_export_v1')).error);passed('Anonymous and service role cannot invoke private export');
 for(const role of ['anon','authenticated','service_role'])assert.equal((await q("select has_function_privilege($1,'public.vault_inventory_export_v1()','EXECUTE') allowed",[role]))[0].allowed,role==='authenticated');
 const p=(await q("select provolatile,prosecdef,proconfig from pg_proc where oid='public.vault_inventory_export_v1()'::regprocedure"))[0];assert.equal(p.provolatile,'s');assert.equal(p.prosecdef,true);assert.deepEqual(p.proconfig,['search_path=""']);passed('Exact function ACL, stable snapshot and empty search path');
 const before=(await q('select to_jsonb(i) row from vault_item_instances i where user_id=$1 order by id',[f.users[0].id])).map(r=>r.row);
 const doc=parse(f.users[0].id,ok(await clients[0].rpc('vault_inventory_export_v1')));assert.equal(doc.copyCount,4);assert.equal(doc.copies.map(c=>c.kind).sort().join(','),'card,card,sealed,slab');
 for(const copy of f.copies){const got=doc.copies.find(c=>c.record.id===copy.id);if(copy.kind==='archived'){assert.equal(got,undefined);continue;}assert.equal(got.record.acquisition_cost,copy.cost);assert.equal(got.record.acquisition_currency,copy.currency);assert.equal(got.record.notes,copy.notes);}
 const raw=doc.copies.find(c=>c.record.id===f.copies[0].id);assert.equal(raw.record.asking_price_amount,'12.3400000000000001');assert.equal(raw.printing.id,f.printing);assert.equal(raw.sections.length,1);assert.equal(raw.sections[0].id,f.section);assert.equal(raw.sections[0].is_public,false);
 const slab=doc.copies.find(c=>c.kind==='slab');assert.equal(slab.certificate.cert_number,'0012300456');assert.equal(slab.certificate.grade,'10.00');assert.ok(slab.certificate.subgrades_json.includes('9.99999999999999999999'));assert.ok(slab.certificate.label_metadata_json.includes('9007199254740993'));
 const sealed=doc.copies.find(c=>c.kind==='sealed');assert.equal(sealed.sealed.upc,'001234500067');assert.ok(sealed.sealed.explicit_contents_json.includes('0.00000000000000000001'));
 const legacy=doc.copies.find(c=>c.record.id===f.copies[3].id);assert.equal(legacy.kind,'card');assert.equal(legacy.certificate,null);assert.equal(legacy.record.grade_value,'9.5');
 save('export.private.json',JSON.parse(json(doc)));fs.writeFileSync(out+'/export.private.csv',csv(doc),{flag:'wx'});passed('All active kinds, exact decimal strings, original notes, metadata and private active sections');
 const empty=parse(f.users[1].id,ok(await clients[1].rpc('vault_inventory_export_v1')));assert.equal(empty.copyCount,0);assert.equal(empty.copies.length,0);
 assert.ok((await clients[1].rpc('vault_inventory_export_v1',{ownerId:f.users[0].id})).error);assert.throws(()=>parse(f.users[1].id,doc));passed('Independent empty owner and rejected owner argument or response substitution');
 const token=ok(await clients[0].auth.getSession()).session.access_token;
 const capped=await fetch(cfg.API_URL+'/rest/v1/rpc/vault_inventory_export_v1?limit=1',{method:'POST',headers:{apikey:cfg.PUBLISHABLE_KEY,authorization:'Bearer '+token,'content-type':'application/json',Range:'0-0'},body:'{}'});assert.equal(capped.status,200);assert.equal(parse(f.users[0].id,await capped.json()).copyCount,4);passed('API limit and range do not truncate the scalar complete export');
 assert.deepEqual((await q('select to_jsonb(i) row from vault_item_instances i where user_id=$1 order by id',[f.users[0].id])).map(r=>r.row),before);passed('Exports leave every owned row unchanged');
 // These large fixture writes are rolled back, including sequence changes. Never reset a lab.
 await q('begin');try{
  await q("insert into vault_item_instances(user_id,gv_vi_id,card_print_id) select $1,'GVVI-LIMIT-'||upper(gen_random_uuid()::text),$2 from generate_series(1,20001)",[f.users[2].id,f.card]);
  await q('savepoint cap');await q("select set_config('request.jwt.claim.sub',$1,true)",[f.users[2].id]);await q('set local role authenticated');
  await assert.rejects(q('select public.vault_inventory_export_v1()'),e=>e.code==='54000'&&e.message==='inventory_export_too_many_copies');await q('rollback to cap');
 }finally{await q('rollback');}passed('More than 20000 copies refuses the entire export');
 await q('begin');try{
  await q('update vault_item_instances set notes=repeat(\'x\',33554433) where id=$1',[f.copies[0].id]);await q('savepoint size');await q("select set_config('request.jwt.claim.sub',$1,true)",[f.users[0].id]);await q('set local role authenticated');
  await assert.rejects(q('select public.vault_inventory_export_v1()'),e=>e.code==='54000'&&e.message==='inventory_export_too_large');await q('rollback to size');
 }finally{await q('rollback');}passed('Payload above 32MiB refuses the entire export');
 // Force a write between the count and metadata projection without changing the function.
 const owner=f.users[3].id;const added=(await q('insert into vault_item_instances(user_id,gv_vi_id,card_print_id) values($1,$2,$3) returning id',[owner,'GVVI-SNAPSHOT-'+randomUUID().toUpperCase(),f.card]))[0].id;const oldCount=(await q('select count(*)::int n from vault_item_instances where user_id=$1 and archived_at is null',[owner]))[0].n;
 const gate=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});await gate.connect();let pending;
 try{
  await gate.query('begin');const pid=(await gate.query('select pg_backend_pid() pid')).rows[0].pid;await gate.query('lock table slab_certs in access exclusive mode');
  pending=clients[3].rpc('vault_inventory_export_v1').then(r=>r);let blocked;
  for(let i=0;i<100;i++){blocked=(await q("select pid,wait_event_type,pg_blocking_pids(pid) blockers from pg_stat_activity where $1::int=any(pg_blocking_pids(pid)) and query like '%vault_inventory_export_v1%'",[pid]))[0];if(blocked)break;await new Promise(r=>setTimeout(r,50));}assert.ok(blocked,'Export must be observed waiting before the concurrent write');save('snapshot-lock.json',blocked);
  await q("set statement_timeout='2s'");await q('update vault_item_instances set archived_at=clock_timestamp() where id=$1',[added]);await q('set statement_timeout=0');await gate.query('commit');
  const old=parse(owner,ok(await pending));assert.equal(old.copyCount,oldCount);assert.equal(old.copies.some(c=>c.record.id===added),true);assert.equal(parse(owner,ok(await clients[3].rpc('vault_inventory_export_v1'))).copyCount,oldCount-1);
 }finally{await gate.query('rollback').catch(()=>{});await gate.end();if(pending)await pending;}passed('Concurrent committed archive cannot split count and records across snapshots');
 assert.deepEqual((await q('select to_jsonb(i) row from vault_item_instances i where user_id=$1 order by id',[f.users[0].id])).map(r=>r.row),before);
 command(process.execPath,['scripts/audits/product_inventory_export_fixture_v1.mjs','verify',run]);
 save('result.json',{status:'passed',at:new Date().toISOString(),checks,project,sourceSha256:freeze.sourceHashes['20261009010000_inventory_export_v1.sql'],modelSha256:sha(root+'/apps/web/src/lib/vault/inventoryExport.ts'),producerSha256:sha(import.meta.filename),productionWrites:0,providerCalls:0,globalControlsChanged:false});console.log(JSON.stringify({status:'passed',checks:checks.length,out}));
}catch(error){save('failure.json',{message:error.message,stack:error.stack});throw error;}finally{await db.query('rollback').catch(()=>{});await db.end();for(const c of clients)await c.auth.signOut({scope:'local'});}
