import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {saleDiscountProfitCases} from '../fixtures/sale_discount_profit_cases_v1.mjs';
import {salesProfit} from '../../apps/web/src/lib/sales/salesProfit.mjs';
assert.deepEqual(JSON.parse(fs.readFileSync('test/fixtures/sale_discount_profit_v1.json')),saleDiscountProfitCases);
for(const row of saleDiscountProfitCases)test('discount profit: '+row.name,()=>{
 const before=JSON.stringify(row),report=salesProfit([row.receipt],[row.snapshot]);
 assert.deepEqual(Object.fromEntries(Object.keys(row.want).map(k=>[k,report[k]])),row.want);
 assert.deepEqual(report.reasons.map(r=>r.reason),row.reasons);
 assert.equal(report.reasons.reduce((n,r)=>n+BigInt(r.salesMinor),0n),BigInt(report.unknownSalesMinor));
 assert.equal(JSON.stringify(row),before);
});
test('mixed old/new receipt history and duplicates do not double count',()=>{
 const first=saleDiscountProfitCases[0],second=structuredClone(saleDiscountProfitCases.find(r=>r.name==='original version1 remains compatible'));
 second.receipt.id='a1000000-0000-4000-8000-000000000002';second.snapshot.receiptId=second.receipt.id;
 const result=salesProfit([first.receipt,second.receipt,structuredClone(first.receipt)],[first.snapshot,second.snapshot]);
 assert.equal(result.receipts,2);assert.equal(result.knownProfitMinor,'7000');assert.equal(result.itemSalesMinor,'28500');assert.equal(result.unknownSalesMinor,'9500');
});
