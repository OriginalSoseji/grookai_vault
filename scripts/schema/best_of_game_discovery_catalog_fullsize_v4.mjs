// Real public metadata/aggregate distribution; every local synthetic change rolls back.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {gzipSync,gunzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../',import.meta.url));
const art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120';
const [attempt,...extra]=process.argv.slice(2);assert.match(attempt??'',/^r[0-9]+$/);assert.equal(extra.length,0);
const out=art+'/catalog-fullsize-v4-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const read=f=>JSON.parse((f.endsWith('.gz')?gunzipSync(fs.readFileSync(f)):fs.readFileSync(f)).toString('utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v3.json');
for(const[f,h]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
for(const f of ['rollback-v5-r1/result.json','writer-guards-v3/result.json','fullsize-v4-r1/result.json'])assert.equal(read(art+'/'+f).pass,true);
const fixturePath=art+'/baseline-513-data-only-v1/public-fixture-shape.private.json.gz';
const expectedPath=art+'/scalar-policy-readonly-v4-r2/actual_rpc.private.json.gz';
const fixture=read(fixturePath),expected=read(expectedPath);
assert.equal(fixture.productionOwnerRowsCopied,0);assert.equal(fixture.sets.length,3420);assert.equal(expected.length,417);
assert.equal(fixture.parents.reduce((n,g)=>n+g.count,0),173837);
const db=JSON.parse(execFileSync('docker',['inspect','supabase_db_bog-discovery-513-20261120'],{encoding:'utf8',windowsHide:true}))[0];
assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),['bog-discovery-513-20261120']);
assert.equal(JSON.parse(execFileSync('docker',['network','inspect','bog-discovery-513-20261120'],{encoding:'utf8',windowsHide:true}))[0].Internal,true);
const r=createRequire(root+'/package.json'),c=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database:'bog_perf_catalog_513_v4',connectionTimeoutMillis:15000,application_name:'bog-local-real-set-distribution-v4'});
const candidate=fs.readFileSync(root+'/supabase/migrations/'+Object.keys(binding.candidates)[0],'utf8');
const body=candidate.replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'');
const save=(n,v)=>fs.writeFileSync(out+'/'+n+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
const fingerprint=async()=>(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;
const snapshot=async file=>(await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;
const report={pass:false,productionWrites:0,committed:false,sourceOwnerRowsCopied:0,startedAt:new Date().toISOString(),candidateSha256:sha(candidate),fixtureSha256:sha(fs.readFileSync(fixturePath)),expectedCatalogSha256:sha(fs.readFileSync(expectedPath)),statementBudgetMs:3000,marginMs:2700,cases:[]};
let before,security,catalog,indexes;
try{
 assert.equal(read(art+'/clean-catalog-clone-v4/result.json').pass,true);
 await c.connect();assert.equal((await c.query("select current_setting('max_worker_processes') workers,(select count(*)::int from supabase_migrations.schema_migrations) ledger")).rows[0].workers,'0');
 assert.equal((await c.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,513);
 await c.query('analyze public.sets;analyze public.card_prints;analyze public.card_printings;analyze public.card_print_identity_aliases;analyze public.catalog_set_release_controls');
 before=await fingerprint();security=await snapshot('vendor_pricing_security_snapshot_v1.sql');catalog=await snapshot('reviewed_intake_public_catalog_v1.sql');
 indexes=(await c.query("select schemaname,indexname,indexdef from pg_indexes where schemaname='public' order by indexname")).rows;
 await c.query('begin');await c.query("set local statement_timeout='300s';set local jit=off;set local work_mem='7MB'");
 report.stage='map_public_metadata';
 const oldGames=(await c.query('select id,code from public.games')).rows,gameMap=new Map();
 for(const g of fixture.games){const old=oldGames.find(x=>x.code===g.code);gameMap.set(g.id,old?.id??g.id);if(!old)await c.query('insert into public.games select * from jsonb_populate_record(null::public.games,$1::jsonb)',[JSON.stringify(g)]);}
 const localSets=(await c.query('select id,code,game from public.sets')).rows;
 const extras=localSets.filter(s=>!fixture.sets.some(p=>p.code===s.code&&p.game===s.game));
 assert.deepEqual(extras.map(s=>s.code).sort(),['ba-2020','ba-2022','ba-2024']);
 assert.equal((await c.query('select count(*)::int n from public.card_prints where set_id=any($1::uuid[])',[extras.map(s=>s.id)])).rows[0].n,0);
 // Only three empty synthetic seed sets in this new owned clone; rollback restores all449 tables.
 await c.query('delete from public.sets where id=any($1::uuid[])',[extras.map(s=>s.id)]);report.temporaryEmptySeedSets=extras.map(s=>s.code);
 const setMap=new Map(fixture.sets.map(s=>[s.id,localSets.find(x=>x.code===s.code&&x.game===s.game)?.id??s.id]));
 const inverseSetMap=new Map([...setMap].map(([prod,local])=>[local,prod]));
 const sets=fixture.sets.map(s=>({...s,id:setMap.get(s.id)}));
 const columns=(await c.query("select attname from pg_attribute where attrelid='public.sets'::regclass and attnum>0 and not attisdropped and attgenerated='' order by attnum")).rows.map(x=>x.attname);
 const quoted=columns.map(n=>'"'+n+'"');
 await c.query('insert into public.sets('+quoted.join(',')+') select '+quoted.join(',')+' from jsonb_populate_recordset(null::public.sets,$1::jsonb) on conflict(id) do update set '+columns.filter(n=>n!=='id').map(n=>'"'+n+'"=excluded."'+n+'"').join(','),[JSON.stringify(sets)]);
 assert.equal((await c.query('select count(*)::int n from public.sets')).rows[0].n,3420);
 await c.query('delete from public.catalog_set_release_controls;delete from public.catalog_game_release_controls');
 for(const s of fixture.setControls)await c.query('insert into public.catalog_set_release_controls(set_id,release_status,release_version)values($1,$2,$3)',[setMap.get(s.set_id),s.release_status,s.release_version]);
 for(const g of fixture.gameControls)await c.query('insert into public.catalog_game_release_controls(game_code,release_status,release_version)values($1,$2,$3)',[g.game_code,g.release_status,g.release_version]);
 report.stage='distributed_synthetic_parents';
 const grouped=(await c.query("select set_id,set_code,game_id,identity_domain,gv_id is not null has_public_id,coalesce(data_quality_flags#>>'{app_visibility_v1,status}','visible') visibility,count(*)::int count from public.card_prints group by set_id,set_code,game_id,identity_domain,has_public_id,visibility")).rows;
 const key=g=>JSON.stringify([g.set_id,g.set_code,g.game_id,g.identity_domain,g.has_public_id,g.visibility]);
 const groups=fixture.parents.map(g=>({...g,set_id:setMap.get(g.set_id)??g.set_id,game_id:gameMap.get(g.game_id)??g.game_id}));
 const wanted=new Map(groups.map(g=>[key(g),g.count]));
 for(const g of grouped)assert.ok(wanted.has(key(g))&&wanted.get(key(g))>=g.count,'Existing source fixture must fit captured production aggregate group');
 const have=new Map(grouped.map(g=>[key(g),g.count]));
 let added=0;
 for(let i=0;i<groups.length;i++){
  const g=groups[i],count=g.count-(have.get(key(g))??0);if(!count)continue;
  await c.query("insert into public.card_prints(id,game_id,set_id,set_code,name,number,gv_id,identity_domain,print_identity_key,external_ids,data_quality_flags) select gen_random_uuid(),$1::uuid,$2::uuid,$3,'LOCAL DISTRIBUTED PERFORMANCE CARD '||$4||'-'||n,'L'||$4||'-'||n,case when $5 then 'GV-LOCAL-PERFORMANCE-'||$4||'-'||n else null end,$6,'local-synthetic-'||$4||'-'||n,jsonb_build_object('local_synthetic_catalog_padding',repeat(md5(n::text),36)),jsonb_build_object('app_visibility_v1',jsonb_build_object('status',$7::text)) from generate_series(1,$8)n",[g.game_id,g.set_id,g.set_code,String(i),g.has_public_id,g.identity_domain,g.visibility,count]);added+=count;
 }
 assert.equal(added,172488);
 assert.equal((await c.query('select count(*)::int n from public.card_prints')).rows[0].n,173837);
 report.stage='synthetic_child_and_alias_cardinality';
 const needed=244261-Number((await c.query('select count(*) n from public.card_printings')).rows[0].n);
 await c.query("insert into public.card_printings(card_print_id,finish_key,printing_gv_id,created_by,image_note) select p.id,finish,'GV-LOCAL-PERF-CHILD-'||p.id||'-'||upper(finish),'local_distributed_performance',repeat(md5(p.id::text||finish),16) from(select id,row_number() over(order by id)rn from public.card_prints where external_ids?'local_synthetic_catalog_padding')p cross join(values('normal',0),('holo',172488))f(finish,base) where p.rn+f.base<=$1",[needed]);
 await c.query("with candidates as(select id,set_code,row_number()over(order by id)rn from public.card_prints where external_ids?'local_synthetic_catalog_padding' limit 224), pairs as(select l.id legacy,l.set_code legacy_code,r.id canonical,r.set_code canonical_code from candidates l join candidates r on r.rn=l.rn+112 where l.rn<=112) insert into public.card_print_identity_aliases(legacy_card_print_id,canonical_card_print_id,legacy_set_code,canonical_set_code,evidence_reason,created_from_audit,active,authority_status) select legacy,canonical,legacy_code,canonical_code,'Inactive unrelated synthetic cardinality only; no identity assertion','local_distributed_performance',false,'pending' from pairs");
 await c.query("with selected as(select p.id,c.id child,row_number() over(order by p.id)rn from public.card_prints p join public.card_printings c on c.card_print_id=p.id and c.finish_key='normal' where p.set_code='base2' and p.external_ids?'local_synthetic_catalog_padding' order by p.id limit 128) insert into public.jungle_edition_identity_links_v1(legacy_card_print_id,card_print_id,card_printing_id,edition,finish_key,state,manifest_sha256,review_ref) select l.id,c.id,c.child,'unlimited','normal','retired',repeat('a',64),'local_distributed_perf_128' from selected l join selected c on c.rn=l.rn+64 where l.rn<=64");
 assert.equal((await c.query('select cardinality(public.get_jungle_edition_discovery_exclusions_v1()) n')).rows[0].n,128);
 await c.query('analyze public.sets;analyze public.card_prints;analyze public.card_printings;analyze public.card_print_identity_aliases;analyze public.catalog_set_release_controls');
 report.shape=(await c.query("select jsonb_build_object('sets',(select count(*) from public.sets),'parents',(select count(*) from public.card_prints),'children',(select count(*) from public.card_printings),'aliases',(select count(*) from public.card_print_identity_aliases),'jit',current_setting('jit'),'workMem',current_setting('work_mem'))value")).rows[0].value;
 assert.deepEqual(report.shape,{sets:3420,parents:173837,children:244261,aliases:768,jit:'off',workMem:'7MB'});
 const normalized=rows=>rows.map(row=>({...row,id:inverseSetMap.get(row.id)??row.id})).sort((a,b)=>(a.game+'|'+a.code+'|'+a.id).localeCompare(b.game+'|'+b.code+'|'+b.id));
 const expectedRows=normalized(expected);
 report.stage='old_catalog_metadata_control';await c.query("set local statement_timeout='180s'");
 const old=(await c.query("select * from public.get_public_catalog_sets_v2('pokemon')")).rows.map(row=>({...row,card_count:Number(row.card_count),created_at:row.created_at instanceof Date?row.created_at.toISOString():row.created_at,release_date:row.release_date instanceof Date?row.release_date.toISOString().slice(0,10):row.release_date}));
 save('baseline-control',old);
 // Use PostgreSQL JSON representations to preserve timestamps at full microsecond precision.
 const exactOld=(await c.query("select coalesce(jsonb_agg(to_jsonb(t) order by t.game,t.code,t.id),'[]'::jsonb) value from public.get_public_catalog_sets_v2('pokemon')t")).rows[0].value;
 assert.deepEqual(normalized(exactOld),expectedRows);report.baselineOutputEqualsProduction=true;save('exact-baseline-control',exactOld);
 await c.query("set local statement_timeout='60s'");report.stage='candidate_transaction';await c.query(body);
 for(const role of ['anon','authenticated']){
  await c.query('set local role '+role);await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role,...(role==='authenticated'?{sub:'10000000-0000-0000-0000-000000000016'}:{})})]);await c.query("set local statement_timeout='3s'");
  for(let repeat=1;repeat<=3;repeat++){
   report.stage=role+':catalog:'+repeat;const start=performance.now();
   const rows=(await c.query("select coalesce(jsonb_agg(to_jsonb(t) order by t.game,t.code,t.id),'[]'::jsonb) value from public.get_public_catalog_sets_v2('pokemon')t")).rows[0].value;
   const ms=Math.round(performance.now()-start);assert.equal(rows.length,417);assert.deepEqual(normalized(rows),expectedRows);assert.ok(ms<2700,report.stage+' exceeds unchanged2700ms margin');
   report.cases.push({role,repeat,ms,sets:rows.length,digest:sha(JSON.stringify(normalized(rows)))});console.log(JSON.stringify(report.cases.at(-1)));
  }
  await c.query('reset role');
 }
 report.pass=true;
}catch(e){report.error=e.message;process.exitCode=1;}
finally{
 await c.query('rollback').catch(()=>{});await c.query('analyze public.sets;analyze public.card_prints;analyze public.card_printings;analyze public.card_print_identity_aliases;analyze public.catalog_set_release_controls').catch(()=>{});
 if(before)try{assert.deepEqual(await fingerprint(),before);report.protectedTablesExact=true;assert.deepEqual(await snapshot('vendor_pricing_security_snapshot_v1.sql'),security);report.securityExact=true;const finalCatalog=await snapshot('reviewed_intake_public_catalog_v1.sql');save('before-catalog',catalog);save('after-catalog',finalCatalog);report.plannerEstimateChanges=[];
const structural=s=>{const v=structuredClone(s);for(const row of v.ALL_RELATIONS_QUERY){delete row.page_size_estimate;delete row.row_count_estimate;}return v;};
assert.deepEqual(structural(finalCatalog),structural(catalog));
for(let i=0;i<catalog.ALL_RELATIONS_QUERY.length;i++){const a=catalog.ALL_RELATIONS_QUERY[i],b=finalCatalog.ALL_RELATIONS_QUERY[i];for(const k of ['page_size_estimate','row_count_estimate'])if(a[k]!==b[k])report.plannerEstimateChanges.push({schema:a.schema,name:a.name,attname:a.attname,field:k,before:a[k],after:b[k]});}
const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of ['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+n+'/package.json').version,'0.6.1');const {PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY'));
async function model(s,schema){const map=new Map(queries.map(([k,q])=>[q,s[k]])),m=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>{assert.ok(map.has(q.sql));return map.get(q.sql);}});m.one_schema(schema);for(const k of ['types','domains','materialized_views','composite_types'])m[k]=Object.fromEntries(Object.entries(m[k]).filter(([,v])=>v.schema===schema));return m;}
for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){const diff=await Migration.create(await model(catalog,schema),await model(finalCatalog,schema),{schema});diff.set_safety(false);diff.add_all_changes(true);fs.writeFileSync(out+'/rollback-'+schema+'-NEVER-EXECUTE.sql',diff.sql,{flag:'wx'});assert.equal(diff.sql.trim(),'');}report.fourSchemasExact=true;assert.deepEqual((await c.query("select schemaname,indexname,indexdef from pg_indexes where schemaname='public' order by indexname")).rows,indexes);report.restoredAll449TablesSchemaSecurityIndexes=true;}catch(e){report.pass=false;report.protectionError=e.message;process.exitCode=1;}
 await c.end().catch(()=>{});report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:report.pass,error:report.error,stage:report.stage,shape:report.shape,cases:report.cases,maxMs:report.cases.length?Math.max(...report.cases.map(x=>x.ms)):null,restored:report.restoredAll449TablesSchemaSecurityIndexes}));
}
