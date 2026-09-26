// Synthetic database concurrency/permission proof, only the dedicated 290xx lab.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const packageReplay=process.argv[2]==='--package';
const {root,fixture,project,guard,hash,sql}=await import(packageReplay?'./storefront_production_package_lab_v1.mjs':'./storefront_production_lab_v1.mjs');
const require=createRequire('C:/gv_store_billing_20260919/package.json');
const {Client}=require('pg');
assert.ok(process.argv.length===2||(process.argv.length===3&&packageReplay));guard({full:true});
const reportFile=path.join(root,packageReplay?'docs/audits/storefront_production_package_v1/scan-admission.json':'docs/audits/storefront_production_20260926/scan-admission.json');
assert.ok(!fs.existsSync(reportFile));
const name='20260926180000_vendor_scan_admission_v1.sql',bytes=fs.readFileSync(path.join(root,packageReplay?'docs/audits/storefront_production_package_v1/historical_migrations':'supabase/migrations',name));
if(!packageReplay){
fs.writeFileSync(path.join(fixture,'supabase/migrations',name),bytes,{flag:'wx'});
const env={...process.env,DO_NOT_TRACK:'1'};for(const key of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(key))delete env[key];
const run=spawnSync('supabase',['migration','up','--local','--include-all','--yes','--workdir',fixture,'--network-id',project],{cwd:fixture,env,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:4*1024*1024});
fs.writeFileSync(path.join(fixture,'scan-admission-migration.log'),(run.stdout??'')+(run.stderr??''),{flag:'wx'});
assert.equal(run.status,0,'Inspect local migration error; no automatic retries');
}
const connect=async()=>{const client=new Client({host:'127.0.0.1',port:29022,user:'postgres',password:'postgres',database:'postgres'});await client.connect();return client;};
const db=await connect(),users=[randomUUID(),randomUUID(),randomUUID()],checks=[];
const q=(s,args=[])=>db.query(s,args);
const acquire=async(id,client=db)=>(await client.query('select vendor_scan_acquire_v1($1) as result',[id])).rows[0].result;
const release=async id=>q('select vendor_scan_release_v1($1)',[id]);
const check=async(label,work)=>{await work();checks.push(label);console.log('PASS '+label);};
try{
  await check('disabled by default and no client access',async()=>{
    assert.equal(await acquire(users[0]),null);
    for(const role of ['anon','authenticated']){
      await q(`set role ${role}`);
      await assert.rejects(q('select vendor_scan_acquire_v1($1)',[users[0]]),e=>e.code==='42501');
      await assert.rejects(q('select * from vendor_scan_leases'),e=>e.code==='42501');
      await assert.rejects(q('select vendor_scan_release_v1($1)',[randomUUID()]),e=>e.code==='42501');
      await q('reset role');
    }
    await assert.rejects(q('update vendor_scan_control set enabled=true'),e=>e.code==='23514');
  });
  for(const [i,id] of users.entries()){
    await q("insert into auth.users(id,email,raw_user_meta_data) values($1,$2,'{}')",[id,`production-scan-${i}-${id}@example.invalid`]);
    await q("insert into vendor_stores(owner_id,slug,display_name) values($1,$2,'Synthetic scan owner')",[id,`scan-${id}`]);
  }
  await q("update vendor_scan_control set enabled=true,database_ref='ycdxbpibncqcchqiihfz',artifact_sha256=repeat('a',64),metadata_sha256=repeat('b',64),feature_manifest_sha256=repeat('c',64),global_concurrency=2");
  await check('requires active store package and rollout',async()=>{
    assert.equal(await acquire(users[0]),null);
    for(const id of users)await q("insert into user_entitlements(user_id,tier,features) values($1,'vendor','{\"store_app\":true}')",[id]);
    assert.equal(await acquire(users[0]),null);await q('update vendor_store_rollout set app_enabled=true');
    assert.equal(await acquire(randomUUID()),null);
  });
  await check('concurrent servers cannot exceed the global limit',async()=>{
    const clients=await Promise.all(users.map(()=>connect()));
    try{const results=await Promise.all(users.map((id,i)=>acquire(id,clients[i])));assert.equal(results.filter(Boolean).length,2);assert.equal((await q('select count(*) from vendor_scan_leases')).rows[0].count,'2');for(const r of results.filter(Boolean))await release(r.lease);}
    finally{await Promise.all(clients.map(c=>c.end()));}
  });
  await check('one active worker per owner across processes, idempotent release',async()=>{
    const clients=await Promise.all([connect(),connect()]);
    try{const results=await Promise.all(clients.map(c=>acquire(users[0],c)));assert.equal(results.filter(Boolean).length,1);await release(results.find(Boolean).lease);await release(results.find(Boolean).lease);}
    finally{await Promise.all(clients.map(c=>c.end()));}
  });
  await check('minute and day limits persist after worker release',async()=>{
    await q('update vendor_scan_control set per_minute=1,per_day=2');await q('delete from vendor_scan_usage');
    const a=await acquire(users[0]);assert.ok(a);await release(a.lease);assert.equal(await acquire(users[0]),null);
    await q("update vendor_scan_usage set minute_start=minute_start-interval '1 minute'");
    const b=await acquire(users[0]);assert.ok(b);await release(b.lease);
    await q("update vendor_scan_usage set minute_start=minute_start-interval '1 minute'");assert.equal(await acquire(users[0]),null);
    await q("update vendor_scan_usage set day_start=day_start-interval '1 day'");
    const c=await acquire(users[0]);assert.ok(c);await release(c.lease);
  });
  await check('expired crashed workers recover and downgrade rejects the next request',async()=>{
    await q('update vendor_scan_control set per_minute=50,per_day=2000');
    const a=await acquire(users[0]);assert.ok(a);await q("update vendor_scan_leases set expires_at=clock_timestamp()-interval '1 second'");
    const b=await acquire(users[0]);assert.ok(b);assert.notEqual(a.lease,b.lease);await release(a.lease);assert.equal(await acquire(users[0]),null);
    await release(b.lease);await q('update user_entitlements set is_active=false where user_id=$1',[users[0]]);assert.equal(await acquire(users[0]),null);
    await q('update vendor_scan_control set enabled=false');assert.equal(await acquire(users[1]),null);
  });
}finally{
  await q('reset role');
  await q('update vendor_scan_control set enabled=false,global_concurrency=4,per_minute=50,per_day=2000,database_ref=null,artifact_sha256=null,metadata_sha256=null,feature_manifest_sha256=null');
  await q('update vendor_store_rollout set app_enabled=false');
  await q('delete from auth.users where id=any($1::uuid[])',[users]);await db.end();
}
assert.equal(sql("select (select count(*) from auth.users)||'|'||(select count(*) from vendor_stores)||'|'||(select count(*) from vendor_scan_usage)||'|'||(select count(*) from vendor_scan_leases)||'|'||(select enabled::text from vendor_scan_control);"),'0|0|0|0|false');
const report={at:new Date().toISOString(),status:'passed',project,migration:name,migrationSha256:hash(bytes),applied:packageReplay?401:419,checks,syntheticUsersRemoved:true,productionWrites:0,rolloutEnabled:false};
fs.writeFileSync(reportFile,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({status:'passed',checks:checks.length,productionWrites:0}));
