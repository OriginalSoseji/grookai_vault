import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from '../fixtures/sealed_canary_plan_v1.mjs';
import { buildAccountCanaryPlan, validateRequestedVariants } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { captureRequestedCandidates } from '../../backend/pricing/sealed_ownership_account_canary_snapshot_v1.mjs';
import { executeCanaryTransaction, assertFreshCanary } from '../../backend/pricing/sealed_ownership_account_canary_execute_v1.mjs';

function selected() {
  const { snapshot, repository } = fixture();
  repository.branch = 'fix/sealed-canary-explicit-product';
  snapshot.candidates = [snapshot.candidates[0]];
  snapshot.requested_variants = snapshot.candidates.map(({ game_key, variant_id }) => ({ game_key, variant_id, query: 'Blooming Waters' }));
  return { snapshot, repository, plan: buildAccountCanaryPlan(snapshot, repository) };
}

test('explicit single-product plan narrows grants without changing copy cap or authority', () => {
  const { snapshot, plan, repository } = selected();
  assert.deepEqual(plan, buildAccountCanaryPlan(snapshot, repository));
  assert.equal(plan.variants.length, 1);
  assert.equal(plan.intended_activation_writes.variant_grants, 1);
  assert.equal(plan.max_created_copies, 25);
  assert.equal(plan.writes_performed, false);
  assert.equal(plan.broad_additions_enabled_after_activation, false);
  assert.match(plan.selection_policy, /not proof of ownership/);
});

for (const [name, mutate] of Object.entries({
  empty: s => { s.requested_variants = []; },
  duplicate: s => { s.requested_variants.push(s.requested_variants[0]); },
  excessive: s => { s.requested_variants = Array(3).fill(s.requested_variants[0]); },
  unknown_game: s => { s.requested_variants[0].game_key = 'onepiece'; },
  invalid_id: s => { s.requested_variants[0].variant_id = 'any'; },
  empty_query: s => { s.requested_variants[0].query = ''; },
  extra_field: s => { s.requested_variants[0].allow_fallback = true; },
  substituted_id: s => { s.candidates[0].variant_id = '00000000-0000-4000-8000-000000000099'; },
  substituted_game: s => { s.candidates[0].game_key = 'mtg'; },
  extra_candidate: s => { s.candidates.push({ ...s.candidates[0] }); },
  unpriced: s => { s.candidates[0].market_price = null; },
})) test(`explicit selection rejects ${name}`, () => {
  const { snapshot, repository } = selected(); mutate(snapshot);
  assert.throws(() => buildAccountCanaryPlan(snapshot, repository));
});

test('requested discovery uses bound query parameters and exact ID, not the first result', async () => {
  const { snapshot } = selected(), calls = [];
  const candidate = snapshot.candidates[0];
  snapshot.requested_variants[0].query = "Blooming Waters' OR 1=1";
  const result = await captureRequestedCandidates({ query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ ...candidate, variant_id: 'unrelated' }, candidate] };
  } }, snapshot.requested_variants);
  assert.deepEqual(result, [candidate]);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /get_active_pokemon_sealed_pricing_v1\(\$1,\$2,100,0\)/);
  assert.doesNotMatch(calls[0].sql, /Blooming/);
  assert.deepEqual(calls[0].params, ['pokemon', "Blooming Waters' OR 1=1"]);
});

for (const mode of ['missing', 'duplicate', 'wrong_game']) test(`discovery rejects ${mode} without substituting`, async () => {
  const { snapshot } = selected(), c = snapshot.candidates[0];
  const rows = mode === 'missing' ? [] : mode === 'duplicate' ? [c, c] : [{ ...c, game_key: 'mtg' }];
  await assert.rejects(captureRequestedCandidates({ query: async () => ({ rows }) }, snapshot.requested_variants), /exactly once/);
});

test('invalid selection is rejected before any database lookup', async () => {
  let called = false;
  await assert.rejects(captureRequestedCandidates({ query: async () => { called = true; } }, []));
  assert.equal(called, false);
  assert.throws(() => validateRequestedVariants(null));
});

test('selection query drift invalidates fresh preflight', () => {
  const { snapshot, plan } = selected(), current = structuredClone(snapshot);
  current.requested_variants[0].query = 'Other';
  assert.throws(() => assertFreshCanary(plan, snapshot, current, snapshot.captured_at), /drift/);
});

test('locked single-product transition preserves exact scope and asserts one variant insert', async () => {
  const { snapshot, plan } = selected();
  const state = { controls: [{ enabled: false, canary_enabled: false }], grants: [], variants: [] };
  const calls = [];
  const client = { async query(sql, params) {
    calls.push(sql);
    if (sql.startsWith('select enabled,')) return { rows: structuredClone(state.controls) };
    if (sql.includes('select user_id::text,plan_fingerprint')) return { rows: structuredClone(state.grants) };
    if (sql.includes('select user_id::text,variant_id::text')) return { rows: structuredClone(state.variants) };
    if (sql.startsWith('select user_id from public.vault_owners')) return { rows: [{}], rowCount: 1 };
    if (sql === 'show transaction_read_only') return { rows: [{ transaction_read_only: 'off' }] };
    if (sql === 'show default_transaction_read_only') return { rows: [{ default_transaction_read_only: 'off' }] };
    if (sql === 'select clock_timestamp() now') return { rows: [{ now: snapshot.captured_at }] };
    if (sql.startsWith('insert into public.sealed_ownership_canary_grants_v1')) {
      state.grants = [{ user_id: params[0], plan_fingerprint: params[1], starts_at: params[2], expires_at: params[3], max_created_copies: params[4], revoked_at: null }];
      return { rowCount: 1 };
    }
    if (sql.startsWith('insert into public.sealed_ownership_canary_variants_v1')) {
      assert.deepEqual(params[1], [plan.variants[0].variant_id]);
      state.variants = params[1].map(variant_id => ({ user_id: params[0], variant_id }));
      return { rowCount: params[1].length };
    }
    if (sql.startsWith('update public.sealed_ownership_controls_v1')) {
      state.controls[0].canary_enabled = true;
      return { rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  } };
  const result = await executeCanaryTransaction(client, { mode: 'activate', plan, preflight: snapshot, versions: [] },
    async (_client, _guard, _versions, requested) => {
      assert.deepEqual(requested, plan.requested_variants);
      return snapshot;
    });
  assert.deepEqual(result.counts, { grants_inserted: 1, variants_inserted: 1, controls_updated: 1, grants_revoked: 0 });
  assert.equal(result.inventory_writes, 0);
  assert.equal(result.committed, true);
  assert.equal(calls.filter(sql => sql === 'commit').length, 1);
  assert.equal(state.controls[0].enabled, false);
});
