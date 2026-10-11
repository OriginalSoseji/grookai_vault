import test from 'node:test';
import assert from 'node:assert/strict';
import {correctionFixture,correctionOwner} from '../fixtures/sale_cost_correction_cases_v1.mjs';
import {changeCostCorrectionJournal,validateCostCorrectionJournal} from '../../apps/web/src/lib/sales/costCorrectionJournal.mjs';
const one='11111111-1111-4111-8111-111111111111',two='22222222-2222-4222-8222-222222222222';
const change=(action,previous,next,extra={})=>({ownerId:correctionOwner,expectedLocalRevision:previous,nextLocalRevision:next,action,...extra});
test('pending correction retains exact data until an applied or cancelled acknowledgement',()=>{
 const {outcome}=correctionFixture(),request=outcome.request;
 const staged=changeCostCorrectionJournal(null,change('stage',null,one,{request})),before=JSON.stringify(staged);
 for(const action of ['discard','discardRejected','reject','cancel','reset'])assert.throws(()=>changeCostCorrectionJournal(staged,change(action,one,two,{request,code:'PT409'})));
 assert.throws(()=>changeCostCorrectionJournal(staged,change('acknowledge',one,two,{request,acknowledgement:null})));
 for(const acknowledgement of [outcome,{...outcome,status:'cancelled',source:null,revision:null}])assert.equal(changeCostCorrectionJournal(staged,change('acknowledge',one,two,{request,acknowledgement})).pending,null);
 assert.equal(JSON.stringify(staged),before);
});
test('concurrent, changed and foreign operations preserve existing pending data',()=>{
 const {outcome}=correctionFixture(),request=outcome.request,staged=changeCostCorrectionJournal(null,change('stage',null,one,{request}));
 assert.throws(()=>changeCostCorrectionJournal(staged,change('stage',one,two,{request})));
 assert.throws(()=>changeCostCorrectionJournal(staged,change('acknowledge',null,two,{request,acknowledgement:outcome})));
 assert.throws(()=>changeCostCorrectionJournal(staged,change('acknowledge',one,one,{request,acknowledgement:outcome})));
 assert.throws(()=>changeCostCorrectionJournal(staged,change('acknowledge',one,two,{request:{...request,reason:'Changed'},acknowledgement:outcome})));
 assert.throws(()=>validateCostCorrectionJournal(staged,'d1000000-0000-4000-8000-000000000002'));
 assert.throws(()=>validateCostCorrectionJournal({...staged,pending:undefined},correctionOwner));
 assert.deepEqual(validateCostCorrectionJournal(JSON.parse(JSON.stringify(staged)),correctionOwner),staged);
});
