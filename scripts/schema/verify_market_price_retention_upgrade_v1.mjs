// Read-only verification of the already-consumed isolated upgrade. This never
// reruns an apply, seeds a user, changes source quotes or connects to production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../../',import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/,'').replace(/\/$/,''),base='C:/grookai_vault_operator_artifacts/pricing_visibility_schema_20261123';
const [attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const out=base+'/retained-upgrade-readback-'+attempt;assert.equal(fs.existsSync(out),false);
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),sha=b=>createHash('sha256').update(b).digest('hex'),require=createRequire(root+'/package.json');
const prior=base+'/retained-upgrade-qualification-v1',proof=read(prior+'/result.json'),fixture=read(base+'/upgrade-520/retained-fixture-result.json');
assert.equal(proof.pass,true);assert.equal(proof.productionWrites,0);assert.equal(proof.protectedTables,426);assert.equal(proof.allGovernedTableDataPreserved,true);assert.equal(proof.existingSecurityPreserved,true);assert.equal(fixture.realUserDataCopied,0);
assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/20261124010000_market_price_retention_display_v1.sql')),proof.candidateSha256);
for(const phase of['dry-run','apply','noop']){assert.equal(proof.cli[phase].exit,0);assert.equal(sha(fs.readFileSync(prior+'/'+phase+'.log')),proof.cli[phase].logSha256);}
const historical=read(root+'/scripts/schema/market_price_retention_baseline_v1.json').history;for(const[file,hash]of Object.entries(historical))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),hash);
assert.equal(fs.existsSync(base+'/upgrade-520/supabase/.temp/project-ref'),false);const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_price-retain-upg-520-20261123'],{encoding:'utf8'}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),['price-retain-upg-520-20261123']);assert.equal(JSON.parse(execFileSync('docker',['network','inspect','price-retain-upg-520-20261123'],{encoding:'utf8'}))[0].Internal,true);
fs.mkdirSync(out);const client=new(require('pg').Client)({host:'127.0.0.1',port:55300,user:'postgres',password:'postgres',database:'postgres',options:'-c default_transaction_read_only=on',application_name:'retained_upgrade_readonly_verifier',statement_timeout:30000});
const report={at:new Date().toISOString(),pass:false,productionWrites:0,localWrites:0,localSyntheticFixtureOnly:true,realUserSession:false};
try{
 await client.connect();assert.equal((await client.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');console.log('LOCAL READ ONLY: 127.0.0.1:55300/postgres');
 const state=(await client.query("select (select count(*) from auth.users)::int users,(select count(*) from public.vault_item_instances)::int copies,current_setting('max_worker_processes') workers,(select count(*) from supabase_migrations.schema_migrations)::int ledger")).rows[0];assert.deepEqual(state,{users:0,copies:0,workers:'0',ledger:521});
 await client.query('begin isolation level repeatable read read only');const before=read(prior+'/protected-before.json'),fingerprints={};
 const tables=(await client.query("select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=any($1) and c.relkind in('r','p') order by 1,2",[['public','grookai_square','grookai_inventory','grookai_vendor_pricing']])).rows;
 for(const row of tables){assert.match(row.nspname,/^[a-z_]+$/);assert.match(row.relname,/^[a-z0-9_]+$/);fingerprints[row.nspname+'.'+row.relname]=(await client.query(`select count(*)::integer rows,encode(extensions.digest(coalesce(string_agg(encode(extensions.digest(to_jsonb(data)::text,'sha256'),'hex'),'' order by encode(extensions.digest(to_jsonb(data)::text,'sha256'),'hex')),''),'sha256'),'hex') sha256 from "${row.nspname}"."${row.relname}" data`)).rows[0];}
 assert.deepEqual(fingerprints,before);await client.query('rollback');report.protectedTables=Object.keys(fingerprints).length;
 const security=(await client.query(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;assert.deepEqual(security,read(prior+'/security-after.json'));report.existingSecurityPreserved=true;
 const params={p_card_print_ids:[fixture.cardPrintId],p_card_printing_ids:[fixture.cardPrintingId]};const cfg=JSON.parse(execFileSync('C:/Users/ccabr/scoop/apps/supabase/current/supabase.exe',['status','--workdir',base+'/upgrade-520','--output','json'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','ignore']}));assert.equal(cfg.API_URL,'http://127.0.0.1:55301');
 const sdk=require('@supabase/supabase-js'),service=sdk.createClient(cfg.API_URL,cfg.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),anon=sdk.createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 let result=await service.rpc('get_market_pricing_read_model_v1',params);assert.ifError(result.error);assert.equal(result.data.length,2);for(const row of result.data){assert.equal(Number(row.market_close),31);assert.equal(row.freshness,'stale');assert.equal(new Date(row.observed_at).toISOString(),fixture.expectedObservedAt);}report.sdkSourceDateAndAmountExact=true;
 result=await anon.rpc('get_market_pricing_read_model_v1',params);assert.equal(result.error?.code,'42501');report.anonymousDenied=true;
 report.pass=true;report.candidateSha256=proof.candidateSha256;report.upgradeReceiptSha256=sha(fs.readFileSync(prior+'/result.json'));report.executedSourceSha256=sha(fs.readFileSync(new URL(import.meta.url)));
}catch(error){report.error=error.message;await client.query('rollback').catch(()=>{});process.exitCode=1;}finally{await client.end().catch(()=>{});fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
