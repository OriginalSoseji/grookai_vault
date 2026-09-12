import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExecutionPlan, buildTransitionSql, verifyPlan } from '../../scripts/catalog/public_catalog_access_execution_v1.mjs';
const commit = 'a'.repeat(40);
const fixture = () => ({ sanity: { cards: 50000, sets: 200, traits: 6000 },
  controls: ['mtg','one_piece','gundam'].map(game_code => ({ game_code, release_status: game_code === 'gundam' ? 'hidden' : 'signed_in', evidence: { source: "Founder's record" } })),
  setOverrides: [{ set_id: '9acde490-e4e4-56ce-bffa-b437ceee413a', game: 'one_piece', code: 'OP17', release_status: 'signed_in' },
    { set_id: 'hidden-set', game: 'one_piece', code: 'OP99', release_status: 'hidden' }],
  protected: { pricingAnonExecute: false, pricingAuthExecute: true, sealed: ['signed_in'], pointers: ['unchanged'] }, samples: [] });

test('bounded plan changes exactly three statuses and preserves every other field', () => {
  const before = fixture(); const plan = buildExecutionPlan(before, commit);
  assert.equal(plan.mutations, 3); assert.equal(before.controls[0].release_status, 'signed_in');
  const restored = structuredClone(plan.after);
  restored.controls[0].release_status = restored.controls[1].release_status = restored.setOverrides[0].release_status = 'signed_in';
  assert.deepEqual(restored, before);
});
test('fingerprint, commit, unknown mutations and stale/tampered payloads fail closed', () => {
  const plan = buildExecutionPlan(fixture(), commit);
  verifyPlan(plan, commit, plan.fingerprint);
  assert.throws(() => verifyPlan(plan, 'b'.repeat(40), plan.fingerprint));
  assert.throws(() => verifyPlan(plan, commit, '0'.repeat(64)));
  plan.after.controls[2].release_status = 'public';
  assert.throws(() => verifyPlan(plan, commit, plan.fingerprint));
});
test('bad environment and anonymous pricing stop before mutation planning', () => {
  const before = fixture(); before.sanity.cards = 1;
  assert.throws(() => buildExecutionPlan(before, commit));
  const exposed = fixture(); exposed.protected.pricingAnonExecute = true;
  assert.throws(() => buildExecutionPlan(exposed, commit));
});
test('rehearsal rolls back, locks controls, uses full state CAS, probes anonymous pricing denial', () => {
  const sql = buildTransitionSql(buildExecutionPlan(fixture(), commit));
  assert.ok(sql.endsWith('rollback;'));
  assert.equal((sql.match(/update public\./g) || []).length, 3);
  assert.match(sql, /share row exclusive mode/);
  assert.match(sql, /Fresh preflight drift/);
  assert.match(sql, /Protected state or exact readback mismatch/);
  assert.match(sql, /get diagnostics changed = row_count/);
  assert.match(sql, /set local role anon/);
  assert.match(sql, /exception when insufficient_privilege/);
  assert.match(sql, /Founder''s record/);
  assert.doesNotMatch(sql, /update public\.(card_prints|sets|sealed|vault)|\b(delete|truncate|grant|revoke)\b/i);
});
test('commit is explicit and already-applied readback is zero mutation', () => {
  const plan = buildExecutionPlan(fixture(), commit);
  assert.ok(buildTransitionSql(plan, { commit: true }).endsWith('commit;'));
  const replay = buildExecutionPlan(plan.after, commit);
  assert.equal(replay.mutations, 0);
  assert.throws(() => buildTransitionSql(replay));
});
