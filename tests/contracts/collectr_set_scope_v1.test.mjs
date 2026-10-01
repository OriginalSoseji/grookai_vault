import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {collectrSetTargets} from '../../supabase/functions/vault-import-collection-v2/set_scope.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_set_scopes_v1.json',import.meta.url)));
test('unknown labels and games cannot resolve through object prototype properties',()=>{
 for(const key of ['constructor','__proto__','toString','hasOwnProperty']){
  assert.deepEqual(collectrSetTargets(key,'pokemon','7'),[key.toLowerCase()]);
  assert.deepEqual(collectrSetTargets('Pitch Black',key,'7'),['pitch black']);
 }
});
for(const c of cases)test(`directional set scope: ${c.source}`,()=>{
 const targets=c.catalog.map(s=>s.toLowerCase());
 assert.deepEqual(collectrSetTargets('  '+c.source.toUpperCase()+' ',c.game,'RC7'),targets);
 assert.deepEqual(collectrSetTargets(c.source,'pokemon_jpn','RC7'),[c.source.toLowerCase()]);
 assert.deepEqual(collectrSetTargets(c.source+' (1st Edition)',c.game,'RC7'),[(c.source+' (1st Edition)').toLowerCase()]);
 for(const catalog of c.catalog)assert.deepEqual(collectrSetTargets(catalog,c.game,'7'),[catalog.toLowerCase()]);
 if(c.numberPrefix)for(const n of ['7','RC','RC7a','TG7','RC7/32',''])assert.deepEqual(collectrSetTargets(c.source,c.game,n),[]);
});
