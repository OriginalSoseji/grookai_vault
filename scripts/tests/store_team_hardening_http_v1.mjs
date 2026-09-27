import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {guard,root,fixture,audit,hash} from '../schema/replay_store_team_hardening_v1.mjs';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {captureStorefrontBuildConfig} from '../ci/preserve_storefront_build_config.mjs';
assert.ok(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--browser'));guard();
const browserMode=process.argv[2]==='--browser',stamp=Date.now(),output=path.join(fixture,`http-${stamp}`);fs.mkdirSync(output);
const require=createRequire(path.join(root,'apps/web/package.json')),pgRequire=createRequire('C:/gv_store_billing_20260919/package.json');
const {createClient}=require('@supabase/supabase-js'),{Client}=pgRequire('pg'),sharp=require('sharp');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const api='http://127.0.0.1:29421',origin='http://127.0.0.1:29440';assert.equal(cfg.API_URL,api);
const options={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(api,localSupabaseStatusSecret(cfg),options),anon=createClient(api,cfg.ANON_KEY,options);
const db=new Client({host:'127.0.0.1',port:29422,user:'postgres',password:'postgres',database:'postgres'});await db.connect();
const q=(text,args=[])=>db.query(text,args),ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const users=[],clients=[],sessions=[],paths=[],checks=[];const store=randomUUID();let child,log,restore;
const report={at:new Date().toISOString(),status:'pending',productionWrites:0,checks};
async function http(route,body,index=0,extra={}){
  const form=body instanceof FormData;const response=await fetch(origin+route,{method:body?'POST':'GET',headers:{origin,...(index===null?{}:{authorization:`Bearer ${sessions[index].access_token}`}),...(body&&!form?{'content-type':'application/json'}:{}),...extra},body:body?(form?body:JSON.stringify(body)):undefined,signal:AbortSignal.timeout(90000),redirect:'manual'});
  const text=await response.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:response.status,data,headers:response.headers};
}
const checked=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
try{
  for(const role of ['owner','manager','other']){
    const email=`team-${role}-${stamp}@example.invalid`,password=`Local-${randomBytes(18).toString('hex')}!`;
    const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push({id:user.id,email,password});
    const client=createClient(api,cfg.ANON_KEY,options);clients.push(client);sessions.push(ok(await client.auth.signInWithPassword({email,password})).session);
  }
  fs.writeFileSync(path.join(output,'accounts.private.json'),JSON.stringify({users,store}),{flag:'wx'});
  await q("insert into user_entitlements(user_id,tier,role,features,source) values($1,'vendor','vendor','{\"store_app\":true}','manual')",[users[0].id]);
  await q("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Local team proof')",[store,users[0].id,`team-${stamp}`]);
  await q('update vendor_store_team_control set enabled=true');await q('update vendor_store_rollout set app_enabled=true');
  const env={...process.env};for(const file of ['.env','.env.local','apps/web/.env','apps/web/.env.local'])if(fs.existsSync(path.join(root,file)))for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[m[1]]='';
  for(const key of Object.keys(env))if(/SUPABASE|STRIPE|VERCEL|GROOKAI|NEXT_PUBLIC|DATABASE_URL|POSTGRES_URL/.test(key))env[key]='';
  Object.assign(env,{SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(cfg),NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:origin,SITE_URL:origin,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
  restore=captureStorefrontBuildConfig(path.join(root,'apps/web'),env);log=fs.openSync(path.join(output,'next.private.log'),'wx');
  child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','29440'],{cwd:path.join(root,'apps/web'),env,windowsHide:true,stdio:['ignore',log,log]});
  for(let n=0;;n++){if(child.exitCode!==null)throw new Error('Inspect retained Next log');try{if((await http('/api/stores/team')).status===200)break;}catch{}if(n===50)throw new Error('Next startup timed out');await delay(500);}
  await checked('real authentication, no-store responses, request bounds and origin enforcement',async()=>{
    assert.equal((await http('/api/stores/team',null,null)).status,401);
    assert.equal((await http('/api/stores/team',null,2)).status,403);
    assert.match((await http('/api/stores/team')).headers.get('cache-control'),/no-store/);
    assert.equal((await http('/api/stores/team',{action:'invite',email:users[1].email,permissions:['branding']},0,{origin:'https://example.invalid'})).status,403);
    assert.equal((await http('/api/stores/team',{action:'invite',email:'x'.repeat(9000)})).status,400);
  });
  let invite;
  await checked('owner creates exact-origin link; recipient accepts once; other account denied',async()=>{
    const created=await http('/api/stores/team',{action:'invite',email:users[1].email,permissions:['branding']});assert.equal(created.status,200,JSON.stringify(created.data));invite=new URL(created.data.url);assert.equal(invite.origin,origin);
    const body={token:invite.searchParams.get('token')};assert.equal((await http('/api/stores/team/accept',body,2)).status,403);
    assert.equal((await http('/api/stores/team/accept',body,1)).status,200);assert.equal((await http('/api/stores/team/accept',body,1)).status,200);
    const managed=await http('/api/stores/team/managed',null,1);assert.equal(managed.status,200);assert.deepEqual(managed.data.map(s=>s.id),[store]);
  });
  await checked('workspace projection, branding write and manager team-administration denial',async()=>{
    const workspace=await http(`/api/stores/team/${store}`,null,1);assert.equal(workspace.status,200);assert.deepEqual(workspace.data.permissions,['branding']);assert.equal(workspace.data.total,0);
    assert.equal((await http(`/api/stores/team/${store}`,{action:'branding',expected:workspace.data.store.updated_at,name:'Team managed store',description:'Local proof'},1)).status,200);
    assert.equal((await http('/api/stores/team',{action:'invite',email:users[2].email,permissions:['inventory']},1)).status,403);
    assert.equal((await http(`/api/stores/team/${randomUUID()}`,null,1)).status,403);
  });
  const image=await sharp({create:{width:96,height:96,channels:3,background:'#3b9b67'}}).png().toBuffer();
  await checked('real private branding upload/download, foreign store and anonymous storage denied',async()=>{
    const form=new FormData();form.set('kind','logo');form.set('file',new File([image],'fixture.png',{type:'image/png'}));
    const result=await http(`/api/stores/team/${store}/media`,form,1);assert.equal(result.status,200,JSON.stringify(result.data));
    const p=(await q('select logo_path from vendor_stores where id=$1',[store])).rows[0].logo_path;paths.push(p);
    assert.ok((await anon.storage.from('vendor-store-media').download(p)).error);
    assert.ok((await clients[2].storage.from('vendor-store-media').download(p)).error);
    const imageResponse=await fetch(`${origin}/api/stores/team/${store}/media?kind=logo`,{headers:{authorization:`Bearer ${sessions[1].access_token}`}});assert.equal(imageResponse.status,200);assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()),image);
    assert.equal((await http(`/api/stores/team/${store}/media?kind=logo`,null,2)).status,404);
    const direct=store+'/banner/'+randomUUID()+'.png';
    assert.ok((await clients[1].storage.from('vendor-store-media').upload(direct,image,{contentType:'image/png'})).error);
    assert.ok((await clients[1].storage.from('vendor-store-media').upload(direct,Buffer.from('not an image'),{contentType:'image/png'})).error);
    const wrong=`${randomUUID()}/logo/${randomUUID()}.png`;assert.ok((await clients[1].storage.from('vendor-store-media').upload(wrong,image,{contentType:'image/png'})).error);
    await q("insert into vendor_store_team_events(store_id,actor_id,action,subject_id) select $1,$2,'branding_upload',$1 from generate_series(1,19)",[store,users[1].id]);
    const limited=new FormData();limited.set('kind','banner');limited.set('file',new File([image],'valid.png',{type:'image/png'}));
    assert.equal((await http(`/api/stores/team/${store}/media`,limited,1)).status,400);
    assert.equal(Number((await q("select count(*) from storage.objects where bucket_id='vendor-store-media' and name like $1",[store+'/%'])).rows[0].count),1);
  });
  await checked('malformed media refused and revocation blocks storage and workspace immediately',async()=>{
    const bad=new FormData();bad.set('kind','logo');bad.set('file',new File(['not an image'],'fake.png',{type:'image/png'}));assert.equal((await http(`/api/stores/team/${store}/media`,bad,1)).status,400);
    assert.equal((await http('/api/stores/team',{action:'revoke',subject:users[1].id})).status,200);
    assert.equal((await http(`/api/stores/team/${store}`,null,1)).status,403);assert.ok((await clients[1].storage.from('vendor-store-media').download(paths[0])).error);
  });
  await checked('invitation survives safe auth redirect with private/no-referrer headers',async()=>{
    const response=await http(invite.pathname+invite.search,null,null);assert.equal(response.status,307);assert.match(response.headers.get('location'),/login\?next=/);assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.match(response.headers.get('cache-control'),/no-store/);
  });
  report.status='passed';
  if(browserMode){
    console.log(JSON.stringify({status:'browser_ready',origin,accounts:path.join(output,'accounts.private.json'),stopFile:path.join(output,'stop'),store}));
    fs.writeFileSync(path.join(fixture,'browser-ready.private.json'),JSON.stringify({origin,output,store,accounts:path.join(output,'accounts.private.json')}));
    while(!fs.existsSync(path.join(output,'stop'))){await delay(1000);if(child.exitCode!==null)throw new Error('Local server exited during browser proof');}
  }
}catch(error){report.status='failed';report.error=error.message;process.exitCode=1;console.error(error.message);}finally{
  if(child){child.kill();await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(5000)]);}if(log!==undefined)fs.closeSync(log);restore?.();
  if(paths.length)ok(await admin.storage.from('vendor-store-media').remove(paths));
  for(const user of users)ok(await admin.auth.admin.deleteUser(user.id));
  await q('update vendor_store_team_control set enabled=false');await q('update vendor_store_rollout set app_enabled=false');await db.end();guard();
  report.sourceHashes={};for(const file of ['apps/web/src/lib/stores/storeTeamServer.ts','apps/web/src/app/api/stores/team/route.ts','apps/web/src/app/api/stores/team/[storeId]/route.ts','apps/web/src/app/api/stores/team/[storeId]/media/route.ts'])report.sourceHashes[file]=hash(fs.readFileSync(path.join(root,file)));
  fs.writeFileSync(path.join(audit,`http-${stamp}.json`),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
}
