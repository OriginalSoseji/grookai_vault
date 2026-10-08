import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateEventState} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
import {cases} from '../fixtures/vendor_event_state_cases_v1.mjs';
const shared=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/vendor_event_state_v1.json',import.meta.url)));
test('native event read vectors match web cases',()=>assert.deepEqual(shared.cases,cases));
for(const c of cases)test('event read: '+c.name,()=>{
 if(!c.valid){assert.throws(()=>validateEventState(c.value,c.ownerId,c.selectedId));return;}
 const result=validateEventState(c.value,c.ownerId,c.selectedId);assert.deepEqual(result,c.value);assert.notEqual(result,c.value);
});
