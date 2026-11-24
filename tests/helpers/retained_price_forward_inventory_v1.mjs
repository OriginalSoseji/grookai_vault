import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const baseline=JSON.parse(fs.readFileSync(new URL('../../scripts/schema/market_price_retention_baseline_v1.json',import.meta.url)));
export const retainedPriceForwardCandidateV1=Object.freeze({
  '20261124010000_market_price_retention_display_v1.sql':'bf85f532b45f88abf181f4e943c82493c440d4d7a034154b4a9f13df6139d03e',
});

// Source-inventory assertion only. Historical operational release gates keep
// their original exact inventories and must reject this pending candidate.
export function assertRetainedPriceForwardHashesV1(history,actual){
  assert.equal(Object.keys(history).length,520);
  assert.deepEqual(history,baseline.history);
  assert.deepEqual(actual,{...history,...retainedPriceForwardCandidateV1});
}

export function assertRetainedPriceForwardInventoryV1(root,history){
  const folder=root+'/supabase/migrations/';
  const actual=Object.fromEntries(fs.readdirSync(folder).filter(f=>/^\d+.*\.sql$/.test(f)).sort().map(f=>[
    f,createHash('sha256').update(fs.readFileSync(folder+f)).digest('hex'),
  ]));
  assertRetainedPriceForwardHashesV1(history,actual);
}
