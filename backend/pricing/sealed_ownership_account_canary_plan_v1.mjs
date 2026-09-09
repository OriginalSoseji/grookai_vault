import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const CANARY_PROJECT = 'ycdxbpibncqcchqiihfz';
export const CANARY_BRANCH = 'feature/sealed-account-canary-boundary';
export const CANARY_BRANCHES = Object.freeze([CANARY_BRANCH, 'fix/sealed-canary-explicit-product']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const digest = /^[0-9a-f]{64}$/;
export function canonicalJson(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const canaryHash = value => createHash('sha256').update(canonicalJson(value)).digest('hex');

export function validateRequestedVariants(selection) {
  assert.ok(Array.isArray(selection) && selection.length >= 1 && selection.length <= 2, 'Select one or two exact variants');
  for (const row of selection) {
    assert.deepEqual(Object.keys(row).sort(), ['game_key', 'query', 'variant_id']);
    assert.ok(['pokemon', 'mtg'].includes(row.game_key), 'Unsupported canary game');
    assert.match(row.variant_id, uuid);
    assert.ok(typeof row.query === 'string' && row.query.trim() === row.query && row.query.length > 0 && row.query.length <= 200, 'Bounded product lookup required');
  }
  assert.equal(new Set(selection.map(row => row.variant_id)).size, selection.length, 'Duplicate requested variant');
}

export function buildAccountCanaryPlan(snapshot, repository) {
  assert.ok(CANARY_BRANCHES.includes(repository.branch), 'Wrong canary branch');
  assert.match(repository.commit, /^[0-9a-f]{40}$/);
  assert.equal(repository.clean, true, 'Freeze tracked and untracked files first');
  assert.equal(snapshot.project_ref, CANARY_PROJECT);
  assert.equal(snapshot.guard.transaction_read_only, 'on');
  assert.equal(snapshot.guard.default_transaction_read_only, 'on');
  assert.equal(snapshot.ledger_matches, true);
  assert.deepEqual(snapshot.security.map(r => r.relname).sort(), ['sealed_ownership_canary_grants_v1', 'sealed_ownership_canary_variants_v1']);
  for (const table of snapshot.security) {
    assert.equal(table.rls, true); assert.equal(table.forced_rls, true);
    assert.equal(table.anon_access, false); assert.equal(table.authenticated_access, false);
  }
  assert.ok(snapshot.canonical.cards >= 40000 && snapshot.canonical.sets >= 150 && snapshot.canonical.traits >= 5000);
  assert.deepEqual(snapshot.control, { enabled: false, canary_enabled: false });
  assert.equal(snapshot.grants, 0); assert.equal(snapshot.allowed_variants, 0);
  assert.equal(snapshot.sealed_copies, 0); assert.equal(snapshot.sealed_requests, 0);
  assert.equal(snapshot.founders.length, 1, 'An unambiguous active founder is required');
  const owner = snapshot.founders[0];
  assert.match(owner.user_id, uuid); assert.equal(owner.has_vault_owner, true);
  assert.equal(owner.lifetime_created, 0);
  assert.match(snapshot.protected_state_hash, digest); assert.match(snapshot.policy_hash, digest);
  const candidates = snapshot.candidates;
  if (snapshot.requested_variants !== undefined) {
    validateRequestedVariants(snapshot.requested_variants);
    assert.deepEqual(candidates.map(({ game_key, variant_id }) => ({ game_key, variant_id })),
      snapshot.requested_variants.map(({ game_key, variant_id }) => ({ game_key, variant_id })), 'Requested product scope mismatch');
  } else {
    assert.equal(candidates.length, 2, 'Exactly one priced image-backed variant per game');
    assert.deepEqual(candidates.map(v => v.game_key).sort(), ['mtg', 'pokemon']);
  }
  assert.equal(new Set(candidates.map(v => v.variant_id)).size, candidates.length);
  const starts = new Date(snapshot.captured_at);
  assert.ok(Number.isFinite(starts.getTime()));
  for (const row of candidates) {
    assert.match(row.variant_id, uuid);
    assert.match(row.price_release_id, uuid); assert.match(row.image_release_id, uuid);
    assert.equal(row.language_code, 'en'); assert.equal(row.currency, 'USD');
    assert.equal(row.source_provider, 'tcgplayer'); assert.ok(Number(row.source_product_id) > 0);
    assert.ok(row.canonical_name?.trim());
    assert.ok(Number.isFinite(Number(row.market_price)) && Number(row.market_price) > 0);
    assert.equal(row.image_storage_bucket, 'user-card-images');
    assert.match(row.image_content_sha256, digest);
    assert.match(row.image_object_path, new RegExp(`^sealed/${row.game_key}/sha256/${row.image_content_sha256.slice(0, 2)}/${row.image_content_sha256}\\.(?:jpg|jpeg|png|webp)$`));
    assert.ok(Number(row.image_bytes) > 0 && row.image_width > 0 && row.image_height > 0);
    for (const field of ['evidence_fingerprint', 'image_assertion_fingerprint', 'image_member_fingerprint']) assert.match(row[field], digest);
    assert.match(row.observed_on, /^\d{4}-\d{2}-\d{2}$/);
    const age = Date.parse(snapshot.captured_at.slice(0, 10)) - Date.parse(row.observed_on);
    assert.ok(Number.isFinite(age) && age >= 0 && age <= 7 * 86400000, 'Fresh exact price required');
  }
  const plan = {
    version: 'SEALED_OWNERSHIP_ACCOUNT_CANARY_PLAN_V1',
    status: 'prepared_not_authorized_not_activated',
    project_ref: CANARY_PROJECT, repository,
    owner_id: owner.user_id,
    starts_at: starts.toISOString(),
    expires_at: new Date(starts.getTime() + 86400000).toISOString(),
    max_created_copies: 25,
    budget: 'Lifetime successful add requests; removal and retries never restore or duplicate allowance',
    variants: candidates,
    ...(snapshot.requested_variants === undefined ? {} : { requested_variants: snapshot.requested_variants }),
    selection_policy: snapshot.requested_variants === undefined
      ? 'First alphabetic priced image-backed eligible variant in each governed 100-row page; proposed test scope, not proof of ownership'
      : 'Explicit operator-selected exact IDs resolved through governed bounded product search; selection is not proof of ownership',
    caller_proof: 'Session-local authenticated claims in a read-only service connection; not an end-user login or deployed client acceptance',
    preflight_fingerprint: canaryHash(snapshot),
    protected_state_hash: snapshot.protected_state_hash,
    policy_hash: snapshot.policy_hash,
    intended_activation_writes: { owner_grants: 1, variant_grants: candidates.length, canary_control_updates: 1, inventory: 0 },
    expected_controls: snapshot.control,
    broad_additions_enabled_after_activation: false,
    fresh_preflight_required: true,
    stop_conditions: ['Expired plan or less than one hour remaining', 'Commit, schema, policy or protected-state drift',
      'Owner, variant, price/image release or evidence mismatch', 'Existing grants, additions or unexpected controls',
      'Nonmatching affected-row counts or readback', 'Lock contention; never terminate sessions'],
    rollback: ['CAS both addition switches off only while this is the sole exact grant',
      'Revoke only this owner grant bound to this plan fingerprint',
      'Preserve copies, photos, history, request journal, allocators and all catalog/pricing data',
      'Verify new additions denied and existing reads/lifecycle remain available'],
    release_gates: ['Review and separately authorize this exact activation plan',
      'Deploy production-configured clients containing the verified repairs; never ship local debug defines',
      'Founder manually adds only actually owned products; no synthetic founder inventory',
      'Verify readback, prices/totals, photo privacy, Wall, lot/share and actual authorized lifecycle changes',
      'Monitor errors, duplicates, budget and history; reconcile before any broader release'],
    exclusions: ['Schema changes', 'Catalog or pricing changes', 'Storage writes', 'Automatic inventory creation',
      'Invented sale/trade transactions', 'Cross-owner transfer', 'Global activation', 'Deletion or cleanup'],
    writes_performed: false,
  };
  return { ...plan, plan_fingerprint: canaryHash(plan) };
}
