// Independent actual516 schema/security/retained-data and official SDK qualification.
import fs from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';import{gzipSync,gunzipSync}from'node:zlib';import{reconcileKnownTableColumnOrderV1}from'./column_order_reconciliation_v1.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),art='C:/grookai_vault_operator_artifacts/best_of_game_discovery_perf_20261120';
const[attempt,...extra]=process.argv.slice(2);assert.equal(extra.length,0);assert.match(attempt??'',/^r[0-9]+$/);
const out=art+'/local-qualification-v5-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const read=f=>JSON.parse((f.endsWith('.gz')?gunzipSync(fs.readFileSync(f)):fs.readFileSync(f)).toString('utf8').replace(/^\uFEFF/,'')),sha=b=>createHash('sha256').update(b).digest('hex');
const binding=read(root+'/scripts/schema/best_of_game_discovery_candidate_v6.json');for(const[f,h]of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(root+'/supabase/migrations/'+f)),h);
for(const f of ['actual-catalog-function-smoke-v1/result.json','rollback-v8-r1/result.json','writer-guards-v6/result.json','fullsize-v7-r1/result.json','catalog-fullsize-v7-r1/result.json','local-sdk-v6/result.json','local-sdk-v6/provision-result.json'])assert.equal(read(art+'/'+f).pass,true,f);
const sdk=read(art+'/local-sdk-v6/result.json');assert.equal(sdk.candidateSha256,binding.candidateBundleSha256);assert.equal(sdk.sourceSha256,sha(fs.readFileSync(root+'/scripts/schema/verify_best_of_game_discovery_sdk_v6.mjs')));
const save=(name,v)=>fs.writeFileSync(out+'/'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(v))),{flag:'wx'});
const r=createRequire(root+'/package.json'),clients=[],profiles=[['fresh','bog_perf_fresh_513_v3'],['retained','bog_perf_retained_513_v3']];
const report={pass:false,productionWrites:0,localWrites:0,startedAt:new Date().toISOString(),candidateSha256:binding.candidateBundleSha256,profiles:[],apiCases:sdk.apiCases,sdkReceiptSha256:sha(fs.readFileSync(art+'/local-sdk-v6/result.json'))};
async function capture(profile,database){
 const upgrade=read(art+'/'+profile+'-upgrade-v5/result.json');assert.equal(upgrade.pass,true);assert.equal(upgrade.ledger,516);assert.equal(upgrade.candidateSha256,binding.candidateBundleSha256);assert.deepEqual(upgrade.changedDataTables,[]);
 const c=new(r('pg').Client)({host:'127.0.0.1',port:55040,user:'postgres',password:'postgres',database,connectionTimeoutMillis:15000,application_name:'bog-local-516-final-'+profile});clients.push(c);await c.connect();const snapshots={};
 for(const[name,file]of[['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){snapshots[name]=(await c.query(fs.readFileSync(root+'/scripts/schema/'+file,'utf8'))).find(x=>x.rows?.[0]?.receipt).rows[0].receipt;save(profile+'-'+name,snapshots[name]);}
 assert.deepEqual(snapshots.catalog.LEDGER.map(x=>x.version),Object.keys({...binding.history,...binding.candidates}).sort().map(f=>f.match(/^\d+/)[0]));
 const fingerprint=(await c.query('select prismatic_fixture.fingerprints() value')).rows[0].value;assert.deepEqual(fingerprint,read(art+'/'+profile+'-upgrade-v5/before-fingerprints.private.json.gz'));save(profile+'-fingerprints',fingerprint);
 await c.query('begin read only');
 for(const role of['anon','authenticated','service_role']){
  await c.query('set local role '+role);const acl=(await c.query("select jsonb_object_agg(p,has_table_privilege(current_user,'public.v_card_prints_set_family_discovery_v1',p)) value from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'])p")).rows[0].value;assert.deepEqual(acl,{SELECT:true,INSERT:false,UPDATE:false,DELETE:false,TRUNCATE:false,REFERENCES:false,TRIGGER:false,MAINTAIN:false});await c.query('reset role');
 }
 for(const role of['anon','authenticated']){
  await c.query('set local role '+role);await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({role,...(role==='authenticated'?{sub:'10000000-0000-0000-0000-000000000016'}:{})})]);await c.query("set local statement_timeout='3s'");
  const start=performance.now(),rows=(await c.query("select code,card_count::int n from public.get_public_catalog_sets_v2('pokemon') where code in('bog','bp')")).rows,ms=Math.round(performance.now()-start);assert.deepEqual(rows,[{code:'bp',n:13}]);assert.ok(ms<2700);
  if(role==='authenticated')assert.equal((await c.query("select count(*)::int n from public.vault_item_instances where user_id='10000000-0000-0000-0000-000000000016'")).rows[0].n,22);
  else assert.equal((await c.query("select has_table_privilege(current_user,'public.vault_item_instances','SELECT') value")).rows[0].value,false);
  report.profiles.push({profile,database,role,ms,protectedTables:Object.keys(fingerprint).length,savedCopies:22,retainedRawRows:true});await c.query('reset role');
 }
 await c.query('rollback');return snapshots;
}
try{
 const fresh=await capture(...profiles[0]),retained=await capture(...profiles[1]);assert.deepEqual(fresh.security,retained.security);
 const baseline=read(art+'/fresh-upgrade-v5/before-catalog.private.json.gz'),baselineSecurity=read(art+'/fresh-upgrade-v5/before-security.private.json.gz');
 const key=x=>[x.kind,x.schema,x.name,x.owner].join('|'),old=new Map(baselineSecurity.objects.map(x=>[key(x),x])),changed=[];
 for(const row of fresh.security.objects){const before=old.get(key(row));assert.ok(before,'Unexpected new security object');old.delete(key(row));if(JSON.stringify(row)!==JSON.stringify(before)){assert.equal(row.kind,'function');assert.equal(row.schema,'public');assert.ok(['get_best_of_game_discovery_projection_v1','get_public_catalog_sets_v2'].includes(row.name.split('(')[0]));const a=structuredClone(before),b=structuredClone(row);delete a.facts.definition;delete b.facts.definition;assert.deepEqual(a,b);changed.push(row.name.split('(')[0]);}}
 assert.equal(old.size,0);assert.deepEqual(changed.sort(),['get_best_of_game_discovery_projection_v1','get_public_catalog_sets_v2']);
 const views=s=>new Map(s.ALL_RELATIONS_QUERY.filter(x=>x.schema==='public'&&x.relationtype==='v').map(x=>[x.name,x.definition])),beforeViews=views(baseline),afterViews=views(fresh.catalog);assert.deepEqual([...beforeViews.keys()].sort(),[...afterViews.keys()].sort());assert.deepEqual([...beforeViews].filter(([n,d])=>afterViews.get(n)!==d).map(([n])=>n),['v_card_prints_set_family_discovery_v1']);
 const kit=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of['schemainspect','migra','client'])assert.equal(kit('@pgkit/'+n+'/package.json').version,'0.6.1');
 const{PostgreSQL}=kit('@pgkit/schemainspect'),{Migration}=kit('@pgkit/migra'),queries=Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY'));
 async function model(s,schema){const map=new Map(queries.map(([k,q])=>[q,s[k]])),m=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>{assert.ok(map.has(q.sql));return map.get(q.sql);}});m.one_schema(schema);for(const k of['types','domains','materialized_views','composite_types'])m[k]=Object.fromEntries(Object.entries(m[k]).filter(([,v])=>v.schema===schema));return m;}
 const allowed=new Set(['get_best_of_game_discovery_projection_v1','get_public_catalog_sets_v2','v_card_prints_set_family_discovery_v1']),deltas=[];
 for(const schema of['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
  const eq=await Migration.create(await model(fresh.catalog,schema),await model(retained.catalog,schema),{schema});eq.set_safety(false);eq.add_all_changes(true);fs.writeFileSync(out+'/fresh-retained-'+schema+'-NEVER-EXECUTE.sql',eq.sql,{flag:'wx'});assert.equal(eq.sql.trim(),'');
  const a=await model(baseline,schema),b=await model(fresh.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);const diff=await Migration.create(a,b,{schema});diff.set_safety(false);diff.add_all_changes(true);fs.writeFileSync(out+'/baseline-'+schema+'-NEVER-EXECUTE.sql',diff.sql,{flag:'wx'});if(schema!=='public')assert.equal(diff.sql.trim(),'');
  for(const statement of diff.statements){if(statement.trim()==='set check_function_bodies = off;')continue;const match=statement.match(/(?:function|view|table)\s+(?:"public"|public)\.(?:"([a-z0-9_]+)"|([a-z0-9_]+))/i),name=match?.[1]??match?.[2];assert.ok(name&&allowed.has(name),'Unexpected schema delta '+statement.slice(0,120));deltas.push({object:name,operation:statement.trim().split('\n')[0]});}
 }
 Object.assign(report,{pass:true,status:'passed',ledger:516,freshRetainedSchemaEqual:true,privateSchemasUnchanged:true,existingSecurityUnchanged:true,changedFunctions:changed,changedViews:['v_card_prints_set_family_discovery_v1'],schemaDeltas:deltas,allThreeReaderRolesSelectOnly:true,all449ProtectedTablesExact:true,actualAnonymousSdkPassed:true,replayLineageExplicit:true,newEmpty516ResetClaimed:false});
}catch(e){report.error=e.message;process.exitCode=1;}finally{for(const c of clients){await c.query('rollback').catch(()=>{});await c.end().catch(()=>{});}report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:report.pass,error:report.error,ledger:report.ledger,apiCases:report.apiCases.length,changedFunctions:report.changedFunctions,changedViews:report.changedViews}));}
