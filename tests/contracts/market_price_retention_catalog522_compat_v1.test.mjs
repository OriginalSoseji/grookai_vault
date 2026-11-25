import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {assertRetainedPriceForwardHashesV3} from '../helpers/retained_price_forward_inventory_v3.mjs';
import {assertRetainedPriceForwardInventoryV4} from '../helpers/retained_price_forward_inventory_v4.mjs';
import {retainedPriceForwardCandidateV1} from '../helpers/retained_price_forward_inventory_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=file=>JSON.parse(readFileSync(root+'/scripts/schema/'+file));

test('catalog522 pricing source rejects extra, missing and changed migrations',()=>{
  const covering=read('best_of_game_discovery_candidate_v15.json'),direct=read('best_of_game_discovery_candidate_v16.json');
  const history={...direct.history,...direct.candidates},actual={...history,...retainedPriceForwardCandidateV1};
  const bulk=read('best_of_game_discovery_candidate_v17.json');
  assertRetainedPriceForwardInventoryV4(root,{...bulk.history,...bulk.candidates});
  assert.throws(()=>assertRetainedPriceForwardHashesV3(history,{...actual,'20261124020000_unqualified.sql':'0'.repeat(64)}));
  for(const file of [Object.keys(covering.history)[0],...Object.keys(covering.candidates),...Object.keys(direct.candidates),...Object.keys(retainedPriceForwardCandidateV1)]){
    const missing={...actual};delete missing[file];
    assert.throws(()=>assertRetainedPriceForwardHashesV3(history,missing));
    assert.throws(()=>assertRetainedPriceForwardHashesV3(history,{...actual,[file]:'0'.repeat(64)}));
  }
});

test('unchanged V16 operational gate rejects pending pricing before database access',()=>{
  const out='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123/release-gate-v16-retention-contract-negative-v1';
  assert.equal(existsSync(out),false);
  const result=spawnSync(process.execPath,[root+'/scripts/schema/verify_best_of_game_discovery_release_v16.mjs','AuditLinkedSchema','--out-dir='+out],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.ifError(result.error);assert.notEqual(result.status,0);
  assert.match(result.stderr,/market_price_retention_display_v1\.sql/);
  assert.equal(existsSync(out),false);
});

test('catalog and pricing candidates change disjoint functions and have fixed replay order',()=>{
  const direct=read('best_of_game_discovery_candidate_v16.json'),catalogFile=Object.keys(direct.candidates)[0],priceFile=Object.keys(retainedPriceForwardCandidateV1)[0];
  assert.ok(catalogFile<priceFile);
  const names=file=>[...readFileSync(root+'/supabase/migrations/'+file,'utf8').matchAll(/create or replace function public\.([a-z0-9_]+)/g)].map(x=>x[1]);
  const catalog=names(catalogFile),pricing=names(priceFile);
  assert.equal(catalog.length,3);assert.equal(pricing.length,4);
  assert.deepEqual(catalog.filter(name=>pricing.includes(name)),[]);
});
