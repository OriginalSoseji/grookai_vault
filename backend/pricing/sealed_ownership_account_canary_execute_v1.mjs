import assert from 'node:assert/strict';
import { buildAccountCanaryPlan, canaryHash } from './sealed_ownership_account_canary_plan_v1.mjs';
import { captureCanarySnapshot } from './sealed_ownership_account_canary_snapshot_v1.mjs';

export function validateCanaryBundle(plan, preflight) {
  assert.deepEqual(plan, buildAccountCanaryPlan(preflight, plan.repository), 'Plan/preflight mismatch');
}

export function assertFreshCanary(plan, before, current, now) {
  validateCanaryBundle(plan, before);
  const remaining = Date.parse(plan.expires_at) - Date.parse(now);
  assert.ok(Date.parse(now) >= Date.parse(plan.starts_at) && remaining >= 3600000, 'Canary window expired, future, or less than one hour left');
  const comparable = ({ guard, captured_at, ...state }) => state;
  assert.equal(canaryHash(comparable(current)), canaryHash(comparable(before)), 'Fresh preflight drift');
}

export async function readCanaryState(client) {
  const rows = async (sql, args = []) => (await client.query(sql, args)).rows;
  return {
    controls: await rows('select enabled,canary_enabled from public.sealed_ownership_controls_v1 where singleton'),
    grants: await rows(`select user_id::text,plan_fingerprint,starts_at,expires_at,max_created_copies,revoked_at
      from public.sealed_ownership_canary_grants_v1 order by user_id`),
    variants: await rows('select user_id::text,variant_id::text from public.sealed_ownership_canary_variants_v1 order by user_id,variant_id'),
  };
}

export function classifyCanaryState(state, plan) {
  assert.equal(state.controls.length, 1, 'Control cardinality drift');
  assert.equal(state.controls[0].enabled, false, 'Global activation is outside this scope');
  if (!state.grants.length && !state.variants.length) {
    assert.equal(state.controls[0].canary_enabled, false, 'Enabled without exact grant');
    return 'not_enrolled';
  }
  assert.equal(state.grants.length, 1, 'Unexpected owner grants');
  const grant = state.grants[0];
  assert.equal(grant.user_id, plan.owner_id);
  assert.equal(grant.plan_fingerprint, plan.plan_fingerprint);
  assert.equal(new Date(grant.starts_at).toISOString(), plan.starts_at);
  assert.equal(new Date(grant.expires_at).toISOString(), plan.expires_at);
  assert.equal(grant.max_created_copies, plan.max_created_copies);
  assert.deepEqual(state.variants, plan.variants.map(v => ({ user_id: plan.owner_id, variant_id: v.variant_id }))
    .sort((a, b) => a.variant_id.localeCompare(b.variant_id)), 'Variant scope drift');
  if (grant.revoked_at !== null) {
    assert.equal(state.controls[0].canary_enabled, false, 'Revoked but switch enabled');
    return 'revoked';
  }
  return state.controls[0].canary_enabled ? 'active' : 'disabled_not_revoked';
}

// Includes current inventory/history at rollback time, not the old zero-copy baseline.
export async function canaryPreservationHash(client, owner) {
  const state = {};
  for (const table of ['sealed_product_release_pointer', 'sealed_product_image_release_pointer',
    'sealed_product_game_release_controls', 'catalog_game_release_controls']) {
    state[table] = (await client.query(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`)).rows;
  }
  for (const table of ['vault_owners', 'vault_item_instances', 'vault_sealed_requests_v1', 'vault_item_instance_dispositions']) {
    state[table] = (await client.query(`select to_jsonb(t) row from public.${table} t where user_id=$1 order by to_jsonb(t)::text`, [owner])).rows;
  }
  return canaryHash(state);
}

// Caller owns BEGIN/COMMIT. No retries, catalog writes, inventory writes or deletes.
export async function transitionCanary(client, { mode, plan, preflight, versions }, capture = captureCanarySnapshot) {
  assert.ok(['activate', 'rollback'].includes(mode));
  validateCanaryBundle(plan, preflight);
  await client.query("set local lock_timeout='2s'");
  await client.query("set local statement_timeout='30s'");
  // Serialize operators and wait for any in-flight additions by this owner.
  await client.query('select singleton from public.sealed_ownership_controls_v1 where singleton for update');
  const ownerLock = await client.query('select user_id from public.vault_owners where user_id=$1 for update', [plan.owner_id]);
  assert.equal(ownerLock.rowCount, 1, 'Existing owner required; never create one');
  await client.query('lock table public.sealed_ownership_canary_grants_v1, public.sealed_ownership_canary_variants_v1 in share row exclusive mode');
  // Hold release and visibility state stable for the bounded transaction.
  for (const table of ['sealed_product_release_pointer', 'sealed_product_image_release_pointer',
    'sealed_product_game_release_controls', 'catalog_game_release_controls']) {
    await client.query(`select 1 from public.${table} for share`);
  }
  const initial = await readCanaryState(client);
  const status = classifyCanaryState(initial, plan);
  const preserved = await canaryPreservationHash(client, plan.owner_id);
  const counts = { grants_inserted: 0, variants_inserted: 0, controls_updated: 0, grants_revoked: 0 };
  if (mode === 'activate') {
    assert.notEqual(status, 'revoked', 'Revocation cannot be undone by retry');
    assert.notEqual(status, 'disabled_not_revoked', 'Do not reactivate a disabled canary');
    if (status === 'not_enrolled') {
      const tx = (await client.query('show transaction_read_only')).rows[0].transaction_read_only;
      const def = (await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only;
      const current = await capture(client, { transaction_read_only: tx, default_transaction_read_only: def }, versions, plan.requested_variants);
      const now = (await client.query('select clock_timestamp() now')).rows[0].now;
      assertFreshCanary(plan, preflight, current, now);
      counts.grants_inserted = (await client.query(`insert into public.sealed_ownership_canary_grants_v1
        (user_id,plan_fingerprint,starts_at,expires_at,max_created_copies) values($1,$2,$3,$4,$5)`,
      [plan.owner_id, plan.plan_fingerprint, plan.starts_at, plan.expires_at, plan.max_created_copies])).rowCount;
      counts.variants_inserted = (await client.query(`insert into public.sealed_ownership_canary_variants_v1(user_id,variant_id)
        select $1::uuid,unnest($2::uuid[])`, [plan.owner_id, plan.variants.map(v => v.variant_id)])).rowCount;
      counts.controls_updated = (await client.query(`update public.sealed_ownership_controls_v1 set canary_enabled=true
        where singleton and enabled=false and canary_enabled=false`)).rowCount;
      assert.deepEqual(counts, { grants_inserted: 1, variants_inserted: plan.variants.length, controls_updated: 1, grants_revoked: 0 });
    }
  } else {
    assert.notEqual(status, 'not_enrolled', 'No exact enrollment to revoke');
    if (status !== 'revoked') {
      counts.grants_revoked = (await client.query(`update public.sealed_ownership_canary_grants_v1 set revoked_at=clock_timestamp()
        where user_id=$1 and plan_fingerprint=$2 and revoked_at is null`, [plan.owner_id, plan.plan_fingerprint])).rowCount;
      assert.equal(counts.grants_revoked, 1);
      if (initial.controls[0].canary_enabled) {
        counts.controls_updated = (await client.query(`update public.sealed_ownership_controls_v1 set canary_enabled=false
          where singleton and enabled=false and canary_enabled=true`)).rowCount;
        assert.equal(counts.controls_updated, 1);
      }
    }
  }
  const final = await readCanaryState(client);
  assert.equal(classifyCanaryState(final, plan), mode === 'activate' ? 'active' : 'revoked');
  assert.equal(await canaryPreservationHash(client, plan.owner_id), preserved, 'Protected data changed');
  return { mode, state: final, counts, preservation_hash: preserved, inventory_writes: 0 };
}

export async function executeCanaryTransaction(client, input, capture) {
  await client.query('begin');
  let commitAttempted = false;
  try {
    const result = await transitionCanary(client, input, capture);
    commitAttempted = true;
    await client.query('commit');
    return { ...result, committed: true };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    // A lost COMMIT response is not evidence of rollback. Read back; never replay automatically.
    error.commit_outcome = commitAttempted ? 'unknown_requires_independent_readback' : 'not_committed';
    throw error;
  }
}
