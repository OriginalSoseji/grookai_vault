// Real Auth, Storage, Next handlers and DB concurrency; fixed synthetic 276xx only.
import './vendor_storefront_network_guard.cjs';
import {startBrowserHarness} from './vendor_batch_real_browser_harness_v1.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,output,project,guard,hash} from '../schema/vendor_batch_cancellation_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const before=guard({full:true}),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,before.sourceHashes);
const require=createRequire(path.join(root,'apps/web/package.json'));
const {createClient}=require('@supabase/supabase-js'),{Client}=require('pg'),sharp=require('sharp');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const api='http://127.0.0.1:27621',origin='http://127.0.0.1:27640';
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})}};
const admin=createClient(api,cfg.SERVICE_ROLE_KEY,options),anon=createClient(api,cfg.ANON_KEY,options);
const db=new Client({host:'127.0.0.1',port:27622,user:'postgres',password:'postgres',database:'postgres'});
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),privateFile=path.join(fixture,`http-${stamp}.private.json`);
const ids={set:randomUUID(),card:randomUUID(),printing:randomUUID(),section:randomUUID(),store:randomUUID(),otherStore:randomUUID(),batch:randomUUID()};
const users=[],sessions=[],paths=[],checks=[];
fs.writeFileSync(path.join(fixture,'browser-proof-r4-intent.json'),JSON.stringify({at:new Date().toISOString(),project}),{flag:'wx'});
const report={at:new Date().toISOString(),project,checks,productionWrites:0,providerRequests:0};
let child,log,harness,connected=false;const catalogCards=[],catalogSets=[],references=[];let baselineSets;
const ok=result=>{assert.equal(result.error,null,result.error?.message);return result.data;};
const q=(sql,args=[])=>db.query(sql,args);
const checked=async(label,work)=>{await work();checks.push(label);console.log('PASS '+label);};
const image=await sharp({create:{width:128,height:180,channels:3,background:'#294566'}}).jpeg().toBuffer();
const digest=createHash('sha256').update(image).digest('hex');
const request=(extra={})=>({version:1,batch_id:ids.batch,item_id:randomUUID(),card_id:ids.card,printing_id:ids.printing,condition:'NM',intent:'sell',amount:'12.50',currency:'USD',sections:[ids.section],location:'Private bin 7',list:true,front_sha256:digest,back_sha256:digest,...extra});
async function http(route,body,token=sessions[0]?.access_token,method='POST',extra={}) {
 const response=await fetch(origin+'/api/stores/owner/intake'+route,{method,headers:{origin,...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':Buffer.isBuffer(body)?'image/jpeg':'application/json'}:{}),...extra},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(90000)});
 return {status:response.status,data:await response.json(),headers:response.headers};
}
const prepare=(data,owner=users[0],store=ids.store)=>admin.rpc('vendor_batch_intake_prepare_v1',{p_owner:owner,p_store:store,p_data:data});
const getReceipt=async data=>ok(await admin.from('vendor_batch_intake_receipts').select('*').eq('owner_id',users[0]).eq('store_id',ids.store).eq('batch_id',data.batch_id).eq('item_id',data.item_id).single());
const upload=async(data,side)=>http('/media?'+new URLSearchParams({batch:data.batch_id,item:data.item_id,side}),image);
const finish=data=>http('/finish',{batch_id:data.batch_id,item_id:data.item_id});
try {
 await db.connect();connected=true;baselineSets=(await q("select to_jsonb(s) as row from sets s order by id")).rows;assert.equal(baselineSets.length,508);
 assert.equal((await q('select count(*) from public.vendor_batch_intake_receipts')).rows[0].count,'0');
 assert.equal((await q('select enabled from public.vendor_batch_intake_control')).rows[0].enabled,false);
 ok(await admin.storage.createBucket('user-card-images',{public:false,fileSizeLimit:10*1024*1024,allowedMimeTypes:['image/jpeg','image/png','image/webp']}));
 for(let n=0;n<2;n++){
  const email=`batch-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('hex');
  const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user.id);
  const client=createClient(api,cfg.ANON_KEY,options);sessions.push(ok(await client.auth.signInWithPassword({email,password})).session);
  await q("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Synthetic batch owner',true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true",[user.id,`batch-${user.id}`]);
  await q("insert into user_entitlements(user_id,tier,features) values($1,'vendor','{\"store_app\":true,\"store_web\":true}')",[user.id]);
  await q("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Synthetic batch store')",[n?ids.otherStore:ids.store,user.id,`batch-${user.id}`]);
 }
 fs.writeFileSync(privateFile,JSON.stringify({ids,users}),{flag:'wx'});
 await q("insert into sets(id,code,name,game) values($1,'batch-local','Synthetic scan set','pokemon')",[ids.set]);
 await q("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Synthetic scan card','001','batch-local','GV-PK-BATCH-001','missing')",[ids.card,ids.set]);
 await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal','GV-PK-BATCH-001-NORMAL')",[ids.printing,ids.card]);
 await q("insert into wall_sections(id,user_id,name) values($1,$2,'Scan shelf')",[ids.section,users[0]]);
 await q('update vendor_store_rollout set app_enabled=true,web_enabled=true');
 await checked('database rollout defaults off and rejects direct service prepare',async()=>assert.equal((await prepare(request())).error?.code,'42501'));
 await q('update vendor_batch_intake_control set enabled=true');
 const env={...process.env};
 // Empty external/provider values before Next loads any .env files.
 for(const f of ['.env','.env.local','apps/web/.env','apps/web/.env.local'])if(fs.existsSync(path.join(root,f)))for(const m of fs.readFileSync(path.join(root,f),'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[m[1]]='';
 for(const key of Object.keys(env))if(/SUPABASE|STRIPE|VERCEL|GROOKAI|NEXT_PUBLIC|DATABASE_URL|POSTGRES_URL/.test(key))env[key]='';
 Object.assign(env,{SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:cfg.SERVICE_ROLE_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',GROOKAI_STORE_BATCH_COMMIT_ENABLED:'true',GROOKAI_STORE_BATCH_CANCELLATION_ENABLED:'true',GROOKAI_STORE_SCAN_MATCH_V2_ENABLED:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:origin,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 log=fs.openSync(path.join(fixture,`next-${stamp}.private.log`),'wx');
 child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','27640'],{cwd:path.join(root,'apps/web'),env,windowsHide:true,stdio:['ignore',log,log]});
 for(let n=0;;n++) {if(child.exitCode!==null)throw new Error('Local Next server stopped; inspect private log');try {const r=await http('',null,undefined,'GET');if(r.status===200)break;}catch{}if(n>=40)throw new Error('Local Next server did not become ready');await delay(500);}

 const catalogSql=fs.readFileSync(path.join(root,'.local/integration/vendor-pilot-20260922/catalog.sql'),'utf8');assert.equal(hash(catalogSql),'e0102cc429185329fcc243d01574a94cbf5f45b6e2356f6deee6464a387b49af');const localGame=(await q("select id from games where code='pokemon'")).rows[0].id;
 const collections=[...catalogSql.matchAll(/jsonb_populate_recordset\(null::public\.(sets|card_prints|card_printings),'((?:[^']|'')*)'::jsonb\)/g)].map(m=>({table:m[1],rows:JSON.parse(m[2].replaceAll("''","'"))}));assert.deepEqual(collections.map(c=>c.table),['sets','card_prints','card_printings']);
 await q('begin');try{for(const c of collections){if(c.table==='sets')assert.ok(c.rows.every(r=>r.game==='pokemon'));if(c.table==='card_prints')for(const row of c.rows)row.game_id=localGame;const generated=(await q("select attname from pg_attribute where attrelid=$1::regclass and attgenerated<>''",['public.'+c.table])).rows.map(r=>r.attname);const columns=Object.keys(c.rows[0]).filter(k=>!generated.includes(k));assert.ok(columns.every(k=>/^[a-z_]+$/.test(k)));const names=columns.map(k=>'"'+k+'"').join(',');await q('insert into public.'+c.table+' ('+names+') select '+names+' from jsonb_populate_recordset(null::public.'+c.table+',$1::jsonb)',[JSON.stringify(c.rows)]);}await q('commit');}catch(error){await q('rollback');throw error;}
 catalogCards.push(...collections.find(c=>c.table==='card_prints').rows.map(r=>r.id));catalogSets.push(...collections.find(c=>c.table==='sets').rows.map(r=>r.id));assert.equal(catalogCards.length,326);assert.equal(catalogSets.length,5);
 const artifact=JSON.parse(fs.readFileSync(path.join(root,'apps/web/src/lib/stores/visualMatchIndex.json')));
 for(const ref of artifact.references.filter(r=>['GV-PK-MEW-104','GV-PK-MEW-158'].includes(r.gv_id))){const bytes=fs.readFileSync(path.join(root,'.local/integration/vendor-pilot-20260922/visual-reference-cache',ref.id+'.webp'));assert.equal(hash(bytes),ref.sha256);ok(await admin.storage.from('user-card-images').upload(ref.image_path,bytes,{contentType:'image/webp',upsert:false}));references.push(ref.image_path);}
 const owner={store:{id:ids.store,display_name:'Synthetic real-scan proof',app_published:false,web_published:false},sections:[{id:ids.section,name:'Scan shelf',selected:false}],capabilities:{store_app:true},rollout:{app_enabled:true}};
 harness=await startBrowserHarness({root,fixture,owner,token:sessions[0].access_token,status:async()=>({receipts:(await q('select count(*) from vendor_batch_intake_receipts where owner_id=$1',[users[0]])).rows[0].count,completed:(await q('select count(*) from vendor_batch_intake_receipts where owner_id=$1 and completed_at is not null',[users[0]])).rows[0].count,active:(await q('select count(*) from vault_item_instances where user_id=$1 and archived_at is null',[users[0]])).rows[0].count,cancelled:(await q('select count(*) from vendor_batch_intake_cancellations where owner_id=$1',[users[0]])).rows[0].count})});
 console.log('READY real browser/database proof: http://127.0.0.1:27643 and recovery origin27644; synthetic owners, payments off.');
 fs.writeFileSync(path.join(fixture,'browser-proof-ready.private.json'),JSON.stringify({at:new Date().toISOString(),ids,users}),{flag:'wx'});
 const stop=path.join(fixture,'browser-proof-stop.json');for(let n=0;!fs.existsSync(stop);n++){if(n>3600)throw Error('Browser proof timed out with fixtures retained until cleanup');await delay(2000);}
 const result=JSON.parse(fs.readFileSync(stop));assert.equal(result.status,'passed');report.browser=result;report.reports=harness.reports;report.faults=harness.faults;assert.ok(harness.reports.length>=3);assert.ok(harness.faults.length>=3);
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;process.exitCode=1;console.error(error.message);}
finally {
 if(report.status==='failed')fs.writeFileSync(path.join(output,`browser-${stamp}-failure.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(harness)await harness.close();
 if(child){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(5000)]);}if(log!==undefined)fs.closeSync(log);
 if(connected){
  await q('rollback');
  // Remove only this synthetic run; preserve every prior lab and receipt.
  const uploaded=(await q('select instance_id,owner_id from vendor_batch_intake_receipts where owner_id=any($1::uuid[])',[users])).rows.flatMap(r=>['front','back'].map(side=>`${r.owner_id}/vault-instances/${r.instance_id}/${side}/current`));
  uploaded.push(...references);
  if(uploaded.length)ok(await admin.storage.from('user-card-images').remove(uploaded));
  const events=(await q('select * from card_events where actor_user_id=any($1::uuid[])',[users])).rows;
  fs.writeFileSync(path.join(fixture,`events-${stamp}.private.json`),JSON.stringify(events),{flag:'wx'});
  await q('begin');await q('set local session_replication_role=replica');
  await q('delete from card_events where actor_user_id=any($1::uuid[])',[users]);
  await q('set local session_replication_role=origin');await q('commit');
  await q('delete from vendor_batch_intake_cancellations where owner_id=any($1::uuid[])',[users]);
  await q('delete from vendor_batch_intake_receipts where owner_id=any($1::uuid[])',[users]);
  await q('delete from vault_item_instances where user_id=any($1::uuid[])',[users]);
  await q('delete from vault_items where user_id=any($1::uuid[])',[users]);
  if(catalogCards.length){await q('delete from card_printings where card_print_id=any($1::uuid[])',[catalogCards]);await q('delete from pricing_watch where card_print_id=any($1::uuid[])',[catalogCards]);await q('delete from card_prints where id=any($1::uuid[])',[catalogCards]);await q('delete from sets where id=any($1::uuid[])',[catalogSets]);}
  await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
  await q('delete from card_printings where id=$1',[ids.printing]);await q('delete from pricing_watch where card_print_id=$1',[ids.card]);await q('delete from card_prints where id=$1',[ids.card]);await q('delete from sets where id=$1',[ids.set]);
  for(const user of users)ok(await admin.auth.admin.deleteUser(user));
  ok(await admin.storage.deleteBucket('user-card-images'));
  await q('update vendor_batch_intake_control set enabled=false');await q('update vendor_store_rollout set app_enabled=false,web_enabled=false');
  assert.deepEqual((await q("select to_jsonb(s) as row from sets s order by id")).rows,baselineSets);await db.end();assert.deepEqual(guard({full:true}),before);report.emptyOffGuardPassed=true;
 }
 fs.writeFileSync(path.join(output,`http-${stamp}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report));
