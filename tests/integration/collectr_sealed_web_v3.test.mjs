import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import {spawn,execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {localSupabaseStatusSecret} from '../../scripts/lib/local_supabase_cli_status_v1.mjs';
import {seedCollectrSealedFixture} from './helpers/collectr_sealed_fixture.mjs';
const root='C:/gv_collectr_adventure_20261001',out='C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005';
const lab=out+'/full-427-v2',project='collectr-sealed-full-427-v2-20261005',origin='http://127.0.0.1:58883';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('sealed website: real Auth, HTTP, mixed saves, concurrency, browser recovery and V2 compatibility',{
 skip:process.env.GV_COLLECTR_SEALED_WEB_PROOF!=='1',timeout:600000,
},async()=>{
 const require=createRequire(root+'/apps/web/package.json'),{createClient}=require('@supabase/supabase-js'),{createServerClient}=require('@supabase/ssr'),{chromium}=require('@playwright/test');
 const pg=createRequire(root+'/package.json')('pg');
 const freeze=JSON.parse(fs.readFileSync(lab+'/freeze.json'));
 assert.equal(freeze.project,project);assert.equal(Object.keys(freeze.sourceHashes).length,427);
 assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-result.json')).status,'passed');
 assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
 for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/supabase/migrations/'+name)),digest);
 assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
 const inspect=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
 assert.equal(inspect('network','inspect',project)[0].Internal,true);
 assert.deepEqual(Object.keys(inspect('inspect','supabase_db_'+project)[0].NetworkSettings.Networks),[project]);
 for(const binding of Object.values(inspect('inspect',project+'-relay')[0].NetworkSettings.Ports).flat())assert.equal(binding.HostIp,'127.0.0.1');
 await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(58883,'127.0.0.1',()=>s.close(resolve));});
 const status=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true}));assert.equal(status.API_URL,'http://127.0.0.1:58681');
 const run=out+'/web-'+Date.now();fs.mkdirSync(run);
 fs.writeFileSync(run+'/intent.json',JSON.stringify({at:new Date().toISOString(),project,localOnly:true,productionWrites:0,originalFileUsed:false}),{flag:'wx'});
 const db=new pg.Client({host:'127.0.0.1',port:58680,user:'postgres',password:'postgres',database:'postgres',statement_timeout:30000});await db.connect();
 const clients=[],users=[],checks=[];let child,browser,log;
 const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),{auth:{persistSession:false,autoRefreshToken:false}});
 const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
 const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
 async function account(){const email=randomUUID()+'@collectr-sealed.invalid',password=randomUUID();const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);
  const client=createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(client);
  const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);const user={id:created.data.user.id,client,session:signed.data.session};users.push(user.id);return user;}
 const tables=['vault_item_instances','vault_items','vault_owners','vault_collection_import_documents_v2','vault_collection_import_groups_v2','vault_collection_import_receipts_v2','vault_collection_import_receipts_v3','vault_sealed_requests_v1'];
 const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
 const snapshot=async()=>{const result={};for(const table of tables)result[table]=await q('select * from '+table+' order by 1,2');return result;};
  const before=await snapshot();
 fs.writeFileSync(run+'/before.private.json',JSON.stringify(before),{flag:'wx'});
 try{
  assert.equal((await q('show max_worker_processes'))[0].max_worker_processes,'0');assert.equal((await q('select count(*)::int n from cron.job_run_details'))[0].n,0);
  const owner=await account(),visitor=await account(),concurrent=await account(),mobile=await account();
  const catalogPath=out+'/web-catalog.private.json';let catalog;
  if(fs.existsSync(catalogPath)){catalog=JSON.parse(fs.readFileSync(catalogPath));assert.equal((await q('select id from sealed_product_variants where id=$1',[catalog.variant])).length,1);}
  else {assert.equal((await q('select count(*)::int n from sealed_product_release_pointer'))[0].n,0);catalog=await seedCollectrSealedFixture(db,owner.id);fs.writeFileSync(catalogPath,JSON.stringify(catalog),{flag:'wx'});}
  const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|API_KEY|PASSWORD|VERCEL|STRIPE|DOTENV_CONFIG_PATH|NODE_OPTIONS|GROOKAI_COLLECTOR_RELEASE|NEXT_PUBLIC_COLLECTOR|NEXT_PUBLIC_VENDOR|NEXT_PUBLIC_STOREFRONT|NEXT_PUBLIC_.*LOCAL_TEST/.test(key))delete env[key];
  Object.assign(env,{SUPABASE_URL:status.API_URL,SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status),NEXT_PUBLIC_SUPABASE_URL:status.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:status.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_COLLECTR_IMPORT_LOCAL_TEST:'true',GV_COLLECTR_SEALED_IMPORT_V3:'1',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',SITE_URL:origin,NEXT_PUBLIC_SITE_URL:origin,NODE_USE_SYSTEM_CA:'1'});
  assert.equal(fs.readdirSync(root+'/apps/web').filter(n=>/^\.env(?:\.|$)/.test(n)).length,0);
  child=spawn(process.execPath,[root+'/apps/web/node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port','58883'],{cwd:root+'/apps/web',env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  log=fs.createWriteStream(run+'/next.private.log',{flags:'wx'});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});
  let ready=false;for(let i=0;i<120;i++){assert.equal(child.exitCode,null);try{if((await fetch(origin+'/api/vault/import',{method:'POST',headers:{Origin:'https://foreign.invalid'}})).status===403){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready,'Next not ready');
  const csv='Product Name,Category,Set,Card Number,Quantity,Grade,Variance,Average Cost Paid,Portfolio Name,Notes\r\nSynthetic card,Pokemon,Example,1,1,Ungraded,Normal,2,Private,card note\r\nExample Booster Box,Pokemon,Example,,2,Ungraded,Normal,0,Private,\r\nUnresolved,Pokemon,Example,,1,PSA 10,Normal,0,Private,graded';
  const post=async(user,body,originHeader=origin)=>{const response=await fetch(origin+'/api/vault/import',{method:'POST',headers:{Origin:originHeader,Authorization:'Bearer '+user.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({ownerUserId:user.id,...body})});return{status:response.status,data:await response.json()};};
  const preview=(user,currency=null)=>post(user,{operation:'preview',csvText:csv,sealedAcquisitionCurrency:currency});
  const attempt=(user,p)=>({version:3,ownerUserId:user.id,requestId:randomUUID(),csvText:csv,fileName:'synthetic.csv',targets:p.rows.flatMap(r=>r.selection?[r.selection]:[]),sealedTargets:p.rows.flatMap(r=>r.sealedSelection?[r.sealedSelection]:[]),sealedAcquisitionCurrency:p.sealedAcquisitionCurrency});
  const copies=user=>q('select * from vault_item_instances where user_id=$1 order by id',[user.id]);
  let chosen,first,firstAttempt;
  await check('real preview requires currency and includes complete card/sealed source rows',async()=>{
   const held=await preview(owner);assert.equal(held.status,200,JSON.stringify(held.data));assert.equal(held.data.readyCopies,1);assert.equal(held.data.reviewRows,2);
   const p=await preview(owner,'USD');assert.equal(p.status,200,JSON.stringify(p.data));chosen=p.data;assert.equal(chosen.version,3);assert.equal(chosen.readyCopies,3);assert.equal(chosen.reviewRows,1);
  });
  await check('same-origin and owner mismatch fail without writes',async()=>{
   assert.equal((await post(owner,{operation:'preview',csvText:csv},'https://foreign.invalid')).status,403);
   assert.equal((await post(visitor,{operation:'save',attempt:attempt(owner,chosen)})).status,400);assert.equal((await copies(owner)).length,0);
  });
  await check('HTTP save and independent readback preserve mixed metadata and unresolved source',async()=>{
   firstAttempt=attempt(owner,chosen);const result=await post(owner,{operation:'save',attempt:firstAttempt});assert.equal(result.status,200,JSON.stringify(result.data));first=result.data;
   assert.equal(first.importedCards,1);assert.equal(first.importedSealed,2);assert.equal(first.reviewRows,1);
   const rows=await copies(owner);assert.equal(rows.length,3);assert.equal(rows.filter(r=>r.sealed_product_variant_id===catalog.variant&&r.seal_state==='unknown'&&r.package_condition==='unknown'&&Number(r.acquisition_cost)===0&&r.acquisition_currency==='USD').length,2);
   assert.equal((await owner.client.from('vault_collection_import_documents_v2').select('source_rows').single()).data.source_rows[2].Grade,'PSA 10');
  });
  await check('concurrent fresh requests add each source copy only once',async()=>{
   const p=(await preview(concurrent,'USD')).data,results=await Promise.all([post(concurrent,{operation:'save',attempt:attempt(concurrent,p)}),post(concurrent,{operation:'save',attempt:attempt(concurrent,p)})]);
   results.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.data)));assert.equal(results.reduce((n,r)=>n+r.data.importedCards+r.data.importedSealed,0),3);assert.equal((await copies(concurrent)).length,3);
  });
  await check('retry returns original receipt; changed request conflicts; visitor cannot read it',async()=>{
   assert.deepEqual((await post(owner,{operation:'save',attempt:firstAttempt})).data,first);
   assert.equal((await post(owner,{operation:'save',attempt:{...firstAttempt,sealedTargets:[]}})).status,409);
   assert.deepEqual((await visitor.client.rpc('get_collection_import_sealed_copies_v3',{p_source_sha256:first.sourceSha256,p_instance_ids:first.sealedTargets[0].instanceIds})).data,[]);
  });
  await check('existing V2 card-only attempts still save and recover through the website',async()=>{
   const old={...firstAttempt,version:2,requestId:randomUUID()};delete old.sealedTargets;delete old.sealedAcquisitionCurrency;
   const r=await post(owner,{operation:'save',attempt:old});assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.importedCards,0);assert.equal(r.data.reviewRows,1);
   assert.deepEqual((await post(owner,{operation:'save',attempt:old})).data,r.data);
  });
  await check('adding sealed rows to an earlier V2 import preserves the original card copy',async()=>{
   const earlier=await account(),next=attempt(earlier,chosen),old={...next,version:2,requestId:randomUUID()};delete old.sealedTargets;delete old.sealedAcquisitionCurrency;
   const original=await post(earlier,{operation:'save',attempt:old});assert.equal(original.status,200,JSON.stringify(original.data));assert.equal(original.data.importedCards,1);assert.equal(original.data.reviewRows,2);
   const originalCopy=(await copies(earlier))[0];
   const extended=await post(earlier,{operation:'save',attempt:next});assert.equal(extended.status,200,JSON.stringify(extended.data));assert.equal(extended.data.importedCards,0);assert.equal(extended.data.importedSealed,2);assert.equal(extended.data.reviewRows,1);
   assert.deepEqual((await copies(earlier)).find(r=>r.id===originalCopy.id),originalCopy);
  });
  await check('archived copies and disabled additions do not break durable receipt recovery',async()=>{
   assert.equal((await owner.client.rpc('vault_dispose_sealed_copy_v1',{p_instance_id:first.sealedTargets[0].instanceIds[0],p_request_id:randomUUID(),p_operation:'remove'})).error,null);
   await q("update vault_item_instances set notes='Edited after import' where user_id=$1 and card_print_id=$2",[owner.id,catalog.card]);
   await q('update sealed_ownership_controls_v1 set enabled=false where singleton');
   try{assert.deepEqual((await post(owner,{operation:'save',attempt:firstAttempt})).data,first);const held=await preview(owner,'USD');assert.equal(held.data.readyCopies,1);assert.equal(held.data.sealedImportEnabled,false);assert.equal((await copies(owner)).find(r=>r.card_print_id===catalog.card).notes,'Edited after import');}finally{await q('update sealed_ownership_controls_v1 set enabled=true where singleton');}
  });
  await check('mobile browser chooses currency, reuses inventory, reloads interrupted save, and clears recovery only after verification',async()=>{
   const existing=await mobile.client.rpc('vault_add_sealed_copies_v1',{p_variant_id:catalog.variant,p_request_id:randomUUID(),p_quantity:1,p_seal_state:'unknown',p_package_condition:'unknown',p_acquisition_cost:0,p_acquisition_currency:'USD'});assert.equal(existing.error,null);
   let cookies=[];const auth=createServerClient(status.API_URL,status.ANON_KEY,{cookies:{getAll:()=>cookies,setAll:values=>cookies=values}});assert.equal((await auth.auth.setSession(mobile.session)).error,null);
   browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});
   await context.addCookies(cookies.map(c=>({name:c.name,value:c.value,url:origin,httpOnly:false,secure:false,sameSite:'Lax'})));const page=await context.newPage();
   await page.goto(origin+'/vault/import');await page.getByRole('heading',{name:'Import your collection',exact:true}).waitFor();
   await page.locator('#collectr-csv').setInputFiles({name:'synthetic-sealed.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
   await page.getByRole('button',{name:'Save 1 ready copies and retain review rows'}).waitFor();
   await page.locator('#sealed-purchase-currency').selectOption('USD');const save=page.getByRole('button',{name:'Save 3 ready copies and retain review rows'});await save.waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   await page.screenshot({path:run+'/mobile-preview.png',fullPage:true});
   let interrupted=false,interruptionError=null,completeInterruption;
   const interruptionDone=new Promise(resolve=>{completeInterruption=resolve;});
   await page.route('**/api/vault/import',async route=>{
    if(!interrupted&&route.request().postDataJSON().operation==='save'){
     interrupted=true;
     try{const response=await route.fetch();if(response.status()!==200)interruptionError='Save before interruption returned '+response.status()+': '+await response.text();await route.abort('failed');}
     catch{interruptionError='Interruption transport failed';}
     finally{completeInterruption();}
    }else await route.continue();
   });
   await save.click();await interruptionDone;assert.equal(interruptionError,null);await page.locator('p[role="alert"]').waitFor();assert.ok(interrupted);const frozen=await page.evaluate(id=>JSON.parse(sessionStorage.getItem('vault-import:v3:'+id)),mobile.id);assert.equal(frozen.sealedAcquisitionCurrency,'USD');assert.equal(frozen.csvText,csv);
   assert.equal((await copies(mobile)).length,3);await page.reload();await page.getByRole('button',{name:'Retry saved import'}).click();await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
   await page.getByText('Cards added: 1. Sealed copies added: 1. Already accounted for: 1. Source rows retained for review: 1.',{exact:true}).waitFor();
   assert.equal((await copies(mobile)).length,3);assert.equal(await page.evaluate(id=>sessionStorage.getItem('vault-import:v3:'+id),mobile.id),null);
   await page.screenshot({path:run+'/mobile-verified.png',fullPage:true});await page.setViewportSize({width:1280,height:900});await page.screenshot({path:run+'/desktop-verified.png',fullPage:true});
   const legacyAttempt={version:2,ownerUserId:mobile.id,requestId:randomUUID(),csvText:csv,fileName:'legacy.csv',targets:firstAttempt.targets};
   await page.evaluate(a=>sessionStorage.setItem('vault-import:v2:'+a.ownerUserId,JSON.stringify(a)),legacyAttempt);
   await page.reload();await page.getByRole('button',{name:'Retry saved import'}).click();await page.getByRole('heading',{name:'Import verified',exact:true}).waitFor();
   await page.getByText('Cards added: 0. Sealed copies added: 0. Already accounted for: 1. Source rows retained for review: 1.',{exact:true}).waitFor();
   assert.equal(await page.evaluate(id=>sessionStorage.getItem('vault-import:v2:'+id),mobile.id),null);assert.equal((await copies(mobile)).length,3);
   await context.close();await auth.auth.signOut({scope:'local'});
  });
  const after=await snapshot();fs.writeFileSync(run+'/after.private.json',JSON.stringify(after),{flag:'wx'});
  for(const table of tables)assert.deepEqual(after[table].filter(r=>!users.includes(r.user_id)).map(canonical).sort(),before[table].map(canonical).sort(),table+' prior rows changed');
  fs.writeFileSync(run+'/result.json',JSON.stringify({status:'passed',at:new Date().toISOString(),checks,project,productionWrites:0,priorRowsUnchanged:true,syntheticUsers:users,runDir:run}),{flag:'wx'});
  console.log(JSON.stringify({status:'passed',checks:checks.length,run}));
 }finally{
  if(browser)await browser.close();if(child&&child.exitCode===null)execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});if(log)log.end();
  for(const client of clients)await client.auth.signOut({scope:'local'});await db.end();
 }
});
