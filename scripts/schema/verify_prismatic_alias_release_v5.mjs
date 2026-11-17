// Fixed canonical read-only baseline and exact-source release gate for the forward query guard.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {reconcileKnownTableColumnOrderV1} from 'file:///C:/grookai_prismatic_alias_20261116/scripts/schema/column_order_reconciliation_v1.mjs';
const root='C:/grookai_prismatic_alias_20261116';
const artifacts='C:/grookai_vault_operator_artifacts/prismatic_alias_discovery_20261116';
const payload=artifacts+'/candidate-v5-r2';
const [phase,arg,...extra]=process.argv.slice(2);
assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.match(out,new RegExp('^'+artifacts+'/release-gate-v5-[a-z0-9-]{1,60}$'));assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const binding=read(payload+'/scripts/schema/prismatic_alias_candidate_v5.json');
assert.equal(binding.version,'PRISMATIC_ALIAS_DISCOVERY_CANDIDATE_V5');const ancestor=read(artifacts+'/release-manifest-v4-r3.json');assert.deepEqual(binding.history,{...ancestor.history,...ancestor.candidates});assert.equal(Object.keys(binding.history).length,498);assert.deepEqual(Object.keys(binding.candidates),['20261117220000_prismatic_identity_query_guard_v5.sql']);
for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(payload+'/supabase/migrations/'+file)),pin);
for(const[file,pin]of Object.entries(binding.archivedDrafts))assert.equal(sha(gunzipSync(fs.readFileSync(root+'/'+file))),pin);
const require=createRequire(root+'/package.json'),settings=require('dotenv').parse(fs.readFileSync(root+'/.env.local')),url=new URL(settings.SUPABASE_DB_URL),project='ycdxbpibncqcchqiihfz';
assert.equal(settings.SUPABASE_URL,'https://'+project+'.supabase.co');assert.ok(url.hostname==='db.'+project+'.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes(project));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const client=new(require('pg').Client)({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')},connectionTimeoutMillis:15000});
const report={version:'PRISMATIC_ALIAS_RELEASE_V5',phase,pass:false,productionWrites:0,startedAt:new Date().toISOString()};
try{
 await client.connect();
 const snapshots={};
 for(const[name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);const result=await client.query(sql);snapshots[name]=result.find(x=>x.rows?.[0]?.receipt)?.rows[0].receipt;assert.ok(snapshots[name]);fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(snapshots[name]))),{flag:'wx'});
 }
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
 const previousCatalog=read(artifacts+'/local-qualification-v4-r3/fresh-catalog.private.json.gz'),previousSecurity=read(artifacts+'/local-qualification-v4-r3/fresh-security.private.json.gz');
 assert.deepEqual(snapshots.security,previousSecurity);
 const pgkit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of ['schemainspect','migra','client'])assert.equal(pgkit('@pgkit/'+n+'/package.json').version,'0.6.1');
 const {PostgreSQL}=pgkit('@pgkit/schemainspect'),{Migration}=pgkit('@pgkit/migra');
 const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function inspect(s,schema){const m=new Map(queries.map(([k,q])=>[q,s[k]]));const x=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>m.get(q.sql)});x.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])x[key]=Object.fromEntries(Object.entries(x[key]).filter(([,v])=>v.schema===schema));return x;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const a=await inspect(previousCatalog,schema),b=await inspect(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);const d=await Migration.create(a,b,{schema});d.set_safety(false);d.add_all_changes(true);assert.equal(d.sql.trim(),'','Production baseline drift in '+schema);}
 await client.query('begin read only');const sanity=(await client.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits),'aliases',cardinality(public.get_prismatic_discovery_exclusions_v1())) result")).rows[0].result;await client.query('rollback');assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000);assert.equal(sanity.aliases,180);report.sanity=sanity;
 if(phase==='PrePush'){
  const manifest=read(artifacts+'/release-manifest-v5.json');assert.equal(manifest.version,'PRISMATIC_ALIAS_498_TO_499_V5');assert.equal(manifest.revision,binding.revision);assert.equal(git(['status','--porcelain']),'');assert.equal(manifest.sourceHead,git(['rev-parse','HEAD']));assert.equal(manifest.sourceTree,git(['rev-parse','HEAD^{tree}']));assert.deepEqual(manifest.candidates,binding.candidates);
  assert.deepEqual(read(root+'/scripts/schema/prismatic_alias_candidate_v5.json'),binding);
  for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
  for(const[file,pin]of Object.entries(manifest.sourcePins))assert.equal(sha(fs.readFileSync(root+'/'+file)),pin);
  for(const[file,pin]of Object.entries(manifest.proofPins)){assert.equal(sha(fs.readFileSync(artifacts+'/'+file)),pin);const proof=read(artifacts+'/'+file);assert.ok(proof.pass===true||proof.status==='passed');}
  const commit=read(artifacts+'/'+manifest.normalCommitResult);assert.equal(commit.exitCode,0);assert.equal(commit.head,manifest.sourceHead);assert.equal(commit.sourceTree,manifest.sourceTree);assert.equal(commit.hooksUnchanged,true);
  const qualification=read(artifacts+'/local-qualification-v5-r2/qualification.json');assert.equal(qualification.status,'passed');assert.deepEqual(qualification.changedFunctions,['search_print_identity_v1']);assert.deepEqual(qualification.newHelpers,[]);assert.deepEqual(qualification.changedViews,[]);assert.equal(qualification.existingSecurityUnchanged,true);assert.equal(qualification.privateSchemaUnchanged,true);
  for(const lab of manifest.labs){assert.equal(fs.existsSync(lab.path+'/supabase/.temp/project-ref'),false);for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(lab.path+'/supabase/migrations/'+file)),pin);const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+lab.project],{encoding:'utf8'}))[0];assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[lab.project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',lab.project],{encoding:'utf8'}))[0].Internal,true);
   const query=sql=>JSON.parse(execFileSync('docker',['exec','-i','supabase_db_'+lab.project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',timeout:180000,maxBuffer:64000000}));
   assert.deepEqual(query('begin read only;select json_agg(version order by version) from supabase_migrations.schema_migrations;rollback;'),Object.keys({...binding.history,...binding.candidates}).sort().map(x=>x.match(/^\d+/)[0]));assert.equal(sha(JSON.stringify(query(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8')))),lab.securitySha256);assert.equal(sha(JSON.stringify(query('begin read only;select prismatic_fixture.fingerprints();rollback;'))),lab.protectedStateSha256);
  }
  report.sourceHead=manifest.sourceHead;report.normalManagedCommitPassed=true;report.replayAndRuntimeProofsExact=true;
 }
 report.pass=true;report.migrationsBefore=498;report.migrationsAfter=499;report.securityExact=true;report.remainingSqlBytes=0;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/release-qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
