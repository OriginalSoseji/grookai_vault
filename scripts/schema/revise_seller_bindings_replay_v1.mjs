// One bounded revision of the new, empty 188xx development project. Preserve
// its initial failing-race evidence and every older proof project. No remote write.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {root,fixture,project,container,relay,output,addition,hash,hashes,docker,sql,sourceState,guard} from './seller_bindings_runtime_v1.mjs';
assert.equal(process.argv.length,2);
const oldDigest='88fd5e89fb7d43d673e0420c2e60c476f04f65dad89c8f1b4bf42ec764b7cb74';
const source=sourceState();assert.equal(Object.keys(source).length,400);assert.notEqual(source[addition],oldDigest);
const priorFile=path.join(output,'replay.json'),priorBytes=fs.readFileSync(priorFile),prior=JSON.parse(priorBytes);
assert.equal(prior.status,'passed');assert.equal(prior.project,project);assert.equal(prior.sourceHashes[addition],oldDigest);
assert.deepEqual({...source,[addition]:oldDigest},prior.sourceHashes);
assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),prior.sourceHashes);
const baseline=JSON.parse(fs.readFileSync(path.join(output,prior.baselineFile)));
assert.equal(baseline.status,'passed');assert.equal(baseline.applied,396);assert.equal(baseline.comparison.normalizedBytes,0);
assert.equal(baseline.comparison.securityObjects,893);assert.ok(Date.now()-Date.parse(baseline.finishedAt)<86400000);
for(const [name,digest] of Object.entries(baseline.toolHashes))assert.equal(hash(fs.readFileSync(path.join(root,name))),digest);
const prep=JSON.parse(fs.readFileSync(path.join(fixture,'preparation.json')));
assert.equal(fs.realpathSync(fixture).replaceAll('\\','/').toLowerCase(),'c:/gv_store_billing_20260919/.local/integration/seller-bindings-replay');
assert.equal(prep.project,project);assert.equal(prep.databasePort,18822);
const base={...source};delete base[addition];assert.deepEqual(base,prep.sourceHashes);
assert.ok(!fs.existsSync(path.join(fixture,'supabase/.temp/project-ref')));
assert.equal(hash(fs.readFileSync(path.join(fixture,'supabase/config.toml'))),prep.configSha256);
const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);
assert.equal(db.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
assert.deepEqual(JSON.parse(docker('inspect',relay))[0].NetworkSettings.Ports['18822/tcp'],[{HostIp:'127.0.0.1',HostPort:'18822'}]);
assert.deepEqual(sql('select version from supabase_migrations.schema_migrations order by version;').split(/\r?\n/),Object.keys(source).map(n=>n.split('_')[0]));
assert.equal(sql("select current_setting('max_worker_processes')||'|'||(select count(*) from auth.users)||'|'||(select count(*) from public.card_prints)||'|'||(select count(*) from public.sealed_product_variants)||'|'||(select count(*) from cron.job_run_details)||'|'||(select count(*) from public.vendor_seller_accounts)||'|'||(select count(*) from public.vendor_seller_events);"),'0|0|0|0|0|0|0');
assert.equal(sql("select app_enabled::text||'|'||web_enabled::text||'|'||custom_enabled::text from public.vendor_store_rollout;"),'false|false|false');
assert.equal(sql('select onboarding_enabled::text from public.vendor_seller_rollout;'),'false');
const footprintSql=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
const old=JSON.parse(sql(footprintSql));assert.deepEqual(old.objects,JSON.parse(fs.readFileSync(path.join(fixture,'full-footprint.json'))).objects);
// This exact draft has a reproduced event-before-bind race, not a general reset.
const failures=fs.readdirSync(output).filter(n=>/^concurrency-.*\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(output,n))));
assert.ok(failures.some(p=>p.status==='failed'&&p.migrationSha256===oldDigest&&p.failure?.includes('deauthorization committed during first binding')));
assert.ok(!fs.existsSync(path.join(output,'replay-initial.json')));assert.ok(!fs.existsSync(path.join(fixture,'full-reset-revision-private.log')));
fs.writeFileSync(path.join(output,'replay-initial.json'),priorBytes,{flag:'wx'});
fs.copyFileSync(path.join(fixture,'supabase/migrations',addition),path.join(output,'initial-migration.sql'),fs.constants.COPYFILE_EXCL);
const next=fs.readFileSync(path.join(root,'supabase/migrations',addition));
fs.writeFileSync(path.join(fixture,'supabase/migrations',addition),next);
assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),source);
const env={...process.env};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['db','reset','--local','--no-seed','--yes','--workdir',fixture,'--network-id',project],
 {cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:600000,maxBuffer:32*1024*1024});
const log=(run.stdout??'')+(run.stderr??'');fs.writeFileSync(path.join(fixture,'full-reset-revision-private.log'),log,{flag:'wx'});
assert.equal(run.status,0,'Inspect retained reset result; never blindly restart a partial reset');
const current=guard({full:true}),footprint=JSON.parse(sql(footprintSql));
const original=JSON.parse(execFileSync('docker',['exec','-i','supabase_db_grookai-custom-import-20260919','psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],
 {input:footprintSql,encoding:'utf8',windowsHide:true,maxBuffer:32*1024*1024,timeout:60000}));
assert.deepEqual(original.objects,JSON.parse(fs.readFileSync(path.join(fixture,'prior-184-footprint.json'))).objects);
const keys=new Set(original.objects.map(o=>`${o.kind}|${o.key}`));
assert.deepEqual(footprint.objects.filter(o=>keys.has(`${o.kind}|${o.key}`)),original.objects);
const added=footprint.objects.filter(o=>!keys.has(`${o.kind}|${o.key}`));assert.ok(added.every(o=>/vendor_seller_/.test(o.key)));assert.equal(added.length,73);
const body=next.toString('utf8').replace(/^begin;$/m,'').replace(/^commit;$/m,'');sql('begin;\n'+body+'\nrollback;');
assert.deepEqual(JSON.parse(sql(footprintSql)).objects,footprint.objects);
fs.writeFileSync(path.join(fixture,'revised-footprint.json'),JSON.stringify(footprint),{flag:'wx'});
const report={at:new Date().toISOString(),status:'passed',...current,baselineFile:prior.baselineFile,fullChainResetReplay:true,
 unchangedObjects:original.objects.length,addedObjects:added,resetLogSha256:hash(log),initialReplaySha256:hash(priorBytes),
 initialMigrationSha256:oldDigest,revisionReason:'Serialize event-before-bind race by scoped connected account',idempotentRollback:true,
 productionWrites:0,sharedResets:0,providerRequests:0,rolloutEnabled:false};
fs.writeFileSync(priorFile,JSON.stringify(report,null,2));
console.log(JSON.stringify({status:'passed',applied:current.applied,unchangedObjects:original.objects.length,addedObjects:added.length,productionWrites:0}));
