import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {validateEventHistory} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
import {cases} from '../fixtures/event_history_cases_v1.mjs';
test('native history vectors match web cases',()=>assert.deepEqual(JSON.parse(fs.readFileSync(new URL('../../test/fixtures/event_history_v1.json',import.meta.url))).cases,cases));
for(const c of cases)test('event history: '+c.name,()=>{if(c.valid)assert.deepEqual(validateEventHistory(c.value,c.ownerId,c.eventId,c.beforeRevision,c.limit),c.expected);else assert.throws(()=>validateEventHistory(c.value,c.ownerId,c.eventId,c.beforeRevision,c.limit));});
