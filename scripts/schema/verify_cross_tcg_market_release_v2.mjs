// Exact canonical511 ->512 release gate. Read-only production inspection only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {conditionReferenceDatabaseConfigV1} from '../../backend/pricing/condition_reference_database_config_v1.mjs';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url)).replaceAll('\\','/').replace(/\/$/,'');
const artifacts='C:/grookai_vault_operator_artifacts/cross_tcg_market_pricing_20261119';
const [phase,arg,...extra]=process.argv.slice(2);
assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');
assert.match(out,new RegExp('^'+artifacts+'/release-gate-v2-[a-z0-9-]{1,60}$'));
assert.equal(fs.existsSync(out),false,'Consumed proof directory');
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=file=>JSON.parse((file.endsWith('.gz')?gunzipSync(fs.readFileSync(file)):fs.readFileSync(file)).toString('utf8').replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const binding=read(root+'/scripts/schema/cross_tcg_market_candidate_v2.json');
assert.equal(binding.version,'CROSS_TCG_MARKET_511_TO_512_V2');
assert.equal(binding.project,'ycdxbpibncqcchqiihfz');assert.equal(binding.baselineMigrations,511);assert.equal(binding.targetMigrations,512);
assert.equal(Object.keys(binding.history).length,511);
assert.deepEqual(Object.keys(binding.candidates),['20261120063000_cross_tcg_market_publication_v2.sql']);
const sources={...binding.history,...binding.candidates};
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>/^\d+.*\.sql$/.test(n)).sort(),Object.keys(sources).sort());
for(const [file,pin] of Object.entries(sources))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin,'Migration source changed: '+file);
assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),binding.project);
assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
for(const [file,pin] of Object.entries(binding.baselineProofPins))assert.equal(sha(fs.readFileSync(artifacts+'/'+file)),pin);
const baseline=read(artifacts+'/baseline-v2/qualification.json');assert.equal(baseline.pass,true);assert.equal(baseline.productionWrites,0);assert.equal(baseline.migrations,511);assert.equal(baseline.securityExact,true);assert.equal(baseline.schemaExact,true);
const require=createRequire(root+'/package.json');
const environment=require('dotenv').parse(fs.readFileSync('C:/grookai_vault/.env.local'));
assert.equal(environment.SUPABASE_URL,'https://'+binding.project+'.supabase.co');
const databaseRoute=new URL(environment.SUPABASE_DB_URL);databaseRoute.search='';
const config=conditionReferenceDatabaseConfigV1(databaseRoute.href,{ca:fs.readFileSync('C:/Users/ccabr/Downloads/prod-ca-2021.crt','utf8'),readOnly:true,insecureTlsEnvironment:process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0',applicationName:'cross-tcg-market-v2-release-readonly'});
const client=new(require('pg').Client)({...config,connectionTimeoutMillis:15000});
fs.mkdirSync(out);
const report={version:binding.version,phase,pass:false,productionWrites:0,startedAt:new Date().toISOString()};
try{
 await client.connect();assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 const snapshots={};
 for(const [name,file] of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);
  const result=await client.query(sql);snapshots[name]=result.find(x=>x.rows?.[0]?.receipt)?.rows[0].receipt;assert.ok(snapshots[name]);
  fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(snapshots[name]))),{flag:'wx'});
 }
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
 assert.ok(snapshots.catalog.sanity.cards>=40000&&snapshots.catalog.sanity.sets>=150&&snapshots.catalog.sanity.traits>=5000);report.sanity=snapshots.catalog.sanity;
 assert.deepEqual(snapshots.security,read(artifacts+'/baseline-v2/security.private.json.gz'));
 const prior=read(artifacts+'/baseline-v2/catalog.private.json.gz');
 const pgkit=createRequire('C:/gv_intake_recovery_20261027/package.json');
 for(const name of ['schemainspect','migra','client'])assert.equal(pgkit('@pgkit/'+name+'/package.json').version,'0.6.1');
 const {PostgreSQL}=pgkit('@pgkit/schemainspect'),{Migration}=pgkit('@pgkit/migra');
 const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function inspect(snapshot,schema){const values=new Map(queries.map(([key,query])=>[query,snapshot[key]]));const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async query=>values.get(query.sql)});model.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,v])=>v.schema===schema));return model;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
  const a=await inspect(prior,schema),b=await inspect(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);
  const delta=await Migration.create(a,b,{schema});delta.set_safety(false);delta.add_all_changes(true);assert.equal(delta.sql.trim(),'','Production baseline drift: '+schema);
 }
 if(phase==='PrePush'){
  const manifest=read(artifacts+'/release-manifest-v2.json');assert.equal(manifest.version,binding.version);
  assert.deepEqual(manifest.history,binding.history);assert.deepEqual(manifest.candidates,binding.candidates);
  assert.equal(git(['status','--porcelain']),'','Release source must be committed and clean');
  assert.equal(manifest.sourceHead,git(['rev-parse','HEAD']));assert.equal(manifest.sourceTree,git(['rev-parse','HEAD^{tree}']));
  for(const file of ['local-qualification-v2/qualification.json','normal-hooks-v2.json','hosted-checks-v2.json'])assert.ok(Object.hasOwn(manifest.proofPins,file),'Missing frozen proof: '+file);
  for(const [file,pin] of Object.entries(manifest.sourcePins))assert.equal(sha(fs.readFileSync(root+'/'+file)),pin);
  for(const [file,pin] of Object.entries(manifest.proofPins)){assert.match(file,/^[a-zA-Z0-9_./-]+$/);assert.ok(!file.split('/').includes('..'));assert.equal(sha(fs.readFileSync(artifacts+'/'+file)),pin);}
  assert.ok(Object.keys(manifest.executedSourcePins).length>=4);for(const [file,pin] of Object.entries(manifest.executedSourcePins)){assert.ok(file.startsWith(artifacts+'/')&&!file.split('/').includes('..'));assert.equal(sha(fs.readFileSync(file)),pin);}
  const qualification=read(artifacts+'/local-qualification-v2/qualification.json');
  assert.equal(qualification.pass,true);assert.equal(qualification.productionWrites,0);assert.equal(qualification.candidateSha256,binding.candidates[Object.keys(binding.candidates)[0]]);
  for(const property of ['freshAndUpgradeSchemaEqual','existingSchemaAndSecurityPreserved','threeRolePermissionsQualified','protectedDataUnchanged','productionSizedPerformanceQualified','oldCohortOutputEquivalent','fresh512CliReplayQualified','populated511To512CliUpgradeQualified'])assert.equal(qualification[property],true,property);
  assert.ok(qualification.positiveExactPrices>=4&&qualification.negativeSourceLineageChecks>=13&&qualification.genuineMissingMarketHeld>=2);assert.equal(qualification.onePieceConflictingFinishWithheld,true);
  const hooks=read(artifacts+'/normal-hooks-v2.json');assert.equal(hooks.exitCode,0);assert.equal(hooks.sourceHead,manifest.sourceHead);assert.equal(hooks.sourceTree,manifest.sourceTree);assert.equal(hooks.hooksUnchanged,true);
  assert.equal(hooks.normalCommitPassed,true);assert.equal(hooks.normalPushPassed,true);
  const hosted=read(artifacts+'/hosted-checks-v2.json');assert.equal(hosted.sourceHead,manifest.sourceHead);assert.equal(hosted.allRequiredPassed,true);assert.ok(hosted.checks.length>=10);assert.ok(hosted.checks.every(x=>x.conclusion==='success'||x.conclusion==='neutral'||x.conclusion==='skipped'));
  const packet=read(artifacts+'/production-package-v2/packet.json');assert.equal(sha(fs.readFileSync(artifacts+'/production-package-v2/packet.json')),manifest.packetSha256);assert.equal(packet.sourceHead,manifest.sourceHead);assert.equal(packet.sourceTree,manifest.sourceTree);assert.deepEqual(packet.sources,sources);
  assert.equal(fs.readFileSync(packet.work+'/supabase/.temp/project-ref','utf8').trim(),binding.project);assert.equal(sha(fs.readFileSync(packet.work+'/supabase/config.toml')),packet.configSha256);
  assert.deepEqual(fs.readdirSync(packet.work+'/supabase/migrations').sort(),Object.keys(sources).sort());for(const [file,pin] of Object.entries(sources))assert.equal(sha(fs.readFileSync(packet.work+'/supabase/migrations/'+file)),pin);
  for(const lab of manifest.labs){
   assert.equal(fs.existsSync(lab.path+'/supabase/.temp/project-ref'),false);
   for(const [file,pin] of Object.entries(sources))assert.equal(sha(fs.readFileSync(lab.path+'/supabase/migrations/'+file)),pin);
   const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+lab.project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[lab.project]);
   assert.equal(JSON.parse(execFileSync('docker',['network','inspect',lab.project],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
   const localSQL=input=>JSON.parse(execFileSync('docker',['exec','-i','supabase_db_'+lab.project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:128*1024*1024}));
   assert.deepEqual(localSQL('begin read only;select jsonb_agg(version order by version) from supabase_migrations.schema_migrations;rollback;'),Object.keys(sources).sort().map(x=>x.match(/^\d+/)[0]));
   assert.equal(sha(JSON.stringify(localSQL(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8')))),lab.securitySha256);
   assert.equal(sha(JSON.stringify(localSQL(fs.readFileSync(lab.path+'/protected-fingerprints.sql','utf8')))),lab.protectedStateSha256);
  }
  report.sourceHead=manifest.sourceHead;report.normalHooksAndHostedChecksQualified=true;report.exactLocalAndPacketProofsQualified=true;
 }
 report.pass=true;report.migrationsBefore=511;report.migrationsAfter=512;report.securityExact=true;report.remainingSqlBytes=0;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/release-qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
