import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {purchaseOffer,purchaseRequest,validatePurchaseReceipt,confirmedPurchaseReceipt,purchaseCustomerView} from '../../apps/web/src/lib/sales/salesPurchase.mjs';
const id=n=>`11111111-1111-4111-8111-${String(n).padStart(12,'0')}`;
const clone=value=>structuredClone(value);
const line=(patch={})=>({description:'Pikachu',quantity:1,unitMinor:650,referenceMinor:1000,rateBps:6500,cardId:id(1),printingId:id(2),condition:'NM',addToVault:true,...patch});
const tender=(amountMinor=650,method='Cash')=>({method,amountMinor,tenderedMinor:amountMinor});
const input=(patch={})=>({storeName:'Sample shop',items:[line()],payments:[tender()],note:'Private deal note',customerId:null,customer:{name:'Sample seller',email:'seller@example.test',phone:'',wants:'Private wants',notes:'Private contact note'},confirmed:true,...patch});
function receipt(request=purchaseRequest(input(),id(9))){
 const cart=request.cart,total=cart.items.reduce((sum,i)=>sum+i.unitMinor*i.quantity,0);
 return {version:2,kind:'purchase',id:request.id,number:'GVB-20261007-'+request.id.slice(0,8).toUpperCase(),createdAt:'2026-10-07T12:00:00.000Z',storeName:cart.storeName,customerName:cart.customer.name,currency:'USD',
  items:cart.items.map((i,n)=>({...i,lineMinor:i.unitMinor*i.quantity,printingGvId:i.cardId?'governed_printing:001':null,instanceId:i.addToVault?id(100+n):null,gvviId:i.addToVault?'GVVI-PURCHASE-'+n:null})),
  purchaseMinor:total,method:cart.payments.length>1?'Split payment':cart.payments[0].method,payments:{version:1,balanceMinor:-total,entries:clone(cart.payments),changeMinor:0},note:cart.note};
}
test('buy-only request has no fabricated sale and requires completed exchange confirmation',()=>{
 const request=purchaseRequest(input(),id(9));assert.equal(request.cart.version,4);assert.equal(request.cart.kind,'purchase');
 for(const key of ['taxMinor','discountMinor','trades','ownerId'])assert.equal(Object.hasOwn(request.cart,key),false);
 assert.throws(()=>purchaseRequest(input({confirmed:false}),id(9)));assert.throws(()=>purchaseRequest({...input(),ownerId:id(4)},id(9)));
 assert.equal(Object.isFrozen(request.cart.items[0]),true);assert.equal(Object.isFrozen(request.cart.payments[0]),true);
});
test('offer rounds half-up per unit and manual agreement remains independent',()=>{
 assert.equal(purchaseOffer(1,5000),1);assert.equal(purchaseOffer(1,4999),0);assert.equal(purchaseOffer(999,6500),649);assert.equal(purchaseOffer(100000000,10000),100000000);
 const request=purchaseRequest(input({items:[line({unitMinor:700})],payments:[tender(700)]}),id(9));assert.equal(request.cart.items[0].unitMinor,700);
 for(const pair of [[0,1],[1,0],[1,10001],[1.5,6500],[1,50.5],[Number.MAX_SAFE_INTEGER,10000],['100',6500]])assert.throws(()=>purchaseOffer(...pair));
});
test('known zero can accompany a paid copy but a wholly free intake is not a purchase',()=>{
 const request=purchaseRequest(input({items:[line({unitMinor:0,referenceMinor:null,rateBps:null}),line()]}),id(9));
 const result=validatePurchaseReceipt(receipt(request));assert.equal(result.items[0].lineMinor,0);assert.equal(result.purchaseMinor,650);
 assert.throws(()=>purchaseRequest(input({items:[line({unitMinor:0})],payments:[]}),id(9)));
});
test('repeated printing represents distinct physical copies and preserves input',()=>{
 const source=input({items:[line(),line()],payments:[tender(1300)]}),before=clone(source),request=purchaseRequest(source,id(9));
 assert.equal(confirmedPurchaseReceipt(receipt(request),request).items.length,2);assert.deepEqual(source,before);assert.equal(Object.isFrozen(source.items[0]),false);
});
test('quick quantities and canonical opt-out retain explicit lack of created inventory',()=>{
 const quick=line({quantity:3,cardId:null,printingId:null,condition:null,addToVault:false});
 const request=purchaseRequest(input({items:[quick,line({addToVault:false})],payments:[tender(2600)]}),id(9));
 const result=confirmedPurchaseReceipt(receipt(request),request);assert.equal(result.items[0].instanceId,null);assert.equal(result.items[1].instanceId,null);
});
for(const [name,patch]of Object.entries({negative:{unitMinor:-1},fraction:{unitMinor:1.2},overflow:{unitMinor:100000001},quantity:{quantity:0},fractionQuantity:{quantity:1.5},canonicalQuantity:{quantity:2},badPrinting:{printingId:'guessed'},badCondition:{condition:'Mint'},quickCreates:{cardId:null,printingId:null,condition:null},missingRate:{referenceMinor:null},emptyDescription:{description:' '},extra:{ownerId:id(4)}}))test('request rejects '+name,()=>assert.throws(()=>purchaseRequest(input({items:[line(patch)]}),id(9))));
test('line count and extended totals are bounded before payout acceptance',()=>{
 const fifty=Array.from({length:50},()=>line());assert.equal(purchaseRequest(input({items:fifty,payments:[tender(32500)]}),id(9)).cart.items.length,50);
 assert.throws(()=>purchaseRequest(input({items:[...fifty,line()],payments:[tender(33150)]}),id(9)));
 assert.throws(()=>purchaseRequest(input({items:[]}),id(9)));
 assert.throws(()=>purchaseRequest(input({items:[line({unitMinor:100000000}),line()],payments:[tender(100000000)]}),id(9)));
});
test('split payouts use exact negative balance and cannot include cash change',()=>{
 const request=purchaseRequest(input({payments:[tender(250),tender(400,'Bank / payment app')]}),id(9));assert.equal(validatePurchaseReceipt(receipt(request)).payments.balanceMinor,-650);
 for(const payments of [[tender(649)],[{...tender(),tenderedMinor:700}],[tender(300),tender(350)],[],[tender(650,'Store credit')]])assert.throws(()=>purchaseRequest(input({payments}),id(9)));
});
test('malformed seller details and request identity reject',()=>{
 assert.throws(()=>purchaseRequest(input(),'invalid'));assert.throws(()=>purchaseRequest(input({customerId:'invalid'}),id(9)));
 assert.throws(()=>purchaseRequest(input({customer:{...input().customer,email:'bad'}}),id(9)));
 assert.throws(()=>purchaseRequest(input({note:'\u0000'}),id(9)));
});
for(const [name,mutate]of Object.entries({saleKind:r=>r.kind='sale',oldVersion:r=>r.version=1,currency:r=>r.currency='CAD',number:r=>r.number='GV-123',date:r=>r.createdAt='2026-02-30T12:00:00.000Z',total:r=>r.purchaseMinor++,line:r=>r.items[0].lineMinor++,positivePayout:r=>r.payments.balanceMinor=650,change:r=>r.payments.changeMinor=1,method:r=>r.method='Other',missingCopy:r=>r.items[0].instanceId=null,extra:r=>r.totalMinor=650,extraLine:r=>r.items[0].cost=650}))test('receipt rejects '+name,()=>{const value=receipt();mutate(value);assert.throws(()=>validatePurchaseReceipt(value));});
test('duplicate physical IDs or labels reject even with distinct catalog lines',()=>{
 const request=purchaseRequest(input({items:[line(),line()],payments:[tender(1300)]}),id(9));
 for(const key of ['instanceId','gvviId']){const value=receipt(request);value.items[1][key]=value.items[0][key];assert.throws(()=>validatePurchaseReceipt(value));}
});
test('acknowledgement binds the pending item, price, payout and request identity',()=>{
 const request=purchaseRequest(input(),id(9));assert.equal(confirmedPurchaseReceipt(receipt(request),request).id,request.id);
 for(const mutate of [r=>{r.id=id(10);},r=>{r.items[0].printingId=id(3);},r=>{r.items[0].rateBps=7000;},r=>{r.note='Changed';},r=>{r.customerName='Different seller';},r=>{r.payments.entries[0].method='Other';r.method='Other';}]){const value=receipt(request);mutate(value);assert.throws(()=>confirmedPurchaseReceipt(value,request));}
 const renamed=receipt(request);renamed.items[0].description='Governed canonical name';assert.equal(confirmedPurchaseReceipt(renamed,request).items[0].description,renamed.items[0].description);
 const mixed=purchaseRequest(input(),'ABCDEF12-ABCD-4ABC-8ABC-ABCDEF123456'),lower=receipt(mixed);lower.id=lower.id.toLowerCase();assert.doesNotThrow(()=>confirmedPurchaseReceipt(lower,mixed));
});
test('quick descriptions stay bound while selected CRM names may use current saved identity',()=>{
 const request=purchaseRequest(input({items:[line({cardId:null,printingId:null,condition:null,addToVault:false})],customerId:id(8)}),id(9));
 const value=receipt(request);value.customerName='Current saved seller';assert.doesNotThrow(()=>confirmedPurchaseReceipt(value,request));value.items[0].description='Different quick item';assert.throws(()=>confirmedPurchaseReceipt(value,request));
});
test('customer projection excludes internal identity and private contacts and notes',()=>{
 const source=receipt(),before=clone(source),view=purchaseCustomerView(source),serialized=JSON.stringify(view);
 for(const term of ['Private deal note','customerName','instanceId','cardId','printingId','gvviId','referenceMinor','rateBps'])assert.equal(serialized.includes(term),false,term);
 assert.equal(view.purchaseMinor,650);assert.equal(view.payments.balanceMinor,-650);assert.deepEqual(source,before);assert.equal(Object.isFrozen(source),false);assert.equal(Object.isFrozen(view.items[0]),true);
});
test('JSON property order cannot invalidate the exact payout acknowledgement',()=>{
 const request=purchaseRequest(input(),id(9)),value=receipt(request),entry=value.payments.entries[0];
 value.payments.entries=[{tenderedMinor:entry.tenderedMinor,amountMinor:entry.amountMinor,method:entry.method}];
 assert.doesNotThrow(()=>confirmedPurchaseReceipt(value,request));
});
test('shared native vectors are pinned to the qualified web model',()=>{
 const fixture=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sales_purchase_web_v1.json',import.meta.url)));
 assert.equal(fixture.cases.length,51);
 assert.equal(fixture.sha256,createHash('sha256').update(fs.readFileSync(new URL('../../apps/web/src/lib/sales/salesPurchase.mjs',import.meta.url))).digest('hex'));
});
