import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fixture } from '../fixtures/sealed_canary_plan_v1.mjs';
import { buildAccountCanaryPlan } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { validateCanaryBundle, assertFreshCanary, classifyCanaryState, executeCanaryTransaction } from '../../backend/pricing/sealed_ownership_account_canary_execute_v1.mjs';
function setup() {
  const { snapshot, repository } = fixture(), plan = buildAccountCanaryPlan(snapshot, repository);
  const state = { controls: [{ enabled: false, canary_enabled: true }],
    grants: [{ user_id: plan.owner_id, plan_fingerprint: plan.plan_fingerprint, starts_at: plan.starts_at,
      expires_at: plan.expires_at, max_created_copies: 25, revoked_at: null }],
    variants: plan.variants.map(v => ({ user_id: plan.owner_id, variant_id: v.variant_id })).sort((a,b) => a.variant_id.localeCompare(b.variant_id)) };
  return { snapshot, plan, state };
}
test('bundle tampering cannot reach SQL', () => {
  const { snapshot, plan } = setup(); plan.max_created_copies = 26;
  assert.throws(() => validateCanaryBundle(plan, snapshot));
});
test('fresh comparison allows transport Date encoding and current guard/time only', () => {
  const { snapshot, repository } = fixture();
  snapshot.candidates[0].release_date = '2026-01-01T00:00:00.000Z';
  const plan = buildAccountCanaryPlan(snapshot, repository), current = structuredClone(snapshot);
  current.candidates[0].release_date = new Date(snapshot.candidates[0].release_date);
  current.guard.transaction_read_only = 'off'; current.captured_at = '2026-09-09T02:00:00Z';
  assert.doesNotThrow(() => assertFreshCanary(plan, snapshot, current, current.captured_at));
  current.protected_state_hash = 'f'.repeat(64);
  assert.throws(() => assertFreshCanary(plan, snapshot, current, current.captured_at), /drift/);
});
for (const now of ['2026-09-08T23:00:00Z','2026-09-10T00:30:00Z','2026-09-10T02:00:00Z','invalid']) {
  test(`activation rejects window ${now}`, () => {
    const { snapshot, plan } = setup();
    assert.throws(() => assertFreshCanary(plan,snapshot,snapshot,now), /window/);
  });
}
for (const [name, mutate] of Object.entries({
  'other owner': s => { s.grants[0].user_id='other'; },
  'other fingerprint': s => { s.grants[0].plan_fingerprint='f'.repeat(64); },
  'other variant': s => { s.variants[0].variant_id='other'; },
  'extra variant': s => { s.variants.push(s.variants[0]); },
  'extra grant': s => { s.grants.push(s.grants[0]); },
  'global enabled': s => { s.controls[0].enabled=true; },
  'changed limit': s => { s.grants[0].max_created_copies=24; },
  'changed expiry': s => { s.grants[0].expires_at='2026-09-11T00:00:00Z'; },
  'revoked but enabled': s => { s.grants[0].revoked_at='2026-09-09T02:00:00Z'; },
})) test(`state classification rejects ${name}`, () => {
  const { state, plan }=setup(); mutate(state); assert.throws(()=>classifyCanaryState(state,plan));
});
test('active, disabled and revoked states remain distinct', () => {
  const { state, plan }=setup(); assert.equal(classifyCanaryState(state,plan),'active');
  state.controls[0].canary_enabled=false; assert.equal(classifyCanaryState(state,plan),'disabled_not_revoked');
  state.grants[0].revoked_at='2026-09-09T02:00:00Z'; assert.equal(classifyCanaryState(state,plan),'revoked');
});
test('lost COMMIT is unknown, with no automatic retry', async () => {
  const { state, plan, snapshot }=setup(), calls=[];
  const client={async query(sql) {
    calls.push(sql);
    if(sql==='commit') throw new Error('connection lost');
    if(sql.startsWith('select enabled,')) return { rows:state.controls };
    if(sql.includes('select user_id::text,plan_fingerprint')) return {rows:state.grants};
    if(sql.includes('select user_id::text,variant_id::text')) return {rows:state.variants};
    if(sql.startsWith('select user_id from public.vault_owners')) return {rows:[{}],rowCount:1};
    return {rows:[],rowCount:0};
  }};
  await assert.rejects(executeCanaryTransaction(client,{mode:'activate',plan,preflight:snapshot,versions:[]}), e=>e.commit_outcome==='unknown_requires_independent_readback');
  assert.equal(calls.filter(s=>s==='commit').length,1);
  assert.equal(calls.filter(s=>s==='rollback').length,1);
  assert.equal(calls.filter(s=>/^insert|^update/i.test(s)).length,0);
});
test('failure before commit rolls back and never commits', async () => {
  const { snapshot,plan }=setup(),calls=[];
  plan.max_created_copies=26;
  const client={query:async sql=>{calls.push(sql);return {rows:[]};}};
  await assert.rejects(executeCanaryTransaction(client,{mode:'activate',plan,preflight:snapshot,versions:[]}),e=>e.commit_outcome==='not_committed');
  assert.deepEqual(calls,['begin','rollback']);
});
test('executor uses local timeouts, exact CAS, preservation and durable replay marker', () => {
  const core=fs.readFileSync(new URL('../../backend/pricing/sealed_ownership_account_canary_execute_v1.mjs',import.meta.url),'utf8');
  const cli=fs.readFileSync(new URL('../../scripts/schema/sealed_ownership_account_canary_execute_v1.mjs',import.meta.url),'utf8');
  assert.match(core,/lock_timeout='2s'/); assert.match(core,/where user_id=\$1 for update/);
  assert.match(core,/enabled=false and canary_enabled=false/); assert.match(core,/plan_fingerprint=\$2 and revoked_at is null/);
  assert.doesNotMatch(core,/delete from|truncate|set enabled=true|insert into public\.vault_/i);
  assert.match(cli,/mode: 'readback'/); assert.match(cli,/approval-file/); assert.match(cli,/merge-base/);
  assert.match(cli,/\$\{args.mode\}_started\.json/); assert.match(cli,/flag: 'wx'/);
});
