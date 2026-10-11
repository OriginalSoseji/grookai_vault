// Fresh local purchase fixture. Retain all prior rows and every consumed request.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_offer_policy_20261007',base='C:/grookai_vault_operator_artifacts/product_offer_policy_20261007';
const lab='C:/grookai_vault_operator_artifacts/product_buy_20261007/full-432-v1',project='product-buy-full-432-v1-20261007';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const mode=process.argv[2];assert.ok(['prepare','disable','verify','restore'].includes(mode));
assert.equal(process.argv.length,mode==='prepare'?3:4);
const run=mode==='prepare'?base+'/device-'+Date.now():path.resolve(process.argv[3]).replaceAll('\\','/');
assert.match(run,new RegExp('^'+base+'/device-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(read(base+'/CHECKPOINT.json').sourceFrozen,false);
const freeze=read(lab+'/freeze.json'),replay=read(lab+'/replay-result.json');
assert.equal(freeze.project,project);assert.equal(replay.status,'passed');assert.equal(replay.migrations,432);
assert.ok(replay.fullReplay&&replay.noOpPush&&!fs.existsSync(lab+'/supabase/.temp/project-ref'));
assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);
for(const[name,digest]of Object.entries(freeze.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),digest);
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:30000});
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:33281');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);
assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];
for(const port of[33280,33281])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:33280/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const tables=['auth.users','public.vault_owners','public.vault_items','public.vault_item_instances','public.vault_copy_cost_requests','public.card_events','public.pricing_watch','public.card_prints','public.card_printings','public.sets','public.vendor_receipt_books','public.vendor_sales_cart_receipts','public.vendor_sale_cost_snapshots'];
const canon=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const flagsSql='select (select enabled from vendor_purchase_control) purchase,(select enabled from vendor_sales_cart_control) cart,(select enabled from vendor_receipt_cloud_control) cloud,(select capture_enabled from vendor_cost_evidence_control) capture,(select edit_enabled from vendor_cost_evidence_control) edit';
const save=(name,value)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2));
async function retain(f){
 for(const table of tables){const after=new Set((await q(`select to_jsonb(t) row from ${table} t`)).map(canon));for(const row of f.retained[table])assert.ok(after.has(canon(row)),table+': prior row changed');}
}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];
 assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,432);
 if(mode==='prepare'){
  const flags=(await q(flagsSql))[0];assert.deepEqual(flags,{purchase:false,cart:false,cloud:false,capture:false,edit:false});
  const retained={};for(const table of tables)retained[table]=await q(`select to_jsonb(t) row from ${table} t`);
  fs.mkdirSync(run);const f={project,state:'preparing',consumed:true,at:new Date().toISOString(),flags,retained,email:randomUUID()+'@purchase-device.invalid',password:randomUUID()+'Aa9!',set:randomUUID(),card:randomUUID(),printing:randomUUID()};save('fixture.private.json',f);
  const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const made=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(made.error,null);f.owner=made.data.user.id;f.name='Device purchase '+f.card.slice(0,8);f.printingGvId='GV-PK-BUY-'+f.card+'-STD';save('fixture.private.json',f);
  await q('begin');
  await q("insert into sets(id,code,name,game) values($1,$2,'Device purchase set','pokemon')",[f.set,f.set]);
  await q("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,$3,'1',$4,'missing')",[f.card,f.set,f.name,'GV-PK-BUY-'+f.card]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),$3)",[f.printing,f.card,f.printingGvId]);
  await q('update vendor_purchase_control set enabled=true');await q('update vendor_sales_cart_control set enabled=true');await q('update vendor_receipt_cloud_control set enabled=true');await q('commit');
  save('defines.private.json',{GROOKAI_WEB_BASE_URL:'http://127.0.0.1:33451',PURCHASE_TEST_URL:cfg.API_URL,PURCHASE_TEST_KEY:cfg.PUBLISHABLE_KEY,PURCHASE_TEST_EMAIL:f.email,PURCHASE_TEST_PASSWORD:f.password,PURCHASE_TEST_CARD:f.card,PURCHASE_TEST_NAME:f.name,PURCHASE_TEST_PRINTING:f.printing,PURCHASE_TEST_PRINTING_GV:f.printingGvId,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY});
  f.state='prepared';save('fixture.private.json',f);console.log(JSON.stringify({run,state:f.state}));
 }else{
  const f=read(run+'/fixture.private.json');assert.equal(f.project,project);assert.ok(f.email.endsWith('@purchase-device.invalid'));assert.notEqual(f.state,'restored');
  if(f.owner)assert.equal((await q('select email from auth.users where id=$1',[f.owner]))[0]?.email,f.email);
  if(mode==='disable'){
   assert.equal(f.state,'prepared');const report=read(run+'/phase-1/device-response.json');assert.equal(report.phase,'pending_after_commit');assert.equal(report.owner,f.owner);
   assert.equal((await q('select count(*)::int n from vendor_sales_cart_receipts where owner_id=$1',[f.owner]))[0].n,1);
   await q('begin');await q('update vendor_purchase_control set enabled=false');await q('update vendor_sales_cart_control set enabled=false');await q('update vendor_receipt_cloud_control set enabled=false');await q('commit');
   f.state='disabled';save('fixture.private.json',f);
  }else if(mode==='verify'){
   assert.equal(f.state,'disabled');const a=read(run+'/phase-1/device-response.json'),b=read(run+'/phase-2/device-response.json');
   assert.equal(a.phase,'pending_after_commit');assert.equal(b.phase,'recovered_after_process_restart');assert.equal(a.owner,f.owner);assert.equal(b.owner,f.owner);assert.equal(a.requestId,b.requestId);
   assert.ok(a.noEarlyIntake&&a.heldReload&&b.accountClosed&&b.featureOff&&b.exactPending);assert.equal(b.completionCalls,0);assert.equal(a.presetChosen,true);assert.equal(b.presetRetained,true);assert.equal(a.presetId,b.presetId);
   assert.ok(a.policyTierProved&&a.policyRoundingProved&&a.policyDefaultSaved&&b.policyDefaultRetained);assert.equal(a.policyVersion,2);assert.equal(b.policyVersion,2);
   const rows=await q('select request_id,receipt from vendor_sales_cart_receipts where owner_id=$1',[f.owner]);assert.equal(rows.length,1);assert.equal(rows[0].request_id,a.requestId);
   const receipt=rows[0].receipt;assert.equal(receipt.kind,'purchase');assert.equal(receipt.purchaseMinor,650);assert.equal(receipt.items.length,2);
   const copies=await q('select id,card_print_id,card_printing_id,acquisition_cost::text amount,acquisition_currency currency from vault_item_instances where user_id=$1 order by acquisition_cost',[f.owner]);assert.equal(copies.length,2);
   assert.deepEqual(copies.map(c=>Number(c.amount)),[0,6.5]);for(const c of copies){assert.equal(c.currency,'USD');assert.equal(c.card_print_id,f.card);assert.equal(c.card_printing_id,f.printing);assert.ok(receipt.items.some(i=>i.instanceId===c.id));}
   assert.equal((await q('select count(*)::int n from vendor_sale_cost_snapshots where owner_id=$1',[f.owner]))[0].n,0);await retain(f);
   save('database-readback.json',{status:'passed',copies:2,costs:['USD0.00','USD6.50'],receipts:1,saleSnapshots:0,retainedTables:tables.length,productionWrites:0});f.state='verified';save('fixture.private.json',f);
  }else{
   await q('begin');await q('update vendor_purchase_control set enabled=$1',[f.flags.purchase]);await q('update vendor_sales_cart_control set enabled=$1',[f.flags.cart]);await q('update vendor_receipt_cloud_control set enabled=$1',[f.flags.cloud]);await q('update vendor_cost_evidence_control set capture_enabled=$1,edit_enabled=$2',[f.flags.capture,f.flags.edit]);await q('commit');
   assert.deepEqual((await q(flagsSql))[0],f.flags);await retain(f);const counts=(await q('select (select count(*)::int from vault_item_instances) copies,(select count(*)::int from auth.users) users'))[0];
   save('retention.json',{status:'passed',flagsRestored:true,retainedTables:tables.length,...counts,productionWrites:0});f.previousState=f.state;f.state='restored';save('fixture.private.json',f);
  }
  console.log(JSON.stringify({run,state:f.state}));
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
