import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {localSupabaseStatusSecret} from '../../scripts/lib/local_supabase_cli_status_v1.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const out='C:/grookai_vault_operator_artifacts/collectr_import_review_20260930';
const fixture=out+'/full-410',project='collectr-review-full-410-20260930';
const hash=value=>createHash('sha256').update(value).digest('hex');
test('source-aware import: real Auth, HTTP, RLS, concurrency and independent readback',{
 skip:process.env.GV_COLLECTR_HTTP_PROOF!=='1',timeout:120000,
},async t=>{
 assert.equal(root.replaceAll('\\','/'),'C:/gv_collectr_import_20260930');
 const require=createRequire(process.env.GV_COLLECTR_TEST_DEPENDENCIES??path.join(root,'package.json'));
 const pg=require('pg'),{createClient}=require('@supabase/supabase-js');
 const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
 assert.equal(freeze.project,project);assert.equal(Object.keys(freeze.sourceHashes).length,410);
 assert.equal(JSON.parse(fs.readFileSync(fixture+'/replay-result.json')).fullReplay,true);
 assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
 for(const [name,digest] of Object.entries(freeze.sourceHashes)){
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+name)),digest);
  assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest);
 }
 assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),freeze.configSha256);
 const docker=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
 assert.equal(docker('network','inspect',project)[0].Internal,true);
 assert.deepEqual(Object.keys(docker('inspect','supabase_db_'+project)[0].NetworkSettings.Networks),[project]);
 for(const binding of Object.values(docker('inspect',project+'-relay')[0].NetworkSettings.Ports).flat())assert.equal(binding.HostIp,'127.0.0.1');
 await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(58750,'127.0.0.1',()=>server.close(resolve));});
 const runDir=out+'/http-v2-'+Date.now();fs.mkdirSync(runDir);
 const sourceFiles=['supabase/functions/vault-import-collection-v2/source.ts','supabase/functions/vault-import-collection-v2/handler.ts','supabase/functions/_shared/auth.ts','supabase/functions/_shared/key_resolver.ts','tests/integration/helpers/collectr_import_server_v2.ts', 'tests/integration/collectr_import_http_v2.test.mjs'];
 fs.writeFileSync(runDir+'/intent.json',JSON.stringify({scope:'New synthetic accounts and fixtures only; never reset or migrate',project,at:new Date().toISOString(),sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(root+'/'+p))]))}),{flag:'wx'});
 const db=new pg.Client({host:'127.0.0.1',port:58540,user:'postgres',password:'postgres',database:'postgres',statement_timeout:15000});await db.connect();
 const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}));
 assert.equal(status.API_URL,'http://127.0.0.1:58541');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),options);
 const caller=createClient(status.API_URL,status.ANON_KEY,options),visitor=createClient(status.API_URL,status.ANON_KEY,options);
 let child,serverLog='',user,outsider;const checks=[];
 const tables=['vault_collection_import_documents_v2','vault_collection_import_groups_v2','vault_collection_import_receipts_v2','vault_item_instances','vault_items','vault_owners'];
 const snapshot=async()=>{const rows={};for(const table of tables)rows[table]=(await db.query('select * from public.'+table+' order by 1,2')).rows;return rows;};
 let before;
 try{
  assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(freeze.sourceHashes).sort().map(n=>n.split('_')[0]));
  assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
  assert.equal((await db.query('select count(*)::int runs from cron.job_run_details')).rows[0].runs,0);
  before=await snapshot();fs.writeFileSync(runDir+'/before.private.json',JSON.stringify(before),{flag:'wx'});
  child=spawn('deno',['run','--no-lock','--cached-only','--allow-env','--allow-net=127.0.0.1:58541,127.0.0.1:58750',root+'/tests/integration/helpers/collectr_import_server_v2.ts'],{cwd:root,env:{...process.env,SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status)},stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.stdout.on('data',b=>serverLog+=b);child.stderr.on('data',b=>serverLog+=b);
  let ready=false;for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:58750',{method:'OPTIONS'})).status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,'Local handler did not start');
  async function account(client){const email=randomUUID()+'@collectr-fixture.invalid',password=randomUUID();const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);return{id:created.data.user.id,token:signed.data.session.access_token};}
  user=await account(caller);outsider=await account(visitor);
  const set=randomUUID(),card=randomUUID(),reverse=randomUUID(),holo=randomUUID(),gvId='GV-PK-COLLECTR-'+card;
  await db.query("insert into sets(id,code,name,game) values($1::uuid,$1::text,'Synthetic import set','pokemon')",[set]);
  await db.query("insert into card_prints(id,set_id,name,number,gv_id,game_id) values($1,$2,'Synthetic import card','65',$3,(select id from games where code='pokemon'))",[card,set,gvId]);
  await db.query("insert into card_printings(id,card_print_id,finish_key) values($1,$3,'reverse'),($2,$3,'holo')",[reverse,holo,card]);
  const csvText='Product Name,Category,Set,Card Number,Variance,Grade,Card Condition,Quantity,Average Cost Paid,Portfolio Name,Price Override,Notes\nSynthetic import card,Pokemon,Synthetic import set,065/165,Reverse Holofoil,Ungraded,LP,2,4.25,Private,0,Reverse cost\nSynthetic import card,Pokemon,Synthetic import set,65,Holofoil,Ungraded,NM,1,9,Display,0,Holo cost\nSynthetic import card,Pokemon,Synthetic import set,65,Holofoil,PSA 10,NM,1,99,Slabs,0,Needs cert';
  const targets=[{sourceIndices:[0],cardId:card,gvId,cardPrintingId:reverse},{sourceIndices:[1],cardId:card,gvId,cardPrintingId:holo}];
  const send=(override={},token=user.token)=>fetch('http://127.0.0.1:58750',{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({ownerUserId:user.id,requestId:randomUUID(),csvText,targets,...override})});
  const copies=async()=>(await db.query('select * from vault_item_instances where user_id=$1 order by id',[user.id])).rows;
  const check=async(name,fn)=>t.test(name,async()=>{await fn();checks.push(name);});
  await check('invalid authentication and changed account do not write',async()=>{assert.equal((await send({},'invalid')).status,401);assert.equal((await send({},outsider.token)).status,409);assert.equal((await copies()).length,0);});
  const firstRequest=randomUUID();let first,original;
  await check('atomic save keeps separate finishes, prices and all review source',async()=>{
   const response=await send({requestId:firstRequest});assert.equal(response.status,200,await response.clone().text());first=await response.json();assert.equal(first.importedCards,3);assert.equal(first.reviewRows,1);
   original=await copies();assert.equal(original.length,3);assert.equal(original.filter(r=>r.card_printing_id===reverse&&Number(r.acquisition_cost)===4.25&&r.condition_label==='LP').length,2);assert.equal(original.filter(r=>r.card_printing_id===holo&&Number(r.acquisition_cost)===9).length,1);
   const doc=await caller.from('vault_collection_import_documents_v2').select('source_rows').eq('source_sha256',first.sourceSha256).single();assert.equal(doc.error,null);assert.equal(doc.data.source_rows.length,3);assert.equal(doc.data.source_rows[2].Grade,'PSA 10');
  });
  await check('lost response and concurrent retries cannot duplicate copies',async()=>{
   const lost=await send({requestId:firstRequest});await lost.body.cancel();
   const repeated=await send({requestId:firstRequest});assert.deepEqual(await repeated.json(),first);
   const parallel=await Promise.all([send(),send()]);for(const r of parallel){assert.equal(r.status,200);assert.equal((await r.json()).importedCards,0);}assert.deepEqual(await copies(),original);
  });
  await check('receipt cannot be rebound and source grade cannot become raw',async()=>{
   assert.equal((await send({requestId:firstRequest,targets:[]})).status,409);
   assert.equal((await send({targets:[{...targets[1],sourceIndices:[2]}]})).status,400);assert.deepEqual(await copies(),original);
  });
  await check('authenticated independent readback proves copies; visitor cannot read source',async()=>{
   const mine=await caller.from('vault_item_instances').select('id,card_printing_id,acquisition_cost').eq('user_id',user.id).order('id');assert.equal(mine.error,null);assert.deepEqual(mine.data.map(r=>r.id),original.map(r=>r.id));
   for(const table of ['vault_collection_import_documents_v2','vault_collection_import_groups_v2']){const r=await visitor.from(table).select('*');assert.equal(r.error,null);assert.deepEqual(r.data,[]);}
   const denied=await caller.rpc('admin_import_vault_collection_v2',{p_user_id:user.id,p_request_id:randomUUID(),p_source_sha256:first.sourceSha256,p_source_rows:[],p_targets:[]});assert.ok(denied.error);
  });
  await check('reopening the original export never recreates an archived copy',async()=>{
   await db.query('update vault_item_instances set archived_at=now() where user_id=$1 and id=$2',[user.id,original[0].id]);
   const response=await send();assert.equal(response.status,200);assert.equal((await response.json()).importedCards,0);assert.equal((await copies()).length,3);
   const args={p_source_sha256:first.sourceSha256,p_instance_ids:original.map(r=>r.id)};
   const read=await caller.rpc('get_collection_import_copies_v2',args);assert.equal(read.error,null);assert.equal(read.data.length,3);assert.equal(read.data.filter(r=>r.archived_at!==null).length,1);
   const denied=await visitor.rpc('get_collection_import_copies_v2',args);assert.equal(denied.error,null);assert.deepEqual(denied.data,[]);
   const unrelated=await caller.rpc('get_collection_import_copies_v2',{...args,p_source_sha256:'0'.repeat(64)});assert.equal(unrelated.error,null);assert.deepEqual(unrelated.data,[]);
  });
  const after=await snapshot();for(const table of tables)assert.deepEqual(after[table].filter(r=>r.user_id!==user.id&&r.user_id!==outsider.id),before[table]);
  const result={status:checks.length===6?'passed':'failed',at:new Date().toISOString(),checks,project,productionWrites:0,priorRowsUnchanged:true,runDir};
  fs.writeFileSync(runDir+'/result.json',JSON.stringify(result,null,2),{flag:'wx'});assert.equal(result.status,'passed');
 }finally{
  if(child){child.kill();await new Promise(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',resolve);});}
  fs.writeFileSync(runDir+'/server.private.log',serverLog,{flag:'wx'});await db.end();
  await caller.auth.signOut({scope:'local'});await visitor.auth.signOut({scope:'local'});
 }
});
