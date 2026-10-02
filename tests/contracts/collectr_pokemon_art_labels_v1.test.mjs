import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
import {matchesCollectrPokemonName} from '../../supabase/functions/vault-import-collection-v2/pokemon_name.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_pokemon_art_labels_v1.json',import.meta.url)));
for(const c of cases)test('art evidence: '+c.label,()=>{
 const card={name:'Synthetic-EX',number:'7',rarity:c.rarity,variant_key:c.variant,identity_domain:'pokemon_eng_standard'};
 const input={sourceName:c.name,sourceNumber:'007/100',game:'pokemon',card};
 assert.equal(matchesCollectrPokemonName(input),c.expected);
 if(!c.expected)return;
 for(const change of [{number:'8'},{identity_domain:'pokemon_jpn_standard'},{language:'ja'},{rarity:null},{printed_identity_modifier:'prize_pack_stamp'}])assert.equal(matchesCollectrPokemonName({...input,card:{...card,...change}}),false);
 assert.equal(matchesCollectrPokemonName({...input,game:'mtg'}),false);
});
