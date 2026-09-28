import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../../scripts/lib/local_supabase_cli_status_v1.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const standalone=process.env.GV_NATIVE_IMPORT_STANDALONE407==='1';
const out='C:/grookai_vault_operator_artifacts/'+(standalone?'native_import_qualification_20260927':'native_import_recovery_20260927');
const prior=standalone?out+'/full-407':'C:/grookai_vault_operator_artifacts/audit_vault_write_pause_20260927';
const project=standalone?'native-import-full-407-20260927':'audit-vault-pause-411-20260927';
const fixture=standalone?prior:prior+'/replay-411';
const dbPort=standalone?57540:57040,apiPort=dbPort+1;
const hash=b=>createHash('sha256').update(b).digest('hex');

test('native batch endpoint: real Auth/REST/database recovery on isolated qualified schema',{
  skip:process.env.GV_RUN_NATIVE_IMPORT_DB!=='1',timeout:120000,
},async t=>{
  const plan=JSON.parse(fs.readFileSync(prior+'/freeze.json'));
  assert.equal(plan.project,project);assert.equal(Object.keys(plan.sourceHashes).length,standalone?407:411);
  assert.equal(JSON.parse(fs.readFileSync(prior+'/replay-result.json')).fullReplay,true);
  assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));
  for(const [name,digest] of Object.entries(plan.sourceHashes))assert.equal(hash(fs.readFileSync(fixture+'/supabase/migrations/'+name)),digest);
  assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),plan.configSha256);
  const docker=(...args)=>JSON.parse(execFileSync('docker',args,{encoding:'utf8'}));
  assert.equal(docker('network','inspect',project)[0].Internal,true);
  assert.deepEqual(Object.keys(docker('inspect','supabase_db_'+project)[0].NetworkSettings.Networks),[project]);
  const relay=docker('inspect',project+'-relay')[0];
  for(const p of Object.values(relay.NetworkSettings.Ports).flat())assert.equal(p.HostIp,'127.0.0.1');
  assert.ok(Object.values(relay.NetworkSettings.Ports).flat().some(p=>p.HostPort===String(dbPort)));
  const runDir=out+'/acceptance-'+Date.now();fs.mkdirSync(runDir,{recursive:true});
  const sourceFiles=['supabase/functions/vault-import-targets-v1/index.ts','supabase/functions/vault-import-targets-v1/handler.ts',
    'supabase/functions/_shared/auth.ts','supabase/functions/_shared/key_resolver.ts','supabase/functions/_shared/cors.ts',
    'tests/integration/helpers/native_import_server.ts','tests/integration/native_import_recovery_v1.test.mjs'];
  fs.writeFileSync(runDir+'/intent.json',JSON.stringify({scope:'New synthetic account/catalog/copies only; no reset, migrations, pause, deletion or production connection',
    project,port:dbPort,api:apiPort,endpoint:57450,sourceHashes:Object.fromEntries(sourceFiles.map(p=>[p,hash(fs.readFileSync(root+p))])),createdAt:new Date().toISOString()}),{flag:'wx'});
  const db=new pg.Client({host:'127.0.0.1',port:dbPort,user:'postgres',password:'postgres',database:'postgres',statement_timeout:10000});await db.connect();
  const status=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
  assert.equal(status.API_URL,'http://127.0.0.1:'+apiPort);
  const admin=createClient(status.API_URL,localSupabaseStatusSecret(status),{auth:{persistSession:false,autoRefreshToken:false}});
  const caller=createClient(status.API_URL,status.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const checks=[];let child,serverLog='';let before;
  const tables=['vault_items','vault_item_instances','vault_owners','slab_certs','card_prints','sets',...(!standalone?['slab_add_receipts','slab_upgrade_receipts','slab_identity_proofs','vault_write_control_v1']:[])];
  const snapshot=async()=>{const value={};for(const name of tables)value[name]=(await db.query('select * from public.'+name+' order by 1')).rows;return value;};
  try {
    assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(plan.sourceHashes).sort().map(n=>n.split('_')[0]));
    if(!standalone)assert.equal((await db.query('select paused from public.vault_write_control_v1')).rows[0].paused,false);
    assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');
    assert.equal((await db.query('select count(*)::int runs from cron.job_run_details')).rows[0].runs,0);
    before=await snapshot();fs.writeFileSync(runDir+'/before.private.json',JSON.stringify(before),{flag:'wx'});
    child=spawn('deno',['run','--no-lock','--cached-only','--allow-env','--allow-net=127.0.0.1:'+apiPort+',127.0.0.1:57450',root+'tests/integration/helpers/native_import_server.ts'],{
      cwd:root,env:{...process.env,SUPABASE_URL:status.API_URL,SUPABASE_SECRET_KEY:localSupabaseStatusSecret(status)},stdio:['ignore','pipe','pipe']});
    child.stdout.on('data',b=>serverLog+=b);child.stderr.on('data',b=>serverLog+=b);
    let ready=false;
    for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:57450',{method:'OPTIONS'});if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
    assert.ok(ready,'isolated Deno server did not start');
    const email=randomUUID()+'@native-import.invalid',password=randomUUID();
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(created.error,null);const user=created.data.user.id;
    const signed=await caller.auth.signInWithPassword({email,password});assert.equal(signed.error,null);
    const token=signed.data.session.access_token;
    const send=async(rows,bearer=token)=>fetch('http://127.0.0.1:57450',{method:'POST',headers:{Authorization:'Bearer '+bearer,'content-type':'application/json'},body:JSON.stringify({rows,ownerUserId:user,p_user_id:randomUUID()})});
    const game=(await db.query("select id from public.games where code='pokemon'")).rows[0].id;
    const set=(await db.query("insert into public.sets(code,name,game) values($1,'Synthetic native import recovery','pokemon') returning id",[randomUUID()])).rows[0].id;
    let cardNumber=0;
    async function seed(){return (await db.query("insert into public.card_prints(set_id,name,number,variant_key,gv_id,game_id) values($1,'Synthetic native import',$4,'normal',$2,$3) returning id,gv_id",[set,'GV-PK-NATIVE-'+randomUUID(),game,String(++cardNumber)])).rows[0];}
    const a=await seed(),b=await seed();
    const row=(c,n=3)=>({cardId:c.id,gvId:c.gv_id,desiredQuantity:n,condition:'LP',acquisitionCost:4.25,createdAt:'2026-01-01T00:00:00Z',notes:'Synthetic native import'});
    const copies=async()=>(await db.query('select id,card_print_id,condition_label,acquisition_cost,notes from public.vault_item_instances where user_id=$1 order by id',[user])).rows;
    async function check(name,fn){await t.test(name,async()=>{await fn();checks.push(name);});}
    await check('invalid real Auth token never admits a batch',async()=>{assert.equal((await send([row(a)],'invalid')).status,401);assert.equal((await copies()).length,0);});
    await check('different authenticated owner cannot submit the previous preview',async()=>{
      const response=await fetch('http://127.0.0.1:57450',{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify({rows:[row(a)],ownerUserId:randomUUID()})});
      assert.equal(response.status,409);assert.equal((await copies()).length,0);
    });
    await check('whole batch saves verified owner copies and metadata',async()=>{
      const response=await send([row(a),row(b)]);assert.equal(response.status,200);assert.equal((await response.json()).importedCards,6);
      const saved=await copies();assert.equal(saved.length,6);for(const copy of saved){assert.equal(copy.condition_label,'LP');assert.equal(Number(copy.acquisition_cost),4.25);assert.equal(copy.notes,'Synthetic native import');}
    });
    await check('ignored successful response then retry creates no duplicate identities',async()=>{
      const response=await send([row(a,4),row(b,5)]);assert.equal(response.status,200);await response.body.cancel();
      const saved=await copies();const retry=await send([row(a,4),row(b,5)]);assert.equal(retry.status,200);assert.equal((await retry.json()).importedCards,0);assert.deepEqual(await copies(),saved);
    });
    await check('competing native imports converge without additive duplication',async()=>{
      const responses=await Promise.all([send([row(a,6),row(b,7)]),send([row(a,7),row(b,8)])]);
      for(const response of responses)assert.equal(response.status,200);assert.equal((await copies()).length,15);
    });
    await check('late canonical identity failure rolls back the entire batch',async()=>{
      const c=await seed(),d=await seed();const ordered=[c,d].sort((x,y)=>x.id.localeCompare(y.id));const saved=await copies();
      const response=await send([row(ordered[0]),{...row(ordered[1]),gvId:'wrong'}]);assert.equal(response.status,503);assert.equal((await response.json()).error,'import_outcome_unconfirmed');assert.deepEqual(await copies(),saved);
    });
    await check('authenticated readback matches independent SQL; other user sees none',async()=>{
      const read=await caller.rpc('vault_owned_counts_v1',{p_card_print_ids:[a.id,b.id]});assert.equal(read.error,null);assert.equal(read.data.reduce((n,r)=>n+r.owned_count,0),15);
      const outsider=await admin.auth.admin.createUser({email:randomUUID()+'@native-import.invalid',password,email_confirm:true});assert.equal(outsider.error,null);
      await caller.auth.signInWithPassword({email:outsider.data.user.email,password});const other=await caller.rpc('vault_owned_counts_v1',{p_card_print_ids:[a.id,b.id]});assert.equal(other.error,null);assert.deepEqual(other.data,[]);
    });
    const after=await snapshot();
    for(const name of tables){const existing=new Map(after[name].map(r=>[r.id??r.user_id??r.singleton,r]));for(const old of before[name])assert.deepEqual(existing.get(old.id??old.user_id??old.singleton),old);}
    fs.writeFileSync(runDir+'/result.json',JSON.stringify({status:'passed',checks,project,sourceTree:plan.tree,newOwner:user,newCopies:(await copies()).length,retainedRowsUnchanged:true,resets:0,migrationsApplied:0,productionWrites:0}),{flag:'wx'});
    console.log('Private acceptance evidence: '+runDir);
  }catch(error){fs.writeFileSync(runDir+'/failure.json',JSON.stringify({message:error.message,checks}),{flag:'wx'});throw error;}
  finally{if(child && child.exitCode===null && child.signalCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}fs.writeFileSync(runDir+'/server.log',serverLog);await db.end();}
});
