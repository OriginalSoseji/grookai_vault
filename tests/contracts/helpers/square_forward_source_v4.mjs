import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const retainedPriceSqlV1={"20261124010000_market_price_retention_display_v1.sql":"bf85f532b45f88abf181f4e943c82493c440d4d7a034154b4a9f13df6139d03e"};
// Source inventory only: V1/V2/V3 audit and historical apply gates remain frozen.
export function assertSquareForwardSourceV4(root, canonical523) {
 const previous=JSON.parse(fs.readFileSync(root+'/scripts/schema/square_price_batch_candidate_v3.json'));
 const current=JSON.parse(fs.readFileSync(root+'/scripts/schema/square_price_batch_candidate_v4.json'));
 assert.equal(previous.baselineMigrations,523);assert.equal(previous.targetMigrations,529);
 assert.deepEqual(previous.history,canonical523);assert.equal(Object.keys(canonical523).length,523);
 assert.equal(current.sourceBase,'086cf59776b315f57a36f726ea69d9ef46720483');assert.equal(current.baselineMigrations,524);assert.equal(current.targetMigrations,530);
 assert.deepEqual(current.history,{...canonical523,...retainedPriceSqlV1});
 assert.deepEqual(current.candidates,previous.candidates);assert.equal(Object.keys(current.candidates).length,6);
 const sources={...current.history,...current.candidates};
 assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys(sources).sort());
 for(const [file,hash]of Object.entries(sources))assert.equal(createHash('sha256').update(fs.readFileSync(root+'/supabase/migrations/'+file)).digest('hex'),hash,file);
 return current;
}
