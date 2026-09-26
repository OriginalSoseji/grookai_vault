import test from 'node:test';
import assert from 'node:assert/strict';
import {refundHandler,readRefunds} from '../../apps/web/src/lib/orders/orderRefunds.ts';
import {refundAction,refundAmountInput,refundStatus} from '../../apps/web/src/lib/orders/orderRefunds.shared.ts';
import {refundRuntimeConfig} from '../../apps/web/src/lib/orders/orderRefundsRuntimePolicy.ts';
import {refundFixture} from '../helpers/vendorOrderRefundFixture.mjs';
import {readVerifiedCheckoutEvidence,requireVerifiedCheckoutRefundInventory} from '../../apps/web/src/lib/payments/vendorCheckoutEvidence.ts';
const owner='11111111-1111-4111-8111-111111111111',order='44444444-4444-4444-8444-444444444444',requestId='88888888-8888-4888-8888-888888888888';
const origin='http://127.0.0.1:22840',command={action:'create',orderId:order,requestId,amountMinor:100,reason:'requested_by_customer'};
function fixture(){const calls=[],f={calls,actor:owner,enabled:true};const service=Object.fromEntries(['preview','refresh','create'].map(action=>[action,async(...args)=>{calls.push({action,args});return {orderId:order};}]));
 f.handler=refundHandler({origin:()=>origin,authenticate:async()=>f.actor,service:()=>f.enabled?service:null});
 f.post=(body=command,options={})=>f.handler(new Request(origin+'/api/vendor-orders/refunds'+(options.search??''),{method:options.method??'POST',headers:{origin:options.origin??origin},...(options.method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})}));return f;
}
test('HTTP derives owner from Auth, validates exact command, and marks private response',async()=>{const f=fixture(),r=await f.post();assert.equal(r.status,200);assert.deepEqual(f.calls[0],{action:'create',args:[command,owner]});assert.match(r.headers.get('cache-control'),/private, no-store/);assert.match(r.headers.get('vary'),/Cookie/);});
for(const [name,body] of [['actor',{...command,actorId:owner}],['paid',{...command,paid:true}],['provider',{...command,charge:'ch_other'}],['flag',{...command,enabled:true}],['amount',{...command,amountMinor:0}],['reason',{...command,reason:'fraudulent'}],['json','{']])
 test(`HTTP rejects ${name} before service construction`,async()=>{const f=fixture();assert.equal((await f.post(body)).status,400);assert.equal(f.calls.length,0);});
test('HTTP checks origin and authentication before service calls',async()=>{const f=fixture();assert.equal((await f.post(command,{origin:'https://foreign.invalid'})).status,403);f.actor=null;assert.equal((await f.post()).status,401);assert.equal(f.calls.length,0);});
test('HTTP rejects query, large body, method, and disabled runtime',async()=>{const f=fixture();assert.equal((await f.post(command,{search:'?actor=foreign'})).status,400);assert.equal((await f.post(' '.repeat(2049))).status,413);assert.equal((await f.post(command,{method:'GET'})).status,405);f.enabled=false;assert.equal((await f.post()).status,503);assert.equal(f.calls.length,0);});
test('preview and refresh do not invoke creation',async()=>{const f=fixture();assert.equal((await f.post({action:'preview',orderId:order})).status,200);assert.equal((await f.post({action:'refresh',orderId:order,requestId})).status,200);assert.deepEqual(f.calls.map(c=>c.action),['preview','refresh']);});
test('money input uses exact integer cents and rejects exponents, signs and extra precision',()=>{assert.equal(refundAmountInput('12.34'),1234);assert.equal(refundAmountInput('0.01'),1);for(const s of ['0','-1','1e2','1.234','NaN',' 1','1000000','1,000'])assert.equal(refundAmountInput(s),null);});
const dto=()=>({schema:'VENDOR_ORDER_REFUNDS_V1',orderId:order,role:'seller',canRequest:true,totalAmountMinor:1000,currency:'usd',succeededMinor:0,pendingMinor:0,checkedAt:null,uncertain:false,requests:[]});
test('retained DTO strips private extras and validates order identity',async()=>{const data={...dto(),charge:'ch_private',actor:owner};assert.doesNotMatch(JSON.stringify(refundStatus(data)),/ch_private|actor/);await assert.rejects(readRefunds({rpc:async()=>({data:{...data,orderId:owner},error:null})},order));});
for(const [key,value] of [['canRequest','true'],['succeededMinor',-1],['pendingMinor',1001],['currency','eur'],['requests',null],['uncertain',true]])
 test(`DTO rejects malformed ${key}`,()=>assert.throws(()=>refundStatus({...dto(),[key]:value})));
test('runtime defaults off and separates issuance from recovery',()=>{assert.equal(refundRuntimeConfig({},origin),null);const f=refundFixture();const env={GROOKAI_VENDOR_ORDER_REFUNDS_ENABLED:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',GROOKAI_DISABLE_TELEMETRY:'1',SUPABASE_URL:'http://127.0.0.1:15439',STRIPE_PAYMENTS_MODE:'test',STRIPE_SECRET_KEY:f.config.secretKey,STRIPE_ACCOUNT_ID:f.config.scope.accountId,STRIPE_ORDER_WEBHOOK_SECRET:f.config.webhookSecret};
 assert.equal(refundRuntimeConfig(env,origin).issuanceEnabled,false);assert.equal(refundRuntimeConfig({...env,GROOKAI_VENDOR_ORDER_REFUND_ISSUANCE_ENABLED:'true'},origin).issuanceEnabled,true);
 for(const changes of [{VERCEL:'1'},{STRIPE_PAYMENTS_MODE:'live'},{NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'false'},{SUPABASE_URL:'https://production.invalid'},{GROOKAI_DISABLE_TELEMETRY:'0'}])assert.throws(()=>refundRuntimeConfig({...env,...changes},origin));
 assert.throws(()=>refundRuntimeConfig(env,'https://grookai.com'));
});
test('only original fresh proof retrieves isolated refund inventory',async()=>{const f=refundFixture();f.addRefund();const proof=await readVerifiedCheckoutEvidence(f.stripe,f.config,f.order,()=>f.now);
 const first=requireVerifiedCheckoutRefundInventory(proof,f.order,f.config.scope,f.now);first.rows[0].amountMinor=9999;
 assert.equal(requireVerifiedCheckoutRefundInventory(proof,f.order,f.config.scope,f.now).rows[0].amountMinor,1000);
 assert.throws(()=>requireVerifiedCheckoutRefundInventory(structuredClone(proof),f.order,f.config.scope,f.now));
 assert.throws(()=>requireVerifiedCheckoutRefundInventory(proof,f.order,f.config.scope,f.now+60));
 assert.throws(()=>refundAction({...command,owner}));
});
