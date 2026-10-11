// Normal checks against the retained, attested local 433 lab. No reset or reseed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import pg from 'pg';

const mode = process.argv[2];
assert.ok(['shipcheck', 'commit'].includes(mode));
assert.ok(process.argv.length === 3 || (mode === 'commit' && process.argv.length === 4));
const commitTitle = process.argv[3] ?? 'test: verify governed offer prices through real clients';
assert.ok(commitTitle.length > 0 && commitTitle.length <= 120 && !/[\r\n]/.test(commitTitle));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
assert.equal(fs.realpathSync('.'), fs.realpathSync(root));
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_offer_market_20261008');
const base = 'C:/grookai_vault_operator_artifacts/product_offer_market_20261008';
const fixture = 'C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007/full-433-v4';
const project = 'product-trade-full-433-v4-20261007';
const read = p => JSON.parse(fs.readFileSync(p));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command = (name, args) => execFileSync(name, args, { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 });
const git = (...args) => command('git', args).trim();
assert.equal(git('merge-base', 'HEAD', '2dc3a1a0c85beacf6f8ed3da7d408aa89faef477'), '2dc3a1a0c85beacf6f8ed3da7d408aa89faef477');
const freeze = read(fixture + '/freeze.json'), replay = read(fixture + '/replay-result.json');
assert.equal(freeze.project, project);
assert.equal(replay.project, project);
assert.equal(replay.status, 'passed');
assert.equal(replay.migrations, 433);
assert.equal(replay.fullReplay, true);
assert.equal(replay.noOpPush, true);
assert.ok(!fs.existsSync(fixture + '/supabase/.temp/project-ref'));
assert.equal(sha(fixture + '/supabase/config.toml'), freeze.configSha256);
assert.deepEqual(fs.readdirSync(root + '/supabase/migrations').filter(name => name.endsWith('.sql')).sort(), Object.keys(freeze.sourceHashes).sort(), 'Entry must retain the exact qualified migration set');
for (const [name, digest] of Object.entries(freeze.sourceHashes)) {
  assert.equal(sha(root + '/supabase/migrations/' + name), digest, name);
  assert.equal(sha(fixture + '/supabase/migrations/' + name), digest, name);
}
const container = JSON.parse(command('docker', ['inspect', 'supabase_db_' + project]))[0];
assert.equal(container.State.Running, true);
const addresses = Object.values(container.NetworkSettings.Networks).map(n => n.IPAddress);
const dbUrl = 'postgresql://postgres:postgres@127.0.0.1:33560/postgres?options=-c%20default_transaction_read_only%3Don';
async function state() {
  const db = new pg.Client({ connectionString: dbUrl, connectionTimeoutMillis: 10000 });
  await db.connect();
  try {
    const row = (await db.query(`select host(inet_server_addr()) address,
      current_setting('transaction_read_only') readonly, current_setting('max_worker_processes') workers,
      (select count(*)::int from supabase_migrations.schema_migrations) migrations,
      (select count(*)::int from vault_item_instances) copies,
      (select count(*)::int from auth.users) users,
      jsonb_build_object('negotiated',(select enabled from vendor_negotiated_trade_control),
        'trade',(select enabled from vendor_sales_trade_control),'payments',(select enabled from vendor_sales_payment_control),
        'purchase',(select enabled from vendor_purchase_control),'cart',(select enabled from vendor_sales_cart_control),
        'cloud',(select enabled from vendor_receipt_cloud_control),'capture',(select capture_enabled from vendor_cost_evidence_control),
        'edit',(select edit_enabled from vendor_cost_evidence_control)) controls`)).rows[0];
    assert.ok(addresses.includes(row.address));
    assert.equal(row.readonly, 'on');
    assert.equal(row.workers, '0');
    assert.equal(row.migrations, 433);
    assert.deepEqual(row.controls,{negotiated:false,trade:false,payments:false,purchase:false,cart:false,cloud:false,capture:false,edit:false});
    assert.equal(Number((await db.query('select count(*) as n from market_price_current_publication')).rows[0].n),0,'Runtime must restore the absent pointer before ordinary checks');
    row.retained={};
    for(const table of ['auth.users','vault_owners','vault_items','vault_item_instances','vault_item_instance_dispositions',
      'vault_copy_cost_requests','vendor_sale_cost_snapshots','vendor_receipt_books','vendor_sales_cart_receipts',
      'card_events','pricing_watch','card_prints','card_printings','sets','card_print_identity','external_mappings',
      'tcgcsv_source_categories','tcgcsv_source_groups','tcgcsv_source_sync_runs','tcgcsv_source_artifacts',
      'tcgcsv_source_products','tcgcsv_source_price_daily_observations','market_evidence_variant_assignments',
      'tcgplayer_jungle_edition_assignments_v1','market_price_pipeline_runs','market_price_pipeline_phase_attempts',
      'market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_sets',
      'market_price_publication_snapshots','market_price_publication_events','market_price_current_publication']) {
      row.retained[table]=(await db.query(`select md5(coalesce(jsonb_agg(j order by j::text),'[]'::jsonb)::text) hash
        from (select to_jsonb(t) j from ${table} t) r`)).rows[0].hash;
    }
    return row;
  } finally { await db.end(); }
}
const before = await state();
// Credentials are captured, never printed; only the local public key reaches checks.
const cfg = JSON.parse(command('supabase', ['status', '-o', 'json', '--workdir', fixture]));
assert.equal(cfg.API_URL, 'http://127.0.0.1:33561');
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
  NEXT_PUBLIC_COLLECTOR_FIXTURE_LAB: 'false', NEXT_PUBLIC_COLLECTOR_HOSTED_STAGING: 'false',
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
assert.deepEqual(after, before, 'Read-only checks must retain accounts and physical copies');
const receipt = { at: new Date().toISOString(), status: code === 0 ? 'passed' : 'failed', exitCode: code,
  mode, initialHead: head, finalHead: git('rev-parse', 'HEAD'), before, after,
  logSha256: sha(out + '/checks.private.log'), localReadOnly: true, productionWrites: 0, out };
fs.writeFileSync(out + '/receipt.json', JSON.stringify(receipt, null, 2));
fs.writeFileSync(base + '/latest-checks.json', JSON.stringify(receipt, null, 2));
console.log(JSON.stringify({ status: receipt.status, exitCode: code, out }));
process.exitCode = code ?? 1;
