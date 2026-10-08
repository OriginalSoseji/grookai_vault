import {validateDiscountedSaleRequest} from './discountedSale.mjs';
import {tenderMethods,paymentSnapshot,paymentMethod} from './salesPayments.mjs';
const limit=100000000;
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const text=(v,n)=>typeof v==='string'&&v.length<=n;
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const check=v=>{if(!v)throw Error('Saved discounted sale needs review. Preserve this browser data.');};
const fields=['kind','id','label','storeName','items','trades','discountMinor','taxMinor','method','note','customerId','customer'];
export const isDiscountedDraft=v=>v?.kind==='discounted-sale';
function amounts(d){
 const subtotal=d.items.reduce((n,i)=>n+i.quantity*i.unitMinor,0),total=subtotal-d.discountMinor+d.taxMinor;
 return{subtotal,discount:d.discountMinor,credit:0,total,balance:total};
}
// Editing may leave a discount or split that needs review. Never silently clamp it.
export function validateDiscountedDraft(value){
 check(object(value)&&isDiscountedDraft(value)&&fields.every(k=>Object.hasOwn(value,k))&&Object.keys(value).every(k=>[...fields,'payments'].includes(k))&&
  uuid(value.id)&&text(value.label,120)&&text(value.storeName,120)&&text(value.note,500)&&integer(value.discountMinor,0,limit)&&integer(value.taxMinor,0,limit)&&
  tenderMethods.includes(value.method)&&(value.customerId===null||uuid(value.customerId))&&Array.isArray(value.items)&&value.items.length<=50&&Array.isArray(value.trades)&&value.trades.length===0);
 const limits={name:120,email:254,phone:40,wants:1000,notes:2000};
 check(object(value.customer)&&Object.keys(value.customer).length===5&&Object.entries(limits).every(([k,n])=>text(value.customer[k],n)));
 const seen=new Set();
 for(const line of value.items){
  check(object(line)&&Object.keys(line).every(k=>['instanceId','gvviId','description','quantity','unitMinor','askingMinor','image'].includes(k))&&
   text(line.description,200)&&line.description.trim()&&integer(line.quantity,1,999)&&integer(line.unitMinor,1,limit));
  if(line.instanceId!=null){check(uuid(line.instanceId)&&line.quantity===1&&!seen.has(line.instanceId.toLowerCase()));seen.add(line.instanceId.toLowerCase());}
  check(line.gvviId===undefined||text(line.gvviId,100));check(line.image==null||text(line.image,4096));check(line.askingMinor==null||integer(line.askingMinor,0,limit));
 }
 check(integer(amounts(value).subtotal,0,limit));
 if(value.payments!==undefined)check(Array.isArray(value.payments)&&value.payments.length<=4&&value.payments.every(e=>object(e)&&Object.keys(e).sort().join(',')==='amountMinor,method,tenderedMinor'&&tenderMethods.includes(e.method)&&integer(e.amountMinor,0,limit)&&integer(e.tenderedMinor,0,limit)));
 return value;
}
export function newDiscountedDraft(id,storeName=''){
 return validateDiscountedDraft({kind:'discounted-sale',id,label:'Walk-up customer',storeName,items:[],trades:[],discountMinor:0,taxMinor:0,method:'Cash',note:'',customerId:null,customer:{name:'',email:'',phone:'',wants:'',notes:''}});
}
export function discountedDraftTotals(d){validateDiscountedDraft(d);return amounts(d);}
export function discountedDraftRequest(d,id,confirmed){
 validateDiscountedDraft(d);check(confirmed===true);
 const {balance}=amounts(d);check(balance>0&&balance<=limit&&d.discountMinor<=amounts(d).subtotal);
 const payments=paymentSnapshot(d.payments??[{method:d.method,amountMinor:balance,tenderedMinor:balance}],balance);
 return validateDiscountedSaleRequest({id,cart:{version:6,storeName:d.storeName.trim(),method:paymentMethod(payments.entries),
  items:d.items.map(({instanceId=null,description,quantity,unitMinor})=>({instanceId,description:description.trim(),quantity,unitMinor})),discountMinor:d.discountMinor,taxMinor:d.taxMinor,note:d.note,customerId:d.customerId,customer:{...d.customer},payments:payments.entries}});
}
export function discountedDraftCustomerView(d){
 validateDiscountedDraft(d);
 return{storeName:d.storeName,items:d.items.map(({description,quantity,unitMinor})=>({description,quantity,unitMinor})),trades:[],taxMinor:d.taxMinor,...amounts(d)};
}
