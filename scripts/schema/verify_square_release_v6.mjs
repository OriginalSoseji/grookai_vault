// Exact read-only 483 -> 493 release qualification. Never executes a generated
// diff, applies SQL, resets a populated lab, or repairs migration history.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';import {createRequire} from 'node:module';import {execFileSync,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
const root='C:/grookai_square_sync_20261110',artifacts='C:/grookai_vault_operator_artifacts/square_sync_20261110';
const sha=value=>createHash('sha256').update(value).digest('hex'),read=file=>JSON.parse(fs.readFileSync(file));
export const squareReleaseIds=['20261111051000','20261111060000','20261111063000','20261111080000','20261111130000','20261111133000','20261111134500','20261111140000','20261111170000','20261111173000'];
export function validateSquareReleaseArgs(args){
 assert.equal(args.length,2);assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]));assert.match(args[1],/^--out-dir=/);
 const out=args[1].slice(10).replaceAll('\\','/');assert.equal(path.win32.dirname(out).replaceAll('\\','/'),artifacts);
 assert.match(path.win32.basename(out),/^release-gate-[a-z0-9-]{1,80}$/);return {phase:args[0],out};
}
export function validateSquareReleaseSources(files,manifest){
 assert.equal(Object.keys(manifest.history).length,483);assert.equal(Object.keys(manifest.candidates).length,10);
 const expected={...manifest.history,...manifest.candidates};assert.deepEqual(Object.keys(files).sort(),Object.keys(expected).sort());
 for(const [name,pin]of Object.entries(expected))assert.equal(sha(files[name]),pin,'Immutable migration changed: '+name);
 const versions=Object.keys(expected).sort().map(name=>name.match(/^\d+/)[0]);assert.equal(new Set(versions).size,493);
 assert.deepEqual(versions.slice(-10),squareReleaseIds);return versions;
}
async function main(){
 const {phase,out}=validateSquareReleaseArgs(process.argv.slice(2));assert.equal(fs.existsSync(out),false,'Consumed audit');
 assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
 assert.match(fs.readFileSync(root+'/supabase/config.toml','utf8'),/project_id\s*=\s*"ycdxbpibncqcchqiihfz"/);
 const pooler=new URL(fs.readFileSync(root+'/supabase/.temp/pooler-url','utf8').trim());assert.ok(decodeURIComponent(pooler.username).includes('ycdxbpibncqcchqiihfz'));assert.ok(pooler.hostname.endsWith('.pooler.supabase.com'));
 const manifest=read(root+'/docs/audits/square_commerce_20261111/release-manifest-v6.json');assert.equal(manifest.version,'SQUARE_RELEASE_483_TO_493_V6');
 const sources=()=>Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(root+'/supabase/migrations/'+n)]));
 const versions=validateSquareReleaseSources(sources(),manifest),history=versions.slice(0,-10);
 const query=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8'),securityQuery=fs.readFileSync(root+'/scripts/schema/square_security_snapshot_v3.sql','utf8');
 assert.equal(sha(query),manifest.catalogQuerySha256);assert.equal(sha(securityQuery),manifest.securityQuerySha256);
 assert.equal(sha(fs.readFileSync(root+'/scripts/schema/column_order_reconciliation_v1.mjs')),manifest.columnOrderHelperSha256);
 for(const [relative,pin]of Object.entries(manifest.proofs)){assert.ok(!relative.includes('..'));assert.equal(sha(fs.readFileSync(artifacts+'/'+relative)),pin,'Proof changed: '+relative);}
 fs.mkdirSync(out);const report={pass:false,phase,scope:manifest.version,startedAt:new Date().toISOString(),productionWrites:0};
 const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:64_000_000});
 const local=(project,lab)=>{
  assert.equal(fs.existsSync(lab+'/supabase/.temp/project-ref'),false);const info=readDocker('inspect','supabase_db_'+project)[0];
  assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);assert.equal(readDocker('network','inspect',project)[0].Internal,true);
  const sql=input=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:64_000_000});
  assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');
  const snapshot=JSON.parse(sql(query)),security=JSON.parse(sql(securityQuery));assert.equal(security.readOnly,'on');assert.equal(security.privateExecutable,0);
  fs.writeFileSync(out+'/'+project+'-catalog.private.json',JSON.stringify(snapshot));fs.writeFileSync(out+'/'+project+'-security.private.json',JSON.stringify(security));return {snapshot,security,sql};
 };
 function readDocker(...args){return JSON.parse(docker(...args));}
 const remoteQuery=(file,label)=>{
  const fd=fs.openSync(out+'/'+label+'-envelope.private.json','wx');let result;
  try{result=spawnSync('supabase',['db','query','--linked','--workdir',root,'--file',file,'--output','json'],{encoding:'utf8',windowsHide:true,timeout:180000,stdio:['ignore',fd,'pipe']});}finally{fs.closeSync(fd);}
  fs.writeFileSync(out+'/'+label+'-stderr.private.log',result.stderr??'');assert.ifError(result.error);assert.equal(result.status,0,'Official read-only linked query failed');
  const raw=fs.readFileSync(out+'/'+label+'-envelope.private.json','utf8');return JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows[0].receipt;
 };
 try{
  console.log('REMOTE read-only canonical483; LOCAL preserved fresh/retained493; no schema writes');
  const baseline=local('catalog-482-v3-20261110','C:/grookai_vault_completion_replay_v3_20261110');
  const fresh=local('square-commerce-fresh-487-20261111',artifacts+'/commerce-fresh-v2'),retained=local('square-fresh-483-20261110',artifacts+'/local-fresh-v1');
  const remote=remoteQuery(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','remote'),remoteSecurity=remoteQuery(root+'/scripts/schema/square_security_snapshot_v3.sql','remote-security');
  assert.equal(remote.read_only,'on');assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
  assert.deepEqual(baseline.snapshot.LEDGER.map(r=>r.version),history);assert.deepEqual(fresh.snapshot.LEDGER.map(r=>r.version),versions);assert.deepEqual(retained.snapshot.LEDGER.map(r=>r.version),versions);
  const remoteVersions=remote.LEDGER.map(r=>r.version);assert.deepEqual(remoteVersions,history,'Production baseline changed; reconcile before release');
  const require=createRequire('C:/gv_intake_recovery_20261027/package.json');for(const name of ['schemainspect','migra','client'])assert.equal(require('@pgkit/'+name+'/package.json').version,'0.6.1');
  const {PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
  const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([key])=>key.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
  const inspect=async(snapshot,schema)=>{
   const map=new Map(Object.entries(queries).map(([key,value])=>[value,snapshot[key]]));
   const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.equal(q.values.length,0);assert.ok(map.has(q.sql));return map.get(q.sql);}});
   model.one_schema(schema);for(const key of ['types','domains','materialized_views','composite_types'])model[key]=Object.fromEntries(Object.entries(model[key]).filter(([,v])=>v.schema===schema));return model;
  };
  const compare=async(left,right,schema,label)=>{
   const l=await inspect(left,schema),r=await inspect(right,schema);if(schema==='public')reconcileKnownTableColumnOrderV1(l,r);
   const diff=await Migration.create(l,r,{schema});diff.set_safety(false);diff.add_all_changes(true);fs.writeFileSync(out+'/'+label+'-'+schema+'-NEVER-EXECUTE.sql',diff.sql);assert.equal(diff.sql.trim(),'','Schema differs: '+label+'/'+schema);
  };
  assert.deepEqual(baseline.security,remoteSecurity,'Production security/definition baseline differs');await compare(baseline.snapshot,remote,'public','baseline');
  assert.deepEqual(fresh.security,retained.security,'Fresh/retained owners, ACLs or function definitions differ');
  for(const schema of ['public','grookai_square','grookai_inventory'])await compare(fresh.snapshot,retained.snapshot,schema,'fresh-retained');
  for(const lab of [artifacts+'/commerce-fresh-v2',artifacts+'/local-fresh-v1']){
   assert.equal(read(lab+'/replay-result.json').cliPrefixResetSucceeded,true);assert.equal(read(lab+'/commerce-upgrade-result-v2.json').pass,true);assert.equal(read(lab+'/anchor-upgrade-result-v3.json').pass,true);assert.equal(read(lab+'/diagnostics-upgrade-result-v3.json').pass,true);assert.equal(read(lab+'/priority-upgrade-result-v3.json').pass,true);assert.equal(read(lab+'/payment-time-upgrade-result-v3.json').pass,true);
   const isolated=read(lab+'/order-review-upgrade-result-v4.json'),clock=read(lab+'/reacquired-clock-upgrade-result-v4.json');
   assert.equal(isolated.pass,true);assert.equal(isolated.migrations,492);assert.equal(isolated.priorAllocationFieldsUnchanged,true);assert.equal(isolated.newReviewFieldsInitiallyNull,true);assert.equal(isolated.noOpPassed,true);
   assert.equal(clock.pass,true);assert.equal(clock.migrations,493);assert.equal(clock.priorAllocationFieldsUnchanged,true);assert.equal(clock.noOpPassed,true);
  }
  if(phase==='PrePush'){
   for(const target of [fresh,retained]){
    assert.equal(target.sql("select linking_enabled::text||':'||catalog_enabled::text||':'||cardinality(owner_allowlist)::text from grookai_square.controls where singleton").trim(),'false:false:0');
    assert.equal(target.sql("select enabled::text||':'||cardinality(owner_allowlist)::text from grookai_square.commerce_controls where singleton").trim(),'false:0');
   }
   const paused=read(artifacts+'/local-fresh-v1/runtime-controls-paused-v6.json');assert.equal(paused.pass,true);assert.equal(paused.claimsReleased,0);
   assert.equal(execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim(),'','PrePush requires exact committed checkout');
   assert.ok(Object.keys(manifest.runtimeSources).length>=40,'Freeze complete runtime source before PrePush');
   for(const [file,pin]of Object.entries(manifest.runtimeSources))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Runtime source changed: '+file);
   const http=read(artifacts+'/'+manifest.httpProof);assert.equal(http.pass,true);assert.equal(http.actualLocalAuth,true);assert.equal(http.concurrentOwnerWakeups,3);assert.equal(http.sourceUnchangedSinceRuntimeStart,true);
   for(const [file,pin]of Object.entries(http.sourceHashes))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Runtime execution source changed: '+file);
   assert.equal(read(artifacts+'/real-sandbox-commerce-proof-v2.json').pass,true);
   const provider=read(artifacts+'/real-sandbox-reconciliation-proof-v3.json');assert.equal(provider.pass,true);assert.equal(provider.independentUpdatedRefundPoll,true);assert.equal(provider.providerMutations,0);
   const reviewed=read(artifacts+'/'+manifest.reviewHttpProof);assert.equal(reviewed.pass,true);assert.equal(reviewed.actualLocalAuth,true);assert.equal(reviewed.sourceUnchangedSinceRuntimeStart,true);assert.equal(reviewed.stages.length,6);
   assert.ok(Object.keys(reviewed.sourceHashes).length>=90);
   for(const [file,pin]of Object.entries(reviewed.sourceHashes))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Review execution source changed: '+file);
   const authority=read(artifacts+'/'+manifest.reviewAuthorityProof);assert.equal(authority.pass,true);assert.equal(authority.rolledBack,true);assert.equal(authority.productionWrites,0);
   for(const [file,pin]of Object.entries(authority.sourceHashes))assert.equal(sha(fs.readFileSync(root+'/'+file,'utf8').replaceAll('\r\n','\n')),pin,'Authority proof source changed: '+file);
  }
  validateSquareReleaseSources(sources(),manifest);Object.assign(report,{pass:true,remoteLedger:483,targetLedger:493,pending:squareReleaseIds,remainingSqlBytes:0,securityExact:true,sanity:remote.sanity});
 }catch(error){report.error=error.message;process.exitCode=1;}finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
