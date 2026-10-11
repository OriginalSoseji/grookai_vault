// One-use synthetic proof of the unchanged Edge handler and canonical writer.
// The bootstrap changes only the listener's address, keeping it loopback-only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync,spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_collector_home_20261008',base='C:/grookai_vault_operator_artifacts/product_collector_home_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2',project='portfolio-full-438-v2-20261008';
assert.equal(process.argv.length,2);assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:16*1024*1024});
const baseline=read(base+'/BASELINE_429.json');assert.equal(baseline.status,'passed');assert.equal(baseline.productionWrites,0);assert.equal(baseline.sourceMigrations,438);
assert.ok(Date.now()-Date.parse(baseline.at)<7200000,'Fresh baseline required');
for(const[n,h]of Object.entries(baseline.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+n),h,n);
const freeze=read(lab+'/freeze.json');assert.equal(freeze.project,project);assert.deepEqual(freeze.sourceHashes,baseline.sourceHashes);assert.equal(sha(lab+'/supabase/config.toml'),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of[35520,35521])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const run=base+'/private-add-'+Date.now();fs.mkdirSync(run);
const save=(n,v)=>fs.writeFileSync(run+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const hashes={};for(const file of ['supabase/functions/vault-add-card-instance-v1/index.ts','supabase/functions/_shared/auth.ts','supabase/functions/_shared/key_resolver.ts','supabase/functions/_shared/cors.ts','supabase/functions/_shared/jungle_edition_error.ts'])hashes[file]=sha(root+'/'+file);
save('intent.json',{at:new Date().toISOString(),root,project,baseline:baseline.out,sourceHashes:hashes,producerSha256:sha(fileURLToPath(import.meta.url)),productionWrites:0,applyAuthority:false,listener:'127.0.0.1:35690',dependencyFetches:0});
let edge,fd,prior,tables,result;
const cases=[];
async function fingerprints(table){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);return Object.fromEntries((await q('select md5(to_jsonb(t)::text) hash,count(*)::integer n from '+table+' t group by 1')).map(r=>[r.hash,r.n]));}
try{
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations,(select enabled from portfolio_history_control) history,(select count(*)::int from market_price_current_publication) pointers"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);assert.equal(state.history,false);assert.equal(state.pointers,0);
 tables=(await q("select table_schema||'.'||table_name name from information_schema.tables where table_type='BASE TABLE' and (table_schema='public' or (table_schema='auth' and table_name='users') or (table_schema='supabase_migrations' and table_name='schema_migrations')) order by 1")).map(r=>r.name);
 prior={};for(const table of tables)prior[table]=await fingerprints(table);save('before.private.json',prior);
 const admin=createClient(cfg.API_URL,cfg.SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),users=[];
 for(let i=0;i<2;i++){const email=randomUUID()+'@collector-home.invalid',password=randomUUID()+'Aa9!';const made=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.equal(made.error,null);assert.ok(made.data.user?.id);const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const signed=await client.auth.signInWithPassword({email,password});assert.equal(signed.error,null);users.push({id:made.data.user.id,email,password,token:signed.data.session.access_token});}
 const fixture={users,set:randomUUID(),card:randomUUID(),printing:randomUUID()};fixture.gv='GV-PK-COLLECTOR-'+fixture.card;save('fixture.private.json',fixture);
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[users.map(u=>u.id)]))[0].n,0);
 await q('begin');
 try{
  await q("insert into sets(id,code,name,game) values($1,$2,'Synthetic collector start','pokemon')",[fixture.set,'collector-'+fixture.set]);
  await q("insert into card_prints(id,game_id,set_id,set_code,name,number,gv_id,image_status,identity_domain) values($1,(select id from games where code='pokemon'),$2,$3,'First collection card','1',$4,'missing','pokemon_eng_standard')",[fixture.card,fixture.set,'collector-'+fixture.set,fixture.gv]);
  await q("insert into card_print_identity(id,card_print_id,identity_domain,set_code_identity,printed_number,normalized_printed_name,source_name_raw,identity_payload,identity_key_version,identity_key_hash,is_active) values($1,$2,'pokemon_eng_standard',$3,'1','first collection card','First collection card','{\"variant_key_current\":\"standard\"}','pokemon_eng_standard:v1',$4,true)",[randomUUID(),fixture.card,'collector-'+fixture.set,createHash('sha256').update(fixture.card).digest('hex')]);
  await q("insert into card_printings(id,card_print_id,finish_key,printing_gv_id,is_provisional) values($1,$2,'normal',$3,false)",[fixture.printing,fixture.card,fixture.gv+'-NORMAL']);
  await q('commit');
 }catch(error){await q('rollback');throw error;}
 const bootstrap=`const originalListen=Deno.listen.bind(Deno);\nDeno.listen=(options)=>{if(options.port!==8000 || (options.transport && options.transport!=='tcp'))throw new Error('Unexpected listener');return originalListen({...options,hostname:'127.0.0.1',port:35690});};\nawait import('file:///${root}/supabase/functions/vault-add-card-instance-v1/index.ts');\n`;
 fs.writeFileSync(run+'/edge-loopback.ts',bootstrap,{flag:'wx'});
 const env={};for(const name of ['PATH','Path','SystemRoot','SYSTEMROOT','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP'])if(process.env[name])env[name]=process.env[name];
 Object.assign(env,{SUPABASE_URL:cfg.API_URL,SUPABASE_SECRET_KEY:cfg.SECRET_KEY,DENO_NO_UPDATE_CHECK:'1',DENO_NO_PACKAGE_JSON:'1'});
 fd=fs.openSync(run+'/edge.private.log','wx');edge=spawn('C:/Users/ccabr/scoop/apps/deno/current/deno.exe',['run','--cached-only','--no-check','--no-config','--no-lock','--no-prompt','--allow-env','--allow-net=127.0.0.1:35521,127.0.0.1:35690',run+'/edge-loopback.ts'],{cwd:root,env,windowsHide:true,stdio:['ignore',fd,fd]});
 let ready=false;for(let i=0;i<60;i++){if(edge.exitCode!==null)throw new Error('Edge failed: inspect private log');try{const r=await fetch('http://127.0.0.1:35690',{method:'OPTIONS',signal:AbortSignal.timeout(1000)});if(r.status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,250));}assert.equal(ready,true,'Edge listener did not become ready');
 const call=async(user,body)=>{const r=await fetch('http://127.0.0.1:35690/functions/v1/vault-add-card-instance-v1',{method:'POST',headers:{'content-type':'application/json',...(user?{authorization:'Bearer '+user.token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});return {status:r.status,data:await r.json()};};
 const body={card_print_id:fixture.card,card_printing_id:fixture.printing,quantity:1,condition_label:'NM'};
 const anonymous=await call(null,body);assert.equal(anonymous.status,401);cases.push('anonymous rejected before inventory write');
 const first=await call(users[0],body);assert.equal(first.status,200);assert.equal(first.data.success,true);assert.equal(first.data.result.created_count,1);assert.equal(first.data.result.card_printing_id,fixture.printing);cases.push('missing-profile owner adds exact printing through unchanged Edge handler');
 const spoof=await call(users[1],{...body,p_actor_user_id:users[0].id,user_id:users[0].id});assert.equal(spoof.status,200);assert.equal(spoof.data.result.created_count,1);cases.push('body actor cannot override authenticated owner');
 const copies=await q('select id,user_id,card_print_id,card_printing_id,gv_vi_id from vault_item_instances where user_id=any($1::uuid[]) order by user_id',[users.map(u=>u.id)]);assert.equal(copies.length,2);for(const user of users){const own=copies.filter(c=>c.user_id===user.id);assert.equal(own.length,1);assert.equal(own[0].card_print_id,fixture.card);assert.equal(own[0].card_printing_id,fixture.printing);}
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[users.map(u=>u.id)]))[0].n,0);cases.push('private add does not create a public profile or sharing settings');
 const ownClient=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+users[0].token}}});
 const ownCopy=copies.find(c=>c.user_id===users[0].id),foreignCopy=copies.find(c=>c.user_id===users[1].id);
 const ownRead=await ownClient.from('vault_item_instances').select('id').eq('id',ownCopy.id);assert.equal(ownRead.error,null);assert.deepEqual(ownRead.data,[{id:ownCopy.id}]);
 const foreignRead=await ownClient.from('vault_item_instances').select('id').eq('id',foreignCopy.id);assert.equal(foreignRead.error,null);assert.deepEqual(foreignRead.data,[]);cases.push('actual authenticated reads expose own copy and hide other owner');
 for(const[p,h]of Object.entries(hashes))assert.equal(sha(root+'/'+p),h,p);
 result={status:'passed',at:new Date().toISOString(),cases,actualAuth:true,actualEdgeHandler:true,loopbackListenerAdapter:true,businessSourceUnchanged:true,dependencyFetches:0,productionWrites:0,profileRowsCreated:0,copiesCreated:2,run};save('result.json',result);
}catch(error){save('failure.json',{message:error.message,stack:error.stack,cases});throw error;}
finally{
 if(edge&&edge.exitCode===null){edge.kill();await new Promise(resolve=>edge.once('exit',resolve));}if(fd!==undefined)fs.closeSync(fd);
 try{await q('rollback');if(prior){for(const table of tables){const after=await fingerprints(table);for(const[h,n]of Object.entries(prior[table]))assert.ok((after[h]??0)>=n,table+': prior row changed');}assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);assert.equal((await q('select count(*)::int n from market_price_current_publication'))[0].n,0);save('retention.json',{status:'passed',at:new Date().toISOString(),priorTables:tables.length,allPriorRowsRetained:true,controlsUnchanged:true,productionWrites:0,syntheticFixtureRetained:true});}}
 finally{await db.end();}
}
fs.writeFileSync(base+'/PRIVATE_ADD_V1.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
