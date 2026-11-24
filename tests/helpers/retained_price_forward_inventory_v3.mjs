import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertRetainedPriceForwardHashesV1} from './retained_price_forward_inventory_v1.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('../../scripts/schema/'+name,import.meta.url)));
const covering=read('best_of_game_discovery_candidate_v15.json');
const direct=read('best_of_game_discovery_candidate_v16.json');

// Source tests only: this does not approve either pending candidate. Operational
// V14/V15/V16 gates retain their exact original inventories and release scope.
export function assertRetainedPriceForwardHashesV3(history,actual){
  assert.equal(Object.keys(history).length,522);
  assert.deepEqual(direct.history,{...covering.history,...covering.candidates});
  assert.deepEqual(history,{...direct.history,...direct.candidates});
  const retained={...actual};
  for(const [file,hash]of Object.entries({...covering.candidates,...direct.candidates})){
    assert.equal(retained[file],hash,file);delete retained[file];
  }
  assertRetainedPriceForwardHashesV1(covering.history,retained);
}
export function assertRetainedPriceForwardInventoryV3(root,history){
  const folder=root+'/supabase/migrations/';
  const actual=Object.fromEntries(fs.readdirSync(folder).filter(f=>/^\d+.*\.sql$/.test(f)).sort().map(f=>[
    f,createHash('sha256').update(fs.readFileSync(folder+f)).digest('hex'),
  ]));
  assertRetainedPriceForwardHashesV3(history,actual);
}
