// Synthetic fixtures and read-definition qualification in unlinked local labs only.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='C:/grookai_paldean_alias_20261117',out='C:/grookai_vault_operator_artifacts/paldean_alias_discovery_20261117';
const [profile,phase,attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.ok(['fresh','retained'].includes(profile));assert.ok(['fixture','upgrade','test'].includes(phase));assert.ok(attempt===undefined||(phase==='test'&&/^r[0-9]+$/.test(attempt)));
const fresh=profile==='fresh',project=fresh?'paldean-v2-fresh-501-20261118':'paldean-r3-retained-499-20261118',lab=out+(fresh?'/v2-fresh-501':'/r3-retained-499'),container='supabase_db_'+project;
const sha=x=>createHash('sha256').update(x).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const binding=read(root+'/scripts/schema/paldean_alias_candidate_v2.json');assert.equal(binding.version,'PALDEAN_ALIAS_DISCOVERY_CANDIDATE_V2');
for(const [file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const [migration]=Object.keys(binding.candidates),candidate=fs.readFileSync(root+'/supabase/migrations/'+migration,'utf8');assert.equal(Object.keys(binding.candidates).length,1);
const fixture=fs.readFileSync(root+'/scripts/schema/paldean_alias_runtime_fixture_v1.sql','utf8');
const receipt=lab+'/'+phase+'-proof-v2'+(attempt?'-'+attempt:'')+'.json';assert.equal(fs.existsSync(receipt),false);
const report={version:'PALDEAN_ALIAS_RUNTIME_V2',profile,phase,pass:false,startedAt:new Date().toISOString(),productionWrites:0,candidateSha256:sha(candidate),fixtureSha256:sha(fixture),scriptSha256:sha(fs.readFileSync(new URL(import.meta.url)))};
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:64000000,windowsHide:true}).trim();
const sql=input=>execFileSync('docker',['exec','-i',container,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:120000,maxBuffer:64000000,windowsHide:true}).trim();
const json=input=>JSON.parse(sql(input).split('\n').at(-1));
const fingerprint=()=>json('begin read only;select prismatic_fixture.fingerprints();rollback;');
const security=()=>json(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8'));
function guard(ledger,cards=1311,copies=6,users=1){assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(read(lab+'/replay-proof.json').pass,true);const info=JSON.parse(docker('inspect',container))[0];assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(docker('network','inspect',project))[0].Internal,true);assert.deepEqual(json("begin read only;select jsonb_build_object('ledger',(select count(*) from supabase_migrations.schema_migrations),'cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'workers',current_setting('max_worker_processes'));rollback;"),{ledger,cards,copies,users,workers:'0'});}
function cli(args,label){const env={...process.env,DO_NOT_TRACK:'1'};for(const k of Object.keys(env))if(/SUPABASE|DATABASE_URL|POSTGRES_URL/.test(k))delete env[k];const fd=fs.openSync(lab+'/'+label+'.log','wx');let r;try{r=spawnSync('supabase',[...args,'--workdir',lab,'--network-id',project],{cwd:lab,env,windowsHide:true,timeout:180000,stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}assert.ifError(r.error);assert.equal(r.status,0,label);}
function roleRead(role,query,mutation=''){const claims=JSON.stringify({role,...(role==='authenticated'?{sub:'10000000-0000-0000-0000-000000000016'}:{})});return json(`begin${mutation?'':' read only'};set local statement_timeout='60s';${mutation}\nset local role ${role};select set_config('request.jwt.claims','${claims}',true);${query}\nrollback;`);}
try{
 if(phase==='fixture'){guard(fresh?501:500,1294,0,0);sql(fixture);guard(fresh?501:500);report.syntheticOnly=true;}
 else if(phase==='upgrade'){
  assert.equal(fresh,false);guard(500);const before=fingerprint(),priorSecurity=security();
  const body=candidate.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');sql('begin;\n'+body+'\nrollback;');assert.deepEqual(fingerprint(),before);assert.deepEqual(security(),priorSecurity);
  fs.copyFileSync(root+'/supabase/migrations/'+migration,lab+'/supabase/migrations/'+migration,fs.constants.COPYFILE_EXCL);cli(['db','push','--local','--yes'],'upgrade-501');guard(501);assert.deepEqual(fingerprint(),before);cli(['db','push','--local','--yes'],'upgrade-501-noop');
  Object.assign(report,{rollbackRestoredSchemaAndRows:true,officialCliUpgrade:true,noopPush:true,protectedTables:Object.keys(before).length,protectedStateUnchanged:true});
 }else{
  guard(501);const before=fingerprint(),metrics=fs.readFileSync(root+'/scripts/schema/paldean_alias_runtime_metrics_v1.sql','utf8');
  const expected={paldeanExclusions:245,prismaticExclusions:180,paldeanRoute:'sv4pt5',prismaticRoute:'sv8pt5',otherGame:'sv04.5',shroudedRoute:'sv06.5',catalog:[{code:'sv4pt5',count:248},{code:'sv8pt5',count:194}],legacyDiscovery:0,canonicalDiscovery:248,stamps:3,unrelated:444,legacyFinishes:0,canonicalFinishes:4,identityFree:248,identityTyped:248,prismaticIdentity:194,exactLegacyParent:1,exactLegacyChild:1,wrongSet:0,prismaticLegacyParent:1,prismaticLegacyChild:1};
  report.roles=[];
  const probe="select jsonb_build_object('excluded',cardinality(public.get_paldean_fates_discovery_exclusions_v1()),'route',public.resolve_catalog_discovery_set_code_v1('sv04.5'),'legacy',(select count(*) from public.v_card_prints_discovery_v1 where set_code='sv04.5')) ;";
  for(const role of ['anon','authenticated']){
   assert.deepEqual(roleRead(role,metrics),expected,role);
   const negatives=[
    ['inactive',"update public.card_print_identity_aliases set active=false where legacy_set_code='sv04.5' and legacy_card_print_id=(select id from public.card_prints where set_code='sv04.5' and number='245');",{excluded:244,route:'sv04.5',legacy:1}],
    ['mismatchedEvidence',"update public.card_print_identity_aliases set authority_decision=jsonb_set(authority_decision,'{classification_sha256}',to_jsonb(repeat('0',64))) where legacy_set_code='sv04.5' and legacy_card_print_id=(select id from public.card_prints where set_code='sv04.5' and number='245');",{excluded:244,route:'sv04.5',legacy:1}],
    ['identityMismatch',"update public.card_prints set name='LOCAL MISMATCH' where set_code='sv4pt5' and number='245';",{excluded:244,route:'sv04.5',legacy:1}],
    ['hiddenTarget',"insert into public.catalog_set_release_controls(set_id,release_status,release_version) select id,'hidden','local_paldean_fixture' from public.sets where code='sv4pt5' on conflict(set_id) do update set release_status='hidden';",{excluded:0,route:'sv04.5',legacy:245}],
    ['unaliasedParent',"insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,identity_domain) select game_id,set_id,set_code,'LOCAL EXTRA UNALIASED','246','GV-PK-LOCAL-PALDEAN-UNALIASED',identity_domain from public.card_prints where set_code='sv04.5' and number='245';",{excluded:245,route:'sv04.5',legacy:1}]
   ];for(const [label,mutation,result]of negatives)assert.deepEqual(roleRead(role,probe,mutation),result,role+' '+label);
   assert.deepEqual(roleRead(role,"select jsonb_build_object('rows',count(*),'unique',count(distinct id),'legacy',count(*) filter(where set_code='sv04.5'),'stamps',count(*) filter(where variant_key='play_pokemon_stamp')) from generate_series(0,280,40) page_offset cross join lateral public.search_game_card_prints_v5('pokemon',null,'sv04.5',null,null,'en',40,page_offset);"),{rows:248,unique:248,legacy:0,stamps:3});
   const mixed=roleRead(role,`select jsonb_object_agg(label,coalesce((select jsonb_agg(to_jsonb(t)) from public.search_print_identity_v1(legacy_query,null,null,'parent_print',512,0)t),'[]'::jsonb)=coalesce((select jsonb_agg(to_jsonb(t)) from public.search_print_identity_v1(replace(legacy_query,'sv04.5','sv4pt5'),null,null,'parent_print',512,0)t),'[]'::jsonb) and (select count(*)>0 from public.search_print_identity_v1(legacy_query,null,null,'parent_print',512,0))) from(values('prefix','sv04.5 LOCAL REPLAY CARD 245'),('suffix','LOCAL REPLAY CARD 245 sv04.5'),('middle','LOCAL sv04.5 REPLAY CARD 245'),('repeated','sv04.5 LOCAL REPLAY CARD 245 sv04.5')) inputs(label,legacy_query);`);assert.deepEqual(mixed,{prefix:true,suffix:true,middle:true,repeated:true});
   report.roles.push({role,mainMetrics:true,negativeCases:negatives.map(x=>x[0]),pagination:248,mixedTokens:mixed});
  }
  const owned=roleRead('authenticated',"select jsonb_object_agg(set_code,copies) from(select c.set_code,count(*) copies from public.vault_item_instances v join public.card_prints c on c.id=v.card_print_id group by c.set_code)t;");assert.deepEqual(owned,{'sv04.5':3,'sv08.5':3});
  const priorSecurity=security();sql(candidate);assert.deepEqual(security(),priorSecurity);assert.deepEqual(fingerprint(),before);guard(501);Object.assign(report,{ownership:owned,idempotentDefinitions:true,protectedTables:Object.keys(before).length,protectedStateUnchanged:true});
 }
 report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
