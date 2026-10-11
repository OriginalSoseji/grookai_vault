// Isolated additive collector fixture. Prior rows and every control are retained.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash, randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import pg from 'pg';
const root='C:/gv_product_collector_usability_20261008',base='C:/grookai_vault_operator_artifacts/product_collector_usability_20261008';
const lab='C:/grookai_vault_operator_artifacts/product_portfolio_history_20261008/full-438-v2',project='portfolio-full-438-v2-20261008';
assert.equal(fs.realpathSync('.').replaceAll('\\','/'),root);
assert.equal(process.argv.length,3);
const run=process.argv[2];assert.match(run,new RegExp('^'+base+'/ui-[0-9]+$'));
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const command=(name,args)=>execFileSync(name,args,{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:60000,maxBuffer:32*1024*1024});
const baseline=read(base+'/BASELINE_429.json');assert.equal(baseline.status,'passed');
for(const [name,hash]of Object.entries(baseline.sourceHashes))assert.equal(sha(root+'/supabase/migrations/'+name),hash,name);
const cfg=JSON.parse(command('supabase',['status','-o','json','--workdir',lab]));assert.equal(cfg.API_URL,'http://127.0.0.1:35521');
const container=JSON.parse(command('docker',['inspect','supabase_db_'+project]))[0];assert.equal(container.State.Running,true);assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(command('docker',['network','inspect',project]))[0].Internal,true);
const relay=JSON.parse(command('docker',['inspect',project+'-relay']))[0];for(const port of[35520,35521])assert.deepEqual(relay.NetworkSettings.Ports[port+'/tcp'],[{HostIp:'127.0.0.1',HostPort:String(port)}]);
const db=new pg.Client({connectionString:'postgresql://postgres:postgres@127.0.0.1:35520/postgres',connectionTimeoutMillis:10000});await db.connect();
const q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const save=(name,value,exclusive=true)=>fs.writeFileSync(run+'/'+name,JSON.stringify(value,null,2)+'\n',exclusive?{flag:'wx'}:{});
async function fingerprints(table){assert.match(table,/^[a-z_]+\.[a-z_0-9]+$/);return Object.fromEntries((await q('select md5(to_jsonb(t)::text) hash,count(*)::integer n from '+table+' t group by 1')).map(r=>[r.hash,r.n]));}
async function retention(f){
 const before=read(run+'/before.private.json');
 for(const [table,hashes] of Object.entries(before)){
  const after=await fingerprints(table);for(const [hash,n]of Object.entries(hashes))assert.ok((after[hash]??0)>=n,'Prior row changed: '+table);
 }
 assert.equal((await q('select count(*)::int n from public_profiles where user_id=any($1::uuid[])',[f.users.map(u=>u.id)]))[0].n,0);
 assert.equal((await q('select count(*)::int n from market_price_current_publication'))[0].n,0);
 assert.equal((await q('select enabled from portfolio_history_control'))[0].enabled,false);
 return {priorTables:Object.keys(before).length,profileRowsCreated:0};
}
async function restoreFlags(flags){
 await q('begin');
 try {
  // Only this isolated transaction suppresses the updated_at trigger while restoring its exact prior bytes.
  await q('set local session_replication_role = replica');
  for(const row of flags)await q('update binder_feature_flags set enabled=$2,description=$3,updated_at=$4 where flag_key=$1',[row.flag_key,row.enabled,row.description,row.updated_at]);
  assert.deepEqual((await q('select to_jsonb(t) row from binder_feature_flags t order by flag_key')).map(r=>r.row),flags);
  await q('commit');
 }catch(error){await q('rollback');throw error;}
}
const f=read(run+'/fixture.private.json');assert.equal(f.state,'prepared');assert.equal(f.project,project);
const out=run+'/collaboration-'+Date.now();fs.mkdirSync(out);const steps=[];
const record=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const controls=(await q('select to_jsonb(t) row from binder_feature_flags t order by flag_key')).map(r=>r.row);
record('controls-before.private.json',controls);
try {
 const state=(await q("select host(inet_server_addr()) address,current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) migrations"))[0];assert.equal(state.address,container.NetworkSettings.Networks[project].IPAddress);assert.equal(state.workers,'0');assert.equal(state.migrations,438);
 const clients=[];
 for(const user of [f.users[2],f.users[0]]){const client=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const auth=await client.auth.signInWithPassword({email:user.email,password:user.password});assert.equal(auth.error,null);assert.equal(auth.data.user.id,user.id);clients.push(client);}
 const [owner,contributor]=clients,anon=createClient(cfg.API_URL,cfg.PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(client,name,args)=>{const result=await client.rpc(name,args);record('step-'+String(steps.length).padStart(2,'0')+'.private.json',{name,result});assert.equal(result.error,null,name+': '+result.error?.message);steps.push(name);return result.data;};
 const copy=(await q('select to_jsonb(t) row from vault_item_instances t where user_id=$1 and card_print_id=$2 order by created_at limit 1',[f.users[0].id,f.card]))[0].row;
 record('copy-before.private.json',copy);
 await q("update binder_feature_flags set enabled=true where flag_key in ('schema_internal','personal','custom','shared','public')");
 const made=await rpc(owner,'binder_create_v1',{p_title:'Public collaboration proof',p_target_kind:'custom',p_checklist_mode:'custom',p_idempotency_key:randomUUID(),p_custom_slots:[{card_print_id:f.card,card_printing_id:f.printing,required_quantity:1}]});
 const publicId=made.binder_public_id;assert.match(publicId,/^[a-f0-9-]{36}$/);
 record('binder.private.json',{publicId,ownerId:f.users[2].id,contributorId:f.users[0].id,copyId:copy.id});
 await rpc(owner,'binder_update_policy_v1',{p_public_id:publicId,p_read_access:'public',p_discoverability:'unlisted',p_join_policy:'invite_only',p_contribution_policy:'members_direct',p_idempotency_key:randomUUID()});
 const invited=await rpc(owner,'binder_invite_create_v1',{p_public_id:publicId,p_max_role:'contributor',p_recipient_user_id:f.users[0].id,p_idempotency_key:randomUUID()});
 await rpc(contributor,'binder_invite_respond_v1',{p_invitation_id:invited.invitation_id,p_decision:'accept',p_idempotency_key:randomUUID()});
 const denied=await owner.rpc('binder_contribution_add_v1',{p_public_id:publicId,p_vault_item_instance_id:copy.id,p_idempotency_key:randomUUID()});assert.ok(denied.error,'Binder owner must not contribute another collector copy');record('foreign-copy-denied.private.json',denied);
 const foreign=await owner.from('vault_item_instances').select('id').eq('id',copy.id);assert.equal(foreign.error,null);assert.deepEqual(foreign.data,[]);
 const added=await rpc(contributor,'binder_contribution_add_v1',{p_public_id:publicId,p_vault_item_instance_id:copy.id,p_idempotency_key:randomUUID()});assert.equal(added.state,'active');
 const noConsent=await rpc(anon,'binder_public_detail_v1',{p_public_id:publicId});assert.equal(noConsent.progress.completed_slots,0);
 assert.deepEqual((await q('select to_jsonb(t) row from vault_item_instances t where id=$1',[copy.id]))[0].row,copy);
 await rpc(contributor,'binder_member_preferences_v1',{p_public_id:publicId,p_alias:null,p_content_scope:'public',p_identity_scope:'none',p_notification_preference:'muted',p_idempotency_key:randomUUID()});
 const consent=await rpc(anon,'binder_public_detail_v1',{p_public_id:publicId});assert.equal(consent.progress.completed_slots,1);
 const serialized=JSON.stringify(consent);for(const secret of [f.users[0].id,f.users[0].email,copy.id,copy.gv_vi_id])if(secret)assert.equal(serialized.includes(secret),false,'Public projection includes private identity');
 await rpc(contributor,'binder_contribution_withdraw_v1',{p_contribution_id:added.contribution_id,p_idempotency_key:randomUUID()});
 const withdrawn=await rpc(anon,'binder_public_detail_v1',{p_public_id:publicId});assert.equal(withdrawn.progress.completed_slots,0);
 assert.deepEqual((await q('select to_jsonb(t) row from vault_item_instances t where id=$1',[copy.id]))[0].row,copy);
 record('result.json',{status:'passed',at:new Date().toISOString(),publicId,actualAuth:true,copyOwnershipUnchanged:true,foreignCopyDenied:true,publicProgressRequiresContentConsent:true,privateIdentityAbsent:true,withdrawalRetainsCopy:true,steps,...await retention(f),productionWrites:0,externalDeliveries:0,controlsStillPrepared:true,producerSha256:sha(new URL(import.meta.url))});
 console.log(JSON.stringify({status:'passed',out,steps:steps.length}));
}catch(error){await restoreFlags(controls);record('failure.json',{message:error.message,stack:error.stack,controlsRestoredToBefore:true});throw error;}finally{await db.end();}
