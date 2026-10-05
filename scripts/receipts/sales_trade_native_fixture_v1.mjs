// Real local Auth + PostgREST + concurrent transactions; never production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const root='C:/gv_sales_trade_ins_20261003',project='sales-trade-full-427-v2-20261003';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const fixture='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/full-427-v2';
const req=createRequire('C:/gv_sales_trade_ins_20261003/package.json');
const web=createRequire('C:/gv_sales_trade_ins_20261003/apps/web/package.json');
const {Client}=req('pg'),{createClient}=web('@supabase/supabase-js');
// Bind mutations to the exact completed, isolated replay before reading credentials.
const freeze=JSON.parse(fs.readFileSync(fixture+'/freeze.json'));
const replay=JSON.parse(fs.readFileSync(fixture+'/replay-result.json'));
assert.equal(freeze.project,project);assert.equal(replay.project,project);
assert.equal(replay.status,'passed');assert.equal(replay.migrations,427);
assert.equal(replay.fullReplay,true);assert.equal(replay.noOpPush,true);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
assert.equal(digest(fixture+'/supabase/config.toml'),freeze.configSha256);
for(const [name,sha] of Object.entries(freeze.sourceHashes)){
 assert.equal(digest(root+'/supabase/migrations/'+name),sha,name);
 assert.equal(digest(fixture+'/supabase/migrations/'+name),sha,name);
}
const inspect=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',windowsHide:true}));
const database=inspect('inspect','supabase_db_'+project)[0];
assert.equal(database.State.Running,true);
assert.equal(database.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
assert.deepEqual(Object.keys(database.NetworkSettings.Networks),[project]);
assert.equal(inspect('network','inspect',project)[0].Internal,true);
const relay=inspect('inspect',project+'-relay')[0];assert.equal(relay.State.Running,true);
for(const port of [65300,65301])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',fixture],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
// CLI network is internal; all callers use only the task-specific loopback relay.
cfg.API_URL='http://127.0.0.1:65301';
cfg.DB_URL=new URL(cfg.DB_URL);cfg.DB_URL.hostname='127.0.0.1';cfg.DB_URL.port='65300';cfg.DB_URL=cfg.DB_URL.href;
const db=new Client({connectionString:cfg.DB_URL});await db.connect();
assert.equal(typeof cfg.SECRET_KEY,'string');assert.equal(typeof cfg.PUBLISHABLE_KEY,'string');
const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false}});
const publicKey=cfg.PUBLISHABLE_KEY;
const create=()=>createClient(cfg.API_URL,publicKey,{auth:{persistSession:false}});
const out='C:/grookai_vault_operator_artifacts/sales_trade_ins_20261003/native-v1',mode=process.argv[2];fs.mkdirSync(out,{recursive:true});
try{
 if(mode==='prepare'){
  assert.ok(!fs.existsSync(out+'/native-fixture.private.json'));assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
  const f={set:randomUUID(),card:randomUUID(),anchor:randomUUID(),copy:randomUUID(),printing:randomUUID(),email:randomUUID()+'@sales-trade-ipad.invalid',password:randomUUID()+'Aa9!'};
  const u=await admin.auth.admin.createUser({email:f.email,password:f.password,email_confirm:true});assert.equal(u.error,null);f.owner=u.data.user.id;
  fs.writeFileSync(out+'/native-fixture.private.json',JSON.stringify(f),{flag:'wx'});
  await db.query('begin');
  await db.query("insert into sets(id,code,name,game) values($1,$2,'iPad test set','pokemon')",[f.set,f.set]);
  await db.query("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status,tcgplayer_id) values($1,(select id from games where code='pokemon'),$2,'Synthetic trade Pikachu','1','GV-PK-TRADEIPAD-001','missing','12345')",[f.card,f.set]);
  await db.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,(select key from finish_keys where is_active order by sort_order limit 1),'GV-PK-TRADEIPAD-001-STD')",[f.printing,f.card]);
  await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic trade Pikachu','GV-PK-TRADEIPAD-001')",[f.anchor,f.owner,f.card]);
  await db.query("insert into vault_item_instances(id,user_id,card_print_id,legacy_vault_item_id,gv_vi_id,card_printing_id,asking_price_amount,asking_price_currency,pricing_mode,intent) values($1,$2,$3,$4,'GVVI-TRADEIPAD-000001',$5,100,'USD','asking','sell')",[f.copy,f.owner,f.card,f.anchor,f.printing]);
  await db.query('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true;update vendor_sales_trade_control set enabled=true');await db.query('commit');
  fs.writeFileSync(out+'/native-defines.private.json',JSON.stringify({SALES_TEST_URL:cfg.API_URL,SALES_TEST_KEY:cfg.PUBLISHABLE_KEY,SALES_TEST_EMAIL:f.email,SALES_TEST_PASSWORD:f.password,SUPABASE_URL:cfg.API_URL,SUPABASE_PUBLISHABLE_KEY:cfg.PUBLISHABLE_KEY,GROOKAI_WEB_BASE_URL:'http://127.0.0.1:65310'}),{flag:'wx'});
  console.log(JSON.stringify({status:'prepared',localOnly:true}));
 }else if(mode==='verify'){
  const f=JSON.parse(fs.readFileSync(out+'/native-fixture.private.json'));
  const receipt=(await db.query('select receipt from vendor_sales_cart_receipts where owner_id=$1',[f.owner])).rows;assert.equal(receipt.length,1);assert.equal(receipt[0].receipt.totalMinor,10000);assert.equal(receipt[0].receipt.items.length,2);
  assert.ok((await db.query('select archived_at from vault_item_instances where id=$1',[f.copy])).rows[0].archived_at);
  assert.equal((await db.query('select count(*)::int n from vault_item_instance_dispositions where user_id=$1',[f.owner])).rows[0].n,1);
  assert.equal(receipt[0].receipt.tradeIn.totalCreditMinor,5000);assert.equal(receipt[0].receipt.tradeIn.balanceMinor,5000);assert.equal(receipt[0].receipt.tradeIn.items.length,2);
  assert.equal((await db.query("select count(*)::int n from vault_item_instances where user_id=$1 and archived_at is null and intent='hold'",[f.owner])).rows[0].n,1);
  fs.writeFileSync(out+'/native-readback.json',JSON.stringify({status:'passed',at:new Date().toISOString(),actualNativeAuth:true,receiptTotal:10000,tradeCredit:5000,balance:5000,lines:2,archivedCopies:1,incomingHoldCopies:1,productionWrites:0}),{flag:'wx'});console.log('Native database readback passed');
 }else if(mode==='cleanup'){
  const f=JSON.parse(fs.readFileSync(out+'/native-fixture.private.json'));await db.query('begin');await db.query('set local session_replication_role=replica');
  await db.query('delete from vault_item_instance_dispositions where user_id=$1',[f.owner]);await db.query('delete from vault_item_instances where user_id=$1',[f.owner]);await db.query('delete from vault_items where user_id=$1',[f.owner]);await db.query('delete from pricing_watch where card_print_id=$1',[f.card]);await db.query('delete from card_printings where id=$1',[f.printing]);await db.query('delete from card_prints where id=$1',[f.card]);await db.query('delete from sets where id=$1',[f.set]);await db.query('delete from card_events where actor_user_id=$1 or subject_user_id=$1',[f.owner]);await db.query('set local session_replication_role=origin');await db.query('delete from auth.users where id=$1',[f.owner]);await db.query('update vendor_receipt_cloud_control set enabled=false;update vendor_sales_cart_control set enabled=false;update vendor_sales_trade_control set enabled=false');await db.query('commit');console.log('Only synthetic iPad fixtures removed; controls off');
 }else throw Error('Unknown operation');
}finally{await db.end();}
