// Real Auth/PostgREST and HTTP handler/repository proof, synthetic Stripe SDK
// transport only. Actual Next routes, cookie-authenticated SSR and signed
// webhook delivery follow; interactive browser coverage remains separate.
import './vendor_storefront_network_guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {captureStorefrontBuildConfig} from '../ci/preserve_storefront_build_config.mjs';
import {createSellerAdoptionRepository} from '../../apps/web/src/lib/payments/vendorSellerAdoptionRepository.ts';
import {createSellerAdoptionService} from '../../apps/web/src/lib/payments/vendorSellerAdoptionService.ts';
import {createSellerAdoptionHandlers} from '../../apps/web/src/lib/payments/vendorSellerAdoptionHttp.ts';
import {createSellerAdoptionOperator} from '../stripe/seller_adoption_operator_v1.mjs';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
assert.equal(process.argv.length,2);
const root='C:/gv_store_seller_link_20260928',project='grookai-seller-link-20260928';
const stamp=Date.now();
const base=root+'/.local/integration/seller-adoption-v1',fixture=base+'/replay-409',out=base+'/http-proof-'+stamp;
const hash=x=>createHash('sha256').update(x).digest('hex');
const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
const proof=JSON.parse(fs.readFileSync(fixture+'/receipt.json'));assert.equal(proof.status,'passed');assert.equal(proof.fullReplay,true);assert.deepEqual(proof.sourceHashes,sources);
assert.ok(!fs.existsSync(out),'Preserve prior proof; do not reuse fixtures');
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();
const container='supabase_db_'+project,dbInfo=JSON.parse(docker('inspect',container))[0];
assert.equal(dbInfo.State.Running,true);assert.deepEqual(Object.keys(dbInfo.NetworkSettings.Networks),[project]);
assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
const sql=q=>execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
// Earlier attempts remain intact. Admit only this runner's synthetic namespace
// in the already-qualified dedicated lab, never reset its retained evidence.
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users where email not like 'adoption-%@example.invalid')||'|'||(select count(*) from vendor_seller_accounts where stripe_account_id not like 'acct_localAdoptionPlatform%')||'|'||(select count(*) from card_prints)"),'0|0|0|0');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const api='http://127.0.0.1:30221',origin='http://127.0.0.1:30240';assert.equal(cfg.API_URL,api);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),Stripe=require('stripe');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(api,localSupabaseStatusSecret(cfg),options),anon=createClient(api,cfg.ANON_KEY,options);
const repo=createSellerAdoptionRepository(admin),scope={accountId:'acct_localAdoptionPlatform'+stamp,livemode:false};
const accountId=i=>'acct_localAdoption'+stamp+'Owner'+i;
const bindingCount=()=>sql(`select count(*) from vendor_seller_accounts where stripe_account_id='${scope.accountId}'`);
const users=[],clients=[],sessions=[],stores=[],accounts=new Map(),calls=[],checks=[];let enabled=true;
let next,log,restore,harnessClosed=false;
const ok=r=>{assert.equal(r.error,null,r.error?.message);return r.data;};
const now=()=>Math.floor(Date.now()/1000);
const stripe=new Stripe(['sk','test','syntheticOnly'].join('_'),{apiVersion:STRIPE_BILLING_API_VERSION,telemetry:false,maxNetworkRetries:0,
 httpClient:Stripe.createFetchHttpClient(async(url,request)=>{
  assert.equal(request.method,'GET');assert.equal(new URL(url).origin,'https://api.stripe.com');
  const p=new URL(url).pathname,headers=new Headers(request.headers);let body;
  if(p==='/v1/account')body={object:'account',id:scope.accountId};
  else if(p==='/v1/balance'){assert.ok(headers.get('stripe-account')===null||accounts.has(headers.get('stripe-account')));body={object:'balance',livemode:false};}
  else {const id=p.replace('/v1/accounts/','');assert.ok(accounts.has(id));body=accounts.get(id);}
  calls.push({path:p,method:request.method});return Response.json(body);
 })});
const service=createSellerAdoptionService({repo,stripe,scope});
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url!=='/api/vendor-payments/adoption'){res.writeHead(404);return res.end();}
  const handlers=createSellerAdoptionHandlers({origin:()=>origin,service:()=>enabled?service:null,authenticate:async()=>{
   const token=req.headers.authorization?.replace(/^Bearer /,'');if(!token)return null;
   const {data,error}=await anon.auth.getUser(token);return error||!data.user?.email?null:
    {id:data.user.id,email:data.user.email,emailConfirmed:Boolean(data.user.email_confirmed_at)};
  }});
  let body='';for await(const part of req){body+=part;if(body.length>1024)break;}
  const result=req.method==='GET'?await handlers.GET():await handlers.POST(new Request(origin+req.url,{method:'POST',headers:req.headers,body}));
  res.writeHead(result.status,Object.fromEntries(result.headers));res.end(await result.text());
 }catch{res.writeHead(500);res.end('Local harness failed');}
});
const request=async(index=0,body,originOverride=origin)=>{
 const response=await fetch(origin+'/api/vendor-payments/adoption',{method:body===undefined?'GET':'POST',
  headers:{origin:originOverride,...(index===null?{}:{authorization:`Bearer ${sessions[index].access_token}`}), 'content-type':'application/json'},
  ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
 return {status:response.status,body:await response.json(),headers:response.headers};
};
const check=async(name,fn)=>{await fn();checks.push(name);console.log('PASS '+name);};
fs.mkdirSync(out);let failure;
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(30240,'127.0.0.1',resolve);});
 for(let i=0;i<3;i++){
  const email=`adoption-${stamp}-${i}@example.invalid`,password=randomUUID()+randomUUID();
  const user=ok(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(user);
  const client=createClient(api,cfg.ANON_KEY,options);clients.push(client);sessions.push(ok(await client.auth.signInWithPassword({email,password})).session);
  const store=randomUUID();stores.push(store);ok(await admin.from('vendor_stores').insert({id:store,owner_id:user.id,slug:`adoption-${stamp}-${i}`,display_name:'Synthetic adoption'}));
  ok(await admin.from('user_entitlements').insert({user_id:user.id,tier:'vendor',role:'vendor',features:{store_app:true},source:'manual'}));
  accounts.set(accountId(i),{object:'account',id:accountId(i),email,created:now()-86400,metadata:{},
   controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}}});
 }
 sql('update vendor_store_rollout set app_enabled=true;');
 await check('real Auth, missing grant, origin and caller authority boundaries',async()=>{
  assert.equal((await request(null)).status,401);assert.equal((await request()).body.available,false);
  assert.equal((await request(0,{action:'connect'})).status,503);assert.equal(calls.length,0);
  assert.equal((await request(0,{action:'connect'},'https://foreign.invalid')).status,403);
  assert.equal((await request(0,{action:'connect',ownerId:users[1].id})).status,400);
  assert.equal((await request(0,{action:'connect',padding:'x'.repeat(300)})).status,400);
 });
 const operator=createSellerAdoptionOperator({projectRef:project,migrationSha256:sources['20260928213000_vendor_seller_adoption_v1.sql'],scope,stripe,repo:{
  async inspect(ownerId,storeId){const user=ok(await admin.auth.admin.getUserById(ownerId)).user;
   const store=ok(await admin.from('vendor_stores').select('id,owner_id').eq('id',storeId).single());assert.equal(store.owner_id,ownerId);
   return {owner:{id:user.id,email:user.email,emailConfirmed:Boolean(user.email_confirmed_at)},storeId:store.id,eligible:true,
    hasBinding:Boolean(await repo.binding(ownerId)),hasGrant:Boolean(await repo.grant(ownerId))};},
  async assertReleased(h){assert.equal(h,sources['20260928213000_vendor_seller_adoption_v1.sql']);assert.equal(proof.migrations,409);},
  async issue(plan,evidence){return ok(await admin.rpc('vendor_seller_issue_adoption_v1',{p_plan:plan,p_evidence:evidence}));},
 }});
 const plans=[];
 await check('real service RPC issues approval from offline verified provider, never binds',async()=>{
  for(let i=0;i<2;i++){const p=await operator.plan({ownerId:users[i].id,storeId:stores[i],connectedAccountId:accountId(i)});plans.push(p);await operator.apply(p,p.sha256);}
  assert.equal(bindingCount(),'0');assert.equal((await request()).body.available,true);
 });
 await check('public roles cannot read or write approvals or call privileged RPCs',async()=>{
  for(const client of [anon,...clients]){
   assert.ok((await client.from('vendor_seller_adoption_grants').select('*')).error);
   assert.ok((await client.rpc('vendor_seller_issue_adoption_v1',{p_plan:plans[0],p_evidence:{}})).error);
   assert.ok((await client.rpc('vendor_seller_adopt_v1',{p_owner_id:users[0].id,p_grant_id:plans[0].grant.id,p_evidence:{}})).error);
  }
  assert.ok((await admin.from('vendor_seller_adoption_grants').insert({})).error);
  assert.equal((await request(2)).body.available,false);assert.equal((await request(2,{action:'connect'})).status,503);
 });
 await check('disabled app route and revocation block connection',async()=>{
  enabled=false;assert.equal((await request()).body.available,false);assert.equal((await request(0,{action:'connect'})).status,503);enabled=true;
  ok(await admin.from('vendor_seller_adoption_grants').update({enabled:false}).eq('id',plans[1].grant.id));
  assert.equal((await request(1)).body.available,false);assert.equal((await request(1,{action:'connect'})).status,503);
 });
 await check('package downgrade denies database consume despite provider verification',async()=>{
  ok(await admin.from('user_entitlements').update({features:{store_app:false}}).eq('user_id',users[0].id));
  assert.equal((await request(0,{action:'connect'})).status,503);assert.equal(bindingCount(),'0');
  ok(await admin.from('user_entitlements').update({features:{store_app:true}}).eq('user_id',users[0].id));
 });
 await check('concurrent HTTP owner connections produce one durable exact binding',async()=>{
  const results=await Promise.all([request(0,{action:'connect'}),request(0,{action:'connect'})]);
  for(const result of results){assert.equal(result.status,200);assert.deepEqual(result.body,{connected:true});assert.match(result.headers.get('cache-control'),/private, no-store/);}
  assert.equal(bindingCount(),'1');assert.equal((await request()).body.available,false);
  const status=ok(await clients[0].rpc('vendor_seller_owner_status_v1'));assert.equal(status.binding.hasConnectedAccount,true);assert.ok(!JSON.stringify(status).includes('acct_'));
  assert.equal(ok(await clients[2].rpc('vendor_seller_owner_status_v1')).binding,null);
 });
 // Switch from the injectable provider harness to the actual Next route. The
 // existing-binding retry makes no provider request, while testing production
 // routing/Auth/runtime configuration and the real signed webhook end to end.
 await new Promise(resolve=>server.close(resolve));server.closeAllConnections();harnessClosed=true;
 const env={...process.env};
 for(const file of ['.env','.env.local','apps/web/.env','apps/web/.env.local'])if(fs.existsSync(path.join(root,file)))
  for(const m of fs.readFileSync(path.join(root,file),'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm))env[m[1]]='';
 for(const key of Object.keys(env))if(/SUPABASE|STRIPE|VERCEL|GROOKAI|NEXT_PUBLIC|DATABASE_URL|POSTGRES_URL/.test(key))env[key]='';
 const webhookSecret=['whsec','syntheticOnlyNeverRealSecret'].join('_');
 Object.assign(env,{SUPABASE_URL:api,NEXT_PUBLIC_SUPABASE_URL:api,SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:cfg.ANON_KEY,NEXT_PUBLIC_SUPABASE_ANON_KEY:cfg.ANON_KEY,
  SUPABASE_SECRET_KEY:localSupabaseStatusSecret(cfg),NEXT_PUBLIC_COLLECTOR_STAGING:'true',NEXT_PUBLIC_VENDOR_BATCH_LOCAL_TEST:'true',
  GROOKAI_DISABLE_TELEMETRY:'1',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_SITE_URL:origin,SITE_URL:origin,
  GROOKAI_VENDOR_PAYMENTS_ENABLED:'true',GROOKAI_VENDOR_SELLER_ADOPTION_ENABLED:'true',GROOKAI_VENDOR_ONBOARDING_ENABLED:'false',
  STRIPE_PAYMENTS_MODE:'test',STRIPE_SECRET_KEY:['sk','test','syntheticOnly'].join('_'),STRIPE_ACCOUNT_ID:scope.accountId,
  STRIPE_CONNECT_WEBHOOK_SECRET:webhookSecret,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 restore=captureStorefrontBuildConfig(path.join(root,'apps/web'),env);
 log=fs.openSync(out+'/next.private.log','wx');
 next=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port','30240'],
  {cwd:path.join(root,'apps/web'),env,windowsHide:true,stdio:['ignore',log,log]});
 for(let n=0;;n++){if(next.exitCode!==null)throw new Error('Next server exited; inspect private log');
  try{if((await request(null)).status===401)break;}catch{}if(n===60)throw new Error('Next startup timed out');await delay(500);}
 await check('actual Next route Auth, retained connection, foreign scope and page render',async()=>{
  assert.equal((await request(null)).status,401);assert.equal((await request()).body.available,false);
  assert.deepEqual((await request(0,{action:'connect'})).body,{connected:true});
  assert.equal((await request(2,{action:'connect'})).status,503);
  assert.equal((await request(0,{action:'connect'},'https://foreign.invalid')).status,403);
  assert.equal((await request(0,{action:'connect',accountId:accountId(0)})).status,400);
  const jar=new Map();
  const cookieClient=require('@supabase/ssr').createServerClient(api,cfg.ANON_KEY,{cookies:{
   getAll:()=>Array.from(jar,([name,value])=>({name,value})),
   setAll:values=>{for(const {name,value} of values)jar.set(name,value);},
  }});
  ok(await cookieClient.auth.setSession(sessions[0]));
  const cookie=Array.from(jar,([name,value])=>`${name}=${encodeURIComponent(value)}`).join('; ');
  const page=await fetch(origin+'/account/store/payments',{headers:{cookie},redirect:'manual',signal:AbortSignal.timeout(90000)});
  assert.equal(page.status,200);assert.ok((await page.text()).includes('Seller payments'),'Authenticated seller page must render');
 });
 await check('actual signed Next webhook deauthorizes and prevents reconnection',async()=>{
  const event={object:'event',id:'evt_localAdoptionRevoked'+stamp,type:'account.application.deauthorized',api_version:STRIPE_BILLING_API_VERSION,
   livemode:false,account:accountId(0),created:now(),data:{object:{object:'application',id:'ca_synthetic'}}};
  const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:webhookSecret,timestamp:now()});
  for(let i=0;i<2;i++){
   const response=await fetch(origin+'/api/vendor-payments/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload});
   assert.equal(response.status,200,await response.text());
  }
  assert.equal((await request(0,{action:'connect'})).status,503);assert.equal((await repo.binding(users[0].id)).state,'deauthorized');
 });
}catch(error){failure=error;}finally{
 if(!harnessClosed){await new Promise(resolve=>server.close(resolve));server.closeAllConnections();}
 if(next){next.kill();await Promise.race([new Promise(resolve=>next.once('exit',resolve)),delay(5000)]);}
 if(log!==undefined)fs.closeSync(log);restore?.();
 // Retain synthetic rows as evidence; never reset this populated fixture.
 const receipt={status:failure?'failed':'passed',at:new Date().toISOString(),project,realAuth:true,
  transport:'Real Auth/PostgREST; injectable GET-only Stripe harness; actual Next routes, SSR and signed webhook',
  nextRoutes:checks.some(name=>name.startsWith('actual Next route')),
  signedWebhook:checks.some(name=>name.startsWith('actual signed Next webhook')),browserVisualProof:false,checks,
  migrationSha256:sources['20260928213000_vendor_seller_adoption_v1.sql'],sourceHashes:sources,
  commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  sourceDirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0,
  providerRequests:0,syntheticSdkGetCount:calls.length,productionWrites:0,fixturesRetained:true};
 fs.writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2),{flag:'wx'});
 console.log(JSON.stringify({status:receipt.status,checks:checks.length,realAuth:true,providerRequests:0,productionWrites:0}));
}
if(failure)throw failure;
