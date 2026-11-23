import assert from 'node:assert/strict';
import {readFileSync,existsSync}from'node:fs';
import {spawnSync}from'node:child_process';
import {fileURLToPath}from'node:url';
import test from'node:test';
import {assertRetainedPriceForwardHashesV1,retainedPriceForwardCandidateV1} from '../helpers/retained_price_forward_inventory_v1.mjs';
const sql=readFileSync(new URL('../../supabase/migrations/20261124010000_market_price_retention_display_v1.sql',import.meta.url),'utf8');
const reader=sql.slice(sql.indexOf('create or replace function public.get_market_pricing_read_model_v1('));
test('retention changes only the display reader and three private identity helpers',()=>{
 const names=[...sql.matchAll(/create or replace function public\.([a-z0-9_]+)/g)].map(m=>m[1]).sort();
 assert.deepEqual(names,['get_market_pricing_read_model_v1','market_retained_gym_price_row_valid_v1','market_retained_jungle_price_row_valid_v1','market_retained_price_identity_valid_v1'].sort());
 assert.doesNotMatch(sql,/\b(?:alter|drop|truncate)\s+(?:table|trigger|policy)|create\s+(?:table|trigger|policy)|update\s+public\.|delete\s+from\s+public\.|insert\s+into\s+public\./i);
 assert.match(sql,/from public,anon,authenticated/);
});
test('display age labels are dynamic and do not filter out old accepted prices',()=>{
 assert.equal((reader.match(/then 'fresh'::text else 'stale'::text end as freshness/g)||[]).length,2);
 assert.doesNotMatch(reader,/and snapshot\.source_sync_finished_at >= now\(\) - interval '36 hours'/);
 assert.match(reader,/snapshot\.source_sync_finished_at as observed_at/);
});
test('only reachable accepted publications can supply a retained quote',()=>{
 assert.match(reader,/publication\.id=accepted\.previous_publication_set_id/);
 assert.match(reader,/publication\.publication_state='superseded'/);
 assert.match(reader,/run\.state in \('published','verified'\)/);
 assert.match(reader,/not publication\.id=any\(accepted\.visited\)/);
 assert.match(reader,/public\.market_retained_price_identity_valid_v1\(to_jsonb\(snapshot\)\)/);
});
test('retained editions revalidate original immutable assignments and current bindings',()=>{
 assert.match(sql,/public\.tcgplayer_jungle_edition_assignments_v1 assignment/);
 assert.match(sql,/public\.resolve_tcgplayer_jungle_edition_v1/);
 assert.match(sql,/public\.pokemon_tcgplayer_gym_challenge_binding_valid_v1\(assignment\.binding_id,true\)/);
 assert.doesNotMatch(sql,/from public\.v_tcgplayer_(?:jungle|gym_challenge)_edition_current_assignments_v1/);
});

test('forward source inventory rejects extra, missing and changed migration bytes',()=>{
 const history=JSON.parse(readFileSync(new URL('../../scripts/schema/market_price_retention_baseline_v1.json',import.meta.url))).history;
 const actual={...history,...retainedPriceForwardCandidateV1};
 assertRetainedPriceForwardHashesV1(history,actual);
 assert.throws(()=>assertRetainedPriceForwardHashesV1(history,{...actual,'20261124020000_unqualified.sql':'0'.repeat(64)}));
 const missing={...actual};delete missing[Object.keys(history)[0]];
 assert.throws(()=>assertRetainedPriceForwardHashesV1(history,missing));
 for(const file of [Object.keys(history)[0],Object.keys(retainedPriceForwardCandidateV1)[0]]){
  assert.throws(()=>assertRetainedPriceForwardHashesV1(history,{...actual,[file]:'0'.repeat(64)}));
 }
});

test('unchanged historical catalog release gate refuses the forward candidate before database access',()=>{
 const root=fileURLToPath(new URL('../../',import.meta.url));
 const out='C:/grookai_vault_operator_artifacts/best_of_game_catalog_current_main_520_20261122/release-gate-v14-retention-contract-negative-v1';
 assert.equal(existsSync(out),false);
 const env={...process.env};
 for(const key of Object.keys(env))if(/SECRET|TOKEN|PASSWORD|CREDENTIAL|PRIVATE_KEY|DATABASE_URL|DB_URL/i.test(key)||key.startsWith('SUPABASE_'))delete env[key];
 const result=spawnSync(process.execPath,[root+'/scripts/schema/verify_best_of_game_discovery_release_v14.mjs','AuditLinkedSchema','--out-dir='+out],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:15000});
 assert.ifError(result.error);assert.notEqual(result.status,0);
 assert.match(result.stderr,/market_price_retention_display_v1\.sql/);
 assert.match(result.stderr,/verify_best_of_game_discovery_release_v14\.mjs:5:/);
 assert.equal(existsSync(out),false);
});
