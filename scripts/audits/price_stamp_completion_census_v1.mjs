// Canonical production read-only census. No owner record or credential export.
import fs from 'node:fs';import assert from 'node:assert/strict';import {gunzipSync,gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import dotenv from 'dotenv';import pg from 'pg';
import {marketPipelineDatabaseConfigV1} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
import {CENSUS_SQL,buildPriceStampCensusV1} from '../../backend/catalog/price_stamp_completion_census_v1.mjs';
const [attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const base='C:/grookai_vault_operator_artifacts/stamp_price_completion_20261122',out=base+'/census-v1-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out,{recursive:true});
const stampParents=JSON.parse(gunzipSync(fs.readFileSync('C:/grookai_vault_operator_artifacts/stamped_reverse_holo_audit_20261120/explicit-stamp-parent-inventory-v1.json.gz')));
const owner=dotenv.parse(fs.readFileSync('C:/grookai_vault/.env.local'));assert.equal(owner.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');
const db=new pg.Client({...marketPipelineDatabaseConfigV1(owner.SUPABASE_DB_URL,{SUPABASE_DB_CA_CERT:fs.readFileSync('C:/Users/ccabr/Downloads/prod-ca-2021.crt','utf8')},{readOnly:true,applicationName:'price_stamp_completion_census_readonly_v1'}),statement_timeout:120000,query_timeout:125000});let report={at:new Date().toISOString(),pass:false,productionWrites:0};
try{await db.connect();assert.equal((await db.query('show default_transaction_read_only')).rows[0].default_transaction_read_only,'on');assert.equal((await db.query('select ssl from pg_stat_ssl where pid=pg_backend_pid()')).rows[0].ssl,true);await db.query('begin isolation level repeatable read read only');
 const sanity=(await db.query('select(select count(*) from public.card_prints)::int cards,(select count(*) from public.sets)::int sets,(select count(*) from public.card_print_traits)::int traits')).rows[0];assert.ok(sanity.cards>=40000&&sanity.sets>=150&&sanity.traits>=5000);
 const current=(await db.query('select r.id run_id,r.state,r.worker_version,r.snapshot_count,p.publication_set_id from public.market_price_current_publication p join public.market_price_pipeline_runs r on r.id=p.run_id where p.singleton')).rows[0];
 const rows=(await db.query(CENSUS_SQL)).rows;report=buildPriceStampCensusV1({rows,stampParentIds:stampParents.map(p=>p.id),expectedParents:sanity.cards,current,observedAt:new Date().toISOString()});await db.query('commit');
 const bytes=gzipSync(Buffer.from(JSON.stringify(report.gaps)));fs.writeFileSync(out+'/exact-gap-inventory.private.json.gz',bytes,{flag:'wx'});delete report.gaps;report.exactGapInventorySha256=createHash('sha256').update(bytes).digest('hex');report.verifiedTls=true;report.startupReadOnly=true;report.querySha256=createHash('sha256').update(CENSUS_SQL).digest('hex');
}catch(error){await db.query('rollback').catch(()=>{});report.pass=false;report.error={code:error.code,message:String(error.message).slice(0,2000)};process.exitCode=1;}
finally{await db.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/summary.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
