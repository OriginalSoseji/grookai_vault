import './vendor_storefront_network_guard.cjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
assert.equal(process.argv.length,2);
const root='.local/storefront/supabase-verification';
const cfg=JSON.parse(fs.readFileSync(root+'/status-private.json'));
assert.equal(cfg.API_URL,'http://127.0.0.1:16421');
assert.equal(new URL(cfg.DB_URL).hostname,'127.0.0.1');assert.equal(new URL(cfg.DB_URL).port,'16422');
const db=new pg.Client({connectionString:cfg.DB_URL});await db.connect();
const f={run:Date.now(),users:{}};
try{
 assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
 assert.equal((await db.query('select count(*) n from supabase_migrations.schema_migrations')).rows[0].n,'397');
 for(const role of ['owner','other','visitor']){
  const c=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false}});
  const email=`desktop-${role}-${f.run}@fixture.invalid`,password=`Local-${randomUUID()}!`;
  const {data,error}=await c.auth.signUp({email,password});assert.ifError(error);
  f.users[role]={email,password,id:data.user.id};
  await db.query('insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,$3,true,true) on conflict(user_id) do update set slug=excluded.slug,display_name=excluded.display_name,public_profile_enabled=true,vault_sharing_enabled=true',[data.user.id,`desktop-${role}-${f.run}`,`Desktop ${role}`]);
  if(role!=='visitor')await db.query("insert into user_entitlements(user_id,tier,role,features) values($1,'vendor','vendor',$2)",[data.user.id,{store_app:true,store_web:role==='owner'}]);
 }
 await db.query('update vendor_store_rollout set app_enabled=true,web_enabled=true,custom_enabled=true');
 const ids={set:randomUUID(),parent:randomUUID(),printing:randomUUID(),legacy:randomUUID(),copy:randomUUID(),unassigned:randomUUID()};
 f.gvvis={copy:`GVVI-DESK${f.run}-000001`,unassigned:`GVVI-DESK${f.run}-000002`};
 const code=`desk${f.run}`;const gv=`GV-PK-${code.toUpperCase()}-001`;
 await db.query("insert into sets(id,code,name,game) values($1,$2,'Desktop synthetic set','pokemon')",[ids.set,code]);
 await db.query("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Desktop Pikachu','001',$3,$4,'missing')",[ids.parent,ids.set,code,gv]);
 await db.query("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[ids.printing,ids.parent,gv+'-NORMAL']);
 await db.query("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Desktop Pikachu',$4)",[ids.legacy,f.users.owner.id,ids.parent,gv]);
 for(const key of ['copy','unassigned'])await db.query("insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label) values($1,$2,$3,$4,$5,$6,'sell','asking',25,'USD','NM')",[ids[key],f.users.owner.id,ids.parent,key==='copy'?ids.printing:null,ids.legacy,f.gvvis[key]]);
 f.ids=ids;f.slug=`desktop-shop-${f.run}`;
 fs.writeFileSync(root+'/desktop-private.json',JSON.stringify(f,null,2));
 console.log('Created three synthetic desktop accounts and two owned copies. Credentials remain ignored.');
}finally{await db.end();}
