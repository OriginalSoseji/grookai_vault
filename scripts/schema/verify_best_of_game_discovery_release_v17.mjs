// Read-only canonical522 gate. Never applies SQL or accepts API retries.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/best_of_game_catalog_load_522_20261124';
const prior='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123';
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:30000}).trim();
const [phase,arg,...extra]=process.argv.slice(2);
assert.equal(extra.length,0);assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.ok(out.startsWith(art+'/release-gate-v17-'));
assert.match(out.slice((art+'/release-gate-v17-').length),/^[a-z0-9-]{1,60}$/);assert.equal(fs.existsSync(out),false);
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v17.json');
assert.equal(binding.version,'BEST_OF_GAME_DISCOVERY_CANDIDATE_V17');assert.equal(binding.project,'ycdxbpibncqcchqiihfz');
assert.equal(binding.baselineMigrations,522);assert.equal(binding.targetMigrations,523);assert.equal(Object.keys(binding.history).length,522);
assert.deepEqual(Object.keys(binding.candidates),['20261124040000_catalog_bulk_alias_visibility_v1.sql']);
const sources={...binding.history,...binding.candidates};
const candidatePresent=fs.existsSync(root+'/supabase/migrations/'+Object.keys(binding.candidates)[0]);assert.ok(candidatePresent||phase==='AuditLinkedSchema');const present=candidatePresent?sources:binding.history;assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys(present).sort());for(const[file,hash]of Object.entries(present))assert.equal(sha(root+'/supabase/migrations/'+file),hash,file);
assert.equal(sha(prior+'/release-manifest-v20.json'),binding.predecessorReleaseManifestSha256);
assert.equal(read(prior+'/production-apply-v20.json').pass,true);assert.equal(read(prior+'/production-apply-intent-v20.json').consumed,true);
const after=read(prior+'/production-after-v20-r1/result.json');assert.equal(after.pass,true);assert.equal(after.schemaSecurityExact,true);assert.equal(Object.keys(after.protectedTables).length,120);
const failure=read(prior+'/production-reliability-v20-r1/result.json');assert.equal(sha(prior+'/production-reliability-v20-r1/result.json'),binding.runtimeFailureSha256);
assert.equal(failure.pass,false);assert.equal(failure.samples.length,3);assert.deepEqual(failure.samples.map(x=>x.pass),[false,false,true]);
let release;
if(phase==='PrePush'){
  const module=await import('file:///'+art+'/verify-release-operator-v21.mjs');release=module.verifyFrozenReleaseV21({liveLabs:true});
  assert.equal(release.manifest.sourceHead,git(['rev-parse','HEAD']));assert.equal(release.manifest.sourceTree,git(['rev-parse','HEAD^{tree}']));assert.equal(git(['status','--porcelain']),'');
  assert.deepEqual(release.manifest.history,binding.history);assert.deepEqual(release.manifest.candidates,binding.candidates);assert.equal(release.manifest.candidateBundleSha256,binding.candidateBundleSha256);
  assert.equal(git(['ls-remote','origin','refs/heads/main']).split(/\s+/)[0],release.manifest.actualRemoteMain);git(['merge-base','--is-ancestor',release.manifest.actualRemoteMain,'HEAD']);
}
const r=createRequire(root+'/package.json'),env=r('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local')),url=new URL(env.SUPABASE_DB_URL);
assert.equal(env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.equal(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
assert.ok(url.hostname==='db.ycdxbpibncqcchqiihfz.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes('ycdxbpibncqcchqiihfz'));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);fs.mkdirSync(out);
const c=new(r('pg').Client)({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on',application_name:'bog-discovery-release-v17-gate-readonly'});
const report={version:'BEST_OF_GAME_DISCOVERY_RELEASE_V17',phase,pass:false,productionWrites:0,apiAcceptanceClaimed:false,additionalExactSqlApprovalRequiredBeforeApply:true,startedAt:new Date().toISOString()};
const save=(name,value)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(value))),{flag:'wx'});c.on('error',error=>{report.connectionError=error.message;});
try{
  await c.connect();report.sanity=(await c.query("select jsonb_build_object('cards',(select count(*)from public.card_prints),'sets',(select count(*)from public.sets),'traits',(select count(*)from public.card_print_traits),'familyParents',(select count(*)from public.card_prints where set_code in('bog','bp')),'familyPrintings',(select count(*)from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code in('bog','bp')),'existingAliases',(select count(*)from public.card_print_identity_aliases))value")).rows[0].value;
  assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'Environment mismatch — fix before proceeding.');assert.equal(report.sanity.familyParents,22);assert.equal(report.sanity.familyPrintings,18);assert.equal(report.sanity.existingAliases,768);
  const snapshots={};for(const [name,file] of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);snapshots[name]=(await c.query(sql)).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;save(name,snapshots[name]);}
  assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
  const expected=read(prior+'/production-after-v20-r1/catalog.private.json.gz'),security=read(prior+'/production-after-v20-r1/security.private.json.gz');assert.deepEqual(snapshots.security,security);
  const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const name of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+name+'/package.json').version,'0.6.1');
  const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
  async function model(snapshot,schema){const map=new Map(queries.map(([key,query])=>[query,snapshot[key]])),result=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async query=>{assert.ok(map.has(query.sql));return map.get(query.sql);}});result.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])result[key]=Object.fromEntries(Object.entries(result[key]).filter(([,value])=>value.schema===schema));return result;}
  for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const x=await model(expected,schema),y=await model(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(x,y);const diff=await Migration.create(x,y,{schema});diff.set_safety(false);diff.add_all_changes(true);assert.equal(diff.sql.trim(),'','Production522 baseline drift in '+schema);}
  for(const helper of binding.changedHelpers){const actual=(await c.query('select md5(prosrc)body_md5 from pg_proc where oid=$1::regprocedure',[helper.signature])).rows[0];assert.equal(actual.body_md5,helper.oldBodyMd5);}
  if(release){report.actualRemoteMain=release.manifest.actualRemoteMain;report.sourceHead=release.manifest.sourceHead;report.releaseManifestSha256=release.manifestSha256;report.normalManagedChecksPassed=true;report.frozenPacketAndLiveLabsExact=true;}
  Object.assign(report,{pass:true,migrationsBefore:522,migrationsAfter:523,remainingSqlBytes:0,fourSchemasExact:true,securityExact:true,original120ScopeAnchorReplaced:false,productionReliabilityFailureRetained:true});
}catch(error){report.error=error.message;process.exitCode=1;}
finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();report.runnerSha256=sha(new URL(import.meta.url));fs.writeFileSync(out+'/release-qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
