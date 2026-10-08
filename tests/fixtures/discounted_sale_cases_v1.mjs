export const discountRequest={id:'a2000000-0000-4000-8000-000000000001',cart:{version:6,storeName:'Discount fixture',method:'Split payment',
 items:[{instanceId:'b2000000-0000-4000-8000-000000000001',description:'Exact copy',quantity:1,unitMinor:100},{instanceId:null,description:'Quick lot',quantity:2,unitMinor:50}],discountMinor:20,taxMinor:5,note:'PRIVATE_NOTE',customerId:null,
 customer:{name:'Buyer',email:'private@example.invalid',phone:'+123456789',wants:'PRIVATE_WANTS',notes:'PRIVATE_CUSTOMER_NOTE'},
 payments:[{method:'Cash',amountMinor:100,tenderedMinor:200},{method:'Card (external terminal)',amountMinor:85,tenderedMinor:85}]}};
export function discountReceipt(request=discountRequest){const c=request.cart,subtotal=c.items.reduce((n,i)=>n+i.quantity*i.unitMinor,0),stamp='2030-01-01T12:00:00.000Z';return{
 version:1,id:request.id.toLowerCase(),number:'GV-20300101-'+request.id.slice(0,8).toUpperCase(),createdAt:stamp,storeName:c.storeName.trim(),customerName:c.customer.name,method:c.method,items:c.items.map(i=>({description:i.description.trim(),quantity:i.quantity,unitMinor:i.unitMinor,lineMinor:i.quantity*i.unitMinor})),
 subtotalMinor:subtotal,discountMinor:c.discountMinor,taxMinor:c.taxMinor,totalMinor:subtotal-c.discountMinor+c.taxMinor,note:c.note,sourceDispositionId:c.items.some(i=>i.instanceId!==null)?'c2000000-0000-4000-8000-000000000001':null,
 payments:{version:1,balanceMinor:subtotal-c.discountMinor+c.taxMinor,entries:structuredClone(c.payments),changeMinor:c.payments.reduce((n,e)=>n+e.tenderedMinor-e.amountMinor,0)}};}
function request(name,change,valid=false){const r=structuredClone(discountRequest);change?.(r);return{name,kind:'request',valid,value:r};}
function receipt(name,change,valid=false){const r=discountReceipt();change?.(r);return{name,kind:'receipt',valid,value:r};}
function ack(name,change,valid=false){const pending=structuredClone(discountRequest),value={version:1,request:structuredClone(pending),receipt:discountReceipt(pending)};change?.(value,pending);return{name,kind:'ack',valid,value,pending};}
function pay(c,total){c.method='Cash';c.payments=[{method:'Cash',amountMinor:total,tenderedMinor:total}];}
export const discountedSaleCases=[
 request('valid discounted split with cash change',null,true),
 request('zero discount retained in v6',r=>{r.cart.discountMinor=0;pay(r.cart,205);},true),
 request('full discount with positive recorded tax',r=>{r.cart.discountMinor=200;r.cart.taxMinor=1;pay(r.cart,1);},true),
 request('bounded gross and net allow tax after discount',r=>{r.cart.items=[{instanceId:null,description:'Maximum',quantity:1,unitMinor:100000000}];r.cart.discountMinor=100000000;r.cart.taxMinor=100000000;pay(r.cart,100000000);},true),
 request('uppercase identity preserved for retry',r=>{r.id=r.id.toUpperCase();r.cart.items[0].instanceId=r.cart.items[0].instanceId.toUpperCase();},true),
 request('store and description whitespace preserved until completion',r=>{r.cart.storeName='\u00a0Store\u00a0';r.cart.items[0].description='\u00a0Card\u00a0';},true),
 request('blank private customer allowed',r=>{r.cart.customer={name:'',email:'',phone:'',wants:'',notes:''};},true),
 request('saved customer identity',r=>r.cart.customerId='d2000000-0000-4000-8000-000000000001',true),
 request('request extra field',r=>r.extra=1),request('cart extra field',r=>r.cart.extra=1),request('unsupported trade fields',r=>r.cart.trades=[]),
 request('old request version',r=>r.cart.version=5),request('missing discount',r=>delete r.cart.discountMinor),request('negative discount',r=>r.cart.discountMinor=-1),
 request('discount above subtotal',r=>r.cart.discountMinor=201),request('fractional discount',r=>r.cart.discountMinor=0.5),request('text discount',r=>r.cart.discountMinor='20'),
 request('zero final total',r=>{r.cart.discountMinor=200;r.cart.taxMinor=0;r.cart.payments=[];r.cart.method='Other';}),
 request('negative tax',r=>r.cart.taxMinor=-1),request('fractional tax',r=>r.cart.taxMinor=1.1),request('over-limit tax',r=>r.cart.taxMinor=100000001),
 request('over-limit net total',r=>r.cart.taxMinor=100000000),request('over-limit gross',r=>r.cart.items[0].unitMinor=100000000),
 request('unchanged payment split after discount edit',r=>r.cart.discountMinor=21),request('cash tender below applied',r=>r.cart.payments[0].tenderedMinor=99),
 request('noncash change',r=>r.cart.payments[1].tenderedMinor=86),request('duplicate method',r=>r.cart.payments[1].method='Cash'),
 request('method does not match entries',r=>r.cart.method='Cash'),request('missing payments',r=>delete r.cart.payments),
 request('duplicate exact copy case folded',r=>{r.cart.items[1]={...r.cart.items[0],instanceId:r.cart.items[0].instanceId.toUpperCase()};}),
 request('linked quantity must be one',r=>r.cart.items[0].quantity=2),request('invalid UUID version',r=>r.id='a2000000-0000-0000-8000-000000000001'),
 request('unknown instance type',r=>r.cart.items[0].instanceId=1),request('empty description',r=>r.cart.items[0].description=' '),request('extra line field',r=>r.cart.items[0].cost=20),
 request('private note too long',r=>r.cart.note='x'.repeat(501)),request('invalid control in note',r=>r.cart.note='bad\u0001'),
 request('line break in customer name',r=>r.cart.customer.name='Buyer\nOther'),request('malformed email',r=>r.cart.customer.email='bad'),
 request('malformed phone',r=>r.cart.customer.phone='bad'),request('extra customer field',r=>r.cart.customer.extra=1),request('missing customer detail',r=>delete r.cart.customer.notes),
 receipt('valid original receipt envelope',null,true),receipt('receipt tax changes separately',r=>{r.taxMinor=15;r.totalMinor=195;r.payments.balanceMinor=195;r.payments.entries[1].amountMinor=95;r.payments.entries[1].tenderedMinor=95;},true),
 receipt('receipt extra private data',r=>r.cost=20),receipt('receipt gross does not reconcile',r=>r.subtotalMinor=201),receipt('receipt discount does not reconcile',r=>r.discountMinor=21),
 receipt('receipt item line mismatch',r=>r.items[0].lineMinor=101),receipt('receipt date normalizes to another day',r=>r.createdAt='2030-02-30T12:00:00.000Z'),
 receipt('receipt number mismatched',r=>r.number='GV-20300101-BAD'),receipt('receipt payment mismatch',r=>r.payments.changeMinor=0),receipt('receipt fake trade extension',r=>r.tradeIn={version:2}),
 ack('exact request and receipt acknowledgement',null,true),ack('object field ordering is immaterial',v=>v.request.cart=Object.fromEntries(Object.entries(v.request.cart).reverse()),true),
 ack('changed exact copy with identical money',v=>v.request.cart.items[0].instanceId='b2000000-0000-4000-8000-000000000002'),
 ack('missing full request echo',v=>delete v.request),ack('extra acknowledgement data',v=>v.extra=1),ack('wrong acknowledgement version',v=>v.version=2),
 ack('receipt from another request',v=>{v.receipt.id='a2000000-0000-4000-8000-000000000002';}),
 ack('different line description with same total',v=>v.receipt.items[0].description='Different copy'),
 ack('changed discount with adjusted receipt totals',v=>{v.receipt.discountMinor=21;v.receipt.totalMinor=184;v.receipt.payments.balanceMinor=184;v.receipt.payments.entries[1].amountMinor=84;v.receipt.payments.entries[1].tenderedMinor=84;}),
 ack('missing inventory disposition',v=>v.receipt.sourceDispositionId=null),ack('changed private request note',v=>v.request.cart.note='changed'),
 ack('changed customer name for unsaved customer',v=>v.receipt.customerName='Different buyer'),
];
