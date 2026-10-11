import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyBook,parseBackup,createReceipt,receiptText,receiptHtml} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
import {salesReport,reportCsv} from '../../apps/web/src/lib/sales/salesReport.mjs';
import {salesProfit} from '../../apps/web/src/lib/sales/salesProfit.mjs';
import {paymentLines,receiptTenders} from '../../apps/web/src/lib/sales/salesPayments.mjs';
const vectors=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sales_purchase_web_v1.json',import.meta.url)));
const purchase=()=>structuredClone(vectors.cases.find(c=>c.name==='exact receipt').args[0]);
const seller={name:'Sample seller',email:'',phone:'',wants:'',notes:''};
const sale=()=>createReceipt({storeName:'Sample shop',customer:seller,confirmed:true,method:'Cash',items:[{description:'Sold card',quantity:'1',price:'10.00'}],discount:'0',tax:'0',note:''},'22222222-2222-4222-8222-222222222222','2026-10-07T12:00:00.000Z');
const range={start:new Date('2026-10-07T00:00:00.000Z'),end:new Date('2026-10-08T00:00:00.000Z'),hour:d=>d.getUTCHours()};
test('mixed receipt backup round-trips purchase identity, copy costs and payouts',()=>{
 const book={...emptyBook(),storeName:'Sample shop',receipts:[{receipt:sale(),customerId:null},{receipt:purchase(),customerId:null}]};
 assert.deepEqual(parseBackup(JSON.stringify(book)),book);
 const invalid=structuredClone(book);invalid.receipts[1].receipt.purchaseMinor++;assert.throws(()=>parseBackup(JSON.stringify(invalid)));
});
test('purchase backup cannot silently downgrade to a sales receipt',()=>{
 for(const mutate of [r=>r.version=1,r=>r.kind='sale',r=>r.version=3,r=>delete r.kind]){
  const r=purchase();mutate(r);assert.throws(()=>parseBackup(JSON.stringify({...emptyBook(),receipts:[{receipt:r,customerId:null}]})));
 }
});
test('purchase text and HTML show seller payout without private note or sales revenue labels',()=>{
 const r=purchase(),text=receiptText(r),html=receiptHtml(r);
 assert.match(text,/PURCHASE RECEIPT/);assert.match(text,/Total paid to seller: \$6\.50/);assert.match(text,/Grookai did not move money/);
 assert.equal(text.includes(r.note),false);assert.doesNotMatch(text,/SALES RECEIPT|Subtotal:|Tax recorded:/);assert.match(html,/PURCHASE RECEIPT/);
 r.items[0].description='<img src=x onerror=alert(1)>';assert.doesNotMatch(receiptHtml(r),/<img src=x/);assert.match(receiptHtml(r),/&lt;img/);
});
test('purchase payment helpers retain a negative balance and seller label',()=>{
 assert.equal(receiptTenders(purchase())[0].amountMinor,650);assert.equal(paymentLines(purchase(),String)[0],'Paid to seller:');
});
test('buy payouts do not inflate item sales, units sold, average sale or hourly sales',()=>{
 const r=salesReport([sale(),purchase()],range);
 assert.equal(r.sales,1000);assert.equal(r.units,1);assert.equal(r.average,1000);assert.equal(r.transactions,2);assert.equal(r.saleTransactions,1);
 assert.equal(r.received,1000);assert.equal(r.paid,650);assert.equal(r.purchases,1);assert.equal(r.purchasedUnits,1);assert.equal(r.purchaseAmount,650);
 assert.equal(r.payments.Cash,350);assert.equal(r.hours[12].sales,1000);assert.equal(r.hours[12].transactions,1);
});
test('purchase-only report has payouts and no sales or average',()=>{
 const r=salesReport([purchase()],range);assert.equal(r.sales,0);assert.equal(r.tax,0);assert.equal(r.average,0);assert.equal(r.units,0);assert.equal(r.received,0);assert.equal(r.paid,650);assert.equal(r.purchases,1);
});
test('mixed profit coverage counts sales only and rejects malformed purchase evidence',()=>{
 const prior=salesProfit([sale()],[]);assert.deepEqual(salesProfit([sale(),purchase()],[]),prior);
 const r=purchase();r.purchaseMinor++;assert.throws(()=>salesProfit([sale(),r],[]));
 const empty=salesProfit([purchase()],[]);assert.equal(empty.receipts,0);assert.equal(empty.totalLines,0);assert.equal(empty.knownProfitMinor,null);
});
test('purchase filtering follows the same date, query and constituent tender scope',()=>{
 const r=purchase();r.method='Split payment';r.payments.entries=[{method:'Cash',amountMinor:250,tenderedMinor:250},{method:'Other',amountMinor:400,tenderedMinor:400}];
 assert.equal(salesReport([sale(),r],{...range,method:'Other'}).purchases,1);
 assert.equal(salesReport([sale(),r],{...range,query:'GVB-'}).sales,0);
 assert.equal(salesReport([r],{...range,start:range.end,end:new Date('2026-10-09T00:00:00Z')}).transactions,0);
});
test('purchase CSV identifies incoming quantities and purchases without mislabeling them as sales',()=>{
 const r=purchase();r.customerName='=FORMULA()';const csv=reportCsv([r]);
 assert.match(csv,/Transaction kind,Units purchased,Inventory purchases USD/);assert.match(csv,/"Purchase","1","6.50"/);assert.match(csv,/"'=FORMULA\(\)"/);assert.doesNotMatch(csv,/NaN|undefined/);
 const [headers,row]=csv.split('\r\n').map(line=>line.split(',').map(cell=>cell.replace(/^"|"$/g,'')));
 assert.equal(row[headers.indexOf('Paid to customer USD')],'0.00');assert.equal(row[headers.indexOf('Paid to seller USD')],'6.50');
});
