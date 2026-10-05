import test from 'node:test';import assert from 'node:assert/strict';
import {validateTradeReceipt} from '../../apps/web/src/lib/receipts/tradeReceipt.mjs';
import {createReceipt,emptyBook,parseBackup,receiptText,receiptHtml} from '../../apps/web/src/lib/receipts/receiptBook.mjs';
const line={description:'Customer <Charizard>',quantity:1,valueMinor:10000,rateBps:8000,creditMinor:8000,cardId:null,printingId:null,condition:null,addToVault:false,printingGvId:null,instanceId:null,gvviId:null};
const trade={version:1,items:[line],totalValueMinor:10000,totalCreditMinor:8000,balanceMinor:2000};
const receipt=()=>({...createReceipt({storeName:'Test store',confirmed:true,method:'Cash',customer:{name:'Buyer',email:'',phone:'',wants:'',notes:''},items:[{description:'Purchase',quantity:'1',price:'100'}],note:'',tax:'0'},'9fb3cdb2-93da-4491-a570-7f93c0ab5f19','2026-10-03T12:00:00.000Z'),tradeIn:structuredClone(trade)});
test('trade snapshots survive cloud/backup round-trip and every delivery includes the full deal',()=>{
 const r=receipt(),book={...emptyBook(),receipts:[{receipt:r,customerId:null}]};
 const restored=parseBackup(JSON.stringify(book));assert.deepEqual(restored.receipts[0].receipt.tradeIn,trade);
 const text=receiptText(r);assert.ok(text.includes('$100.00 × 80% = $80.00 credit'));assert.ok(text.includes('Payment received: $20.00'));
 assert.ok(receiptHtml(r).includes('&lt;Charizard&gt;'));assert.ok(!receiptHtml(r).includes('<Charizard>'));
});
test('forged, fractional, negative, mismatched and missing trade fields reject instead of disappearing',()=>{
 for(const change of [{rateBps:10001},{creditMinor:8001},{valueMinor:-1},{quantity:1.5},{addToVault:true},{cardId:'forged'},{instanceId:'forged'},{rateBps:0}])
  assert.throws(()=>validateTradeReceipt({...trade,items:[{...line,...change}]},10000));
 for(const change of [{totalCreditMinor:8001},{balanceMinor:0},{items:[]},{items:[null]},{extra:'forged'}])assert.throws(()=>validateTradeReceipt({...trade,...change},10000));
 const bad=receipt();bad.tradeIn.items[0].creditMinor=1;assert.throws(()=>parseBackup(JSON.stringify({...emptyBook(),receipts:[{receipt:bad,customerId:null}]})));
});
test('even exchanges, customer payouts and fractional percentages are explicit',()=>{
 const r=receipt();r.tradeIn.balanceMinor=0;r.totalMinor=8000;assert.ok(receiptText(r).includes('Even trade · no money due'));
 r.totalMinor=7000;r.tradeIn.balanceMinor=-1000;assert.ok(receiptText(r).includes('Paid to customer: $10.00'));
 const fractional={...line,valueMinor:999,rateBps:8250,creditMinor:824};
 assert.equal(validateTradeReceipt({version:1,items:[fractional],totalValueMinor:999,totalCreditMinor:824,balanceMinor:176},1000).totalCreditMinor,824);
});
