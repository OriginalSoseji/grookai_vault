import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {paymentSnapshot,paymentMethod,validatePayments,paymentLines} from '../../apps/web/src/lib/sales/salesPayments.mjs';
import {newDraft,addLine,saleRequest,draftJournal} from '../../apps/web/src/lib/sales/salesDesk.mjs';
import {createReceipt,emptyBook,parseBackup,receiptText,receiptHtml} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
import {salesReport,reportCsv} from '../../apps/web/src/lib/sales/salesReport.mjs';
const vectors=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sales/payment_vectors.json',import.meta.url)));
for(const v of vectors)test('shared payment cents: '+v.name,()=>{
 if(!v.valid)return assert.throws(()=>paymentSnapshot(v.entries,v.balance));
 const p=paymentSnapshot(v.entries,v.balance);assert.equal(p.changeMinor,v.change);
 assert.deepEqual(validatePayments(p,v.balance,paymentMethod(v.entries)),p);
});
const entries=[{method:'Cash',amountMinor:4000,tenderedMinor:5000},{method:'Card (external terminal)',amountMinor:6000,tenderedMinor:6000}];
function receipt(){const r=createReceipt({storeName:'Synthetic shop',confirmed:true,method:'Cash',customer:{name:'Buyer',email:'',phone:'',wants:'',notes:''},items:[{description:'<Pikachu>',quantity:'1',price:'100'}],note:'',tax:'0'},randomUUID(),'2026-10-06T12:00:00.000Z');return {...r,method:'Split payment',payments:paymentSnapshot(entries,10000)};}
test('backup, text and HTML preserve each payment and cash change',()=>{
 const r=receipt(),b={...emptyBook(),receipts:[{receipt:r,customerId:null}]};assert.deepEqual(parseBackup(JSON.stringify(b)).receipts[0].receipt,r);
 for(const line of ['Cash: $40.00','Card (external terminal): $60.00','Cash tendered: $50.00','Cash change: $10.00'])assert.ok(receiptText(r).includes(line));
 assert.ok(receiptHtml(r).includes('&lt;Pikachu&gt;'));
 for(const change of [{changeMinor:0},{balanceMinor:1},{version:2},{extra:true},{entries:[]}])assert.throws(()=>parseBackup(JSON.stringify({...b,receipts:[{receipt:{...r,payments:{...r.payments,...change}},customerId:null}]})));
 const missing={...r};delete missing.payments;assert.throws(()=>parseBackup(JSON.stringify({...b,receipts:[{receipt:missing,customerId:null}]})));
});
test('reports allocate cents to tender methods without counting cash change or duplicate receipts',()=>{
 const r=receipt(),range={start:new Date('2026-10-06'),end:new Date('2026-10-07')};const report=salesReport([r,r],range);
 assert.equal(report.transactions,1);assert.equal(report.received,10000);assert.deepEqual(report.payments,{'Cash':4000,'Card (external terminal)':6000});
 for(const method of ['Cash','Card (external terminal)','Split payment'])assert.equal(salesReport([r],{...range,method}).transactions,1);
 assert.equal(salesReport([r],{...range,method:'Other'}).transactions,0);
 assert.match(reportCsv([r]),/Cash: 40.00; Card \(external terminal\): 60.00/);assert.match(reportCsv([r]),/"50.00","10.00"/);
 const payout={...r,id:randomUUID(),tradeIn:{balanceMinor:-10000,totalCreditMinor:20000,items:[]},payments:paymentSnapshot(entries.map(e=>({...e,tenderedMinor:e.amountMinor})),-10000)};
 assert.deepEqual(salesReport([r,payout],range).payments,{'Cash':0,'Card (external terminal)':0});assert.equal(paymentLines(payout,String)[0],'Paid to customer:');
});
test('held allocations survive reload, old carts stay v1, changed totals cannot be recorded, pending v3 remains immutable',async()=>{
 const d=addLine(newDraft(randomUUID(),'Shop'),{description:'Card',quantity:1,unitMinor:10000});assert.equal(saleRequest(d,randomUUID()).cart.version,1);
 d.payments=structuredClone(entries);const request=saleRequest(d,randomUUID());assert.equal(request.cart.version,3);assert.equal(request.cart.method,'Split payment');assert.deepEqual(request.cart.trades,[]);
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},owner=randomUUID(),lock=(_,fn)=>fn();const j=draftJournal(storage,owner,lock);
 await j.update(0,b=>({...b,drafts:[d],active:d.id,pending:request}));assert.deepEqual(draftJournal(storage,owner,lock).read().pending,request);
 await assert.rejects(j.update(1,b=>({...b,pending:{...request,cart:{...request.cart,payments:[]}}})),/pending sale/);
 d.taxMinor=1;assert.throws(()=>saleRequest(d,randomUUID()),/exact balance/);
});
