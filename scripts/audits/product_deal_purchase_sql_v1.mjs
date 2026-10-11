// Read-only model parity against the fresh, attested purchase replay lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {validatePurchaseReceipt} from '../../apps/web/src/lib/sales/salesPurchase.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);
assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_deal_release_20261008');
const base='C:/grookai_vault_operator_artifacts/product_deal_release_20261008',lab=base+'/full-432-v1',project='deal-full-432-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,432);
assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
assert.equal(Object.keys(freeze.sourceHashes).length,432);assert.ok(!Object.hasOwn(freeze.sourceHashes,'20261005150000_vendor_receipt_delivery_v1.sql'));
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(lab+'/supabase/migrations/'+name)),digest,name);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const docker=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(docker.State.Running,true);assert.deepEqual(Object.keys(docker.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33640/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});
await db.connect();
try {
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,docker.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.workers,'0');assert.equal(state.migrations,432);
 const vectors=read(root+'test/fixtures/sales_purchase_web_v1.json');
 assert.equal(vectors.sha256,hash(fs.readFileSync(root+vectors.model)));
 const cases=vectors.cases.filter(row=>row.action==='receipt').map(row=>({name:row.name,receipt:row.args[0],accepted:row.expected.ok}));
 const original=structuredClone(cases.find(row=>row.accepted).receipt);
 for(const [name,mutate]of [
  ['private note max UTF16',r=>r.note='🃏'.repeat(250)],
  ['private note over UTF16',r=>r.note='🃏'.repeat(251)],
  ['DEL character',r=>r.note='private\x7f'],
  ['unknown copy',r=>r.items[0].instanceId='bad'],
  ['repeated incoming copy',r=>{r.items.push(structuredClone(r.items[0]));r.purchaseMinor*=2;r.payments.balanceMinor=-r.purchaseMinor;r.payments.entries[0].amountMinor=r.purchaseMinor;r.payments.entries[0].tenderedMinor=r.purchaseMinor;}],
  ['quick multi quantity',r=>{Object.assign(r.items[0],{quantity:3,cardId:null,printingId:null,condition:null,addToVault:false,printingGvId:null,instanceId:null,gvviId:null,lineMinor:1950});r.purchaseMinor=1950;r.payments.balanceMinor=-1950;r.payments.entries[0].amountMinor=1950;r.payments.entries[0].tenderedMinor=1950;}],
  ['unpaired percentage',r=>r.items[0].rateBps=null],
  ['all free purchase',r=>{r.items[0].unitMinor=0;r.items[0].lineMinor=0;r.purchaseMinor=0;r.payments.balanceMinor=0;r.payments.entries=[];r.method='Other';}],
 ]) {
  const receipt=structuredClone(original);mutate(receipt);let accepted=true;try{validatePurchaseReceipt(receipt);}catch{accepted=false;}cases.push({name,receipt,accepted});
 }
 const outcomes=[];
 for(const row of cases){
  let accepted=true,code=null;try{await db.query('select public.vendor_purchase_receipt_validate_v1($1::jsonb)',[JSON.stringify(row.receipt)]);}catch(error){accepted=false;code=error.code;assert.ok(['22023','22007','22008'].includes(code),row.name+': unexpected SQL error '+code);}
  assert.equal(accepted,row.accepted,row.name);outcomes.push({name:row.name,accepted,code});
 }
 // Existing mixed-book bounds/customer references still guard the dispatch.
 const actor='00000000-0000-4000-8000-000000000001';
 const book={version:1,storeName:'Sample shop',customers:[],receipts:[{receipt:original,customerId:null}]};
 await db.query('select public.vendor_receipt_book_validate_v1($1::jsonb,$2::uuid)',[JSON.stringify(book),actor]);
 const invalid=structuredClone(book);invalid.receipts[0].customerId=actor;
 await assert.rejects(db.query('select public.vendor_receipt_book_validate_v1($1::jsonb,$2::uuid)',[JSON.stringify(invalid),actor]),{code:'22023'});
 const privileges=(await db.query("select has_function_privilege('authenticated','public.vendor_sales_cart_complete_v4(uuid,jsonb)','EXECUTE') writer,has_function_privilege('anon','public.vendor_sales_cart_complete_v4(uuid,jsonb)','EXECUTE') anonymous,has_function_privilege('authenticated','public.vendor_purchase_receipt_validate_v1(jsonb)','EXECUTE') validator,has_table_privilege('authenticated','public.vendor_purchase_control','SELECT') control,(select enabled from public.vendor_purchase_control) enabled")).rows[0];
 assert.deepEqual(privileges,{writer:true,anonymous:false,validator:false,control:false,enabled:false});
 const out=base+'/receipt-sql-'+Date.now();fs.mkdirSync(out);
 const result={at:new Date().toISOString(),status:'passed',packageHashes:freeze.sourceHashes,producerSha256:hash(fs.readFileSync(fileURLToPath(import.meta.url))),cases:outcomes.length,outcomes,privileges,bookAssociationChecks:2,readOnly:true,productionWrites:0,localWrites:0,sourceSha256:freeze.sourceHashes['20261008021000_vendor_purchase_v1.sql']};
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:result.status,cases:result.cases,out}));
}finally{await db.end();}
