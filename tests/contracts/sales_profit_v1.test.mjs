import test from 'node:test';
import assert from 'node:assert/strict';
import {salesProfit,profitMoney} from '../../apps/web/src/lib/sales/salesProfit.mjs';
const receiptId='11111111-1111-4111-8111-111111111111',copy='22222222-2222-4222-8222-222222222222';
const receipt=(extra={})=>({id:receiptId,createdAt:'2026-10-07T12:00:00Z',items:[{quantity:1,unitMinor:2000}],subtotalMinor:2000,discountMinor:0,taxMinor:100,totalMinor:2100,...extra});
const snapshot=(extra={})=>({version:1,receiptId,soldAt:'2026-10-07T12:00:00Z',salesCurrency:'USD',lines:[{index:0,instanceId:copy,quantity:1,salesMinor:'2000',status:'known',cost:{amount:'12.00',currency:'USD',minor:'1200',status:'known'}}],...extra});
test('known-cost profit uses sale evidence and excludes tax, trade credit and split movements',()=>{
 const base=salesProfit([receipt()],[snapshot()]);assert.equal(base.knownProfitMinor,'800');assert.equal(base.knownSalesMinor,'2000');assert.equal(base.knownCostMinor,'1200');assert.equal(base.coverageBps,10000);
 assert.deepEqual(salesProfit([receipt({tradeIn:{totalCreditMinor:3000,balanceMinor:-900,items:[{description:'Incoming card'}]},payments:{version:1,balanceMinor:-900,changeMinor:0,entries:[{method:'Cash',amountMinor:900,tenderedMinor:900}]}})],[snapshot()]),base);
 assert.deepEqual(salesProfit([receipt({method:'Split payment',tradeIn:{totalCreditMinor:1000,balanceMinor:1100,items:[{description:'Incoming card'}]},payments:{version:1,balanceMinor:1100,changeMinor:0,entries:[{method:'Cash',amountMinor:500,tenderedMinor:500},{method:'Other',amountMinor:600,tenderedMinor:600}]}})],[snapshot()]),base);
});
test('unknown historical cost is never zero and is not filled from current inventory',()=>{
 const result=salesProfit([receipt({currentCost:0})],[]);assert.equal(result.knownProfitMinor,null);assert.equal(result.knownLines,0);assert.equal(result.unknownSalesMinor,'2000');assert.equal(result.reasons[0].reason,'missing_snapshot');
});
test('known zero produces covered profit and an actual loss remains negative',()=>{
 for(const [minor,amount,profit]of [['0','0.00','2000'],['2500','25.00','-500']]){
  const s=snapshot();Object.assign(s.lines[0].cost,{minor,amount});assert.equal(salesProfit([receipt()],[s]).knownProfitMinor,profit);
 }
});
for(const reason of ['missing_amount','missing_currency','invalid_amount','invalid_currency','oversized_legacy_value'])test(`excludes ${reason} with explicit coverage`,()=>{
 const s=snapshot();s.lines[0].status=reason;Object.assign(s.lines[0].cost,{status:reason,minor:null});const result=salesProfit([receipt()],[s]);assert.equal(result.knownProfitMinor,null);assert.equal(result.reasons[0].reason,reason);
});
test('foreign currency and unlinked items remain distinct uncovered values',()=>{
 const s=snapshot();s.lines[0].status='foreign_currency';s.lines[0].cost.currency='CAD';assert.equal(salesProfit([receipt()],[s]).reasons[0].reason,'foreign_currency');
 s.lines[0]={...s.lines[0],instanceId:null,status:'unlinked',cost:{amount:null,currency:null,minor:null,status:'missing_amount'}};
 assert.equal(salesProfit([receipt()],[s]).reasons[0].reason,'unlinked');
});
test('mixed coverage reconciles known and unknown sales with only covered cost deducted',()=>{
 const r=receipt({items:[{quantity:1,unitMinor:2000},{quantity:2,unitMinor:500}],subtotalMinor:3000,totalMinor:3100});
 const s=snapshot();s.lines.push({index:1,instanceId:null,quantity:2,salesMinor:'1000',status:'unlinked',cost:{amount:null,currency:null,minor:null,status:'missing_amount'}});
 const result=salesProfit([r],[s]);assert.equal(result.knownProfitMinor,'800');assert.equal(result.knownSalesMinor,'2000');assert.equal(result.unknownSalesMinor,'1000');assert.equal(result.coverageBps,5000);assert.equal(result.totalUnits,'3');assert.equal(result.knownUnits,'1');
});
for(const change of [s=>s.soldAt='2026-10-08T12:00:00Z',s=>s.salesCurrency='CAD',s=>s.lines[0].quantity=2,s=>s.lines[0].salesMinor='1999',s=>s.lines[0].index=1,s=>s.lines[0].cost.minor='1',s=>s.lines[0].cost.amount='12.001',s=>s.lines[0].instanceId=null,s=>s.lines[0].cost.currency='CAD',s=>s.version=2])test('inconsistent snapshot cannot qualify profit '+change.toString(),()=>{
 const s=snapshot();change(s);const result=salesProfit([receipt()],[s]);assert.equal(result.knownProfitMinor,null);assert.equal(result.reasons[0].reason,'snapshot_mismatch');
});
test('a recorded discount reconciles sales but cannot invent its allocation',()=>{
 const result=salesProfit([receipt({discountMinor:100,totalMinor:2000})],[snapshot()]);assert.equal(result.itemSalesMinor,'1900');assert.equal(result.unknownSalesMinor,'1900');assert.equal(result.knownProfitMinor,null);assert.equal(result.reasons[0].reason,'discount_allocation_missing');
});
test('duplicates collapse only when the evidence agrees',()=>{
 assert.deepEqual(salesProfit([receipt(),receipt()],[snapshot(),snapshot()]),salesProfit([receipt()],[snapshot()]));
 assert.throws(()=>salesProfit([receipt(),receipt({totalMinor:9})],[snapshot()]),/Conflicting receipt/);
 const changed=snapshot();changed.lines[0].cost.amount='14.00';assert.throws(()=>salesProfit([receipt()],[snapshot(),changed]),/Conflicting cost/);
});
test('misstated receipt totals and unsafe numbers fail closed',()=>{
 for(const r of [receipt({subtotalMinor:19}),receipt({totalMinor:2200}),receipt({discountMinor:2500}),receipt({items:[{quantity:1,unitMinor:Number.MAX_SAFE_INTEGER+1}]}),receipt({createdAt:'bad'})])assert.throws(()=>salesProfit([r],[snapshot()]));
});
test('totals and formatting remain exact beyond safe floating-point aggregate range',()=>{
 const r=receipt({items:[{quantity:1,unitMinor:Number.MAX_SAFE_INTEGER}],subtotalMinor:Number.MAX_SAFE_INTEGER,taxMinor:0,totalMinor:Number.MAX_SAFE_INTEGER});
 const r2={...r,id:'other'};const result=salesProfit([r,r2],[]);assert.equal(result.itemSalesMinor,'18014398509481982');assert.equal(profitMoney(result.itemSalesMinor),'$180,143,985,094,819.82');assert.equal(profitMoney('-1'),'-$0.01');
});
test('an empty report has no invented profit or coverage percentage',()=>{
 const result=salesProfit([],[]);assert.equal(result.knownProfitMinor,null);assert.equal(result.coverageBps,null);assert.equal(result.itemSalesMinor,'0');
});
test('one physical copy cannot qualify cost twice within the same sale',()=>{
 const r=receipt({items:[{quantity:1,unitMinor:2000},{quantity:1,unitMinor:2000}],subtotalMinor:4000,totalMinor:4100});
 const s=snapshot();s.lines.push({...s.lines[0],index:1});
 const result=salesProfit([r],[s]);assert.equal(result.knownProfitMinor,null);assert.equal(result.reasons[0].reason,'snapshot_mismatch');
});
test('large qualified cost totals remain exact above the safe integer range',()=>{
 const rows=[],snapshots=[];
 for(let index=0;index<10000;index++){
  const tail=String(index).padStart(12,'0'),id='11111111-1111-4111-8111-'+tail;
  rows.push(receipt({id,items:[{quantity:1,unitMinor:100000000}],subtotalMinor:100000000,taxMinor:0,totalMinor:100000000}));
  const s=snapshot({receiptId:id});s.lines[0].instanceId='22222222-2222-4222-8222-'+tail;s.lines[0].salesMinor='100000000';s.lines[0].cost={amount:'9999999999.99',currency:'USD',minor:'999999999999',status:'known'};snapshots.push(s);
 }
 const report=salesProfit(rows,snapshots);assert.equal(report.knownCostMinor,'9999999999990000');assert.equal(report.knownProfitMinor,'-9998999999990000');assert.equal(profitMoney(report.knownProfitMinor),'-$99,989,999,999,900.00');
});
