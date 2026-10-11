import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {discountedSaleCases,discountReceipt,discountRequest} from '../fixtures/discounted_sale_cases_v1.mjs';
import {validateDiscountedSaleRequest,validateDiscountedSaleReceipt,confirmedDiscountedSale,discountedSaleCustomerView,discountedSaleReceiptText} from '../../apps/web/src/lib/sales/discountedSale.mjs';
assert.deepEqual(JSON.parse(fs.readFileSync('test/fixtures/discounted_sale_v1.json')),discountedSaleCases);
for(const row of discountedSaleCases)test('discounted sale: '+row.name,()=>{
 const before=JSON.stringify(row),run=()=>row.kind==='request'?validateDiscountedSaleRequest(row.value):row.kind==='receipt'?validateDiscountedSaleReceipt(row.value):confirmedDiscountedSale(row.value,row.pending);
 if(row.valid){const r=run();assert.ok(Object.isFrozen(r));}else assert.throws(run);
 assert.equal(JSON.stringify(row),before);
});
test('receipt customer projection contains discount and omits private fields and identifiers',()=>{
 const receipt=discountReceipt(),view=discountedSaleCustomerView(receipt),text=discountedSaleReceiptText(receipt,n=>(n/100).toFixed(2));
 assert.equal(view.discountMinor,20);assert.match(text,/Discount: 0.20/);assert.match(text,/TOTAL: 1.85/);assert.match(text,/1.00/);
 for(const secret of ['PRIVATE_NOTE','PRIVATE_WANTS','PRIVATE_CUSTOMER_NOTE','private@example.invalid',discountRequest.cart.items[0].instanceId,receipt.sourceDispositionId]){assert.ok(!JSON.stringify(view).includes(secret));assert.ok(!text.includes(secret));}
 assert.ok(!Object.hasOwn(view,'customerName')&&!Object.hasOwn(view,'id'));
});
