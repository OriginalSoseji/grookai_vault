import {saleDiscountAllocation} from './saleDiscount.mjs';
import {paymentSnapshot,paymentMethod,validatePayments,paymentLines} from './salesPayments.mjs';
const limit=100000000;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const detail=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||v.trim().length>0)&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
const check=v=>{if(!v)throw Error('Discounted sale needs review. Preserve the original request or receipt.');};
function freeze(v){if(v!==null&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
const same=(a,b)=>{if(a===b)return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));};
const cartFields=['version','storeName','method','items','discountMinor','taxMinor','note','customer','customerId','payments'];
const receiptFields=['version','id','number','createdAt','storeName','customerName','method','items','subtotalMinor','discountMinor','taxMinor','totalMinor','note','sourceDispositionId','payments'];
function lines(value,recorded){
 check(Array.isArray(value)&&value.length>=1&&value.length<=50);const seen=new Set();
 return value.map(i=>{
  check(keys(i,recorded?['description','quantity','unitMinor','lineMinor']:['instanceId','description','quantity','unitMinor'])&&detail(i.description,200,true)&&integer(i.quantity,1,999)&&integer(i.unitMinor,1,limit));
  if(recorded)check(i.lineMinor===i.quantity*i.unitMinor);
  else if(i.instanceId!==null){check(uuid(i.instanceId)&&i.quantity===1&&!seen.has(i.instanceId.toLowerCase()));seen.add(i.instanceId.toLowerCase());}
  return {...i};
 });
}
/** No normalization here: the stored request is the exact retry contract. */
export function validateDiscountedSaleRequest(value){
 check(keys(value,['id','cart'])&&uuid(value.id)&&keys(value.cart,cartFields));const c=value.cart;
 check(c.version===6&&detail(c.storeName,120,true)&&detail(c.note,500)&&integer(c.taxMinor,0,limit)&&(c.customerId===null||uuid(c.customerId)));
 check(keys(c.customer,['name','email','phone','wants','notes']));
 for(const[k,max]of Object.entries({name:120,email:254,phone:40,wants:1000,notes:2000}))check(detail(c.customer[k],max));
 check(!/[\r\n]/.test(c.customer.name)&&(!c.customer.email||/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(c.customer.email))&&(!c.customer.phone||/^\+?[0-9 ()-]{7,40}$/.test(c.customer.phone)));
 const items=lines(c.items,false),allocation=saleDiscountAllocation(items,c.discountMinor),total=Number(allocation.netSalesMinor)+c.taxMinor;
 check(integer(total,1,limit));const payments=paymentSnapshot(c.payments,total);check(c.method===paymentMethod(payments.entries));
 return freeze({id:value.id,cart:{...c,items,customer:{...c.customer},payments:payments.entries}});
}
export function validateDiscountedSaleReceipt(value){
 check(keys(value,receiptFields)&&value.version===1&&uuid(value.id)&&detail(value.storeName,120,true)&&detail(value.customerName,120)&&detail(value.note,500));
 check(typeof value.createdAt==='string'&&/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value.createdAt)&&!value.createdAt.startsWith('0000-')&&Number.isFinite(Date.parse(value.createdAt))&&new Date(value.createdAt).toISOString()===value.createdAt);
 check(value.number===`GV-${value.createdAt.slice(0,10).replaceAll('-','')}-${value.id.slice(0,8).toUpperCase()}`&&(value.sourceDispositionId===null||uuid(value.sourceDispositionId)));
 const items=lines(value.items,true),allocation=saleDiscountAllocation(items,value.discountMinor);
 check(value.subtotalMinor===Number(allocation.subtotalMinor)&&integer(value.taxMinor,0,limit)&&value.totalMinor===Number(allocation.netSalesMinor)+value.taxMinor&&integer(value.totalMinor,1,limit));
 const payments=validatePayments(value.payments,value.totalMinor,value.method);
 return freeze({...value,items,payments});
}
export function confirmedDiscountedSale(value,pending){
 const request=validateDiscountedSaleRequest(pending);check(keys(value,['version','request','receipt'])&&value.version===1);
 const echoed=validateDiscountedSaleRequest(value.request);check(echoed.id.toLowerCase()===request.id.toLowerCase()&&same(echoed.cart,request.cart));
 const receipt=validateDiscountedSaleReceipt(value.receipt),cart=request.cart;
 check(receipt.id.toLowerCase()===request.id.toLowerCase()&&receipt.storeName===cart.storeName.trim()&&receipt.note===cart.note&&receipt.discountMinor===cart.discountMinor&&receipt.taxMinor===cart.taxMinor&&receipt.method===cart.method&&same(receipt.payments.entries,cart.payments)&&receipt.items.length===cart.items.length&&(cart.customerId!==null||receipt.customerName===cart.customer.name)&&(receipt.sourceDispositionId!==null)===cart.items.some(i=>i.instanceId!==null));
 receipt.items.forEach((i,index)=>{const e=cart.items[index];check(i.description===e.description.trim()&&i.quantity===e.quantity&&i.unitMinor===e.unitMinor);});
 return receipt;
}
/** Only a durable server fence allows returning an uncertain sale to editing. */
export function confirmedDiscountedSaleCancellation(value,pending){
 const request=validateDiscountedSaleRequest(pending);
 check(keys(value,['version','request','status'])&&value.version===1&&value.status==='cancelled');
 const echoed=validateDiscountedSaleRequest(value.request);
 check(echoed.id.toLowerCase()===request.id.toLowerCase()&&same(echoed.cart,request.cart));
 return freeze({version:1,request:echoed,status:'cancelled'});
}
export function discountedSaleCustomerView(value){
 const r=validateDiscountedSaleReceipt(value);
 return freeze({number:r.number,createdAt:r.createdAt,storeName:r.storeName,items:r.items,subtotalMinor:r.subtotalMinor,discountMinor:r.discountMinor,taxMinor:r.taxMinor,totalMinor:r.totalMinor,method:r.method,payments:r.payments});
}
export function discountedSaleReceiptText(value,money){
 const r=discountedSaleCustomerView(value);
 return[r.storeName,'SALES RECEIPT',r.number,r.createdAt,...r.items.map(i=>`${i.quantity} × ${i.description} @ ${money(i.unitMinor)} — ${money(i.lineMinor)}`),`Subtotal: ${money(r.subtotalMinor)}`,`Discount: ${money(r.discountMinor)}`,`Tax recorded: ${money(r.taxMinor)}`,`TOTAL: ${money(r.totalMinor)}`,...paymentLines(r,money),'Exchange completed and recorded by the vendor. Grookai did not move money.'].join('\n');
}
