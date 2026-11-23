// Actual local transaction proof. No production connection and no committed writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';import{gzipSync}from'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url)),art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_20261120',lab=art+'/fresh-512',project='bog-discovery-512-20261120';
const [attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const out=art+'/rollback-v2-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(fs.readFileSync(lab+'/bog-fixture-proof-v2.json')).pass,true);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v1.json');
for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const docker=args=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',timeout:15000,windowsHide:true}));
const db=docker(['inspect','supabase_db_'+project])[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(docker(['network','inspect',project])[0].Internal,true);
const relay=docker(['inspect',project+'-relay'])[0];for(const a of Object.values(relay.HostConfig.PortBindings).flat())assert.equal(a.HostIp,'127.0.0.1');
const r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:54940,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:15000,application_name:'bog-discovery-local-rollback-v2'});
const [file]=Object.keys(binding.candidates),candidate=fs.readFileSync(root+'/supabase/migrations/'+file,'utf8'),body=candidate.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');
const facts=read(root+'/docs/catalog/best_of_game_discovery_v1/classification.json'),parentIds=[...facts.pairs.map(p=>p.canonical.gv_id),...facts.protectedWinnerParents.map(p=>p.gv_id)].sort(),childIds=facts.pairs.map(p=>p.retainedCanonicalChild.printing_gv_id).sort();
const report={pass:false,productionWrites:0,committed:false,startedAt:new Date().toISOString(),candidateSha256:sha(candidate),scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),cases:[],roles:[]};let before,security,catalog;
const save=(n,v)=>fs.writeFileSync(out+'/'+n+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
const fingerprint=async()=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
const snapshot=async name=>(await c.query(fs.readFileSync(root+'/scripts/schema/'+name,'utf8'))).find(v=>v.rows?.[0]?.receipt).rows[0].receipt;
const call=async(q,set,type='parent_print',limit=512,offset=0,number=null)=>(await c.query('select * from public.search_print_identity_v1($1,$2,$3,$4,$5,$6)',[q,set,number,type,limit,offset])).rows;
const role=async name=>{await c.query('set local role '+name);await c.query('select set_config(\'request.jwt.claims\',$1,true)',[JSON.stringify({role:name,...(name==='authenticated'?{sub:'10000000-0000-0000-0000-000000000016'}:{})})]);};
const familyCodes=['2021swsh','mcd21','swsh10.5','pgo','sv04.5','sv4pt5','sv06.5','sv6pt5','sv08.5','sv8pt5','tk-ex-latio','tk1b'];
try{
 await c.connect();report.stage='preflight';const state=(await c.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'ledger',(select count(*) from supabase_migrations.schema_migrations),'workers',current_setting('max_worker_processes')) value")).rows[0].value;assert.deepEqual(state,{cards:1349,copies:22,users:1,ledger:511,workers:'0'});
 before=await fingerprint();security=await snapshot('vendor_pricing_security_snapshot_v1.sql');catalog=await snapshot('reviewed_intake_public_catalog_v1.sql');save('before-fingerprints',before);save('before-security',security);save('before-catalog',catalog);
 await c.query('begin');await c.query("set local jit=off;set local statement_timeout='60s'");await role('anon');const prior=[];for(const code of familyCodes)prior.push([code,await call(null,code)]);await c.query('reset role');

 report.stage='synthetic_magic_fixture';
 await c.query("update public.catalog_game_release_controls set release_status='public' where game_code='mtg';insert into public.sets(id,code,name,game) values('20000000-0000-0000-0000-000000000025','local_bog_magic','LOCAL MAGIC SEARCH FIXTURE','mtg');insert into public.card_prints(id,game_id,set_id,set_code,name,number,gv_id,identity_domain) select id::uuid,(select id from public.games where code='mtg'),'20000000-0000-0000-0000-000000000025','local_bog_magic',name,number,gv_id,'mtg_eng_paper_print' from(values('20000000-0000-0000-0000-000000000026','Bog Wraith','1','GV-MT-LOCAL-BOG-WRAITH'),('20000000-0000-0000-0000-000000000027','Boggart Brute','2','GV-MT-LOCAL-BOGGART-BRUTE'))shape(id,name,number,gv_id);");
 await role('anon');const magicBefore={};for(const q of['bog','bogg','Bog Wraith','Boggart Brute'])magicBefore[q]=(await call(q,null)).filter(x=>x.parent_gv_id.startsWith('GV-MT-LOCAL-'));assert.equal(magicBefore.bog.length,2);assert.equal(magicBefore.bogg.length,1);await c.query('reset role');
 report.stage='apply_transaction';await c.query(body);assert.equal((await c.query('select cardinality(public.get_best_of_game_discovery_exclusions_v1()) n')).rows[0].n,9);
 for(const name of['anon','authenticated']){
  await role(name);report.stage=name+':readers';
  for(const code of['bog','bp']){
   for(const q of[null,code]){const rows=await call(q,code);assert.deepEqual(rows.map(x=>x.parent_gv_id).sort(),parentIds,name+':'+code+':'+q);report.cases.push({role:name,code,q,parents:rows.length});}
   const children=await call(null,code,'child_printing');assert.deepEqual(children.map(x=>x.printing_gv_id).sort(),childIds);
   const browse=(await c.query("select id,gv_id,set_code from public.search_game_card_prints_v5('pokemon',null,$1,null,null,'en',512,0)",[code])).rows;assert.deepEqual(browse.map(x=>x.gv_id).sort(),parentIds);assert.ok(browse.every(x=>x.set_code==='bp'));
  }
  for(const[code,expected]of prior)assert.deepEqual(await call(null,code),expected,'Previous family '+name+':'+code);
  const catalogRows=(await c.query("select code,card_count::int n from public.get_public_catalog_sets_v2('pokemon') where code in('bog','bp') order by code")).rows;assert.deepEqual(catalogRows,[{code:'bp',n:13}]);
  const stored=(await c.query("select set_code,count(*)::int n from public.card_prints where set_code in('bog','bp') group by set_code order by set_code")).rows;assert.deepEqual(stored,[{set_code:'bog',n:13},{set_code:'bp',n:9}]);
  const selected=(await c.query('select printing_gv_id,finish_key from public.get_public_card_printing_options_v1($1,128,0)',[[...facts.pairs.flatMap(p=>[p.legacy.id,p.canonical.id]),...facts.protectedWinnerParents.map(p=>p.id)]])).rows;assert.equal(selected.length,18);
  report.roles.push({role:name,previousFamilies:6,parents:13,discoveryChildren:9,retainedPublicOptions:18});await c.query('reset role');
 }
 report.stage='expanded_cases';report.expanded=[];
 const probe="select jsonb_build_object('exclusions',cardinality(public.get_best_of_game_discovery_exclusions_v1()),'projection',public.get_best_of_game_discovery_projection_v1(),'route',public.resolve_catalog_discovery_set_code_v1('bog'),'legacy',(select count(*) from public.v_card_prints_discovery_v1 where set_code='bog'),'winners',(select count(*) from public.v_card_prints_discovery_v1 where set_code='bog' and variant_key='winner_stamp')) value";
 const negatives=[
 ['inactive',"update public.card_print_identity_aliases set active=false where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",13],
 ['decision_hash',"update public.card_print_identity_aliases set authority_decision=jsonb_set(authority_decision,'{classification_sha256}',to_jsonb(repeat('0',64))) where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",13],
 ['decision_basis',"update public.card_print_identity_aliases set authority_decision=authority_decision||'{\"canonical_basis\":\"unreviewed\"}'::jsonb where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",13],
 ['source_list',"update public.card_print_identity_aliases set authority_sources=array['pokemon_tcg_data_bp','tcgdex_bog'] where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",13],
 ['wrong_target',"update public.card_print_identity_aliases set canonical_card_print_id='cf3b8770-892a-41d8-8a47-647dbb742fee' where legacy_card_print_id='6b07130e-6ce9-468e-828b-3df34f7be2d4'",13],
 ['provider_lineage',"update public.external_mappings set active=false where card_print_id='4e714b58-bcf3-4931-9c46-163dadba49b8' and source='pokemonapi'",13],
 ['active_identity',"update public.card_print_identity set normalized_printed_name='unreviewed identity' where card_print_id='4e714b58-bcf3-4931-9c46-163dadba49b8' and is_active",13],
 ['base_name',"update public.card_prints set name='UNREVIEWED BASE NAME' where gv_id='GV-PK-BP-1'",13],
 ['winner_modifier',"update public.card_prints set printed_identity_modifier='unreviewed_stamp' where gv_id='GV-PK-BOG-1-WINNER-STAMP'",13],
 ['child_finish',"update public.card_printings set finish_key='normal' where printing_gv_id='GV-PK-BP-8-RH'",13],
 ['child_parent',"update public.card_printings set card_print_id='8dae8f1d-437f-464c-8415-50f763d1801d' where printing_gv_id='GV-PK-BP-1-REV'",13],
 ['hidden_child',"update public.card_printing_truth_reviews set public_visibility='hidden_pending_review' where card_printing_id=(select id from public.card_printings where printing_gv_id='GV-PK-BP-1-REV') and active",13],
 ['inactive_finish',"update public.finish_keys set is_active=false where key='reverse'",13],
 ['suppressed_parent',"update public.card_prints set data_quality_flags=jsonb_set(coalesce(data_quality_flags,'{}'::jsonb),'{app_visibility_v1}','{\"status\":\"suppressed\"}'::jsonb) where gv_id='GV-PK-BP-1'",13],
 ['hidden_set',"insert into public.catalog_set_release_controls(set_id,release_status,release_version) values('c8debb57-da6f-46ce-8777-13ecedfe2856','hidden','local_bog_negative')",13],
 ['extra_legacy',"insert into public.card_prints(game_id,set_id,set_code,name,number,gv_id,identity_domain) select game_id,set_id,set_code,'LOCAL EXTRA BOG','777','GV-PK-LOCAL-BOG-EXTRA',identity_domain from public.card_prints where gv_id='GV-PK-BOG-1'",14],
 ['new_winner_child',"insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by) values('614efd10-0ce3-438b-8466-6584bebb88cb','normal','GV-PK-LOCAL-BOG-UNREVIEWED-WINNER','local_bog_negative')",13]
 ];
 for(const name of['anon','authenticated']){
  await role(name);report.stage=name+':expanded_positive';
  for(const[q,expected]of Object.entries(magicBefore))assert.deepEqual((await call(q,null)).filter(x=>x.parent_gv_id.startsWith('GV-MT-LOCAL-')),expected,name+':Magic:'+q);
  for(const p of facts.pairs.filter(p=>p.typographyOnlyDifference))for(const code of['bog','bp'])assert.deepEqual((await call(p.legacy.name+' '+code,null)).map(x=>x.parent_gv_id),[p.canonical.gv_id],name+':exact_typography:'+p.number);
  for(const code of['bog','bp']){
   const pages=[];for(let offset=0;offset<16;offset+=4)pages.push(...await call(null,code,'parent_print',4,offset));assert.equal(pages.length,13);assert.equal(new Set(pages.map(x=>x.parent_gv_id)).size,13);assert.deepEqual(pages.map(x=>x.parent_gv_id).sort(),parentIds);
   const winnerRows=await call(code+' winner_stamp',null);assert.deepEqual(winnerRows.map(x=>x.parent_gv_id).sort(),facts.protectedWinnerParents.map(x=>x.gv_id).sort());assert.equal((await call(code+' winner_stamp',null,'child_printing')).length,0);
   assert.equal((await call(code+' definitelydoesnotmatch',null)).length,0);
  }
  let exact=0;for(const p of[...facts.pairs.flatMap(p=>[p.legacy,p.canonical]),...facts.protectedWinnerParents]){
   const children=facts.pairs.flatMap(p=>[{...p.retainedLegacyChild,set_code:'bog',parent_gv_id:p.legacy.gv_id},{...p.retainedCanonicalChild,set_code:'bp',parent_gv_id:p.canonical.gv_id}]);
   const objects=[{gv_id:p.gv_id,type:'parent_print',parent_gv_id:p.gv_id},...children.filter(x=>x.parent_gv_id===p.gv_id).map(x=>({gv_id:x.printing_gv_id,type:'child_printing',parent_gv_id:p.gv_id}))];
   for(const object of objects)for(const q of[object.gv_id,object.gv_id.toLowerCase(),object.gv_id.toUpperCase()]){
    for(const scope of[null,p.set_code]){const rows=await call(q,scope,object.type);assert.equal(rows.length,1,name+':'+q+':'+scope);assert.equal(rows[0].parent_gv_id,p.gv_id);assert.equal(object.type==='parent_print'?rows[0].parent_gv_id:rows[0].printing_gv_id,object.gv_id);exact++;}
    assert.equal((await call(q,p.set_code==='bog'?'bp':'bog',object.type)).length,0,name+':wrong_exact_scope');
   }
  }
  const acl=(await c.query("select jsonb_object_agg(p,has_table_privilege(current_user,'public.v_card_prints_set_family_discovery_v1',p)) value from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])p")).rows[0].value;assert.deepEqual(acl,{SELECT:true,INSERT:false,UPDATE:false,DELETE:false,TRUNCATE:false,REFERENCES:false,TRIGGER:false,MAINTAIN:false});
  const copies=(await c.query("select count(*)::int n from public.vault_item_instances where user_id='10000000-0000-0000-0000-000000000016'")).rows[0].n;assert.equal(copies,22);
  await c.query('reset role');
  for(const[label,mutation,legacy]of negatives){
   report.stage=name+':negative:'+label;await c.query('savepoint negative_case');await c.query(mutation);await role(name);assert.deepEqual((await c.query(probe)).rows[0].value,{exclusions:0,projection:null,route:'bog',legacy,winners:4},report.stage);await c.query('reset role');await c.query('rollback to savepoint negative_case');await c.query('release savepoint negative_case');
  }
  report.expanded.push({role:name,exactRetainedCases:exact,wrongScopeCases:120,negativeCases:negatives.map(x=>x[0]),magicResultsPreserved:true,exactTypographyAliases:8,pagination:13,savedCopies:22,selectOnlyView:true});
 }
 report.stage='idempotent_definitions';const populated=await fingerprint();await c.query(body);assert.deepEqual(await fingerprint(),populated);report.definitionReplayWrites=0;

 await c.query('rollback');assert.deepEqual(await fingerprint(),before);assert.deepEqual(await snapshot('vendor_pricing_security_snapshot_v1.sql'),security);assert.deepEqual(await snapshot('reviewed_intake_public_catalog_v1.sql'),catalog);report.rollbackRestoredAllTablesSchemaSecurity=true;report.protectedTables=Object.keys(before).length;report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{
 await c.query('rollback').catch(()=>{});
 if(before){try{assert.deepEqual(await fingerprint(),before);assert.deepEqual(await snapshot('vendor_pricing_security_snapshot_v1.sql'),security);report.finalProtectedStateExact=true;}catch(e){report.protectionError=e.message;report.pass=false;process.exitCode=1;}}
 await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
