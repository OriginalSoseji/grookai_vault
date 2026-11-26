// Source coexistence assertion only. Earlier operational gates remain unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CANDIDATE,SQL_SHA,sha256,validateInventory} from '../../scripts/schema/jungle_scoped_price_lineage_release_policy_v1.mjs';
import {assertRetainedPriceForwardHashesV4} from './retained_price_forward_inventory_v4.mjs';
const binding=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/jungle_scoped_price_lineage_release_v1.json',import.meta.url)));

export function assertJungleScopedPriceForwardHashesV1(history,actual){
 validateInventory(binding.history,actual);
 assert.equal(actual[CANDIDATE],SQL_SHA);
 const previous={...actual};delete previous[CANDIDATE];
 assertRetainedPriceForwardHashesV4(history,previous);
}
export function assertRetainedPriceForwardInventoryV4(root,history){
 const folder=root+'/supabase/migrations/';
 const actual=Object.fromEntries(fs.readdirSync(folder).filter(f=>/^\d+.*\.sql$/.test(f)).sort().map(f=>[f,sha256(fs.readFileSync(folder+f))]));
 assertJungleScopedPriceForwardHashesV1(history,actual);
}
