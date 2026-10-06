import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {addLine,customerDeal,draftJournal,minor,newDraft,rate,saleRequest,totals,tradeCredit} from '../../apps/web/src/lib/sales/salesDesk.mjs';
import {salesReport,reportCsv} from '../../apps/web/src/lib/sales/salesReport.mjs';

const line=(extra={})=>({description:'Synthetic Pikachu',quantity:1,unitMinor:8000,...extra});
const draft=()=>addLine(newDraft(randomUUID(),'Synthetic shop'),line());
const storage=()=>{const values=new Map();return {values,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};};
function locks(){let tail=Promise.resolve();return (_name,fn)=>{const p=tail.then(fn);tail=p.catch(()=>{});return p;};}

test('money inputs reject floating point shortcuts, negatives and unsupported totals',()=>{
  assert.equal(minor('80.25'),8025);assert.equal(minor('0.01'),1);assert.equal(rate('67.25'),6725);
  for(const invalid of ['-1','1e3','0.009','NaN','1000000.01'])assert.equal(minor(invalid),null);
  assert.equal(rate('100.01'),null);assert.equal(rate('0'),null);
});
test('integer trade credit rounds half cents and shows either direction of payment',()=>{
  const d=draft();d.trades=[{description:'Quick trade',quantity:3,valueMinor:101,rateBps:5000,cardId:null,printingId:null,condition:null,addToVault:false}];
  assert.equal(tradeCredit(d.trades[0]),152);assert.equal(totals(d).balance,7848);
  d.trades[0].valueMinor=10000;assert.equal(totals(d).balance,-7000);
  assert.equal(saleRequest(d,randomUUID()).cart.version,2);
});
test('physical sibling copies stay distinct; duplicate IDs and quantities are rejected',()=>{
  let d=newDraft(randomUUID(),'Shop'),id=randomUUID();d=addLine(d,line({instanceId:id}));
  assert.throws(()=>addLine(d,line({instanceId:id})),/exact copy/);
  assert.throws(()=>addLine(d,line({instanceId:randomUUID(),quantity:2})),/quantity/);
  d=addLine(d,line({instanceId:randomUUID()}));assert.equal(d.items.length,2);
});
test('full carts and oversized trades are rejected before a new copy can be staged',()=>{
  const d=draft();d.items=Array.from({length:50},()=>line());assert.throws(()=>addLine(d,line()),/50/);
  d.trades=[{description:'Too large',valueMinor:100000000,rateBps:1,quantity:999,cardId:null,printingId:null,condition:null,addToVault:false}];
  assert.throws(()=>saleRequest(d,randomUUID()),/trade value/);
});
test('sale payload contains only writer fields and snapshots customer values',()=>{
  const d=addLine(newDraft(randomUUID(),'Shop'),line({image:'https://fixture.invalid/card.png',askingMinor:9000,costMinor:100}));
  const saved=saleRequest(d,randomUUID());assert.deepEqual(Object.keys(saved.cart.items[0]),['instanceId','description','quantity','unitMinor']);
  d.customer.name='Changed';assert.equal(saved.cart.customer.name,'');assert.equal(saved.cart.version,1);
});
test('customer-facing deal excludes CRM, internal notes, copy identity and cost',()=>{
  const d=draft();d.note='Private note';d.customer={name:'Customer',email:'private@fixture.invalid',phone:'private phone',wants:'private wants',notes:'private notes'};
  d.items[0]={...d.items[0],instanceId:randomUUID(),gvviId:'private-copy-id',costMinor:25,askingMinor:9000};
  const visible=customerDeal(d);assert.equal(visible.items[0].askingMinor,9000);
  const encoded=JSON.stringify(visible);for(const privateValue of ['Private','private','Customer','costMinor','instanceId','gvviId'])assert.equal(encoded.includes(privateValue),false);
});
test('journal restores drafts under owner-specific keys',async()=>{
  const s=storage(),a=draftJournal(s,randomUUID(),locks()),b=draftJournal(s,randomUUID(),locks());const d=draft();
  await a.update(0,j=>({...j,drafts:[d],active:d.id}));assert.deepEqual(a.read().drafts,[d]);assert.equal(b.read().drafts.length,0);
  assert.throws(()=>draftJournal(s,'------------------------------------',locks()),/Sign in/);
});
test('concurrent tabs cannot overwrite a newer draft revision',async()=>{
  const s=storage(),owner=randomUUID(),lock=locks(),a=draftJournal(s,owner,lock),b=draftJournal(s,owner,lock);
  const one=draft(),two=draft();const results=await Promise.allSettled([a.update(0,j=>({...j,drafts:[one],active:one.id})),b.update(0,j=>({...j,drafts:[two],active:two.id}))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(a.read().revision,1);assert.equal(a.read().drafts[0].id,one.id);
});
test('lost sale replies retain the immutable request across reload and block edits',async()=>{
  const s=storage(),owner=randomUUID(),lock=locks(),a=draftJournal(s,owner,lock),d=draft();const pending=saleRequest(d,randomUUID());
  await a.update(0,j=>({...j,drafts:[d],active:d.id,pending}));const b=draftJournal(s,owner,lock);assert.deepEqual(b.read().pending,pending);
  await assert.rejects(b.update(1,j=>({...j,pending:{...pending,id:randomUUID()}})),/pending sale/);
  await assert.rejects(b.update(1,j=>({...j,drafts:j.drafts.map(d=>({...d,taxMinor:1}))})),/before editing/);
  assert.equal(b.read().revision,1);await b.update(1,j=>({...j,pending:null}));assert.equal(b.read().pending,null);
});
test('a pending catalog add retains both original payload and destination cart',async()=>{
  const s=storage(),a=draftJournal(s,randomUUID(),locks()),d=draft();const catalog={id:randomUUID(),draftId:d.id,card:{cardId:randomUUID(),printingId:randomUUID(),condition:'NM',intent:'hold',priceMinor:null},line:line()};
  await a.update(0,j=>({...j,drafts:[d],active:d.id,catalog}));
  await assert.rejects(a.update(1,j=>({...j,catalog:{...catalog,id:randomUUID()}})),/pending catalog/);
  await assert.rejects(a.update(1,j=>({...j,drafts:[]})),/before editing/);
  assert.deepEqual(a.read().catalog,catalog);
});
test('corrupt storage and failed writes preserve the prior bytes',async()=>{
  const s=storage(),a=draftJournal(s,randomUUID(),locks());s.values.set(a.key,'{"version":2,"revision":0,"drafts":[{}]}');
  assert.throws(()=>a.read(),/Preserve/);assert.equal(s.values.size,1);
  const full={getItem:()=>null,setItem:()=>{throw Error('Storage full');}},b=draftJournal(full,randomUUID(),locks()),d=draft();
  await assert.rejects(b.update(0,j=>({...j,drafts:[d],active:d.id})),/Storage full/);assert.equal(b.read().revision,0);
});
test('report deduplicates recovered receipts, separates trades, tax and customer payouts, and respects exclusive end',()=>{
 const base={id:randomUUID(),number:'GV-1',createdAt:'2026-10-05T12:30:00Z',customerName:'Buyer',method:'Cash',items:[{description:'Pikachu',quantity:2,unitMinor:500}],subtotalMinor:1000,discountMinor:100,taxMinor:50,totalMinor:950};
 const trade={...base,id:randomUUID(),number:'GV-2',tradeIn:{balanceMinor:-550,totalCreditMinor:1500,items:[{description:'Charizard'}]}};
 const boundary={...base,id:randomUUID(),createdAt:'2026-10-06T00:00:00Z'};
 const options={start:new Date('2026-10-05T00:00:00Z'),end:new Date('2026-10-06T00:00:00Z'),hour:d=>d.getUTCHours()};
 const report=salesReport([base,base,trade,boundary],options);assert.equal(report.transactions,2);assert.equal(report.sales,1800);assert.equal(report.tax,100);assert.equal(report.received,950);assert.equal(report.paid,550);assert.equal(report.credit,1500);assert.equal(report.units,4);assert.deepEqual(report.hours[12],{sales:1800,transactions:2});assert.equal(report.payments.Cash,400);
 assert.equal(salesReport([base,trade],{...options,query:'Charizard'}).transactions,1);assert.equal(salesReport([base,trade],{...options,method:'Other'}).transactions,0);
 const exported=reportCsv([{...base,customerName:' =HYPERLINK("bad")'}]);assert.ok(exported.includes("' =HYPERLINK"));assert.ok(exported.includes('9.50'));assert.throws(()=>salesReport([],{start:options.end,end:options.start}),/date range/);
});
