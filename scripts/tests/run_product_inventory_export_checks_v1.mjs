// Ordinary checks on exact438. Device acceptance remains separately held; no release or apply authority.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import {inventoryExportReleaseSources} from '../schema/product_inventory_export_release_scope_v1.mjs';
import {readInventoryExportReleaseState} from '../schema/product_inventory_export_release_state_v1.mjs';


const mode = process.argv[2];
assert.ok(['shipcheck','native'].includes(mode),'Ordinary checks only; actual device acceptance remains separate');
assert.equal(process.argv.length,3);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(fs.realpathSync('.'), fs.realpathSync(root));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_inventory_export_20261008');
const base = 'C:/grookai_vault_operator_artifacts/product_inventory_export_20261008';
const fixture = 'C:/grookai_vault_operator_artifacts/product_inventory_export_20261008/release-full-438-v1';
const project = 'inv-rel-full-438-v1-20261008';
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
assert.equal(replay.migrations, 438);
assert.equal(replay.fullReplay, true);
assert.equal(replay.noOpPush, true);
assert.ok(!fs.existsSync(fixture + '/supabase/.temp/project-ref'));
assert.equal(sha(fixture + '/supabase/config.toml'), freeze.configSha256);
const allSources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,sha(root+'/supabase/migrations/'+n)]));
const baseline=read('C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1/freeze.json');
assert.deepEqual(inventoryExportReleaseSources(allSources,baseline.sourceHashes),freeze.sourceHashes);
for (const [name, digest] of Object.entries(freeze.sourceHashes)) {
  assert.equal(sha(root + '/supabase/migrations/' + name), digest, name);
  assert.equal(sha(fixture + '/supabase/migrations/' + name), digest, name);
}
const container = JSON.parse(command('docker', ['inspect', 'supabase_db_' + project]))[0];
assert.equal(container.State.Running, true);
const addresses = Object.values(container.NetworkSettings.Networks).map(n => n.IPAddress);
const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:36020/postgres?options=-c%20default_transaction_read_only%3Don';
async function state(){return {full:await readInventoryExportReleaseState('full',freeze.sourceHashes),upgrade:await readInventoryExportReleaseState('upgrade',freeze.sourceHashes)};}
const web=base+'/ui-1791523581076/web-1791525578515';
assert.equal(read(web+'/result.json').status,'passed');assert.equal(read(web+'/visual-review.json').status,'passed');
const productBinding=read(web+'/source-binding.json').hashes;
const nativeBinding=read(base+'/ui-1791523581076/device-1791524756186/native-source.json').files;
function unchanged(){for(const files of [productBinding,nativeBinding])for(const[p,h]of Object.entries(files))assert.equal(sha(root+'/'+p),h,p);}
unchanged();const before=await state();assert.deepEqual(before,read(base+'/RELEASE_FINAL_STATE_V1.json'));
// Credentials are captured, never printed; only the local public key reaches checks.
const cfg = JSON.parse(command('supabase', ['status', '-o', 'json', '--workdir', fixture]));
assert.equal(cfg.API_URL, 'http://127.0.0.1:36021');
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
  NEXT_PUBLIC_INVENTORY_EXPORT_LOCAL_TEST: 'false', NEXT_PUBLIC_PORTFOLIO_HISTORY_LOCAL_TEST: 'false', NEXT_PUBLIC_COST_HISTORY_LOCAL_TEST: 'false', NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB: 'false', NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING: 'false',
  GROOKAI_COLLECTOR_RELEASE_V1: 'false', GROOKAI_DISABLE_TELEMETRY: '1', NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: '--use-system-ca', NODE_USE_SYSTEM_CA: '1', CI: 'true',
  SITE_URL: 'http://127.0.0.1:32990', NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:32990',
});
const pathKey = Object.hasOwn(env, 'Path') ? 'Path' : 'PATH';
env[pathKey] = 'C:\\src\\flutter\\bin;' + env[pathKey];
const head = git('rev-parse', 'HEAD');
fs.writeFileSync(out + '/intent.json', JSON.stringify({ at: new Date().toISOString(), mode, head, before,
  scriptSha256: sha(fileURLToPath(import.meta.url)), localReadOnly: true, productionWrites: 0 }, null, 2));
const fd = fs.openSync(out + '/checks.private.log', 'wx');
const child = mode==='native'
  ? spawn('cmd.exe',['/d','/c','flutter analyze && flutter test --concurrency=1'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]})
  : spawn('npm.cmd', ['run', 'shipcheck'], { cwd: root, env, shell: true, windowsHide: true, stdio: ['ignore', fd, fd] });
console.log(JSON.stringify({ status: 'running', mode, out }));
const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
fs.closeSync(fd);
const after = await state();
unchanged();assert.deepEqual(after,read(base+'/RELEASE_FINAL_STATE_V1.json'));
assert.deepEqual(after, before, 'Read-only checks must retain accounts and physical copies');
const receipt = { at: new Date().toISOString(), status: code === 0 ? 'passed' : 'failed', exitCode: code,
  mode, initialHead: head, finalHead: git('rev-parse', 'HEAD'), before, after,
  logSha256: sha(out + '/checks.private.log'), localReadOnly: true, productionWrites: 0, deviceAcceptance:'held; not established by ordinary checks', out };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2));
fs.writeFileSync(base + '/latest-checks.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: receipt.status, exitCode: code, out }));
process.exitCode = code ?? 1;
