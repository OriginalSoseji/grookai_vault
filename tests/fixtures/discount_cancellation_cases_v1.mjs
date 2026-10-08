import {discountRequest,discountReceipt} from './discounted_sale_cases_v1.mjs';
function row(name,change,valid=false){
 const pending=structuredClone(discountRequest),value={version:1,request:structuredClone(pending),status:'cancelled'};
 const replacement=change?.(value,pending);
 return{name,valid,pending,value:replacement===undefined?value:replacement};
}
export const discountCancellationCases=[
 row('exact durable cancellation',null,true),
 row('object ordering does not change request',v=>{v.request.cart=Object.fromEntries(Object.entries(v.request.cart).reverse());},true),
 row('UUID envelope case is equivalent',v=>{v.request.id=v.request.id.toUpperCase();},true),
 row('missing receipt is not cancellation',()=>null),
 row('empty response is not cancellation',()=>({})),
 row('a committed receipt is not cancellation',()=>({version:1,request:structuredClone(discountRequest),receipt:discountReceipt()})),
 row('generic rejected error is not cancellation',()=>({rejected:true})),
 row('unsupported status',v=>{v.status='rejected';}),
 row('future acknowledgement version',v=>{v.version=2;}),
 row('missing full echo',v=>{delete v.request;}),
 row('missing status',v=>{delete v.status;}),
 row('extra receipt must not be ignored',v=>{v.receipt=discountReceipt();}),
 row('different pending identifier',v=>{v.request.id='a2000000-0000-4000-8000-000000000002';}),
 row('same totals different exact copy',v=>{v.request.cart.items[0].instanceId='b2000000-0000-4000-8000-000000000002';}),
 row('changed private customer detail',v=>{v.request.cart.customer.notes='changed';}),
 row('changed private sale note',v=>{v.request.cart.note='changed';}),
 row('changed discount and reconciled payment',v=>{v.request.cart.discountMinor=21;v.request.cart.payments[1].amountMinor=84;v.request.cart.payments[1].tenderedMinor=84;}),
 row('case change inside cart cannot replace saved bytes',v=>{v.request.cart.items[0].instanceId=v.request.cart.items[0].instanceId.toUpperCase();}),
 row('invalid original pending request',(_v,p)=>{p.cart.discountMinor=-1;}),
 row('no pending request',(_v,p)=>{delete p.cart;}),
];
