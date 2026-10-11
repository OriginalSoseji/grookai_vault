// Read-only validation parity against the fixed, freshly replayed433 local lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import * as model from '../../apps/web/src/lib/sales/negotiatedTrade.mjs';
import {cases,receipt} from '../../tests/fixtures/negotiated_trade_cases_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_negotiated_trade_20261007');
const base='C:/grookai_vault_operator_artifacts/product_negotiated_trade_20261007',lab=base+'/full-433-v4',project='product-trade-full-433-v4-20261007';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,433);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33560/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});
await db.connect();
try {
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.workers,'0');assert.equal(state.migrations,433);
 const vectors=read(root+'test/fixtures/negotiated_trade_web_v1.json');assert.equal(vectors.sourceSha256,hash(fs.readFileSync(root+'apps/web/src/lib/sales/negotiatedTrade.mjs')));
 // Request-id transport is covered through the actual authenticated RPC; this
 // helper accepts the exact cart. Line and receipt validators share the vectors.
 const rows=cases.filter(r=>['validateNegotiatedTradeLine','negotiatedTradeTotals'].includes(r.fn)||
  ['validateNegotiatedTradeRequest','validateNegotiatedSaleReceipt'].includes(r.fn)&&r.args[0]?.id!==undefined);
 for(const [name,edit]of [
  ['missing reference total',r=>{r.tradeIn.items[0].valueMinor=null;r.tradeIn.items[0].rateBps=null;r.tradeIn.totalValueMinor=null;}],
  ['UTF16 boundary',r=>r.note='🃏'.repeat(175)],['UTF16 over',r=>r.note='🃏'.repeat(176)],
  ['DEL private note',r=>r.note+='\x7f'],['blank unicode store',r=>r.storeName='\u00a0'],
  ['blank tab outgoing',r=>r.items[0].description='\t'],['incoming newline',r=>r.tradeIn.items[0].description='a\nb'],
  ['unknown version',r=>r.tradeIn.version=3],['missing credit',r=>delete r.tradeIn.items[0].creditMinor],
  ['canonical acquired',r=>Object.assign(r.tradeIn.items[0],{cardId:r.id,printingId:r.id,condition:'NM',addToVault:true,printingGvId:'GVP-TEST',instanceId:r.id,gvviId:'GVVI-TEST-001'})],
  ['untracked canonical',r=>Object.assign(r.tradeIn.items[0],{cardId:r.id,printingId:r.id,condition:'LP',printingGvId:'GVP-TEST'})],
  ['unknown intake identity',r=>r.tradeIn.items[0].instanceId=r.id],
 ]){const value=receipt();edit(value);let valid=true;try{model.validateNegotiatedSaleReceipt(value);}catch{valid=false;}rows.push({name,fn:'validateNegotiatedSaleReceipt',args:[value],valid});}
 const outcomes=[];
 for(const row of rows){
  let sql,args;
  if(row.fn==='validateNegotiatedTradeLine'){sql='select public.vendor_negotiated_trade_lines_v1($1::jsonb,$2::boolean)';args=[JSON.stringify([row.args[0]]),row.args[1]??false];}
  else if(row.fn==='negotiatedTradeTotals'){sql='select public.vendor_negotiated_trade_lines_v1($1::jsonb,$2::boolean)';args=[JSON.stringify(row.args[0]),row.args[1]??false];}
  else if(row.fn==='validateNegotiatedTradeRequest'){sql='select public.vendor_negotiated_trade_request_validate_v1($1::jsonb)';args=[JSON.stringify(row.args[0].cart)];}
  else {sql='select public.vendor_negotiated_trade_receipt_validate_v1($1::jsonb)';args=[JSON.stringify(row.args[0])];}
  let accepted=true,code=null;try{await db.query(sql,args);}catch(error){accepted=false;code=error.code;assert.ok(['22023','22007','22008'].includes(code),row.name+': unexpected SQL error '+code);}
  assert.equal(accepted,row.valid,row.name);outcomes.push({name:row.name,accepted,code});
 }
 // Legacy trade validation stays derived-credit strict, and mixed books use strict new dispatch.
 const r=receipt();r.sourceDispositionId=null;
 const legacy=structuredClone(r);legacy.id='22222222-2222-4222-8222-222222222222';legacy.number='GV-20261008-22222222';legacy.tradeIn.version=1;legacy.tradeIn.items[0].creditMinor=600;legacy.tradeIn.totalCreditMinor=600;legacy.tradeIn.balanceMinor=400;
 legacy.payments.entries[0].amountMinor=400;legacy.payments.balanceMinor=400;legacy.payments.changeMinor=100;
 const actor='00000000-0000-4000-8000-000000000001',book={version:1,storeName:'Mixed shop',customers:[],receipts:[r,legacy].map(receipt=>({receipt,customerId:null}))};
 await db.query('select public.vendor_receipt_book_validate_v1($1::jsonb,$2::uuid)',[JSON.stringify(book),actor]);
 for(const edit of [b=>b.receipts[0].customerId=actor,b=>b.receipts[0].receipt.sourceDispositionId=actor,b=>b.receipts[0].receipt.tradeIn.version=3,b=>b.receipts[1].receipt.tradeIn.items[0].creditMinor=650]){
  const invalid=structuredClone(book);edit(invalid);await assert.rejects(db.query('select public.vendor_receipt_book_validate_v1($1::jsonb,$2::uuid)',[JSON.stringify(invalid),actor]),{code:'22023'});
 }
 const privileges=(await db.query("select has_function_privilege('authenticated','public.vendor_sales_cart_complete_v5(uuid,jsonb)','EXECUTE') writer,has_function_privilege('anon','public.vendor_sales_cart_complete_v5(uuid,jsonb)','EXECUTE') anonymous,has_function_privilege('authenticated','public.vendor_sales_cart_read_v2(uuid,jsonb)','EXECUTE') recovery,has_function_privilege('anon','public.vendor_sales_cart_read_v2(uuid,jsonb)','EXECUTE') anonymous_read,has_function_privilege('authenticated','public.vendor_negotiated_trade_receipt_validate_v1(jsonb)','EXECUTE') validator,has_table_privilege('authenticated','public.vendor_negotiated_trade_control','SELECT') control,(select enabled from public.vendor_negotiated_trade_control) enabled")).rows[0];
 assert.deepEqual(privileges,{writer:true,anonymous:false,recovery:true,anonymous_read:false,validator:false,control:false,enabled:false});
 const out=base+'/sql-'+Date.now();fs.mkdirSync(out);
 fs.writeFileSync(out+'/result.json',JSON.stringify({at:new Date().toISOString(),status:'passed',outcomes,cases:outcomes.length,bookChecks:5,privileges,readOnly:true,productionWrites:0,localWrites:0,sourceSha256:freeze.sourceHashes['20261008060000_vendor_negotiated_trade_v1.sql']},null,2),{flag:'wx'});
 console.log(JSON.stringify({status:'passed',cases:outcomes.length,out}));
}finally{await db.end();}
