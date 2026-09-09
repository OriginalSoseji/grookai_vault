// Plan/discovery only. No writer, enrollment, activation, or deployment path.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import { withReadOnlyClient, assertAuditOnlyArgs } from '../audits/japanese_master_index_v4/read_only_guard_v1.mjs';
import { buildAccountCanaryPlan, CANARY_PROJECT, validateRequestedVariants } from '../../backend/pricing/sealed_ownership_account_canary_plan_v1.mjs';
import { captureCanarySnapshot } from '../../backend/pricing/sealed_ownership_account_canary_snapshot_v1.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
assertAuditOnlyArgs();
const args = { env: 'C:/grookai_vault/.env.local', out: '', discover: false };
for (const value of process.argv.slice(2)) {
  if (value.startsWith('--env-file=')) args.env = value.slice(11);
  else if (value.startsWith('--out-dir=')) args.out = value.slice(10);
  else if (value.startsWith('--selection-file=')) args.selection = value.slice(17);
  else if (value === '--discover') args.discover = true;
  else throw new Error('Unknown argument');
}
assert.ok(args.out, 'Provide --out-dir outside the repository');
const out = path.resolve(args.out);
assert.ok(path.relative(root, out).startsWith('..'), 'Private evidence must remain outside the repository');
await fs.mkdir(out, { recursive: true });
let requestedVariants;
if (args.selection) {
  const selectionPath = path.resolve(args.selection);
  assert.ok(path.relative(root, selectionPath).startsWith('..'), 'Selection evidence must remain outside the repository');
  requestedVariants = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
  validateRequestedVariants(requestedVariants);
}
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
const snapshot = await withReadOnlyClient({ connectionString, environmentLabel: 'sealed-account-canary-plan', statementTimeoutMs: 30000 },
  (client, guard) => captureCanarySnapshot(client, guard, versions, requestedVariants));
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
