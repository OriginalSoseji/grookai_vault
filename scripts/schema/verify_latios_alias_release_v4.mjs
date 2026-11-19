// Fixed canonical read-only baseline and exact-source release gate for the forward query guard.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {reconcileKnownTableColumnOrderV1} from 'file:///C:/grookai_latios_alias_20261118/scripts/schema/column_order_reconciliation_v1.mjs';
const root='C:/grookai_latios_alias_20261118';
const artifacts='C:/grookai_vault_operator_artifacts/latios_alias_discovery_20261118';
const payload=root;
const [phase,arg,...extra]=process.argv.slice(2);
assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.match(out,new RegExp('^'+artifacts+'/release-gate-v4-[a-z0-9-]{1,60}$'));assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const binding=read(payload+'/scripts/schema/latios_alias_candidate_v4.json');
assert.equal(binding.version,'LATIOS_ALIAS_DISCOVERY_CANDIDATE_V4');const ancestor=read(root+'/scripts/schema/latios_alias_baseline_binding_v4.json');assert.deepEqual(binding.history,ancestor.history);assert.equal(Object.keys(binding.history).length,507);assert.deepEqual(Object.keys(binding.candidates),['20261118160000_identity_search_probe_v1.sql']);
for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(payload+'/supabase/migrations/'+file)),pin);
assert.equal(binding.revision,1);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys({...binding.history,...binding.candidates}).sort());
assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');

const require=createRequire(root+'/package.json'),settings=require('dotenv').parse(fs.readFileSync(root+'/.env.local')),url=new URL(settings.SUPABASE_DB_URL),project='ycdxbpibncqcchqiihfz';
assert.equal(settings.SUPABASE_URL,'https://'+project+'.supabase.co');assert.ok(url.hostname==='db.'+project+'.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes(project));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const client=new(require('pg').Client)({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')},connectionTimeoutMillis:15000});
const report={version:'LATIOS_ALIAS_RELEASE_V4',phase,pass:false,productionWrites:0,startedAt:new Date().toISOString()};
try{
 await client.connect();
 const snapshots={};
 for(const[name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);const result=await client.query(sql);snapshots[name]=result.find(x=>x.rows?.[0]?.receipt)?.rows[0].receipt;assert.ok(snapshots[name]);fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(snapshots[name]))),{flag:'wx'});
 }
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
 const previousCatalog=read(artifacts+'/baseline-v4-01/catalog.private.json.gz'),previousSecurity=read(artifacts+'/baseline-v4-01/security.private.json.gz');
 assert.deepEqual(snapshots.security,previousSecurity);
 const pgkit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of ['schemainspect','migra','client'])assert.equal(pgkit('@pgkit/'+n+'/package.json').version,'0.6.1');
 const {PostgreSQL}=pgkit('@pgkit/schemainspect'),{Migration}=pgkit('@pgkit/migra');
 const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function inspect(s,schema){const m=new Map(queries.map(([k,q])=>[q,s[k]]));const x=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>m.get(q.sql)});x.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])x[key]=Object.fromEntries(Object.entries(x[key]).filter(([,v])=>v.schema===schema));return x;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const a=await inspect(previousCatalog,schema),b=await inspect(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);const d=await Migration.create(a,b,{schema});d.set_safety(false);d.add_all_changes(true);assert.equal(d.sql.trim(),'','Production baseline drift in '+schema);}
 await client.query('begin read only');const sanity=(await client.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits),'aliases',(select count(*) from public.card_print_identity_aliases where legacy_set_code='tk-ex-latio' and canonical_set_code='tk1b' and active and authority_status='approved')) result")).rows[0].result;await client.query('rollback');assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000);assert.equal(sanity.aliases,10);report.sanity=sanity;
 if(phase==='PrePush'){
  const manifest=read(artifacts+'/release-manifest-v4.json');assert.equal(manifest.version,'LATIOS_ALIAS_507_TO_508_V4');assert.deepEqual(manifest.history,binding.history);assert.equal(git(['status','--porcelain']),'');assert.equal(manifest.sourceHead,git(['rev-parse','HEAD']));assert.equal(manifest.sourceTree,git(['rev-parse','HEAD^{tree}']));assert.deepEqual(manifest.candidates,binding.candidates);
  assert.deepEqual(read(root+'/scripts/schema/latios_alias_candidate_v4.json'),binding);
  for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
  for(const[file,pin]of Object.entries(manifest.sourcePins))assert.equal(sha(fs.readFileSync(root+'/'+file)),pin);
  for(const[file,pin]of Object.entries(manifest.proofPins)){assert.equal(sha(fs.readFileSync(artifacts+'/'+file)),pin);const proof=read(artifacts+'/'+file);assert.ok(proof.pass===true||proof.status==='passed');}
  const commit=read(artifacts+'/'+manifest.normalCommitResult);assert.equal(commit.exitCode,0);assert.equal(commit.head,manifest.sourceHead);assert.equal(commit.sourceTree,manifest.sourceTree);assert.equal(commit.hooksUnchanged,true);
  const push=read(artifacts+'/'+manifest.normalPushResult);assert.equal(push.exitCode,0);assert.equal(push.head,manifest.sourceHead);assert.equal(push.sourceTree,manifest.sourceTree);assert.equal(push.hooksUnchanged,true);
  const packet=read(artifacts+'/production-package-v4/packet.json');assert.equal(sha(fs.readFileSync(artifacts+'/production-package-v4/packet.json')),manifest.packetSha256);assert.deepEqual(packet.sources,{...binding.history,...binding.candidates});assert.equal(packet.sourceTree,manifest.sourceTree);assert.equal(sha(fs.readFileSync(packet.work+'/supabase/config.toml')),packet.configSha256);assert.equal(fs.readFileSync(packet.work+'/supabase/.temp/project-ref','utf8').trim(),project);assert.deepEqual(fs.readdirSync(packet.work+'/supabase/migrations').sort(),Object.keys(packet.sources).sort());for(const[file,pin]of Object.entries(packet.sources))assert.equal(sha(fs.readFileSync(packet.work+'/supabase/migrations/'+file)),pin);
  const qualification=read(artifacts+'/local-qualification-v4/qualification.json');assert.equal(qualification.status,'passed');assert.deepEqual([...qualification.changedFunctions].sort(),['search_print_identity_v1']);assert.deepEqual(qualification.newHelpers,[]);assert.deepEqual([...qualification.changedViews].sort(),[]);assert.equal(qualification.existingSecurityUnchanged,true);assert.equal(qualification.privateSchemaUnchanged,true);
  for(const lab of manifest.labs){assert.equal(fs.existsSync(lab.path+'/supabase/.temp/project-ref'),false);for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(lab.path+'/supabase/migrations/'+file)),pin);const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+lab.project],{encoding:'utf8'}))[0];assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[lab.project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',lab.project],{encoding:'utf8'}))[0].Internal,true);
   const query=sql=>JSON.parse(execFileSync('docker',['exec','-i','supabase_db_'+lab.project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:180000,maxBuffer:64000000}));
   assert.deepEqual(query('begin read only;select json_agg(version order by version) from supabase_migrations.schema_migrations;rollback;'),Object.keys({...binding.history,...binding.candidates}).sort().map(x=>x.match(/^\d+/)[0]));assert.equal(sha(JSON.stringify(query(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8')))),lab.securitySha256);assert.equal(sha(JSON.stringify(query('begin read only;select prismatic_fixture.fingerprints();rollback;'))),lab.protectedStateSha256);
  }
  report.sourceHead=manifest.sourceHead;report.normalManagedCommitPassed=true;report.replayAndRuntimeProofsExact=true;
 }
 report.pass=true;report.migrationsBefore=507;report.migrationsAfter=508;report.securityExact=true;report.remainingSqlBytes=0;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/release-qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
