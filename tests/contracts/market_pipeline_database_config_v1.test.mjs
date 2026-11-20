import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {marketPipelineDatabaseConfigV1 as config} from '../../backend/pricing/market_pipeline_database_config_v1.mjs';
const target='postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres';
test('remote TLS is verified and URL options cannot replace it',()=>{
 const value=config(target+'?sslmode=require&options=-c%20statement_timeout%3D120000',{}, {readOnly:true});
 assert.equal(value.ssl.rejectUnauthorized,true);
 assert.equal(value.ssl.servername,'db.ycdxbpibncqcchqiihfz.supabase.co');
 assert.equal(new URL(value.connectionString).search,'');
 assert.equal(value.options,'-c statement_timeout=120000 -c default_transaction_read_only=on');
 assert.equal(config(target,{}).options,undefined);
});
test('configured CA and exact pooler project are preserved',()=>{
 const ca='-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----';
 const value=config('postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-0-us-east-1.pooler.supabase.com:5432/postgres',{SUPABASE_DB_CA_CERT:ca});
 assert.equal(value.ssl.rejectUnauthorized,true);assert.equal(value.ssl.ca,ca);
 assert.throws(()=>config(target,{SUPABASE_DB_CA_CERT:'invalid'}),/INVALID_DATABASE_CA/);
});
test('local exception requires a literal loopback hostname',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]']) assert.equal(config('postgresql://postgres:fixture@'+host+':54322/postgres',{}).ssl,false);
 for(const url of [target.replace('db.ycdxbpibncqcchqiihfz.supabase.co','localhost.evil.example'),target.replace('postgres:fixture','localhost:fixture').replace('ycdxbpibncqcchqiihfz','wrongproject'),target.replace(/\/postgres$/,'/other')]) assert.throws(()=>config(url,{}));
});
test('disabled TLS, URL SSL objects and insecure process environments fail closed',()=>{
 for(const mode of ['disable','prefer','allow','no-verify']) assert.throws(()=>config(target+'?sslmode='+mode,{}),/INSECURE_DATABASE_TLS_MODE/);
 assert.throws(()=>config(target+'?ssl=false',{}),/UNSUPPORTED_DATABASE_URL_OPTION/);
 assert.throws(()=>config(target,{NODE_TLS_REJECT_UNAUTHORIZED:'0'}),/INSECURE_DATABASE_TLS_ENVIRONMENT/);
});
test('active refresh and publication paths use the verified connection helper',()=>{
 for(const file of ['scripts/workers/tcgplayer_market_publication_worker_v1.mjs','scripts/workers/tcgplayer_market_scheduled_runner_v1.mjs','scripts/workers/tcgcsv_full_source_warehouse_worker_v1.mjs','scripts/audits/tcgplayer_market_continuity_watchdog_v1.mjs']) {
  const source=fs.readFileSync(file,'utf8');assert.match(source,/marketPipelineDatabaseConfigV1/);assert.doesNotMatch(source,/rejectUnauthorized:\s*false/);
 }
 const workflow=fs.readFileSync('.github/workflows/tcgplayer-market-full-scope-shadow.yml','utf8');assert.match(workflow,/SUPABASE_DB_CA_CERT: \$\{\{ secrets\.SUPABASE_DB_CA_CERT \}\}/);
 const production=fs.readFileSync('.github/workflows/mtg-pricing-publication-runner.yml','utf8').split('shadow_source_sync_run_id="$(node')[1].split('const categoryResult')[0];
 assert.match(production,/marketPipelineDatabaseConfigV1/);assert.doesNotMatch(production,/rejectUnauthorized:\s*false/);
});
