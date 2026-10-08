import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {discountCancellationCases} from '../fixtures/discount_cancellation_cases_v1.mjs';
import {confirmedDiscountedSaleCancellation} from '../../apps/web/src/lib/sales/discountedSale.mjs';
assert.deepEqual(JSON.parse(fs.readFileSync('test/fixtures/discount_cancellation_v1.json')),discountCancellationCases);
for(const row of discountCancellationCases)test('discount cancellation: '+row.name,()=>{
 const before=JSON.stringify(row),run=()=>confirmedDiscountedSaleCancellation(row.value,row.pending);
 if(row.valid){
  const result=run();assert.equal(result.status,'cancelled');
  assert.ok(Object.isFrozen(result)&&Object.isFrozen(result.request.cart.items[0]));
 }else assert.throws(run);
 assert.equal(JSON.stringify(row),before);
});
