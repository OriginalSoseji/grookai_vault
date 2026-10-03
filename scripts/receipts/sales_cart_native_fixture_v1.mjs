// Bounded synthetic fixture for actual iPad integration; task lab only.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{randomUUID}from'node:crypto';
const root='C:/gv_ipad_sales_cart_20261003',out=root+'/.local/sales-cart';assert.equal(process.cwd().replaceAll('\\','/'),root);
const cfg=JSON.parse(fs.readFileSync(out+'/runtime.private.json'));assert.equal(cfg.API_URL,'http://127.0.0.1:64801');assert.equal(new URL(cfg.DB_URL).port,'64800');assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');
const {Client}=createRequire(root+'/package.json')('pg'),{createClient}=createRequire(root+'/apps/web/package.json')('@supabase/supabase-js');
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}}),mode=process.argv[2];
try{
 if(mode==='prepare'){
  assert.ok(!fs.existsSync(out+'/native-fixture.private.json'));assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
  const f={set:randomUUID(),card:randomUUID(),anchor:randomUUID(),copy:randomUUID(),email:randomUUID()+'@sales-ipad.invalid',password:randomUUID()+'Aa9!'};
  const u=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(u.error,null);f.owner=u.data.user.id;
  fs.writeFileSync(out+'/native-fixture.private.json',JSON.stringify(f),{flag:'wx'});
  await db.query('begin');
  await db.query("insert into sets(id,code,name,game) values($1,$2,'iPad test set','pokemon')",[f.set,f.set]);
  await db.query("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'iPad test Pikachu','1','GV-PK-IPADPOS-001','missing')",[f.card,f.set]);
  await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'iPad test Pikachu','GV-PK-IPADPOS-001')",[f.anchor,f.owner,f.card]);
  await db.query("insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id) values($1,$2,$3,$4,'GVVI-IPADPOS-000001')",[f.copy,f.owner,f.card,f.anchor]);
  await db.query('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true');await db.query('commit');
  fs.writeFileSync(out+'/native-defines.private.json',JSON.stringify({SALES_TEST_URL:cfg.API_URL,SALES_TEST_KEY:cfg.PUBLISHABLE_KEY,SALES_TEST_EMAIL:f.email,SALES_TEST_PASSWORD:f.password,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY}),{flag:'wx'});
  console.log(JSON.stringify({status:'prepared',localOnly:true}));
 }else if(mode==='verify'){
  const f=JSON.parse(fs.readFileSync(out+'/native-fixture.private.json'));
  const receipt=(await db.query('select receipt from vendor_sales_cart_receipts where owner_id=$1',[f.owner])).rows;assert.equal(receipt.length,1);assert.equal(receipt[0].receipt.totalMinor,2234);assert.equal(receipt[0].receipt.items.length,2);
  assert.ok((await db.query('select archived_at from vault_item_instances where id=$1',[f.copy])).rows[0].archived_at);
  assert.equal((await db.query('select count(*)::int n from vault_item_instance_dispositions where user_id=$1',[f.owner])).rows[0].n,1);
  fs.writeFileSync(out+'/native-readback.json',JSON.stringify({status:'passed',at:new Date().toISOString(),actualNativeAuth:true,receiptTotal:2234,lines:2,archivedCopies:1,productionWrites:0}),{flag:'wx'});console.log('Native database readback passed');
 }else if(mode==='cleanup'){
  const f=JSON.parse(fs.readFileSync(out+'/native-fixture.private.json'));await db.query('begin');await db.query('set local session_replication_role=replica');
  await db.query('delete from vault_item_instance_dispositions where vault_item_instance_id=$1',[f.copy]);await db.query('delete from vault_item_instances where id=$1',[f.copy]);await db.query('delete from vault_items where id=$1',[f.anchor]);await db.query('delete from pricing_watch where card_print_id=$1',[f.card]);await db.query('delete from card_prints where id=$1',[f.card]);await db.query('delete from sets where id=$1',[f.set]);await db.query('delete from card_events where actor_user_id=$1 or subject_user_id=$1',[f.owner]);await db.query('set local session_replication_role=origin');await db.query('delete from auth.users where id=$1',[f.owner]);await db.query('update vendor_receipt_cloud_control set enabled=false;update vendor_sales_cart_control set enabled=false');await db.query('commit');console.log('Only synthetic iPad fixtures removed; controls off');
 }else throw Error('Unknown operation');
}finally{await db.end();}
