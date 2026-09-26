// Separate actual-Stripe/test-only integration; does not modify offline runners.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {verifiedClient,dir,accountId,safeError} from '../stripe/vendor_stripe_test_account_v1.mjs';
import {guard,sourceState,fixture as dbFixture,sql} from '../schema/vendor_order_notifications_runtime_v2.mjs';
import {createVendorBillingRepository} from '../../apps/web/src/lib/billing/vendorBillingRepository.ts';
import {createVendorBillingService} from '../../apps/web/src/lib/billing/vendorBillingService.ts';
import {createVendorBillingHandlers} from '../../apps/web/src/lib/billing/vendorBillingHandlers.ts';
import {createVendorBillingPortal} from '../../apps/web/src/lib/billing/vendorStripePortal.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),{createClient}=require('@supabase/supabase-js');
const {Client}=createRequire(new URL('../../package.json',import.meta.url))('pg');
const file=path.join(dir,'billing-db-fixture.json'),action=process.argv[2];assert.ok(['init','refresh','publish','upgrade','downgrade','reupgrade','cancel','cleanup'].includes(action));
assert.equal(process.argv.length,3);const source=sourceState();if(action==='init'){guard({full:true});assert.ok(!fs.existsSync(file),'Preserve existing DB proof');}
const stripe=await verifiedClient(),packages=JSON.parse(fs.readFileSync(path.join(dir,'packages.json')));
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',dbFixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:24021');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'24022');
const db=new Client({connectionString:cfg.DB_URL,statement_timeout:15000}),client=key=>createClient(cfg.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false}}),admin=client(cfg.SECRET_KEY),user=client(cfg.PUBLISHABLE_KEY);
const lab=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{version:1,id:randomUUID(),email:`stripe-db-${randomUUID()}@fixture.invalid`,password:randomUUID()+randomUUID(),sourceHashes:source,checks:[]};
assert.deepEqual(lab.sourceHashes,source);assert.equal(lab.completed,undefined,'Completed proof is immutable');
const save=()=>fs.writeFileSync(file,JSON.stringify(lab,null,2)),ok=async promise=>{const r=await promise;assert.equal(r.error,null,r.error?.message);return r.data;};
const config={scope:{accountId,livemode:false},catalog:packages.catalog,siteOrigin:'http://127.0.0.1:24440',secretKey:'',webhookSecret:''};
const repo=createVendorBillingRepository(admin),service=createVendorBillingService({repo,stripe,config,checkoutEnabled:true});
let token;
const runtime={config,stripe,service,status:owner=>ok(admin.rpc('vendor_billing_owner_status_v1',{p_owner_id:owner,p_stripe_account_id:accountId,p_livemode:false})),portal:async owner=>{
 const a=await repo.account(owner,config.scope);return createVendorBillingPortal(stripe,config,a.customer_id,packages.portalConfigurationId);}};
const handlers=createVendorBillingHandlers({authenticate:async()=>{if(!token)return null;return (await ok(admin.auth.getUser(token))).user.id;},origin:()=>config.siteOrigin,runtime:()=>runtime});
const post=body=>handlers.ownerPOST(new Request(config.siteOrigin+'/api/vendor-billing/owner',{method:'POST',headers:{origin:config.siteOrigin,'content-type':'application/json'},body:JSON.stringify(body)}));
async function refresh(){const response=await post({action:'refresh'}),body=await response.json();assert.equal(response.status,200,JSON.stringify(body));return body.status;}
try{
 await db.connect();
 if(action==='init'){
  save();lab.ownerId=(await ok(admin.auth.admin.createUser({email:lab.email,password:lab.password,email_confirm:true}))).user.id;save();
  await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true');
 }
 const login=await ok(user.auth.signInWithPassword({email:lab.email,password:lab.password}));token=login.session.access_token;assert.equal(login.user.id,lab.ownerId);
 if(action==='init'){
  const denied=await user.rpc('vendor_store_save_v1',{p_slug:'actual-stripe-db',p_display_name:'Synthetic Stripe DB store'});assert.ok(denied.error);
  const response=await post({action:'checkout',plan:'store_app'});const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(result.state,'open');
  const account=await repo.account(lab.ownerId,config.scope);lab.customerId=account.customer_id;lab.checkoutUrl=result.url;
  const status=await runtime.status(lab.ownerId);assert.equal(status.access.store_app,false);assert.equal(status.access.store_web,false);
  lab.checks.push({stage:'before-payment',access:status.access});save();console.log(JSON.stringify({checkoutUrl:result.url,stage:'awaiting-test-payment'}));
 }else if(action==='refresh'){
  const status=await refresh();assert.deepEqual(status.access,{store_app:true,store_web:false});
  const account=await repo.account(lab.ownerId,config.scope);assert.equal(account.customer_id,lab.customerId);lab.subscriptionId=account.current_subscription_id;
  const created=await ok(user.rpc('vendor_store_save_v1',{p_slug:'actual-stripe-db',p_display_name:'Synthetic Stripe DB store'}));lab.storeId=created.store.id;
  assert.equal(created.store.app_published,false);assert.equal(created.store.web_published,false);
  const forged=await post({action:'refresh',ownerId:randomUUID()});assert.equal(forged.status,400);
  const denied=await user.rpc('vendor_billing_reserve_account_v1',{p_owner_id:randomUUID(),p_stripe_account_id:accountId,p_livemode:false});assert.ok(denied.error);
  lab.checks.push({stage:'paid-db-enrollment',access:status.access,storeDraft:true,forgedOwnerRejected:true,directPrivilegedRpcRejected:true});save();console.log(JSON.stringify(lab.checks.at(-1)));
 }else if(action==='publish'){
  assert.ok(!lab.productId,'Preserve existing product');await db.query('update vendor_store_rollout set custom_enabled=true');
  await db.query("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,'actual-stripe-owner','Synthetic Stripe owner',true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true",[lab.ownerId]);
  let product=(await ok(user.rpc('vendor_store_custom_mutate_v1',{p_product_id:null,p_expected_version:null,p_action:'save',p_data:{title:'Synthetic storefront fixture',description:'Local provider integration fixture only',asking_price_amount:12.34,available_quantity:1}}))).products[0];lab.productId=product.id;save();
  lab.photoPath=`${lab.storeId}/products/${product.id}/${randomUUID()}.png`;save();
  await ok(user.storage.from('vendor-store-media').upload(lab.photoPath,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64'),{contentType:'image/png'}));
  product=(await ok(user.rpc('vendor_store_custom_mutate_v1',{p_product_id:product.id,p_expected_version:product.version,p_action:'photos',p_data:{paths:[lab.photoPath]}}))).products[0];
  await ok(user.rpc('vendor_store_custom_mutate_v1',{p_product_id:product.id,p_expected_version:product.version,p_action:'publish',p_data:{}}));
  await ok(user.rpc('vendor_store_publish_v1',{p_surface:'app',p_publish:true}));await ok(user.rpc('vendor_store_publish_v1',{p_surface:'web',p_publish:true}));
  const projection=await ok(client(cfg.PUBLISHABLE_KEY).rpc('vendor_store_read_v2',{p_slug:'actual-stripe-db',p_surface:'web'}));assert.equal(projection.total,1);assert.equal(projection.items[0].id,lab.productId);
  lab.published=true;lab.checks.push({stage:'explicit-publication',anonymousWebItems:1});save();console.log(JSON.stringify(lab.checks.at(-1)));
 }else if(['upgrade','downgrade','reupgrade'].includes(action)){
  assert.ok(lab.subscriptionId);assert.ok(!lab.checks.some(x=>x.stage===action),'Stage already completed');
  const sub=await stripe.subscriptions.retrieve(lab.subscriptionId);assert.equal(sub.customer,lab.customerId);assert.equal(sub.livemode,false);
  const plan=action==='downgrade'?'store_app':'store_web';
  await stripe.subscriptions.update(sub.id,{items:[{id:sub.items.data[0].id,price:packages.catalog[plan]}],proration_behavior:'always_invoice',payment_behavior:'error_if_incomplete'},
   {idempotencyKey:`grookai-db-proof:${lab.id}:${action}`});
  const status=await refresh();assert.deepEqual(status.access,{store_app:true,store_web:plan==='store_web'});
  const store=(await ok(user.rpc('vendor_store_owner_v1'))).store;assert.equal(store.app_published,Boolean(lab.published));assert.equal(store.web_published,false);
  const anonymous=client(cfg.PUBLISHABLE_KEY);assert.equal(await ok(anonymous.rpc('vendor_store_read_v2',{p_slug:'actual-stripe-db',p_surface:'web'})),null);
  lab.checks.push({stage:action,access:status.access,appPublished:store.app_published,webPublished:false,anonymousWebUnavailable:true});save();console.log(JSON.stringify(lab.checks.at(-1)));
 }else if(action==='cancel'||action==='cleanup'){
  const account=await repo.account(lab.ownerId,config.scope);assert.equal(account.customer_id,lab.customerId);
  if(account.current_subscription_id){const sub=await stripe.subscriptions.retrieve(account.current_subscription_id);assert.equal(sub.customer,lab.customerId);assert.equal(sub.livemode,false);
   if(sub.status!=='canceled')await stripe.subscriptions.cancel(sub.id,{invoice_now:false,prorate:false},{idempotencyKey:`grookai-db-proof:${lab.id}:cancel`});}
  const status=await refresh();assert.deepEqual(status.access,{store_app:false,store_web:false});
  const canceledStore=(await ok(user.rpc('vendor_store_owner_v1'))).store;assert.equal(canceledStore.app_published,false);assert.equal(canceledStore.web_published,false);
  if(action==='cancel'){lab.checks.push({stage:'cancellation-db-revocation',access:status.access,appPublished:false,webPublished:false});save();console.log(JSON.stringify(lab.checks.at(-1)));}
  else {
  const retained={events:(await db.query('select * from vendor_billing_events where stripe_account_id=$1 and livemode=false and customer_id=$2',[accountId,lab.customerId])).rows,
   account:(await db.query('select * from vendor_billing_accounts where owner_id=$1',[lab.ownerId])).rows,
   attempts:(await db.query('select * from vendor_billing_checkout_attempts where owner_id=$1',[lab.ownerId])).rows,
   entitlement:(await db.query('select * from user_entitlements where user_id=$1',[lab.ownerId])).rows};
  assert.ok(retained.events.length>=5);assert.ok(retained.events.every(e=>['processed','ignored'].includes(e.state)));assert.ok(retained.events.every(e=>e.attempts===1),'Duplicates must not repeat processing');
  fs.writeFileSync(path.join(dir,'billing-db-retained.json'),JSON.stringify(retained,null,2),{flag:'wx'});
  if(lab.photoPath)await ok(admin.storage.from('vendor-store-media').remove([lab.photoPath]));
  await db.query('begin');
  await db.query('delete from vendor_billing_events where stripe_account_id=$1 and livemode=false and customer_id=$2',[accountId,lab.customerId]);
  await db.query('delete from vendor_stores where owner_id=$1',[lab.ownerId]);
  await db.query('delete from vendor_billing_accounts where owner_id=$1',[lab.ownerId]);
  await db.query('delete from user_entitlements where user_id=$1',[lab.ownerId]);
  await db.query('update vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false');await db.query('commit');
  await ok(admin.auth.admin.deleteUser(lab.ownerId));
  guard({full:true});lab.checks.push({stage:'duplicate-events',events:retained.events.length,processedOnce:true});lab.completed=new Date().toISOString();save();
  console.log(JSON.stringify({status:'passed',checks:lab.checks,fixturesRemoved:true,rolloutOff:true,productionWrites:0}));
  }
 }
}catch(error){console.log(JSON.stringify({status:'failed',error:safeError(error)}));process.exitCode=1;}finally{await db.end();}
