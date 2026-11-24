// Read-only current canonical522 baseline. This cannot authorize an apply or
// accept/retry the separately failed catalog reliability samples.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {gzipSync,gunzipSync} from 'node:zlib';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/scheduled-batches-v1';
const canonical='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123';
const [phase,arg,...extra]=process.argv.slice(2);assert.equal(phase,'AuditLinkedSchema');assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.ok(out.startsWith(art+'/starting-gate-'));assert.match(out.slice((art+'/starting-gate-').length),/^v[1-9][0-9]*$/);assert.equal(fs.existsSync(out),false);
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const sha=x=>createHash('sha256').update(x).digest('hex'),pin=p=>sha(fs.readFileSync(p));
const binding=read(root+'/scripts/schema/square_price_batch_candidate_v2.json');assert.equal(binding.project,'ycdxbpibncqcchqiihfz');assert.equal(binding.baselineMigrations,522);assert.equal(binding.targetMigrations,528);
const candidates={
 '20261124001000_square_recovery_target_window_release_v1.sql':'c60f33c0637a0b95e01d0a8c0356a616f8a2082035d8887bd72ec6f3571c27a2',
 '20261124002000_square_recovery_target_lanes_release_v2.sql':'117356aca4172d110d71f50add63e5d7e38c5d81aafa7b663cf7b5560235b64b',
 '20261124003000_square_durable_recovery_scheduler_release_v1.sql':'69c2a0e866d2b9d862f2e34f572f132c922b430540e3f91f38995006fb0e66c2',
 '20261124004000_square_price_batch_authority_v1.sql':'8f7e9f472177edacee5145bc27eac183beb42cf593f9e945386c197bd36e2a1e',
 '20261124005000_square_price_batch_attempt_receipts_v1.sql':'23a3662d6853044008b24f381a8753f09bb2eea00c94bf514b1bbf9a6df1efcc',
 '20261124006000_square_price_batch_pause_recovery_v1.sql':'34f52613cad54f3e6760cfc84aeef41df4cfe808e9e1400565fa64659105131e'};
assert.deepEqual(binding.candidates,candidates);assert.equal(Object.keys(binding.history).length,522);
const sources={...binding.history,...candidates};assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys(sources).sort());
for(const[file,hash]of Object.entries(sources))assert.equal(pin(root+'/supabase/migrations/'+file),hash,file);
assert.equal(pin(canonical+'/production-apply-v20.json'),'bd5df855ee0aeec9585b7a11376bf2aca64663b68492a17de98041a34bab742a');assert.equal(read(canonical+'/production-apply-v20.json').pass,true);
assert.equal(pin(canonical+'/production-after-v20-r1/result.json'),'128b9e9f15db55066a8d51a2966ebc1e6306a2f4e9d670f39be19bcc737ae714');assert.equal(read(canonical+'/production-after-v20-r1/result.json').pass,true);
assert.equal(pin(canonical+'/production-reliability-v20-r1/result.json'),'5f0d7b61e3bf0068753ed50070e46144ba7780f74379f3db9eeace26eb6dd138');assert.equal(read(canonical+'/production-reliability-v20-r1/result.json').pass,false);
const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+n+'/package.json').version,'0.6.1');
const r=createRequire(root+'/package.json'),env=r('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local')),url=new URL(env.SUPABASE_DB_URL);
assert.equal(env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.ok(url.hostname==='db.ycdxbpibncqcchqiihfz.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes('ycdxbpibncqcchqiihfz'));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);fs.mkdirSync(out,{recursive:true});
const c=new(r('pg').Client)({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on',application_name:'square-price-batch-baseline-v2-readonly'});
const report={version:'SQUARE_PRICE_BATCH_BASELINE_V2',phase,pass:false,productionWrites:0,productionApiAcceptanceCalls:0,productionApplyAuthority:false,startingAt:new Date().toISOString()};
const save=(name,x)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(x))),{flag:'wx'});
try{
 await c.connect();assert.equal((await c.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 report.sanity=(await c.query('select jsonb_build_object(\'cards\',(select count(*)from public.card_prints),\'sets\',(select count(*)from public.sets),\'traits\',(select count(*)from public.card_print_traits)) value')).rows[0].value;
 assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
 const snapshots={};for(const[name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);snapshots[name]=(await c.query(sql)).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;save(name,snapshots[name]);}
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(f=>f.match(/^\d+/)[0]));
 const expected=read(canonical+'/local-upgrade-v16-r3/bog_direct_visibility_fresh_521_v16-after-catalog.private.json.gz'),security=read(canonical+'/local-upgrade-v16-r3/bog_direct_visibility_fresh_521_v16-after-security.private.json.gz');assert.deepEqual(snapshots.security,security);
 const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function model(s,schema){const map=new Map(queries.map(([k,q])=>[q,s[k]])),m=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>map.get(q.sql)});m.one_schema(schema);for(const k of ['types','domains','materialized_views','composite_types'])m[k]=Object.fromEntries(Object.entries(m[k]).filter(([,v])=>v.schema===schema));return m;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const x=await model(expected,schema),y=await model(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(x,y);const d=await Migration.create(x,y,{schema});d.set_safety(false);d.add_all_changes(true);assert.equal(d.sql.trim(),'','Current canonical522 drift in '+schema);}
 Object.assign(report,{pass:true,currentLedger:522,sourceFiles:528,fourSchemasExact:true,securityExact:true,catalogReliabilityFailureRetained:true});
}catch(error){report.error=error.message;process.exitCode=1;}finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();report.runnerSha256=pin(new URL(import.meta.url));fs.writeFileSync(out+'/baseline.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
