import test from 'node:test';
import assert from 'node:assert/strict';
import {refundFixture} from '../helpers/vendorOrderRefundFixture.mjs';
import {createOrderRefundService} from '../../apps/web/src/lib/payments/vendorOrderRefunds.ts';
import {refundHandler} from '../../apps/web/src/lib/orders/orderRefunds.ts';
import {refundReview} from '../../apps/web/src/lib/orders/orderRefundReview.shared.ts';
import {projectRefundReview} from '../../apps/web/src/lib/orders/orderRefundReview.ts';
import {refundRuntimeConfig} from '../../apps/web/src/lib/orders/orderRefundsRuntimePolicy.ts';
const origin='http://127.0.0.1:24040';
async function fixture(status='failed') {
 const f=refundFixture();f.refundStatus=status;
 await createOrderRefundService(f.admin,f.stripe,f.config,{enabled:true,now:()=>f.now}).create(f.command,f.order.seller.ownerId);
 f.actor=f.order.seller.ownerId;f.enabled=true;
 const service=createOrderRefundService(f.admin,f.stripe,f.config,{now:()=>f.now});
 f.handler=refundHandler({origin:()=>origin,authenticate:async()=>f.actor,service:()=>f.enabled?service:null});
 f.post=(extra={},options={})=>f.handler(new Request(origin+'/api/vendor-orders/refunds'+(options.query??''),{
  method:'POST',headers:{origin:options.origin??origin},body:JSON.stringify({action:'review',orderId:f.order.orderId,...extra})}));
 f.review=()=>service.reviewResolution(f.order.orderId,f.order.seller.ownerId);return f;
}
for(const status of ['failed','canceled','succeeded','pending','requires_action'])test(`owner HTTP review of ${status} is private, GET-only and never clears a hold`,async()=>{
 const f=await fixture(status),requests=structuredClone(f.requests),before=f.calls.length,n=f.rpcCalls.length;
 const response=await f.post(),data=refundReview(await response.json());assert.equal(response.status,200);
 assert.equal(data.decision,['failed','canceled'].includes(status)?'operator_review_required':'held');
 assert.equal(data.permitsFulfillment,false);assert.equal(data.clearsFinancialHolds,false);
 assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie, Authorization');
 assert.ok(f.calls.slice(before).every(c=>c.method==='GET'));assert.deepEqual(f.requests,requests);
 assert.deepEqual(f.rpcCalls.slice(n).map(c=>c.name),['vendor_order_refund_context_v1']);
 assert.doesNotMatch(JSON.stringify(data),/acct_|ch_|pi_|lease|re_1|ownerId|requestId|reasons/);
});
test('review denies anonymous, buyer and foreign owner before provider access',async()=>{
 const f=await fixture(),before=f.calls.length;
 for(const [actor,status] of [[null,401],[f.order.buyerId,503],['99999999-9999-4999-8999-999999999999',503]]){
  f.actor=actor;assert.equal((await f.post()).status,status);
 }assert.equal(f.calls.length,before);
});
test('review rejects forged authority, request identity, query and origin without reads',async()=>{
 const f=await fixture(),n=f.calls.length;
 for(const extra of [{actor:f.actor},{permitsFulfillment:true},{requestId:f.command.requestId},{enabled:true},{action:'clear'}])assert.equal((await f.post(extra)).status,400);
 assert.equal((await f.post({},{query:'?app=true'})).status,400);assert.equal((await f.post({},{origin:'https://foreign.invalid'})).status,403);
 f.enabled=false;assert.equal((await f.post()).status,503);assert.equal(f.calls.length,n);
});
test('changed saved history stays held without an implicit refresh write',async()=>{
 const f=await fixture();f.refunds.data[0].status='canceled';const data=await (await f.post()).json();
 assert.deepEqual(data.issues,['history_changed']);assert.equal(f.requests[0].status,'failed');
});
test('unknown private reason becomes a fixed generic category',async()=>{
 const f=await fixture(),privateResult=await f.review();privateResult.reasons=['private_account_acct_secret'];privateResult.decision='held';
 assert.deepEqual(projectRefundReview(privateResult).issues,['payment_review']);assert.doesNotMatch(JSON.stringify(projectRefundReview(privateResult)),/acct_secret|reasons/);
});
test('provider failure yields no cached success or private details',async()=>{
 const f=await fixture();f.onCall=()=>{throw new Error('PRIVATE PROVIDER VALUE');};const r=await f.post();
 assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/PRIVATE|operator_review_required|succeededMinor/);
});
for(const [key,value] of [['permitsFulfillment',true],['clearsFinancialHolds',true],['decision','approved'],['issues',['made_up']],['pendingMinor',1],['failedMinor',-1],['currency','eur'],['checkedAt',NaN],['orderId','bad']])test(`review DTO rejects malformed ${key}`,async()=>{
 const f=await fixture(),dto=projectRefundReview(await f.review());assert.throws(()=>refundReview({...dto,[key]:value}));
});
test('review DTO strips private extras and preserves repeated failed attempt totals',async()=>{
 const f=await fixture(),dto=projectRefundReview(await f.review());const result=refundReview({...dto,failedMinor:2*dto.totalAmountMinor,provider:'acct_private'});
 assert.equal(result.failedMinor,2*dto.totalAmountMinor);assert.doesNotMatch(JSON.stringify(result),/acct_private|provider/);
});
test('review runtime accepts only the two fixed local proof origins with all test guards',()=>{
 const f=refundFixture(),env={GROOKAI_VENDOR_ORDER_REFUNDS_ENABLED:'true',NEXT_PUBLIC_STOREFRONT_LOCAL_TEST:'true',NEXT_PUBLIC_COLLECTOR_STAGING:'true',
  GROOKAI_DISABLE_TELEMETRY:'1',SUPABASE_URL:'http://127.0.0.1:15439',STRIPE_PAYMENTS_MODE:'test',STRIPE_SECRET_KEY:f.config.secretKey,
  STRIPE_ACCOUNT_ID:f.config.scope.accountId,STRIPE_ORDER_WEBHOOK_SECRET:f.config.webhookSecret};
 for(const port of [22840,24040])assert.equal(refundRuntimeConfig(env,`http://127.0.0.1:${port}`).issuanceEnabled,false);
 for(const url of ['http://127.0.0.1:24041','http://localhost:24040','https://grookaivault.com','http://127.0.0.1:24040/'])assert.throws(()=>refundRuntimeConfig(env,url));
 for(const change of [{VERCEL:'1'},{GROOKAI_DISABLE_TELEMETRY:'0'},{STRIPE_PAYMENTS_MODE:'live'},{SUPABASE_URL:'https://production.invalid'}])assert.throws(()=>refundRuntimeConfig({...env,...change},origin));
});
