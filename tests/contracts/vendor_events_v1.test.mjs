import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateEventRequest,confirmedEventRequest,eventRequestParams} from '../../apps/web/src/lib/sales/vendorEvents.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/vendor_events_v1.json',import.meta.url)));
for(const c of fixtures.requestCases)test('event request: '+c.name,()=>{
 if(!c.valid){assert.throws(()=>validateEventRequest(c.request));return;}
 const r=validateEventRequest(c.request);assert.deepEqual(r,c.request);assert.notEqual(r,c.request);assert.notEqual(r.operation,c.request.operation);
 assert.deepEqual(eventRequestParams(r),{p_request:r});
});
for(const c of fixtures.ackCases)test('event acknowledgement: '+c.name,()=>{
 if(c.valid)assert.deepEqual(confirmedEventRequest(c.request,c.result,c.ownerId),c.result);
 else assert.throws(()=>confirmedEventRequest(c.request,c.result,c.ownerId));
});
test('event text refuses unpaired Unicode before JSON dispatch',()=>{
 for(const name of ['\ud800','\udc00']){const r=structuredClone(fixtures.requestCases[0].request);r.operation.name=name;assert.throws(()=>validateEventRequest(r));}
});
test('an acknowledgement compares semantic JSON fields without depending on object-key order',()=>{
 const c=structuredClone(fixtures.ackCases[0]);c.result.operation=Object.fromEntries(Object.entries(c.result.operation).reverse());assert.deepEqual(confirmedEventRequest(c.request,c.result,c.ownerId),c.result);
});
