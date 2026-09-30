import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesCollectrMtgIdentity} from '../../supabase/functions/vault-import-collection-v2/mtg_identity.ts';
const cases=JSON.parse(fs.readFileSync(new URL('../../test/fixtures/collectr_mtg_identity_v1.json',import.meta.url)));
for(const {label,expected,input} of cases) test(label,()=>assert.equal(matchesCollectrMtgIdentity(input),expected));
