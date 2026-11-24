// Production-size synthetic qualification, entirely rolled back in the owned local lab.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {gzipSync} from 'node:zlib';
const root='C:/grookai_best_of_game_direct_visibility_522_20261123';
const art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120',lab='C:/grookai_vault_operator_artifacts/best_of_game_discovery_v2_20261120/fresh-513',project='bog-discovery-513-20261120';
const [attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const out='C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123/original-fullsize-corpus-v16-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v16.json');for(const[f,p]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),p);
const proof=read('C:/grookai_vault_operator_artifacts/best_of_game_direct_visibility_522_20261123/authority-rollback-v16-r1/result.json');assert.equal(proof.pass,true);assert.equal(proof.candidateSha256,binding.candidateBundleSha256);assert.equal(read(art+'/writer-guards-v6/result.json').pass,true);
const docker=args=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',timeout:15000,windowsHide:true}));
const info=docker(['inspect','supabase_db_'+project])[0];assert.equal(info.State.Running,true);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(docker(['network','inspect',project])[0].Internal,true);
const r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database:'bog_direct_visibility_fullsize_522_v16',connectionTimeoutMillis:15000,application_name:'bog-discovery-local-fullsize-v2'});
const files=Object.keys(binding.candidates).sort(),candidate=files.map(file=>fs.readFileSync(root+'/supabase/migrations/'+file,'utf8')).join('\n'),body=candidate.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');
const facts=read(root+'/docs/catalog/best_of_game_discovery_v1/classification.json'),parents=[...facts.pairs.map(p=>p.canonical.gv_id),...facts.protectedWinnerParents.map(p=>p.gv_id)].sort(),children=facts.pairs.map(p=>p.retainedCanonicalChild.printing_gv_id).sort();
const report={pass:false,productionWrites:0,committed:false,localSyntheticOnly:true,helperStubs:false,startedAt:new Date().toISOString(),candidateSha256:sha(candidate),scriptSha256:sha(fs.readFileSync(new URL(import.meta.url))),statementBudgetMs:3000,marginMs:2700,cases:[]};let before,security,indexes;
const fingerprint=async()=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
const snapshot=async()=>(await c.query(fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;
const P=(q,set=null,type='parent_print',limit=512,offset=0,number=null)=>[q,set,number,type,limit,offset];
const call=async args=>(await c.query('select * from public.search_print_identity_v1($1,$2,$3,$4,$5,$6)',args)).rows;
async function timed(role,label,args,check){report.stage=role+':'+label;const t=performance.now(),rows=await call(args),ms=Math.round(performance.now()-t);check(rows);assert.ok(ms<2700,report.stage+' exceeds unchanged2700ms margin');report.cases.push({role,label,ms,rows:rows.length,digest:sha(JSON.stringify(rows))});if(report.cases.length%25===0)console.log(JSON.stringify({stage:report.stage,cases:report.cases.length,maxMs:Math.max(...report.cases.map(x=>x.ms))}));return rows;}
async function role(name){await c.query('set local role '+name);await c.query('select set_config(\'request.jwt.claims\',$1,true)',[JSON.stringify({role:name,...(name==='authenticated'?{sub:'10000000-0000-0000-0000-000000000016'}:{})})]);}
try{
 await c.connect();report.stage='preflight';assert.deepEqual((await c.query("select jsonb_build_object('cards',(select count(*) from public.card_prints),'copies',(select count(*) from public.vault_item_instances),'users',(select count(*) from auth.users),'ledger',(select count(*) from supabase_migrations.schema_migrations),'workers',current_setting('max_worker_processes'))value")).rows[0].value,{cards:173994,copies:22,users:1,ledger:522,workers:'0'});
 before=await fingerprint();security=await snapshot();indexes=(await c.query("select indexname,indexdef from pg_indexes where schemaname='public' order by indexname")).rows;
 await c.query('begin');await c.query("set local statement_timeout='300s';set local jit=off;set local work_mem='7MB'");
 report.stage='synthetic_magic';await c.query("update public.catalog_game_release_controls set release_status='public' where game_code='mtg';insert into public.sets(id,code,name,game) values('20000000-0000-0000-0000-000000000025','local_bog_magic','LOCAL MAGIC SEARCH FIXTURE','mtg');insert into public.card_prints(id,game_id,set_id,set_code,name,number,gv_id,identity_domain) select id::uuid,(select id from public.games where code='mtg'),'20000000-0000-0000-0000-000000000025','local_bog_magic',name,number,gv_id,'mtg_eng_paper_print' from(values('20000000-0000-0000-0000-000000000026','Bog Wraith','1','GV-MT-LOCAL-BOG-WRAITH'),('20000000-0000-0000-0000-000000000027','Boggart Brute','2','GV-MT-LOCAL-BOGGART-BRUTE'))shape(id,name,number,gv_id);");
 report.stage='original521_visibility_control';const original=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database:'bog_catalog_cover_fresh_520_v15',ssl:false,connectionTimeoutMillis:15000});try{await original.connect();assert.equal((await original.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,521);for(const helper of binding.changedHelpers){const row=(await original.query('select pg_get_functiondef(oid)definition,md5(prosrc)body_md5 from pg_proc where oid=$1::regprocedure',[helper.signature])).rows[0];assert.equal(row.body_md5,helper.oldBodyMd5);await c.query(row.definition);}}finally{await original.end().catch(()=>{});}report.original521VisibilityControl=true;report.existingFullsizeFixtureUsed=true;report.noNewPaddingInserted=true;report.shape={parents:173994,children:244418,aliases:768,additionalRollbackOnlyMagicParents:2};
 const stable=[];for(const[legacy,canonical]of[['2021swsh','mcd21'],['swsh10.5','pgo'],['sv04.5','sv4pt5'],['sv06.5','sv6pt5'],['sv08.5','sv8pt5'],['tk-ex-latio','tk1b']])stable.push([legacy+'_free',P(legacy)],[legacy+'_typed',P(null,legacy)],[canonical+'_free',P(canonical)],[canonical+'_typed',P(null,canonical)],[legacy+'_children',P(null,legacy,'child_printing')]);
 await role('anon');await c.query("set local statement_timeout='30s'");const expected=[];for(const[label,args]of stable){report.stage='baseline:'+label;expected.push(await call(args));}const magic={};for(const q of['bog','bogg','Bog Wraith','Boggart Brute'])magic[q]=(await call(P(q))).filter(x=>x.parent_gv_id.startsWith('GV-MT-LOCAL-'));assert.equal(magic.bog.length,2);await c.query('reset role');await c.query("set local statement_timeout='60s'");await c.query(body);
 for(const name of['anon','authenticated']){
  await role(name);await c.query("set local statement_timeout='3s'");
  for(let i=0;i<stable.length;i++){const[label,args]=stable[i];await timed(name,label,args,rows=>assert.deepEqual(rows,expected[i],name+':'+label));}
  for(const q of['bog','bogg','Bog Wraith','Boggart Brute'])await timed(name,'global_magic:'+q,P(q),rows=>assert.deepEqual(rows.filter(x=>x.parent_gv_id.startsWith('GV-MT-LOCAL-')),magic[q]));
  for(const code of['bog','bp']){
   for(const q of[null,code])await timed(name,code+':parents:'+q,P(q,code),rows=>assert.deepEqual(rows.map(x=>x.parent_gv_id).sort(),parents));
   await timed(name,code+':free',P(code),rows=>assert.deepEqual(rows.filter(x=>!x.parent_gv_id.startsWith('GV-MT-LOCAL-')).map(x=>x.parent_gv_id).sort(),parents));
   await timed(name,code+':children',P(null,code,'child_printing'),rows=>assert.deepEqual(rows.map(x=>x.printing_gv_id).sort(),children));
   await timed(name,code+':winner',P(code+' winner_stamp'),rows=>assert.deepEqual(rows.map(x=>x.parent_gv_id).sort(),facts.protectedWinnerParents.map(x=>x.gv_id).sort()));
   await timed(name,code+':unmatched',P(code+' definitelydoesnotmatch'),rows=>assert.equal(rows.length,0));
   const pages=[];for(let offset=0;offset<16;offset+=4)pages.push(...await timed(name,code+':page:'+offset,P(null,code,'parent_print',4,offset),()=>{}));assert.equal(new Set(pages.map(x=>x.parent_gv_id)).size,13);assert.equal(pages.length,13);
   const t=performance.now(),browse=(await c.query("select gv_id,set_code from public.search_game_card_prints_v5('pokemon',null,$1,null,null,'en',512,0)",[code])).rows,ms=Math.round(performance.now()-t);assert.deepEqual(browse.map(x=>x.gv_id).sort(),parents);assert.ok(browse.every(x=>x.set_code==='bp'));assert.ok(ms<2700);report.cases.push({role:name,label:'browse:'+code,ms,rows:browse.length});
  }
  for(const p of facts.pairs.filter(x=>x.typographyOnlyDifference))await timed(name,'exact_source_name:'+p.number,P(p.legacy.name+' bog'),rows=>assert.deepEqual(rows.map(x=>x.parent_gv_id),[p.canonical.gv_id]));
  const objects=[...facts.pairs.flatMap(p=>[{gv:p.legacy.gv_id,parent:p.legacy.gv_id,type:'parent_print'},{gv:p.canonical.gv_id,parent:p.canonical.gv_id,type:'parent_print'},{gv:p.retainedLegacyChild.printing_gv_id,parent:p.legacy.gv_id,type:'child_printing'},{gv:p.retainedCanonicalChild.printing_gv_id,parent:p.canonical.gv_id,type:'child_printing'}]),...facts.protectedWinnerParents.map(p=>({gv:p.gv_id,parent:p.gv_id,type:'parent_print'}))];
  for(const object of objects)await timed(name,'retained:'+object.gv,P(object.gv.toLowerCase(),null,object.type,50),rows=>{assert.equal(rows.length,1);assert.equal(rows[0].parent_gv_id,object.parent);assert.equal(object.type==='parent_print'?rows[0].parent_gv_id:rows[0].printing_gv_id,object.gv);});
  const t=performance.now(),sets=(await c.query("select code,card_count::int n from public.get_public_catalog_sets_v2('pokemon') where code in('bog','bp') order by code")).rows,ms=Math.round(performance.now()-t);assert.deepEqual(sets,[{code:'bp',n:13}]);assert.ok(ms<2700);report.cases.push({role:name,label:'catalog',ms,rows:sets.length});await c.query('reset role');
 }
 report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{
 await c.query('rollback').catch(()=>{});
 if(before){try{assert.deepEqual(await fingerprint(),before);assert.deepEqual(await snapshot(),security);assert.deepEqual((await c.query("select indexname,indexdef from pg_indexes where schemaname='public' order by indexname")).rows,indexes);report.restoredAllProtectedTablesSchemaSecurityIndexes=true;report.protectedTables=Object.keys(before).length;}catch(e){report.pass=false;report.protectionError=e.message;process.exitCode=1;}}
 await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:report.pass,error:report.error,stage:report.stage,cases:report.cases.length,shape:report.shape,maxMs:report.cases.length?Math.max(...report.cases.map(x=>x.ms)):null,protectedStateExact:report.restoredAllProtectedTablesSchemaSecurityIndexes}));
}
