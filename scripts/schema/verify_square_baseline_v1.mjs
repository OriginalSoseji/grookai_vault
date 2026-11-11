// Exact read-only 483 baseline; no reset, apply, candidate or TLS bypass path.
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
const manifestHash = '770484a4b4db3af954d9b5355c0268d0e65cf44012328160cf08a6c469fd594d';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const outputRoot = 'C:/grookai_vault_operator_artifacts/square_sync_20261110';

export function validateSquareBaselineArgs(args) {
  assert.equal(args.length, 2, 'Only phase and new bounded output allowed');
  assert.equal(args[0], 'AuditLinkedSchema', 'Baseline cannot qualify PrePush');
  assert.match(args[1], /^--out-dir=/);
  const out = args[1].slice('--out-dir='.length).replaceAll('\\', '/');
  assert.equal(path.win32.dirname(out).replaceAll('\\', '/'), outputRoot);
  assert.match(path.win32.basename(out), /^baseline-[a-z0-9-]{1,80}$/);
  return out;
}

export function validateSquareBaselineSources(files, expected) {
  assert.equal(Object.keys(files).length, 483, 'No candidate/pending migration allowed');
  assert.equal(Object.keys(expected).length, 483);
  assert.deepEqual(Object.keys(files).sort(), Object.keys(expected).sort());
  const versions = Object.keys(files).sort().map(name => {
    assert.match(name, /^\d+.*\.sql$/);
    assert.equal(sha(files[name]), expected[name], 'Historical migration bytes changed: ' + name);
    return name.match(/^\d+/)[0];
  });
  assert.equal(new Set(versions).size, 483, 'Duplicate migration version');
  assert.equal(versions.at(-1), '20261110090000');
  return versions;
}

export function validateSquareBaselineSnapshots(local, remote, versions) {
  for (const snapshot of [local, remote]) {
    assert.equal(snapshot.read_only, 'on');
    assert.deepEqual(snapshot.LEDGER.map(row => row.version), versions);
    assert.equal(snapshot.SECURITY.length, 1395);
  }
  assert.ok(remote.sanity.cards >= 40000 && remote.sanity.sets >= 150 && remote.sanity.traits >= 5000);
  assert.ok(isDeepStrictEqual(local.SECURITY, remote.SECURITY), 'Full ACL/RLS/owner/security footprint differs');
}

const commerceCatalogPins = Object.freeze({
  '20261111051000_square_catalog_sync_v1.sql': '3e6103471137049e5bb74634ea1e93f425a1e64994f17ca60513b1953287171b',
  '20261111060000_square_catalog_worker_runs_v1.sql': 'af9fc45a804891ab22016be3392f673fab17ae78a7e2d9fe157b458f142a9654',
  '20261111063000_square_catalog_retry_controls_v1.sql': '2ddc15cdba912d132d10a4d7351fff51b0332935bc9b90685b8509fefafe338d',
});
export function validateSquareCommerceStartingSources(files, expected) {
  assert.equal(Object.keys(files).length, 486, 'Only the three immutable local catalog candidates may accompany baseline483');
  for (const [file, pin] of Object.entries(commerceCatalogPins)) assert.equal(sha(files[file]), pin, 'Local catalog candidate changed');
  return validateSquareBaselineSources(Object.fromEntries(Object.entries(files).filter(([name]) => !Object.hasOwn(commerceCatalogPins, name))), expected);
}

export async function runSquareStartingBaselineAudit({commerceScope = false} = {}) {
  const out = validateSquareBaselineArgs(process.argv.slice(2));
  assert.equal(root.replaceAll('\\', '/'), 'C:/grookai_square_sync_20261110');
  assert.equal(fs.existsSync(out), false, 'Never replace a consumed audit');
  assert.equal(fs.realpathSync(outputRoot).replaceAll('\\', '/').toLowerCase(), outputRoot.toLowerCase());
  const manifestBytes = fs.readFileSync(root + '/scripts/schema/square_baseline_manifest_v1.json');
  assert.equal(sha(manifestBytes), manifestHash, 'Qualification manifest changed');
  const manifest = JSON.parse(manifestBytes), lab = manifest.lab;
  for (const [name, pin] of Object.entries(manifest.privateProofs)) assert.equal(sha(fs.readFileSync(lab + '/' + name)), pin, 'Retained proof changed: ' + name);
  const freeze = JSON.parse(fs.readFileSync(lab + '/freeze.json'));
  const replay = JSON.parse(fs.readFileSync(lab + '/replay-result.json'));
  const profile = JSON.parse(fs.readFileSync(lab + '/pending-profile-migration.json'));
  const readback = JSON.parse(fs.readFileSync(lab + '/schema-qualification-profile-postapply-v1/summary.json'));
  assert.equal(replay.pass, true); assert.equal(replay.cliPrefixResetSucceeded, true);
  assert.equal(replay.zeroStateWithExplicitPrerequisite, true); assert.equal(replay.allSourceBytesUnchanged, true);
  assert.equal(replay.migrations, 482); assert.equal(replay.aliases, 647);
  assert.equal(readback.status, 'passed'); assert.equal(readback.migrations, 483);
  assert.equal(readback.remaining_sql_bytes, 0); assert.equal(readback.security_objects, 1395);
  const expected = {...freeze.sources, [profile.file]: profile.source_sha256};
  const readSources = () => Object.fromEntries(fs.readdirSync(root + '/supabase/migrations').filter(name => name.endsWith('.sql'))
    .map(name => [name, fs.readFileSync(root + '/supabase/migrations/' + name)]));
  const validateSources = commerceScope ? validateSquareCommerceStartingSources : validateSquareBaselineSources;
  const versions = validateSources(readSources(), expected);
  assert.equal(fs.existsSync(lab + '/supabase/.temp/project-ref'), false);
  assert.equal(fs.readFileSync(root + '/supabase/.temp/project-ref', 'utf8').trim(), manifest.projectRef);
  assert.match(fs.readFileSync(root + '/supabase/config.toml', 'utf8'), /project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
  const pooler = new URL(fs.readFileSync(root + '/supabase/.temp/pooler-url', 'utf8').trim());
  assert.ok(decodeURIComponent(pooler.username).includes(manifest.projectRef));
  assert.ok(pooler.hostname.endsWith('.pooler.supabase.com'));
  const queryPath = root + '/scripts/schema/reviewed_intake_public_catalog_v1.sql';
  const query = fs.readFileSync(queryPath, 'utf8');
  assert.equal(sha(query), manifest.querySha256);
  assert.equal(sha(fs.readFileSync(root + '/scripts/schema/column_order_reconciliation_v1.mjs')), manifest.columnOrderHelperSha256);
  const docker = (...args) => execFileSync('docker', args, {encoding: 'utf8', timeout: 120000, maxBuffer: 64_000_000, windowsHide: true});
  const info = JSON.parse(docker('inspect', 'supabase_db_' + manifest.project))[0];
  assert.equal(info.State.Running, true); assert.equal(info.Image, manifest.postgresImage);
  assert.deepEqual(Object.keys(info.NetworkSettings.Networks), [manifest.project]);
  assert.equal(JSON.parse(docker('network', 'inspect', manifest.project))[0].Internal, true);
  for (const bindings of Object.values(info.NetworkSettings.Ports)) assert.equal(bindings?.length ?? 0, 0);
  const relay = JSON.parse(docker('inspect', manifest.project + '-relay'))[0];
  for (const bindings of Object.values(relay.NetworkSettings.Ports)) for (const binding of bindings ?? []) assert.equal(binding.HostIp, '127.0.0.1');
  const sql = input => execFileSync('docker', ['exec', '-i', 'supabase_db_' + manifest.project,
    'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
  {input, encoding: 'utf8', timeout: 120000, maxBuffer: 64_000_000, windowsHide: true});
  const state = JSON.parse(sql("begin read only;select json_build_object('users',(select count(*) from auth.users),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'aliases',(select count(*) from public.card_print_identity_aliases),'workers',current_setting('max_worker_processes'));rollback;"));
  assert.deepEqual(state, {users: 0, cards: 1294, copies: 0, aliases: 647, workers: '0'});
  const require = createRequire('C:/gv_intake_recovery_20261027/package.json');
  for (const name of ['schemainspect', 'migra', 'client']) assert.equal(require('@pgkit/' + name + '/package.json').version, '0.6.1');
  const {PostgreSQL} = require('@pgkit/schemainspect'), {Migration} = require('@pgkit/migra');
  const queries = Object.fromEntries(Object.entries(new PostgreSQL({}, '17.6')).filter(([key]) => key.endsWith('_QUERY')));
  assert.equal(Object.keys(queries).length, 15);
  fs.mkdirSync(out);
  const report = {scope: commerceScope ? 'square_commerce_read_only_starting_baseline_v2' : 'square_read_only_baseline_483_v1', startedAt: new Date().toISOString(), status: 'started',
    sourceHash: sha(fs.readFileSync(new URL(import.meta.url))), manifestHash, queryHash: sha(query),
    remoteWrites: 0, localWrites: 0, candidateQualified: false, productionApplyAuthorized: false};
  try {
    console.log('REMOTE read-only: https://ycdxbpibncqcchqiihfz.supabase.co; LOCAL read-only retained isolated catalog lab');
    const fd = fs.openSync(out + '/remote-envelope.private.json', 'wx'); let response;
    try { response = spawnSync('supabase', ['db', 'query', '--linked', '--workdir', root, '--file', queryPath, '--output', 'json'],
      {encoding: 'utf8', stdio: ['ignore', fd, 'pipe'], timeout: 180000, windowsHide: true}); }
    finally { fs.closeSync(fd); }
    fs.writeFileSync(out + '/remote-stderr.private.log', response.stderr ?? '', {flag: 'wx'});
    assert.ifError(response.error); assert.equal(response.status, 0, 'Read-only official CLI snapshot failed');
    const raw = fs.readFileSync(out + '/remote-envelope.private.json', 'utf8');
    const remote = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)).rows?.[0]?.receipt;
    const local = JSON.parse(sql(query));
    validateSquareBaselineSnapshots(local, remote, versions);
    for (const [name, snapshot] of [['local', local], ['remote', remote]]) fs.writeFileSync(out + '/' + name + '-snapshot.private.json', JSON.stringify(snapshot), {flag: 'wx'});
    async function inspect(snapshot) {
      const map = new Map(Object.entries(queries).map(([key, value]) => [value, snapshot[key]]));
      const model = await PostgreSQL.create({oneFirst: async () => snapshot.server_version,
        any: async q => { assert.equal(q.values.length, 0); assert.ok(map.has(q.sql)); return map.get(q.sql); }});
      model.one_schema('public');
      for (const key of ['types', 'domains', 'materialized_views', 'composite_types']) model[key] = Object.fromEntries(Object.entries(model[key]).filter(([, value]) => value.schema === 'public'));
      return model;
    }
    const left = await inspect(local), right = await inspect(remote);
    report.columnOrder = reconcileKnownTableColumnOrderV1(left, right);
    const diff = await Migration.create(left, right, {schema: 'public'});
    diff.set_safety(false); diff.add_all_changes(true); // Generate diagnostics only.
    fs.writeFileSync(out + '/diagnostic-never-executed.private.sql', diff.sql, {flag: 'wx'});
    assert.equal(diff.sql.trim(), '', 'Unknown public schema drift');
    validateSources(readSources(), expected);
    Object.assign(report, {status: 'passed', versions: 483, securityObjects: 1395, remainingSqlBytes: 0, sanity: remote.sanity});
  } catch (error) {
    report.status = 'failed'; report.errorCode = error.code ?? error.name; process.exitCode = 1;
  } finally {
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(out + '/baseline.json', JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
    console.log(JSON.stringify(report));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runSquareStartingBaselineAudit().catch(() => { console.error('square_baseline_precondition_failed'); process.exitCode = 1; });
}
