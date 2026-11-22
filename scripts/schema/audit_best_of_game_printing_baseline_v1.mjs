// Read-only511 audit. No migration replay, SQL execution from diffs, or write mode.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const base='C:/grookai_vault_operator_artifacts/best_of_game_repair_20261118';
const prior='C:/grookai_vault_operator_artifacts/shrouded_alias_discovery_20261118';
const [phase,arg,...extra]=process.argv.slice(2);assert.equal(phase,'AuditLinkedSchema');assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.ok(out.startsWith(base+'/baseline-v1-'));assert.match(out.slice(base.length+1),/^baseline-v1-[a-z0-9-]{1,40}$/);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const binding=read(root+'/scripts/schema/best_of_game_printing_baseline_binding_v1.json');assert.equal(binding.version,'BEST_OF_GAME_PRINTING_BASELINE_V1');assert.equal(binding.baselineMigrations,511);assert.equal(binding.project,'ycdxbpibncqcchqiihfz');
assert.equal(sha(fs.readFileSync(prior+'/release-manifest-v2.json')),binding.parentReleaseManifestSha256);assert.equal(sha(fs.readFileSync(prior+'/PRODUCTION_CLOSURE_V3.json')),binding.parentClosureSha256);
const ancestor=read(prior+'/release-manifest-v2.json'),closure=read(prior+'/PRODUCTION_CLOSURE_V3.json');assert.equal(closure.pass,true);assert.equal(closure.ledger,511);assert.deepEqual(binding.history,{...ancestor.history,...ancestor.candidates});assert.equal(Object.keys(binding.history).length,511);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys(binding.history).sort());
for(const [file,pin]of Object.entries(binding.history))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const r=createRequire(root+'/package.json'),env=r('dotenv').parse(fs.readFileSync(root+'/.env.local')),url=new URL(env.SUPABASE_DB_URL),project=binding.project;
assert.equal(env.SUPABASE_URL,'https://'+project+'.supabase.co');assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),project);assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.ok(url.hostname==='db.'+project+'.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes(project));for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const c=new(r('pg').Client)({connectionString:url.toString(),connectionTimeoutMillis:15000,application_name:'best-of-game-baseline-read-only',ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')}});
const report={version:binding.version,phase,pass:false,productionWrites:0,startedAt:new Date().toISOString(),project};
console.log(JSON.stringify({target:'REMOTE read-only',supabaseUrl:env.SUPABASE_URL,project}));
try {
 await c.connect();await c.query('begin read only');await c.query("set local statement_timeout='30s'");
 report.sanity=(await c.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits),'vaultProjection',(select count(*) from public.v_vault_items)) value")).rows[0].value;
 assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000);await c.query('rollback');
 const snapshots={};for(const [name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]) {
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);const results=await c.query(sql);snapshots[name]=results.find(x=>x.rows?.[0]?.receipt)?.rows[0].receipt;assert.ok(snapshots[name]);fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(snapshots[name]))),{flag:'wx'});
 }
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
 const priorCatalog=read(prior+'/local-qualification-v2-r2/fresh-catalog.private.json.gz'),priorSecurity=read(prior+'/local-qualification-v2-r2/fresh-security.private.json.gz');assert.deepEqual(snapshots.security,priorSecurity);
 const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const name of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+name+'/package.json').version,'0.6.1');
 const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function inspect(snapshot,schema) {
  const map=new Map(queries.map(([k,q])=>[q,snapshot[k]]));
  const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.ok(map.has(q.sql),'Unknown schema query');return map.get(q.sql);}});
  model.one_schema(schema);
  for(const key of ['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,v])=>v.schema===schema));
  return model;
 }
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']) {
  const a=await inspect(priorCatalog,schema),b=await inspect(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);const diff=await Migration.create(a,b,{schema});diff.set_safety(false);diff.add_all_changes(true);assert.equal(diff.sql.trim(),'','Baseline drift in '+schema);
 }
 report.pass=true;report.migrations=511;report.remainingSqlBytes=0;report.securityExact=true;report.allAppliedSourceBytesExact=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
