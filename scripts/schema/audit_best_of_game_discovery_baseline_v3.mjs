// Read-only canonical513 schema qualification. This does not close V2 API/data failures.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {gzipSync,gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120';
const prior='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120';
const [phase,arg,...extra]=process.argv.slice(2);
assert.equal(phase,'AuditLinkedSchema');assert.equal(extra.length,0);
assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');
assert.ok(out.startsWith(art+'/baseline-v3-'));
assert.match(out.slice(art.length+1),/^baseline-v3-[a-z0-9-]{1,40}$/);
assert.equal(fs.existsSync(out),false);
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse((f.endsWith('.gz')?gunzipSync(fs.readFileSync(f)):fs.readFileSync(f)).toString('utf8').replace(/^\uFEFF/,''));
const binding=read(root+'/scripts/schema/best_of_game_discovery_baseline_binding_v3.json');
assert.equal(binding.version,'BEST_OF_GAME_DISCOVERY_BASELINE_V3');
assert.equal(binding.project,'ycdxbpibncqcchqiihfz');
assert.equal(binding.baselineMigrations,513);
assert.equal(Object.keys(binding.history).length,513);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>f.endsWith('.sql')).sort(),Object.keys(binding.history).sort());
for(const [f,h]of Object.entries(binding.history))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
for(const [f,h]of Object.entries(binding.priorProofs))assert.equal(sha(fs.readFileSync(prior+'/'+f)),h);
assert.equal(read(prior+'/local-qualification-v2-r2/qualification.json').pass,true);
assert.equal(read(prior+'/production-apply-v3.json').pass,true);
assert.equal(read(prior+'/production-after-v3-r1/result.json').pass,false);
const r=createRequire(root+'/package.json');
const env=r('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local'));
const url=new URL(env.SUPABASE_DB_URL);
assert.equal(env.SUPABASE_URL,'https://'+binding.project+'.supabase.co');
assert.equal(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/supabase/.temp/project-ref','utf8').trim(),binding.project);
assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.ok(url.hostname==='db.'+binding.project+'.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes(binding.project));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);
const c=new(r('pg').Client)({connectionString:url.toString(),connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on',application_name:'best-of-game-513-baseline-readonly',ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')}});
const report={version:binding.version,phase,pass:false,schemaQualificationOnly:true,apiAcceptancePassed:false,releaseComplete:false,unresolvedPriorDataDrift:['grookai_square.targets','grookai_square.copy_changes'],productionWrites:0,startedAt:new Date().toISOString(),project:binding.project};
fs.mkdirSync(out);
const save=(name,v)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
try{
 await c.connect();await c.query('begin isolation level repeatable read read only');await c.query("set local statement_timeout='30s'");
 report.sanity=(await c.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'sets',(select count(*) from public.sets),'traits',(select count(*) from public.card_print_traits),'vaultProjection',(select count(*) from public.v_vault_items)) value")).rows[0].value;
 assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000);await c.query('rollback');
 const snapshots={};
 for(const [name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);
  snapshots[name]=(await c.query(sql)).find(x=>x.rows?.[0]?.receipt)?.rows[0].receipt;
  assert.ok(snapshots[name]);save(name,snapshots[name]);
 }
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(x=>x.match(/^\d+/)[0]));
 const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');
 for(const name of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+name+'/package.json').version,'0.6.1');
 const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra');
 const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function model(snapshot,schema){
  const map=new Map(queries.map(([key,q])=>[q,snapshot[key]]));
  const m=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.ok(map.has(q.sql));return map.get(q.sql);}});
  m.one_schema(schema);
  for(const key of ['types','domains','materialized_views','composite_types'])m[key]=Object.fromEntries(Object.entries(m[key]).filter(([,v])=>v.schema===schema));
  return m;
 }
 report.comparisons=[];
 for(const profile of ['fresh','retained']){
  const local=read(prior+'/local-qualification-v2-r2/'+profile+'-catalog.private.json.gz');
  assert.deepEqual(snapshots.security,read(prior+'/local-qualification-v2-r2/'+profile+'-security.private.json.gz'));
  for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
   const a=await model(local,schema),b=await model(snapshots.catalog,schema);
   if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);
   const diff=await Migration.create(a,b,{schema});diff.set_safety(false);diff.add_all_changes(true);
   fs.writeFileSync(out+'/'+profile+'-'+schema+'-NEVER-EXECUTE.sql',diff.sql,{flag:'wx'});
   assert.equal(diff.sql.trim(),'','Canonical513 schema differs from '+profile+':'+schema);
   report.comparisons.push({profile,schema,remainingSqlBytes:0});
  }
 }
 await c.query('begin isolation level repeatable read read only');await c.query("set local statement_timeout='30s'");
 const shape=(await c.query("select jsonb_build_object('parents',(select count(*) from public.card_prints where set_code in('bog','bp')),'children',(select count(*) from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code in('bog','bp')),'aliases',(select count(*) from public.card_print_identity_aliases),'bogExclusions',cardinality(public.get_best_of_game_discovery_exclusions_v1()),'winnerChildren',(select count(*) from public.card_printings c join public.card_prints p on p.id=c.card_print_id where p.set_code='bog' and p.variant_key='winner_stamp'),'copies',(select count(*) from public.vault_item_instances v join public.card_prints p on p.id=v.card_print_id where p.set_code in('bog','bp'))) value")).rows[0].value;
 assert.deepEqual(shape,{parents:22,children:18,aliases:768,bogExclusions:9,winnerChildren:0,copies:1});report.family=shape;
 await c.query('rollback');
 Object.assign(report,{pass:true,migrations:513,allAppliedSourceBytesExact:true,securityExact:true,allFourSchemasExact:true});
}catch(error){report.error=error.message;process.exitCode=1;}
finally{await c.query('rollback').catch(()=>{});await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
