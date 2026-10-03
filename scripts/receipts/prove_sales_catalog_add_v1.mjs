// Dedicated synthetic Auth/HTTP proof. Never accepts a remote target.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
const root='C:/gv_sales_desk_pro_20261003',project='sales-pro-full-417-v1-20261003';
const artifacts='C:/grookai_vault_operator_artifacts/sales_desk_pro_20261003';
assert.equal(process.cwd().replaceAll('\\','/'),root);
const cfg=JSON.parse(execFileSync('supabase',['status','-o','json','--workdir',artifacts+'/full-417-v1'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const url=new URL(cfg.DB_URL);url.hostname='127.0.0.1';url.port='65000';
const {Client}=createRequire(root+'/package.json')('pg');
const {createClient}=createRequire(root+'/apps/web/package.json')('@supabase/supabase-js');
assert.equal(typeof cfg.SECRET_KEY,'string');assert.equal(typeof cfg.PUBLISHABLE_KEY,'string');
const db=new Client({connectionString:url.href});await db.connect();
const admin=createClient('http://127.0.0.1:65001',cfg.SECRET_KEY,{auth:{persistSession:false}});
const client=()=>createClient('http://127.0.0.1:65001',cfg.PUBLISHABLE_KEY,{auth:{persistSession:false}});
const scalar=async(q,p=[])=>(await db.query(q,p)).rows[0];
const users=[],cards=[randomUUID(),randomUUID()],printings=[randomUUID(),randomUUID()],set=randomUUID(),checks=[];
const password=randomUUID()+'Aa9!';let failure,cleaned=false;
const out=artifacts+'/catalog-runtime-'+Date.now();fs.mkdirSync(out);
const payload=(overrides={})=>({cardId:cards[0],printingId:printings[0],condition:'NM',intent:'hold',priceMinor:null,...overrides});
const add=(c,id,p)=>c.rpc('vendor_sales_catalog_add_v1',{p_request_id:id,p_card:p});
try {
  assert.equal((await scalar('select count(*)::int n from supabase_migrations.schema_migrations')).n,417);
  assert.equal((await scalar('select count(*)::int n from auth.users')).n,0);
  assert.equal((await scalar("select current_setting('max_worker_processes') n")).n,'0');
  assert.equal((await scalar('select enabled from vendor_sales_cart_control')).enabled,false);
  const clients=[];
  for(const label of ['owner','other']) {
    const email=label+'@sales-pro.invalid';
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);users.push(created.data.user.id);
    const c=client();assert.equal((await c.auth.signInWithPassword({email,password})).error,null);clients.push(c);
  }
  const [owner,other]=clients;
  assert.equal((await add(owner,randomUUID(),payload())).error?.code,'42501');
  assert.ok((await add(client(),randomUUID(),payload())).error);
  assert.ok((await owner.from('vendor_sales_catalog_adds').select('*')).error);
  await db.query('update vendor_receipt_cloud_control set enabled=true;update vendor_sales_cart_control set enabled=true');
  await db.query("insert into sets(id,code,name,game) values($1,$2,'Sales desk synthetic','pokemon')",[set,set]);
  const finish=(await scalar('select key from finish_keys where is_active order by sort_order limit 1')).key;
  for(let i=0;i<2;i++) {
    await db.query("insert into card_prints(id,game_id,set_id,name,number,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,$3,$4,$5,'missing')",[cards[i],set,'Synthetic catalog '+i,String(i+1),'GV-PK-SALESPRO-00'+(i+1)]);
    await db.query('insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,$3,$4)',[printings[i],cards[i],finish,'GV-PK-SALESPRO-00'+(i+1)+'-STD']);
  }
  for(const bad of [payload({printingId:printings[1]}),payload({printingId:null}),payload({condition:'invented'}),payload({intent:'sell',priceMinor:0}),payload({intent:'sell',priceMinor:1.5}),{...payload(),ownerId:users[1]}]) assert.ok((await add(owner,randomUUID(),bad)).error);
  assert.equal((await scalar('select count(*)::int n from vault_item_instances')).n,0);
  checks.push('Real Auth, rollout/anonymous denial, private receipts, wrong-parent/unassigned/invalid input creates no copy');
  const id=randomUUID(),same=await Promise.all([add(owner,id,payload()),add(owner,id,payload())]);
  assert.equal(same[0].error,null);assert.equal(same[1].error,null);assert.deepEqual(same[0].data,same[1].data);
  const copy=same[0].data;assert.equal((await scalar('select count(*)::int n from vault_item_instances')).n,1);
  assert.equal(copy.cardId,cards[0]);assert.equal(copy.printingId,printings[0]);assert.ok(copy.gvviId);
  assert.equal((await add(owner,id,payload({condition:'LP'}))).error?.code,'22023');
  assert.equal((await other.rpc('vendor_sales_catalog_add_read_v1',{p_request_id:id})).data,null);
  assert.deepEqual((await owner.rpc('vendor_sales_catalog_add_read_v1',{p_request_id:id})).data,copy);
  const listing=await add(owner,randomUUID(),payload({intent:'sell',priceMinor:1234}));assert.equal(listing.error,null);
  const listingRow=await scalar('select intent,asking_price_amount,pricing_mode from vault_item_instances where id=$1',[listing.data.instanceId]);
  assert.equal(listingRow.intent,'sell');assert.equal(listingRow.pricing_mode,'asking');assert.equal(Number(listingRow.asking_price_amount),12.34);
  assert.equal((await scalar('select count(*)::int n from vendor_store_items')).n,0);
  checks.push('Concurrent identical adds produce one GVVI; changed request rejected; owner-only recovery; explicit for-sale price with no store enrollment');
  await db.query("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic proof')",[printings[0]]);
  assert.equal((await add(owner,randomUUID(),payload())).error?.code,'22023');
  assert.deepEqual((await add(owner,id,payload())).data,copy);
  await db.query('update vendor_sales_cart_control set enabled=false');
  assert.deepEqual((await add(owner,id,payload())).data,copy);
  assert.equal((await add(owner,randomUUID(),payload())).error?.code,'42501');
  checks.push('Quarantine prevents a fresh add; durable recovery still works after quarantine and rollback disablement');
  assert.equal((await scalar('select count(*)::int n from vault_item_instances')).n,2);
} catch(error) { failure=error; }
finally {
  try {
    await db.query('begin');await db.query('set local session_replication_role=replica');
    for(const table of ['vault_item_instances','vault_items'])await db.query(`delete from ${table} where user_id=any($1::uuid[])`,[users]);
    await db.query('delete from pricing_watch where card_print_id=any($1::uuid[])',[cards]);
    await db.query('delete from card_printing_truth_reviews where card_printing_id=any($1::uuid[])',[printings]);
    await db.query('delete from card_printings where id=any($1::uuid[])',[printings]);
    await db.query('delete from card_prints where id=any($1::uuid[])',[cards]);await db.query('delete from sets where id=$1',[set]);
    await db.query('delete from card_events where actor_user_id=any($1::uuid[]) or subject_user_id=any($1::uuid[])',[users]);
    await db.query('set local session_replication_role=origin');await db.query('delete from auth.users where id=any($1::uuid[])',[users]);
    await db.query('update vendor_sales_cart_control set enabled=false;update vendor_receipt_cloud_control set enabled=false');
    await db.query('commit');cleaned=true;
  } catch(error) {await db.query('rollback');failure??=error;}
  await db.end();
}
const paths=['supabase/migrations/20261003230000_sales_desk_catalog_add_v1.sql','scripts/receipts/prove_sales_catalog_add_v1.mjs'];
const result={at:new Date().toISOString(),status:failure?'failed':'passed',project,checks,cleanup:cleaned,actualAuth:true,actualHTTP:true,productionWrites:0,
  sourceHashes:Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))};
fs.writeFileSync(out+'/receipt.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));if(failure)throw failure;
