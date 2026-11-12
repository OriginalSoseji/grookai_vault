// Bounded, read-only493 ->494 qualification. Default strict scope is unchanged.
// No diff execution, migration application, history repair, reset or DB writes.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root='C:/grookai_vendor_rules_20261112',artifacts='C:/grookai_vault_operator_artifacts/vendor_rules_labels_20261112';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
export function validateVendorPricingReleaseArgs(args){
 assert.equal(args.length,2);assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]));assert.match(args[1],/^--out-dir=/);
 const out=args[1].slice(10).replaceAll('\\','/');assert.equal(path.win32.dirname(out).replaceAll('\\','/'),artifacts);assert.match(path.win32.basename(out),/^release-gate-[a-z0-9-]{1,80}$/);return{phase:args[0],out};
}
export function validateVendorPricingReleaseSources(files,manifest){
 assert.equal(manifest.version,'VENDOR_PRICING_493_TO_494_V1');assert.equal(Object.keys(manifest.history).length,493);assert.deepEqual(Object.keys(manifest.candidates),['20261112180000_vendor_pricing_rules_v1.sql']);
 const expected={...manifest.history,...manifest.candidates};assert.deepEqual(Object.keys(files).sort(),Object.keys(expected).sort());
 for(const [file,pin]of Object.entries(expected))assert.equal(sha(files[file]),pin,'Immutable migration changed: '+file);
 const versions=Object.keys(expected).sort().map(file=>file.match(/^\d+/)[0]);assert.equal(new Set(versions).size,494);assert.equal(versions.at(-1),'20261112180000');return versions;
}
async function main(){
 const{phase,out}=validateVendorPricingReleaseArgs(process.argv.slice(2));assert.equal(fs.existsSync(out),false,'Consumed audit output');
 assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
 const pooler=new URL(fs.readFileSync(root+'/supabase/.temp/pooler-url','utf8').trim());assert.ok(decodeURIComponent(pooler.username).includes('ycdxbpibncqcchqiihfz'));assert.ok(pooler.hostname.endsWith('.pooler.supabase.com'));
 const manifest=read(root+'/docs/audits/vendor_pricing_20261112/release-manifest-v1.json');
 const sources=()=>Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(root+'/supabase/migrations/'+n)]));
 const versions=validateVendorPricingReleaseSources(sources(),manifest),history=versions.slice(0,-1);
 for(const [file,pin]of Object.entries(manifest.queryPins))assert.equal(sha(fs.readFileSync(root+'/'+file)),pin,'Qualification SQL changed: '+file);
 for(const [file,pin]of Object.entries(manifest.proofPins)){assert.ok(!file.includes('..'));assert.equal(sha(fs.readFileSync(artifacts+'/'+file)),pin,'Proof changed: '+file);}
 fs.mkdirSync(out);const report={pass:false,phase,startedAt:new Date().toISOString(),productionWrites:0};
 const query=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8'),oldSecurityQuery=fs.readFileSync(root+'/scripts/schema/square_security_snapshot_v3.sql','utf8'),securityQuery=fs.readFileSync(root+'/scripts/schema/vendor_pricing_security_snapshot_v1.sql','utf8');
 const local=(project,lab,security=securityQuery)=>{
  assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8'}))[0];assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
  const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',timeout:120000,maxBuffer:64000000,windowsHide:true});
  assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');
  const catalog=JSON.parse(sql(query)),permissions=JSON.parse(sql(security));assert.equal(permissions.readOnly,'on');assert.equal(permissions.privateExecutable,0);
  fs.writeFileSync(out+'/'+project+'-catalog.private.json',JSON.stringify(catalog));fs.writeFileSync(out+'/'+project+'-security.private.json',JSON.stringify(permissions));return{catalog,permissions,sql};
 };
 const remote=(file,label)=>{
  assert.match(fs.readFileSync(file,'utf8'),/^begin\b[^;]*\bread only;/i);const fd=fs.openSync(out+'/'+label+'.private.json','wx');let r;
  try{r=spawnSync('supabase',['db','query','--linked','--file',file,'--output','json','--workdir',root],{env:{...process.env,PGSSLMODE:'verify-full',PGSSLROOTCERT:'C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem'},windowsHide:true,timeout:180000,stdio:['ignore',fd,'pipe']});}finally{fs.closeSync(fd);}assert.ifError(r.error);assert.equal(r.status,0,r.stderr);return read(out+'/'+label+'.private.json').rows[0].receipt;
 };
 try{
  const baseline=local('square-commerce-fresh-487-20261111','C:/grookai_vault_operator_artifacts/square_sync_20261110/commerce-fresh-v2',oldSecurityQuery);
  const fresh=local('vendor-pricing-fresh-494-20261112',artifacts+'/fresh-494'),retained=local('vendor-pricing-retained-493-20261112',artifacts+'/retained-493');
  const live=remote(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','production-catalog'),liveSecurity=remote(root+'/scripts/schema/square_security_snapshot_v3.sql','production-security');
  assert.equal(live.read_only,'on');assert.ok(live.sanity.cards>=40000&&live.sanity.sets>=150&&live.sanity.traits>=5000);assert.deepEqual(live.LEDGER.map(r=>r.version),history,'Production is no longer the pinned493 baseline');assert.deepEqual(baseline.catalog.LEDGER.map(r=>r.version),history);
  for(const t of[fresh,retained])assert.deepEqual(t.catalog.LEDGER.map(r=>r.version),versions);
  assert.deepEqual(baseline.permissions,liveSecurity,'Production baseline permissions/definitions differ');assert.deepEqual(fresh.permissions,retained.permissions,'Fresh/retained permissions/definitions differ');
  const require=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const n of['schemainspect','migra','client'])assert.equal(require('@pgkit/'+n+'/package.json').version,'0.6.1');const{PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
  const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
  const inspect=async(snapshot,schema)=>{const map=new Map(Object.entries(queries).map(([k,v])=>[v,snapshot[k]]));const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.equal(q.values.length,0);assert.ok(map.has(q.sql));return map.get(q.sql);}});model.one_schema(schema);for(const k of['types','domains','materialized_views','composite_types'])model[k]=Object.fromEntries(Object.entries(model[k]).filter(([,v])=>v.schema===schema));return model;};
  async function compare(a,b,schema,label){const left=await inspect(a,schema),right=await inspect(b,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(left,right);const diff=await Migration.create(left,right,{schema});diff.set_safety(false);diff.add_all_changes(true);fs.writeFileSync(out+'/'+label+'-'+schema+'-NEVER-EXECUTE.sql',diff.sql);assert.equal(diff.sql.trim(),'','Schema differs: '+label+'/'+schema);}
  for(const schema of['public','grookai_square','grookai_inventory'])await compare(baseline.catalog,live,schema,'baseline');
  for(const schema of['public','grookai_square','grookai_inventory','grookai_vendor_pricing'])await compare(fresh.catalog,retained.catalog,schema,'fresh-retained');
  const upgraded=read(artifacts+'/retained-493/upgrade-proof.json');assert.equal(upgraded.pass,true);assert.equal(upgraded.unchangedDataTables,414);assert.equal(upgraded.noop,true);assert.equal(upgraded.defaultOff,true);
  assert.equal(read(artifacts+'/fresh-494/replay-result.json').pass,true);const runtime=read(artifacts+'/fresh-494/runtime-proof.json');assert.equal(runtime.pass,true);assert.equal(runtime.actualReaderUnchanged,true);assert.ok(runtime.proof.length>=24);
  if(phase==='PrePush'){
   assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','PrePush needs the committed, qualified checkout');assert.ok(Object.keys(manifest.runtimeSources).length>=50,'Freeze complete runtime source');
   for(const [file,pin]of Object.entries(manifest.runtimeSources))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Runtime source changed: '+file);
   for(const t of[fresh,retained])assert.equal(t.sql('select enabled from grookai_vendor_pricing.controls where singleton').trim(),'f','Local pricing control must be paused after qualification');
   const http=read(artifacts+'/web-qa-v5/workflow-proof.json');assert.equal(http.pass,true);assert.equal(http.actualLocalAuth,true);assert.equal(http.liveQuoteRefresh,true);assert.equal(http.concurrentManualChoiceProtected,true);assert.equal(http.sourceUnchanged,true);assert.ok(Object.keys(http.sourceHashes).length>=10);
   for(const[file,pin]of Object.entries(http.sourceHashes))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Web execution source changed: '+file);
   assert.equal(read(artifacts+'/label-qa-set-names-v2/qr-decode-proof.json').pass,true);
  }
  validateVendorPricingReleaseSources(sources(),manifest);Object.assign(report,{pass:true,remoteLedger:493,targetLedger:494,pending:['20261112180000'],remainingSqlBytes:0,securityExact:true,sanity:live.sanity});
 }catch(error){report.error=error.message;process.exitCode=1;}
 finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
