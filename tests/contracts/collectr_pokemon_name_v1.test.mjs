import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCollectrPokemonName} from '../../supabase/functions/vault-import-collection-v2/pokemon_name.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_pokemon_name_v1.json',import.meta.url)));
for(const {label,expected,input} of cases) test(label,()=>assert.equal(matchesCollectrPokemonName(input),expected));
