import test from 'node:test';
import assert from 'node:assert/strict';
import { loadMtgDateOnlyReleaseDatesV1 as load } from '../../backend/catalog/mtg_date_only_release_service_v1.mjs';
const id='001e8971-1465-5432-9af6-9f5cbb483401',sourceId='8688c051-a8f6-4894-ac16-ec7578f7029e';
function clients({hidden=false,failRaw=false,validCandidate=true}={}){
  const calls=[],tables={card_prints:[{id,external_ids:{scryfall:sourceId},ai_metadata:validCandidate?{mtg_print_release_date_v1:{version:'mtg_print_release_date:v1'}}:null}],
    card_print_identity:[],external_mappings:[],raw_imports:[]};
  function client(publicOnly){return {from(table){
    assert.equal(publicOnly,table==='v_card_prints_discovery_v1');
    const q={select(){return q;},eq(){return q;},in(){return q;},order(){return q;},async range(a,b){calls.push(table);
      if(table==='raw_imports'&&failRaw)return {data:null,error:{message:'private-secret-detail'}};
      return {data:(publicOnly?(hidden?[]:[{id}]):tables[table]).slice(a,b+1),error:null};}};return q;
  }}};return {publicClient:client(true),backendClient:client(false),calls};
}
test('invisible cards never cause a privileged read',async()=>{
  const c=clients({hidden:true});assert.equal((await load(c.publicClient,c.backendClient,[id])).size,0);
  assert.deepEqual(c.calls,['v_card_prints_discovery_v1']);
});
test('ordinary cards do not fetch private date receipts',async()=>{
  const c=clients({validCandidate:false});assert.equal((await load(c.publicClient,c.backendClient,[id])).size,0);
  assert.deepEqual(c.calls,['v_card_prints_discovery_v1','card_prints']);
});
test('private errors are sanitized and malformed IDs are rejected before reads',async()=>{
  const c=clients({failRaw:true});await assert.rejects(load(c.publicClient,c.backendClient,[id]),e=>/could not be verified/.test(e.message)&&!/private-secret-detail/.test(e.message));
  const bad=clients();await assert.rejects(load(bad.publicClient,bad.backendClient,['bad-id']),/invalid/);assert.deepEqual(bad.calls,[]);
});
