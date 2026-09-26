import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createVendorSellerHandlers} from '../../apps/web/src/lib/payments/vendorSellerHandlers.ts';
import {SellerError} from '../../apps/web/src/lib/payments/vendorSellerRepository.ts';
import {STRIPE_BILLING_API_VERSION} from '../../apps/web/src/lib/billing/vendorStripeGateway.ts';
const require=createRequire(new URL('../../apps/web/package.json',import.meta.url)),Stripe=require('stripe');
const owner='11111111-1111-4111-8111-111111111111',origin='https://grookaivault.com';
function fixture(){
 const config={secretKey:['sk','test','syntheticOnly'].join('_'),webhookSecret:['whsec','syntheticOnlyNeverRealSecret'].join('_'),scope:{accountId:'acct_platform',livemode:false}};
 const stripe=new Stripe(config.secretKey,{apiVersion:STRIPE_BILLING_API_VERSION,httpClient:Stripe.createFetchHttpClient(async()=>{throw new Error('NETWORK_FORBIDDEN');})});
 const f={owner,runtimeCalls:0,calls:[],status:{enabled:true,state:'bound',readiness:null},config,stripe};
 const service={status:async id=>{f.calls.push(['status',id]);return f.status;},onboarding:async id=>{f.calls.push(['onboarding',id]);return {url:'https://connect.stripe.com/setup/fixture'};},refresh:async id=>{f.calls.push(['refresh',id]);return f.status;}};
 f.runtime={config,stripe,service,repo:{enqueue:async(...args)=>{f.calls.push(['enqueue',...args]);return {inserted:true};}}};
 f.handlers=createVendorSellerHandlers({authenticate:async()=>f.owner,origin:()=>origin,runtime:()=>{f.runtimeCalls++;return f.runtime;},retainedStatus:async()=>({enabled:false,state:'bound',hasConnectedAccount:true,readiness:null})});
 return f;
}
const request=(body,headers={origin})=>new Request(origin+'/api/vendor-payments/owner',{method:'POST',headers,body:typeof body==='string'?body:JSON.stringify(body)});
test('authenticated actions use server-derived owner and private no-store responses',async()=>{
 const f=fixture();for(const action of ['onboarding','refresh']){const r=await f.handlers.ownerPOST(request({action}));assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store');assert.equal(r.headers.get('referrer-policy'),'no-referrer');}
 assert.deepEqual(f.calls,[['onboarding',owner],['refresh',owner]]);
});
for(const action of [{action:'onboarding',ownerId:owner},{action:'onboarding',accountId:'acct_forged'},{action:'onboarding',storeId:owner},{action:'onboarding',returnUrl:'https://evil.test'},
 {action:'onboarding',store_web:true},{action:'recover'},{action:'checkout'},{action:'freeze'},null,[],{},'not json','x'.repeat(513)])test(`invalid seller action ${JSON.stringify(action).slice(0,85)}`,async()=>{const f=fixture();const r=await f.handlers.ownerPOST(request(action));assert.equal(r.status,400);assert.equal(f.runtimeCalls,0);});
for(const headers of [{},{origin:'https://evil.test'},{authorization:'Bearer forged'},{origin:'https://grookaivault.com.evil.test'}])test(`origin rejected ${JSON.stringify(headers)}`,async()=>{const f=fixture();assert.equal((await f.handlers.ownerPOST(request({action:'onboarding'},headers))).status,403);assert.equal(f.runtimeCalls,0);});
test('signed-out GET and POST never touch provider runtime',async()=>{const f=fixture();f.owner=null;assert.equal((await f.handlers.ownerGET()).status,401);assert.equal((await f.handlers.ownerPOST(request({action:'onboarding'}))).status,401);assert.equal(f.runtimeCalls,0);});
test('disabled provider retains owner binding status but refuses mutations',async()=>{const f=fixture();f.runtime=null;assert.deepEqual(await (await f.handlers.ownerGET()).json(),{enabled:false,state:'bound',hasConnectedAccount:true,readiness:null});assert.equal((await f.handlers.ownerPOST(request({action:'onboarding'}))).status,503);});
test('provider and database errors never expose raw details',async()=>{const f=fixture();f.runtime.service.onboarding=async()=>{throw new Error('SECRET PRIVATE DETAIL');};const r=await f.handlers.ownerPOST(request({action:'onboarding'}));assert.equal(r.status,503);assert.equal((await r.text()).includes('PRIVATE'),false);});
test('lost lease returns retryable conflict',async()=>{const f=fixture();f.runtime.service.refresh=async()=>{throw new SellerError('seller_lease_lost');};assert.equal((await f.handlers.ownerPOST(request({action:'refresh'}))).status,409);});
function signed(f,changes={},valid=true){const now=Math.floor(Date.now()/1000),event={object:'event',id:'evt_fixture',type:'account.application.deauthorized',api_version:STRIPE_BILLING_API_VERSION,account:'acct_seller',livemode:false,created:now,data:{object:{object:'application',id:'ca_fixture'}},...changes};const payload=JSON.stringify(event);const signature=f.stripe.webhooks.generateTestHeaderString({payload,secret:valid?f.config.webhookSecret:'wrong',timestamp:now});return new Request(origin+'/api/vendor-payments/webhook',{method:'POST',headers:{'stripe-signature':signature},body:payload});}
test('signed deauthorization enqueues scoped reference without trusting event readiness',async()=>{const f=fixture();assert.equal((await f.handlers.webhook(signed(f))).status,200);assert.equal(f.calls[0][0],'enqueue');assert.deepEqual(f.calls[0][1],f.config.scope);assert.equal(f.calls[0][2].kind,'deauthorized');assert.equal(Object.keys(f.calls[0][2]).length,4);});
for(const [changes,valid] of [[{},false],[{livemode:true},true],[{account:'acct_platform'},true],[{api_version:'old'},true]])test(`invalid Connect envelope ${JSON.stringify(changes)} signed=${valid}`,async()=>{const f=fixture();assert.equal((await f.handlers.webhook(signed(f,changes,valid))).status,400);assert.equal(f.calls.length,0);});
test('unrelated signed payment event cannot create payment authority',async()=>{const f=fixture();assert.equal((await f.handlers.webhook(signed(f,{type:'payment_intent.succeeded'}))).status,200);assert.equal(f.calls.length,0);});
test('ledger failure is retryable instead of falsely acknowledged',async()=>{const f=fixture();f.runtime.repo.enqueue=async()=>{throw new Error('PRIVATE');};const r=await f.handlers.webhook(signed(f));assert.equal(r.status,503);assert.equal((await r.text()).includes('PRIVATE'),false);});
