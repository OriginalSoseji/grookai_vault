// Plan/discovery only. No writer, enrollment, activation, or deployment path.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { withReadOnlyClient, assertAuditOnlyArgs } from '../audits/japanese_master_index_v4/read_only_guard_v1.mjs';
import { buildAccountCanaryPlan, canaryHash, CANARY_PROJECT } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
assertAuditOnlyArgs();
const args = { env: 'C:/grookai_vault/.env.local', out: '', discover: false };
for (const value of process.argv.slice(2)) {
  if (value.startsWith('--env-file=')) args.env = value.slice(11);
  else if (value.startsWith('--out-dir=')) args.out = value.slice(10);
  else if (value === '--discover') args.discover = true;
  else throw new Error('Unknown argument');
}
assert.ok(args.out, 'Provide --out-dir outside the repository');
const out = path.resolve(args.out);
assert.ok(path.relative(root, out).startsWith('..'), 'Private evidence must remain outside the repository');
await fs.mkdir(out, { recursive: true });
dotenv.config({ path: args.env, quiet: true });
const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
assert.ok(connectionString, 'Configured database connection required');
const url = new URL(connectionString);
const user = decodeURIComponent(url.username);
assert.ok(url.hostname === `db.${CANARY_PROJECT}.supabase.co` ||
  (url.hostname.endsWith('.pooler.supabase.com') && user === `postgres.${CANARY_PROJECT}`), 'Database target mismatch');
assert.equal(new URL(process.env.SUPABASE_URL).hostname, `${CANARY_PROJECT}.supabase.co`);
const git = (...argv) => execFileSync('git', argv, { cwd: root, encoding: 'utf8' }).trim();
const repository = { commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), clean: git('status', '--porcelain') === '' };
if (!args.discover) assert.equal(repository.clean, true, 'Commit the reviewed producer first');
const versions = (await fs.readdir(path.join(root, 'supabase/migrations'))).filter(f => /^\d+_.+\.sql$/.test(f)).map(f => f.split('_')[0]).sort();
assert.equal(new Set(versions).size, versions.length, 'Duplicate local migration versions');
const snapshot = await withReadOnlyClient({ connectionString, environmentLabel: 'sealed-account-canary-plan', statementTimeoutMs: 30000 }, async (client, guard) => {
  const rows = async (sql, values = []) => (await client.query(sql, values)).rows;
  const [canonical] = await rows(`select (select count(*)::int from public.card_prints) cards,
    (select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`);
  assert.ok(canonical.cards >= 40000 && canonical.sets >= 150 && canonical.traits >= 5000, 'Canonical environment mismatch');
  const ledger = (await rows('select version from supabase_migrations.schema_migrations order by version')).map(r => r.version);
  const controlRows = await rows('select enabled,canary_enabled from public.sealed_ownership_controls_v1 where singleton');
  assert.equal(controlRows.length, 1);
  const [counts] = await rows(`select
    (select count(*)::int from public.sealed_ownership_canary_grants_v1) grants,
    (select count(*)::int from public.sealed_ownership_canary_variants_v1) allowed_variants,
    (select count(*)::int from public.vault_item_instances where sealed_product_variant_id is not null) sealed_copies,
    (select count(*)::int from public.vault_sealed_requests_v1) sealed_requests`);
  const founders = await rows(`select distinct u.id::text user_id,
    exists(select 1 from public.vault_owners o where o.user_id=u.id) has_vault_owner,
    coalesce((select sum((r.result->>'created_count')::int) from public.vault_sealed_requests_v1 r where r.user_id=u.id and r.operation='add'),0)::int lifetime_created
    from public.user_entitlements e join auth.users u on u.id=e.user_id or (e.user_id is null and lower(u.email)=lower(e.email))
    where e.is_active and e.role='founder' order by user_id`);
  assert.equal(founders.length, 1, 'Resolve multiple founder accounts before selecting an owner');
  // Session-local claims evaluate the same release policy without creating a user/session.
  await rows("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [founders[0].user_id]);
  const candidates = [];
  for (const [game, sql] of [
    ['pokemon', "select p.*,p.observed_on::text observed_on from public.get_active_pokemon_sealed_pricing_v1('pokemon',null,100,0) p"],
    ['mtg', "select p.*,p.observed_on::text observed_on from public.get_active_sealed_product_pricing_v3('mtg',null,100,0) p"],
  ]) {
    const page = await rows(sql);
    const selected = page.filter(r => Number(r.market_price) > 0 && r.image_object_path)
      .sort((a,b) => a.canonical_name.localeCompare(b.canonical_name, 'en') || a.variant_id.localeCompare(b.variant_id))[0];
    if (selected) candidates.push({ ...selected, game_key: game });
  }
  const policies = await rows(`select p.proname,pg_get_function_identity_arguments(p.oid) args,pg_get_functiondef(p.oid) definition
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in
    ('sealed_ownership_add_allowed_v1','get_sealed_ownership_capabilities_v1','vault_add_sealed_copies_v1') order by p.proname,args`);
  assert.equal(policies.length, 3);
  const security = await rows(`select c.relname, c.relrowsecurity rls, c.relforcerowsecurity forced_rls,
    has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') anon_access,
    has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') authenticated_access
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
    and c.relname in ('sealed_ownership_canary_grants_v1','sealed_ownership_canary_variants_v1') order by c.relname`);
  const protectedState = {};
  for (const table of ['sealed_product_release_pointer','sealed_product_image_release_pointer','sealed_product_game_release_controls','catalog_game_release_controls']) {
    protectedState[table] = await rows(`select to_jsonb(t) row from public.${table} t order by to_jsonb(t)::text`);
  }
  protectedState.owner = await rows('select to_jsonb(t) row from public.vault_owners t where user_id=$1', [founders[0].user_id]);
  protectedState.inventory = await rows('select to_jsonb(t) row from public.vault_item_instances t where user_id=$1 order by id', [founders[0].user_id]);
  const [time] = await rows("select to_char(statement_timestamp() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') captured_at");
  return { project_ref: CANARY_PROJECT, ...time, guard, canonical, ledger_count: ledger.length,
    ledger_matches: JSON.stringify(ledger) === JSON.stringify(versions), control: controlRows[0], ...counts,
    founders, candidates, security, policy_hash: canaryHash(policies), protected_state_hash: canaryHash(protectedState) };
});
const snapshotName = args.discover ? 'discovery.json' : 'preflight.json';
await fs.writeFile(path.join(out, snapshotName), JSON.stringify(snapshot, null, 2), { flag: 'wx' });
if (args.discover) console.log(JSON.stringify({ status: 'read_only_discovery', ledger_count: snapshot.ledger_count, control: snapshot.control, candidate_count: snapshot.candidates.length, out }));
else {
  const plan = buildAccountCanaryPlan(snapshot, repository);
  await fs.writeFile(path.join(out, 'activation_plan.json'), JSON.stringify(plan, null, 2), { flag: 'wx' });
  const hashes = {};
  for (const name of ['preflight.json', 'activation_plan.json']) {
    hashes[name] = createHash('sha256').update(await fs.readFile(path.join(out, name))).digest('hex');
  }
  await fs.writeFile(path.join(out, 'ARTIFACT_HASHES.json'), JSON.stringify({ algorithm: 'SHA-256', producer: repository, files: hashes }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ status: plan.status, commit: repository.commit, plan_fingerprint: plan.plan_fingerprint,
    expires_at: plan.expires_at, selected: plan.variants.map(v => ({ game: v.game_key, name: v.canonical_name, variant_id: v.variant_id })), out }));
}
