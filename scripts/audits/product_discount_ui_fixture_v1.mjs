// Dedicated local436 UI acceptance. Every populated fixture is retained.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_discount_20261008',base='C:/grookai_vault_operator_artifacts/product_discount_20261008',lab=base+'/full-436-v1',project='discount-full-436-v1-20261008';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mode=process.argv[2];assert.ok(['prepare','verify','restore'].includes(mode));assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/ui-'+Date.now():path.resolve(process.argv[3]).replaceAll('\\','/');assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.project,project);assert.equal(replay.migrations,436);assert.ok(replay.fullReplay&&replay.noOpPush);
assert.equal(read(base+'/shadow-436-v1/receipt.json').status,'passed');assert.equal(read(base+'/cancellation-rpc-1791478072007/result.json').status,'passed');assert.equal(read(base+'/cancellation-reapply-1791478265066/result.json').status,'passed');
assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
assert.deepEqual(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort(),Object.keys(freeze.sourceHashes).sort());for(const[name,digest]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest,name);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:34601');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of [34600,34601])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:34600/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_item_instance_dispositions','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.card_print_identity','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots','public.external_mappings','public.tcgcsv_source_categories','public.tcgcsv_source_groups','public.tcgcsv_source_sync_runs','public.tcgcsv_source_artifacts','public.tcgcsv_source_products','public.tcgcsv_source_price_daily_observations','public.market_evidence_variant_assignments','public.tcgplayer_jungle_edition_assignments_v1','public.market_price_pipeline_runs','public.market_price_pipeline_phase_attempts','public.market_price_pipeline_candidates','public.market_price_qualification_decisions','public.market_price_publication_sets','public.market_price_publication_snapshots','public.market_price_publication_events','public.vendor_event_owners','public.vendor_events','public.vendor_event_expenses','public.vendor_event_assignments','public.vendor_event_requests','public.vendor_sales_cart_cancellations'];
const controls=['vendor_discount_control','vendor_event_control','vendor_receipt_cloud_control','vendor_sales_cart_control','vendor_sales_payment_control','vendor_sales_trade_control','vendor_purchase_control','vendor_negotiated_trade_control'];
const flags=async()=>{const r={};for(const t of controls)r[t]=(await q(`select enabled from ${t}`))[0].enabled;r.cost=(await q('select edit_enabled,capture_enabled from vendor_cost_evidence_control'))[0];return r;};
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function retain(f){const counts={};for(const t of tables){const rows=new Set((await q(`select to_jsonb(t) row from ${t} t`)).map(canonical));for(const row of f.retained[t])assert.ok(rows.has(canonical(row)),t+': prior row changed');counts[t]=f.retained[t].length;}return counts;}
async function verify(f){
 assert.equal(f.project,project);assert.ok(f.owner&&f.email.endsWith('@discount-ui.invalid'));
 const counts=await retain(f);assert.equal((await q('select * from market_price_current_publication')).length,0);
 if(f.seedReceipt){const row=(await q('select receipt from vendor_sales_cart_receipts where owner_id=$1 and request_id=$2',[f.owner,f.seedReceipt.id]))[0];assert.deepEqual(row.receipt,f.seedReceipt);}
 if(f.costs)assert.deepEqual(await q('select id,acquisition_cost::text cost,acquisition_currency currency from vault_item_instances where user_id=$1 order by id',[f.owner]),f.costs);
 return counts;
}
async function restore(f){await q('rollback').catch(()=>{});await q('begin');try{for(const t of controls)await q(`update ${t} set enabled=$1`,[f.flags[t]]);await q('update vendor_cost_evidence_control set edit_enabled=$1,capture_enabled=$2',[f.flags.cost.edit_enabled,f.flags.cost.capture_enabled]);await q('commit');}catch(e){await q('rollback');throw e;}assert.deepEqual(await flags(),f.flags);const counts=f.owner?await verify(f):await retain(f);save('retention.json',{status:'passed',at:new Date().toISOString(),retainedTables:tables.length,priorRowCounts:counts,controlsRestored:true,allNewHistoryRetained:true,productionWrites:0});f.previousState=f.state;f.state='restored';save('fixture.private.json',f,false);}
let client;
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,436);
 if(mode!=='prepare'){
  const f=read(run+'/fixture.private.json');assert.notEqual(f.state,'restored');
  if(mode==='restore')await restore(f);else save('verification-'+Date.now()+'.json',{status:'passed',counts:await verify(f),productionWrites:0});
  console.log(JSON.stringify({run,mode,status:'passed'}));
 }else{
  const initial=await flags();assert.ok(controls.every(t=>initial[t]===false));assert.deepEqual(initial.cost,{edit_enabled:false,capture_enabled:false});assert.equal((await q('select * from market_price_current_publication')).length,0);
  const retained={};for(const t of tables)retained[t]=await q(`select to_jsonb(t) row from ${t} t`);
  fs.mkdirSync(run);const f={state:'preparing',project,at:new Date().toISOString(),consumed:true,flags:initial,retained,email:randomUUID()+'@discount-ui.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID()};save('intent.private.json',f);save('fixture.private.json',f);
  const files=[...new Set(command('git',['ls-files','-co','--exclude-standard','lib','integration_test','apps/web/src','apps/web/next.config.mjs','supabase/migrations']).trim().split(/\r?\n/))].filter(n=>fs.existsSync(root+'/'+n)&&fs.statSync(root+'/'+n).isFile());save('source-binding.json',{at:new Date().toISOString(),root,hashes:Object.fromEntries(files.map(n=>[n,sha(root+'/'+n)]))});fs.copyFileSync(new URL(import.meta.url),run+'/fixture-producer.mjs',fs.constants.COPYFILE_EXCL);
  try{
   const auth={persistSession:false,autoRefreshToken:false},admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth});client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth});
   const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;save('fixture.private.json',f,false);assert.equal((await client.auth.signInWithPassword({email:f.email,password:f.password})).error,null);
   f.gv='GV-PK-DISCOUNT-'+f.card;f.name='Discount proof card';
   await q('begin');await q("insert into sets(id,code,name,game) values($1,$2,'Discount proof set','pokemon')",[f.set,f.set]);
   await q("insert into card_prints(id,set_id,game_id,name,number,gv_id,image_status) values($1,$2,(select id from games where code='pokemon'),$3,'1',$4,'missing')",[f.card,f.set,f.name,f.gv]);
   await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[f.printing,f.card,f.gv+'-STD']);
   for(const condition of ['NM','LP','MP','HP'])await q('select public.admin_vault_instance_create_v1(p_user_id=>$1::uuid,p_card_print_id=>$2::uuid,p_condition_label=>$3,p_card_printing_id=>$4::uuid)',[f.owner,f.card,condition,f.printing]);
   await q("update vault_item_instances set acquisition_cost=case condition_label when 'NM' then 60 when 'LP' then 0 when 'HP' then 5 else null end,acquisition_currency=case when condition_label='MP' then null else 'USD' end,pricing_mode='asking',asking_price_amount=case when condition_label='NM' then 100 else 50 end,asking_price_currency='USD' where user_id=$1",[f.owner]);
   for(const t of controls)await q(`update ${t} set enabled=true`);await q('update vendor_cost_evidence_control set capture_enabled=true');await q('commit');
   f.copies=await q('select id,condition_label condition,gv_vi_id gvvi from vault_item_instances where user_id=$1 order by condition_label',[f.owner]);assert.equal(f.copies.length,4);
   f.costs=await q('select id,acquisition_cost::text cost,acquisition_currency currency from vault_item_instances where user_id=$1 order by id',[f.owner]);
   const customer={name:'',email:'',phone:'',wants:'',notes:''};const old=await client.rpc('vendor_sales_cart_complete_v1',{p_request_id:randomUUID(),p_cart:{version:1,storeName:'Discount proof store',method:'Cash',items:[{instanceId:null,description:'Retained previous receipt',quantity:1,unitMinor:100}],taxMinor:0,note:'',customerId:null,customer}});assert.equal(old.error,null);f.seedReceipt=old.data;
   await verify(f);f.state='prepared';save('fixture.private.json',f,false);save('prepared.json',{status:'passed',at:new Date().toISOString(),owner:f.owner,copies:4,retainedTables:tables.length,actualAuth:true,productionWrites:0});console.log(JSON.stringify({run,state:'prepared'}));
  }catch(e){save('prepare-failure.json',{message:e.message,stack:e.stack});await restore(f);throw e;}
 }
}finally{if(client)await client.auth.signOut({scope:'local'}).catch(()=>{});await db.end();}
