// All synthetic rows and transitions are inside one rollback-only local transaction.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import { fixture } from '../fixtures/sealed_canary_plan_v1.mjs';
import { buildAccountCanaryPlan, canaryHash } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { transitionCanary, readCanaryState, classifyCanaryState, canaryPreservationHash } from '../../backend/pricing/sealed_ownership_account_canary_execute_v1.mjs';
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_sealed-ownership-replay-20260907'],{encoding:'utf8'}))[0];
assert.equal(container.NetworkSettings.Ports['5432/tcp'][0].HostPort,'55430'); assert.equal(container.State.Running,true);
const config={host:'127.0.0.1',port:55430,user:'postgres',password:'postgres',database:'postgres',statement_timeout:10000};
const c=new pg.Client(config); let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
await c.connect();
try {
  assert.equal((await c.query('select count(*)::int n from auth.users')).rows[0].n,0,'Disposable empty replay required');
  await c.query('begin');
  const {snapshot,repository}=fixture();
  snapshot.captured_at=new Date(Date.now()-1000).toISOString();
  for(const row of snapshot.candidates) row.observed_on=snapshot.captured_at.slice(0,10);
  const plan=buildAccountCanaryPlan(snapshot,repository);
  await c.query("insert into auth.users(id,email) values($1,'sealed-transition@example.invalid')",[plan.owner_id]);
  await c.query('select public.ensure_vault_owner_v1($1)',[plan.owner_id]);
  for(const v of plan.variants) {
    await c.query(`insert into public.sealed_product_families(id,game_key,family_key,canonical_name,manufacturer_name,identity_contract_version,identity_fingerprint)
      values($1::uuid,$2,$1::text,'Synthetic box','Fixture','fixture',$3)`,[v.variant_id,v.game_key,canaryHash(v.variant_id)]);
    await c.query(`insert into public.sealed_product_variants(id,family_id,variant_key,canonical_name,package_form,language_code,identity_contract_version,identity_fingerprint)
      values($1,$1,'fixture','Synthetic box','booster_box','en','fixture',$2)`,[v.variant_id,canaryHash(v.variant_id)]);
  }
  const input={mode:'activate',plan,preflight:snapshot,versions:[]};
  // Canonical evidence is a unit fixture here; SQL permissions/locks/rows are real local PostgreSQL.
  const capture=async()=>structuredClone(snapshot);
  await c.query('savepoint baseline');
  await check('fresh drift rolls back with zero enrollment',async()=>{
    await assert.rejects(transitionCanary(c,input,async()=>({...snapshot,policy_hash:'c'.repeat(64)})),/drift/);
    assert.equal(classifyCanaryState(await readCanaryState(c),plan),'not_enrolled');
    await c.query('rollback to savepoint baseline');
  });
  await check('affected-row mismatch aborts and rollback restores empty scope',async()=>{
    const mismatch={query:async(sql,args)=>{
      const result=await c.query(sql,args);
      return sql.startsWith('update public.sealed_ownership_controls_v1 set canary_enabled=true') ? {...result,rowCount:0} : result;
    }};
    await assert.rejects(transitionCanary(mismatch,input,capture));
    await c.query('rollback to savepoint baseline');
    assert.equal(classifyCanaryState(await readCanaryState(c),plan),'not_enrolled');
  });
  await check('activation inserts only exact grant/variants and canary flag',async()=>{
    const result=await transitionCanary(c,input,capture);
    assert.deepEqual(result.counts,{grants_inserted:1,variants_inserted:2,controls_updated:1,grants_revoked:0});
    assert.equal(result.inventory_writes,0);
  });
  await check('activation replay is zero-write without quota renewal',async()=>{
    const result=await transitionCanary(c,input,()=>{throw Error('must not refresh active grant');});
    assert.ok(Object.values(result.counts).every(n=>n===0));
  });
  await check('authenticated owner capability is on, outsider off',async()=>{
    await c.query("select set_config('request.jwt.claim.sub',$1,true)",[plan.owner_id]);
    await c.query('set local role authenticated');
    assert.equal((await c.query('select public.get_sealed_ownership_capabilities_v1() value')).rows[0].value.add_enabled,true);
    await c.query("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true)");
    assert.equal((await c.query('select public.get_sealed_ownership_capabilities_v1() value')).rows[0].value.add_enabled,false);
    await c.query('reset role');
  });
  await c.query(`insert into public.vault_item_instances(user_id,gv_vi_id,sealed_product_variant_id,name,intent,seal_state,package_condition)
    select user_id,public.generate_gv_vi_id_v1(owner_code,next_instance_index),$2,'Synthetic preserved copy','hold','unknown','unknown' from public.vault_owners where user_id=$1`,[plan.owner_id,plan.variants[0].variant_id]);
  await c.query(`insert into public.vault_sealed_requests_v1(user_id,request_id,operation,payload,result)
    values($1,'00000000-0000-4000-8000-000000000088','add','{}','{"created_count":1}')`,[plan.owner_id]);
  const preserved=await canaryPreservationHash(c,plan.owner_id);
  await check('rollback preserves current inventory and lifetime journal',async()=>{
    const result=await transitionCanary(c,{...input,mode:'rollback'},capture);
    assert.equal(result.counts.grants_revoked,1);assert.equal(result.counts.controls_updated,1);
    assert.equal(await canaryPreservationHash(c,plan.owner_id),preserved);
    assert.equal((await c.query('select count(*)::int n from public.vault_item_instances')).rows[0].n,1);
  });
  await check('rollback replay is zero-write; activation cannot undo revocation',async()=>{
    const result=await transitionCanary(c,{...input,mode:'rollback'},capture);
    assert.ok(Object.values(result.counts).every(n=>n===0));
    await assert.rejects(transitionCanary(c,input,capture),/Revocation/);
  });
  await check('revoked owner cannot add and quota evidence remains',async()=>{
    await c.query("select set_config('request.jwt.claim.sub',$1,true)",[plan.owner_id]);
    await c.query('set local role authenticated');
    assert.equal((await c.query('select public.get_sealed_ownership_capabilities_v1() value')).rows[0].value.add_enabled,false);
    await c.query('reset role');
    assert.equal((await c.query("select (result->>'created_count')::int n from public.vault_sealed_requests_v1")).rows[0].n,1);
  });
  await c.query('rollback to savepoint baseline');
  await check('contention stops within lock timeout without enrollment',async()=>{
    await c.query('select singleton from public.sealed_ownership_controls_v1 where singleton for update');
    const other=new pg.Client(config); await other.connect();
    try {
      await other.query('begin');
      await assert.rejects(transitionCanary(other,input,capture),e=>e.code==='55P03');
    } finally {await other.query('rollback');await other.end();}
    assert.equal(classifyCanaryState(await readCanaryState(c),plan),'not_enrolled');
  });
} finally {await c.query('rollback');await c.end();}
const clean=new pg.Client(config);await clean.connect();
try {
  const r=(await clean.query(`select (select count(*)::int from auth.users) users,
    (select count(*)::int from public.vault_item_instances) copies,(select count(*)::int from public.sealed_ownership_canary_grants_v1) grants`)).rows[0];
  assert.deepEqual(r,{users:0,copies:0,grants:0});
  assert.deepEqual(await readCanaryState(clean),{controls:[{enabled:false,canary_enabled:false}],grants:[],variants:[]});
  console.log(JSON.stringify({status:'passed',checks:passed,local_only:true,all_changes_rolled_back:true,independent_cleanup:r}));
} finally {await clean.end();}
