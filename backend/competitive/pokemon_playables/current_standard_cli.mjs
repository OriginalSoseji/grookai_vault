import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assert} from './common.mjs';
import {FileArtifactStore, SupabaseArtifactStore} from './store.mjs';
import {assertRemoteEnvironment, loadTcgdexCohortBindings} from './catalog.mjs';
import {publishCurrentStandardUsage} from './current_standard_worker_v1.mjs';
import {createStandardUsageRefreshSeed, REFRESH_SEED_KEY, refreshCurrentStandardUsage} from './current_standard_refresh_v1.mjs';

export async function main(args = process.argv.slice(2)) {
  args = [...args];
  const command = args[0] && !args[0].startsWith('--') ? args.shift() : 'build';
  assert(['build', 'seed', 'daily'].includes(command), 'STANDARD_USAGE_COMMAND');
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    assert(['--input', '--directory', '--project-ref', '--as-of'].includes(args[i]) && args[i + 1] && !values.has(args[i]), 'STANDARD_USAGE_CLI_ARGUMENT');
    values.set(args[i], args[i + 1]);
  }
  assert((command === 'daily' ? !values.has('--input') : values.has('--input')) &&
    (values.has('--directory') !== values.has('--project-ref')), 'STANDARD_USAGE_INPUT_AND_TARGET_REQUIRED');
  const policy = JSON.parse(await fs.readFile(new URL('./policy_current_standard_v1.json', import.meta.url), 'utf8'));
  let store, bindingsLoader;
  if (values.has('--directory')) store = new FileArtifactStore(values.get('--directory'));
  else {
    const {createBackendClient} = await import('../../supabase_backend_client.mjs');
    const client = createBackendClient();
    await assertRemoteEnvironment(client, values.get('--project-ref'));
    store = new SupabaseArtifactStore(client);
    await store.initialize();
    bindingsLoader = ids => loadTcgdexCohortBindings(client, ids);
  }
  if (command === 'daily') {
    assert(!store.local && !values.has('--as-of'), 'STANDARD_USAGE_DAILY_REMOTE_CURRENT_ONLY');
    return refreshCurrentStandardUsage({store, policy, bindingsLoader});
  }
  const body = await fs.readFile(values.get('--input'));
  assert(body.length <= 32 * 1024 * 1024, 'STANDARD_USAGE_INPUT_SIZE');
  const input = JSON.parse(body);
  if (command === 'seed') {
    assert(!values.has('--as-of'), 'REFRESH_SEED_CURRENT_ONLY');
    assert(!await store.get('standard-usage/refresh-lock.json'), 'REFRESH_ALREADY_RUNNING');
    const seed = createStandardUsageRefreshSeed(input, new Date().toISOString());
    await store.put(REFRESH_SEED_KEY, seed);
    const {digest} = await import('./common.mjs');
    assert(digest(await store.get(REFRESH_SEED_KEY)) === digest(seed), 'REFRESH_SEED_READBACK');
    return {seed_key: REFRESH_SEED_KEY, members: seed.members.length, retain_until: seed.retain_until, local_preview: Boolean(store.local)};
  }
  const result = await publishCurrentStandardUsage({store, input, policy,
    asOf: values.get('--as-of') ?? new Date().toISOString(), bindingsLoader});
  return {run_id: result.run_id, state: result.manifest.state, snapshot_id: result.manifest.snapshot_id,
    coverage: result.manifest.coverage, valid_until: result.manifest.valid_until, local_preview: Boolean(store.local)};
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    console.error(JSON.stringify({error: error.code ?? 'STANDARD_USAGE_FAILED'})); process.exitCode = 1;
  });
}
