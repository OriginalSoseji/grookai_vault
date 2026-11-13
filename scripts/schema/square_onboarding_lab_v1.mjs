// Only the two new, unlinked local profiles. Real SDK Auth; no forged JWTs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
import {SquareCatalogService} from '../../backend/square/service_v1.mjs';
const root='C:/grookai_square_onboarding_20261112',artifacts='C:/grookai_vault_operator_artifacts/square_onboarding_20261112/candidate-v2';
const [action,profile]=process.argv.slice(2);assert.ok(['seed','upgrade','test'].includes(action));assert.ok(['fresh','retained'].includes(profile));
const fresh=profile==='fresh',lab=artifacts+'/'+(fresh?'fresh-495':'retained-494b');
const project=fresh?'square-onboarding-fresh-v2-495-20261112':'square-onboard-retained-v2-494-20261112';
const migration='20261113050000_square_self_service_onboarding_v1.sql';
const sha=value=>createHash('sha256').update(value).digest('hex');
const candidateSha256=sha(fs.readFileSync(root+'/supabase/migrations/'+migration));
const runtimeFiles=['scripts/schema/square_onboarding_lab_v1.mjs','backend/square/service_v1.mjs','backend/square/client_v1.mjs','backend/square/credential_envelope_v1.mjs','backend/square/commerce_backend_v2.mjs'];
const sourceHashes=Object.fromEntries(runtimeFiles.map(file=>[file,sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n'))]));
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-proof.json')).pass,true);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:120000,maxBuffer:64000000,windowsHide:true}).trim();
assert.equal(sql("select current_setting('max_worker_processes')"),'0');
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(cfg.API_URL,fresh?'http://127.0.0.1:62941':'http://127.0.0.1:63141');
const admin=createClient(cfg.API_URL,localSupabaseStatusSecret(cfg),{auth:{persistSession:false,autoRefreshToken:false}});
const file=lab+'/runtime-fixture.private.json',fixture=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
const save=()=>fs.writeFileSync(file,JSON.stringify(fixture,null,2),{mode:0o600});
async function rpc(client,name,args={}){const result=await client.rpc(name,args);if(result.error)throw Error(result.error.message);return result.data;}
const rpcService=async(action,data)=>rpc(admin,'square_commerce_service_v2',{p_action:action,p_data:data});
async function login(role){const client=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const result=await client.auth.signInWithPassword({email:fixture[role].email,password:fixture[role].password});assert.ifError(result.error);return client;}
const key=Buffer.alloc(32,17).toString('base64');
const config={environment:'sandbox',appId:'sandbox-fixture-app',appSecret:'fixture-only-secret',encryptionKey:key,callbackUrl:'https://example.invalid/api/square/oauth/callback',linkingEnabled:true,catalogEnabled:true,commerceEnabled:true};
async function link(actor,merchant){
 let state;
 const catalog=new SquareCatalogService({rpc:rpcService,config,clientFactory:()=>({
  authorizationUrl:input=>{state=input.state;return'https://connect.squareupsandbox.com/oauth2/authorize';},
  obtainToken:async()=>({merchantId:merchant,accessToken:'synthetic-local-access',refreshToken:'synthetic-local-refresh',expiresAt:'2099-01-01T00:00:00Z'}),
  merchant:async()=>({id:merchant}),locations:async()=>[{id:'fixtureLocation',name:'My shop'}],
 })});
 const start=await catalog.start(actor,{clientReturn:'native'});
 const launch=await catalog.launch(new URL(start.launchUrl).searchParams.get('capability'));
 return catalog.callback({state,browserNonce:launch.browserNonce,code:'local-fixture-only'});
}
if(action==='seed'){
 assert.equal(fs.existsSync(lab+'/seed-runtime-proof.json'),false,'Consumed seed');
 for(const role of['owner','legacy','collector','inactive','web'])if(!fixture[role]){
  const email='square-onboarding-'+role+'-'+randomUUID()+'@fixture.invalid',password='Local-'+randomUUID()+'!';
  const result=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(result.error);
  fixture[role]={id:result.data.user.id,email,password};save();
 }
 for(const role of['owner','legacy','collector','inactive','web'])assert.match(fixture[role].id,/^[0-9a-f-]{36}$/);
 if(!fixture.seeded){
  sql(fs.readFileSync(root+'/backend/square/tests/onboarding_fixture_v1.sql','utf8').replaceAll('__OWNER__',fixture.owner.id).replaceAll('__OTHER__',fixture.legacy.id));
  sql(`insert into public.user_entitlements(user_id,tier,role,features,is_active) values('${fixture.web.id}','vendor','vendor','{"vendor_tools":true}',true),('${fixture.inactive.id}','vendor','vendor','{"vendor_tools":true}',false);`);
  fixture.seeded=true;save();
 }
 if(!fixture.controls){
  await rpc(admin,'square_controls_set_v1',{p_expected_revision:0,p_linking:true,p_catalog:true,p_owners:[fixture.legacy.id]});
  await rpc(admin,'square_commerce_controls_set_v2',{p_expected_revision:0,p_enabled:true,p_owners:[fixture.legacy.id]});
  fixture.controls=true;save();
 }
 if(!fixture.legacyConnection){await link(fixture.legacy.id,'legacyMerchant');fixture.legacyConnection=(await rpc(await login('legacy'),'square_workspace_v1')).connections[0].id;save();}
 fs.writeFileSync(lab+'/seed-runtime-proof.json',JSON.stringify({pass:true,candidateSha256,actualLocalAuthUsers:5,existingVendorConnection:true,productionWrites:0},null,2),{flag:'wx'});
 console.log(JSON.stringify({pass:true,phase:action,profile,productionWrites:0}));
}else if(action==='upgrade'){
 assert.equal(fresh,false);assert.equal(fs.existsSync(lab+'/upgrade-intent.json'),false,'Consumed upgrade');
 assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'494');
 const tables=JSON.parse(sql("select json_agg(json_build_object('schema',n.nspname,'table',c.relname) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and (n.nspname in ('public','grookai_square','grookai_inventory','grookai_vendor_pricing') or (n.nspname='auth' and c.relname='users'))"));
 const query=tables.map(table=>{assert.match(table.schema,/^[a-z_]+$/);assert.match(table.table,/^[a-z0-9_]+$/);return`select '${table.schema}.${table.table}' name,count(*)::text rows,md5(coalesce(string_agg(to_jsonb(t)::text,',' order by to_jsonb(t)::text),'')) checksum from "${table.schema}"."${table.table}" t`;}).join(' union all ');
 const snapshot=()=>JSON.parse(sql('begin isolation level repeatable read read only;select json_agg(x order by name) from ('+query+') x;rollback;'));
 const before=snapshot();fs.writeFileSync(lab+'/retained-before.private.json',JSON.stringify(before),{flag:'wx'});
 fs.copyFileSync(root+'/supabase/migrations/'+migration,lab+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(lab+'/upgrade-intent.json',JSON.stringify({at:new Date().toISOString(),candidateSha256,productionWrites:0,consumed:true}),{flag:'wx'});
 for(const name of['upgrade-495','upgrade-noop']){
  const fd=fs.openSync(lab+'/'+name+'.log','wx');let result;
  try{result=spawnSync('supabase',['db','push','--local','--workdir',lab,'--network-id',project,'--yes'],{windowsHide:true,timeout:180000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
  assert.ifError(result.error);assert.equal(result.status,0,name);
 }
 assert.match(fs.readFileSync(lab+'/upgrade-noop.log','utf8'),/up to date/i);
 assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'495');
 assert.deepEqual(snapshot(),before,'Pre-existing rows changed');
 assert.equal(sql('select enabled from grookai_square.onboarding_controls where singleton'),'f');
 fs.writeFileSync(lab+'/upgrade-proof.json',JSON.stringify({pass:true,candidateSha256,unchangedDataTables:tables.length,actualLocalAuthUsers:5,defaultOff:true,noop:true,productionWrites:0},null,2),{flag:'wx'});
 console.log(JSON.stringify({pass:true,phase:action,unchangedDataTables:tables.length,productionWrites:0}));
}else{
 assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'495');
 assert.equal(fs.existsSync(lab+'/runtime-proof.json'),false,'Consumed runtime proof');
 const checks=[];const check=name=>checks.push(name);
 const owner=await login('owner'),legacy=await login('legacy'),collector=await login('collector'),inactive=await login('inactive'),web=await login('web');
 assert.equal((await rpc(legacy,'square_workspace_v1')).linkingEnabled,true);
 assert.equal((await rpc(owner,'square_onboarding_access_v1')).available,false);
 assert.equal((await owner.rpc('square_onboarding_enroll_v1')).error.message,'square_linking_disabled');check('default-off and existing seller continuity');
 const anon=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const name of['square_onboarding_access_v1','square_onboarding_enroll_v1'])assert.ok((await anon.rpc(name)).error);
 assert.ok((await owner.rpc('square_onboarding_controls_set_v1',{p_expected_revision:0,p_enabled:true})).error);
 assert.ok((await admin.rpc('square_onboarding_enroll_v1')).error);
 for(const name of['square_onboarding_owner_v1','square_onboarding_eligible_v1'])assert.ok((await owner.rpc(name,{p_owner:fixture.legacy.id})).error);check('anonymous, service-owner spoof and private/control authority denied');
 await rpc(admin,'square_onboarding_controls_set_v1',{p_expected_revision:0,p_enabled:true});
 assert.equal((await rpc(owner,'square_onboarding_access_v1')).available,true);
 for(const user of[collector,inactive]){assert.equal((await rpc(user,'square_onboarding_access_v1')).eligible,false);assert.ok((await user.rpc('square_onboarding_enroll_v1')).error);}
 assert.equal(sql('select count(*) from grookai_square.onboarding_grants'),'0');check('eligible access is read-only; collectors and inactive vendors cannot enroll');
 for(let i=0;i<3;i++)await rpc(owner,'square_onboarding_access_v1');
 assert.equal(sql('select count(*) from grookai_square.onboarding_grants'),'0');
 await Promise.all(Array.from({length:12},()=>rpc(owner,'square_onboarding_enroll_v1')));
 assert.equal(sql('select count(*) from grookai_square.onboarding_grants'),'1');
 assert.equal((await rpc(owner,'square_workspace_v1')).linkingEnabled,true);
 assert.equal((await rpc(web,'square_workspace_v1')).linkingEnabled,false);check('explicit enrollment is concurrent-idempotent and tenant-bound');
 assert.ok((await owner.rpc('square_onboarding_enroll_v1',{p_owner:fixture.web.id})).error);
 assert.ok((await owner.schema('grookai_square').from('onboarding_grants').select('*')).error);check('no foreign owner parameter or direct grant read');
 const copiesBefore=sql('select md5(string_agg(to_jsonb(v)::text,\',\' order by id)) from public.vault_item_instances v');
 const result=await link(fixture.owner.id,'newVendorMerchant');assert.equal(result.clientReturn,'native');
 const connection=(await rpc(owner,'square_workspace_v1')).connections[0];assert.equal(connection.locationId,null);assert.equal(connection.autoSync,false);
 const commerce=await rpc(owner,'square_commerce_workspace_v2');assert.equal(commerce.enabled,true);assert.equal(commerce.connections[0].sellOnSquare,false);
 assert.equal(sql('select count(*) from grookai_square.allocations'),'0');check('new owner links through actual state/browser/merchant authority without configuring or publishing stock');
 await rpc(web,'square_onboarding_enroll_v1');
 await assert.rejects(link(fixture.web.id,'legacyMerchant'),error=>/^square_[a-z_]+$/.test(error.code));
 assert.equal((await rpc(web,'square_workspace_v1')).connections.some(row=>row.status==='connected'),false);
 assert.equal(sql("select owner_id from grookai_square.connections where merchant_id='legacyMerchant'"),fixture.legacy.id);check('new grant cannot take an existing merchants binding');
 const control=await rpc(admin,'square_onboarding_controls_set_v1',{p_expected_revision:1,p_enabled:false});assert.equal(control,2);
 assert.equal((await rpc(owner,'square_workspace_v1')).linkingEnabled,true);
 assert.equal((await rpc(web,'square_onboarding_access_v1')).available,false);check('pausing new onboarding preserves already granted seller access');
 const copyId=sql(`select instance_id from square_onboarding_test_fixture.copies where owner_id='${fixture.owner.id}' order by instance_id limit 1`);
 assert.match(copyId,/^[0-9a-f-]{36}$/);
 sql(`begin;
 update public.vault_item_instances set intent='sell',pricing_mode='asking',asking_price_amount=20,asking_price_currency='USD' where id='${copyId}';
 do $$begin if grookai_square.offer('${fixture.owner.id}','${copyId}') is null then raise exception 'positive_offer_fixture_failed'; end if; end$$;
 update public.user_entitlements set is_active=false where user_id='${fixture.owner.id}';
 do $$begin if grookai_square.offer('${fixture.owner.id}','${copyId}') is not null then raise exception 'inactive_vendor_offer_bypass'; end if; end$$;
 rollback;`);check('an enrolled owner still needs active per-copy vendor eligibility before publication');
 sql(`update public.user_entitlements set is_active=false where user_id='${fixture.owner.id}'`);
 assert.equal((await rpc(owner,'square_onboarding_access_v1')).eligible,false);
 assert.equal((await rpc(owner,'square_workspace_v1')).linkingEnabled,true);
 assert.equal((await rpc(owner,'square_workspace_v1')).connections[0].status,'connected');
 sql(`update public.user_entitlements set is_active=true where user_id='${fixture.owner.id}'`);check('plan changes cannot sever an existing integration or its settlement readback; publication still uses the unchanged per-copy entitlement authority');
 assert.equal(sql('select md5(string_agg(to_jsonb(v)::text,\',\' order by id)) from public.vault_item_instances v'),copiesBefore);
 assert.equal(sql('select count(*) from grookai_square.allocations'),'0');assert.equal(sql('select count(*) from grookai_square.sales'),'0');
 assert.equal(sql('select enabled from grookai_vendor_pricing.controls where singleton'),'f');check('inventory, asking prices, stock, sales and paused pricing preserved');
 fixture.newConnection=connection.id;save();
 for(const[file,pin]of Object.entries(sourceHashes))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Source changed during execution');
 const proof={pass:true,profile,candidateSha256,sourceHashes,actualLocalAuthUsers:5,checks,productionWrites:0};
 fs.writeFileSync(lab+'/runtime-proof.json',JSON.stringify(proof,null,2),{flag:'wx'});
 if(!fs.existsSync(artifacts+'/runtime-proof.json'))fs.writeFileSync(artifacts+'/runtime-proof.json',JSON.stringify(proof,null,2),{flag:'wx'});
 console.log(JSON.stringify({pass:true,profile,checks:checks.length,productionWrites:0}));
}
