import {test} from 'node:test';import assert from 'node:assert/strict';import {SquareClient} from '../client_v1.mjs';
const location='fixture-location',since='2026-11-10T00:00:00Z',until='2026-11-11T00:00:00Z',created='2026-11-01T00:00:00Z';
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
test('refund polling uses independent update time, retained connection start, location and complete pages',async()=>{
 const requests=[];const client=new SquareClient({environment:'sandbox',accessToken:'synthetic-token',fetchImpl:async url=>{
  requests.push(new URL(url));return reply({refunds:[{id:'refund-'+requests.length,location_id:location}],...(requests.length===1?{cursor:'page-two'}:{})});
 }});
 assert.equal((await client.recentRefunds(location,since,until,created)).length,2);
 assert.equal(requests[0].pathname,'/v2/refunds');assert.equal(requests[0].searchParams.get('begin_time'),created);
 assert.equal(requests[0].searchParams.get('updated_at_begin_time'),since);assert.equal(requests[0].searchParams.get('sort_field'),'UPDATED_AT');
 assert.equal(requests[0].searchParams.get('location_id'),location);assert.equal(requests[1].searchParams.get('cursor'),'page-two');
});
test('repeated refund cursor or foreign location cannot advance reconciliation as complete',async()=>{
 for(const data of [{cursor:'repeated'},{refunds:[{id:'refund',location_id:'foreign-location'}]}]){
  const client=new SquareClient({environment:'sandbox',accessToken:'synthetic-token',fetchImpl:async()=>reply(data)});
  await assert.rejects(client.recentRefunds(location,since,until,created),/square_refunds_incomplete|square_refund_unconfirmed/);
 }
});
