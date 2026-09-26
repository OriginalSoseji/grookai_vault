import test from 'node:test';
import assert from 'node:assert/strict';
import {mapOrder,readOrder,readOrderHistory,orderPresentation,orderFilters,orderCursor,decodeOrderCursor,ordersHref,ORDER_PAGE_SIZE} from '../../apps/web/src/lib/orders/orderHistory.ts';
const buyer='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const sample=()=>({id,offer:{schema:'VENDOR_STOCK_OFFER_V1',kind:'custom',title:'Sealed collection',product_id:id,version:1,unit_amount:999},quantity:2,unitAmountMinor:1234,shippingAmountMinor:0,taxAmountMinor:0,currency:'usd',fulfillment:'pickup',paid:false,needsReview:false,stockState:'payment_pending',createdAt:'2026-09-19T12:00:00.123456+00:00'});
function fixture(){
 const filters=[],calls=[],rows=[{id,created_at:sample().createdAt}],records=new Map([[id,sample()]]);let admins=0;
 const q={};for(const method of ['select','eq','not','or','order','limit'])q[method]=(...args)=>{filters.push([method,...args]);return q;};q.then=(r,j)=>Promise.resolve({data:rows,error:null}).then(r,j);
 const client={auth:{getUser:async()=>({data:{user:{id:buyer}},error:null})},rpc:async(name,args)=>{assert.equal(name,'vendor_order_status_v1');calls.push(args);return {data:records.get(args.p_order_id)??null,error:null};}};
 const admin=()=>{admins++;return {from:table=>{assert.equal(table,'vendor_orders');return q;}};};
 return {client,rows,records,q,filters,calls,admins:()=>admins,run:(role='buyer',f={status:'all',after:''})=>readOrderHistory(client,admin,role,f)};
}
test('immutable price fields determine total; unknown/private fields never reach DTO',()=>{
 const o=sample();Object.assign(o,{seller:{connectedAccountId:'PRIVATE'},buyer_id:buyer,review_reasons:['PRIVATE'],session_id:'PRIVATE'});o.offer.secret='PRIVATE';
 const view=mapOrder(o);assert.equal(view.totalAmountMinor,2468);assert.doesNotMatch(JSON.stringify(view),/PRIVATE|unit_amount|product_id|buyer_id/);
});
test('exact copies retain their own identity without live catalog inference',()=>{
 const o=sample();o.quantity=1;o.offer={schema:'VENDOR_STOCK_OFFER_V1',kind:'copy',gvvi:'GVVI-ABC-000001',condition:'NM',slab_cert_id:null};
 assert.equal(mapOrder(o).title,'GVVI-ABC-000001');assert.equal(mapOrder(o).format,'Raw');o.offer.slab_cert_id=id;assert.equal(mapOrder(o).format,'Slab');
});
for(const [key,value] of [['quantity',0],['quantity',101],['unitAmountMinor',1.5],['taxAmountMinor',-1],['unitAmountMinor',Number.MAX_SAFE_INTEGER],['currency','eur'],['paid','true'],['needsReview',1],['stockState','held'],['createdAt','invalid'],['shippingAmountMinor',1]])test(`invalid ${key} fails closed`,()=>{const o=sample();o[key]=value;assert.throws(()=>mapOrder(o),/could not be loaded/);});
test('unknown snapshot schema fails closed',()=>{const o=sample();o.offer.schema='OTHER';assert.throws(()=>mapOrder(o));});
for(const [paid,needsReview,stockState,label] of [[false,false,'payment_pending','Payment confirmation pending'],[false,false,'released','Payment not completed'],[true,false,'consumed','Payment received'],[true,true,'released','Needs review'],[false,true,'payment_pending','Needs review'],[true,false,'released','Needs review'],[false,false,'consumed','Needs review']])test(`status ${paid}/${needsReview}/${stockState}`,()=>{assert.equal(orderPresentation(mapOrder({...sample(),paid,needsReview,stockState})).label,label);});
test('buyer list scope comes from actual authenticated user; SQL only returns IDs and timestamp',async()=>{
 const f=fixture();assert.equal((await f.run()).items.length,1);assert.deepEqual(f.filters[0],['select','id,created_at']);assert.deepEqual(f.filters[1],['eq','buyer_id',buyer]);assert.deepEqual(f.filters.at(-1),['limit',21]);assert.equal(f.calls.length,1);
});
test('seller list uses same retained projection and owner-scoped query',async()=>{const f=fixture();await f.run('seller');assert.deepEqual(f.filters[1],['eq','owner_id',buyer]);assert.equal(f.calls.length,1);});
test('failed or missing Auth never creates admin client',async()=>{const f=fixture();f.client.auth.getUser=async()=>({data:{user:null},error:null});await assert.rejects(f.run());assert.equal(f.admins(),0);});
test('authenticated RPC blocks accidentally foreign index row including lookahead',async()=>{const f=fixture();f.records.clear();await assert.rejects(f.run());});
test('missing and foreign exact IDs share null; invalid ID does not invoke RPC',async()=>{const f=fixture();f.records.clear();assert.equal(await readOrder(f.client,id),null);assert.equal(await readOrder(f.client,'invalid'),null);assert.equal(f.calls.length,1);});
test('RPC mismatch or storage failure never exposes raw details',async()=>{const f=fixture();f.records.get(id).id=buyer;await assert.rejects(readOrder(f.client,id),/could not be loaded/);f.client.rpc=async()=>({data:null,error:{message:'PRIVATE'}});await assert.rejects(readOrder(f.client,id),/^Error: Orders could not be loaded. Try again.$/);});
test('index errors are redacted',async()=>{const f=fixture();f.q.then=(r,j)=>Promise.resolve({data:null,error:{message:'PRIVATE'}}).then(r,j);await assert.rejects(f.run(),/^Error: Orders could not be loaded. Try again.$/);});
test('bounded lookahead produces continuation at last displayed record preserving microseconds',async()=>{
 const f=fixture();f.rows.length=0;for(let n=0;n<=ORDER_PAGE_SIZE;n++){const key=`33333333-3333-4333-8333-${String(n).padStart(12,'0')}`;f.rows.push({id:key,created_at:sample().createdAt});f.records.set(key,{...sample(),id:key});}
 const r=await f.run();assert.equal(r.items.length,20);assert.equal(f.calls.length,21);assert.deepEqual(decodeOrderCursor(r.next),{id:f.rows[19].id,at:sample().createdAt});
});
for(const raw of [{owner_id:buyer},{status:['paid']},{status:'unknown'},{after:'x),buyer_id.neq.null'},{after:Buffer.from(JSON.stringify({at:sample().createdAt,id:buyer,owner:buyer})).toString('base64url')}])test(`forged filter rejected ${JSON.stringify(raw)}`,()=>assert.throws(()=>orderFilters(raw)));
test('validated keyset and review filter stay server-side',async()=>{const f=fixture();const after=orderCursor(sample().createdAt,id);await f.run('seller',{status:'review',after});assert.ok(f.filters.some(a=>a[0]==='not'&&a[1]==='review_reasons'));assert.ok(f.filters.some(a=>a[0]==='or'&&a[1].includes('.123456+00:00')));assert.match(ordersHref('seller',{status:'review',after}),/^\/account\/store\/orders\?status=review&after=/);});
test('paid/unpaid filters do not imply fulfillment or absence of review',async()=>{for(const status of ['paid','unpaid']){const f=fixture();await f.run('buyer',{status,after:''});assert.ok(f.filters.some(a=>JSON.stringify(a)===JSON.stringify(['eq','paid',status==='paid'])));}});
