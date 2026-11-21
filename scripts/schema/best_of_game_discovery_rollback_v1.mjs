// Actual local transaction proof. No production connection and no committed writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import{createRequire}from'node:module';import{createHash}from'node:crypto';import{fileURLToPath}from'node:url';import{execFileSync}from'node:child_process';import{gzipSync}from'node:zlib';
const root=fileURLToPath(new URL('../../',import.meta.url)),art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_20261120',lab=art+'/fresh-512',project='bog-discovery-512-20261120';
const [attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const out=art+'/rollback-v1-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);assert.equal(JSON.parse(fs.readFileSync(lab+'/bog-fixture-proof-v2.json')).pass,true);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v1.json');
for(const[file,pin]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+file)),pin);
const docker=args=>JSON.parse(execFileSync('docker',args,{encoding:'utf8',timeout:15000,windowsHide:true}));
const db=docker(['inspect','supabase_db_'+project])[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);assert.equal(docker(['network','inspect',project])[0].Internal,true);
const relay=docker(['inspect',project+'-relay'])[0];for(const a of Object.values(relay.HostConfig.PortBindings).flat())assert.equal(a.HostIp,'127.0.0.1');
const r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:54940,user:'postgres',password:'postgres',database:'postgres',connectionTimeoutMillis:15000,application_name:'bog-discovery-local-rollback-v1'});
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
 await c.query('rollback');assert.deepEqual(await fingerprint(),before);assert.deepEqual(await snapshot('vendor_pricing_security_snapshot_v1.sql'),security);assert.deepEqual(await snapshot('reviewed_intake_public_catalog_v1.sql'),catalog);report.rollbackRestoredAllTablesSchemaSecurity=true;report.protectedTables=Object.keys(before).length;report.pass=true;
}catch(error){report.error=error.message;process.exitCode=1;}finally{
 await c.query('rollback').catch(()=>{});
 if(before){try{assert.deepEqual(await fingerprint(),before);assert.deepEqual(await snapshot('vendor_pricing_security_snapshot_v1.sql'),security);report.finalProtectedStateExact=true;}catch(e){report.protectionError=e.message;report.pass=false;process.exitCode=1;}}
 await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
