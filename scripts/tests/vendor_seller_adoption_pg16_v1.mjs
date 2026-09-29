// Supplementary SQL/role/race proof in a NEW Windows PostgreSQL16 cluster.
// This does not replace the pinned Supabase17 full replay/release gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
assert.equal(process.argv.length,2);
const root='C:/gv_store_seller_link_20260928';
const dir=root+'/.local/integration/seller-adoption-v1/pg16-'+Date.now(),data=dir+'/data';
const bin='C:/Program Files/PostgreSQL/16/bin',port=57942;
const run=(name,args)=>{
 const fd=fs.openSync(dir+'/'+name+'-'+Date.now()+'.private.log','wx');
 try{return execFileSync(bin+'/'+name+'.exe',args,{encoding:'utf8',windowsHide:true,timeout:90000,stdio:['ignore',fd,fd]});}
 finally{fs.closeSync(fd);}
};
const password=randomBytes(32).toString('hex');
const digest=x=>createHash('sha256').update(x).digest('hex');
await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(port,'127.0.0.1',()=>server.close(resolve));});
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/password.private',password,{flag:'wx'});
let started=false;const clients=[],passed=[];
async function client(){const c=new pg.Client({host:'127.0.0.1',port,database:'postgres',user:'postgres',password,ssl:false});await c.connect();clients.push(c);return c;}
try {
 run('initdb',['-D',data,'-U','postgres','-A','scram-sha-256','--pwfile',dir+'/password.private','-E','UTF8','--locale=C']);
 fs.unlinkSync(dir+'/password.private');
 started=true;run('pg_ctl',['-D',data,'-l',dir+'/postgres.private.log','-o',`-h 127.0.0.1 -p ${port} -c max_worker_processes=0`,'-w','start']);
 const db=await client();const actual=(await db.query("select current_setting('data_directory') as path, current_setting('port') as port, version() as version")).rows[0];
 assert.equal(fs.realpathSync(actual.path),fs.realpathSync(data));assert.equal(actual.port,String(port));assert.match(actual.version,/PostgreSQL 16/);
 await db.query(`create schema auth; create schema extensions;
  create extension pgcrypto with schema extensions;
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public,auth,extensions to anon,authenticated,service_role;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table public.vendor_stores(id uuid primary key,owner_id uuid not null unique references auth.users(id));
  create table public.vendor_store_rollout(app_enabled boolean);insert into public.vendor_store_rollout values(true);
  create table public.vendor_account_financial_holds(owner_id uuid primary key);
  create table public.test_capabilities(owner_id uuid primary key,enabled boolean not null);
  create function public.vendor_store_capabilities_v1(p uuid) returns jsonb language sql stable as $$
   select jsonb_build_object('store_app',coalesce((select enabled from public.test_capabilities where owner_id=p),false))$$;`);
 const production=fs.readFileSync(root+'/supabase/migrations/20260926190000_vendor_storefront_production_v1.sql','utf8');
 const start=production.indexOf('create or replace function public.vendor_seller_controller_valid_v1('),end=production.indexOf('-- Private stock arbitration foundation.');
 assert.ok(start>0&&end>start);await db.query(production.slice(start,end));
 const migration=fs.readFileSync(root+'/supabase/migrations/20260928213000_vendor_seller_adoption_v1.sql','utf8');
 await db.query(migration);await db.query(migration);passed.push('migration applies and repeats on source-derived seller foundation');
 async function seed(withGrant=true){const owner=randomUUID(),store=randomUUID(),grant=randomUUID(),account='acct_'+randomBytes(12).toString('hex');
  const email='synthetic-'+owner+'@example.invalid',emailHash=digest(email);
  await db.query('insert into auth.users values($1,$2,now());',[owner,email]);
  await db.query('insert into public.vendor_stores values($1,$2)',[store,owner]);
  await db.query('insert into public.test_capabilities values($1,true)',[owner]);
  if(withGrant) await db.query(`insert into public.vendor_seller_adoption_grants(id,owner_id,store_id,stripe_account_id,connected_account_id,livemode,owner_email_sha256,approval_sha256,enabled,expires_at)
   values($1,$2,$3,'acct_platform',$4,false,$5,$6,true,now()+interval '1 hour')`,[grant,owner,store,account,emailHash,'a'.repeat(64)]);
  const checkedAt=Math.floor(Date.now()/1000);
  return {owner,store,grant,account,emailHash,evidence:{version:'vendor-seller-adoption-v1',grantId:grant,ownerId:owner,storeId:store,
   platformAccountId:'acct_platform',connectedAccountId:account,livemode:false,ownerEmailSha256:emailHash,
   controller:{feesPayer:'account',paymentLosses:'stripe',requirementCollection:'stripe',dashboard:'full'},providerCreatedAt:checkedAt-1000,checkedAt,sha256:'b'.repeat(64)}};
 }
 const adopt=(c,f)=>c.query('select public.vendor_seller_adopt_v1($1,$2,$3) as value',[f.owner,f.grant,f.evidence]);
 const fail=async(fn,pattern)=>{await assert.rejects(fn,pattern);};
 for(const role of ['anon','authenticated']){
  const f=await seed();await db.query('set role '+role);
  try{await fail(()=>adopt(db,f),/permission denied/);await fail(()=>db.query('select * from vendor_seller_adoption_grants'),/permission denied/);}
  finally{await db.query('reset role');}passed.push(role+' cannot read grants or adopt');
 }
 for(const [name,modify,pattern] of [
  ['foreign owner',async f=>{f.owner=randomUUID()},/seller_adoption_denied/],
  ['caller changes account',async f=>{f.evidence.connectedAccountId='acct_foreign'},/evidence_invalid/],
  ['wrong provider mode',async f=>{f.evidence.livemode=true},/evidence_invalid/],
  ['stale evidence',async f=>{f.evidence.checkedAt-=120},/evidence_expired/],
  ['future evidence',async f=>{f.evidence.checkedAt+=120},/evidence_expired/],
  ['missing evidence field',async f=>{delete f.evidence.ownerEmailSha256},/evidence_invalid/],
  ['extra evidence field',async f=>{f.evidence.forged=true},/evidence_invalid/],
  ['revoked approval',async f=>{await db.query('update vendor_seller_adoption_grants set enabled=false where id=$1',[f.grant])},/seller_adoption_denied/],
  ['expired approval',async f=>{await db.query("update vendor_seller_adoption_grants set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=$1",[f.grant])},/seller_adoption_denied/],
  ['unconfirmed auth email',async f=>{await db.query('update auth.users set email_confirmed_at=null where id=$1',[f.owner])},/seller_adoption_denied/],
  ['changed auth email',async f=>{await db.query("update auth.users set email='changed@example.invalid' where id=$1",[f.owner])},/seller_adoption_denied/],
  ['lost package access',async f=>{await db.query('update test_capabilities set enabled=false where owner_id=$1',[f.owner])},/seller_adoption_denied/],
  ['financial hold',async f=>{await db.query('insert into vendor_account_financial_holds values($1)',[f.owner])},/seller_adoption_denied/],
  ['early deauthorization',async f=>{await db.query("select vendor_seller_enqueue_v1('acct_platform',false,$1,$2,'deauthorized',now())",['evt_'+randomBytes(8).toString('hex'),f.account])},/seller_onboarding_blocked/],
 ]){const f=await seed();await modify(f);await fail(()=>adopt(db,f),pattern);passed.push(name);}
 const f=await seed();await db.query('set role service_role');
 const bound=(await adopt(db,f)).rows[0].value;assert.equal(bound.creation_attempt_id,null);assert.equal(bound.creation_started_at,null);assert.equal(bound.adoption_grant_id,f.grant);
 assert.equal((await adopt(db,f)).rows[0].value.id,bound.id);await db.query('reset role');passed.push('service adoption and idempotent retry retain actual provenance');
 await fail(()=>db.query('update vendor_seller_accounts set adoption_evidence=$1 where id=$2',[{},bound.id]),/seller_adoption_immutable/);
 await fail(()=>db.query("update vendor_seller_accounts set connected_account_id='acct_changed' where id=$1",[bound.id]),/seller_identity_immutable/);passed.push('bound identity and evidence immutable');
 await db.query('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[f.owner]);
 const status=(await db.query('select vendor_seller_owner_status_v1() as value')).rows[0].value;
 assert.equal(status.binding.hasConnectedAccount,true);assert.ok(!JSON.stringify(status).includes(f.account));await db.query('reset role');passed.push('owner retained projection hides provider identity');
 await db.query('update vendor_seller_rollout set onboarding_enabled=true');
 const pending=await seed();await fail(()=>db.query("select vendor_seller_reserve_v1($1,$2,'acct_platform',false,$3)",[pending.owner,pending.store,pending.evidence.controller]),/seller_adoption_required/);passed.push('legacy onboarding cannot duplicate approved seller');
 const oldOwner=randomUUID(),oldStore=randomUUID();
 await db.query("insert into auth.users values($1,'legacy@example.invalid',now())",[oldOwner]);
 await db.query('insert into vendor_stores values($1,$2)',[oldStore,oldOwner]);await db.query('insert into test_capabilities values($1,true)',[oldOwner]);
 await db.query("select vendor_seller_reserve_v1($1,$2,'acct_platform',false,$3)",[oldOwner,oldStore,pending.evidence.controller]);
 await fail(()=>db.query(`insert into vendor_seller_adoption_grants(owner_id,store_id,stripe_account_id,connected_account_id,livemode,owner_email_sha256,approval_sha256,expires_at)
  values($1,$2,'acct_platform','acct_legacy_adopt',false,$3,$3,now()+interval '1 hour')`,[oldOwner,oldStore,'c'.repeat(64)]),/seller_account_already_bound/);
 passed.push('existing creation reservation blocks a later adoption grant');
 const other=await seed();await fail(()=>db.query('update vendor_seller_adoption_grants set connected_account_id=$1 where id=$2',[f.account,other.grant]),/duplicate key/);passed.push('same provider account cannot receive two owner grants');
 const a=await client(),b=await client();
 async function blockedBy(waiting,blocker){for(let i=0;i<50;i++){const r=await db.query('select $1::int=any(pg_blocking_pids($2::int)) as waiting',[blocker.processID,waiting.processID]);if(r.rows[0].waiting)return;await new Promise(r=>setTimeout(r,20));}throw new Error('Expected database lock wait was not observed');}
 const race=await seed();await a.query('begin');const first=(await adopt(a,race)).rows[0].value;
 const second=adopt(b,race);await blockedBy(b,a);await a.query('commit');assert.equal((await second).rows[0].value.id,first.id);passed.push('concurrent adoption returns one binding after observed lock wait');
 const deauth=await seed();await a.query('begin');await adopt(a,deauth);
 const callback=b.query("select vendor_seller_enqueue_v1('acct_platform',false,$1,$2,'deauthorized',now())",['evt_'+randomBytes(8).toString('hex'),deauth.account]);
 await blockedBy(b,a);await a.query('commit');await callback;
 assert.equal((await adopt(db,deauth)).rows[0].value.state,'deauthorized');passed.push('callback racing first binding invalidates it and retry never reopens');
 const early=await seed();await a.query('begin');await a.query("select vendor_seller_enqueue_v1('acct_platform',false,$1,$2,'deauthorized',now())",['evt_'+randomBytes(8).toString('hex'),early.account]);
 const incoming=adopt(b,early).then(()=>({accepted:true}),e=>({error:e.message}));await blockedBy(b,a);await a.query('commit');assert.match((await incoming).error,/seller_onboarding_blocked/);passed.push('uncommitted early callback blocks adoption');
 const planFor=f=>({version:'vendor-seller-approval-plan-v1',projectRef:'synthetic',migrationSha256:'c'.repeat(64),
  grant:{id:f.grant,ownerId:f.owner,storeId:f.store,platformAccountId:'acct_platform',connectedAccountId:f.account,
   livemode:false,ownerEmailSha256:f.emailHash,createdAt:f.evidence.checkedAt,expiresAt:f.evidence.checkedAt+86400},
  providerEvidenceSha256:'d'.repeat(64),createdAt:f.evidence.checkedAt,expiresAt:f.evidence.checkedAt+1800,sha256:'e'.repeat(64)});
 const issue=(c,f,p=planFor(f))=>c.query('select vendor_seller_issue_adoption_v1($1,$2) as value',[p,f.evidence]);
 for(const role of ['anon','authenticated']){const s=await seed(false);await db.query('set role '+role);
  try{await fail(()=>issue(db,s),/permission denied/);}finally{await db.query('reset role');}passed.push(role+' cannot issue approval');}
 const approved=await seed(false);await db.query('set role service_role');
 await fail(()=>db.query('insert into vendor_seller_adoption_grants default values'),/permission denied/);
 const issued=(await issue(db,approved)).rows[0].value;assert.equal(issued.enabled,true);assert.equal(issued.id,approved.grant);
 assert.deepEqual((await issue(db,approved)).rows[0].value,issued);await db.query('reset role');
 assert.equal((await db.query('select count(*)::int as n from vendor_seller_accounts where owner_id=$1',[approved.owner])).rows[0].n,0);
 passed.push('service-only issuer creates one grant, no seller binding; direct insert denied');
 await db.query('update vendor_seller_adoption_grants set enabled=false where id=$1',[approved.grant]);
 assert.equal((await issue(db,approved)).rows[0].value.enabled,false);passed.push('issuance response-loss retry does not reactivate revoked grant');
 for(const [name,change,pattern] of [
  ['changed owner email',async(s,p)=>db.query("update auth.users set email='new@example.invalid' where id=$1",[s.owner]),/seller_adoption_denied/],
  ['foreign store',async(s,p)=>{p.grant.storeId=randomUUID();s.evidence.storeId=p.grant.storeId},/seller_store_mismatch/],
  ['lost package',async(s,p)=>db.query('update test_capabilities set enabled=false where owner_id=$1',[s.owner]),/seller_adoption_denied/],
  ['financial hold',async(s,p)=>db.query('insert into vendor_account_financial_holds values($1)',[s.owner]),/seller_adoption_denied/],
  ['expired plan',async(s,p)=>{p.createdAt-=3600;p.expiresAt-=3600;p.grant.createdAt-=3600;p.grant.expiresAt-=3600},/plan_expired/],
  ['extended grant',async(s,p)=>{p.grant.expiresAt+=86400},/plan_expired/],
  ['stale provider evidence',async(s,p)=>{s.evidence.checkedAt-=61},/evidence_expired/],
  ['wrong provider account',async(s,p)=>{s.evidence.connectedAccountId='acct_other'},/evidence_invalid/],
  ['extra plan authority',async(s,p)=>{p.enabled=true},/plan_invalid/],
  ['prior deauthorization',async(s,p)=>db.query("select vendor_seller_enqueue_v1('acct_platform',false,$1,$2,'deauthorized',now())",['evt_'+randomBytes(8).toString('hex'),s.account]),/seller_onboarding_blocked/],
 ]){const s=await seed(false),p=planFor(s);await change(s,p);await fail(()=>issue(db,s,p),pattern);
  assert.equal((await db.query('select count(*)::int as n from vendor_seller_adoption_grants where owner_id=$1',[s.owner])).rows[0].n,0);passed.push('issuance rejects '+name);}
 const grantRace=await seed(false);await a.query('begin');const grantFirst=(await issue(a,grantRace)).rows[0].value;
 const grantSecond=issue(b,grantRace);await blockedBy(b,a);await a.query('commit');assert.deepEqual((await grantSecond).rows[0].value,grantFirst);
 passed.push('concurrent issuance returns one grant after observed lock wait');
 const issueDeauth=await seed(false);await a.query('begin');await a.query("select vendor_seller_enqueue_v1('acct_platform',false,$1,$2,'deauthorized',now())",['evt_'+randomBytes(8).toString('hex'),issueDeauth.account]);
 const issuePending=issue(b,issueDeauth).then(()=>({accepted:true}),e=>({error:e.message}));await blockedBy(b,a);await a.query('commit');assert.match((await issuePending).error,/seller_onboarding_blocked/);
 passed.push('issuer racing prior deauthorization refuses grant after lock wait');
 const report={status:'passed',at:new Date().toISOString(),engine:'PostgreSQL 16.2 isolated synthetic subset',port,fullSupabaseReplay:false,
  migrationSha256:digest(migration),productionWrites:0,sharedServiceChanges:0,passed};
 fs.writeFileSync(dir+'/receipt.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report,null,2));
}finally{
 for(const c of clients)await c.end().catch(()=>{});
 if(started){assert.ok(fs.realpathSync(data).replaceAll('\\','/').startsWith(root+'/.local/integration/seller-adoption-v1/pg16-'));
  run('pg_ctl',['-D',data,'-m','fast','-w','stop']);}
}
