// Real database roles and competing transactions, exclusively in the empty lab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {guard,audit,hash,root,migration} from './storefront_production_trial_lab_v1.mjs';
assert.equal(process.argv.length,2);guard();
const file=path.join(audit,'runtime.json');assert.ok(!fs.existsSync(file));
const require=createRequire('C:/gv_store_billing_20260919/package.json'),{Client}=require('pg');
const connect=async()=>{const db=new Client({host:'127.0.0.1',port:29022,user:'postgres',password:'postgres',database:'postgres'});await db.connect();return db;};
const db=await connect(),users=Array.from({length:4},()=>randomUUID()),invitations=[],checks=[];
const q=(s,args=[])=>db.query(s,args),caps=async id=>(await q('select vendor_store_capabilities_v1($1) v',[id])).rows[0].v;
const checked=async(label,work)=>{await work();checks.push(label);console.log('PASS '+label);};
async function asUser(client,id,query,args=[]){await client.query('begin');try{await client.query('set local role authenticated');await client.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);const r=await client.query(query,args);await client.query('commit');return r;}catch(e){await client.query('rollback');throw e;}}
const activate=(id,code,client=db)=>asUser(client,id,'select vendor_store_trial_activate_v1($1) v',[code]);
async function invite(max){const code=randomBytes(32).toString('hex'),id=randomUUID();await q("insert into vendor_store_trial_invites(id,code_hash,expires_at,max_members) values($1,$2,now()+interval '14 days',$3)",[id,createHash('sha256').update(code).digest('hex'),max]);invitations.push(id);return{id,code};}
try{
  for(const [n,id] of users.entries())await q("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[id,`store-trial-${n}-${id}@example.invalid`]);
  const first=await invite(1),second=await invite(10);
  await checked('disabled rollout, anonymous access and direct table mutations denied',async()=>{
    await assert.rejects(activate(users[0],first.code),e=>e.code==='42501');
    await q('set role anon');await assert.rejects(q('select vendor_store_trial_activate_v1($1)',[first.code]),e=>e.code==='42501');await q('reset role');
    for(const sql of ['select * from vendor_store_trial_invites','select * from vendor_store_trial_members',"insert into vendor_store_trial_invites(code_hash,expires_at,max_members) values(repeat('a',64),now(),1)"])
      await assert.rejects(asUser(db,users[0],sql),e=>e.code==='42501');
  });
  await q('update vendor_store_rollout set app_enabled=true');
  let winner,loser;
  await checked('concurrent signup cannot exceed invitation capacity',async()=>{
    const clients=await Promise.all([connect(),connect()]);
    try{const result=await Promise.allSettled(clients.map((c,n)=>activate(users[n],first.code,c)));assert.equal(result.filter(r=>r.status==='fulfilled').length,1);winner=users[result.findIndex(r=>r.status==='fulfilled')];loser=users.find(id=>[users[0],users[1]].includes(id)&&id!==winner);}
    finally{await Promise.all(clients.map(c=>c.end()));}
    assert.equal((await q('select count(*) from vendor_store_trial_members where invite_id=$1',[first.id])).rows[0].count,'1');
  });
  await checked('activation is idempotent, app-only, and creates no store or permanent feature grant',async()=>{
    const before=(await q('select * from vendor_store_trial_members where owner_id=$1',[winner])).rows[0];
    assert.equal((await activate(winner,first.code)).rows[0].v.existing,true);
    assert.deepEqual((await q('select * from vendor_store_trial_members where owner_id=$1',[winner])).rows[0],before);
    assert.deepEqual(await caps(winner),{store_app:true,store_web:false});
    assert.equal((await q('select count(*) from vendor_stores')).rows[0].count,'0');
    const e=(await q('select tier,role,features,billing_plan from user_entitlements where user_id=$1',[winner])).rows[0];assert.deepEqual(e,{tier:'free',role:'collector',features:{},billing_plan:null});
    await assert.rejects(activate(loser,first.code),e=>e.code==='42501');
  });
  await checked('expired trials deny direct writes and cannot renew; retained owner data stays readable',async()=>{
    await asUser(db,winner,'select vendor_store_save_v1($1,$2,$3)',[`trial-${winner}`,'Trial store','']);
    await q("update vendor_store_trial_members set expires_at=now()-interval '1 second' where owner_id=$1",[winner]);
    assert.deepEqual(await caps(winner),{store_app:false,store_web:false});
    await assert.rejects(asUser(db,winner,'select vendor_store_save_v1($1,$2,$3)',[`trial-${winner}`,'Changed','']),e=>e.code==='42501');
    await assert.rejects(activate(winner,second.code),e=>e.code==='42501');
    const owner=(await asUser(db,winner,'select vendor_store_owner_v1() v')).rows[0].v;assert.equal(owner.store.display_name,'Trial store');assert.equal(owner.capabilities.store_app,false);
  });
  await checked('revocation removes access immediately; forged and expired codes grant nothing',async()=>{
    await activate(users[2],second.code);assert.equal((await caps(users[2])).store_app,true);
    await q('update vendor_store_trial_invites set revoked=true where id=$1',[second.id]);assert.equal((await caps(users[2])).store_app,false);
    await assert.rejects(activate(loser,randomBytes(32).toString('hex')),e=>e.code==='42501');
    await assert.rejects(activate(loser,'bad'),e=>e.code==='42501');
    const expired=await invite(1);await q("update vendor_store_trial_invites set expires_at=now()-interval '1 second' where id=$1",[expired.id]);await assert.rejects(activate(loser,expired.code),e=>e.code==='42501');
  });
  await checked('existing managed entitlement is preserved and cannot be replaced by an invite',async()=>{
    await q("insert into user_entitlements(user_id,tier,role,features,source) values($1,'founder_admin','founder','{\"store_app\":true,\"store_web\":true}','manual')",[users[3]]);
    const before=(await q('select * from user_entitlements where user_id=$1',[users[3]])).rows;
    const third=await invite(1);await assert.rejects(activate(users[3],third.code),e=>e.code==='42501');assert.deepEqual((await q('select * from user_entitlements where user_id=$1',[users[3]])).rows,before);assert.deepEqual(await caps(users[3]),{store_app:true,store_web:true});
  });
  await checked('verified paid window can supersede expiration without converting trial features into manual grants',async()=>{
    await q("update user_entitlements set billing_plan='store_web',billing_paid_from=now()-interval '1 day',billing_paid_through=now()+interval '1 day' where user_id=$1",[winner]);
    assert.deepEqual(await caps(winner),{store_app:true,store_web:true});
    await q("update user_entitlements set billing_paid_from=now()-interval '2 days',billing_paid_through=now()-interval '1 day' where user_id=$1",[winner]);assert.deepEqual(await caps(winner),{store_app:false,store_web:false});
  });
}finally{
  await q('reset role');await q('update vendor_store_rollout set app_enabled=false');
  await q('delete from auth.users where id=any($1::uuid[])',[users]);await q('delete from vendor_store_trial_invites where id=any($1::uuid[])',[invitations]);await db.end();
}
guard();const report={at:new Date().toISOString(),status:'passed',checks,migration,migrationSha256:hash(fs.readFileSync(path.join(root,'supabase/migrations',migration))),productionWrites:0,syntheticDataRemoved:true};
fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({status:'passed',checks:checks.length,productionWrites:0}));
