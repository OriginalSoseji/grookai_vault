import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
import {marketPipelineDatabaseConfigV1} from 'file:///C:/grookai_market_reconcile_20261120/backend/pricing/market_pipeline_database_config_v1.mjs';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=new URL('../../',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,'').replace(/\/$/,''),base='C:/grookai_vault_operator_artifacts/pricing_visibility_schema_20261123';
const out=process.argv[2];assert.equal(process.argv.length,3);assert.match(out??'',new RegExp('^'+base+'/baseline-gate-[a-z0-9-]{1,60}$'));assert.equal(fs.existsSync(out),false);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex');
const require=createRequire(root+'/package.json'),kit=createRequire('C:/gv_intake_recovery_20261027/package.json');
const env=require('dotenv').parse(fs.readFileSync('C:/grookai_vault/.env.local'));
assert.equal(env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');
console.log('REMOTE READ ONLY: '+env.SUPABASE_URL+'; LOCAL diagnostic lab price-retain-520-20261123');
const binding=read(root+'/scripts/schema/market_price_retention_baseline_v1.json');
assert.equal(binding.version,'MARKET_PRICE_RETENTION_BASELINE_V1');assert.equal(binding.project,'ycdxbpibncqcchqiihfz');assert.equal(binding.migrations,520);
const bound={'replay-proof.json':'replayProofSha256','freeze.json':'freezeSha256','synthetic-prerequisite.sql':'prerequisiteSha256','synthetic-best-of-game-prerequisite.sql':'catalogPrerequisiteSha256','reset-prefix-result.json':'resetProofSha256','reset-prefix.log':'resetLogSha256','complete-history-with-catalog-prerequisite.log':'completeLogSha256','noop-history-with-catalog-prerequisite.log':'noopLogSha256'};
for(const[file,key]of Object.entries(bound))assert.equal(sha(fs.readFileSync(base+'/fresh-520/'+file)),binding[key],file);
assert.equal(sha(fs.readFileSync(base+'/baseline-audit-v1/result.json')),binding.firstAuditSha256);
assert.equal(read(base+'/baseline-audit-v1/result.json').pass,true);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(x=>/^\d+.*\.sql$/.test(x)).sort(),Object.keys(binding.history).sort());
const proof=read(base+'/fresh-520/replay-proof.json'),freeze=read(base+'/fresh-520/freeze.json');
assert.deepEqual(freeze.sources,binding.history);
assert.equal(proof.pass,true);assert.equal(proof.cliPrefixResetSucceeded,true);assert.equal(proof.migrations,520);
for(const [name,hash]of Object.entries(freeze.sources))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+name)),hash,name);
const database=JSON.parse(execFileSync('docker',['inspect','supabase_db_price-retain-520-20261123'],{encoding:'utf8'}))[0];
assert.equal(database.State.Running,true);assert.deepEqual(Object.keys(database.NetworkSettings.Networks),['price-retain-520-20261123']);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect','price-retain-520-20261123'],{encoding:'utf8'}))[0].Internal,true);
const retainedState=JSON.parse(execFileSync('docker',['exec','-i','supabase_db_price-retain-520-20261123','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:"begin read only;select jsonb_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'cards',(select count(*) from public.card_prints),'workers',current_setting('max_worker_processes'));rollback;",encoding:'utf8'}).trim());
assert.deepEqual(retainedState,{users:0,copies:0,cards:1316,workers:'0'});
fs.mkdirSync(out);
const client=new(require('pg').Client)({...marketPipelineDatabaseConfigV1(env.SUPABASE_DB_URL,{SUPABASE_DB_CA_CERT:fs.readFileSync('C:/Users/ccabr/Downloads/prod-ca-2021.crt','utf8')},{readOnly:true,applicationName:'market_retention_baseline_readonly'}),statement_timeout:60000});
const report={startedAt:new Date().toISOString(),pass:false,productionWrites:0,sourceHistoryHashes:freeze.sources,diagnosticReplayProofSha256:sha(fs.readFileSync(base+'/fresh-520/replay-proof.json')),schemaDiffs:{}};
const save=(name,data)=>fs.writeFileSync(out+'/'+name+'.json.gz',gzipSync(Buffer.from(JSON.stringify(data))),{flag:'wx'});
try{
 await client.connect();assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 report.sanity=(await client.query('select (select count(*) from public.card_prints)::int cards,(select count(*) from public.sets)::int sets,(select count(*) from public.card_print_traits)::int traits')).rows[0];
 assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000);
 const snapshots={};for(const [name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){
  const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);
  const result=await client.query(sql);const remote=result.find(x=>x.rows?.[0]?.receipt).rows[0].receipt;
  const raw=execFileSync('docker',['exec','-i','supabase_db_price-retain-520-20261123','psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8',maxBuffer:64000000,timeout:90000}).trim();
  const local=JSON.parse(raw);snapshots[name]={remote,local};save(name+'-remote',remote);save(name+'-local',local);
 }
 assert.deepEqual(snapshots.catalog.remote.LEDGER.map(x=>x.version),Object.keys(freeze.sources).sort().map(x=>x.match(/^\d+/)[0]));
 assert.deepEqual(snapshots.catalog.local.LEDGER.map(x=>x.version),snapshots.catalog.remote.LEDGER.map(x=>x.version));
 const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra');
 const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY'));
 async function model(s,schema){const map=new Map(queries.map(([k,q])=>[q,s[k]]));const m=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>{assert.ok(map.has(q.sql));return map.get(q.sql);}});m.one_schema(schema);for(const k of ['types','domains','materialized_views','composite_types'])m[k]=Object.fromEntries(Object.entries(m[k]).filter(([,v])=>v.schema===schema));return m;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
  const a=await model(snapshots.catalog.local,schema),b=await model(snapshots.catalog.remote,schema);
  if(schema==='public')report.columnOrderReconciliation=reconcileKnownTableColumnOrderV1(a,b);
  const diff=await Migration.create(a,b,{schema});diff.set_safety(false);diff.add_all_changes(true);
  fs.writeFileSync(out+'/'+schema+'-diagnostic-only.sql',diff.sql,{flag:'wx'});report.schemaDiffs[schema]={bytes:Buffer.byteLength(diff.sql),sha256:sha(diff.sql)};
  assert.equal(diff.sql.trim(),'','baseline_schema_drift:'+schema);
 }
 assert.deepEqual(snapshots.security.local,snapshots.security.remote,'security_drift');
 report.securityExact=true;report.ledger=520;report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await client.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({...report,sourceHistoryHashes:undefined,columnOrderReconciliation:undefined}));}
