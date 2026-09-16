import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import pg from 'pg';
import { pokemonSealedHashV1 as hash } from '../../backend/pricing/pokemon_sealed_world_v1.mjs';
import { assertPokemonSealedAdditiveScopeV1 } from '../../backend/pricing/pokemon_sealed_additive_catalog_v1.mjs';
import { POKEMON_SEALED_PROJECT_REF, runPokemonSealedAdditiveExecutionV1,
  assertPokemonSealedCanaryReceiptV1 } from '../../backend/pricing/pokemon_sealed_additive_execution_v1.mjs';

const { values: args } = parseArgs({ options: Object.fromEntries(
  ['mode', 'plan', 'out', 'fingerprint', 'product-ids', 'canary', 'canary-hash'].map(k => [k, { type: 'string' }])) });
assert.ok(['preflight', 'canary', 'apply', 'readback'].includes(args.mode), 'Explicit --mode required');
for (const key of ['plan', 'out', 'fingerprint', 'product-ids']) assert.ok(args[key], `--${key} required`);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = (...argv) => execFileSync('git', argv, { cwd: root, encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
assert.equal(git('status', '--porcelain', '--untracked-files=no'), '', 'Tracked worktree dirty');
const sourceFiles = [
  'scripts/audits/pokemon_sealed_additive_apply_v1.mjs',
  'backend/pricing/pokemon_sealed_additive_execution_v1.mjs',
  'backend/pricing/pokemon_sealed_additive_catalog_v1.mjs',
  'backend/pricing/pokemon_sealed_world_v1.mjs',
  'backend/pricing/sealed_world_writer_v1.mjs',
];
const sourceHashes = {};
for (const file of sourceFiles) {
  git('ls-files', '--error-unmatch', file);
  sourceHashes[file] = hash(await fs.readFile(path.join(root, file)));
}
const planBytes = await fs.readFile(args.plan);
const plan = JSON.parse(gunzipSync(planBytes));
const authority = { fingerprint: args.fingerprint, producerCommit: head,
  productIds: args['product-ids'].split(',').map(Number) };
assertPokemonSealedAdditiveScopeV1(plan, authority);
let canary;
if (args.mode === 'apply') {
  assert.ok(args.canary && args['canary-hash'], 'Frozen canary receipt and hash required');
  canary = JSON.parse(await fs.readFile(args.canary, 'utf8'));
  assertPokemonSealedCanaryReceiptV1(canary, args['canary-hash'], plan, head);
}
const url = new URL(process.env.SUPABASE_DB_URL || process.env.DATABASE_URL);
const dbUser = decodeURIComponent(url.username);
assert.ok(url.hostname === `db.${POKEMON_SEALED_PROJECT_REF}.supabase.co` ||
  (url.hostname.endsWith('.pooler.supabase.com') && dbUser === `postgres.${POKEMON_SEALED_PROJECT_REF}`), 'Wrong database target');
if (process.env.SUPABASE_URL) assert.equal(new URL(process.env.SUPABASE_URL).hostname, `${POKEMON_SEALED_PROJECT_REF}.supabase.co`);
url.searchParams.delete('sslmode');
// Never overwrite an earlier run or leak connection credentials into artifacts.
await fs.mkdir(args.out);
const save = (name, value) => fs.writeFile(path.join(args.out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', flush: true });
await save('run_plan.json', { mode: args.mode, producer_commit: head, branch: git('branch', '--show-current'),
  project_ref: POKEMON_SEALED_PROJECT_REF, selected_product_ids: authority.productIds,
  plan_fingerprint: authority.fingerprint, plan_artifact_hash: hash(planBytes), source_hashes: sourceHashes,
  canary_receipt_hash: args['canary-hash'] ?? null, no_storage: true, no_pointer: true,
  no_visibility: true, no_vault: true, at: new Date().toISOString() });
let sequence = 0;
const persistPhase = event => save(`phase-${++sequence}.json`, { ...event, at: new Date().toISOString() });
const connect = async () => {
  const client = new pg.Client({ connectionString: url.toString(), ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis:15000, statement_timeout:60000, query_timeout:65000,
    application_name:`pokemon-sealed-additive-${args.mode}-v1` });
  await client.connect();
  try {
    const sanity = (await client.query(`select (select count(*) from card_prints)::integer cards,
      (select count(*) from sets)::integer sets,(select count(*) from card_print_traits)::integer traits`)).rows[0];
    assert.ok(sanity.cards >= 40000 && sanity.sets >= 150 && sanity.traits >= 5000, 'Canonical environment mismatch');
    return client;
  } catch (error) { await client.end(); throw error; }
};
try {
  const result = await runPokemonSealedAdditiveExecutionV1({ connect, plan, authority,
    mode: args.mode, canary, canaryHash: args['canary-hash'], persistPhase });
  await save('summary.json', result);
  await save('artifact_hashes.json', { summary: hash(result), plan: hash(planBytes), sources: sourceHashes });
  console.log(JSON.stringify(result));
} catch (error) {
  await save('failure.json', { status: 'failed', error: error.message, at: new Date().toISOString(),
    instruction: 'Inspect phase receipts. If commit was attempted, read back before any further write.' });
  process.exitCode = 1;
  console.error(error.message);
}
