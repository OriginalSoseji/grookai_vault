import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readLatestCompletedTcgcsvSourceRunV1 as read} from '../../backend/pricing/tcgcsv_cached_source_reader_v1.mjs';
const url='postgresql://postgres:fixture@db.ycdxbpibncqcchqiihfz.supabase.co:5432/postgres';
const row={run_key:'retained-source',status:'completed',source_marker:'original-source-marker',finished_at:'2026-11-24T23:45:58.054Z',price_row_count:249767,failed_count:0};
function harness({authorized=true,mode='on',rows=[row],connectError,readError}={}){
 const calls=[],instances=[];
 class Client{
  constructor(config){this.config=config;this.connection={stream:{authorized}};instances.push(this);}
  async connect(){calls.push('connect');if(connectError)throw connectError;}
  async query(sql){calls.push(sql);if(sql==='show transaction_read_only')return {rows:[{transaction_read_only:mode}]};if(sql.startsWith('select run_key')){if(readError)throw readError;return {rows};}return {rows:[]};}
  async end(){calls.push('end');}
 }
 return {calls,instances,run:(extra={})=>read({connectionString:url,environment:{},Client,...extra})};
}
test('fallback uses verified canonical TLS and returns original source fields only after an actual read-only transaction',async()=>{
 const h=harness();assert.deepEqual(await h.run(),row);const config=h.instances[0].config;
 assert.equal(config.ssl.rejectUnauthorized,true);assert.equal(config.ssl.servername,'db.ycdxbpibncqcchqiihfz.supabase.co');
 assert.deepEqual(h.calls.slice(0,3),['connect','begin transaction read only','show transaction_read_only']);
 assert.match(h.calls[3],/status = 'completed'/);assert.match(h.calls[3],/failed_count = 0/);assert.match(h.calls[3],/order by finished_at desc, created_at desc, id desc/);
 assert.deepEqual(h.calls.slice(-2),['rollback','end']);
});
test('session pooler preserves its exact project and explicit CA without trusting ignored startup read-only options',async()=>{
 const h=harness(),ca='-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----';
 assert.deepEqual(await h.run({connectionString:'postgresql://postgres.ycdxbpibncqcchqiihfz:fixture@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require',environment:{SUPABASE_DB_CA_CERT:ca}}),row);
 assert.equal(h.instances[0].config.ssl.ca,ca);assert.ok(h.calls.includes('begin transaction read only'));
});
test('unverified TLS fails before source reads and still closes the connection',async()=>{
 const h=harness({authorized:false});await assert.rejects(h.run(),/CACHED_SOURCE_VERIFIED_TLS_REQUIRED/);assert.ok(!h.calls.some(x=>x.startsWith('select ')));assert.equal(h.calls.at(-1),'end');
});
test('a server that does not enforce transaction read-only cannot supply fallback evidence',async()=>{
 const h=harness({mode:'off'});await assert.rejects(h.run(),/CACHED_SOURCE_READ_ONLY_TRANSACTION_REQUIRED/);assert.ok(!h.calls.some(x=>x.startsWith('select ')));assert.deepEqual(h.calls.slice(-2),['rollback','end']);
});
test('missing source remains missing rather than inventing a timestamp or observation',async()=>{assert.equal(await harness({rows:[]}).run(),null);});
test('connection and source-query errors are preserved and cleaned up',async()=>{
 for(const error of [new Error('connection failed'),new Error('source query failed')]){
  const h=harness(error.message.startsWith('connection')?{connectError:error}:{readError:error});await assert.rejects(h.run(),error);assert.equal(h.calls.at(-1),'end');
 }
});
for(const [name,extra]of[
 ['another project',{connectionString:url.replace('ycdxbpibncqcchqiihfz','anotherproject')}],
 ['disabled TLS',{connectionString:url+'?sslmode=disable'}],
 ['TLS process bypass',{environment:{NODE_TLS_REJECT_UNAUTHORIZED:'0'}}],
 ['unrelated database',{connectionString:url.replace(/\/postgres$/,'/other')}],
])test('rejects '+name+' before connecting',async()=>{const h=harness();await assert.rejects(h.run(extra));assert.equal(h.instances.length,0);});
test('literal loopback remains available for isolated owned qualification',async()=>{
 const h=harness({authorized:false});assert.deepEqual(await h.run({connectionString:'postgresql://postgres:fixture@127.0.0.1:54322/postgres'}),row);assert.equal(h.instances[0].config.ssl,false);
});
test('pipeline outage fallback cannot retain a separate unverified TLS path',()=>{
 const source=fs.readFileSync(new URL('../../scripts/workers/tcgplayer_market_pipeline_v1.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/rejectUnauthorized\s*:\s*false/);assert.match(source,/readLatestCompletedTcgcsvSourceRunV1/);
});
