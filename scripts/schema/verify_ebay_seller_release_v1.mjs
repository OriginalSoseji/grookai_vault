// Exact, read-only 479 -> 480 qualification. No remote mutation operation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { reconcileKnownTableColumnOrderV1 } from './column_order_reconciliation_v1.mjs';
import { captureSellerObjectsSql } from './ebay_seller_object_fingerprints_v1.mjs';
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const privateRoot = 'C:/gv_intake_recovery_private_20261027';
const proofRoot = privateRoot + '/ebay-seller-labs-v1';
const baselinePath = 'docs/audits/reviewed_intake_date_release_20261028/release-manifest.json';
const baselineSha = 'f9c9ef88aeb5cf6d37cf04f3e93bf41d1e34e3259554f978e0c8dc7c94563694';
export const sellerReleaseCandidate = '20261028112000_ebay_seller_publisher_v1.sql';
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
export function validateSellerReleaseInvocation(args) {
  assert.equal(args.length, 2);
  const [phase, flag] = args;
  assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
  assert.match(flag, /^--out-dir=.+/);
  const out = flag.slice(10).replaceAll('\\', '/');
  assert.match(out, /^C:\/gv_intake_recovery_private_20261027\/ebay-seller-release-gate-[a-z0-9-]{1,96}$/);
  return { phase, out };
}
export function validateSellerReleaseInventory(files, history, candidateSha) {
  assert.equal(Object.keys(history).length, 479);
  assert.match(candidateSha, /^[a-f0-9]{64}$/);
  const expected = { ...history, [sellerReleaseCandidate]: candidateSha };
  assert.deepEqual(Object.keys(files).sort(), Object.keys(expected).sort());
  const versions = Object.keys(expected).sort().map(name => {
    assert.match(name, /^\d{8,14}_[a-z0-9_]+\.sql$/);
    assert.equal(sha(files[name]), expected[name], 'Frozen source changed: ' + name);
    return name.match(/^\d+/)[0];
  });
  assert.equal(new Set(versions).size, 480);
  assert.equal(versions.at(-2), '20261028050700');
  assert.equal(versions.at(-1), '20261028112000');
  return versions;
}
async function main() {
  const { phase, out } = validateSellerReleaseInvocation(process.argv.slice(2));
  assert.equal(root.replaceAll('\\','/'), 'C:/gv_ebay_integrated_20261028');
  assert.equal(fs.existsSync(out), false, 'Consumed qualification directories are immutable');
  assert.equal(fs.readFileSync(root + '/supabase/.temp/project-ref','utf8').trim(), 'ycdxbpibncqcchqiihfz');
  assert.equal(process.env.SUPABASE_URL, 'https://ycdxbpibncqcchqiihfz.supabase.co');
  assert.equal(sha(fs.readFileSync(root + '/' + baselinePath)), baselineSha);
  const history = read(root + '/' + baselinePath);
  const manifest = read(root + '/docs/audits/ebay_seller_publisher_20261028/release-manifest.json');
  assert.equal(manifest.projectRef, 'ycdxbpibncqcchqiihfz');
  assert.equal(manifest.beforeLedger, 479); assert.equal(manifest.targetLedger, 480);
  assert.equal(manifest.candidate, sellerReleaseCandidate);
  assert.deepEqual(manifest.pending, ['20261028112000']);
  const files = Object.fromEntries(fs.readdirSync(root + '/supabase/migrations').filter(n => n.endsWith('.sql'))
    .map(n => [n, fs.readFileSync(root + '/supabase/migrations/' + n)]));
  const versions = validateSellerReleaseInventory(files, history.migrationSources, manifest.candidateSha256);
  const queryPath = root + '/scripts/schema/reviewed_intake_public_catalog_v1.sql';
  const query = fs.readFileSync(queryPath,'utf8');
  assert.equal(sha(query), history.catalogQuerySha256);
  assert.equal(sha(fs.readFileSync(root + '/scripts/schema/column_order_reconciliation_v1.mjs')),
    'afb90fffe35a6a309c442c1c3527218f2050cd15ec4a431b725a9dc26474cfb1');
  fs.mkdirSync(out);
  const local = project => {
    assert.ok(['ebay-seller-fresh-479-20261028','ebay-seller-fresh-480-20261028','ebay-seller-retained-480-20261028'].includes(project));
    const docker = (...args) => execFileSync('docker', args, { encoding:'utf8', timeout:120000, maxBuffer:64000000 });
    const info = JSON.parse(docker('inspect','supabase_db_' + project))[0];
    assert.equal(info.State.Running,true); assert.equal(info.Image,history.postgresImage);
    assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
    assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
    const sql = input => execFileSync('docker',['exec','-i','supabase_db_' + project,
      'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],
    { input, encoding:'utf8', timeout:120000, maxBuffer:64000000 });
    assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');
    const snapshot = JSON.parse(sql(query));
    fs.writeFileSync(out + '/' + project + '-catalog.json',JSON.stringify(snapshot));
    return { snapshot, sql };
  };
  const baseline = local('ebay-seller-fresh-479-20261028');
  assert.deepEqual(baseline.snapshot.LEDGER.map(v => v.version),versions.slice(0,-1));
  const fd = fs.openSync(out + '/remote-envelope.json','wx'); let remoteResult;
  try { remoteResult = spawnSync('supabase',['db','query','--linked','--workdir',root,
    '--file',queryPath,'--output','json'], { stdio:['ignore',fd,'pipe'], encoding:'utf8', timeout:180000, windowsHide:true }); }
  finally { fs.closeSync(fd); }
  fs.writeFileSync(out + '/remote-stderr.log',remoteResult.stderr ?? '');
  assert.ifError(remoteResult.error); assert.equal(remoteResult.status,0);
  const raw = fs.readFileSync(out + '/remote-envelope.json','utf8');
  const remote = JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows?.[0]?.receipt;
  assert.equal(remote.read_only,'on');
  assert.ok(remote.sanity.cards >= 40000 && remote.sanity.sets >= 150 && remote.sanity.traits >= 5000);
  const remoteVersions = remote.LEDGER.map(v => v.version);
  assert.ok(isDeepStrictEqual(remoteVersions,versions.slice(0,-1)) || phase === 'AuditLinkedSchema' && isDeepStrictEqual(remoteVersions,versions));
  const require = createRequire('C:/gv_intake_release_20261028/package.json');
  for (const name of ['schemainspect','migra','client']) assert.equal(require('@pgkit/' + name + '/package.json').version,'0.6.1');
  const { PostgreSQL } = require('@pgkit/schemainspect'), { Migration } = require('@pgkit/migra');
  const queries = Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([key]) => key.endsWith('_QUERY')));
  assert.equal(Object.keys(queries).length,15);
  async function inspect(snapshot) {
    const map = new Map(Object.entries(queries).map(([key,value]) => [value,snapshot[key]]));
    const model = await PostgreSQL.create({ oneFirst:async () => snapshot.server_version,
      any:async q => { assert.equal(q.values.length,0); assert.ok(map.has(q.sql)); return map.get(q.sql); } });
    model.one_schema('public');
    for (const key of ['types','domains','materialized_views','composite_types']) model[key] = Object.fromEntries(Object.entries(model[key]).filter(([,v]) => v.schema === 'public'));
    return model;
  }
  async function compare(left,right,name) {
    const l = await inspect(left), r = await inspect(right);
    reconcileKnownTableColumnOrderV1(l,r);
    const diff = await Migration.create(l,r,{schema:'public'}); diff.set_safety(false); diff.add_all_changes(true);
    fs.writeFileSync(out + '/' + name + '-diff-never-executed.sql',diff.sql);
    assert.equal(diff.sql.trim(),''); assert.ok(isDeepStrictEqual(left.SECURITY,right.SECURITY),name + ' security differs');
  }
  if (remoteVersions.length === 479) await compare(baseline.snapshot,remote,'production-baseline');
  if (phase === 'PrePush' || remoteVersions.length === 480) {
    for (const required of ['candidate-frozen-v1.json','fresh-480/replay-result.json',
      'retained-upgrade-v1/result.json','retained-upgrade-v1/private-photo-bytes-v1.json',
      'runtime-qualification-v2/result.json','sale-closeout-sdk-v1/result.json',
      'target-comparison-v1/result.json','object-guard-proof-v1/result.json']) {
      assert.match(manifest.proofFiles[required] ?? '', /^[a-f0-9]{64}$/, 'Missing qualification evidence: ' + required);
    }
    for (const [relative,hash] of Object.entries(manifest.proofFiles)) {
      assert.equal(path.posix.normalize(relative),relative); assert.ok(!relative.startsWith('../'));
      assert.equal(sha(fs.readFileSync(proofRoot + '/' + relative)),hash,'Qualification evidence changed: ' + relative);
    }
    for (const [relative,hash] of Object.entries(manifest.runtimeSources)) assert.equal(sha(fs.readFileSync(root + '/' + relative,'utf8').replaceAll('\r\n','\n')),hash,'Runtime source changed: ' + relative);
    assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','PrePush requires the exact committed checkout');
    const attestation = read(proofRoot + '/runtime-execution-source-attestation-v1.json');
    assert.equal(attestation.pass,true); assert.equal(attestation.sourceUnchangedSinceRuntimeStart,true);
    assert.equal(Object.keys(attestation.runtimeSources).length,21);
    for (const [relative,hash] of Object.entries(attestation.runtimeSources)) assert.equal(manifest.runtimeSources[relative],hash);
    const proof = read(proofRoot + '/runtime-qualification-v2/result.json');
    assert.equal(proof.pass,true); assert.equal(proof.candidateSha256,manifest.candidateSha256);
    for (const key of ['actualSharedAuth','actualPrivateStorage','crossConnectionDurability','concurrency','controlsOffAfter']) assert.equal(proof[key],true,key);
    const closeout = read(proofRoot + '/sale-closeout-sdk-v1/result.json');
    assert.equal(closeout.pass,true); assert.equal(closeout.candidateSha256,manifest.candidateSha256);
    assert.equal(closeout.actualOwnerAuth,true); assert.equal(closeout.concurrentRequests,4);
    assert.equal(closeout.dispositions,1);
    const targetComparison = read(proofRoot + '/target-comparison-v1/result.json');
    assert.equal(targetComparison.pass,true); assert.equal(targetComparison.fullPublicSchemaDiffBytes,0);
    assert.equal(targetComparison.securityExact,true); assert.equal(targetComparison.sellerObjects,79);
    assert.equal(targetComparison.preservedIntakeObjects,39);
    const driftProof = read(proofRoot + '/object-guard-proof-v1/result.json');
    assert.equal(driftProof.pass,true); assert.equal(driftProof.driftRejections.length,7);
    assert.equal(driftProof.idempotentRollbackPass,true);
    assert.equal(read(proofRoot + '/retained-upgrade-v1/private-photo-bytes-v1.json').pass,true);
    const expectedObjects = read(root + '/docs/audits/ebay_seller_publisher_20261028/object-fingerprints.json');
    for (const project of ['ebay-seller-fresh-480-20261028','ebay-seller-retained-480-20261028']) {
      const target = local(project);
      assert.deepEqual(target.snapshot.LEDGER.map(v => v.version),versions);
      assert.ok(isDeepStrictEqual(JSON.parse(target.sql('begin read only;set local search_path=pg_catalog,public,extensions;'+captureSellerObjectsSql()+'rollback;')),expectedObjects));
      assert.equal(target.sql("select linking_enabled::text||':'||preparation_enabled::text||':'||publication_enabled::text||':'||cardinality(canary_actor_ids)::text from public.ebay_seller_controls_v1 where singleton").trim(),'false:false:false:0');
      if (project.includes('fresh-480')) {
        const replay = read(proofRoot + '/fresh-480/replay-result.json');
        assert.equal(replay.pass,true); assert.equal(replay.cliResetSucceeded,true);
      } else assert.equal(read(proofRoot + '/retained-upgrade-v1/result.json').pass,true);
      await compare(local('ebay-seller-fresh-480-20261028').snapshot,target.snapshot,project);
      if (remoteVersions.length === 480) await compare(target.snapshot,remote,'production-target');
    }
  }
  const result = { at:new Date().toISOString(),pass:true,phase,scope:'ebay_seller_exact_479_to_480',
    candidateSha256:manifest.candidateSha256,remoteLedger:remoteVersions.length,
    pending:['20261028112000'],fullSchemaDiffBytes:0,securityExact:true,productionWrites:0 };
  fs.writeFileSync(out + '/qualification.json',JSON.stringify(result,null,2)+'\n'); console.log(JSON.stringify(result));
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode=1; });
}
