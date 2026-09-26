// Explicit REAL Stripe TEST-account readback. Never used by offline/local DB tests.
// GET-only transport, fixed account, DPAPI credential, no environment-file loading.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readVerifiedVendorSubscription, STRIPE_BILLING_API_VERSION } from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const privateDir=path.join(root,'.local/integration/stripe-account-20260922');
const accountId='acct_1UIUSYEXmSPisC0R';
const require=createRequire(path.join(root,'apps/web/package.json')),Stripe=require('stripe');
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=name=>JSON.parse(fs.readFileSync(path.join(privateDir,name),'utf8'));
assert.equal(process.argv.length,2,'This fixed readback accepts no target overrides');
assert.equal(process.platform,'win32','Credential uses Windows current-user DPAPI');
assert.equal(JSON.parse(fs.readFileSync(path.join(root,'apps/web/node_modules/stripe/package.json'))).version,'22.6.2');
let requests=0;
try {
 const encrypted=fs.readFileSync(path.join(privateDir,'stripe-test-key.dpapi'),'utf8');assert.match(encrypted,/^[a-f0-9]+$/i);
 const secret=execFileSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',
  "$ErrorActionPreference='Stop'; $secure=ConvertTo-SecureString ([Console]::In.ReadToEnd()); [Console]::Write([System.Net.NetworkCredential]::new('', $secure).Password)"],
  {input:encrypted,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']});
 assert.match(secret,/^sk_test_[A-Za-z0-9]+$/,'Only the retained test credential is allowed');
 const stripe=new Stripe(secret,{apiVersion:STRIPE_BILLING_API_VERSION,telemetry:false,maxNetworkRetries:0,timeout:10000,
  httpClient:Stripe.createFetchHttpClient(async (url,init)=>{
   const target=new URL(url);assert.equal(target.origin,'https://api.stripe.com');
   assert.equal(init.method,'GET','Provider mutations are forbidden in readback');requests++;
   return fetch(url,{...init,redirect:'error'});
  })});
 assert.equal((await stripe.accounts.retrieve(null)).id,accountId);
 assert.equal((await stripe.balance.retrieve()).livemode,false);
 const packages=read('packages.json'),fixture=read('billing-fixture.json');
 for(const [plan,amount] of [['store_app',3000],['store_web',5000]]) {
  const price=await stripe.prices.retrieve(packages.catalog[plan]);
  assert.equal(price.livemode,false);assert.equal(price.active,true);assert.equal(price.currency,'usd');
  assert.equal(price.unit_amount,amount);assert.equal(price.type,'recurring');assert.equal(price.recurring.interval,'month');
  assert.equal(price.recurring.interval_count,1);assert.equal(price.recurring.usage_type,'licensed');
 }
 const portal=await stripe.billingPortal.configurations.retrieve(packages.portalConfigurationId,{expand:['features.subscription_update.products']});
 assert.equal(portal.active,true);assert.equal(portal.livemode,false);
 assert.deepEqual(portal.features.subscription_update.products.flatMap(x=>x.prices).sort(),Object.values(packages.catalog).sort());
 assert.equal(portal.features.subscription_update.products.some(x=>x.adjustable_quantity?.enabled),false);
 assert.equal(portal.features.subscription_update.proration_behavior,'always_invoice');
 assert.deepEqual(portal.features.subscription_update.default_allowed_updates,['price']);
 assert.equal(portal.features.subscription_cancel.mode,'at_period_end');assert.equal(portal.features.subscription_cancel.enabled,true);
 assert.equal(portal.features.invoice_history.enabled,true);assert.equal(portal.features.payment_method_update.enabled,true);
 const checkout=await stripe.checkout.sessions.retrieve(fixture.checkout.id);
 assert.equal(checkout.livemode,false);assert.equal(checkout.status,'complete');assert.equal(checkout.payment_status,'paid');
 assert.equal(checkout.customer,fixture.customerId);assert.equal(checkout.subscription,fixture.subscriptionId);
 assert.equal(checkout.client_reference_id,fixture.attemptId);assert.equal(checkout.mode,'subscription');
 const clock=await stripe.testHelpers.testClocks.retrieve(fixture.clockId);assert.equal(clock.status,'ready');
 const config={scope:{accountId,livemode:false},catalog:packages.catalog,siteOrigin:'http://127.0.0.1:24440',secretKey:'',webhookSecret:''};
 const finalProjection=await readVerifiedVendorSubscription(stripe,config,fixture.customerId,fixture.subscriptionId,clock.frozen_time);
 assert.equal(finalProjection.status,'canceled');assert.deepEqual(finalProjection.features,{store_app:false,store_web:false});
 const stages=[['upgraded',true,true,'active'],['downgraded',true,false,'active'],['cancellation-fixed',true,false,'active'],
  ['renewed',true,false,'active'],['renewal-failed',false,false,'past_due'],['recovered',true,false,'active'],['canceled',false,false,'canceled']];
 const historical=stages.map(([stage,app,web,status])=>{
  const name=`lifecycle-${stage}.json`,saved=read(name);assert.equal(saved.accountId,accountId);assert.equal(saved.mode,'test');
  assert.equal(saved.projection.subscriptionId,fixture.subscriptionId);assert.equal(saved.projection.customerId,fixture.customerId);
  assert.equal(saved.projection.status,status);assert.deepEqual(saved.projection.features,{store_app:app,store_web:web});
  assert.equal(saved.databaseWrites,0);assert.equal(saved.productionWrites,0);
  if(stage==='cancellation-fixed')assert.equal(saved.projection.cancelAtPeriodEnd,true);
  return {stage,at:saved.at,evaluationClock:saved.evaluationClock,status,features:saved.projection.features,
   cancelAtPeriodEnd:saved.projection.cancelAtPeriodEnd,paidFrom:saved.projection.paidFrom,paidThrough:saved.projection.paidThrough,
   privateReceiptSha256:hash(fs.readFileSync(path.join(privateDir,name)))};
 });
 const webhook=read('webhook-receipt.json');assert.equal(webhook.mode,'test');assert.equal(webhook.accountId,accountId);
 const required=['checkout.session.completed','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'];
 for(const type of required)assert.ok(webhook.events.some(e=>e.type===type&&e.signed&&e.applicationAccepted&&e.apiVersion===STRIPE_BILLING_API_VERSION),`Missing captured signed event: ${type}`);
 const sources=['apps/web/src/lib/billing/vendorStripePortal.ts','apps/web/src/lib/billing/vendorStripeGateway.ts','apps/web/src/lib/billing/vendorSubscriptionPolicy.ts',
  'tests/contracts/vendor_billing_orchestration_v1.test.mjs','tests/contracts/vendor_stripe_billing_policy_v1.test.mjs','scripts/tests/vendor_stripe_account_readback_v1.mjs'];
 const proof={version:'vendor-stripe-account-proof-v1',at:new Date().toISOString(),status:'passed',accountId,mode:'test',sdk:'22.6.2',apiVersion:STRIPE_BILLING_API_VERSION,
  providerRequests:requests,providerWrites:0,databaseWrites:0,productionWrites:0,checkoutPaid:true,portalConfigurationVerified:true,
  historicalObservations:historical,signedEventTypes:required,capturedWebhookReceiptSha256:hash(fs.readFileSync(path.join(privateDir,'webhook-receipt.json'))),
  finalSubscriptionStatus:finalProjection.status,finalFeatures:finalProjection.features,
  sourceHashes:Object.fromEntries(sources.map(file=>[file,hash(fs.readFileSync(path.join(root,file)))])),
  limits:['Historical lifecycle observations are captured receipts, not replayed by this read-only runner.',
   'Signed events were verified at receipt; original private payloads are not retained.',
   'No actual-provider database enrollment, public publication, Connect seller creation, checkout or payout proof.',
   'Platform business/identity activation remains incomplete.']};
 const destination=path.join(root,'docs/audits/vendor_stripe_account_v1');fs.mkdirSync(destination,{recursive:true});
 fs.writeFileSync(path.join(destination,`readback-${proof.at.replaceAll(/[:.]/g,'-')}.json`),JSON.stringify(proof,null,2),{flag:'wx'});
 console.log(JSON.stringify(proof));
} catch(error) {
 // Never echo provider request/response bodies, credentials, headers or URLs.
 console.error(JSON.stringify({status:'failed',type:error?.type??error?.name??'Error',code:error?.code??null,
  message:'Private provider readback failed; inspect the failed check without logging secrets'}));
 process.exitCode=1;
}
