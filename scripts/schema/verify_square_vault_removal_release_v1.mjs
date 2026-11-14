// Read-only, complete schema comparison; emitted SQL is evidence, never an apply plan.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root='C:/grookai_vault_remove_fix_20261114';
const artifacts='C:/grookai_vault_operator_artifacts/card_remove_repair_20261114';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const sha=value=>createHash('sha256').update(value).digest('hex');
const [phase,arg,...extra]=process.argv.slice(2);
assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));assert.equal(extra.length,0);assert.match(arg??'',/^--out-dir=/);
const out=arg.slice(10).replaceAll('\\','/');
assert.equal(path.win32.dirname(out).replaceAll('\\','/'),artifacts);
assert.match(path.win32.basename(out),/^release-gate-[a-z0-9-]{1,80}$/);
assert.equal(fs.existsSync(out),false,'Consumed audit directory');
const manifest=read(artifacts+'/release-manifest-v3.json');
assert.equal(manifest.version,'SQUARE_VAULT_REMOVAL_495_TO_496_V1');
assert.equal(Object.keys(manifest.history).length,495);
assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
const pooler=new URL(fs.readFileSync(root+'/supabase/.temp/pooler-url','utf8').trim());
assert.ok(decodeURIComponent(pooler.username).includes('ycdxbpibncqcchqiihfz'));assert.ok(pooler.hostname.endsWith('.pooler.supabase.com'));
function validate(){
 const files=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(root+'/supabase/migrations/'+n)]));
 const expected={...manifest.history,...manifest.candidates};
 assert.deepEqual(Object.keys(files).sort(),Object.keys(expected).sort());
 for(const[file,pin]of Object.entries(expected))assert.equal(sha(files[file]),pin,'Immutable source changed: '+file);
 if(phase==='PrePush')assert.deepEqual(Object.keys(manifest.candidates),['20261114080000_square_aware_vault_removal_v1.sql']);
}
validate();fs.mkdirSync(out);
const report={pass:false,phase,target:'REMOTE https://ycdxbpibncqcchqiihfz.supabase.co',productionWrites:0,startedAt:new Date().toISOString()};
const catalogSql=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8');
const securitySql=fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8');
function local(project,lab){
 assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false,'Local replay must never be linked');
 const container=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8'}))[0];
 assert.equal(container.State.Running,true);assert.equal(container.Image,manifest.postgresImage);
 assert.deepEqual(Object.keys(container.NetworkSettings.Networks),[project]);
 assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
 const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:180000,maxBuffer:64000000,windowsHide:true});
 assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');
 return{catalog:JSON.parse(sql(catalogSql)),security:JSON.parse(sql(securitySql)),sql};
}
function remote(file,label){
 assert.match(fs.readFileSync(file,'utf8'),/^begin\b[^;]*\bread only;/i);
 const fd=fs.openSync(out+'/'+label+'.private.json','wx');let result;
 try{result=spawnSync('supabase',['db','query','--linked','--file',file,'--output','json','--workdir',root],{env:{...process.env,PGSSLMODE:'verify-full',PGSSLROOTCERT:'C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem'},windowsHide:true,timeout:180000,stdio:['ignore',fd,'pipe']});}finally{fs.closeSync(fd);}
 assert.ifError(result.error);assert.equal(result.status,0,result.stderr?.toString());
 return read(out+'/'+label+'.private.json').rows[0].receipt;
}
try{
 const baseline=local(manifest.baseline.project,manifest.baseline.path);
 const live=remote(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','production-catalog');
 const permissions=remote(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','production-security');
 const history=Object.keys(manifest.history).sort().map(file=>file.match(/^\d+/)[0]);
 assert.deepEqual(live.LEDGER.map(row=>row.version),history);assert.deepEqual(baseline.catalog.LEDGER.map(row=>row.version),history);
 assert.equal(live.read_only,'on');assert.ok(live.sanity.cards>=40000&&live.sanity.sets>=150&&live.sanity.traits>=5000);
 assert.deepEqual(permissions,baseline.security,'Production security drift');assert.equal(permissions.privateExecutable,0);
 const require=createRequire('C:/gv_intake_recovery_20261027/package.json');
 for(const name of['schemainspect','migra','client'])assert.equal(require('@pgkit/'+name+'/package.json').version,'0.6.1');
 const{PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
 const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
 async function inspect(snapshot,schema){
  const map=new Map(Object.entries(queries).map(([key,value])=>[value,snapshot[key]]));
  const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async query=>{assert.equal(query.values.length,0);assert.ok(map.has(query.sql));return map.get(query.sql);}});
  model.one_schema(schema);for(const key of['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,value])=>value.schema===schema));return model;
 }
 async function compare(left,right,label){
  for(const schema of['public','grookai_square','grookai_inventory','grookai_vendor_pricing']){
   const a=await inspect(left,schema),b=await inspect(right,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(a,b);
   const diff=await Migration.create(a,b,{schema});diff.set_safety(false);diff.add_all_changes(true);
   fs.writeFileSync(out+'/'+label+'-'+schema+'-NEVER-EXECUTE.sql',diff.sql);
   assert.equal(diff.sql.trim(),'','Schema differs: '+label+'/'+schema);
  }
 }
 await compare(baseline.catalog,live,'baseline');
 if(phase==='PrePush'){
  assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','PrePush requires qualified committed source');
  const fresh=local(manifest.fresh.project,manifest.fresh.path),retained=local(manifest.retained.project,manifest.retained.path);
  for(const lab of[fresh,retained])assert.deepEqual(lab.catalog.LEDGER.map(row=>row.version),[...history,'20261114080000']);
  await compare(fresh.catalog,retained.catalog,'fresh-retained');assert.deepEqual(fresh.security,retained.security);
  const proofs=['fresh-v2-496/replay-proof.json','retained-v2-495/upgrade-proof.json','runtime-proof-v2.json'];
  for(const name of proofs){
   const bytes=fs.readFileSync(artifacts+'/'+name),proof=read(artifacts+'/'+name);
   assert.equal(proof.pass,true,name);assert.equal(proof.candidateSha256,manifest.candidates['20261114080000_square_aware_vault_removal_v1.sql']);
   assert.equal(sha(bytes),manifest.proofPins[name],name);
  }
  for(const[name,pin]of Object.entries(manifest.runtimeSources))assert.equal(sha(fs.readFileSync(root+'/'+name,'utf8').replaceAll('\r\n','\n')),pin,name);
  assert.ok(Object.keys(manifest.runtimeSources).length>=8);
 }
 validate();Object.assign(report,{pass:true,remoteLedger:495,targetLedger:496,remainingSqlBytes:0,securityExact:true,sanity:live.sanity});
}catch(error){report.error=error.message;process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
