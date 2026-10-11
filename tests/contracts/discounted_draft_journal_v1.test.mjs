import test from 'node:test';
import assert from 'node:assert/strict';
import {draftJournal,newDraft,saleRequest,totals,customerDeal} from '../../apps/web/src/lib/sales/salesDesk.mjs';
import {newNegotiatedDraft} from '../../apps/web/src/lib/sales/negotiatedDraft.mjs';
import {newPurchaseDraft} from '../../apps/web/src/lib/sales/purchaseDraft.mjs';
import {discountDraft} from '../fixtures/discounted_draft_cases_v1.mjs';
import {discountRequest,discountReceipt} from '../fixtures/discounted_sale_cases_v1.mjs';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',third='33333333-3333-4333-8333-333333333333';
const lock=async(_,fn)=>fn();
function fixture(){const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};return{values,storage,journal:draftJournal(storage,owner,lock)};}
async function stage(journal){return journal.update(0,b=>({...b,drafts:[structuredClone(discountDraft)],active:discountDraft.id,pending:structuredClone(discountRequest)}));}
const cancel=()=>({version:1,request:structuredClone(discountRequest),status:'cancelled'});
const ack=()=>({version:1,request:structuredClone(discountRequest),receipt:discountReceipt()});
test('journal5 retains all older held draft kinds under existing owner key',async()=>{
 const {journal,storage}=fixture(),old=[newDraft(owner),newPurchaseDraft(other),newNegotiatedDraft(third)];
 await journal.update(0,b=>({...b,drafts:old,active:owner}));
 const b=await journal.update(1,b=>({...b,drafts:[...b.drafts,structuredClone(discountDraft)],active:discountDraft.id}));
 assert.equal(b.version,5);assert.equal(journal.key,'grookai.sales-desk.v2.'+owner);
 assert.deepEqual(draftJournal(storage,owner,lock).read().drafts.slice(0,3),old);
 const cleared=await journal.update(2,b=>({...b,drafts:old,active:owner}));assert.equal(cleared.version,5);
});
test('zero discount never downgrades or dispatches through legacy sale writer',async()=>{
 const {journal}=fixture(),draft={...discountDraft,discountMinor:0};
 await journal.update(0,b=>({...b,drafts:[draft],active:draft.id}));assert.equal(journal.read().version,5);
 assert.throws(()=>saleRequest(draft,other));assert.equal(totals(discountDraft).balance,185);assert.equal(customerDeal(discountDraft).discount,20);
});
test('exact pending bytes survive reopen; absence cannot authorize clearing',async()=>{
 const {journal,storage}=fixture();await stage(journal);const encoded=JSON.stringify(journal.read().pending),reopen=draftJournal(storage,owner,lock);
 assert.equal(JSON.stringify(reopen.read().pending),encoded);
 await assert.rejects(reopen.update(1,b=>({...b,pending:null})),/Recover or confirm cancellation/);
 assert.throws(()=>reopen.confirmDiscountedCancellation(null,discountRequest));
 await assert.rejects(reopen.update(1,b=>({...b,pending:null})));
 await assert.rejects(reopen.update(1,b=>({...b,pending:{...b.pending,cart:{...b.pending.cart,note:'changed'}}})));
 await assert.rejects(reopen.update(1,b=>({...b,drafts:[{...discountDraft,discountMinor:21}]})));
});
for(const completed of [false,true])test('bound terminal outcome allows clearing: '+completed,async()=>{
 const {journal}=fixture();await stage(journal);
 if(completed)assert.equal(journal.confirmDiscounted(ack(),discountRequest).id,discountRequest.id);
 else assert.equal(journal.confirmDiscountedCancellation(cancel(),discountRequest).status,'cancelled');
 const b=await journal.update(1,b=>({...b,pending:null}));assert.equal(b.pending,null);assert.deepEqual(b.drafts,[discountDraft]);
});
test('same totals with another copy cannot unlock the pending request',async()=>{
 const {journal}=fixture();await stage(journal);const changed=cancel();changed.request.cart.items[0].instanceId=other;
 assert.throws(()=>journal.confirmDiscountedCancellation(changed,discountRequest));
 await assert.rejects(journal.update(1,b=>({...b,pending:null})));
});
test('confirmation is owner, journal instance and exact saved bytes bound',async()=>{
 const {journal,storage,values}=fixture();await stage(journal);journal.confirmDiscountedCancellation(cancel(),discountRequest);
 await assert.rejects(draftJournal(storage,owner,lock).update(1,b=>({...b,pending:null})));
 assert.throws(()=>draftJournal(storage,other,lock).confirmDiscountedCancellation(cancel(),discountRequest));
 const changed=journal.read();changed.pending.cart.note='changed';values.set(journal.key,JSON.stringify(changed));
 await assert.rejects(journal.update(1,b=>({...b,pending:null})));
});
test('silent storage failure cannot acknowledge staging',async()=>{
 const {journal,storage}=fixture();storage.setItem=()=>{};await assert.rejects(stage(journal),/could not be verified/);assert.equal(journal.read().pending,null);
});
test('stale revision cannot stage or overwrite another tab',async()=>{
 const {journal}=fixture();await stage(journal);await assert.rejects(journal.update(0,b=>b),/another tab/);assert.deepEqual(journal.read().pending,discountRequest);
});
test('legacy pending payload remains byte-equivalent in upgraded journal',async()=>{
 const {journal}=fixture(),draft={...newDraft(owner,'Shop'),items:[{description:'Legacy',unitMinor:100,quantity:1}]},pending=saleRequest(draft,other);
 await journal.update(0,b=>({...b,drafts:[draft],active:owner,pending}));const before=JSON.stringify(journal.read().pending);
 await journal.update(1,b=>({...b,version:5}));assert.equal(JSON.stringify(journal.read().pending),before);
});
test('v6 pending cannot be associated with a legacy active draft',async()=>{
 const {journal}=fixture();await assert.rejects(journal.update(0,b=>({...b,drafts:[newDraft(owner)],active:owner,pending:discountRequest})));
});
