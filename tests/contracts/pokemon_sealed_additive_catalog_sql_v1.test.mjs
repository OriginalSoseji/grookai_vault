import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { buildPokemonSealedWorldPlanV1 } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { executePokemonSealedAdditiveCatalogV1 as execute,
  POKEMON_SEALED_ADDITIVE_TABLES_V1 as tables } from '../../backend/pricing/pokemon_sealed_additive_catalog_v1.mjs';

test('real local SQL: additive insert, family reuse, freeze, idempotency and complete rollback',
  {skip:process.env.GROOKAI_SEALED_ADDITIVE_LOCAL_SQL !== '1'}, async () => {
  const container = JSON.parse(execFileSync('docker', ['inspect','supabase_db_sealed-ownership-replay-20260907'], {encoding:'utf8'}))[0];
  assert.ok(container.NetworkSettings.Ports['5432/tcp'].some(p => p.HostPort === '55430'));
  const password = container.Config.Env.find(e => e.startsWith('POSTGRES_PASSWORD='))?.slice('POSTGRES_PASSWORD='.length);
  assert.ok(password, 'Local test database password unavailable');
  const c = new pg.Client({host:'127.0.0.1',port:55430,user:'postgres',database:'postgres',password,
    connectionTimeoutMillis:10000,statement_timeout:20000,query_timeout:25000});
  await c.connect(); let plan;
  const productId=1999300001, groupId=1999300002, syncId='409a8b33-bfc3-4b59-a288-412622690dad';
  try {
    await c.query('begin isolation level serializable');
    assert.equal((await c.query('select product_id from tcgcsv_source_products where product_id=$1',[productId])).rowCount,0);
    await c.query(`insert into tcgcsv_source_categories(category_id,name,display_name,non_sealed_label,raw_payload,payload_hash)
      values(3,'Pokemon','Pokemon','Single Cards','{}',$1) on conflict(category_id) do nothing`,['a'.repeat(64)]);
    await c.query(`insert into tcgcsv_source_groups(group_id,category_id,name,raw_payload,payload_hash)
      values($1,3,'Additive SQL Fixture','{}',$2)`,[groupId,'a'.repeat(64)]);
    await c.query(`insert into tcgcsv_source_sync_runs(id,run_key,sync_mode,status,observed_on,finished_at,worker_version,parser_version,schema_contract_version)
      values($1,'additive-sql-fixture','current_full_sync','completed',current_date,now(),'fixture','fixture','fixture')`,[syncId]);
    await c.query(`insert into tcgcsv_source_products(product_id,category_id,group_id,name,extended_data,raw_payload,payload_hash)
      values($1,3,$2,'Fixture Booster Pack','[]','{}',$3)`,[productId,groupId,'a'.repeat(64)]);
    await c.query(`insert into tcgcsv_source_price_daily_observations(product_id,source_price_row_identity,subtype_name,
      subtype_name_normalized,observed_on,currency,market_price,low_price,raw_payload,payload_hash)
      values($1,'additive-sql-fixture:normal','Normal','normal',current_date,'USD',20,10,'{}',$2)`,[productId,'b'.repeat(64)]);
    const source=(await c.query(`select p.*,c.name category_name,c.display_name category_display_name,c.non_sealed_label,g.name group_name
      from tcgcsv_source_products p join tcgcsv_source_categories c using(category_id)
      join tcgcsv_source_groups g using(group_id) where p.product_id=$1`,[productId])).rows;
    const prices=(await c.query(`select product_id,source_price_row_identity,subtype_name_normalized,observed_on::text,currency,
      market_price,low_price,mid_price,high_price,direct_low_price,payload_hash from tcgcsv_source_price_daily_observations where product_id=$1`,[productId])).rows;
    const sync=(await c.query('select id,status,observed_on::text,finished_at from tcgcsv_source_sync_runs where id=$1',[syncId])).rows[0];
    sync.finished_at=sync.finished_at.toISOString();
    plan=buildPokemonSealedWorldPlanV1({sourceRows:source,latestPriceRows:prices,latestSync:sync,producerCommit:'c'.repeat(40)});
    const family=plan.payload.families[0];
    await c.query(`insert into sealed_product_families(id,game_key,family_key,canonical_name,manufacturer_name,
      product_line_key,identity_contract_version,identity_fingerprint) values($1,$2,$3,$4,$5,$6,$7,$8)`,
    [family.id,family.game_key,family.family_key,family.canonical_name,family.manufacturer_name,family.product_line_key,family.identity_contract_version,family.identity_fingerprint]);
    const authority={fingerprint:plan.plan_fingerprint_sha256,producerCommit:plan.producer_commit,productIds:[productId]};
    const preview=await execute(c,plan,authority);
    assert.equal(preview.inserted,0); assert.ok(preview.expected_inserted>0);
    await c.query('savepoint family_drift');
    await assert.rejects(c.query("update sealed_product_families set canonical_name='Wrong family' where id=$1",[family.id]), /append-only/);
    await c.query('rollback to savepoint family_drift');
    await c.query('savepoint partial_collision');
    const partial={...plan.payload.variants[0],created_at:new Date().toISOString()};
    await c.query(`insert into sealed_product_variants select * from jsonb_populate_record(null::sealed_product_variants,$1::jsonb)`,[JSON.stringify(partial)]);
    await assert.rejects(execute(c,plan,authority,{write:true}), /Readback count/);
    await c.query('rollback to savepoint partial_collision');
    // Drift must be caught before the first canonical insert.
    await c.query('savepoint source_drift');
    await c.query("update tcgcsv_source_products set name='Wrong Booster Pack' where product_id=$1",[productId]);
    await assert.rejects(execute(c,plan,authority,{write:true}), /projection drift/);
    await c.query('rollback to savepoint source_drift');
    const applied=await execute(c,plan,authority,{write:true});
    assert.equal(applied.inserted,preview.expected_inserted); assert.equal(applied.pointer_writes,0);
    const rerun=await execute(c,plan,authority,{write:true});
    assert.equal(rerun.already_applied,true); assert.equal(rerun.inserted,0);
    await c.query('rollback');
    for (const [key,table] of Object.entries(tables)) assert.equal((await c.query(
      `select id from ${table} where id=any($1::uuid[])`,[plan.payload[key].map(r=>r.id)])).rowCount,0,`Rollback residue: ${key}`);
    assert.equal((await c.query('select product_id from tcgcsv_source_products where product_id=$1',[productId])).rowCount,0);
  } finally {await c.query('rollback').catch(()=>{});await c.end();}
});
