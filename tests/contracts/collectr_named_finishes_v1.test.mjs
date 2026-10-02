import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {collectrPokemonNamedFinish,collectrNamedFinishVarianceAgrees} from '../../supabase/functions/vault-import-collection-v2/pokemon_named_finish.ts';
import {normalize} from '../../supabase/functions/vault-import-collection-v2/source.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_named_finishes_v1.json',import.meta.url)));
for(const c of cases)test('named finish parsing preserves unsupported labels: '+c.name,()=>{
 assert.deepEqual(collectrPokemonNamedFinish(c.name),c.finish?{name:c.base,finishKey:c.finish}:null);
 const source={'Product Name':c.name,Category:'Pokemon',Set:'Synthetic Set','Card Number':'7',Variance:'Holofoil',Grade:'Ungraded',Quantity:'2'};
 const before=structuredClone(source),normal=normalize(source);
 assert.equal(normal.finishKey,c.finish??'holo');assert.deepEqual(source,before);
 assert.equal(normal.name,c.name.trim().replace(/\s+/g,' ').toLowerCase());
 if(c.finish){
  for(const variance of ['', 'holo','Holofoil'])assert.equal(normalize({...source,Variance:variance}).finishKey,c.finish);
  for(const variance of ['Normal','Reverse Holofoil','Foil','1st Edition','cosmos'])assert.throws(()=>normalize({...source,Variance:variance}),/import_finish_requires_review/);
  for(const change of [{Grade:'PSA 10'},{Watchlist:'true'},{Set:'Synthetic Set (1st Edition)'}])assert.throws(()=>normalize({...source,...change}));
  assert.equal(normalize({...source,Category:'MTG'}).finishKey,'holo');
 }
});
test('only generic blank/holo Variance can accompany a named finish',()=>{
 for(const value of ['', 'Holofoil',' HOLO '])assert.equal(collectrNamedFinishVarianceAgrees(value),true);
 for(const value of ['Normal','Reverse Holo','Foil','Unlimited','Surge Foil'])assert.equal(collectrNamedFinishVarianceAgrees(value),false);
});
