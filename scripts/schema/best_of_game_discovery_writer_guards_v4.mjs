// Adversarial actual local rollback; no production connections or committed writes.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url)),art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120',lab='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120/fresh-513',project='bog-discovery-513-20261120',out=art+'/writer-guards-v4';assert.equal(process.argv.length,2);assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const sha=b=>createHash('sha256').update(b).digest('hex'),binding=JSON.parse(fs.readFileSync(root+'/scripts/schema/best_of_game_discovery_candidate_v4.json'));
for(const[f,p]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),p);
const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8',windowsHide:true}))[0];assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
const files=Object.keys(binding.candidates).sort(),candidate=files.map(file=>fs.readFileSync(root+'/supabase/migrations/'+file,'utf8')).join('\n'),body=candidate.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,''),r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database:'bog_perf_retained_513_v3',connectionTimeoutMillis:15000,application_name:'bog-discovery-local-writer-guards-v4'});
const report={pass:false,productionWrites:0,committed:false,startedAt:new Date().toISOString(),candidateSha256:sha(candidate),cases:[]};let before,security;
const fingerprint=async()=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
const securityRead=async()=>(await c.query(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;
const cases=[
 ['child_finish',"update public.card_printings set finish_key='normal' where printing_gv_id='GV-PK-BP-8-RH'",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['identity_hash',"update public.card_print_identity set identity_key_hash=repeat('0',64) where card_print_id='4e714b58-bcf3-4931-9c46-163dadba49b8' and is_active",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['printing_visibility',"update public.card_printing_truth_reviews set public_visibility='hidden_pending_review' where card_printing_id=(select id from public.card_printings where printing_gv_id='GV-PK-BP-1-REV') and active",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['alias_conflict',"update public.card_print_identity_aliases set canonical_card_print_id='cf3b8770-892a-41d8-8a47-647dbb742fee' where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['partial_authority',"update public.card_print_identity_aliases set active=false where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['view_permission',"grant update on public.v_card_prints_set_family_discovery_v1 to anon",'BEST_OF_GAME_POLICY_CACHE_PERMISSION_DRIFT'],
 ['view_invoker',"alter view public.v_card_prints_set_family_discovery_v1 set (security_invoker=false)",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['helper_body',"create or replace function public.get_best_of_game_discovery_projection_v1() returns jsonb language sql stable security definer set search_path='' as 'select null::jsonb'",'BEST_OF_GAME_POLICY_CACHE_BASELINE_DRIFT'],
 ['catalog_security',"alter function public.get_public_catalog_sets_v2(text) security invoker",'BEST_OF_GAME_CATALOG_MATERIALIZATION_BASELINE_DRIFT'],
 ['catalog_search_path',"alter function public.get_public_catalog_sets_v2(text) set search_path=public",'BEST_OF_GAME_CATALOG_MATERIALIZATION_BASELINE_DRIFT']
];
try{
 assert.equal(JSON.parse(fs.readFileSync(art+'/clones-v3-r1/result.json')).pass,true);
 await c.connect();assert.equal((await c.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,513);assert.equal((await c.query("select count(*)::int n from public.card_print_identity_aliases where legacy_set_code='bog' or canonical_set_code='bp'")).rows[0].n,9);assert.equal((await c.query("select current_setting('max_worker_processes') n")).rows[0].n,'0');before=await fingerprint();security=await securityRead();
 for(const[label,mutation,message]of cases){
  report.stage=label;await c.query('begin');await c.query("set local statement_timeout='60s'");await c.query(mutation);let rejected=false;try{await c.query(body);}catch(error){assert.match(error.message,new RegExp(message));rejected=true;report.cases.push({label,rejected:true,error:message});}assert.equal(rejected,true,label);await c.query('rollback');assert.deepEqual(await fingerprint(),before);assert.deepEqual(await securityRead(),security);
 }
 report.pass=true;report.protectedTables=Object.keys(before).length;report.partialAliasWritesCommitted=0;report.schemaSecurityRestored=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{await c.query('rollback').catch(()=>{});if(before){try{assert.deepEqual(await fingerprint(),before);report.finalProtectedStateExact=true;}catch(e){report.pass=false;report.protectionError=e.message;process.exitCode=1;}}await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
