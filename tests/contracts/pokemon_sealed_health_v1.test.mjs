import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluatePokemonSealedHealthV1 as evaluate} from '../../backend/pricing/pokemon_sealed_health_v1.mjs';
const valid={published:1721,expected:1721,oldestAgeDays:1,sourceAgeDays:1};
test('healthy sealed release remains read-only',()=>{const r=evaluate(valid);assert.equal(r.status,'healthy');assert.equal(r.database_writes,0);assert.equal(r.automatic_price_publication,false);});
test('aging prices alert before endpoint expires',()=>assert.ok(evaluate({...valid,oldestAgeDays:4}).findings.includes('price_refresh_due_before_seven_day_expiry')));
test('missing prices, image mismatch, anonymous grants and source drift cannot look healthy',()=>{
  for(const delta of [{published:0},{published:1700},{oldestAgeDays:NaN},{sourceAgeDays:3},{newProducts:1},{changedMappings:1},{anonymousPrivilege:true},{pointersAligned:false}])assert.equal(evaluate({...valid,...delta}).status,'attention_required');
});
