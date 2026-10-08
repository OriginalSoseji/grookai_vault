import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saleDiscountCases} from '../fixtures/sale_discount_cases_v1.mjs';
import {saleDiscountAllocation,validateSaleDiscountAllocation} from '../../apps/web/src/lib/sales/saleDiscount.mjs';
assert.deepEqual(JSON.parse(fs.readFileSync('test/fixtures/sale_discount_v1.json')),saleDiscountCases);
for(const row of saleDiscountCases)test('discount: '+row.name,()=>{
 if(!row.expected){assert.throws(()=>saleDiscountAllocation(row.items,row.discountMinor));return;}
 const actual=saleDiscountAllocation(row.items,row.discountMinor);
 assert.deepEqual(actual.lines.map(l=>l.discountMinor),row.expected);
 assert.deepEqual(validateSaleDiscountAllocation(structuredClone(actual),row.items,row.discountMinor),actual);
 assert.equal(actual.lines.reduce((n,l)=>n+BigInt(l.netMinor),0n),BigInt(actual.netSalesMinor));
 assert.equal(actual.lines.reduce((n,l)=>n+BigInt(l.discountMinor),0n),BigInt(row.discountMinor));
 assert.ok(actual.lines.every(l=>BigInt(l.netMinor)>=0n));
 assert.ok(Object.isFrozen(actual)&&Object.isFrozen(actual.lines)&&actual.lines.every(Object.isFrozen));
});
test('allocation rejects altered evidence even when discount sum is preserved',()=>{
 const items=[{quantity:1,unitMinor:100},{quantity:1,unitMinor:100}],original=saleDiscountAllocation(items,1);
 for(const change of [v=>v.version=2,v=>v.method='other',v=>v.extra=1,v=>v.lines[0].extra=1,v=>v.lines.reverse(),v=>v.subtotalMinor='0200',v=>v.lines[0].netMinor=99,
  v=>{v.lines[0].discountMinor='0';v.lines[0].netMinor='100';v.lines[1].discountMinor='1';v.lines[1].netMinor='99';},v=>v.lines.pop(),v=>v.discountMinor='0']){
  const altered=structuredClone(original);change(altered);assert.throws(()=>validateSaleDiscountAllocation(altered,items,1));
 }
});
test('all small two-line discounts conserve exact bounds and stay within each rational share',()=>{
 for(let a=1;a<=12;a++)for(let b=1;b<=12;b++)for(let d=0;d<=a+b;d++){
  const result=saleDiscountAllocation([{quantity:1,unitMinor:a},{quantity:1,unitMinor:b}],d);
  const values=result.lines.map(l=>Number(l.discountMinor));
  assert.equal(values[0]+values[1],d);
  for(const [i,g]of [a,b].entries()){assert.ok(values[i]>=Math.floor(g*d/(a+b))&&values[i]<=Math.ceil(g*d/(a+b)));assert.ok(values[i]<=g);}
 }
});
