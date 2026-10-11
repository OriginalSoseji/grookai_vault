import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {correctionFixture,correctionOwner,correctionProfitCases,correctionRequestCases} from '../fixtures/sale_cost_correction_cases_v1.mjs';
import {salesProfit,salesProfitCorrected} from '../../apps/web/src/lib/sales/salesProfit.mjs';
import {validateSaleCostCorrectionRequest,validateSaleCostCorrectionOutcome,confirmedSaleCostCorrection,validateSaleCostCorrectionStates,validateSaleCostCorrectionHistory} from '../../apps/web/src/lib/sales/saleCostCorrections.mjs';
for(const row of correctionRequestCases)test('correction request: '+row.name,()=>{const before=JSON.stringify(row);if(row.valid)assert.deepEqual(validateSaleCostCorrectionRequest(row.request),row.request);else assert.throws(()=>validateSaleCostCorrectionRequest(row.request));assert.equal(JSON.stringify(row),before);});
for(const f of correctionProfitCases)test('corrected profit: '+f.name,()=>{
 const before=JSON.stringify(f),snapshots=f.snapshot?[f.snapshot]:[],original=salesProfit([f.receipt],snapshots);
 const report=salesProfitCorrected([f.receipt],snapshots,[f.state],correctionOwner);
 for(const[k,v]of Object.entries(f.want))assert.equal(report[k],v,k);
 assert.equal(report.basis,'owner_corrected');assert.deepEqual(report.reasons.map(r=>r.reason),f.reasons);
 assert.equal(BigInt(report.knownSalesMinor)+BigInt(report.unknownSalesMinor),BigInt(report.itemSalesMinor));
 assert.deepEqual(salesProfit([f.receipt],snapshots),original);assert.equal(JSON.stringify(f),before);
});
test('shared native fixtures match independently expected cases',()=>assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sale_cost_corrections_v1.json',import.meta.url))),{ownerId:correctionOwner,requests:correctionRequestCases,profits:correctionProfitCases}));
test('exact acknowledgement checks account, every request field and terminal state',()=>{
 const f=correctionFixture();assert.deepEqual(confirmedSaleCostCorrection(f.outcome.request,f.outcome,correctionOwner),f.outcome);
 for(const mutate of [o=>o.ownerId='d1000000-0000-4000-8000-000000000002',o=>o.request.reason+=' changed',o=>o.request.cost.minor='2001',o=>o.revision='2',o=>o.status='pending',o=>o.recordedAt='2030-02-30T00:00:00Z',o=>o.recordedAt='2030-01-01T25:00:00Z',o=>o.extra=true]) {const o=structuredClone(f.outcome);mutate(o);assert.throws(()=>confirmedSaleCostCorrection(f.outcome.request,o,correctionOwner));}
 const cancellation={...f.outcome,status:'cancelled',revision:null,source:null};assert.deepEqual(confirmedSaleCostCorrection(f.outcome.request,cancellation,correctionOwner),cancellation);
 assert.throws(()=>validateSaleCostCorrectionOutcome({...cancellation,revision:'1'},correctionOwner));assert.throws(()=>confirmedSaleCostCorrection(f.outcome.request,null,correctionOwner));
});
test('private state read rejects partial, duplicate, foreign and malformed line data',()=>{
 const f=correctionFixture(),ids=[f.receipt.id];
 for(const rows of [[],[f.state,f.state],[{...f.state,ownerId:'d1000000-0000-4000-8000-000000000002'}],[{...f.state,lines:[f.outcome,f.outcome]}],[{...f.state,source:null}],[{...f.state,lines:[{...f.outcome,status:'cancelled',revision:null,source:null}]}]])assert.throws(()=>validateSaleCostCorrectionStates(rows,correctionOwner,ids));
 assert.throws(()=>salesProfitCorrected([f.receipt,{...f.receipt,id:f.receipt.id.toUpperCase()}],[f.snapshot],[f.state],correctionOwner));
});
test('history is newest first, scoped to the owner, receipt and line',()=>{
 const f=correctionFixture(),newer=structuredClone(f.outcome);newer.revision='2';newer.request.expectedRevision='1';newer.request.requestId='c1000000-0000-4000-8000-000000000002';
 assert.equal(validateSaleCostCorrectionHistory([newer,f.outcome],correctionOwner,f.receipt.id,1).length,2);
 for(const rows of [[f.outcome,newer],[newer,newer]])assert.throws(()=>validateSaleCostCorrectionHistory(rows,correctionOwner,f.receipt.id,1));
 assert.throws(()=>validateSaleCostCorrectionHistory([newer],correctionOwner,f.receipt.id,0));assert.throws(()=>validateSaleCostCorrectionHistory([newer],correctionOwner,f.receipt.id,1,'2'));
});
