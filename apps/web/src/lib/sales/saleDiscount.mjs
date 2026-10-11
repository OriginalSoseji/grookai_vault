// Display/validation parity only. The authenticated writer records authority.
const limit=100000000;
const integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const keys=(v,names)=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const check=value=>{if(!value)throw Error('Recorded discount needs review. Preserve the original sale.');};
export const discountAllocationMethod='proportional_largest_remainder_v1';
export function saleDiscountAllocation(items,discountMinor){
 check(Array.isArray(items)&&items.length>=1&&items.length<=50&&integer(discountMinor,0,limit));
 const gross=items.map(i=>{check(i&&integer(i.quantity,1,999)&&integer(i.unitMinor,1,limit));return BigInt(i.quantity)*BigInt(i.unitMinor);});
 const subtotal=gross.reduce((a,b)=>a+b,0n),discount=BigInt(discountMinor);
 check(subtotal<=BigInt(limit)&&discount<=subtotal);
 const shares=gross.map((g,index)=>({index,amount:g*discount/subtotal,remainder:g*discount%subtotal}));
 let remaining=discount-shares.reduce((a,b)=>a+b.amount,0n);
 const ranked=[...shares].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1);
 for(const share of ranked){if(remaining===0n)break;share.amount++;remaining--;}
 check(remaining===0n);
 return Object.freeze({version:1,method:discountAllocationMethod,subtotalMinor:String(subtotal),discountMinor:String(discount),netSalesMinor:String(subtotal-discount),
  lines:Object.freeze(shares.map(s=>Object.freeze({index:s.index,grossMinor:String(gross[s.index]),discountMinor:String(s.amount),netMinor:String(gross[s.index]-s.amount)})))});
}
export function validateSaleDiscountAllocation(value,items,discountMinor){
 const expected=saleDiscountAllocation(items,discountMinor);
 check(keys(value,['version','method','subtotalMinor','discountMinor','netSalesMinor','lines']));
 for(const name of ['version','method','subtotalMinor','discountMinor','netSalesMinor'])check(value[name]===expected[name]);
 check(Array.isArray(value.lines)&&value.lines.length===expected.lines.length);
 value.lines.forEach((line,index)=>{check(keys(line,['index','grossMinor','discountMinor','netMinor']));for(const name of ['index','grossMinor','discountMinor','netMinor'])check(line[name]===expected.lines[index][name]);});
 return expected;
}
