import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPokemonSealedWorldPlanV1, pokemonSealedHashV1 as hash } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { POKEMON_SEALED_ADDITIVE_TABLES_V1 as tables } from '../../backend/pricing/pokemon_sealed_additive_catalog_v1.mjs';
import { assertPokemonSealedCanaryReceiptV1 as check, runPokemonSealedAdditiveExecutionV1 as run,
  POKEMON_SEALED_ADDITIVE_EXECUTION_V1 as version, POKEMON_SEALED_PROJECT_REF as project_ref } from '../../backend/pricing/pokemon_sealed_additive_execution_v1.mjs';

function fixture() {
  const plan = buildPokemonSealedWorldPlanV1({ sourceRows: [{ product_id:123, category_id:3, group_id:7,
    name:'Booster Pack', group_name:'Example', category_display_name:'Pokemon', source_active:true,
    catalog_metadata_status:'current', payload_hash:'a'.repeat(64), extended_data:[] }],
  latestPriceRows:[{product_id:123, subtype_name_normalized:'normal',currency:'USD',market_price:20,
    low_price:10,observed_on:'2026-09-16',source_price_row_identity:'123:normal',payload_hash:'b'.repeat(64)}],
  latestSync:{id:'sync',status:'completed',observed_on:'2026-09-16'},producerCommit:'c'.repeat(40)});
  const authority = { fingerprint:plan.plan_fingerprint_sha256,producerCommit:plan.producer_commit,productIds:[123] };
  const receipt = { version, project_ref, mode:'canary',status:'passed',producer_commit:plan.producer_commit,
    plan_fingerprint:plan.plan_fingerprint_sha256,committed:false,rollback_verified:true,already_applied:false,
    database_rows_committed:0,transaction_rows_tested:Object.entries(plan.payload)
      .filter(([k])=>k!=='families').reduce((n,[,rows])=>n+rows.length,0),pointer_writes:0,storage_writes:0 };
  return {plan,authority,receipt};
}

test('apply receipt binds exact rollback, producer, project, manifest and counts', () => {
  const {plan,receipt} = fixture(); check(receipt,hash(receipt),plan,plan.producer_commit);
  for (const patch of [{project_ref:'wrong'}, {producer_commit:'wrong'}, {plan_fingerprint:'wrong'},
    {mode:'preflight'}, {status:'failed'}, {committed:true}, {rollback_verified:false},
    {already_applied:true}, {transaction_rows_tested:0}, {database_rows_committed:1},
    {pointer_writes:1}, {storage_writes:1}]) {
    const changed={...receipt,...patch};
    assert.throws(()=>check(changed,hash(changed),plan,plan.producer_commit));
  }
  assert.throws(()=>check(receipt,'bad',plan,plan.producer_commit));
});

test('missing or altered canary is rejected before any connection', async () => {
  const {plan,authority,receipt} = fixture(); let calls=0;
  const connect=async()=>{ calls++;throw new Error('Must not connect'); };
  await assert.rejects(run({plan,authority,mode:'apply',connect,canary:receipt,canaryHash:'wrong'}),/hash mismatch/);
  assert.equal(calls,0);
});

function readbackConnection(plan, events, label, missing=false) {
  return { async query(sql) {
    events.push(`${label}:${sql}`);
    if (sql.startsWith('select to_jsonb')) {
      const table=sql.match(/from public\.(\w+)/)[1];
      const key=Object.keys(tables).find(k=>tables[k]===table);
      return {rows:(missing?[]:plan.payload[key]).map(r=>({value:{...r,...(key==='releases'?{release_state:'frozen'}:{})}}))};
    }
    assert.match(sql,/^(begin|rollback)/); return {rows:[]};
  }, async end(){events.push(`${label}:end`);} };
}

test('readback uses two read-only connections and never performs a write', async () => {
  const {plan,authority}=fixture(); const events=[]; let count=0;
  const result=await run({plan,authority,mode:'readback',connect:async()=>readbackConnection(plan,events,`${++count}`)});
  assert.equal(count,2);assert.equal(result.database_rows_committed,0);
  assert.equal(result.committed,false);assert.equal(result.counts.variants,1);
  assert.equal(events.filter(e=>e.endsWith(':end')).length,2);
  assert.equal(events.filter(e=>e.includes('read only')).length,2);
});

test('independent readback failure is persisted and cannot return success', async () => {
  const {plan,authority}=fixture();const events=[],phases=[];let count=0;
  await assert.rejects(run({plan,authority,mode:'readback',
    connect:async()=>readbackConnection(plan,events,`${++count}`,count===2),
    persistPhase:async e=>phases.push(e)}),/Readback count/);
  assert.equal(phases[0].failure_phase,'independent_readback');
  assert.equal(phases[0].commit_state,'not_committed');
  assert.equal(events.filter(e=>e.endsWith(':end')).length,2);
});
