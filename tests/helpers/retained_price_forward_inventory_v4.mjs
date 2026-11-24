import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {assertRetainedPriceForwardHashesV3} from './retained_price_forward_inventory_v3.mjs';

const bulk=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/best_of_game_discovery_candidate_v17.json',import.meta.url)));
const candidate={'20261124040000_catalog_bulk_alias_visibility_v1.sql':'3d633cc8e1f59a56c1f0e76e25f4c0f4945674f17a8289d367e1be3e1ee6c19e'};

// Source assertions only. V17's operational gate still rejects pending pricing.
export function assertRetainedPriceForwardHashesV4(history,actual){
  assert.equal(Object.keys(bulk.history).length,522);
  assert.deepEqual(bulk.candidates,candidate);
  assert.deepEqual(history,{...bulk.history,...candidate});
  assert.equal(Object.keys(history).length,523);
  const retained={...actual};
  for(const[file,hash]of Object.entries(candidate)){
    assert.equal(retained[file],hash,file);delete retained[file];
  }
  assertRetainedPriceForwardHashesV3(bulk.history,retained);
}

export function assertRetainedPriceForwardInventoryV4(root,history){
  const folder=root+'/supabase/migrations/';
  const actual=Object.fromEntries(fs.readdirSync(folder).filter(file=>/^\d+.*\.sql$/.test(file)).sort().map(file=>[
    file,createHash('sha256').update(fs.readFileSync(folder+file)).digest('hex'),
  ]));
  assertRetainedPriceForwardHashesV4(history,actual);
}
