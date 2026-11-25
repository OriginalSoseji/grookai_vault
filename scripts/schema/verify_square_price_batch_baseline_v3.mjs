// Read-only current canonical523 baseline. This cannot authorize an apply or
// accept/retry the separately failed catalog reliability samples.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';import {gzipSync,gunzipSync} from 'node:zlib';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1/current-main-523-v1';
const canonical='C:/grookai_vault_operator_artifacts/best_of_game_catalog_load_522_20261124';
const [phase,arg,...extra]=process.argv.slice(2);assert.equal(phase,'AuditLinkedSchema');assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');assert.ok(out.startsWith(art+'/starting-gate-'));assert.match(out.slice((art+'/starting-gate-').length),/^v[1-9][0-9]*$/);assert.equal(fs.existsSync(out),false);
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8').replace(/^\uFEFF/,''));
const sha=x=>createHash('sha256').update(x).digest('hex'),pin=p=>sha(fs.readFileSync(p));
const binding=read(root+'/scripts/schema/square_price_batch_candidate_v3.json');assert.equal(binding.project,'ycdxbpibncqcchqiihfz');assert.equal(binding.baselineMigrations,523);assert.equal(binding.targetMigrations,529);
const candidates={
  "20261124230000_square_recovery_target_window_release_v3.sql": "c60f33c0637a0b95e01d0a8c0356a616f8a2082035d8887bd72ec6f3571c27a2",
  "20261124231000_square_recovery_target_lanes_release_v3.sql": "117356aca4172d110d71f50add63e5d7e38c5d81aafa7b663cf7b5560235b64b",
  "20261124232000_square_durable_recovery_scheduler_release_v3.sql": "69c2a0e866d2b9d862f2e34f572f132c922b430540e3f91f38995006fb0e66c2",
  "20261124233000_square_price_batch_authority_v3.sql": "8f7e9f472177edacee5145bc27eac183beb42cf593f9e945386c197bd36e2a1e",
  "20261124234000_square_price_batch_attempt_receipts_v3.sql": "23a3662d6853044008b24f381a8753f09bb2eea00c94bf514b1bbf9a6df1efcc",
  "20261124235000_square_price_batch_pause_recovery_v3.sql": "34f52613cad54f3e6760cfc84aeef41df4cfe808e9e1400565fa64659105131e"
};
assert.deepEqual(binding.candidates,candidates);assert.equal(Object.keys(binding.history).length,523);
const sources={...binding.history,...candidates},exist=Object.keys(candidates).map(f=>fs.existsSync(root+'/supabase/migrations/'+f)),allPresent=exist.every(Boolean);assert.ok(allPresent||exist.every(x=>!x),'Partial candidate SQL is forbidden even for audit');const present=allPresent?sources:binding.history;
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).sort(),Object.keys(present).sort());for(const[file,hash]of Object.entries(present))assert.equal(pin(root+'/supabase/migrations/'+file),hash,file);
for(const[file,hash]of Object.entries({'production-apply-v23.json':'7ae828fca293aa06ac68821861a6ad8306b56a5e0ef390e9e51133efe21d0cb1','production-after-v23-r1/result.json':'acb237d26cdb45276cf3ddb1a2248b4cc701c8135037c645722a4a7153ccde46','production-reliability-v23-r1/result.json':'3761224b1256a8eee4844e6344794b562b5825628fff1c54b84f76605914294d','local-upgrade-v17-r3/result.json':'dd6972f50c33d6b1244aaaee46bf841a60abc7a154a6ad14bf2a95a18c5e39b7'})){assert.equal(pin(canonical+'/'+file),hash);assert.equal(read(canonical+'/'+file).pass,true);}
const oldFailure='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123/production-reliability-v20-r1/result.json';assert.equal(pin(oldFailure),'5f0d7b61e3bf0068753ed50070e46144ba7780f74379f3db9eeace26eb6dd138');assert.equal(read(oldFailure).pass,false);
const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+n+'/package.json').version,'0.6.1');
const r=createRequire(root+'/package.json'),env=r('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local')),url=new URL(env.SUPABASE_DB_URL);
assert.equal(env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id = "ycdxbpibncqcchqiihfz"/);
assert.ok(url.hostname==='db.ycdxbpibncqcchqiihfz.supabase.co'||url.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(url.username).includes('ycdxbpibncqcchqiihfz'));
for(const key of ['sslmode','sslrootcert','sslcert','sslkey'])url.searchParams.delete(key);fs.mkdirSync(out,{recursive:true});
const c=new(r('pg').Client)({connectionString:url.toString(),ssl:{rejectUnauthorized:true,ca:fs.readFileSync('C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem','utf8')},connectionTimeoutMillis:15000,options:'-c default_transaction_read_only=on',application_name:'square-price-batch-baseline-v3-readonly'});
const report={version:'SQUARE_PRICE_BATCH_BASELINE_V3',phase,pass:false,productionWrites:0,productionApiAcceptanceCalls:0,productionApplyAuthority:false,startingAt:new Date().toISOString()};
const save=(name,x)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(x))),{flag:'wx'});
try{
 await c.connect();assert.equal((await c.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 report.sanity=(await c.query('select jsonb_build_object(\'cards\',(select count(*)from public.card_prints),\'sets\',(select count(*)from public.sets),\'traits\',(select count(*)from public.card_print_traits)) value')).rows[0].value;
 assert.ok(report.sanity.cards>=40000&&report.sanity.sets>=150&&report.sanity.traits>=5000,'Environment mismatch — fix before proceeding.');
 const snapshots={};for(const[name,file]of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){const sql=fs.readFileSync(root+'/scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*\bread only;/i);snapshots[name]=(await c.query(sql)).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;save(name,snapshots[name]);}
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys(binding.history).sort().map(f=>f.match(/^\d+/)[0]));
 const expected=read(canonical+'/local-upgrade-v17-r3/bog_bulk_catalog_fresh_522_v17-after-catalog.private.json.gz'),security=read(canonical+'/local-upgrade-v17-r3/bog_bulk_catalog_fresh_522_v17-after-security.private.json.gz');assert.deepEqual(snapshots.security,security);
 const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function model(s,schema){const map=new Map(queries.map(([k,q])=>[q,s[k]])),m=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>map.get(q.sql)});m.one_schema(schema);for(const k of ['types','domains','materialized_views','composite_types'])m[k]=Object.fromEntries(Object.entries(m[k]).filter(([,v])=>v.schema===schema));return m;}
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const x=await model(expected,schema),y=await model(snapshots.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(x,y);const d=await Migration.create(x,y,{schema});d.set_safety(false);d.add_all_changes(true);assert.equal(d.sql.trim(),'','Current canonical523 drift in '+schema);}
 Object.assign(report,{pass:true,currentLedger:523,sourceFiles:Object.keys(present).length,sourcePreparationOnly:!allPresent,fourSchemasExact:true,securityExact:true,catalogReliabilityFailureRetained:true});
}catch(error){report.error=error.message;process.exitCode=1;}finally{await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();report.runnerSha256=pin(new URL(import.meta.url));fs.writeFileSync(out+'/baseline.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
