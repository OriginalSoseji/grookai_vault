// Production actions require a frozen execution envelope and separate exact authority.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import pg from 'pg';
import dotenv from 'dotenv';
import { CANARY_PROJECT, CANARY_BRANCHES, canaryHash } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { captureCanarySnapshot } from '../../backend/pricing/sealed_ownership_account_canary_snapshot_v1.mjs';
import { validateCanaryBundle, assertFreshCanary, readCanaryState, classifyCanaryState, executeCanaryTransaction } from '../../backend/pricing/sealed_ownership_account_canary_execute_v1.mjs';
import { withReadOnlyClient, pgSslConfig } from '../audits/japanese_master_index_v4/read_only_guard_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const args = { mode: 'readback', env: 'C:/grookai_vault/.env.local' };
for (const arg of process.argv.slice(2)) {
  const match = /^--(mode|plan-dir|out-dir|execution-plan|approval-file|execution-fingerprint|env)=(.+)$/.exec(arg);
  assert.ok(match, 'Unknown argument'); args[match[1]] = match[2];
}
assert.ok(['prepare', 'readback', 'activate', 'rollback'].includes(args.mode), 'Unknown mode');
assert.ok(args['plan-dir'] && args['out-dir'], 'Exact source plan and new private output directory required');
const outside = value => {
  const p = path.resolve(value), rel = path.relative(root, p);
  assert.ok(rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel), 'Artifacts must be outside checkout');
  return p;
};
const directory = outside(args['plan-dir']), out = outside(args['out-dir']);
await fs.mkdir(out, { recursive: true });
const json = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const byteHash = b => createHash('sha256').update(b).digest('hex');
const manifest = await json(path.join(directory, 'ARTIFACT_HASHES.json'));
assert.deepEqual(Object.keys(manifest.files).sort(), ['activation_plan.json', 'preflight.json']);
for (const [file, hash] of Object.entries(manifest.files)) assert.equal(byteHash(await fs.readFile(path.join(directory, file))), hash);
const plan = await json(path.join(directory, 'activation_plan.json'));
const preflight = await json(path.join(directory, 'preflight.json'));
validateCanaryBundle(plan, preflight);
assert.deepEqual(manifest.producer, plan.repository);
const git = (...argv) => execFileSync('git', argv, { cwd: root, encoding: 'utf8' }).trim();
const repository = { commit: git('rev-parse', 'HEAD'), branch: git('branch', '--show-current'), clean: git('status', '--porcelain') === '' };
assert.ok(CANARY_BRANCHES.includes(repository.branch), 'Wrong canary branch'); assert.equal(repository.clean, true);
git('merge-base', '--is-ancestor', plan.repository.commit, repository.commit);
const envelope = {
  version: 'SEALED_ACCOUNT_CANARY_EXECUTION_V1', repository, project_ref: CANARY_PROJECT,
  source_plan_fingerprint: plan.plan_fingerprint, source_artifact_hashes: manifest.files,
  activation: { grant_inserts: 1, variant_inserts: plan.variants.length, canary_flag_updates: 1, inventory_writes: 0 },
  rollback: { grant_revocations: 1, canary_flag_updates_max: 1, deletes: 0 },
  automatic_retries: 0, broad_activation: false,
};
const execution = { ...envelope, execution_fingerprint: canaryHash(envelope) };
const writing = ['activate', 'rollback'].includes(args.mode);
let authorityHash;
if (writing) {
  assert.ok(args['execution-plan'] && args['approval-file'], 'Frozen execution and explicit authority required');
  assert.deepEqual(await json(outside(args['execution-plan'])), execution, 'Execution code or source drift');
  assert.equal(args['execution-fingerprint'], execution.execution_fingerprint);
  const required = `I approve sealed ownership canary ${args.mode} only, execution ${execution.execution_fingerprint}, plan ${plan.plan_fingerprint}. No inventory creation, global activation, deletion, Storage, catalog, pricing, or deployment writes.`;
  const authority = (await fs.readFile(outside(args['approval-file']), 'utf8')).trim();
  assert.equal(authority, required, 'Action authority mismatch');
  authorityHash = byteHash(authority);
}
dotenv.config({ path: args.env, quiet: true });
const connectionString = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
assert.ok(connectionString, 'Database configuration required');
const target = new URL(connectionString);
assert.ok(target.hostname === `db.${CANARY_PROJECT}.supabase.co` ||
  (target.hostname.endsWith('.pooler.supabase.com') && decodeURIComponent(target.username) === `postgres.${CANARY_PROJECT}`), 'Wrong database target');
assert.equal(new URL(process.env.SUPABASE_URL).hostname, `${CANARY_PROJECT}.supabase.co`);
const versions = (await fs.readdir(path.join(root, 'supabase/migrations'))).filter(f => /^\d+_.+\.sql$/.test(f)).map(f => f.split('_')[0]).sort();
const write = (name, value) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2), { flag: 'wx' });
async function inspect(fresh = false) {
  return withReadOnlyClient({ connectionString, environmentLabel: 'sealed-canary-executor-readback', statementTimeoutMs: 30000 }, async (client, guard) => {
    const c = (await client.query(`select (select count(*)::int from public.card_prints) cards,
      (select count(*)::int from public.sets) sets,(select count(*)::int from public.card_print_traits) traits`)).rows[0];
    assert.ok(c.cards >= 40000 && c.sets >= 150 && c.traits >= 5000, 'Canonical target mismatch');
    const state = await readCanaryState(client), status = classifyCanaryState(state, plan);
    const now = (await client.query('select clock_timestamp() now')).rows[0].now;
    const window_open = status === 'active' && now >= new Date(plan.starts_at) && now < new Date(plan.expires_at);
    if (fresh) {
      assert.equal(status, 'not_enrolled', 'Use readback, never reapply an existing enrollment');
      const snapshot = await captureCanarySnapshot(client, guard, versions, plan.requested_variants);
      assertFreshCanary(plan, preflight, snapshot, snapshot.captured_at);
      return { state, status, snapshot, guard };
    }
    return { state, status, window_open, observed_at: now, guard, canonical: c };
  });
}
const before = await inspect(args.mode === 'prepare' || args.mode === 'activate');
await write('before.json', before);
if (args.mode === 'prepare') {
  await write('execution_plan.json', execution);
  console.log(JSON.stringify({ status: 'prepared_not_activated', ...execution }));
} else if (!writing) {
  console.log(JSON.stringify({ status: before.status, window_open: before.window_open, production_writes: 0, out }));
} else {
  // Stable marker beside the source prevents reruns even with a different output folder.
  await fs.writeFile(path.join(directory, `${args.mode}_started.json`), JSON.stringify({ execution, authority_sha256: authorityHash, at: new Date().toISOString(), out }), { flag: 'wx' });
  const client = new pg.Client({ connectionString, ssl: pgSslConfig(connectionString), connectionTimeoutMillis: 20000,
    query_timeout: 30000, application_name: 'sealed-account-canary-exact-transition' });
  let result;
  try {
    await client.connect();
    result = await executeCanaryTransaction(client, { mode: args.mode, plan, preflight, versions });
    await write('transaction.json', result);
  } catch (error) {
    await write('failure.json', { code: error.code ?? error.name, commit_outcome: error.commit_outcome ?? 'not_started', automatic_retry: false });
    throw error;
  } finally { await client.end(); }
  // New connection, after COMMIT. Failure here does not authorize automatic rollback or replay.
  const after = await inspect();
  await write('readback.json', after);
  assert.equal(after.status, args.mode === 'activate' ? 'active' : 'revoked');
  if (args.mode === 'activate') assert.equal(after.window_open, true);
  console.log(JSON.stringify({ status: after.status, committed: result.committed, counts: result.counts, independent_readback: true, out }));
}
