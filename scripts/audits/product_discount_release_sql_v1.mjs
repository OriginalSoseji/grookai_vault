// Read-only arithmetic, request/receipt parity and privilege checks in local435.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {saleDiscountAllocation} from '../../apps/web/src/lib/sales/saleDiscount.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync(root).replaceAll('\\','/').toLowerCase(),'c:/gv_product_discount_20261008');assert.equal(fs.realpathSync('.'),fs.realpathSync(root));
const base='C:/grookai_vault_operator_artifacts/product_discount_20261008',lab=base+'/release-full-435-v1',project='discount-rel-full-435-v1-20261008';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,435);assert.ok(replay.fullReplay&&replay.noOpPush);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
for(const [name,digest]of Object.entries(freeze.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest,name);
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34860/postgres?options=-c%20default_transaction_read_only%3Don',connectionTimeoutMillis:10000});await db.connect();
const out=base+'/release-sql-'+Date.now();fs.mkdirSync(out);
fs.copyFileSync(fileURLToPath(import.meta.url),out+'/producer.mjs',fs.constants.COPYFILE_EXCL);
try{
 const state=(await db.query("select host(inet_server_addr()) address,current_setting('transaction_read_only') readonly,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations")).rows[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.readonly,'on');assert.equal(state.workers,'0');assert.equal(state.migrations,435);
 const outcomes=[];
 async function run(name,query,args,valid,expected){
  let accepted=true,code=null,result;
  try{result=(await db.query(query,args)).rows[0]?.result;}catch(e){accepted=false;code=e.code;assert.ok(['22023','22007','22008','22P02','22P05'].includes(code),name+': unexpected SQL error '+code);}
  outcomes.push({name,accepted,code});fs.writeFileSync(out+'/outcomes.json',JSON.stringify(outcomes,null,2));
  assert.equal(accepted,valid,name);if(valid&&expected!==undefined)assert.deepEqual(result,expected,name);
 }
 for(const row of read(root+'test/fixtures/sale_discount_v1.json'))await run(row.name,'select public.vendor_sale_discount_allocation_v1($1::jsonb,$2::jsonb) result',[JSON.stringify(row.items),JSON.stringify(row.discountMinor)],!!row.expected,row.expected?saleDiscountAllocation(row.items,row.discountMinor):undefined);
 const excluded=['request extra field','invalid UUID version']; // HTTP envelope/UUID validation belongs to completion, not the cart helper.
 for(const row of read(root+'test/fixtures/discounted_sale_v1.json')){
  if(row.kind==='ack'||excluded.includes(row.name))continue;
  await run(row.name,row.kind==='request'?'select public.vendor_discount_request_validate_v1($1::jsonb)':'select public.vendor_discount_receipt_validate_v1($1::jsonb)',[JSON.stringify(row.kind==='request'?row.value.cart:row.value)],row.valid);
 }
 const privileges=[];
 for(const role of ['anon','authenticated','service_role']){
  const p=(await db.query("select has_table_privilege($1,'public.vendor_discount_control','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') allowed,(select relrowsecurity from pg_class where oid='public.vendor_discount_control'::regclass) rls",[role])).rows[0];assert.equal(p.allowed,false,role);assert.equal(p.rls,true);privileges.push({role,...p});
 }
 const names=['vendor_sales_discount_available_v1','vendor_sale_discount_allocation_v1','vendor_discount_request_validate_v1','vendor_discount_receipt_validate_v1','vendor_discount_disposition_v1','vendor_sale_cost_capture_v1','vendor_sales_cart_complete_v6','vendor_sales_cart_read_v3'];
 const functions=(await db.query("select p.proname name,p.oid::regprocedure::text signature,p.prosecdef definer,p.proconfig config from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=any($1::text[]) order by p.proname",[names])).rows;assert.equal(functions.length,names.length);
 for(const f of functions){
  assert.equal(f.definer,f.name!=='vendor_sale_discount_allocation_v1');assert.ok(f.config.includes('search_path=""'),f.signature);
  const exposed=['vendor_sales_discount_available_v1','vendor_sales_cart_complete_v6','vendor_sales_cart_read_v3'].includes(f.name);
  for(const role of ['anon','authenticated','service_role'])assert.equal((await db.query("select has_function_privilege($1,$2,'EXECUTE') allowed",[role,f.signature])).rows[0].allowed,role==='authenticated'&&exposed,role+' '+f.signature);
 }
 assert.equal((await db.query('select enabled from vendor_discount_control')).rows[0].enabled,false);
 const result={at:new Date().toISOString(),status:'passed',outcomes,cases:outcomes.length,excludedEnvelopeCases:excluded,privileges,functions,readOnly:true,productionWrites:0,localWrites:0,sourceSha256:freeze.sourceHashes['20261008160000_vendor_discounts_v1.sql'],vectorHashes:Object.fromEntries(['sale_discount_v1.json','discounted_sale_v1.json'].map(n=>[n,hash(fs.readFileSync(root+'test/fixtures/'+n))]))};
 fs.writeFileSync(out+'/result.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',cases:outcomes.length,out}));
}catch(error){fs.writeFileSync(out+'/failure.json',JSON.stringify({at:new Date().toISOString(),status:'failed',message:error.message,code:error.code??null,productionWrites:0,localWrites:0},null,2),{flag:'wx'});throw error;}finally{await db.end();}
