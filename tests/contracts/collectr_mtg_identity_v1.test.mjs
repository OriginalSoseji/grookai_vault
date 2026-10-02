import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {matchesCollectrMtgIdentity} from '../../supabase/functions/vault-import-collection-v2/mtg_identity.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_mtg_identity_v1.json',import.meta.url)));
for(const {label,expected,input} of cases) test(label,()=>assert.equal(matchesCollectrMtgIdentity(input),expected));
test('FCA generated maps match the reviewed public manifest',()=>{
 execFileSync(process.execPath,['scripts/generate_collectr_fca_names_v1.mjs','--check'],{cwd:new URL('../..',import.meta.url)});
});
