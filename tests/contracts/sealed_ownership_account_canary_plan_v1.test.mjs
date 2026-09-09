import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAccountCanaryPlan, canaryHash } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { fixture } from '../fixtures/sealed_canary_plan_v1.mjs';

const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('plan is stable, one owner, two variants, 25 lifetime copies and 24 hours, without activation', () => {
  const { snapshot, repository } = fixture();
  const plan = buildAccountCanaryPlan(snapshot, repository);
  assert.deepEqual(plan, buildAccountCanaryPlan(snapshot, repository));
  assert.equal(plan.status, 'prepared_not_authorized_not_activated');
  assert.equal(plan.max_created_copies, 25);
  assert.equal(Date.parse(plan.expires_at) - Date.parse(plan.starts_at), 86400000);
  assert.equal(plan.writes_performed, false);
  assert.equal(plan.broad_additions_enabled_after_activation, false);
  assert.deepEqual(plan.intended_activation_writes, { owner_grants: 1, variant_grants: 2, canary_control_updates: 1, inventory: 0 });
  const { plan_fingerprint, ...body } = plan;
  assert.equal(plan_fingerprint, canaryHash(body));
  assert.match(plan.selection_policy, /not proof of ownership/);
});

const invalid = {
  'dirty checkout': (_, r) => { r.clean = false; },
  'wrong branch': (_, r) => { r.branch = 'main'; },
  'invalid SHA': (_, r) => { r.commit = 'HEAD'; },
  'wrong project': s => { s.project_ref = 'other'; },
  'writable transaction': s => { s.guard.transaction_read_only = 'off'; },
  'schema drift': s => { s.ledger_matches = false; },
  'wrong environment counts': s => { s.canonical.cards = 10; },
  'broad activation': s => { s.control.enabled = true; },
  'existing canary': s => { s.control.canary_enabled = true; },
  'existing grant': s => { s.grants = 1; },
  'existing variant enrollment': s => { s.allowed_variants = 1; },
  'existing inventory': s => { s.sealed_copies = 1; },
  'existing journal': s => { s.sealed_requests = 1; },
  'ambiguous founder': s => { s.founders.push({ ...s.founders[0], user_id: id(99) }); },
  'missing owner': s => { s.founders[0].has_vault_owner = false; },
  'used lifetime budget': s => { s.founders[0].lifetime_created = 1; },
  'missing security table': s => { s.security.pop(); },
  'RLS disabled': s => { s.security[0].rls = false; },
  'forced RLS disabled': s => { s.security[0].forced_rls = false; },
  'anonymous table access': s => { s.security[0].anon_access = true; },
  'authenticated table access': s => { s.security[0].authenticated_access = true; },
  'missing protected hash': s => { s.protected_state_hash = ''; },
  'missing policy hash': s => { s.policy_hash = ''; },
  'missing game': s => { s.candidates.pop(); },
  'duplicate ID': s => { s.candidates[1].variant_id = s.candidates[0].variant_id; },
  'wrong game': s => { s.candidates[0].game_key = 'onepiece'; },
  'stale price': s => { s.candidates[0].observed_on = '2026-09-01'; },
  'future price': s => { s.candidates[0].observed_on = '2026-09-10'; },
  'non-date observation': s => { s.candidates[0].observed_on = '2026-09-09T06:00:00Z'; },
  'invalid timestamp': s => { s.captured_at = 'invalid'; },
  'zero price': s => { s.candidates[0].market_price = 0; },
  'nonfinite price': s => { s.candidates[0].market_price = Infinity; },
  'wrong language': s => { s.candidates[0].language_code = 'ja'; },
  'wrong source': s => { s.candidates[0].source_provider = 'ebay'; },
  'missing image evidence': s => { s.candidates[0].image_assertion_fingerprint = ''; },
  'cross-game image': s => { s.candidates[0].image_object_path = s.candidates[1].image_object_path; },
  'unbound path': s => { s.candidates[0].image_object_path += '/other.jpg'; },
  'zero image dimensions': s => { s.candidates[0].image_width = 0; },
};
for (const [name, mutate] of Object.entries(invalid)) test(`rejects ${name}`, () => {
  const { snapshot, repository } = fixture();
  mutate(snapshot, repository);
  assert.throws(() => buildAccountCanaryPlan(snapshot, repository));
});

test('hashes preserve dates and ignore object key order', () => {
  assert.equal(canaryHash({ b: 2, a: 1 }), canaryHash({ a: 1, b: 2 }));
  assert.equal(canaryHash(new Date('2026-09-09T00:00:00Z')), canaryHash('2026-09-09T00:00:00.000Z'));
  assert.notEqual(canaryHash(new Date('2026-09-09T00:00:00Z')), canaryHash({}));
});

test('CLI rejects mutation flags before connecting and has no apply route', () => {
  const script = new URL('../../scripts/schema/sealed_ownership_account_canary_plan_v1.mjs', import.meta.url);
  const result = spawnSync(process.execPath, [fileURLToPath(script), '--apply'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /rejected mutation flag/);
  const source = fs.readFileSync(script, 'utf8');
  assert.match(source, /withReadOnlyClient/);
  assert.match(source, /flag: 'wx'/);
  assert.doesNotMatch(source, /client\.query\(['"](?:insert|update|delete|commit)/i);
});
