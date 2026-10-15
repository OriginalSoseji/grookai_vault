import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {eventReport,eventReportCsv} from '../../apps/web/src/lib/sales/eventReport.mjs';
import {cases,input,sale,snapshot} from '../fixtures/event_report_cases_v1.mjs';
test('native event report vectors match web cases',()=>assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../../test/fixtures/event_report_v1.json',import.meta.url))).cases,cases));
function partial(actual,expected){for(const [key,value]of Object.entries(expected)){if(value&&typeof value==='object')partial(actual[key],value);else assert.deepEqual(actual[key],value,key);}}
for(const c of cases)test('event totals: '+c.name,()=>{if(!c.valid){assert.throws(()=>eventReport(c.args));return;}const before=JSON.stringify(c.args);partial(eventReport(c.args),c.expected);assert.equal(JSON.stringify(c.args),before);});
test('aggregate historical costs remain exact above the Number boundary',()=>{
 const args=input();args.receipts=Array.from({length:10000},(_,i)=>sale(i+1,'1.00'));args.snapshots=args.receipts.map(r=>snapshot(r,'999999999999'));
 args.state.selected.assignments=args.receipts.map(r=>({receiptId:r.id,eventId:args.eventId,revision:'1'}));
 const r=eventReport(args);assert.equal(r.profit.knownCostMinor,'9999999999990000');assert.equal(r.knownCostEventSubtotalMinor,'-9999999998991000');
});
test('CSV uses visible receipt filter, all active event expenses and safe text cells',()=>{
 const args=input();args.query='Card 1';args.state.events[0].name='=Event';args.state.selected.expenses[0].description='@Booth, "fee"';
 const csv=eventReportCsv(eventReport(args));assert.equal(csv.split('\r\n').length,3);
 assert.ok(csv.includes(args.receipts[0].id));assert.ok(!csv.includes(args.receipts[1].id));
 assert.ok(csv.includes('"\'=Event"'));assert.ok(csv.includes('"\'@Booth, ""fee"""'));assert.ok(csv.includes('"60.00","40.00"'));assert.ok(csv.includes('"10.00","booth"'));
 args.state.selected.expenses[0].voided=true;args.state.selected.expenses[0].lastReason='Duplicate';assert.equal(eventReportCsv(eventReport(args)).split('\r\n').length,2);
});
