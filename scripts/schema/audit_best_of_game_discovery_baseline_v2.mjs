// Read-only512 audit. No migration replay, SQL execution from diffs, or write mode.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const base='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120';
const prior='C:/grookai_vault_operator_artifacts/cross_tcg_market_pricing_20261119';
const [phase,arg,...extra]=process.argv.slice(2);assert.equal(phase,'AuditLinkedSchema');assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.ok(out.startsWith(base+'/baseline-v2-'));assert.match(out.slice(base.length+1),/^baseline-v2-[a-z0-9-]{1,40}$/);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const binding=read(root+'/scripts/schema/best_of_game_discovery_baseline_binding_v2.json');assert.equal(binding.version,'BEST_OF_GAME_DISCOVERY_BASELINE_V2');assert.equal(binding.baselineMigrations,512);assert.equal(binding.project,'ycdxbpibncqcchqiihfz');
assert.equal(sha(fs.readFileSync(prior+'/release-manifest-v2.json')),binding.pricingReleaseManifestSha256);assert.equal(sha(fs.readFileSync(prior+'/production-readback-v2-01/readback.json')),binding.pricingReadbackSha256);const ancestor=read(prior+'/release-manifest-v2.json'),closure=read(prior+'/production-readback-v2-01/readback.json');assert.equal(closure.pass,true);assert.equal(closure.migrations,512);assert.equal(closure.allFourSchemasExact,true);assert.equal(closure.securityExact,true);assert.deepEqual(binding.history,{...ancestor.history,...ancestor.candidates});assert.equal(Object.keys(binding.history).length,512);assert.deepEqual(Object.keys(binding.candidates),['20261120081500_best_of_game_discovery_v1.sql']);for(const[f,h]of Object.entries(binding.candidates))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);assert.equal(sha(fs.readFileSync(prior+'/production-readback-v2-01/catalog.private.json.gz')),binding.pricingCatalogSha256);assert.equal(sha(fs.readFileSync(prior+'/production-readback-v2-01/security.private.json.gz')),binding.pricingSecuritySha256);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys({...binding.history,...binding.candidates}).sort());
for(const [file,pin]of Object.entries(binding.history))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const r=createRequire(root+'/package.json'),env=r('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local')),url=new URL(env.SUPABASE_DB_URL),project=binding.project;
assert.equal(env.SUPABASE_URL,'https://'+project+'.supabase.co');assert.equal(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/supabase/.temp/project-ref','utf8').trim(),project);assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.ok(url.hostname==='db.'+project+'.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes(project));for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const c=new(r('pg').Client)({connectionString:url.toString(),connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on',application_name:'best-of-game-discovery-baseline-read-only',ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')}});
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
 const priorCatalog=read(prior+'/production-readback-v2-01/catalog.private.json.gz'),priorSecurity=read(prior+'/production-readback-v2-01/security.private.json.gz');assert.deepEqual(snapshots.security,priorSecurity);
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

 const printingRoot='C:/grookai_vault_operator_artifacts/best_of_game_repair_20261118';
 assert.equal(sha(fs.readFileSync(printingRoot+'/production-package-v1/PRODUCTION_PRINTING_CLOSURE_V1.json')),binding.printingClosureSha256);
 const printing=read(printingRoot+'/production-package-v1/PRODUCTION_PRINTING_CLOSURE_V1.json');
 assert.equal(printing.pass,true);assert.equal(printing.committed,true);assert.equal(printing.nineDiscoveryAliasesApplied,false);
 assert.equal(sha(fs.readFileSync(printingRoot+'/baseline-v1-after-production-20261120/qualification.json')),binding.postPrintingQualificationSha256);
 assert.equal(read(printingRoot+'/baseline-v1-after-production-20261120/qualification.json').pass,true);
 await c.query('begin isolation level repeatable read read only');await c.query("set local statement_timeout='30s'");
 const family={};
 family.sets=(await c.query("select * from public.sets where code in('bog','bp') order by code")).rows;
 family.parents=(await c.query("select * from public.card_prints where set_code in('bog','bp') order by gv_id")).rows;
 family.children=(await c.query("select c.* from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code in('bog','bp') order by c.printing_gv_id")).rows;
 report.existingAliases=(await c.query('select count(*)::int n from public.card_print_identity_aliases')).rows[0].n;assert.equal(report.existingAliases,759);family.aliases=(await c.query("select * from public.card_print_identity_aliases where legacy_set_code in('bog','bp') or canonical_set_code in('bog','bp') order by id")).rows;
 family.identities=(await c.query("select i.* from public.card_print_identity i join public.card_prints p on p.id=i.card_print_id where p.set_code in('bog','bp') order by i.id")).rows;
 family.mappings=(await c.query("select m.* from public.external_mappings m join public.card_prints p on p.id=m.card_print_id where p.set_code in('bog','bp') order by m.id")).rows;
 family.copies=(await c.query("select v.* from public.vault_item_instances v join public.card_prints p on p.id=v.card_print_id where p.set_code in('bog','bp') order by v.id")).rows;
 assert.equal(family.sets.length,2);assert.equal(family.parents.length,22);assert.equal(family.children.length,18);assert.equal(family.aliases.length,0);assert.equal(family.copies.length,1);
 assert.equal(family.parents.filter(p=>p.variant_key==='winner_stamp'&&p.printed_identity_modifier==='winner_stamp').length,4);
 assert.equal(family.children.filter(p=>p.printing_gv_id.startsWith('GV-PK-BP-')).length,9);
 assert.equal(family.children.filter(p=>p.printing_gv_id.startsWith('GV-PK-BOG-')).length,9);
 assert.equal(family.children.filter(p=>p.finish_key==='reverse').length,10);
 assert.equal(family.children.filter(p=>p.finish_key==='normal').length,8);
 const saved=Buffer.from(JSON.stringify(family));fs.writeFileSync(out+'/family.private.json.gz',gzipSync(saved),{flag:'wx'});
 report.family={parents:22,children:18,aliases:0,distinctWinnerParents:4,copies:1,snapshotSha256:sha(saved)};
 await c.query('rollback');
 report.pass=true;report.migrations=512;report.remainingSqlBytes=0;report.securityExact=true;report.allAppliedSourceBytesExact=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
