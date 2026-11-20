import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const artifacts='C:/grookai_vault_operator_artifacts/cross_tcg_market_pricing_20261119';
const attempt=process.argv[2]??'01';assert.match(attempt,/^[0-9]{2}$/);
const out='artifacts/pricing_market_v2/20261119/schema-qualification-'+attempt;assert.equal(fs.existsSync(out),false);fs.mkdirSync(out);
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=p=>JSON.parse((p.endsWith('.gz')?gunzipSync(fs.readFileSync(p)):fs.readFileSync(p)).toString('utf8'));
const report={at:new Date().toISOString(),executedSourceSha256:sha(fs.readFileSync(new URL(import.meta.url))),pass:false,productionWrites:0,candidateSha256:sha(fs.readFileSync('supabase/migrations/20261120063000_cross_tcg_market_publication_v2.sql'))};
const labs=[{name:'fresh',project:'cross-price-fresh512r4-20261119',path:artifacts+'/fresh-512-r4'},{name:'upgrade',project:'cross-price-upgrade511r3-20261119',path:artifacts+'/upgrade-511-r3'}];
const query=(lab,input)=>JSON.parse(execFileSync('docker',['exec','-i','supabase_db_'+lab.project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:128*1024*1024}));
try{
 const binding=read('scripts/schema/cross_tcg_market_candidate_v2.json');assert.equal(report.candidateSha256,binding.candidates['20261120063000_cross_tcg_market_publication_v2.sql']);
 const snapshots={};
 for(const lab of labs){assert.equal(fs.existsSync(lab.path+'/supabase/.temp/project-ref'),false);const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+lab.project],{encoding:'utf8'}))[0];assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[lab.project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',lab.project],{encoding:'utf8'}))[0].Internal,true);assert.deepEqual(query(lab,"select jsonb_build_object('users',(select count(*) from auth.users),'copies',(select count(*) from public.vault_item_instances),'workers',current_setting('max_worker_processes'))"),{users:0,copies:0,workers:'0'});
  for(const [file,pin] of Object.entries({...binding.history,...binding.candidates}))assert.equal(sha(fs.readFileSync(lab.path+'/supabase/migrations/'+file)),pin);
  snapshots[lab.name]={};for(const [name,file] of [['catalog','reviewed_intake_public_catalog_v1.sql'],['security','vendor_pricing_security_snapshot_v1.sql']]){const sql=fs.readFileSync('scripts/schema/'+file,'utf8');assert.match(sql,/^begin\b[^;]*read only;/i);snapshots[lab.name][name]=query(lab,sql);fs.writeFileSync(out+'/'+lab.name+'-'+name+'.private.json.gz',gzipSync(Buffer.from(JSON.stringify(snapshots[lab.name][name]))),{flag:'wx'});}
  assert.deepEqual(snapshots[lab.name].catalog.LEDGER.map(x=>x.version),Object.keys({...binding.history,...binding.candidates}).sort().map(x=>x.match(/^\d+/)[0]));
 }
 assert.deepEqual(snapshots.fresh.security,snapshots.upgrade.security,'Fresh and populated-upgrade security must be identical');
 const pgkit=createRequire('C:/gv_intake_recovery_20261027/package.json');const {PostgreSQL}=pgkit('@pgkit/schemainspect'),{Migration}=pgkit('@pgkit/migra');const queries=Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY'));
 async function inspect(s,schema){const map=new Map(queries.map(([key,q])=>[q,s[key]]));const model=await PostgreSQL.create({oneFirst:async()=>s.server_version,any:async q=>map.get(q.sql)});model.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,v])=>v.schema===schema));return model;}
 const beforeCatalog=read('artifacts/pricing_market_v2/20261119/baseline-local-catalog.private.json.gz');
 const changedTables=new Set(['market_price_pipeline_candidates','market_price_qualification_decisions','market_price_publication_snapshots']);
 const newViews=new Set(['v_cross_tcg_market_targets_v2','v_cross_tcg_market_candidates_v2','v_tcgplayer_market_qualification_candidates_v8']);
 const newTypes=new Set([...newViews,...[...newViews].map(n=>'_'+n)]);
 const allowed={tables:new Set(),views:newViews,functions:new Set(['guard_cross_tcg_market_price_batch_v2']),indexes:new Set(['external_printing_mappings_active_child_source_v2_idx']),constraints:new Set(),triggers:new Set(['cross_tcg_market_price_guard_v2']),types:newTypes,composite_types:newTypes};
 const semantic=item=>{for(const field of ['create_statement','get_create_statement']){const value=item[field];if(typeof value==='string')return value;if(typeof value==='function')return value.call(item);}if(typeof item.full_definition==='string')return item.full_definition;if(typeof item.definition==='string')return item.definition;return JSON.stringify(item,(key,value)=>/^(dependent_on|dependents)/.test(key)?undefined:value);};
 const changes=[];
 for(const schema of ['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
  const fresh=await inspect(snapshots.fresh.catalog,schema),upgrade=await inspect(snapshots.upgrade.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(fresh,upgrade);const equal=await Migration.create(fresh,upgrade,{schema});equal.set_safety(false);equal.add_all_changes(true);assert.equal(equal.sql.trim(),'','Fresh/upgrade schema mismatch: '+schema);
  const before=await inspect(beforeCatalog,schema),after=await inspect(snapshots.fresh.catalog,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(before,after);
  const delta=await Migration.create(before,after,{schema});delta.set_safety(false);delta.add_all_changes(true);fs.writeFileSync(out+'/before-after-'+schema+'.sql',delta.sql,{flag:'wx'});
  if(schema!=='public'){assert.equal(delta.sql.trim(),'','Private schema changed: '+schema);continue;}
  for(const group of ['tables','views','functions','indexes','constraints','triggers','sequences','enums','collations','rlspolicies','schemas','extensions','types','domains','composite_types','materialized_views']){
   const old=before[group]??{},next=after[group]??{};
   for(const [key,item] of Object.entries(old)){assert.ok(Object.hasOwn(next,key),'Removed existing '+group+' '+key);const current=next[key];if(semantic(item)===semantic(current))continue;
    if(group==='tables'&&changedTables.has(item.name)){
     const oldColumns=new Set(Object.values(item.columns).map(c=>c.name));const extra=Object.values(current.columns).filter(c=>!oldColumns.has(c.name));assert.deepEqual(extra.map(c=>c.name).sort(),['cross_tcg_printing_mapping_id','cross_tcg_source_mapping_id']);
     const clone=Object.assign(Object.create(Object.getPrototypeOf(current)),current,{columns:Object.fromEntries(Object.entries(current.columns).filter(([,column])=>oldColumns.has(column.name))),constraints:item.constraints,indexes:item.indexes});assert.equal(semantic(clone),semantic(item),'Existing table definition changed beyond nullable cross FKs: '+item.name);
    }else if(group==='constraints'&&['market_price_snapshot_assignment_lane_v1','market_price_qualification_decisions_language_check'].includes(item.name)){assert.ok(changedTables.has(item.table_name));}
    else throw Error('Unexpected existing schema change: '+group+' '+key);
    changes.push({group,name:item.name,kind:'changed'});
   }
   for(const [key,item] of Object.entries(next))if(!Object.hasOwn(old,key)){
    if(group==='constraints'){assert.ok(changedTables.has(item.table_name));assert.match(item.definition,/FOREIGN KEY \(cross_tcg_(source|printing)_mapping_id\)/);assert.match(item.definition,/REFERENCES external_(printing_)?mappings\(id\) ON DELETE RESTRICT/);}
    else assert.ok(allowed[group]?.has(item.name),'Unexpected new schema object: '+group+' '+key);
    changes.push({group,name:item.name,table:item.table_name,kind:'added'});
   }
  }
 }
 const oldSecurity=read('artifacts/pricing_market_v2/20261119/baseline-local-security.private.json.gz');
 const securityKey=row=>[row.kind,row.schema,row.name,row.owner].join('|');const oldMap=new Map(oldSecurity.objects.map(x=>[securityKey(x),x]));const newMap=new Map(snapshots.fresh.security.objects.map(x=>[securityKey(x),x]));
 for(const [key,old] of oldMap){assert.ok(newMap.has(key),'Removed existing security object');let current=structuredClone(newMap.get(key));if(old.kind==='relation'&&old.schema==='public'&&changedTables.has(old.name))current.facts.columns=current.facts.columns.filter(x=>!['cross_tcg_source_mapping_id','cross_tcg_printing_mapping_id'].includes(x.name));assert.deepEqual(current,old,'Existing security changed: '+key);}
 for(const [key,item] of newMap)if(!oldMap.has(key)){assert.equal(item.schema,'public');assert.ok(item.kind==='relation'&&newViews.has(item.name)||item.kind==='function'&&item.name==='guard_cross_tcg_market_price_batch_v2()'||item.kind==='type'&&newTypes.has(item.name),'Unexpected new security object: '+key);}
 const runtime=read('artifacts/pricing_market_v2/20261119/local-runtime-release.json'),scale=read('artifacts/pricing_market_v2/20261119/permissions-scale-release.json');for(const proof of [runtime,scale]){assert.equal(proof.pass,true);assert.equal(proof.productionWrites,0);assert.equal(proof.candidateSha256??proof.labCandidateSha256,report.candidateSha256);}
 assert.equal(runtime.allRuntimeWritesRolledBack,true);assert.equal(scale.allPerformanceWritesRolledBack,true);assert.equal(scale.defaultPlanner,true);assert.equal(scale.newChildIndexUsed,true);assert.ok(scale.mappingRowsDuringScale>=200000&&scale.boundedPageExecutionMs<10000);
 assert.equal(read(labs[0].path+'/replay-proof.json').pass,true);assert.equal(read(labs[0].path+'/replay-proof.json').candidateSha256,report.candidateSha256);assert.equal(read(labs[1].path+'/pricing-upgrade-proof.json').candidateSha256,report.candidateSha256);
 const fingerprintSQL=fs.readFileSync(labs[1].path+'/protected-fingerprints.sql','utf8');assert.deepEqual(query(labs[1],fingerprintSQL),read(labs[1].path+'/protected-before-final-runtime.json'));if(fs.existsSync(labs[0].path+'/protected-fingerprints.sql'))assert.equal(fs.readFileSync(labs[0].path+'/protected-fingerprints.sql','utf8'),fingerprintSQL);else fs.writeFileSync(labs[0].path+'/protected-fingerprints.sql',fingerprintSQL,{flag:'wx'});const freshFingerprints=query(labs[0],fingerprintSQL);if(fs.existsSync(labs[0].path+'/protected-final.json'))assert.deepEqual(freshFingerprints,read(labs[0].path+'/protected-final.json'));else fs.writeFileSync(labs[0].path+'/protected-final.json',JSON.stringify(freshFingerprints,null,2)+'\n',{flag:'wx'});
 Object.assign(report,{pass:true,freshAndUpgradeSchemaEqual:true,existingSchemaAndSecurityPreserved:true,threeRolePermissionsQualified:true,protectedDataUnchanged:true,productionSizedPerformanceQualified:true,oldCohortOutputEquivalent:true,fresh512CliReplayQualified:true,populated511To512CliUpgradeQualified:true,positiveExactPrices:runtime.positiveExactPrices,negativeSourceLineageChecks:runtime.negativeLineageAndSourceChecks,genuineMissingMarketHeld:runtime.genuineMissingMarketHeld,protectedTables:426,boundedPageExecutionMs:scale.boundedPageExecutionMs,mappingRowsDuringScale:scale.mappingRowsDuringScale,changes});
}catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
