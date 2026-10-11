import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {changeEventJournal} from '../../apps/web/src/lib/sales/eventJournal.mjs';
import {cases} from '../fixtures/event_journal_cases_v1.mjs';
test('native journal vectors match web cases',()=>assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../../test/fixtures/event_journal_v1.json',import.meta.url))).cases,cases));
for(const c of cases)test('event journal: '+c.name,()=>{
 const before=JSON.stringify(c);if(c.valid)assert.deepEqual(changeEventJournal(c.current,c.change),c.expected);else assert.throws(()=>changeEventJournal(c.current,c.change));assert.equal(JSON.stringify(c),before);
});
