import fs from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import pg from 'pg';
const base='C:/grookai_vault_operator_artifacts/jungle_edition_pricing_20261001/populated-source-v1';
const proof=JSON.parse(fs.readFileSync(base+'/resolved-readiness-upgrade-receipt.json'));assert.equal(proof.status,'passed');
const out=base+'/scoped-boundary-'+Date.now();fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
const c=new pg.Client({host:'127.0.0.1',port:64940,user:'postgres',password:'postgres',database:'postgres',statement_timeout:120000});await c.connect();
try{
 const t=(await c.query("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];assert.match(t.address,/^10\.248\.5\.\d+$/);assert.equal(t.workers,'0');assert.equal(t.migrations,419);
 await c.query('begin');const tests=[];const before=(await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows;
 const scoped=async ids=>(await c.query('select to_jsonb(t) value from tcgplayer_jungle_assignment_candidates_for_products_v1($1::integer[]) t order by source_observation_id',[ids])).rows;
 const global=(await c.query('select to_jsonb(t) value from v_tcgplayer_jungle_edition_assignment_candidates_v1 t order by source_observation_id')).rows;assert.equal(global.length,128);
 const products=[...new Set(global.map(r=>Number(r.value.assignment_payload.source.product_id)))];assert.equal(products.length,64);assert.deepEqual(await scoped(products),global);tests.push('all_128_scoped_rows_equal_authoritative_full_view');
 assert.deepEqual(await scoped([]),[]);assert.deepEqual(await scoped([2147483647]),[]);tests.push('empty_and_unknown_products_reject');
 const product=products[0],pair=await scoped([product]);assert.equal(pair.length,2);
 const observation=(await c.query('select to_jsonb(t) value from tcgcsv_source_price_daily_observations t where id=$1',[pair[0].value.source_observation_id])).rows[0].value;
 await c.query('savepoint duplicate');const duplicate={...observation,id:randomUUID(),source_price_row_identity:observation.source_price_row_identity+':duplicate-proof'};
 await c.query('insert into tcgcsv_source_price_daily_observations select * from jsonb_populate_record(null::tcgcsv_source_price_daily_observations,$1::jsonb)',[JSON.stringify(duplicate)]);
 assert.equal((await scoped([product])).length,1);tests.push('same_product_subtype_duplicate_remains_held');
 await c.query('update tcgcsv_source_price_daily_observations set group_id=636 where id=$1',[duplicate.id]);assert.equal((await scoped([product])).length,1);tests.push('duplicate_with_conflicting_group_still_counted');await c.query('rollback to duplicate');
 const assignment=(await c.query('select id from v_tcgplayer_jungle_edition_current_assignments_v1 where source_observation_id=$1',[observation.id])).rows[0];assert.ok(assignment);
 const row=(await c.query('select to_jsonb(t) value from v_tcgplayer_market_qualification_candidates_v2 t where source_observation_id=$1',[observation.id])).rows[0].value;
 const valid=async data=>(await c.query('select jungle_edition_price_row_valid_v1($1::jsonb) valid',[JSON.stringify(data)])).rows[0].valid;
 assert.equal(await valid(row),true);tests.push('actual_null_artifact_date_retained_in_candidate_lineage');
 assert.equal(await valid({...row,source_artifact_date:'2026-10-01'}),false);tests.push('invented_artifact_date_rejected');
 assert.equal(await valid({...row,source_observed_on:'2026-09-30'}),false);tests.push('changed_quote_date_rejected');
 assert.equal(await valid({...row,market_price:999999}),false);tests.push('changed_amount_rejected');
 await c.query('savepoint drift');await c.query("update tcgcsv_source_artifacts set observed_on='2026-10-01'");assert.equal(await valid(row),false);tests.push('artifact_metadata_change_invalidates_frozen_assignment');await c.query('rollback to drift');
 assert.equal(await valid(row),true);assert.deepEqual((await c.query('select to_jsonb(t) value from vault_item_instances t order by id')).rows,before);assert.equal(before.length,7);await c.query('rollback');
 const receipt={at:new Date().toISOString(),status:'passed',tests,testCount:tests.length,savedCopiesPreserved:7,rollback:true,productionWrites:0};save('receipt.json',receipt);console.log(JSON.stringify(receipt));
}catch(e){await c.query('rollback').catch(()=>{});save('failure.json',{message:e.message,stack:e.stack});throw e;}finally{await c.end();}
