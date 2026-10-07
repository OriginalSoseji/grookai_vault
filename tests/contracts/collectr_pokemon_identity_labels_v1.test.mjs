import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalize} from '../../supabase/functions/vault-import-collection-v2/source.ts';
import {matchesCollectrPokemonName} from '../../supabase/functions/vault-import-collection-v2/pokemon_name.ts';
import {collectrPokemonNamedFinish} from '../../supabase/functions/vault-import-collection-v2/pokemon_named_finish.ts';

const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_pokemon_identity_labels_v1.json',import.meta.url)));
for(const c of cases)test('identity label with finish evidence: '+c.label,()=>{
  const source={'Product Name':c.sourceName,Category:'Pokemon',Set:'Test','Card Number':c.sourceNumber,Variance:c.variance,Grade:'Ungraded',Quantity:'2'};
  const original=structuredClone(source);
  let normalized;
  try { normalized=normalize(source); } catch(error) {
    assert.equal(c.expected,false);assert.match(error.message,/import_finish_requires_review/);return;
  }
  const named=collectrPokemonNamedFinish(normalized.name);
  assert.equal(matchesCollectrPokemonName({sourceName:named?.name??normalized.name,sourceNumber:normalized.number,game:normalized.game,card:c.card}),c.expected);
  if(c.expected)assert.equal(normalized.finishKey,c.finish);
  assert.deepEqual(source,original);
});
