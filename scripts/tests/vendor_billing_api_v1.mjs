// Real local Auth/PostgREST + actual repository/service. Stripe is deliberately
// synthetic and its SDK network transport throws. Never accepts a target argument.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {root,fixture,project,hash,sql,guardRuntime} from './vendor_billing_runtime_v1.mjs';
import {createVendorBillingRepository} from '../../apps/web/src/lib/billing/vendorBillingRepository.ts';
import {createVendorBillingService} from '../../apps/web/src/lib/billing/vendorBillingService.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
import {createReconcileQueue,reconcileVendorBillingOnce} from '../../apps/web/src/lib/billing/vendorBillingReconciliation.ts';
import {createVendorBillingCloseoutService} from '../../apps/web/src/lib/billing/vendorBillingCloseoutService.ts';
import {buildVendorCloseoutPlan,applyVendorCloseoutPlan} from '../../apps/web/src/lib/billing/vendorBillingCloseoutPlan.ts';
import {buildVendorRecoveryPlan,applyVendorRecoveryPlan} from '../../apps/web/src/lib/billing/vendorBillingRecovery.ts';
assert.equal(process.argv.length,2);
const runtime=guardRuntime();
const replay=JSON.parse(fs.readFileSync(path.join(fixture,'reset-status.json')));
assert.equal(replay.status,'passed');assert.deepEqual(replay.sourceHashes,runtime.sourceHashes);
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js'),Stripe=require('stripe');
const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(status.API_URL,'http://127.0.0.1:17621');
assert.ok(status.PUBLISHABLE_KEY?.startsWith('sb_publishable_'));assert.ok(status.SECRET_KEY?.startsWith('sb_secret_'));
const localFetch=async(input,init)=>{const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);assert.equal(url.origin,status.API_URL,'Nonlocal database request blocked');return fetch(input,init);};
const client=key=>createClient(status.API_URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:localFetch}});
const admin=client(status.SECRET_KEY),anon=client(status.PUBLISHABLE_KEY),repo=createVendorBillingRepository(admin);
const scope={accountId:'acct_localapiproof',livemode:false},catalog={store_app:'price_localapp',store_web:'price_localweb'};
const config={scope,catalog,siteOrigin:'http://127.0.0.1:17640',secretKey:['sk','test','fixtureOnly'].join('_'),webhookSecret:['whsec','fixtureOnlyNotARealSecret'].join('_')};
const now=Math.floor(Date.now()/1000),owners=[],runs=[],archives=[],deletedUsers=new Set(),checks=[],calls=[];
let session,subscription,invoice,failProvider=false;
const stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,httpClient:Stripe.createFetchHttpClient(async()=>{throw new Error('STRIPE_NETWORK_FORBIDDEN');})});
const price={id:catalog.store_web,livemode:false,active:true,currency:'usd',unit_amount:5000,type:'recurring',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}};
const provider=(name,fn)=>async(...args)=>{calls.push(name);return structuredClone(await fn(...args));};
stripe.accounts.retrieve=provider('account',()=>({id:scope.accountId}));
stripe.customers.create=provider('customer',()=>({id:'cus_localproof',livemode:false}));
stripe.prices.retrieve=provider('price',()=>price);
stripe.checkout.sessions.create=provider('checkout',input=>session={id:'cs_test_localproof',object:'checkout.session',mode:'subscription',livemode:false,customer:input.customer,client_reference_id:input.client_reference_id,recovered_from:null,status:'open',subscription:null,url:'https://checkout.stripe.com/c/pay/test_localproof'});
stripe.checkout.sessions.retrieve=provider('session',()=>session);
stripe.checkout.sessions.listLineItems=provider('lines',()=>({has_more:false,data:[{quantity:1,price}]}));
stripe.subscriptions.retrieve=provider('subscription',()=>{if(failProvider)throw new Error('synthetic provider unavailable');return subscription;});
stripe.invoices.retrieve=provider('invoice',()=>invoice);
const service=createVendorBillingService({repo,stripe,config,checkoutEnabled:true});
const queue=createReconcileQueue(admin,scope),originalStart=queue.start;
queue.start=async id=>{await originalStart(id);runs.push(id);};
const worker=()=>reconcileVendorBillingOnce({queue,service});
const expect=async(p)=>{const r=await p;assert.equal(r.error,null,r.error?.message);return r.data;};
const ownerStatus=async id=>expect(admin.rpc('vendor_billing_owner_status_v1',{p_owner_id:id,p_stripe_account_id:scope.accountId,p_livemode:false}));
try {
 for(let n=1;n<=4;n++){
  const email=`billing-api-${n}@fixture.invalid`,password=randomUUID()+randomUUID();
  const data=await expect(admin.auth.admin.createUser({email,password,email_confirm:true}));
  assert.match(data.user.id,/^[0-9a-f-]{36}$/);owners.push(data.user.id);
  if(n===2)await expect(anon.auth.signInWithPassword({email,password}));
 }
 const [owner,other]=owners;
 const before=await ownerStatus(owner);assert.equal(before.appAvailable,false);
 await assert.rejects(service.checkout(owner,'store_web'),e=>e.code==='billing_store_unavailable');assert.equal(calls.length,0);
 checks.push('rollout_precedes_provider');
 sql('update public.vendor_store_rollout set app_enabled=true,web_enabled=true;');
 const open=await service.checkout(owner,'store_web');assert.equal(open.state,'open');assert.equal(open.url,session.url);
 const pending=await repo.pending(owner);assert.equal(pending.state,'open');assert.equal(pending.id,session.client_reference_id);
 let view=await ownerStatus(owner);assert.equal(view.access.store_app,false);assert.equal(view.pendingPlan,'store_web');assert.equal(view.canManagePayment,true);
 await service.checkout(owner,'store_web');assert.equal(calls.filter(x=>x==='checkout').length,1);checks.push('durable_checkout_resume_without_access');
 assert.equal((await ownerStatus(other)).canManagePayment,false);
 assert.equal((await repo.account(owner,{...scope,livemode:true})),null);
 for(const table of ['vendor_billing_accounts','vendor_billing_checkout_attempts','vendor_billing_events']){
  const r=await anon.from(table).select('*');assert.ok(r.error||r.data.length===0,'Authenticated private table disclosure');
 }
 assert.ok((await anon.rpc('vendor_billing_owner_status_v1',{p_owner_id:owner,p_stripe_account_id:scope.accountId,p_livemode:false})).error);
 assert.ok((await anon.rpc('vendor_billing_claim_v1',{p_owner_id:owner,p_claim_token:randomUUID()})).error);
 const visitor=client(status.PUBLISHABLE_KEY);assert.ok((await visitor.rpc('vendor_billing_owner_status_v1',{p_owner_id:owner,p_stripe_account_id:scope.accountId,p_livemode:false})).error);
 for(const key of ['owner_id','customer_id','current_subscription_id','lease_token','email'])assert.equal(key in view,false);
 checks.push('real_auth_private_table_rpc_and_dto_boundaries');
 const waiting=await worker();assert.equal(waiting.deferred,1);assert.equal(waiting.failures,0);
 const waitingRun=await expect(admin.from('vendor_billing_reconcile_runs').select('state,deferred').eq('id',waiting.runId).single());assert.equal(waitingRun.state,'completed');assert.equal(waitingRun.deferred,1);
 assert.equal((await queue.due('accounts')).length,0);checks.push('scheduled_open_checkout_defers_and_persists_run');
 session.status='complete';session.subscription='sub_localproof';session.url=null;
 subscription={id:'sub_localproof',customer:'cus_localproof',livemode:false,status:'active',collection_method:'charge_automatically',pause_collection:null,cancel_at:null,cancel_at_period_end:false,latest_invoice:'in_localproof',items:{has_more:false,data:[{id:'si_localproof',quantity:1,current_period_start:now-10,current_period_end:now+3600,price}]}};
 invoice={id:'in_localproof',customer:'cus_localproof',livemode:false,status:'paid',collection_method:'charge_automatically',currency:'usd',status_transitions:{paid_at:now-9},parent:{subscription_details:{subscription:'sub_localproof'}},lines:{has_more:false,data:[{period:{start:now-10,end:now+3600},quantity:1,pricing:{price_details:{price:catalog.store_web}},parent:{subscription_item_details:{subscription_item:'si_localproof',subscription:'sub_localproof'}}}]}};
 const event={id:'evt_localproof',type:'invoice.paid',customerId:'cus_localproof',subscriptionId:'sub_localproof',created:now};
 failProvider=true;await assert.rejects(service.acceptEvent(event));
 const failed=await expect(admin.from('vendor_billing_events').select('state,attempts,last_error_code,retry_after').eq('event_id',event.id).single());
 assert.equal(failed.state,'pending');assert.equal(failed.attempts,1);assert.equal(failed.last_error_code,'reconciliation_failed');assert.ok(Date.parse(failed.retry_after)>Date.now());assert.equal((await repo.account(owner,scope)).lease_token,null);
 checks.push('provider_failure_durable_retry_and_lease_release');
 const beforeRetry=calls.length;assert.equal((await worker()).processed,0);assert.equal(calls.length,beforeRetry);
 sql("update public.vendor_billing_events set retry_after=now()-interval '1 second' where event_id='evt_localproof';");
 failProvider=false;const retried=await worker();assert.equal(retried.processed,1);assert.equal(retried.failures,0);
 view=await ownerStatus(owner);assert.equal(view.access.store_web,true);assert.equal(view.hasSubscription,true);assert.equal(await repo.pending(owner),null);
 const count=calls.length;await service.acceptEvent(event);assert.equal(calls.length,count);
 checks.push('verified_enrollment_atomic_projection_duplicate_event');
 checks.push('scheduled_event_retry_honors_backoff_and_recovers');
 await service.acceptEvent({...event,id:'evt_localold',subscriptionId:'sub_other'});assert.equal(calls.length,count);
 assert.equal((await expect(admin.from('vendor_billing_events').select('state').eq('event_id','evt_localold').single())).state,'ignored');
 checks.push('late_subscription_event_ignored');
 subscription.status='past_due';sql(`update public.vendor_billing_accounts set reconcile_after=now()-interval '1 second' where owner_id='${owner}';`);
 const missed=await worker();assert.equal(missed.processed,1);view=await ownerStatus(owner);assert.equal(view.access.store_app,false);assert.equal(view.canManagePayment,true);
 checks.push('missed_webhook_periodic_revocation_keeps_billing_management');
 failProvider=true;sql(`update public.vendor_billing_accounts set reconcile_after=now()-interval '1 second' where owner_id='${owner}';`);
 const failedRun=await worker();assert.equal(failedRun.failures,1);
 assert.equal((await expect(admin.from('vendor_billing_reconcile_runs').select('state,error_code').eq('id',failedRun.runId).single())).error_code,'item_failure');
 const afterFailure=calls.length;assert.equal((await worker()).processed,0);assert.equal(calls.length,afterFailure);assert.equal((await queue.health()).failedAccounts,1);
 checks.push('periodic_failure_persisted_backoff_and_health');
 let closeoutFailure=true;
 stripe.customers.retrieve=provider('closeout-customer',()=>{if(closeoutFailure)throw new Error('synthetic closeout failure');return {id:'cus_localproof',object:'customer',livemode:false,balance:0,invoice_credit_balance:{},cash_balance:null};});
 stripe.subscriptions.list=provider('closeout-subscriptions',()=>({data:[subscription],has_more:false}));
 stripe.checkout.sessions.list=provider('closeout-sessions',()=>({data:[],has_more:false}));
 stripe.invoices.list=provider('closeout-invoices',()=>({data:[],has_more:false}));
 stripe.invoiceItems.list=provider('closeout-items',()=>({data:[],has_more:false}));
 stripe.subscriptions.cancel=provider('closeout-cancel',()=>{subscription.status='canceled';return subscription;});
 const closeout=createVendorBillingCloseoutService(admin,stripe,config);
 await assert.rejects(closeout.close(owner,'a'.repeat(64)));
 assert.equal((await expect(admin.from('vendor_billing_accounts').select('closeout_error').eq('owner_id',owner).single())).closeout_error,'provider_unavailable');
 const frozenStatus=await ownerStatus(owner);assert.equal(frozenStatus.closeoutPending,true);assert.equal(frozenStatus.canManagePayment,false);
 await assert.rejects(service.checkout(owner,'store_web'),e=>e.code==='billing_account_closing');
 checks.push('closeout_failure_durable_and_new_billing_frozen');
 closeoutFailure=false;const holdId=randomUUID();
 await expect(admin.from('vendor_account_financial_holds').insert({id:holdId,owner_id:owner,reason:'order_fulfillment',reference_id:randomUUID()}));
 const planContext={ownerId:owner,ticketHash:'a'.repeat(64),environment:status.API_URL,implementationHash:'d'.repeat(64),createdAt:Math.floor(Date.now()/1000)};
 const review=await buildVendorCloseoutPlan(admin,stripe,config,planContext);
 assert.equal(review.decision,'close_billing');assert.deepEqual(review.reviewReasons,['financial_hold']);assert.equal(review.subscriptionsToCancel,1);
 assert.equal(JSON.stringify(review).includes(owner),false);assert.equal(JSON.stringify(review).includes('cus_localproof'),false);
 const beforePlanReject=calls.filter(x=>x==='closeout-cancel').length;
 await assert.rejects(applyVendorCloseoutPlan(admin,stripe,config,planContext,review,review.planSha256,''),e=>e.code==='billing_closeout_ack_required');
 await assert.rejects(buildVendorCloseoutPlan(admin,stripe,{...config,scope:{...scope,livemode:true}}, {...planContext,environment:'https://ycdxbpibncqcchqiihfz.supabase.co'}),e=>e.code==='billing_closeout_scope_mismatch');
 const extraHold=randomUUID();await expect(admin.from('vendor_account_financial_holds').insert({id:extraHold,owner_id:owner,reason:'refund',reference_id:randomUUID()}));
 await assert.rejects(applyVendorCloseoutPlan(admin,stripe,config,planContext,review,review.planSha256,review.planSha256),e=>e.code==='billing_closeout_plan_changed');
 assert.equal(calls.filter(x=>x==='closeout-cancel').length,beforePlanReject);await expect(admin.from('vendor_account_financial_holds').delete().eq('id',extraHold));
 const held=await applyVendorCloseoutPlan(admin,stripe,config,planContext,review,review.planSha256,review.planSha256);assert.equal(held.state,'review_required');assert.deepEqual(held.reviewReasons,['financial_hold']);assert.equal(subscription.status,'canceled');
 checks.push('reviewed_closeout_plan_identity_ack_and_stale_state_enforced');
 await service.acceptEvent({...event,id:'evt_localclosing'});assert.equal((await queue.due('events')).length,0);
 assert.equal((await repo.account(owner,scope)).closeout_id,held.closeoutId);
 checks.push('financial_hold_retains_account_after_verified_cancellation');
 await expect(admin.from('vendor_account_financial_holds').delete().eq('id',holdId));
 const entitlementId=(await repo.account(owner,scope)).entitlement_id;
 const finalPlan=await buildVendorCloseoutPlan(admin,stripe,config,planContext);
 assert.notEqual(finalPlan.planSha256,review.planSha256);
 const closed=await applyVendorCloseoutPlan(admin,stripe,config,planContext,finalPlan,finalPlan.planSha256,finalPlan.planSha256);archives.push(closed.closeoutId);assert.equal(closed.state,'archived');assert.equal((await repo.account(owner,scope)),null);
 assert.equal(calls.filter(x=>x==='closeout-cancel').length,1);assert.equal((await closeout.close(owner,'a'.repeat(64))).state,'archived');
 assert.equal((await expect(admin.from('vendor_billing_events').select('state').eq('event_id','evt_localclosing').single())).state,'ignored');
 await assert.rejects(repo.reserve(owner,scope),e=>e.code==='billing_account_closing');
 if(entitlementId)await expect(admin.from('user_entitlements').delete().eq('id',entitlementId));
 await expect(admin.auth.admin.deleteUser(owner));deletedUsers.add(owner);
 const retained=await expect(admin.from('vendor_billing_closed_accounts').select('financial_snapshot,owner_fingerprint').eq('id',closed.closeoutId).single());
 assert.equal(JSON.stringify(retained).includes(owner),false);assert.equal(retained.financial_snapshot.subscriptionId,'sub_localproof');
 checks.push('financial_archive_survives_real_auth_removal_and_blocks_recreation');
 await repo.reserve(other,scope);const noProvider=calls.length;
 const opsDir=path.join(fixture,'closeout-cli-'+randomUUID());fs.mkdirSync(opsDir);
 const requestFile=path.join(opsDir,'request.json'),emptyOpsEnv=path.join(opsDir,'empty.env');
 fs.writeFileSync(requestFile,JSON.stringify({ownerId:other,requestTicket:'synthetic-closeout-cli'}),{flag:'wx'});fs.writeFileSync(emptyOpsEnv,'',{flag:'wx'});
 const opsEnv={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])opsEnv[key]=process.env[key];
 Object.assign(opsEnv,{SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:status.SECRET_KEY,STRIPE_ACCOUNT_ID:scope.accountId,STRIPE_BILLING_MODE:'test',
  STRIPE_SECRET_KEY:config.secretKey,STRIPE_BILLING_WEBHOOK_SECRET:config.webhookSecret,STRIPE_STORE_APP_PRICE_ID:catalog.store_app,STRIPE_STORE_WEB_PRICE_ID:catalog.store_web,
  SITE_URL:config.siteOrigin,DOTENV_CONFIG_PATH:emptyOpsEnv,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
 const opsWorker=path.join(root,'backend/billing/vendor_billing_closeout_worker_v1.mjs'),planDir=path.join(opsDir,'plan');
 const opsRun=(args,env=opsEnv)=>spawnSync(process.execPath,['--experimental-strip-types',opsWorker,'--request-file='+requestFile,...args],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000});
 const planRun=opsRun(['--out-dir='+planDir]);fs.writeFileSync(path.join(opsDir,'plan-process.log'),planRun.stdout+planRun.stderr);assert.equal(planRun.status,0,'Private closeout CLI plan failed');
 const planFile=path.join(planDir,'plan.json'),cliPlan=JSON.parse(fs.readFileSync(planFile));assert.equal(cliPlan.decision,'close_billing');assert.equal((await repo.account(other,scope)).closeout_id,null);
 const resultDir=path.join(opsDir,'result'),applyArgs=['--apply','--plan-file='+planFile,'--expected-plan-sha256='+cliPlan.planSha256,'--out-dir='+resultDir];
 assert.equal(opsRun(applyArgs).status,1);assert.equal(fs.existsSync(resultDir),false);
 const applied=opsRun(applyArgs,{...opsEnv,GROOKAI_VENDOR_BILLING_ENABLED:'true',GROOKAI_VENDOR_BILLING_CLOSEOUT_ENABLED:'true',GROOKAI_VENDOR_BILLING_CLOSEOUT_ACK:cliPlan.planSha256});
 fs.writeFileSync(path.join(opsDir,'apply-process.log'),applied.stdout+applied.stderr);assert.equal(applied.status,0,'Private closeout CLI apply failed');
 const result=JSON.parse(fs.readFileSync(path.join(resultDir,'result.json')));assert.equal(result.state,'archived');assert.equal(result.authRemoved,false);
 const unused=await closeout.close(other,hash('synthetic-closeout-cli'));archives.push(unused.closeoutId);assert.equal(unused.state,'archived');assert.equal(calls.length,noProvider);
 assert.equal(JSON.stringify(cliPlan).includes(other),false);assert.equal(JSON.stringify(result).includes(other),false);
 checks.push('actual_closeout_cli_readonly_plan_disabled_apply_and_acknowledged_unused_archive');
 const unknown=owners[2];await repo.reserve(unknown,scope);const unknownToken=randomUUID(),unknownClaim=await repo.claim(unknown,unknownToken);const unknownLease={ownerId:unknown,token:unknownToken,fence:unknownClaim.lease_fence};
 await repo.noteCustomerCreation(unknownLease);await repo.release(unknownLease);
 await assert.rejects(closeout.close(unknown,'c'.repeat(64)),e=>e.code==='billing_recovery_required');assert.equal(calls.length,noProvider);
 checks.push('ambiguous_customer_creation_requires_recovery_before_removal');
 // Actual recovery CLI with a process-local synthetic SDK retrieval adapter.
 // All non-loopback networking remains blocked; no test seam enters production.
 sql(`update public.vendor_billing_accounts set customer_attempt_created_at=clock_timestamp()-interval '2 days',customer_creation_started_at=clock_timestamp()-interval '2 days' where owner_id='${unknown}';`);
 const unknownAccount=await repo.account(unknown,scope),recoveredCustomer='cus_recoveredlocal';
 const recoveryDir=path.join(fixture,'recovery-cli-'+randomUUID());fs.mkdirSync(recoveryDir);
 const recoveryRequest=path.join(recoveryDir,'request.json');fs.writeFileSync(recoveryRequest,JSON.stringify({ownerId:unknown,requestTicket:'synthetic-recovery-cli',kind:'customer',resourceId:recoveredCustomer}),{flag:'wx'});
 const customerFixture={id:recoveredCustomer,object:'customer',livemode:false,created:Math.floor(Date.parse(unknownAccount.customer_attempt_created_at)/1000)+30,
  metadata:{grookai_billing_version:'vendor-billing-v1',grookai_billing_customer_attempt:unknownAccount.customer_attempt_id}};
 const adapter=path.join(recoveryDir,'stripe-read-only-fixture.mjs');
 fs.writeFileSync(adapter,`import assert from 'node:assert/strict';import Stripe from ${JSON.stringify(pathToFileURL(path.join(root,'apps/web/node_modules/stripe/esm/stripe.esm.node.js')).href)};
const s=new Stripe('sk_test_fixtureOnly');
Object.getPrototypeOf(s.accounts).retrieve=async id=>{assert.equal(id,null);return {id:${JSON.stringify(scope.accountId)}};};
Object.getPrototypeOf(s.customers).retrieve=async id=>{assert.equal(id,${JSON.stringify(recoveredCustomer)});return ${JSON.stringify(customerFixture)};};`,{flag:'wx'});
 const recoveryWorker=path.join(root,'backend/billing/vendor_billing_recovery_worker_v1.mjs'),recoveryPlanDir=path.join(recoveryDir,'plan');
 const recoveryRun=(args,env=opsEnv)=>spawnSync(process.execPath,['--experimental-strip-types','--import',pathToFileURL(adapter).href,recoveryWorker,'--request-file='+recoveryRequest,...args],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:30000});
 const recoveryPlanned=recoveryRun(['--out-dir='+recoveryPlanDir]);fs.writeFileSync(path.join(recoveryDir,'plan-process.log'),recoveryPlanned.stdout+recoveryPlanned.stderr);assert.equal(recoveryPlanned.status,0,'Recovery CLI plan failed');
 const recoveryPlanFile=path.join(recoveryPlanDir,'plan.json'),recoveryPlan=JSON.parse(fs.readFileSync(recoveryPlanFile));assert.equal(recoveryPlan.decision,'bind_customer');assert.equal((await repo.account(unknown,scope)).customer_id,null);
 const recoveryApplyDir=path.join(recoveryDir,'apply'),recoveryArgs=['--apply','--plan-file='+recoveryPlanFile,'--expected-plan-sha256='+recoveryPlan.planSha256,'--out-dir='+recoveryApplyDir];
 assert.equal(recoveryRun(recoveryArgs).status,1);assert.equal(fs.existsSync(recoveryApplyDir),false);
 const recoveryApplied=recoveryRun(recoveryArgs,{...opsEnv,GROOKAI_VENDOR_BILLING_ENABLED:'true',GROOKAI_VENDOR_BILLING_RECOVERY_ENABLED:'true',GROOKAI_VENDOR_BILLING_RECOVERY_ACK:recoveryPlan.planSha256});
 fs.writeFileSync(path.join(recoveryDir,'apply-process.log'),recoveryApplied.stdout+recoveryApplied.stderr);assert.equal(recoveryApplied.status,0,'Recovery CLI apply failed');
 const recovered=await repo.account(unknown,scope);assert.equal(recovered.customer_id,recoveredCustomer);assert.equal(recovered.closeout_id,unknownAccount.closeout_id);assert.equal((await ownerStatus(unknown)).access.store_app,false);
 const recoveryResult=JSON.parse(fs.readFileSync(path.join(recoveryApplyDir,'result.json')));assert.equal(recoveryResult.state,'bound');assert.equal(recoveryResult.grantsAccess,false);assert.equal(JSON.stringify(recoveryResult).includes(unknown),false);
 checks.push('actual_recovery_cli_verifies_old_customer_attempt_binds_once_and_preserves_closeout');
 // Recover expired and completed sessions through real fenced RPCs. Completion
 // still cannot enroll or grant without the separate paid-invoice verification.
 const checkoutOwner=owners[3];await repo.reserve(checkoutOwner,scope);
 for(const recoveredState of ['expired','complete']){
  const t=randomUUID(),claimed=await repo.claim(checkoutOwner,t),l={ownerId:checkoutOwner,token:t,fence:claimed.lease_fence};
  await repo.bindCustomer(l,'cus_checkoutrecovery');const a=await repo.beginCheckout(l,'store_web');await repo.release(l);
  sql(`update public.vendor_billing_checkout_attempts set created_at=clock_timestamp()-interval '2 days',state='recovery' where id='${a.id}' and owner_id='${checkoutOwner}';`);
  const storedAttempt=await repo.pending(checkoutOwner),sessionId='cs_test_recovery'+recoveredState;
  const recoveredSession={...session,id:sessionId,customer:'cus_checkoutrecovery',client_reference_id:a.id,status:recoveredState,subscription:recoveredState==='complete'?'sub_recoveredcheckout':null,
   url:null,created:Math.floor(Date.parse(storedAttempt.created_at)/1000)+30};
  stripe.checkout.sessions.retrieve=provider('recovery-session',()=>recoveredSession);
  const c={ownerId:checkoutOwner,ticketHash:'e'.repeat(64),environment:status.API_URL,implementationHash:'d'.repeat(64),createdAt:Math.floor(Date.now()/1000),kind:'checkout',resourceId:sessionId};
  const p=await buildVendorRecoveryPlan(admin,stripe,config,c);assert.equal(p.decision,'bind_checkout');
  const bound=await applyVendorRecoveryPlan(admin,stripe,config,c,p,p.planSha256,p.planSha256);assert.equal(bound.state,'bound');assert.equal(bound.grantsAccess,false);
  const readback=await expect(admin.from('vendor_billing_checkout_attempts').select('session_id,state').eq('id',a.id).single());assert.equal(readback.session_id,sessionId);assert.equal(readback.state,recoveredState==='complete'?'completed':'expired');
  const again=await buildVendorRecoveryPlan(admin,stripe,config,c);assert.equal(again.decision,'already_bound');assert.equal((await applyVendorRecoveryPlan(admin,stripe,config,c,again,again.planSha256,again.planSha256)).state,'already_bound');
  assert.equal((await repo.account(checkoutOwner,scope)).current_subscription_id,null);assert.equal((await ownerStatus(checkoutOwner)).access.store_web,false);
 }
 checks.push('old_expired_and_completed_checkout_recovery_binds_without_paid_grant');
 console.log(JSON.stringify({status:'passed',checks}));
} finally {
 // Only this invocation's exact synthetic IDs; preserve all unrelated evidence.
 for(const id of owners){assert.match(id,/^[0-9a-f-]{36}$/);sql(`delete from public.vendor_billing_events where stripe_account_id='acct_localapiproof' and customer_id='cus_localproof';delete from public.vendor_account_financial_holds where owner_id='${id}';delete from public.vendor_billing_checkout_attempts where owner_id='${id}';delete from public.vendor_billing_accounts where owner_id='${id}';delete from public.user_entitlements where user_id='${id}';`);if(!deletedUsers.has(id))await expect(admin.auth.admin.deleteUser(id));}
 for(const id of archives){assert.match(id,/^[0-9a-f-]{36}$/);sql(`delete from public.vendor_billing_closed_accounts where id='${id}' and stripe_account_id='acct_localapiproof';`);}
 for(const id of runs){assert.match(id,/^[0-9a-f-]{36}$/);sql(`delete from public.vendor_billing_reconcile_runs where id='${id}' and stripe_account_id='acct_localapiproof';`);}
 sql('update public.vendor_store_rollout set app_enabled=false,web_enabled=false,custom_enabled=false;');guardRuntime();
}
const emptyEnv=path.join(fixture,'worker-empty.env');fs.writeFileSync(emptyEnv,'');
const workerEnv={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA'])if(process.env[key])workerEnv[key]=process.env[key];
Object.assign(workerEnv,{SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:status.SECRET_KEY,STRIPE_ACCOUNT_ID:scope.accountId,STRIPE_BILLING_MODE:'test',DOTENV_CONFIG_PATH:emptyEnv,NODE_OPTIONS:`--require=${path.join(root,'scripts/tests/vendor_storefront_network_guard.cjs')}`});
const workerPath=path.join(root,'backend/billing/vendor_billing_reconcile_worker_v1.mjs');
const healthRun=spawnSync(process.execPath,['--experimental-strip-types',workerPath,'--health'],{cwd:root,env:workerEnv,encoding:'utf8',windowsHide:true,timeout:30000});
assert.equal(healthRun.status,0,'Actual worker health failed');assert.ok(healthRun.stdout.includes('"pendingEvents":0'));
const disabledRun=spawnSync(process.execPath,['--experimental-strip-types',workerPath,'--once'],{cwd:root,env:workerEnv,encoding:'utf8',windowsHide:true,timeout:30000});
assert.equal(disabledRun.status,1);assert.equal(disabledRun.stdout.includes('[supabase-backend]'),false);
checks.push('actual_worker_cli_health_and_disabled_dispatch');
const receipt={at:new Date().toISOString(),status:'passed',project,migrationSha256:runtime.sourceHashes['20260919080000_vendor_stripe_billing_v1.sql'],runnerSha256:hash(fs.readFileSync(new URL(import.meta.url))),checks,realAuth:true,realPostgrest:true,stripeNetworkRequests:0,syntheticFixturesRemoved:true,productionWrites:0};
fs.writeFileSync(path.join(root,'docs/audits/vendor_stripe_billing_schema_v1',`api-${receipt.at.replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(receipt,null,2),{flag:'wx'});
