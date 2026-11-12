import {localSupabaseStatusSecret} from '../lib/local_supabase_cli_status_v1.mjs';
// Exact new local494 lab only. Actual GoTrue sign-in; no forged owner JWTs.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {randomUUID} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const lab='C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112/fresh-494',project='vendor-pricing-fresh-494-20261112',container='supabase_db_'+project;
assert.equal(JSON.parse(fs.readFileSync(lab+'/replay-result.json')).pass,true);
assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
const cfg=JSON.parse(execFileSync('supabase',['status','--workdir',lab,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));
assert.equal(cfg.API_URL,'http://127.0.0.1:62341');
const admin=createClient(cfg.API_URL,localSupabaseStatusSecret(cfg),{auth:{persistSession:false,autoRefreshToken:false}});
const file=lab+'/runtime-fixture.private.json';
const fixture=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{};
const save=()=>fs.writeFileSync(file,JSON.stringify(fixture,null,2),{mode:0o600});
for(const role of ['owner','other']){
 if(fixture[role])continue;
 const email='vendor-pricing-'+role+'-'+randomUUID()+'@fixture.invalid',password='Local-'+randomUUID()+'!';
 const user=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(user.error);
 fixture[role]={id:user.data.user.id,email,password};save();
}
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:60000,maxBuffer:16000000,windowsHide:true}).trim();
assert.equal(sql('select count(*) from supabase_migrations.schema_migrations'),'494');
if(!fixture.seeded){
 const input=fs.readFileSync('backend/vendor_pricing/tests/runtime_fixture_v1.sql','utf8').replaceAll('__OWNER__',fixture.owner.id).replaceAll('__OTHER__',fixture.other.id);
 sql(input);fixture.seeded=true;fixture.copies=JSON.parse(sql('select json_agg(c order by gvvi) from pricing_test_fixture.copies c'));save();
}
for(const role of ['owner','other']){
 const client=createClient(cfg.API_URL,cfg.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await client.auth.signInWithPassword({email:fixture[role].email,password:fixture[role].password});assert.ifError(login.error);
 const workspace=await client.rpc('vendor_pricing_v1',{p_action:'workspace',p_data:{}});assert.ifError(workspace.error);assert.deepEqual(workspace.data.rules,[]);
}
const printing=fixture.copies[0].printing_id;
const market=await admin.rpc('get_market_pricing_read_model_v1',{p_card_print_ids:[],p_card_printing_ids:[printing]});assert.ifError(market.error);
assert.equal(market.data[0].status,'available');assert.equal(market.data[0].market_close,10.10);assert.equal(market.data[0].freshness,'fresh');
fs.writeFileSync(lab+'/runtime-fixture-result.json',JSON.stringify({pass:true,actualLocalAuthUsers:2,copies:4,reader:'unchanged full494 governed RPC',marketAmount:10.10,productionWrites:0},null,2));
console.log(JSON.stringify({pass:true,actualLocalAuthUsers:2,actualFullSchemaReader:true,productionWrites:0}));
