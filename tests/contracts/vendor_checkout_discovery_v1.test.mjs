import test from 'node:test';import assert from 'node:assert/strict';
import {creationFixture} from '../helpers/vendorCheckoutCreationFixture.mjs';
import {createVendorCheckoutService} from '../../apps/web/src/lib/payments/vendorCheckoutCreation.ts';
import {createVendorOrderHandlers} from '../../apps/web/src/lib/payments/vendorOrderHttp.ts';
const token='88888888-8888-4888-8888-888888888888';
const list=(data,more=false)=>({object:'list',url:'/v1/checkout/sessions',data,has_more:more});
function fixture(){const f=creationFixture();f.now=f.order.creationStartedAt+24*3600;return f;}
const service=(f,extra={})=>createVendorCheckoutService({repo:f.repo,stripe:f.stripe,config:f.config,now:()=>f.now,token:()=>token,...extra});
const discover=f=>service(f).discover(f.order.orderId);
const unrelated=(f,id)=>({...structuredClone(f.session),id,client_reference_id:null,metadata:{}});
const noBinding=f=>{assert.equal(f.preparation.attempt.session_id,null);assert.equal(f.repoCalls.includes('bind'),false);assert.equal(f.repoCalls.includes('reconcile'),false);assert.ok(f.calls.every(c=>c.method==='GET'));};
test('closed-window discovery scopes list, verifies current GET chain, binds before reconciliation without checkout enabled',async()=>{
 const f=fixture();f.account.charges_enabled=false;f.account.payouts_enabled=false;
 assert.deepEqual(await discover(f),{orderId:f.order.orderId,state:'reconciled'});
 assert.ok(f.calls.every(c=>c.method==='GET'));assert.equal(f.preparation.attempt.session_id,f.session.id);
 assert.equal(f.calls.find(c=>c.path==='/v1/checkout/sessions').scope,f.order.seller.connectedAccountId);
 assert.ok(f.repoCalls.indexOf('bind')<f.repoCalls.indexOf('reconcile'));
});
test('bound retry skips list and does not bind a second time',async()=>{const f=fixture();await discover(f);f.calls.length=0;await discover(f);assert.equal(f.calls.some(c=>c.path==='/v1/checkout/sessions'),false);assert.equal(f.repoCalls.filter(c=>c==='bind').length,1);});
test('a matching first page cannot hide a conflicting later session',async()=>{const f=fixture();f.discoveryPages={first:list([f.session],true),[f.session.id]:list([{...f.session,id:'cs_test_duplicate'}])};assert.deepEqual(await discover(f),{orderId:f.order.orderId,state:'unresolved',reason:'conflicting_sessions'});noBinding(f);});
test('opaque cursor follows last session and completes before choosing match',async()=>{const f=fixture(),other=unrelated(f,'cs_test_unrelated');f.discoveryPages={first:list([other],true),[other.id]:list([f.session])};await discover(f);assert.match(f.calls.filter(c=>c.path==='/v1/checkout/sessions')[1].query,/starting_after=cs_test_unrelated/);});
test('empty complete scan is unresolved, never evidence of no payment',async()=>{const f=fixture();f.discoveryPages={first:list([])};assert.equal((await discover(f)).reason,'not_found');noBinding(f);});
test('three-page cap retains stock even after seeing one candidate',async()=>{const f=fixture(),a=unrelated(f,'cs_test_a'),b=unrelated(f,'cs_test_b');f.discoveryPages={first:list([f.session],true),[f.session.id]:list([a],true),[a.id]:list([b],true)};assert.equal((await discover(f)).reason,'scan_limit');assert.equal(f.calls.filter(c=>c.path==='/v1/checkout/sessions').length,3);noBinding(f);});
for(const [label,change] of [
 ['reference',s=>s.client_reference_id='foreign'],['order',s=>s.metadata.grookai_order_id='foreign'],
 ['attempt',s=>s.metadata.grookai_attempt_id='foreign'],['reservation',s=>s.metadata.grookai_reservation_id='foreign'],
 ['mode',s=>s.mode='subscription'],
])test(`partially matching ${label} is an unresolved conflict`,async()=>{const f=fixture(),s=structuredClone(f.session);change(s);f.discoveryPages={first:list([s])};assert.equal((await discover(f)).reason,'conflicting_sessions');noBinding(f);});
for(const [label,change] of [
 ['live session',p=>p.data[0].livemode=true],['malformed ID',p=>p.data[0].id='cs_live_wrong'],
 ['old session',p=>p.data[0].created-=6],['late session',p=>p.data[0].created+=23*3600],
 ['repeated ID',p=>p.data.push(structuredClone(p.data[0]))],['empty continuation',p=>{p.data=[];p.has_more=true;}],
 ['bad envelope',p=>p.object='wrong'],['bad pagination flag',p=>p.has_more='false'],
 ['oversized page',p=>p.data=Array(101).fill(p.data[0])],['wrong list path',p=>p.url='/v1/customers'],
])test(`invalid discovery ${label} cannot bind`,async()=>{const f=fixture(),p=list([structuredClone(f.session)]);change(p);f.discoveryPages={first:p};await assert.rejects(discover(f),/order_discovery_invalid_page/);noBinding(f);});
test('reverse chronology is enforced across pages',async()=>{const f=fixture(),a=unrelated(f,'cs_test_a');a.created-=1;f.discoveryPages={first:list([a],true),[a.id]:list([f.session])};await assert.rejects(discover(f),/order_discovery_invalid_page/);noBinding(f);});
test('young attempts do not perform provider IO or treat an unfinished window as empty',async()=>{const f=fixture();f.now=f.order.creationStartedAt+23*3600+119;await assert.rejects(discover(f),/order_discovery_not_due/);assert.equal(f.calls.length,0);noBinding(f);});
test('storage authorization failure occurs before provider IO',async()=>{const f=fixture();f.onRepo=()=>{throw Error('order_checkout_unavailable');};await assert.rejects(discover(f));assert.equal(f.calls.length,0);});
test('wrong platform is rejected before connected listing',async()=>{const f=fixture();f.platform.id='acct_wrong';await assert.rejects(discover(f),/order_discovery_scope_mismatch/);assert.equal(f.calls.some(c=>c.path==='/v1/checkout/sessions'),false);noBinding(f);});
test('provider list failure is redacted and retains original attempt',async()=>{const f=fixture();f.fail='/v1/checkout/sessions';await assert.rejects(discover(f),/order_discovery_provider_unavailable/);noBinding(f);});
test('list metadata does not establish financial identity',async()=>{const f=fixture();f.session.amount_total++;await assert.rejects(discover(f));noBinding(f);});
test('timed-out listing cannot continue to candidate binding',async()=>{const f=fixture();f.onCall=c=>{if(c.path==='/v1/checkout/sessions')f.now+=60;};await assert.rejects(discover(f),/order_discovery_budget_exhausted/);noBinding(f);});
test('backward clock cannot continue discovery',async()=>{const f=fixture();f.onCall=()=>f.now--;await assert.rejects(discover(f),/order_discovery_budget_exhausted/);noBinding(f);});
test('lost bind response retries the same durable binding without another list or POST',async()=>{const f=fixture(),bind=f.repo.bind;f.repo.bind=async(...args)=>{await bind(...args);throw Error('response_lost');};await assert.rejects(discover(f),/response_lost/);f.repo.bind=bind;f.calls.length=0;await discover(f);assert.equal(f.repoCalls.filter(c=>c==='bind').length,1);assert.ok(f.calls.every(c=>c.method==='GET'&&c.path!=='/v1/checkout/sessions'));});
const operator='ab'.repeat(32),id='22222222-2222-4222-8222-222222222222';
function http(result={orderId:id,state:'reconciled'}){const calls=[];const handlers=createVendorOrderHandlers({authenticate:async()=>id,origin:()=> 'http://127.0.0.1:21240',reconcileToken:()=>operator,runtime:lane=>{calls.push(lane);return {discover:async(orderId)=>{calls.push(orderId);return result;}};}});return {calls,run:(body,headers={authorization:`Bearer ${operator}`})=>handlers.reconcile(new Request('http://127.0.0.1:21240/api/vendor-orders/reconcile',{method:'POST',headers,body:JSON.stringify(body)}))};}
test('only authenticated operator can request discovery, no session/account metadata accepted',async()=>{const h=http();assert.equal((await h.run({discoverOrderId:id},{cookie:'signed-buyer'})).status,401);assert.equal(h.calls.length,0);for(const body of [{discoverOrderId:id,sessionId:'cs_test_fake'},{discoverOrderId:id,orderId:id},{discoverOrderId:id,after:'cs_test_other'},{discoverOrderId:'bad'}])assert.equal((await h.run(body)).status,400);assert.equal(h.calls.length,0);});
test('operator result is narrow, private and carries unresolved retry status',async()=>{let h=http({orderId:id,state:'reconciled',PRIVATE:true}),r=await h.run({discoverOrderId:id});assert.equal(r.status,200);assert.deepEqual(await r.json(),{orderId:id,state:'reconciled'});assert.equal(r.headers.get('cache-control'),'private, no-store');for(const reason of ['not_found','conflicting_sessions','scan_limit']){h=http({orderId:id,state:'unresolved',reason,PRIVATE:true});r=await h.run({discoverOrderId:id});assert.equal(r.status,503);assert.deepEqual(await r.json(),{orderId:id,state:'unresolved',reason});}});
test('invalid runtime discovery result cannot be acknowledged',async()=>{for(const result of [{orderId:'foreign',state:'reconciled'},{orderId:id,state:'paid'},{orderId:id,state:'unresolved',reason:'PRIVATE'}]){const h=http(result),r=await h.run({discoverOrderId:id});assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/PRIVATE|foreign/);}});
