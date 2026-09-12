import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPublicCatalogAccessPlan } from './public_catalog_access_plan_v1.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROJECT = 'ycdxbpibncqcchqiihfz';
const SNAPSHOT = fs.readFileSync(path.join(ROOT, 'scripts/catalog/public_catalog_access_snapshot_v1.sql'), 'utf8').trim().replace(/;$/, '');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
export const fingerprint = value => createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const literal = value => `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const snapshotExpression = `(${SNAPSHOT})`;

export function buildExecutionPlan(before, producerCommit) {
  assert.match(producerCommit, /^[a-f0-9]{40}$/);
  assert.ok(before.sanity.cards >= 40000 && before.sanity.sets >= 150 && before.sanity.traits >= 5000, 'Environment mismatch');
  assert.equal(before.protected.pricingAnonExecute, false, 'Anonymous pricing must remain denied');
  assert.equal(before.protected.pricingAuthExecute, true, 'Authenticated pricing is unavailable');
  const selection = buildPublicCatalogAccessPlan(before);
  const after = structuredClone(before);
  for (const mutation of selection.mutations) {
    const collection = mutation.table === 'catalog_game_release_controls' ? after.controls : after.setOverrides;
    const [key, value] = Object.entries(mutation.key)[0];
    const row = collection.find(row => row[key] === value);
    row.release_status = 'public';
  }
  const plan = { version: 'PUBLIC_CATALOG_ACCESS_EXECUTION_V1', project: PROJECT, producerCommit,
    selection, before, after, mutations: selection.mutations.length,
    boundary: 'Only release_status changes; original activation metadata and all other fields preserved. No schema, pricing, sealed, ownership or canonical writes.' };
  return { ...plan, fingerprint: fingerprint(plan) };
}

export function verifyPlan(plan, expectedCommit, expectedFingerprint) {
  const { fingerprint: actual, ...body } = plan;
  assert.equal(actual, fingerprint(body), 'Plan was modified');
  assert.equal(actual, expectedFingerprint, 'Execution fingerprint mismatch');
  assert.equal(plan.project, PROJECT);
  assert.equal(plan.producerCommit, expectedCommit, 'Producer mismatch');
  assert.deepEqual(plan, buildExecutionPlan(plan.before, expectedCommit), 'Plan does not match the bounded compiler');
}

export function buildTransitionSql(plan, { commit = false } = {}) {
  verifyPlan(plan, plan.producerCommit, plan.fingerprint);
  assert.ok(plan.mutations > 0 && plan.mutations <= 3, 'No transition or excessive mutations');
  const updates = plan.selection.mutations.map(m => {
    const isGame = m.table === 'catalog_game_release_controls';
    const key = isGame ? 'game_code' : 'set_id';
    const value = String(m.key[key]).replaceAll("'", "''");
    return `update public.${m.table} set release_status='public' where ${key}='${value}' and release_status='signed_in';
      get diagnostics changed = row_count;
      if changed <> 1 then raise exception 'Unexpected mutation count'; end if;`;
  }).join('\n');
  // Locks cover only the tiny release-control tables. No warehouse/table rewrite.
  return `begin;
set local statement_timeout='30s'; set local lock_timeout='5s';
lock table public.catalog_game_release_controls, public.catalog_set_release_controls in share row exclusive mode;
do $gate$
declare actual jsonb; changed integer;
begin
  select ${snapshotExpression} into actual;
  if actual is distinct from ${literal(plan.before)} then raise exception 'Fresh preflight drift; no writes'; end if;
  ${updates}
  select ${snapshotExpression} into actual;
  if actual is distinct from ${literal(plan.after)} then raise exception 'Protected state or exact readback mismatch'; end if;
end $gate$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $probe$
begin
  if not public.catalog_game_visible_to_request_v1('mtg') or not public.catalog_game_visible_to_request_v1('one_piece')
    or not public.catalog_set_visible_to_request_v1('9acde490-e4e4-56ce-bffa-b437ceee413a') then
    raise exception 'Anonymous catalog access failed'; end if;
  if not exists(select 1 from public.get_public_catalog_sets_v2('mtg'))
    or not exists(select 1 from public.get_public_catalog_sets_v2('one_piece')) then
    raise exception 'Anonymous set RPC returned no sets'; end if;
  begin
    perform public.get_market_pricing_read_model_v1(array[]::uuid[],array[]::uuid[]);
    raise exception 'Anonymous pricing unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $probe$;
reset role;
${SNAPSHOT};
${commit ? 'commit' : 'rollback'};`;
}

function git(args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', windowsHide: true }).trim(); }
function requireFrozenProducer(commit) {
  assert.match(commit, /^[a-f0-9]{40}$/);
  assert.equal(git(['rev-parse', 'HEAD']), commit);
  assert.equal(git(['status', '--porcelain', '--untracked-files=no']), '', 'Tracked producer must be clean');
  for (const file of ['scripts/catalog/public_catalog_access_execution_v1.mjs', 'scripts/catalog/public_catalog_access_plan_v1.mjs',
    'scripts/catalog/public_catalog_access_snapshot_v1.sql', 'scripts/preview/collector_management_credential.ps1']) {
    assert.equal(git(['show', `${commit}:${file}`]).replaceAll('\r\n', '\n'), fs.readFileSync(path.join(ROOT, file), 'utf8').trim().replaceAll('\r\n', '\n'), `Unfrozen file: ${file}`);
  }
}

async function query(sql) {
  const token = execFileSync('pwsh', ['-NoProfile', '-File', path.join(ROOT, 'scripts/preview/collector_management_credential.ps1')],
    { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim();
  assert.ok(token.startsWith('sbp_'));
  // Never retry an ambiguous mutation response. Reconcile with readback first.
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }), signal: AbortSignal.timeout(60000),
  });
  const body = await response.json();
  assert.ok(response.ok, `Database request failed (${response.status}): ${JSON.stringify(body)}`);
  assert.ok(body[0]?.evidence, 'No snapshot returned; perform independent readback');
  return body[0].evidence;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    assert.match(arg, /^--[a-z-]+=/); const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
  }));
  assert.ok(['plan','canary','apply','readback'].includes(args.mode));
  requireFrozenProducer(args.commit);
  assert.ok(args.out, 'Explicit new artifact directory required');
  const out = path.resolve(args.out);
  assert.ok(!fs.existsSync(out), 'Never overwrite an execution receipt');
  fs.mkdirSync(out, { recursive: true });
  const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2), { flag: 'wx' });
  save('run_plan.json', { ...args, project: PROJECT, startedAt: new Date().toISOString(), retries: 0 });
  try {
    const before = await query(`begin read only; set local statement_timeout='30s'; ${SNAPSHOT}; rollback;`);
    save('before.json', before);
    if (args.mode === 'plan') {
      const plan = buildExecutionPlan(before, args.commit); save('plan.json', plan);
      console.log(JSON.stringify({ mode: args.mode, mutations: plan.mutations, fingerprint: plan.fingerprint, out })); return;
    }
    assert.ok(args.plan && args.fingerprint);
    const plan = JSON.parse(fs.readFileSync(args.plan, 'utf8'));
    verifyPlan(plan, args.commit, args.fingerprint);
    if (args.mode === 'readback') {
      assert.deepEqual(before, plan.after, 'Independent readback drift');
      assert.equal(buildExecutionPlan(before, args.commit).mutations, 0);
      save('summary.json', { status: 'verified', mutations: 0, idempotency: true, producerCommit: args.commit }); return;
    }
    assert.deepEqual(before, plan.before, 'Preflight drift');
    if (args.mode === 'apply') {
      assert.ok(args.canary, 'Rollback rehearsal receipt required');
      const receipt = JSON.parse(fs.readFileSync(path.join(args.canary, 'summary.json'), 'utf8'));
      assert.equal(receipt.status, 'rollback_verified'); assert.equal(receipt.fingerprint, plan.fingerprint);
      assert.equal(receipt.producerCommit, args.commit);
    }
    const sql = buildTransitionSql(plan, { commit: args.mode === 'apply' });
    fs.writeFileSync(path.join(out, 'execution.sql'), sql, { flag: 'wx' });
    const provisional = await query(sql); save('transaction-readback.json', provisional);
    assert.deepEqual(provisional, plan.after);
    const after = await query(`begin read only; set local statement_timeout='30s'; ${SNAPSHOT}; rollback;`);
    save('after.json', after);
    assert.deepEqual(after, args.mode === 'apply' ? plan.after : plan.before);
    save('summary.json', { status: args.mode === 'apply' ? 'applied_verified' : 'rollback_verified',
      fingerprint: plan.fingerprint, producerCommit: args.commit, durableMutations: args.mode === 'apply' ? plan.mutations : 0 });
    console.log(JSON.stringify({ status: args.mode === 'apply' ? 'applied_verified' : 'rollback_verified', out }));
  } catch (error) {
    save('failure.json', { message: error.message, automaticRetry: false, instruction: 'Reconcile current state before any subsequent attempt.' });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
