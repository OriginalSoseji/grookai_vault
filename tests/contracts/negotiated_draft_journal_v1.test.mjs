import test from 'node:test';
import assert from 'node:assert/strict';
import {draftJournal,newDraft,saleRequest,totals,customerDeal,tradeCredit,addLine} from '../../apps/web/src/lib/sales/salesDesk.mjs';
import {newNegotiatedDraft,addNegotiatedTrade,negotiatedDraftRequest} from '../../apps/web/src/lib/sales/negotiatedDraft.mjs';
import {newPurchaseDraft} from '../../apps/web/src/lib/sales/purchaseDraft.mjs';
const owner='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const line={description:'Bundle',quantity:3,valueMinor:null,rateBps:null,creditMinor:650,cardId:null,printingId:null,condition:null,addToVault:false};
const trade=()=>addNegotiatedTrade({...newNegotiatedDraft(id,'Shop'),items:[{description:'Sale',quantity:1,unitMinor:1000}]},line);
function fixture(){const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return{values,storage,journal:draftJournal(storage,owner,async(_,fn)=>fn())};}
test('new journal version retains its key, older sale and purchase drafts',async()=>{
 const {journal}=fixture();const sale=newDraft(owner,'Shop'),purchase=newPurchaseDraft(other,'Shop');
 const initial=await journal.update(0,b=>({...b,active:owner,drafts:[sale,purchase]}));assert.equal(initial.version,3);
 const upgraded=await journal.update(initial.revision,b=>({...b,active:id,drafts:[...b.drafts,trade()]}));
 assert.equal(upgraded.version,4);assert.equal(journal.key,'grookai.sales-desk.v2.'+owner);
 assert.deepEqual(journal.read().drafts.slice(0,2),[sale,purchase]);
});
test('exact pending v5 request survives reopen and blocks changed terms',async()=>{
 const {journal,storage}=fixture(),d=trade(),pending=negotiatedDraftRequest(d,other,true);
 await journal.update(0,b=>({...b,active:id,drafts:[d],pending}));
 const reopened=draftJournal(storage,owner,async(_,fn)=>fn());assert.deepEqual(reopened.read().pending,pending);
 await assert.rejects(reopened.update(1,b=>({...b,pending:{...b.pending,cart:{...b.pending.cart,note:'changed'}}})));
 await assert.rejects(reopened.update(1,b=>({...b,drafts:b.drafts.map(d=>({...d,note:'changed'}))})));
 assert.deepEqual(reopened.read().pending,pending);
});
test('failed storage acknowledgement returns no accepted transition',async()=>{
 const {journal,storage}=fixture();storage.setItem=()=>{};
 await assert.rejects(journal.update(0,b=>({...b,active:id,drafts:[trade()]})),/could not be verified/);
 assert.equal(journal.read().drafts.length,0);
});
test('legacy pending sale remains byte-equivalent during later book upgrade',async()=>{
 const {journal}=fixture(),sale={...newDraft(owner,'Shop'),items:[{description:'Old',quantity:1,unitMinor:1000}]},pending=saleRequest(sale,other);
 await journal.update(0,b=>({...b,active:owner,drafts:[sale],pending}));const before=JSON.stringify(journal.read().pending);
 await journal.update(1,b=>({...b,version:4}));assert.equal(JSON.stringify(journal.read().pending),before);
});
test('new pending request cannot be carried by a legacy active draft or legacy writer',async()=>{
 const {journal}=fixture(),pending=negotiatedDraftRequest(trade(),other,true);
 await assert.rejects(journal.update(0,b=>({...b,active:owner,drafts:[newDraft(owner,'Shop')],pending})));
 assert.throws(()=>saleRequest(trade(),other));
});
test('shared totals and customer preview use explicit credit for a new draft',()=>{
 const d=trade();assert.equal(totals(d).credit,650);assert.equal(customerDeal(d).trades[0].creditMinor,650);
 assert.ok(!Object.hasOwn(customerDeal(d).trades[0],'valueMinor'));
 const next=addLine(d,{description:'Second outgoing item',quantity:1,unitMinor:500});
 assert.equal(totals(next).credit,650);assert.equal(totals(next).balance,850);
 assert.equal(tradeCredit({...line,valueMinor:1000,rateBps:6000}),1800);
});

import {acknowledgement,request as backendRequest} from '../fixtures/negotiated_trade_cases_v1.mjs';
test('only exact bound acknowledgement can clear a pending trade',async()=>{
 const {journal}=fixture(),pending=backendRequest();
 await journal.update(0,b=>({...b,active:id,drafts:[trade()],pending}));
 await assert.rejects(journal.update(1,b=>({...b,pending:null})),/Recover and verify/);
 const ack=acknowledgement();ack.request.cart.items[0].instanceId=other;
 assert.throws(()=>journal.confirmNegotiated(ack,pending));
 await assert.rejects(journal.update(1,b=>({...b,pending:null})));
 assert.equal(journal.confirmNegotiated(acknowledgement(),pending).id,pending.id);
 await journal.update(1,b=>({...b,pending:null}));assert.equal(journal.read().pending,null);
});
test('bound confirmation cannot clear changed bytes or authorize another journal instance',async()=>{
 const {journal,storage,values}=fixture(),pending=backendRequest();
 await journal.update(0,b=>({...b,active:id,drafts:[trade()],pending}));
 journal.confirmNegotiated(acknowledgement(),pending);
 const reopened=draftJournal(storage,owner,async(_,fn)=>fn());
 await assert.rejects(reopened.update(1,b=>({...b,pending:null})));
 const changed=journal.read();changed.pending.cart.note='later';values.set(journal.key,JSON.stringify(changed));
 assert.throws(()=>journal.confirmNegotiated(acknowledgement(),pending),/changed/);
 await assert.rejects(journal.update(1,b=>({...b,pending:null})));
});
