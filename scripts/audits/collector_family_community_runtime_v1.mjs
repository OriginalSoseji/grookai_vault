// Real SDK journeys against the owned local proof project; never production.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
const root='C:/gv_app_integration_20261028';assert.equal(process.cwd().replaceAll('\\','/'),root);
const base='C:/gv_intake_recovery_private_20261027/reviewed-intake-release-v1';
const project='reviewed-intake-fresh-478-20261028',lab=base+'/local-fresh-478';
const resume=process.argv.includes('--resume-community');
const prior=base+'/family-community-runtime-v1';
const out=resume?base+'/family-community-runtime-community-resume-v1':prior;assert.equal(fs.existsSync(out),false);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const db='supabase_db_'+project;const info=JSON.parse(execFileSync('docker',['inspect',db],{encoding:'utf8'}))[0];
assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(info.Image,'sha256:4c39816ce8d9303a3aba1161c842929c73a40c7109a9ef1b644582478e31832e');
const sql=q=>execFileSync('docker',['exec','-i',db,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:60000,maxBuffer:8_000_000}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');assert.equal(sql('select count(*) from auth.users'),'2');
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const env={...process.env};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];
const status=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--network-id',project,'--output','json'],{env,encoding:'utf8',stdio:['ignore','pipe','pipe']}));
assert.equal(new URL(status.API_URL).port,'60561');const url='http://127.0.0.1:60561';
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const admin=createClient(url,localSupabaseStatusSecret(status),options),anonymous=createClient(url,status.ANON_KEY,options);
const accounts=JSON.parse(fs.readFileSync(base+'/runtime-qualification-v1/accounts-private.json'));
const ok=r=>{if(r.error)throw Error('Local SDK error: '+r.error.code);return r.data;};
const clients=[];for(const account of accounts.users){const client=createClient(url,status.ANON_KEY,options);ok(await client.auth.signInWithPassword({email:account.email,password:accounts.password}));assert.equal(ok(await client.auth.getUser()).user.id,account.id);clients.push(client);}
const [owner,peer]=clients;const [ownerAccount,peerAccount]=accounts.users;
fs.mkdirSync(out);const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const flags=JSON.parse(sql('select jsonb_agg(to_jsonb(f) order by flag_key) from public.binder_feature_flags f'));
assert.ok(flags.every(f=>f.enabled===false));save('flags-before.json',flags);
const card=sql("select id from public.card_prints where set_code='pgo' and number='1' limit 1"),printing=resume?JSON.parse(fs.readFileSync(prior+'/intent.json')).printing:randomUUID();
assert.match(card,/^[a-f0-9-]{36}$/);save('intent.json',{at:new Date().toISOString(),project,card,printing,syntheticLocalPrintingFixture:true,realExistingGoTrueAccounts:true,productionWrites:0});
let step=resume?22:0;const tests=[];
async function rpc(client,name,params={},mutate=false){
  const request={...params,...(mutate?{p_idempotency_key:'collector-family-v1-'+name+'-'+step}:{})};
  const r=await client.rpc(name,request);save(String(++step).padStart(3,'0')+'-'+name+'.json',r);
  if(r.error)throw Error(name+': '+r.error.code);assert.ok(r.data!==null,name+' missing receipt');assert.notEqual(r.data.ok,false,name+' denied');return r.data;
}
async function denied(client,name,params){const r=await client.rpc(name,params);save(String(++step).padStart(3,'0')+'-denied-'+name+'.json',r);assert.ok(r.error||r.data===null||r.data?.ok===false,name+' unexpectedly readable');}
function safePublic(value){const prohibited=new Set(['acquisition_cost','acquisition_currency','acquisition_lot_id','intake_item_id','intake_allocation','intake_tags','snapshot','saved_instance_ids','plaintext_token']);const walk=v=>{if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){assert.ok(!prohibited.has(k),'Public projection leaked '+k);walk(x);}};walk(value);}
try{
  // Existing Binder qualification uses this operational flag fixture locally.
  sql("update public.binder_feature_flags set enabled=true where flag_key in ('schema_internal','personal','shared','view_links','public','community','custom','templates');");
  let copy,community;
  if(!resume){
  assert.equal(sql(`select count(*) from public.card_printings where card_print_id='${card}'`),'0');
  sql(`insert into public.card_printings(id,card_print_id,finish_key) values('${printing}','${card}','normal');`);
  const added=ok(await admin.rpc('vault_add_card_instance_service_v1',{p_actor_user_id:peerAccount.id,p_card_print_id:card,p_card_printing_id:printing,p_quantity:1,p_condition_label:'LP',p_notes:'Local family private note'}));save('peer-copy-receipt.json',added);
  copy=sql(`select id from public.vault_item_instances where user_id='${peerAccount.id}' and card_printing_id='${printing}' and archived_at is null`);assert.match(copy,/^[a-f0-9-]{36}$/);
  const create=async title=>rpc(owner,'binder_create_v1',{p_title:title,p_target_kind:'custom',p_checklist_mode:'custom',p_custom_slots:[{card_print_id:card,card_printing_id:printing,required_quantity:1}]},true);
  const family=(await create('LOCAL QA family private')).binder_public_id;assert.match(family,/^[a-f0-9-]{36}$/);
  await denied(peer,'binder_detail_v1',{p_public_id:family});await denied(anonymous,'binder_public_detail_v1',{p_public_id:family});
  await rpc(owner,'binder_update_policy_v1',{p_public_id:family,p_read_access:'private',p_discoverability:'unlisted',p_join_policy:'invite_only',p_contribution_policy:'approval_required'},true);
  const invitation=await rpc(owner,'binder_invite_create_v1',{p_public_id:family,p_max_role:'contributor',p_recipient_user_id:peerAccount.id},true);assert.ok(invitation.token);
  const accepted=await rpc(peer,'binder_invite_accept_v1',{p_token:invitation.token},true);assert.equal(accepted.binder_public_id,family);
  await rpc(peer,'binder_detail_v1',{p_public_id:family});tests.push('private_family_denies_uninvited_reads_and_real_second_account_accepts');
  const contributed=await rpc(peer,'binder_contribution_add_v1',{p_public_id:family,p_vault_item_instance_id:copy,p_source:'manual'},true);assert.ok(contributed.contribution_id);
  assert.equal(sql(`select state from public.binder_contributions where id='${contributed.contribution_id}'`),'pending');
  await rpc(owner,'binder_contribution_decide_v1',{p_contribution_id:contributed.contribution_id,p_decision:'approve'},true);
  assert.equal(sql(`select state from public.binder_contributions where id='${contributed.contribution_id}'`),'active');
  await rpc(peer,'binder_contribution_withdraw_v1',{p_contribution_id:contributed.contribution_id},true);
  assert.equal(sql(`select state from public.binder_contributions where id='${contributed.contribution_id}'`),'withdrawn');
  assert.equal(sql(`select user_id from public.vault_item_instances where id='${copy}'`),peerAccount.id);tests.push('exact_owned_copy_requires_approval_withdraws_and_remains_in_owners_vault');
  await rpc(owner,'binder_update_policy_v1',{p_public_id:family,p_read_access:'link',p_discoverability:'unlisted',p_join_policy:'invite_only',p_contribution_policy:'approval_required'},true);
  const link=await rpc(owner,'binder_view_link_create_v1',{p_public_id:family,p_label:'LOCAL QA view'},true);assert.ok(link.token);
  const projection=await rpc(anonymous,'binder_view_link_detail_v1',{p_token:link.token});safePublic(projection);
  const rotated=await rpc(owner,'binder_view_link_rotate_v1',{p_view_link_id:link.view_link_id??link.id},true);assert.ok(rotated.token);
  await denied(anonymous,'binder_view_link_detail_v1',{p_token:link.token});safePublic(await rpc(anonymous,'binder_view_link_detail_v1',{p_token:rotated.token}));
  await rpc(owner,'binder_view_link_revoke_v1',{p_view_link_id:rotated.view_link_id??rotated.id},true);
  await denied(anonymous,'binder_view_link_detail_v1',{p_token:rotated.token});tests.push('view_only_link_redacts_private_intake_data_and_rotation_revocation_take_effect');
  community=(await create('LOCAL QA community')).binder_public_id;
  await rpc(owner,'binder_update_policy_v1',{p_public_id:community,p_read_access:'public',p_discoverability:'listed',p_join_policy:'request_to_join',p_contribution_policy:'approval_required'},true);
  safePublic(await rpc(anonymous,'binder_public_detail_v1',{p_public_id:community}));
  await rpc(peer,'binder_join_request_create_v1',{p_public_id:community},true);
  }else{
    const receipt=n=>JSON.parse(fs.readFileSync(prior+'/'+n));
    for(const n of ['001-binder_create_v1.json','006-binder_invite_accept_v1.json','009-binder_contribution_decide_v1.json','010-binder_contribution_withdraw_v1.json','013-binder_view_link_detail_v1.json','014-binder_view_link_rotate_v1.json','017-binder_view_link_revoke_v1.json','019-binder_create_v1.json','022-binder_join_request_create_v1.json'])assert.equal(receipt(n).error,null);
    community=receipt('019-binder_create_v1.json').data.binder_public_id;
    const original=receipt('intent.json');
    copy=sql(`select id from public.vault_item_instances where user_id='${peerAccount.id}' and card_printing_id='${original.printing}' and archived_at is null`);assert.match(copy,/^[a-f0-9-]{36}$/);
    tests.push('private_family_denies_uninvited_reads_and_real_second_account_accepts','exact_owned_copy_requires_approval_withdraws_and_remains_in_owners_vault','view_only_link_redacts_private_intake_data_and_rotation_revocation_take_effect');
  }
  const request=sql(`select r.id from public.binder_join_requests r join public.binders b on b.id=r.binder_id where b.public_id='${community}' and r.requester_user_id='${peerAccount.id}'`);assert.match(request,/^[a-f0-9-]{36}$/);
  await rpc(owner,'binder_join_request_decide_v1',{p_request_id:request,p_decision:'approve',p_role:'contributor'},true);
  const communityCopy=await rpc(peer,'binder_contribution_add_v1',{p_public_id:community,p_vault_item_instance_id:copy,p_source:'manual'},true);
  await rpc(owner,'binder_contribution_decide_v1',{p_contribution_id:communityCopy.contribution_id,p_decision:'approve'},true);
  safePublic(await rpc(anonymous,'binder_public_checklist_v1',{p_public_id:community,p_limit:50}));tests.push('public_community_join_request_and_copy_approval_use_existing_backend');
  const report={at:new Date().toISOString(),pass:true,tests,priorCompletedReceipts:resume?'family-community-runtime-v1':null,realGoTrueSdk:true,realBinderRpcs:true,syntheticLocalCanonicalFixture:true,founderWrites:0,productionWrites:0};save('result.json',report);
  fs.writeFileSync(root+'/docs/audits/app_refinement_integration_20261028/family-community-runtime.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,tests:tests.length,realAuthAndBinderRpcs:true,productionWrites:0}));
}finally{
  sql('update public.binder_feature_flags set enabled=false;');
  assert.equal(sql('select count(*) from public.binder_feature_flags where enabled'),'0');
  save('flags-restored.json',{at:new Date().toISOString(),enabled:0,productionWrites:0});
}
