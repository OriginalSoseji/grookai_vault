// New read-only 479 baseline. No candidate, reset, apply or history repair path.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { reconcileKnownTableColumnOrderV1 } from './column_order_reconciliation_v1.mjs';

const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const projectRef = 'ycdxbpibncqcchqiihfz';
const baselineManifestPath = 'docs/audits/reviewed_intake_date_release_20261028/release-manifest.json';
const baselineManifestSha256 = 'f9c9ef88aeb5cf6d37cf04f3e93bf41d1e34e3259554f978e0c8dc7c94563694';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

export function validateEbaySellerBaselineInvocation(args) {
  assert.equal(args.length, 2);
  assert.equal(args[0], 'AuditLinkedSchema');
  assert.ok(args[1].startsWith('--out-dir='));
  const out = args[1].slice('--out-dir='.length).replaceAll('\\', '/');
  assert.match(out, /^C:\/gv_intake_recovery_private_20261027\/ebay-seller-baseline-[a-z0-9-]{1,96}$/);
  return { out };
}

export function validateEbaySellerBaselineInventory(files, expectedSources) {
  assert.equal(Object.keys(files).length, 479);
  assert.equal(Object.keys(expectedSources).length, 479);
  assert.deepEqual(Object.keys(files).sort(), Object.keys(expectedSources).sort());
  const versions = [];
  for (const [name, bytes] of Object.entries(files)) {
    assert.match(name, /^\d+_[a-z0-9_]+\.sql$/);
    assert.equal(sha(bytes), expectedSources[name], 'Frozen migration changed: ' + name);
    versions.push(name.match(/^\d+/)[0]);
  }
  versions.sort();
  assert.equal(new Set(versions).size, 479);
  assert.equal(versions.at(-2), '20261028020000');
  assert.equal(versions.at(-1), '20261028050700');
  return versions;
}

async function main() {
  const { out } = validateEbaySellerBaselineInvocation(process.argv.slice(2));
  assert.equal(root.replaceAll('\\', '/'), 'C:/gv_ebay_seller_20261028');
  assert.equal(fs.existsSync(out), false, 'Do not overwrite consumed audit evidence');
  assert.equal(fs.readFileSync(root + '/supabase/.temp/project-ref', 'utf8').trim(), projectRef);
  assert.equal(process.env.SUPABASE_URL, 'https://' + projectRef + '.supabase.co');
  const manifestBytes = fs.readFileSync(root + '/' + baselineManifestPath);
  assert.equal(sha(manifestBytes), baselineManifestSha256);
  const manifest = JSON.parse(manifestBytes);
  assert.equal(manifest.targetLedger, 479);
  const files = Object.fromEntries(fs.readdirSync(root + '/supabase/migrations')
    .filter(name => name.endsWith('.sql'))
    .map(name => [name, fs.readFileSync(root + '/supabase/migrations/' + name)]));
  const versions = validateEbaySellerBaselineInventory(files, manifest.migrationSources);
  const queryPath = root + '/scripts/schema/reviewed_intake_public_catalog_v1.sql';
  const query = fs.readFileSync(queryPath, 'utf8');
  assert.equal(sha(query), manifest.catalogQuerySha256);
  assert.equal(sha(fs.readFileSync(root + '/scripts/schema/column_order_reconciliation_v1.mjs')),
    'afb90fffe35a6a309c442c1c3527218f2050cd15ec4a431b725a9dc26474cfb1');

  const localProject = 'reviewed-intake-date-fresh-479-20261028';
  const docker = (...args) => execFileSync('docker', args, {
    encoding: 'utf8', timeout: 120000, maxBuffer: 64_000_000,
  });
  const info = JSON.parse(docker('inspect', 'supabase_db_' + localProject))[0];
  assert.equal(info.State.Running, true);
  assert.equal(info.Image, manifest.postgresImage);
  assert.deepEqual(Object.keys(info.NetworkSettings.Networks), [localProject]);
  assert.equal(JSON.parse(docker('network', 'inspect', localProject))[0].Internal, true);
  const sql = input => execFileSync('docker', [
    'exec', '-i', 'supabase_db_' + localProject, 'psql', '-X', '-qAt', '-U', 'postgres',
    '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
  ], { input, encoding: 'utf8', timeout: 120000, maxBuffer: 64_000_000 });
  assert.equal(sql('begin read only;select current_setting(\'max_worker_processes\');rollback;').trim(), '0');

  const require = createRequire('C:/gv_intake_release_20261028/package.json');
  for (const name of ['schemainspect', 'migra', 'client']) {
    assert.equal(require('@pgkit/' + name + '/package.json').version, '0.6.1');
  }
  const { PostgreSQL } = require('@pgkit/schemainspect');
  const { Migration } = require('@pgkit/migra');
  const queries = Object.fromEntries(Object.entries(new PostgreSQL({}, '17.6'))
    .filter(([key]) => key.endsWith('_QUERY')));
  assert.equal(Object.keys(queries).length, 15);
  fs.mkdirSync(out);
  const fd = fs.openSync(out + '/remote-envelope.json', 'wx');
  let result;
  try {
    result = spawnSync('supabase', ['db', 'query', '--linked', '--workdir', root,
      '--file', queryPath, '--output', 'json'], {
      stdio: ['ignore', fd, 'pipe'], encoding: 'utf8', timeout: 180000, windowsHide: true,
    });
  } finally { fs.closeSync(fd); }
  fs.writeFileSync(out + '/remote-stderr.log', result.stderr ?? '');
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  const raw = fs.readFileSync(out + '/remote-envelope.json', 'utf8');
  const remote = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows?.[0]?.receipt;
  const local = JSON.parse(sql(query));
  for (const snapshot of [local, remote]) {
    assert.equal(snapshot.read_only, 'on');
    assert.deepEqual(snapshot.LEDGER.map(row => row.version), versions);
  }
  assert.ok(remote.sanity.cards >= 40000 && remote.sanity.sets >= 150 && remote.sanity.traits >= 5000);
  for (const [name, snapshot] of [['local', local], ['remote', remote]]) {
    fs.writeFileSync(out + '/' + name + '-snapshot.json', JSON.stringify(snapshot));
  }
  async function inspect(snapshot) {
    const map = new Map(Object.entries(queries).map(([key, value]) => [value, snapshot[key]]));
    const model = await PostgreSQL.create({
      oneFirst: async () => snapshot.server_version,
      any: async query => {
        assert.equal(query.values.length, 0);
        assert.ok(map.has(query.sql));
        return map.get(query.sql);
      },
    });
    model.one_schema('public');
    for (const key of ['types', 'domains', 'materialized_views', 'composite_types']) {
      model[key] = Object.fromEntries(Object.entries(model[key]).filter(([, value]) => value.schema === 'public'));
    }
    return model;
  }
  const left = await inspect(local), right = await inspect(remote);
  const columnOrder = reconcileKnownTableColumnOrderV1(left, right);
  const diff = await Migration.create(left, right, { schema: 'public' });
  diff.set_safety(false);
  diff.add_all_changes(true);
  fs.writeFileSync(out + '/diagnostic-diff-never-executed.sql', diff.sql);
  assert.equal(diff.sql.trim(), '');
  assert.equal(remote.SECURITY.length, 1346);
  assert.ok(isDeepStrictEqual(local.SECURITY, remote.SECURITY));
  const report = {
    at: new Date().toISOString(), pass: true, scope: 'ebay_seller_read_only_baseline_479',
    remoteVersions: 479, localVersions: 479, frozenMigrationFiles: 479,
    remainingSqlBytes: 0, securityObjects: 1346, securityExact: true, columnOrder,
    querySha256: sha(query), remoteWrites: 0, candidateQualified: false,
    productionApplyAuthorized: false,
  };
  fs.writeFileSync(out + '/baseline.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
