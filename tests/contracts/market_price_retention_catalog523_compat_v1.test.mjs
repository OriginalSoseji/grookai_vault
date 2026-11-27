import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import test from 'node:test';
import {assertRetainedPriceForwardHashesV4} from '../helpers/retained_price_forward_inventory_v4.mjs';
import {assertRetainedPriceForwardInventoryV4} from '../helpers/jungle_scoped_price_forward_inventory_v1.mjs';
import {retainedPriceForwardCandidateV1} from '../helpers/retained_price_forward_inventory_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=file=>JSON.parse(readFileSync(root+'/scripts/schema/'+file));

test('catalog523 pricing inventory rejects all extra, omitted and changed migration bytes',()=>{
  const bulk=read('best_of_game_discovery_candidate_v17.json'),history={...bulk.history,...bulk.candidates};
  const actual={...history,...retainedPriceForwardCandidateV1};
  assertRetainedPriceForwardInventoryV4(root,history);
  for(const file of [Object.keys(bulk.history)[0],...Object.keys(bulk.candidates),...Object.keys(retainedPriceForwardCandidateV1)]){
    const missing={...actual};delete missing[file];
    assert.throws(()=>assertRetainedPriceForwardHashesV4(history,missing));
    assert.throws(()=>assertRetainedPriceForwardHashesV4(history,{...actual,[file]:'0'.repeat(64)}));
  }
  assert.throws(()=>assertRetainedPriceForwardHashesV4(history,{...actual,'20261124050000_unqualified.sql':'0'.repeat(64)}));
});

test('unchanged V17 operational gate rejects pricing before private artifacts or DB access',()=>{
  const out='C:/grookai_vault_operator_artifacts/best_of_game_catalog_load_522_20261124/release-gate-v17-pricing-inventory-negative-v1';
  assert.equal(existsSync(out),false);
  const result=spawnSync(process.execPath,[root+'/scripts/schema/verify_best_of_game_discovery_release_v17.mjs','AuditLinkedSchema','--out-dir='+out],{encoding:'utf8',windowsHide:true,timeout:15000});
  assert.ifError(result.error);assert.notEqual(result.status,0);
  assert.match(result.stderr,/market_price_retention_display_v1\.sql/);
  assert.equal(existsSync(out),false);
});

test('catalog523 and pricing change disjoint readers and preserve their original replay order',()=>{
  const bulk=read('best_of_game_discovery_candidate_v17.json');
  const catalogFile=Object.keys(bulk.candidates)[0],priceFile=Object.keys(retainedPriceForwardCandidateV1)[0];
  assert.ok(priceFile<catalogFile,'pricing sorts before bulk catalog; populated upgrades need a separately qualified exact-one CLI path');
  const names=file=>[...readFileSync(root+'/supabase/migrations/'+file,'utf8').matchAll(/create or replace function public\.([a-z0-9_]+)/gi)].map(match=>match[1]);
  const catalog=names(catalogFile),pricing=names(priceFile);
  assert.deepEqual(catalog,['get_public_catalog_sets_v2']);assert.equal(pricing.length,4);
  assert.deepEqual(catalog.filter(name=>pricing.includes(name)),[]);
});
