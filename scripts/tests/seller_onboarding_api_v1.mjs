// Actual Auth/PostgREST adapter and orchestration on fixed empty 188xx only.
// Stripe's complete SDK transport is replaced; no provider/network activation.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {execFileSync} from 'node:child_process';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';
import {root,fixture,project,output,hash,guard,sql} from '../schema/seller_bindings_runtime_v1.mjs';
import {createVendorSellerRepository} from '../../apps/web/src/lib/payments/vendorSellerRepository.ts';
import {createVendorSellerService} from '../../apps/web/src/lib/payments/vendorSellerService.ts';
import {createVendorSellerHandlers} from '../../apps/web/src/lib/payments/vendorSellerHandlers.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
assert.equal(process.argv.length,2);const initial=guard({full:true});
const replay=JSON.parse(fs.readFileSync(path.join(output,'replay.json')));assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,initial.sourceHashes);
assert.equal(sql('select (select count(*) from vendor_seller_accounts)||\'|\'||(select count(*) from vendor_seller_events);'),'0|0');
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js'),Stripe=require('stripe');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:18821');assert.ok(cfg.SECRET_KEY.startsWith('sb_secret_'));
const localFetch=(input,init)=>{assert.equal(new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url).origin,cfg.API_URL);return fetch(input,init);};
const client=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:localFetch}});
const admin=client(cfg.SECRET_KEY),repo=createVendorSellerRepository(admin),owners=[],clients=[],checks=[],calls=[];
const config={scope:{accountId:'acct_localSellerOnboarding',livemode:false},secretKey:['sk','test','syntheticOnly'].join('_'),webhookSecret:['whsec','syntheticOnlyNeverRealSecret'].join('_')};
let account,ownerSession=0;const now=()=>Math.floor(Date.now()/1000);
const stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,maxNetworkRetries:0,telemetry:false,httpClient:Stripe.createFetchHttpClient(async(url,options)=>{
 assert.equal(new URL(url).origin,'https://api.stripe.com');const p=new URL(url).pathname,headers=new Headers(options.headers),body=new URLSearchParams(options.body??'');calls.push({path:p,method:options.method});let result;
 if(p==='/v1/account'&&options.method==='GET')result={object:'account',id:config.scope.accountId};
 else if(p==='/v1/balance'&&options.method==='GET'){assert.ok([null,'acct_localSeller'].includes(headers.get('stripe-account')));result={object:'balance',livemode:false};}
 else if(p==='/v1/accounts'&&options.method==='POST'){
  const a=await repo.account(owners[0]);assert.equal(a.state,'creating');assert.ok(a.creation_started_at);assert.equal(body.get('metadata[grookai_seller_attempt]'),a.creation_attempt_id);
  assert.equal(headers.get('idempotency-key'),`grookai-seller:${config.scope.accountId}:test:${a.creation_attempt_id}`);
  result=account??={object:'account',id:'acct_localSeller',created:now(),metadata:{grookai_seller_version:'vendor-seller-v1',grookai_seller_binding:a.id,grookai_seller_attempt:a.creation_attempt_id},
   controller:{type:'application',is_controller:true,fees:{payer:'account'},losses:{payments:'stripe'},requirement_collection:'stripe',stripe_dashboard:{type:'full'}},
   details_submitted:false,charges_enabled:false,payouts_enabled:false,capabilities:{card_payments:'inactive',transfers:'inactive'},requirements:{currently_due:['business_profile.url'],past_due:[],pending_verification:[],eventually_due:[],disabled_reason:null}};
 }else if(p==='/v1/accounts/acct_localSeller'&&options.method==='GET')result=account;
 else if(p==='/v1/account_links'&&options.method==='POST'){assert.equal((await repo.account(owners[0])).state,'bound');result={object:'account_link',created:now(),expires_at:now()+300,url:'https://connect.stripe.com/setup/localSynthetic'};}
 else throw new Error('Unexpected offline provider request');
 return new Response(JSON.stringify(result),{status:200,headers:{'content-type':'application/json'}});
})});
const service=createVendorSellerService({repo,stripe,config,onboardingEnabled:true,origin:'http://127.0.0.1:18840'});
const handlers=createVendorSellerHandlers({authenticate:async()=>{const {data,error}=await clients[ownerSession].auth.getUser();return error?null:data.user?.id??null;},origin:()=> 'http://127.0.0.1:18840',runtime:()=>({config,stripe,repo,service}),retainedStatus:async()=>{throw new Error('unused');}});
const expect=async p=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
const post=action=>handlers.ownerPOST(new Request('http://127.0.0.1:18840/api/vendor-payments/owner',{method:'POST',headers:{origin:'http://127.0.0.1:18840'},body:JSON.stringify({action})}));
let failure;
try{
 for(let i=0;i<2;i++){
  const email=`seller-onboarding-${i}@fixture.invalid`,password=randomUUID()+randomUUID();
  const data=await expect(admin.auth.admin.createUser({email,password,email_confirm:true}));assert.match(data.user.id,/^[0-9a-f-]{36}$/);owners.push(data.user.id);
  const c=client(cfg.PUBLISHABLE_KEY);await expect(c.auth.signInWithPassword({email,password}));clients.push(c);
  await expect(admin.from('vendor_stores').insert({owner_id:data.user.id,slug:`seller-onboarding-${i}`,display_name:'Synthetic seller onboarding'}));
 }
 assert.equal((await post('onboarding')).status,503);assert.equal(calls.length,0);checks.push('disabled_database_rollout_before_provider');
 sql('update vendor_store_rollout set app_enabled=true;update vendor_seller_rollout set onboarding_enabled=true;');
 assert.equal((await post('onboarding')).status,503);assert.equal(calls.length,0);checks.push('database_package_required_before_provider');
 await expect(admin.from('user_entitlements').insert({user_id:owners[0],tier:'vendor',role:'vendor',features:{store_app:true}}));
 let r=await post('onboarding');assert.equal(r.status,200,await r.clone().text());assert.equal((await r.json()).url,'https://connect.stripe.com/setup/localSynthetic');
 assert.equal((await repo.account(owners[0])).lease_token,null);assert.equal((await repo.account(owners[0])).connected_account_id,'acct_localSeller');
 r=await post('onboarding');assert.equal(r.status,200);assert.equal(calls.filter(c=>c.path==='/v1/accounts').length,1);checks.push('actual_adapter_durable_creation_binding_and_resume');
 const own=await expect(clients[0].rpc('vendor_seller_owner_status_v1'));assert.equal(own.binding.hasConnectedAccount,true);
 const other=await expect(clients[1].rpc('vendor_seller_owner_status_v1'));assert.equal(other.binding,null);
 for(const c of clients)for(const table of ['vendor_seller_accounts','vendor_seller_events','vendor_seller_rollout'])assert.ok((await c.from(table).select('*')).error);
 assert.ok((await clients[1].rpc('vendor_seller_claim_v1',{p_id:(await repo.account(owners[0])).id,p_token:randomUUID()})).error);
 assert.ok((await client(cfg.PUBLISHABLE_KEY).rpc('vendor_seller_owner_status_v1')).error);checks.push('actual_auth_owner_and_private_rpc_isolation');
 r=await post('refresh');assert.equal(r.status,200);const view=(await r.json()).status;assert.equal(view.readiness.capabilitiesReady,false);assert.equal(JSON.stringify(view).includes('acct_'),false);
 await expect(admin.from('user_entitlements').delete().eq('user_id',owners[0]));
 const before=calls.length;assert.equal((await post('onboarding')).status,503);assert.equal(calls.length,before);
 assert.equal((await handlers.ownerGET()).status,200);assert.equal((await post('refresh')).status,200);checks.push('downgrade_blocks_links_retains_inspection_without_regrant');
 ownerSession=1;assert.equal((await post('onboarding')).status,503);assert.equal((await repo.account(owners[1])),null);ownerSession=0;
 const event={object:'event',id:'evt_localSellerRevoked',type:'account.application.deauthorized',api_version:STRIPE_BILLING_API_VERSION,livemode:false,account:'acct_localSeller',created:now(),data:{object:{object:'application',id:'ca_local'}}};
 const payload=JSON.stringify(event),signature=stripe.webhooks.generateTestHeaderString({payload,secret:config.webhookSecret,timestamp:now()});
 for(let i=0;i<2;i++)assert.equal((await handlers.webhook(new Request('http://127.0.0.1:18840/api/vendor-payments/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload}))).status,200);
 assert.equal((await repo.account(owners[0])).state,'deauthorized');assert.equal((await post('refresh')).status,409);
 assert.equal(sql("select count(*) from vendor_seller_events where event_id='evt_localSellerRevoked';"),'1');checks.push('signed_callback_atomic_duplicate_and_deauthorization');
}catch(e){failure=e;}finally{
 // Only this empty guarded fixture's recorded Auth IDs. No shared reset or schema
 // change. DELETE guards are bypassed solely for synthetic rollback cleanup.
 for(const owner of owners){assert.match(owner,/^[0-9a-f-]{36}$/);sql(`begin;set local session_replication_role=replica;delete from vendor_seller_accounts where owner_id='${owner}';set local session_replication_role=origin;commit;`);}
 sql("delete from vendor_seller_events where stripe_account_id='acct_localSellerOnboarding';update vendor_seller_rollout set onboarding_enabled=false;update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false;");
 for(const owner of owners)await expect(admin.auth.admin.deleteUser(owner));
 guard({full:true});assert.equal(sql('select (select count(*) from vendor_seller_accounts)||\'|\'||(select count(*) from vendor_seller_events);'),'0|0');
 const receipt={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,providerRequests:0,syntheticSdkCalls:calls.length,fixturesRemoved:true,
  sourceHashes:Object.fromEntries(['apps/web/src/lib/payments/vendorSellerEnrollment.ts','apps/web/src/lib/payments/vendorSellerRepository.ts','apps/web/src/lib/payments/vendorSellerService.ts','apps/web/src/lib/payments/vendorSellerHandlers.ts'].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))])),runnerSha256:hash(fs.readFileSync(new URL(import.meta.url)))};
 fs.writeFileSync(path.join(output,`onboarding-api-${receipt.at.replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});console.log(JSON.stringify(receipt));
}
if(failure)throw failure;
