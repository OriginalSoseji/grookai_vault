// Fixed production inspection package. Intentionally has no apply operation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

assert.equal(process.argv.length, 3, 'Use prepare or dry-run only');
const mode = process.argv[2];
assert.ok(['prepare','dry-run'].includes(mode), 'No apply operation');
const root = fileURLToPath(new URL('../../', import.meta.url));
const out = process.env.GROOKAI_RECEIPT_RELEASE_EVIDENCE ?? 'C:/grookai_vault_operator_artifacts/receipt_delivery_20261015';
const dir = out + '/cli-package-reconcile-v1';
const target = 'ycdxbpibncqcchqiihfz';
const candidate = '20261015090000_vendor_receipt_delivery_reconcile_v1.sql';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true}).trim();
const names = fs.readdirSync(root + 'supabase/migrations').filter(name => name.endsWith('.sql')).sort();
const sourceHashes = Object.fromEntries(names.map(name => [name, hash(fs.readFileSync(root + 'supabase/migrations/' + name))]));
const gate = read(out + '/Release-' + (mode === 'prepare' ? 'AuditLinkedSchema' : 'PrePush') + '.json');

assert.equal(gate.status, 'passed');
assert.equal(gate.target, target);
assert.equal(gate.applyAuthority, false);
assert.deepEqual(gate.pending, [candidate.split('_')[0]]);
assert.deepEqual(gate.sourceHashes, sourceHashes);
assert.ok(!gate.productionWrites && !gate.actualMessagesSent);

const save = (base, name, value) => fs.writeFileSync(base + '/' + name, JSON.stringify(value, null, 2), {flag: 'wx'});
const cli = (args, name, base) => {
  const token = execFileSync('pwsh', ['-NoProfile', '-File', 'C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'], {encoding: 'utf8', windowsHide: true}).trim();
  assert.match(token, /^sbp_/);
  const env = {...process.env, SUPABASE_ACCESS_TOKEN: token, DO_NOT_TRACK: '1', PGOPTIONS: '-c default_transaction_read_only=on -c lock_timeout=5s -c statement_timeout=120s'};
  const result = spawnSync('supabase', [...args, '--workdir', dir], {cwd: dir, env, windowsHide: true, encoding: 'utf8', timeout: 240000, maxBuffer: 16 * 1024 * 1024});
  const log = (result.stdout ?? '') + (result.stderr ?? '');
  fs.writeFileSync(base + '/' + name + '.private.log', log, {flag: 'wx'});
  assert.equal(result.status, 0, `Inspect private ${name} log; no production apply available`);
  return log;
};

if (mode === 'prepare') {
  // Preparation intent consumed; preserve package for the dry-run step.
  fs.mkdirSync(dir + '/supabase/migrations', {recursive: true});
  const config = `project_id = "${target}"\n[db]\nmajor_version = 17\n`;
  save(dir, 'prepare-intent.json', {at: new Date().toISOString(), target, sourceHashes, configSha256: hash(config), gateSha256: hash(JSON.stringify(gate)), applyAuthority: false});
  for (const name of names) fs.copyFileSync(root + 'supabase/migrations/' + name, dir + '/supabase/migrations/' + name, fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(dir + '/supabase/config.toml', config, {flag: 'wx'});
  cli(['link', '--project-ref', target, '--yes'], 'link', dir);
  assert.equal(fs.readFileSync(dir + '/supabase/.temp/project-ref', 'utf8').trim(), target);
  save(dir, 'prepared.json', {at: new Date().toISOString(), status: 'passed', target, applyAuthority: false});
  console.log(JSON.stringify({status: 'prepared', target, applyAuthority: false}));
} else {
  const evidence = out + '/dry-run-reconcile-v1-' + Date.now();
  fs.mkdirSync(evidence, {recursive: true});
  const log = cli(['db','push','--linked','--dry-run','--yes'], 'dry-run', evidence);
  const pending = [...new Set(log.match(/\d{14}_[a-z0-9_]+\.sql/g) ?? [])];
  assert.deepEqual(pending, [candidate]);
  const result = {at: new Date().toISOString(), status: 'passed', target, pending, commit: git('rev-parse', 'HEAD'), sourceTree: gate.sourceTree, gateSha256: hash(JSON.stringify(gate)), logSha256: hash(log), evidence, productionMigrationsUnchanged: true, productionWrites: 0, applyAuthority: false};
  save(evidence, 'receipt.json', result);
  fs.writeFileSync(out + '/dry-run-reconcile-v1-latest.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
}
