import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildCandidate } from './build_collector_set_binder_candidate.mjs';

const root = new URL('../../', import.meta.url);
const container = 'supabase_db_ycdxbpibncqcchqiihfz';
const database = `collector_set_binder_replay_${Date.now()}`;
assert.match(database, /^collector_set_binder_replay_\d+$/);
assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  'preview/collector-authenticated-20260910');
assert.match(execFileSync('docker', ['port', container, '5432'], { encoding: 'utf8' }), /:54330\b/);
const cli = JSON.parse(execFileSync('pwsh', ['-NoProfile', '-Command', 'supabase status -o json'],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
assert.equal(cli.API_URL, 'http://127.0.0.1:54321');
function sql(db, text) {
  return execFileSync('docker', ['exec', '-i', container, 'sh', '-c',
    'PGPASSWORD="$POSTGRES_PASSWORD" exec psql "$@"', '--', '-X', '-qAt',
    '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', db],
  { input: text, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
}
const before = sql('postgres', `begin read only; select json_build_object(
  'cards',(select count(*) from public.card_prints), 'sets',(select count(*) from public.sets),
  'traits',(select count(*) from public.card_print_traits),
  'authority',to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null); rollback;`).trim();
assert.equal(JSON.parse(before).cards, 326);
assert.equal(JSON.parse(before).authority, false);
assert.equal(sql('postgres', `select count(*) from pg_database where datname = '${database}';`).trim(), '0');
const candidate = buildCandidate();
const tests = readFileSync(new URL('./sql/collector_set_binder_replay_tests_v1.sql', import.meta.url), 'utf8');
const rpcTests = readFileSync(new URL('./sql/collector_set_binder_rpc_tests_v1.sql', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const binderSecurityQuery = `select jsonb_build_object(
  'functions', (select jsonb_agg(to_jsonb(f) order by f.name, f.arguments) from (
    select proname as name, pg_get_function_identity_arguments(oid) as arguments,
      pg_get_userbyid(proowner) as owner, proacl, proconfig, prosecdef,
      pg_get_functiondef(oid) as definition from pg_proc
    where pronamespace='public'::regnamespace and proname like 'binder_%') f),
  'tables', (select jsonb_agg(to_jsonb(t) order by t.name) from (
    select relname as name, pg_get_userbyid(relowner) as owner, relacl, relrowsecurity, relforcerowsecurity
    from pg_class where relnamespace='public'::regnamespace and relname like 'binder%' and relkind='r') t));`;
const sourceBinderSecurity = sql('postgres', `begin read only; ${binderSecurityQuery} rollback;`).trim();
const out = `C:/grookai_vault_operator_artifacts/collector_polish/authenticated_20260910/${database}`;
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/candidate.sql`, candidate.sql);
const report = { database, container, sha256: candidate.sha256, sources: candidate.sources,
  testSha256: hash(tests), rpcTestSha256: hash(rpcTests), candidateExecutionRole: 'postgres',
  sourceBinderSecuritySha256: hash(sourceBinderSecurity),
  sourceBefore: JSON.parse(before), sourceSchemaApplied: false, productionAccess: false, steps: [] };
writeFileSync(`${out}/plan.json`, JSON.stringify(report, null, 2));
try {
  sql('postgres', `create database ${database} owner postgres;`);
  report.steps.push('created new isolated database; existing sample untouched');
  // Schema only: no users, sessions, secrets, cron jobs or application data copied.
  const schema = execFileSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres',
    '--schema-only', '--no-publications', '--no-subscriptions',
    '--exclude-extension=pg_cron', '--exclude-extension=pg_net', '--exclude-schema=cron', '--exclude-schema=net',
    '--exclude-extension=pg_graphql', '--exclude-schema=graphql', '--exclude-schema=graphql_public'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  sql(database, schema);
  assert.equal(sql(database, binderSecurityQuery).trim(), sourceBinderSecurity);
  report.steps.push('source Binder definitions, owners, grants and RLS match before candidate apply');
  report.sourceSchemaSha256 = hash(schema);
  report.steps.push('restored local schema only, no scheduling/network extensions');
  const executeCandidate = `set role postgres;\n${candidate.sql}\nreset role;`;
  sql(database, executeCandidate);
  const definitionQuery = `select json_agg(row_to_json(f) order by f.oid) from (
    select oid, pg_get_functiondef(oid) as definition, pg_get_userbyid(proowner) as owner, proacl from pg_proc
    where pronamespace='public'::regnamespace and proname in (
      'binder_set_release_guard_v1','binder_set_slots_authority_v1','binder_set_progress_counts_v1',
      'binder_contribution_matches_v1','binder_progress_recalculate_v1','binder_slot_rows_v1','binder_target_enabled_v1','binder_set_options_v1')
  ) f;`;
  const firstDefinitions = sql(database, definitionQuery);
  sql(database, executeCandidate);
  assert.equal(sql(database, definitionQuery), firstDefinitions);
  report.functionReadbackSha256 = hash(firstDefinitions);
  report.steps.push('candidate applied twice; all eight function definitions read back identically');
  // Copy only bounded local catalog reference tables, not ownership or auth data.
  const tables = ['games', 'sets', 'finish_keys', 'card_prints', 'card_printings', 'binder_feature_flags'];
  const reference = execFileSync('docker', ['exec', container, 'pg_dump', '-U', 'postgres', '-d', 'postgres',
    '--data-only', '--no-owner', '--no-privileges', ...tables.flatMap(t => ['-t', `public.${t}`])],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  sql(database, reference);
  report.steps.push('copied bounded public reference sample and feature flags only');
  report.referenceSampleSha256 = hash(reference);
  const fixtureQuery = `select jsonb_build_object(
    'users',(select count(*) from auth.users),
    'vault_copies',(select count(*) from public.vault_item_instances),
    'binders',(select count(*) from public.binders),
    'members',(select count(*) from public.binder_members),
    'contributions',(select count(*) from public.binder_contributions),
    'releases',(select count(*) from public.binder_set_slot_releases_v1),
    'pointers',(select count(*) from public.binder_set_slot_pointers_v1),
    'species',(select count(*) from public.pokemon_species),
    'flags',(select jsonb_object_agg(flag_key,enabled) from public.binder_feature_flags));`;
  report.fixtureBefore = JSON.parse(sql(database, fixtureQuery));
  const testOutput = sql(database, tests);
  writeFileSync(`${out}/tests.txt`, testOutput);
  report.steps.push('SQL assertions passed');
  const rpcOutput = sql(database, rpcTests);
  writeFileSync(`${out}/rpc-tests.txt`, rpcOutput);
  report.fixtureAfter = JSON.parse(sql(database, fixtureQuery));
  assert.deepEqual(report.fixtureAfter, report.fixtureBefore);
  report.steps.push('authenticated/anonymous multi-account RPC assertions passed; fixtures rolled back');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = String(error.stderr ?? error.message);
  process.exitCode = 1;
} finally {
  const sourceSecurityAfter = sql('postgres', `begin read only; ${binderSecurityQuery} rollback;`).trim();
  report.sourceAfter = JSON.parse(sql('postgres', `begin read only; select json_build_object(
    'cards',(select count(*) from public.card_prints), 'sets',(select count(*) from public.sets),
    'traits',(select count(*) from public.card_print_traits),
    'authority',to_regprocedure('public.binder_set_slots_authority_v1(uuid)') is not null); rollback;`).trim());
  // Persist failed reconciliation too, instead of losing the report to an assertion.
  if (JSON.stringify(report.sourceAfter) !== JSON.stringify(report.sourceBefore)
    || sourceSecurityAfter !== sourceBinderSecurity) {
    report.passed = false;
    report.reconciliationError = 'Existing sample counts or Binder security definitions changed';
    process.exitCode = 1;
  }
  writeFileSync(`${out}/result.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ artifact: `${out}/result.json`, ...report }));
}
