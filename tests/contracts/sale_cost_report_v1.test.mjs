import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {correctionFixture,correctionOwner,correctionProfitCases} from '../fixtures/sale_cost_correction_cases_v1.mjs';
import {saleCostReportCsv} from '../../apps/web/src/lib/sales/saleCostReport.mjs';
test('private CSV names the exact basis and preserves original and corrected amounts',()=>{
 const f=correctionFixture(),original=saleCostReportCsv([f.receipt],[f.snapshot]),corrected=saleCostReportCsv([f.receipt],[f.snapshot],{basis:'owner_corrected',states:[f.state],ownerId:correctionOwner});
 assert.match(original,/"Original cost at sale","90.00","60.00","30.00","1","2"/);
 assert.doesNotMatch(original,/original purchase invoice/);
 assert.match(corrected,/"Later owner corrections","135.00","80.00","55.00","2","2"/);
 for(const text of [f.outcome.request.reason,f.outcome.recordedAt,correctionOwner])assert.ok(corrected.includes(text));
 assert.throws(()=>saleCostReportCsv([f.receipt],[f.snapshot],{basis:'owner_corrected',states:[],ownerId:correctionOwner}));
 assert.throws(()=>saleCostReportCsv([f.receipt],[f.snapshot],{basis:'guess'}));
});
test('CSV escapes spreadsheet formulas and multiline private reasons',()=>{
 const f=correctionFixture();f.receipt.number='=1+1';f.state.receipt.number=f.receipt.number;f.outcome.request.receipt.number=f.receipt.number;f.outcome.request.reason='Invoice "A"\nVerified';
 const csv=saleCostReportCsv([f.receipt],[f.snapshot],{basis:'owner_corrected',states:[f.state],ownerId:correctionOwner});assert.ok(csv.includes('"\'=1+1"'));assert.ok(csv.includes('Invoice \\""A\\""\\nVerified'));assert.equal(csv.split('\r\n').length,2);
});
test('web/native CSV parity covers every cost coverage case and both explicit bases',()=>{
 const native=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/sale_cost_report_v1.json',import.meta.url)));
 const expected=correctionProfitCases.flatMap(f=>['original','owner_corrected'].map(basis=>({name:f.name,basis,receipt:f.receipt,snapshots:f.snapshot?[f.snapshot]:[],states:[f.state],ownerId:correctionOwner,csv:saleCostReportCsv([f.receipt],f.snapshot?[f.snapshot]:[],{basis,states:[f.state],ownerId:correctionOwner})})));
 assert.deepEqual(native,expected);
});
