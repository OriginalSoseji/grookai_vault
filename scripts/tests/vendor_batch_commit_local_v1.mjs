// Real Auth, Storage, Next handlers and DB concurrency; fixed synthetic 264xx only.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,output,project,guard,hash} from '../schema/vendor_batch_private_copy_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const before=guard({full:true}),replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,before.sourceHashes);
const require=createRequire(path.join(root,'apps/web/package.json'));
const {createClient}=require('@supabase/supabase-js'),{Client}=require('pg'),sharp=require('sharp');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const api='http://127.0.0.1:26421',origin='http://127.0.0.1:26440';
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(25000)})}};
const admin=createClient(api,cfg.SERVICE_ROLE_KEY,options),anon=createClient(api,cfg.ANON_KEY,options);
const db=new Client({host:'127.0.0.1',port:26422,user:'postgres',password:'postgres',database:'postgres'});
const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),privateFile=path.join(fixture,`http-${stamp}.private.json`);
const ids={set:randomUUID(),card:randomUUID(),printing:randomUUID(),section:randomUUID(),store:randomUUID(),otherStore:randomUUID(),batch:randomUUID()};
const users=[],sessions=[],paths=[],checks=[];
const report={at:new Date().toISOString(),project,checks,productionWrites:0,providerRequests:0};
let child,log,connected=false;
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
 await db.connect();connected=true;
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
 Object.assign(env,{SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:cfg.SERVICE_ROLE_KEY,NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',GROOKAI_STORE_BATCH_COMMIT_ENABLED:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:origin,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 log=fs.openSync(path.join(fixture,`next-${stamp}.private.log`),'wx');
 child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','26440'],{cwd:path.join(root,'apps/web'),env,windowsHide:true,stdio:['ignore',log,log]});
 for(let n=0;;n++) {if(child.exitCode!==null)throw new Error('Local Next server stopped; inspect private log');try {const r=await http('',null,undefined,'GET');if(r.status===200)break;}catch{}if(n>=40)throw new Error('Local Next server did not become ready');await delay(500);}
 await checked('real owner capability, anonymous and foreign-origin rejection',async()=>{
  const caps=await http('',null,undefined,'GET');assert.equal(caps.data.commit,true);assert.match(caps.headers.get('cache-control'),/no-store/);
  assert.equal((await http('',request(),null)).status,401);
  assert.equal((await http('',request(),undefined,'POST',{origin:'https://example.invalid'})).status,403);
 });
 const data=request();
 await checked('concurrent HTTP preparation allocates exactly one hidden hold copy',async()=>{
  const rows=await Promise.all([http('',data),http('',data)]);rows.forEach(r=>assert.equal(r.status,200,JSON.stringify(r.data)));
  const receipt=await getReceipt(data);const v=(await q('select * from vault_item_instances where id=$1',[receipt.instance_id])).rows[0];
  assert.ok(v.archived_at);assert.equal(v.intent,'hold');assert.equal(v.legacy_vault_item_id,null);
  assert.equal((await q('select count(*) from vault_item_instances')).rows[0].count,'1');
  assert.equal((await q('select count(*) from vendor_store_items')).rows[0].count,'0');
 });
 await checked('changed retries conflict and foreign owners cannot read or upload a receipt',async()=>{
  assert.equal((await http('',{...data,amount:'99.00'})).status,409);
  assert.equal((await http('?'+new URLSearchParams({batch:data.batch_id,item:data.item_id}),null,sessions[1].access_token,'GET')).status,404);
  assert.equal((await http('/media?'+new URLSearchParams({batch:data.batch_id,item:data.item_id,side:'front'}),image,sessions[1].access_token)).status,409);
  assert.equal((await prepare(data,users[1],ids.store)).error?.code,'42501');
 });
 await checked('missing media and changed bytes leave the prepared copy invisible',async()=>{
  assert.equal((await finish(data)).status,409);
  assert.equal((await http('/media?'+new URLSearchParams({batch:data.batch_id,item:data.item_id,side:'front'}),Buffer.from('not the saved scan'))).status,409);
  const uploaded=await upload(data,'front');assert.equal(uploaded.status,200,JSON.stringify(uploaded.data));assert.equal((await finish(data)).status,409);
  const receipt=await getReceipt(data),p=`${users[0]}/vault-instances/${receipt.instance_id}/front/current`;paths.push(p);
  assert.ok((await anon.storage.from('user-card-images').download(p)).error);
  assert.equal((await q('select count(*) from vault_item_instances where archived_at is null')).rows[0].count,'0');
 });
 await checked('media retry, completed retry and concurrent finish preserve one GVVI',async()=>{
  assert.equal((await upload(data,'front')).status,200);assert.equal((await upload(data,'back')).status,200);
  const r=await getReceipt(data);paths.push(`${users[0]}/vault-instances/${r.instance_id}/back/current`);
  const [a,b]=await Promise.all([finish(data),finish(data)]);assert.equal(a.status,200,JSON.stringify(a.data));assert.deepEqual(a.data,b.data);assert.equal(b.status,200);
  assert.deepEqual((await finish(data)).data,a.data);
  assert.equal((await http('',data)).data.completed,true);
  const v=(await q('select * from vault_item_instances where id=$1',[r.instance_id])).rows[0];
  assert.equal(v.archived_at,null);assert.equal(v.intent,'sell');assert.equal(Number(v.asking_price_amount),12.5);assert.equal(v.notes,'Private bin 7');
  assert.equal((await q('select qty from vault_items where id=$1',[v.legacy_vault_item_id])).rows[0].qty,1);
  assert.equal((await q('select count(*) from wall_section_memberships where vault_item_instance_id=$1',[v.id])).rows[0].count,'1');
  assert.equal((await q('select count(*) from vendor_store_items')).rows[0].count,'1');
  assert.equal((await q('select count(*) from vendor_stores where app_published or web_published')).rows[0].count,'0');
 });
 await checked('separate physical items with identical scans retain separate identities',async()=>{
  const other=request({back_sha256:null,intent:'hold',amount:'',list:false,sections:[]});assert.equal((await http('',other)).status,200);assert.equal((await upload(other,'front')).status,200);
  const r=await getReceipt(other);paths.push(`${users[0]}/vault-instances/${r.instance_id}/front/current`);
  const result=await finish(other);assert.equal(result.status,200,JSON.stringify(result.data));assert.notEqual(result.data.id,(await finish(data)).data.id);
  assert.equal((await q('select count(*) from vendor_store_items')).rows[0].count,'1');
  assert.ok((await anon.storage.from('user-card-images').download(paths.at(-1))).error);
 });
 await checked('quarantine, wrong printing, foreign section and private profile deny admission',async()=>{
  assert.equal((await http('',request({printing_id:randomUUID()}))).status,409);
  assert.equal((await http('',request({sections:[randomUUID()]}))).status,403);
  await q("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic batch proof')",[ids.printing]);
  assert.equal((await http('',request())).status,409);await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
  await q('update public_profiles set vault_sharing_enabled=false where user_id=$1',[users[0]]);
  assert.equal((await http('',request())).status,409);await q('update public_profiles set vault_sharing_enabled=true where user_id=$1',[users[0]]);
 });
 await checked('publication revalidation after upload rolls back all active inventory changes',async()=>{
  const pending=request({back_sha256:null});assert.equal((await http('',pending)).status,200);assert.equal((await upload(pending,'front')).status,200);
  const r=await getReceipt(pending);
  await q("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic post-upload quarantine')",[ids.printing]);
  assert.equal((await finish(pending)).status,409);
  assert.ok((await q('select archived_at from vault_item_instances where id=$1',[r.instance_id])).rows[0].archived_at);
  assert.equal((await getReceipt(pending)).completed_at,null);
  await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
  assert.equal((await finish(pending)).status,200);
 });
 await checked('completed retries preserve owner photo replacements and do not reactivate archived copies',async()=>{
  const r=await getReceipt(data),p=`${users[0]}/vault-instances/${r.instance_id}/front/current`;
  const replacement=await sharp({create:{width:128,height:180,channels:3,background:'#a06020'}}).jpeg().toBuffer();
  ok(await admin.storage.from('user-card-images').upload(p,replacement,{contentType:'image/jpeg',upsert:true}));
  assert.equal((await upload(data,'front')).status,200);
  const read=ok(await admin.storage.from('user-card-images').download(p,{cacheNonce:randomUUID()},{cache:'no-store'}));
  assert.equal(createHash('sha256').update(Buffer.from(await read.arrayBuffer())).digest('hex'),createHash('sha256').update(replacement).digest('hex'));
  await q('update vault_item_instances set archived_at=now() where id=$1',[r.instance_id]);assert.equal((await finish(data)).status,200);
  assert.ok((await q('select archived_at from vault_item_instances where id=$1',[r.instance_id])).rows[0].archived_at);
  assert.ok((await anon.storage.from('user-card-images').download(p)).error);
 });
 await checked('fifty physical items per batch is enforced by database authority',async()=>{
  const batch=randomUUID();
  for(let n=0;n<50;n++)ok(await prepare(request({batch_id:batch,intent:'hold',list:false,amount:'',sections:[],back_sha256:null})));
  assert.equal((await prepare(request({batch_id:batch,intent:'hold',list:false,amount:'',sections:[],back_sha256:null}))).error?.code,'22023');
 });
 await checked('database pause denies both HTTP uploads and direct finalization',async()=>{
  await q('update vendor_batch_intake_control set enabled=false');
  assert.equal((await upload(data,'front')).status,503);
  assert.equal((await admin.rpc('vendor_batch_intake_finish_v1',{p_owner:users[0],p_store:ids.store,p_batch:data.batch_id,p_item:data.item_id})).error?.code,'42501');
  await q('update vendor_batch_intake_control set enabled=true');
 });
 await checked('direct authenticated RPC and receipt writes are denied; expired access retains owner receipt reads',async()=>{
  const owner=createClient(api,cfg.ANON_KEY,{...options,global:{...options.global,headers:{authorization:'Bearer '+sessions[0].access_token}}});
  assert.ok((await owner.rpc('vendor_batch_intake_prepare_v1',{p_owner:users[0],p_store:ids.store,p_data:request()})).error);
  assert.ok((await owner.from('vendor_batch_intake_receipts').delete().eq('owner_id',users[0])).error);
  await q('update user_entitlements set is_active=false where user_id=$1',[users[0]]);
  assert.equal((await http('',request())).status,403);assert.equal((await prepare(request())).error?.code,'42501');
  assert.equal((await http('?'+new URLSearchParams({batch:data.batch_id,item:data.item_id}),null,undefined,'GET')).status,200);
 });
 report.status='passed';
}catch(error){report.status='failed';report.failure=error.message;process.exitCode=1;console.error(error.message);}
finally {
 if(report.status==='failed')fs.writeFileSync(path.join(output,`http-${stamp}-failure.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 if(child){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(5000)]);}if(log!==undefined)fs.closeSync(log);
 if(connected){
  // Remove only this synthetic run; preserve every prior lab and receipt.
  const uploaded=(await q('select instance_id,owner_id from vendor_batch_intake_receipts where owner_id=any($1::uuid[])',[users])).rows.flatMap(r=>['front','back'].map(side=>`${r.owner_id}/vault-instances/${r.instance_id}/${side}/current`));
  if(uploaded.length)ok(await admin.storage.from('user-card-images').remove(uploaded));
  const events=(await q('select * from card_events where actor_user_id=any($1::uuid[])',[users])).rows;
  fs.writeFileSync(path.join(fixture,`events-${stamp}.private.json`),JSON.stringify(events),{flag:'wx'});
  await q('begin');await q('set local session_replication_role=replica');
  await q('delete from card_events where actor_user_id=any($1::uuid[])',[users]);
  await q('set local session_replication_role=origin');await q('commit');
  await q('delete from vendor_batch_intake_receipts where owner_id=any($1::uuid[])',[users]);
  await q('delete from vault_item_instances where user_id=any($1::uuid[])',[users]);
  await q('delete from vault_items where user_id=any($1::uuid[])',[users]);
  await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
  await q('delete from card_printings where id=$1',[ids.printing]);await q('delete from pricing_watch where card_print_id=$1',[ids.card]);await q('delete from card_prints where id=$1',[ids.card]);await q('delete from sets where id=$1',[ids.set]);
  for(const user of users)ok(await admin.auth.admin.deleteUser(user));
  ok(await admin.storage.deleteBucket('user-card-images'));
  await q('update vendor_batch_intake_control set enabled=false');await q('update vendor_store_rollout set app_enabled=false,web_enabled=false');
  await db.end();assert.deepEqual(guard({full:true}),before);report.emptyOffGuardPassed=true;
 }
 fs.writeFileSync(path.join(output,`http-${stamp}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
console.log(JSON.stringify(report));
