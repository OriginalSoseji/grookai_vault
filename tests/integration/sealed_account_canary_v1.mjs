// Requires disposable sealed fixtures. Never loads production configuration.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_sealed-ownership-replay-20260907'],{encoding:'utf8'}))[0];
assert.equal(container.NetworkSettings.Ports['5432/tcp'][0].HostPort,'55430');
assert.equal(container.State.Running,true);
const config={host:'127.0.0.1',port:55430,user:'postgres',password:'postgres',database:'postgres',statement_timeout:10000};
const db=new pg.Client(config), owner=randomUUID(), outsider=randomUUID();
const migration=new URL('../../supabase/migrations/20260908193000_sealed_ownership_account_canary_v1.sql',import.meta.url);
let passed=0;
async function check(name,fn){await fn();passed++;console.log(`PASS ${name}`);}
async function denied(fn,pattern){await db.query('savepoint denial');let error;try{await fn();}catch(e){error=e;}await db.query('rollback to savepoint denial');assert.ok(error);assert.match(error.message,pattern);}
async function asUser(user=owner){await db.query('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('set local role authenticated');}
async function admin(){await db.query('reset role');}
const add=(variant,request=randomUUID(),quantity=1)=>db.query('select public.vault_add_sealed_copies_v1($1,$2,$3) result',[variant,request,quantity]).then(r=>r.rows[0].result);
const capability=()=>db.query('select public.get_sealed_ownership_capabilities_v1() result').then(r=>r.rows[0].result);
await db.connect();
try {
  const sql=await readFile(migration,'utf8'); await db.query(sql);await db.query(sql);
  const variant=(await db.query("select i.sealed_product_variant_id id from public.vault_item_instances i join auth.users u on u.id=i.user_id where u.email like '%@example.invalid' and i.sealed_product_variant_id is not null limit 1")).rows[0]?.id;
  assert.ok(variant,'Run sealed_verification_v1.mjs fixtures first');
  await db.query('begin');
  await db.query('update public.sealed_ownership_controls_v1 set enabled=false,canary_enabled=false');
  await db.query('insert into auth.users(id,email) values($1,$2),($3,$4)',[owner,`${owner}@example.invalid`,outsider,`${outsider}@example.invalid`]);
  await check('least-privilege grant tables and private helper',async()=>{
    for(const table of ['sealed_ownership_canary_grants_v1','sealed_ownership_canary_variants_v1']) {
      for(const role of ['anon','authenticated','service_role']) for(const privilege of ['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) {
        const expected=role==='service_role'&&(['SELECT','INSERT'].includes(privilege)||(table.endsWith('grants_v1')&&privilege==='UPDATE'));
        assert.equal((await db.query('select has_table_privilege($1,$2,$3) value',[role,`public.${table}`,privilege])).rows[0].value,expected,`${table}:${role}:${privilege}`);
      }
      const r=(await db.query('select relrowsecurity,relforcerowsecurity from pg_class where oid=$1::regclass',[`public.${table}`])).rows[0];assert.ok(r.relrowsecurity&&r.relforcerowsecurity);
    }
    for(const role of ['anon','authenticated','service_role']) assert.equal((await db.query("select has_function_privilege($1,'public.sealed_ownership_add_allowed_v1(uuid,integer)','EXECUTE') value",[role])).rows[0].value,false);
  });
  await asUser();
  await check('default off denies additions and capability',async()=>{assert.equal((await capability()).add_enabled,false);await denied(()=>add(variant),/sealed_ownership_disabled/);});
  await admin();
  await db.query("insert into public.sealed_ownership_canary_grants_v1(user_id,plan_fingerprint,starts_at,expires_at,max_created_copies) values($1,repeat('a',64),now()-interval '1 minute',now()+interval '1 hour',2)",[owner]);
  await db.query('insert into public.sealed_ownership_canary_variants_v1 values($1,$2)',[owner,variant]);
  await db.query('update public.sealed_ownership_controls_v1 set canary_enabled=true');
  await asUser(outsider);
  await check('unlisted caller denied via direct RPC',async()=>{assert.equal((await capability()).add_enabled,false);await denied(()=>add(variant),/sealed_ownership_disabled/);});
  await check('caller cannot enroll itself',()=>denied(()=>db.query('insert into public.sealed_ownership_canary_variants_v1 values($1,$2)',[outsider,variant]),/permission denied/));
  await check('direct table insertion cannot bypass account gate',()=>denied(()=>db.query("insert into public.vault_item_instances(user_id,sealed_product_variant_id,gv_vi_id,seal_state,package_condition,name,intent) values($1,$2,'GVVI-00000000-000001','unknown','unknown','Fixture','hold')",[outsider,variant]),/row-level security|permission denied/));
  await asUser();
  await check('wrong variant and oversized request denied',async()=>{await denied(()=>add(randomUUID()),/sealed_ownership_disabled/);await denied(()=>add(variant,randomUUID(),3),/sealed_ownership_disabled/);});
  await check('capability reports only caller boolean',async()=>assert.deepEqual(await capability(),{version:1,add_enabled:true}));
  const request=randomUUID();let result;
  await check('allowed owner creates within budget',async()=>{result=await add(variant,request,2);assert.equal(result.created_count,2);});
  await check('budget exhausted closes capability and writer',async()=>{assert.equal((await capability()).add_enabled,false);await denied(()=>add(variant),/sealed_ownership_disabled/);});
  await check('retry does not consume budget',async()=>assert.deepEqual(await add(variant,request,2),result));
  await check('changed retry payload denied',()=>denied(()=>add(variant,request,1),/request_payload_conflict/));
  await db.query("select public.vault_dispose_sealed_copy_v1($1,$2,'remove')",[result.instance_ids[0],randomUUID()]);
  await check('archiving never replenishes cumulative allowance',()=>denied(()=>add(variant),/sealed_ownership_disabled/));
  await admin();await db.query('update public.sealed_ownership_controls_v1 set canary_enabled=false');await asUser();
  await check('rollback preserves prior request, totals and history',async()=>{
    assert.deepEqual(await add(variant,request,2),result);
    assert.equal((await db.query('select public.get_owned_sealed_totals_v1() result')).rows[0].result.active_copy_count,1);
    await denied(()=>add(variant),/sealed_ownership_disabled/);
  });
  await admin();await db.query('update public.sealed_ownership_controls_v1 set canary_enabled=true');
  await db.query('update public.sealed_ownership_canary_grants_v1 set max_created_copies=3,revoked_at=now() where user_id=$1',[owner]);await asUser();
  await check('revocation denies unspent allowance',()=>denied(()=>add(variant),/sealed_ownership_disabled/));
  await admin();await db.query("update public.sealed_ownership_canary_grants_v1 set revoked_at=null,starts_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where user_id=$1",[owner]);await asUser();
  await check('expired grant denies',()=>denied(()=>add(variant),/sealed_ownership_disabled/));
  await admin();await db.query("update public.sealed_ownership_canary_grants_v1 set starts_at=now()+interval '1 hour',expires_at=now()+interval '2 hours' where user_id=$1",[owner]);await asUser();
  await check('future grant denies',()=>denied(()=>add(variant),/sealed_ownership_disabled/));
  await admin();await db.query('update public.sealed_ownership_controls_v1 set enabled=true,canary_enabled=false');await asUser(outsider);
  await check('existing broad-release mode remains compatible',async()=>{assert.equal((await capability()).add_enabled,true);assert.equal((await add(variant)).created_count,1);});
  await admin();await db.query("select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','anon',true)");await db.query('set local role anon');
  await check('anonymous callers cannot use capability or writer',async()=>{await denied(()=>capability(),/permission denied/);await denied(()=>add(variant),/permission denied/);});
  await db.query('rollback');
  // Commit only a disposable one-copy allowance for independent racing sessions.
  await db.query('begin');
  await db.query('insert into auth.users(id,email) values($1,$2)',[owner,`${owner}@example.invalid`]);
  await db.query('update public.sealed_ownership_controls_v1 set enabled=false,canary_enabled=true');
  await db.query("insert into public.sealed_ownership_canary_grants_v1(user_id,plan_fingerprint,starts_at,expires_at,max_created_copies) values($1,repeat('b',64),now()-interval '1 minute',now()+interval '1 hour',1)",[owner]);
  await db.query('insert into public.sealed_ownership_canary_variants_v1 values($1,$2)',[owner,variant]);
  await db.query('commit');
  const attempts=[];
  // Start all connections before awaiting completions, exercising the owner lock.
  for(let i=0;i<10;i++) attempts.push((async()=>{const c=new pg.Client(config);await c.connect();try{await c.query('begin');await c.query("select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[owner]);await c.query('set local role authenticated');const r=await c.query('select public.vault_add_sealed_copies_v1($1,$2) result',[variant,randomUUID()]);await c.query('commit');return {ok:true,result:r.rows[0].result};}catch(e){await c.query('rollback');return {ok:false,error:e.message};}finally{await c.end();}})());
  const race=await Promise.all(attempts);
  await check('ten concurrent calls cannot exceed one-copy allowance',async()=>{assert.equal(race.filter(r=>r.ok).length,1);assert.ok(race.filter(r=>!r.ok).every(r=>r.error==='sealed_ownership_disabled'));assert.equal(Number((await db.query("select count(*) from public.vault_sealed_requests_v1 where user_id=$1 and operation='add'",[owner])).rows[0].count),1);});
  console.log(JSON.stringify({status:'passed',checks:passed,local_only:true,production_access:false,concurrent_calls:10,concurrent_creations:1,requires_isolated_replay:true}));
} finally {await db.query('rollback').catch(()=>{});await db.end();}
