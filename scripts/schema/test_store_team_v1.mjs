// Real role/CAS/concurrency proof, fixed to the dedicated synthetic 294xx lab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes} from 'node:crypto';
import {guard,audit,fixture,hash,root,migration} from './replay_store_team_v1.mjs';
assert.equal(process.argv.length,2);guard();
const require=createRequire('C:/gv_store_billing_20260919/package.json'),{Client}=require('pg');
const connect=async()=>{const db=new Client({host:'127.0.0.1',port:29422,user:'postgres',password:'postgres',database:'postgres'});await db.connect();return db;};
const db=await connect(),users=Array.from({length:5},()=>randomUUID()),[owner,manager,other,unverified,reader]=users;
const ids=Object.fromEntries(['store','set','card','printing','legacy','copy','hold','foreign','unselected'].map(k=>[k,randomUUID()]));
const checks=[],q=(text,args=[])=>db.query(text,args);
const checked=async(label,work)=>{await work();checks.push(label);console.log('PASS '+label);};
async function asUser(client,id,text,args=[]){await client.query('begin');try{await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);const result=await client.query(text,args);await client.query('commit');return result.rows[0]?.v;}catch(e){await client.query('rollback');throw e;}}
const run=(id,text,args=[])=>asUser(db,id,text,args);
const denied=work=>assert.rejects(work,e=>e.code==='42501');
const workspace=id=>run(id,'select vendor_store_team_workspace_v1($1) v',[ids.store]);
const change=(action,subject=null,permissions=null,email=null)=>run(owner,'select vendor_store_team_change_v1($1,$2,$3,$4) v',[action,email,subject,permissions]);
const invite=(id,permissions)=>change('invite',null,permissions,`${id}@example.invalid`);
const accept=(id,token,client=db)=>asUser(client,id,'select vendor_store_team_accept_v1($1) v',[token]);
const version=async()=> (await q('select updated_at::text v from vault_item_instances where id=$1',[ids.copy])).rows[0].v;
const edit=async(id,action,data,expected,copy=ids.copy)=>run(id,'select vendor_store_team_copy_v1($1,$2,$3,$4,$5) v',[ids.store,copy,action,expected??await version(),data]);
const reportFile=path.join(audit,`runtime-${Date.now()}.json`);
fs.writeFileSync(path.join(fixture,path.basename(reportFile)+'.fixtures-private.json'),JSON.stringify({users,ids}),{flag:'wx'});
try{
  for(const id of users)await q("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,'{}')",[id,`${id}@example.invalid`,id===unverified?null:new Date()]);
  await q("insert into user_entitlements(user_id,tier,role,features,source) values($1,'vendor','vendor','{\"store_app\":true,\"store_web\":true}','manual')",[owner]);
  await q("insert into vendor_stores(id,owner_id,slug,display_name) values($1,$2,$3,'Synthetic team store')",[ids.store,owner,`team-${owner}`]);
  await q("insert into public_profiles(user_id,slug,display_name,public_profile_enabled,vault_sharing_enabled) values($1,$2,'Synthetic owner',true,true) on conflict(user_id) do update set public_profile_enabled=true,vault_sharing_enabled=true",[owner,`owner-${owner}`]);
  await checked('disabled-by-default; anonymous, foreign owner and base-table writes denied',async()=>{
    await denied(invite(manager,['pricing']));await denied(workspace(other));
    for(const table of ['vendor_store_team_members','vendor_store_team_invites','vendor_store_team_copies','vendor_store_team_events','vendor_store_team_control'])await denied(run(manager,`select * from ${table}`));
    await q('set role anon');await denied(q('select vendor_store_team_owner_v1()'));await q('reset role');
    await denied(run(other,"select vendor_store_team_change_v1('invite','x@example.invalid',null,array['pricing'])"));
  });
  await q('update vendor_store_rollout set app_enabled=true,web_enabled=true');await q('update vendor_store_team_control set enabled=true');
  let token;
  await checked('explicit permissions; email binding; verified account; forged/expired/cancelled invitations',async()=>{
    await assert.rejects(invite(manager,[]));await assert.rejects(invite(manager,['billing']));await assert.rejects(invite(owner,['pricing']));
    token=(await invite(manager,['pricing'])).token;assert.match(token,/^[0-9a-f]{64}$/);
    await denied(accept(other,token));await denied(accept(manager,randomBytes(32).toString('hex')));
    const pending=(await invite(unverified,['inventory'])).token;await denied(accept(unverified,pending));
    const expired=(await invite(reader,['inventory'])).token;await q("update vendor_store_team_invites set expires_at=now()-interval '1 second' where email=$1",[`${reader}@example.invalid`]);await denied(accept(reader,expired));
    const cancelled=await invite(reader,['inventory']);const id=(await q('select id from vendor_store_team_invites where email=$1 and revoked_at is null order by created_at desc limit 1',[`${reader}@example.invalid`])).rows[0].id;
    await change('cancel',id);await denied(accept(reader,cancelled.token));
  });
  await checked('concurrent acceptance credits one membership and one audit event',async()=>{
    const clients=await Promise.all([connect(),connect()]);try{const values=await Promise.all(clients.map(client=>accept(manager,token,client)));assert.deepEqual(values,[ids.store,ids.store]);}finally{await Promise.all(clients.map(client=>client.end()));}
    assert.equal((await q('select count(*) from vendor_store_team_members where user_id=$1',[manager])).rows[0].count,'1');
    assert.equal((await q("select count(*) from vendor_store_team_events where action='accept' and actor_id=$1",[manager])).rows[0].count,'1');
    assert.deepEqual((await workspace(manager)).permissions,['pricing']);
    await denied(run(manager,"select vendor_store_team_change_v1('revoke',null,$1)",[manager]));
    await denied(run(manager,'select vendor_store_team_owner_v1()'));
  });
  const code=`team${Date.now()}`,gv=`GV-PK-${code.toUpperCase()}-001`;
  await q("insert into sets(id,code,name,game) values($1,$2,'Synthetic team set','pokemon')",[ids.set,code]);
  await q("insert into card_prints(id,game_id,set_id,name,number,set_code,gv_id,image_status) values($1,(select id from games where code='pokemon'),$2,'Synthetic team Pikachu','001',$3,$4,'missing')",[ids.card,ids.set,code,gv]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id) values($1,$2,'normal',$3)",[ids.printing,ids.card,gv+'-NORMAL']);
  await q("insert into vault_items(id,user_id,card_id,name,gv_id) values($1,$2,$3,'Synthetic team Pikachu',$4)",[ids.legacy,owner,ids.card,gv]);
  for(const key of ['copy','hold','foreign','unselected'])await q("insert into vault_item_instances(id,user_id,card_print_id,card_printing_id,legacy_vault_item_id,gv_vi_id,intent,pricing_mode,asking_price_amount,asking_price_currency,condition_label) values($1,$2,$3,$4,$5,$6,$7,'asking',25,'USD','NM')",[ids[key],key==='foreign'?other:owner,ids.card,ids.printing,key==='foreign'?null:ids.legacy,`GVVI-${ids[key].toUpperCase()}`,key==='hold'?'hold':'sell']);
  for(const key of ['copy','hold','foreign'])await q('insert into vendor_store_items(store_id,instance_id) values($1,$2)',[ids.store,ids[key]]);
  await checked('workspace excludes held, foreign, unselected copies and private fields',async()=>{
    const w=await workspace(manager);assert.equal(w.total,1);assert.deepEqual(w.items.map(i=>i.id),[ids.copy]);
    for(const field of ['purchase_price_amount','notes','user_id','acquisition_cost'])assert.ok(!(field in w.items[0]));
    for(const key of ['hold','foreign','unselected'])await denied(edit(manager,'price',{amount:30,currency:'USD'},await version(),ids[key]));
  });
  await checked('pricing grant cannot change condition, listing, branding or owner publication',async()=>{
    await edit(manager,'price',{amount:30,currency:'USD'});assert.equal(Number((await q('select asking_price_amount from vault_item_instances where id=$1',[ids.copy])).rows[0].asking_price_amount),30);
    await denied(edit(manager,'condition',{condition:'LP'}));await denied(edit(manager,'listing',{selected:false}));
    await denied(run(manager,'select vendor_store_team_brand_v1($1,now(),$2,$3)',[ids.store,'Changed','']));
    await denied(run(manager,"select vendor_store_publish_v1('web',true)"));
  });
  await checked('optimistic writes reject stale versions and leave newer data intact',async()=>{
    const stale=await version();await edit(manager,'price',{amount:31,currency:'USD'},stale);
    await assert.rejects(edit(manager,'price',{amount:32,currency:'USD'},stale),e=>e.code==='PT409');
    assert.equal(Number((await q('select asking_price_amount from vault_item_instances where id=$1',[ids.copy])).rows[0].asking_price_amount),31);
  });
  await checked('permission updates allow only the selected actions; unlisting retains relisting scope',async()=>{
    await change('permissions',manager,['inventory','listings','branding']);await denied(edit(manager,'price',{amount:32,currency:'USD'}));
    await edit(manager,'condition',{condition:'LP'});await edit(manager,'listing',{selected:false});assert.equal((await workspace(manager)).items[0].selected,false);
    await edit(manager,'listing',{selected:true});assert.equal((await workspace(manager)).items[0].selected,true);
    const w=await workspace(manager);await run(manager,'select vendor_store_team_brand_v1($1,$2,$3,$4)',[ids.store,w.store.updated_at,'Managed name','Managed description']);
    assert.equal((await workspace(manager)).store.display_name,'Managed name');
  });
  await checked('quarantine and profile privacy prevent relisting; archive and transfer immediately remove access',async()=>{
    await edit(manager,'listing',{selected:false});
    await q("insert into card_printing_truth_reviews(card_printing_id,review_status,public_visibility,reason) values($1,'quarantined_candidate','hidden_pending_review','Synthetic test')",[ids.printing]);
    await assert.rejects(edit(manager,'listing',{selected:true}),e=>e.code==='22023');await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);
    await q('update public_profiles set vault_sharing_enabled=false where user_id=$1',[owner]);await assert.rejects(edit(manager,'listing',{selected:true}),e=>e.code==='22023');await q('update public_profiles set vault_sharing_enabled=true where user_id=$1',[owner]);
    await q('update vault_item_instances set archived_at=now() where id=$1',[ids.copy]);assert.equal((await workspace(manager)).total,0);await denied(edit(manager,'condition',{condition:'NM'}));
    await q('update vault_item_instances set archived_at=null,user_id=$1 where id=$2',[other,ids.copy]);assert.equal((await workspace(manager)).total,0);await denied(edit(manager,'condition',{condition:'NM'}));
    await q('update vault_item_instances set user_id=$1 where id=$2',[owner,ids.copy]);
  });
  await checked('branding storage is scoped to the store and permission; forged paths rejected',async()=>{
    const allowed=`${ids.store}/logo/${randomUUID()}.png`,foreign=`${randomUUID()}/logo/${randomUUID()}.png`;
    assert.equal(await run(manager,'select vendor_store_team_media_allowed_v1($1) v',[allowed]),true);
    assert.equal(await run(manager,'select vendor_store_team_media_allowed_v1($1) v',[foreign]),false);
    await denied(run(manager,"select vendor_store_team_media_v1($1,'logo',$2)",[ids.store,foreign]));
    await q("insert into storage.objects(bucket_id,name) values('vendor-store-media',$1)",[allowed]);
    await run(manager,"select vendor_store_team_media_v1($1,'logo',$2)",[ids.store,allowed]);
    assert.equal(await run(manager,"select vendor_store_team_media_path_v1($1,'logo') v",[ids.store]),allowed);
    await change('permissions',manager,['inventory']);assert.equal(await run(manager,'select vendor_store_team_media_allowed_v1($1) v',[allowed]),false);
    await denied(run(manager,"select vendor_store_team_media_path_v1($1,'logo')",[ids.store]));
  });
  await checked('downgrade and rollout suspension deny access; owner can revoke retained members',async()=>{
    await q('update user_entitlements set is_active=false where user_id=$1',[owner]);await denied(workspace(manager));await denied(invite(reader,['inventory']));
    assert.ok(await run(owner,'select vendor_store_team_owner_v1() v'));
    await q('update user_entitlements set is_active=true where user_id=$1',[owner]);
    await q('update vendor_store_team_control set enabled=false');await denied(workspace(manager));await change('revoke',manager);await q('update vendor_store_team_control set enabled=true');
    await denied(workspace(manager));await denied(accept(manager,token));
  });
  await checked('revocation serializes with writes and blocks subsequent edits',async()=>{
    await accept(manager,(await invite(manager,['inventory'])).token);
    const lock=await connect(),waiting=await connect();try{
      await lock.query('begin');await lock.query('select id from vendor_stores where id=$1 for update',[ids.store]);
      let finished=false;const pending=asUser(waiting,manager,'select vendor_store_team_copy_v1($1,$2,$3,$4,$5)',[ids.store,ids.copy,'condition',await version(),{condition:'NM'}]).then(()=>{finished=true;throw new Error('Revoked write allowed');},e=>{finished=true;assert.equal(e.code,'42501');});
      await lock.query('update vendor_store_team_members set revoked_at=now() where store_id=$1 and user_id=$2',[ids.store,manager]);
      assert.equal(finished,false);await lock.query('commit');await pending;await denied(workspace(manager));
    }finally{await lock.query('rollback');await Promise.all([lock.end(),waiting.end()]);}
    assert.ok((await q("select count(*) from vendor_store_team_events where actor_id=$1 and action in('price','condition','listing','branding')",[manager])).rows[0].count>0);
  });
}catch(error){fs.writeFileSync(reportFile+'.failed.json',JSON.stringify({checks,error:{message:error.message,code:error.code,stack:error.stack}},null,2),{flag:'wx'});throw error;}finally{
  await q('reset role');await q('update vendor_store_team_control set enabled=false');await q('update vendor_store_rollout set app_enabled=false,web_enabled=false');
  // These are metadata-only synthetic fixtures, no uploaded bytes. Never shared/remote.
  await q('begin');await q("set local storage.allow_delete_query='true'");await q("delete from storage.objects where bucket_id='vendor-store-media' and name like $1",[`${ids.store}/%`]);await q('commit');
  await q('delete from vault_item_instances where id=any($1::uuid[])',[[ids.copy,ids.hold,ids.foreign,ids.unselected]]);
  // Fixture-only append-only event cleanup; restore triggers before normal cascades.
  await q('begin');await q('set local session_replication_role=replica');await q('delete from card_events where actor_user_id=any($1::uuid[])',[users]);await q('set local session_replication_role=origin');await q('commit');
  await q('delete from auth.users where id=any($1::uuid[])',[users]);
  await q('delete from card_printing_truth_reviews where card_printing_id=$1',[ids.printing]);await q('delete from card_printings where id=$1',[ids.printing]);await q('delete from pricing_watch where card_print_id=$1',[ids.card]);await q('delete from card_prints where id=$1',[ids.card]);await q('delete from sets where id=$1',[ids.set]);await db.end();
}
guard();const report={at:new Date().toISOString(),status:'passed',checks,migrationSha256:hash(fs.readFileSync(path.join(root,'supabase/migrations',migration))),productionWrites:0,syntheticDataRemoved:true};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',checks:checks.length,reportFile}));
