// Normal checks against the retained, attested exact local437 package. No reset or reseed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {portfolioHistoryReleaseSources} from '../schema/product_portfolio_history_release_scope_v1.mjs';
import {loadCollectorUsabilityEvidence} from '../schema/product_collector_usability_evidence_v1.mjs';
import {readCollectorUsabilityParent} from '../schema/product_collector_usability_parent_v1.mjs';

const mode = process.argv[2];
assert.ok(['shipcheck', 'commit'].includes(mode));
assert.ok(process.argv.length === 3 || (mode === 'commit' && process.argv.length === 4));
const commitTitle = process.argv[3] ?? 'feat: compact collector views and isolate private Binder and Saved sessions';
assert.ok(commitTitle.length > 0 && commitTitle.length <= 120 && !/[\r\n]/.test(commitTitle));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(fs.realpathSync('.'), fs.realpathSync(root));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_collector_usability_20261008');
const base = 'C:/grookai_vault_operator_artifacts/product_collector_usability_20261008';
const fixture = 'C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/release-full-437-v1';
const project = 'portfolio-rel-full-437-v1-20261008';
const read = p => JSON.parse(fs.readFileSync(p));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command = (name, args) => execFileSync(name, args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 });
const git = (...args) => command('git', args).trim();
assert.equal(git('merge-base', 'HEAD', '5c5dec758d5c59bf6a9cc7f4d768816898c2d4b2'), '5c5dec758d5c59bf6a9cc7f4d768816898c2d4b2');
const main='50404ddceec33a5e0aa2dcd170a9593da9b3f749';
const mergePath=path.resolve(root,git('rev-parse','--git-path','MERGE_HEAD'));
if(fs.existsSync(mergePath))assert.equal(fs.readFileSync(mergePath,'utf8').trim(),main);
else git('merge-base','--is-ancestor',main,'HEAD');
const freeze = read(fixture + '/freeze.json'), replay = read(fixture + '/replay-result.json');
assert.equal(freeze.project, project);
assert.equal(replay.project, project);
assert.equal(replay.status, 'passed');
assert.equal(replay.migrations, 437);
assert.equal(replay.fullReplay, true);
assert.equal(replay.noOpPush, true);
assert.ok(!fs.existsSync(fixture + '/supabase/.temp/project-ref'));
assert.equal(sha(fixture + '/supabase/config.toml'), freeze.configSha256);
const allSources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
assert.deepEqual(portfolioHistoryReleaseSources(allSources,baseline.sourceHashes),freeze.sourceHashes);
for (const [name, digest] of Object.entries(freeze.sourceHashes)) {
  assert.equal(sha(root + '/supabase/migrations/' + name), digest, name);
  assert.equal(sha(fixture + '/supabase/migrations/' + name), digest, name);
}
const container = JSON.parse(command('docker', ['inspect', 'supabase_db_' + project]))[0];
assert.equal(container.State.Running, true);
const addresses = Object.values(container.NetworkSettings.Networks).map(n => n.IPAddress);
const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:35620/postgres?options=-c%20default_transaction_read_only%3Don';
async function state(){ return readCollectorUsabilityParent().states; }
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,true,'Freeze the reviewed source first');
const evidence=loadCollectorUsabilityEvidence();
const before = await state();
assert.deepEqual(before,evidence.states);
// Credentials are captured, never printed; only the local public key reaches checks.
const cfg = JSON.parse(command('supabase', ['status', '-o', 'json', '--workdir', fixture]));
assert.equal(cfg.API_URL, 'http://127.0.0.1:35621');
assert.equal(typeof cfg.PUBLISHABLE_KEY, 'string');
const out = base + '/checks-' + Date.now();
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(out + '/temp');
fs.writeFileSync(out + '/empty.env', '');
const env = {};
for (const key of ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC', 'PROGRAMFILES', 'ProgramFiles', 'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT', 'PUB_CACHE', 'FLUTTER_ROOT']) {
  if (process.env[key]) env[key] = process.env[key];
}
for (const dir of [root, root + '/apps/web', root + '/backend']) {
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    const file = dir + '/' + name;
    if (fs.existsSync(file)) for (const match of fs.readFileSync(file, 'utf8').matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) env[match[1]] = '';
  }
}
Object.assign(env, {
  TEMP: out + '/temp', TMP: out + '/temp', DOTENV_CONFIG_PATH: out + '/empty.env',
  SUPABASE_DB_URL: dbUrl, SUPABASE_URL: cfg.API_URL, SUPABASE_PUBLISHABLE_KEY: cfg.PUBLISHABLE_KEY,
  SUPABASE_ANON_KEY: cfg.PUBLISHABLE_KEY, SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '',
  NEXT_PUBLIC_SUPABASE_URL: cfg.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: cfg.PUBLISHABLE_KEY,
  NEXT_PUBLIC_COLLECTOR_PREVIEW_READ_ONLY: 'true', NEXT_PUBLIC_COLLECTOR_STAGING: 'false',
  NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST: 'false', NEXT_PUBLIC_COST_HISTORY_LOCAL_TEST: 'false', NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB: 'false', NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING: 'false',
  GROOKAI_COLLECTOR_RELEASE_V1: 'false', GROOKAI_DISABLE_TELEMETRY: '1', NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: '--use-system-ca', NODE_USE_SYSTEM_CA: '1', CI: 'true',
  SITE_URL: 'http://127.0.0.1:32990', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:32990',
});
const pathKey = Object.hasOwn(env, 'Path') ? 'Path' : 'PATH';
env[pathKey] = 'C:\\src\\flutter\\bin;' + env[pathKey];
if (mode === 'commit') {
  assert.equal(git('diff', '--name-only'), '', 'Stage the reviewed candidate first');
  assert.equal(git('ls-files', '--others', '--exclude-standard'), '');
  assert.match(fs.readFileSync(path.resolve(root, git('rev-parse', '--git-path', 'hooks/pre-commit')), 'utf8'), /GROOKAI_MANAGED_HOOK_V1[\s\S]*npm run shipcheck/);
}
const head = git('rev-parse', 'HEAD');
fs.writeFileSync(out + '/intent.json', JSON.stringify({ at: new Date().toISOString(), mode, head, before,
  scriptSha256: sha(fileURLToPath(import.meta.url)), localReadOnly: true, productionWrites: 0 }, null, 2));
const fd = fs.openSync(out + '/checks.private.log', 'wx');
const child = mode === 'commit'
  ? spawn('git', ['commit', '-m', commitTitle], { cwd: root, env, windowsHide: true, stdio: ['ignore', fd, fd] })
  : spawn('npm.cmd', ['run', 'shipcheck'], { cwd: root, env, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] });
console.log(JSON.stringify({ status: 'running', mode, out }));
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
fs.closeSync(fd);
const after = await state();
assert.deepEqual(loadCollectorUsabilityEvidence().states,after);
assert.deepEqual(after, before, 'Read-only checks must retain accounts and physical copies');
const receipt = { at: new Date().toISOString(), status: code === 0 ? 'passed' : 'failed', exitCode: code,
  mode, initialHead: head, finalHead: git('rev-parse', 'HEAD'), before, after,
  logSha256: sha(out + '/checks.private.log'), localReadOnly: true, productionWrites: 0, out };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2));
fs.writeFileSync(base + '/latest-checks.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: receipt.status, exitCode: code, out }));
process.exitCode = code ?? 1;
