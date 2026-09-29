// Opt-in, fixed existing 409 sandbox. Fresh synthetic fixtures only; no reset or migration.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
assert.equal(process.env.GV_RUN_NATIVE_OWNED_COPIES,'1');
const root=fileURLToPath(new URL('../../',import.meta.url));
const require=createRequire('C:/gv_web_import_recovery_20260929/package.json'),requireWeb=createRequire('C:/gv_web_import_recovery_20260929/apps/web/package.json');
const {Client}=require('pg'),{createClient}=requireWeb('@supabase/supabase-js');
const fixture='C:/gv_store_seller_link_20260928/.local/integration/seller-adoption-v2/replay-409',project='grookai-seller-review-20260929',api='http://127.0.0.1:31021';
const out='C:/grookai_vault_operator_artifacts/native_owned_copies_20260929',run=out+'/sandbox-'+Date.now();
const hash=b=>createHash('sha256').update(b).digest('hex'),docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:30000,stdio:['pipe','pipe','pipe']});
const proof=JSON.parse(fs.readFileSync(fixture+'/receipt.json'));assert.equal(proof.project,project);assert.equal(proof.status,'passed');assert.equal(proof.fullReplay,true);assert.equal(Object.keys(proof.sourceHashes).length,409);
assert.equal(fs.readdirSync(root+'supabase/migrations').filter(n=>n.endsWith('.sql')).length,409);
for(const [name,digest]of Object.entries(proof.sourceHashes))assert.equal(hash(fs.readFileSync(root+'supabase/migrations/'+name)),digest);
assert.ok(!fs.existsSync(fixture+'/supabase/.temp/project-ref'));assert.equal(hash(fs.readFileSync(fixture+'/supabase/config.toml')),JSON.parse(fs.readFileSync(fixture+'/intent.json')).configSha256);
const inspect=n=>JSON.parse(docker('inspect',n))[0],state=inspect('supabase_db_'+project),relay=inspect(project+'-relay');
assert.equal(state.State.Running,true);assert.deepEqual(Object.keys(state.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);
for(const bindings of Object.values(relay.HostConfig.PortBindings))for(const b of bindings)assert.equal(b.HostIp,'127.0.0.1');
fs.mkdirSync(run,{recursive:true});const save=(n,v)=>fs.writeFileSync(run+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
let db;try{
 if(!relay.State.Running)docker('start',project+'-relay');
 const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',fixture,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));assert.equal(cfg.API_URL,api);
 db=new Client({host:'127.0.0.1',port:31022,user:'postgres',password:'postgres',database:'postgres',statement_timeout:15000});await db.connect();
 assert.equal((await db.query('show max_worker_processes')).rows[0].max_worker_processes,'0');assert.equal((await db.query('select count(*)::int n from cron.job_run_details')).rows[0].n,0);
 assert.deepEqual((await db.query('select version from supabase_migrations.schema_migrations order by version')).rows.map(r=>r.version),Object.keys(proof.sourceHashes).sort().map(n=>n.split('_')[0]));
 const snapshot=async()=>{const rows={};for(const table of ['vault_items','vault_item_instances','slab_certs','vault_import_receipts_v1'])rows[table]=(await db.query('select * from public.'+table+' order by 1,2')).rows;return rows;};
 const old=await snapshot();save('before-fixtures.private.json',old);
 const admin=createClient(api,localSupabaseStatusSecret(cfg),{auth:{persistSession:false,autoRefreshToken:false}});
 async function account(){const email=randomUUID()+'@owned-copy-fixture.invalid',password='Fixture-'+randomUUID()+'!';const r=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(r.error,null);return{id:r.data.user.id,email,password};}
 const owner=await account(),other=await account();save('accounts.private.json',{owner,other});
 const set=(await db.query("insert into sets(code,name,game) values($1,'Owned-copy synthetic fixture','pokemon') returning id",[randomUUID()])).rows[0].id;
 async function card(label){return(await db.query("insert into card_prints(set_id,name,number,variant_key,gv_id,game_id) values($1,$2,$3,'normal',$4,(select id from games where code='pokemon')) returning id,gv_id",[set,label,label,'GV-PK-OWNED-'+randomUUID()])).rows[0];}
 const raw=await card('raw'),slab=await card('slab'),foreign=await card('foreign');
 for(const u of [owner,other])await db.query('select ensure_vault_owner_v1($1)',[u.id]);
 async function anchor(){return(await db.query("insert into vault_items(user_id,card_id,gv_id,name,qty) values($1,$2,$3,'Synthetic owned card',1) returning id",[owner.id,raw.id,raw.gv_id])).rows[0].id;}
 const firstAnchor=await anchor(),secondAnchor=await anchor();
 const copyIds=[];for(let i=0;i<205;i++)copyIds.push((await db.query("insert into vault_item_instances(user_id,card_print_id,legacy_vault_item_id,gv_vi_id,condition_label,created_at) values($1,$2,$3,$4,'NM',$5) returning id",[owner.id,raw.id,i===204?secondAnchor:firstAnchor,('GVVI-'+randomUUID()).toUpperCase(),new Date(Date.UTC(2026,0,1,0,0,i))])).rows[0].id);
 for(const c of [raw,slab]){const cert=(await db.query("insert into slab_certs(grader,cert_number,card_print_id,grade) values('PSA',$1,$2,10) returning id",['fixture-'+randomUUID(),c.id])).rows[0].id;await db.query("insert into vault_item_instances(user_id,slab_cert_id,is_graded,grade_company,grade_label,gv_vi_id,created_at) values($1,$2,true,'PSA','10',$3,'2025-01-01')",[owner.id,cert,('GVVI-'+randomUUID()).toUpperCase()]);}
 await db.query("insert into vault_item_instances(user_id,card_print_id,gv_vi_id) values($1,$2,$3)",[other.id,foreign.id,('GVVI-'+randomUUID()).toUpperCase()]);
 await db.query("insert into vault_item_instances(user_id,card_print_id,gv_vi_id,archived_at) values($1,$2,$3,now())",[owner.id,raw.id,('GVVI-'+randomUUID()).toUpperCase()]);
 const before=await snapshot();save('before-read.private.json',before);
 const config={api,anon:cfg.ANON_KEY,owner,other,raw:raw.id,slab:slab.id,foreign:foreign.id,newest:copyIds.at(-1),secondAnchor,result:run+'/dart-result.json'};save('fixture.private.json',config);
 const env={};for(const key of ['PATH','Path','SystemRoot','SYSTEMROOT','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','COMSPEC','PATHEXT','PUB_CACHE','FLUTTER_ROOT'])if(process.env[key])env[key]=process.env[key];env.GV_OWNED_COPY_FIXTURE=run+'/fixture.private.json';
 const result=spawnSync('pwsh',['-NoProfile','-Command',"& 'C:/src/flutter/bin/flutter.bat' test --no-pub test/integration/native_owned_copies_sandbox_test.dart; exit $LASTEXITCODE"],{cwd:root,env,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:8*1024*1024});
 fs.writeFileSync(run+'/flutter.private.log',(result.stdout??'')+(result.stderr??''));
 const after=await snapshot();save('after-read.private.json',after);assert.deepEqual(after,before,'Ownership reads mutated inventory');
 for(const [table,rows]of Object.entries(old)){const key=r=>table==='vault_import_receipts_v1'?r.user_id+':'+r.request_id:r.id;const current=new Map(after[table].map(r=>[key(r),r]));for(const row of rows)assert.deepEqual(current.get(key(row)),row);}
 assert.equal(result.status,0,'Inspect private Flutter log; inventory unchanged');assert.match(result.stdout??'',/All tests passed/);assert.equal(JSON.parse(fs.readFileSync(config.result)).status,'PASS');
 const files=execFileSync('git',['status','--porcelain','--untracked-files=all'],{cwd:root,encoding:'utf8'}).trim().split('\n').map(l=>l.slice(3));
 const receipt={at:new Date().toISOString(),status:'PASS',project,api,migrations:409,readPhaseInventoryUnchanged:true,priorRowsPreserved:Object.fromEntries(Object.entries(old).map(([k,v])=>[k,v.length])),exactOwnerCopies:207,sourceHashes:Object.fromEntries(files.filter(f=>fs.existsSync(root+f)&&fs.statSync(root+f).isFile()).map(f=>[f,hash(fs.readFileSync(root+f))])),productionWrites:0,resets:0};save('result.json',receipt);fs.writeFileSync(out+'/sandbox-latest.json',JSON.stringify({run,...receipt},null,2));console.log(JSON.stringify({run,...receipt,sourceHashes:undefined}));
}finally{await db?.end();if(!relay.State.Running)docker('stop',project+'-relay');save('cleanup.json',{relayRestored:true,populatedDataRetained:true});}
