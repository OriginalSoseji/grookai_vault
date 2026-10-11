import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {discountedDraftCases,discountDraft} from '../fixtures/discounted_draft_cases_v1.mjs';
import {discountRequest} from '../fixtures/discounted_sale_cases_v1.mjs';
import {validateDiscountedDraft,newDiscountedDraft,discountedDraftRequest,discountedDraftTotals,discountedDraftCustomerView} from '../../apps/web/src/lib/sales/discountedDraft.mjs';
assert.deepEqual(JSON.parse(fs.readFileSync('test/fixtures/discounted_draft_v1.json')),discountedDraftCases);
for(const row of discountedDraftCases)test('discounted draft: '+row.name,()=>{
 const before=JSON.stringify(row),validate=()=>validateDiscountedDraft(row.draft),request=()=>discountedDraftRequest(row.draft,discountRequest.id,true);
 if(row.draftValid)assert.deepEqual(validate(),row.draft);else assert.throws(validate);
 if(row.requestValid){const result=request();assert.equal(result.cart.version,6);assert.equal(result.cart.discountMinor,row.draft.discountMinor);assert.deepEqual(result,JSON.parse(JSON.stringify(result)));}else assert.throws(request);
 assert.equal(JSON.stringify(row),before);
});
test('new discounted draft and customer projection have explicit privacy and review boundaries',()=>{
 const fresh=newDiscountedDraft(discountDraft.id);assert.equal(fresh.discountMinor,0);assert.equal(fresh.kind,'discounted-sale');
 assert.throws(()=>discountedDraftRequest(discountDraft,discountRequest.id,false));
 assert.deepEqual(discountedDraftTotals(discountDraft),{subtotal:200,discount:20,credit:0,total:185,balance:185});
 const view=discountedDraftCustomerView(discountDraft);assert.equal(view.discount,20);
 for(const secret of ['PRIVATE_NOTE','PRIVATE_WANTS','PRIVATE_CUSTOMER_NOTE','private@example.invalid',discountRequest.cart.items[0].instanceId])assert.ok(!JSON.stringify(view).includes(secret));
});
