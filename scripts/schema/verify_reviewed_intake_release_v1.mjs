// Exact 477 -> 478 qualification. This program has no production write operation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {reconcileKnownTableColumnOrderV1} from './column_order_reconciliation_v1.mjs';
import {captureObjectsSql} from './reviewed_intake_object_fingerprints_v1.mjs';
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const privateRoot='C:/gv_intake_recovery_private_20261027';
const work=privateRoot+'/reviewed-intake-release-v1';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
export function validateReviewedReleaseInvocation(args){
  assert.equal(args.length,2);const [phase,flag]=args;assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
  assert.match(flag,/^--out-dir=.+/);const out=path.win32.resolve(flag.slice(10)).replaceAll('\\','/');
  assert.equal(path.posix.dirname(out),privateRoot);assert.ok(path.posix.basename(out).startsWith('reviewed-intake-release-gate-'));
  return {phase,out};
}
export function validateReviewedReleaseInventory(files,expected){
  assert.equal(Object.keys(expected).length,478);assert.deepEqual(Object.keys(files).sort(),Object.keys(expected).sort());
  const versions=Object.keys(expected).sort().map(n=>{assert.match(n,/^\d{8,14}_[a-z0-9_]+\.sql$/);assert.equal(sha(files[n]),expected[n],n+' bytes changed');return n.match(/^\d+/)[0];});
  assert.equal(new Set(versions).size,478);assert.equal(versions.at(-1),'20261028020000');return versions;
}
async function main(){
  const {phase,out}=validateReviewedReleaseInvocation(process.argv.slice(2));assert.equal(root.replaceAll('\\','/'),'C:/gv_intake_release_20261028');assert.equal(fs.existsSync(out),false);
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',timeout:60000}).trim();
  assert.equal(git('status','--porcelain'),'','Exact committed qualification requires a clean checkout');const head=git('rev-parse','HEAD');
  assert.equal(fs.readFileSync(root+'/supabase/.temp/project-ref','utf8').trim(),'ycdxbpibncqcchqiihfz');
  const manifest=read(root+'/docs/audits/reviewed_intake_release_20261028/release-manifest.json');
  assert.equal(manifest.projectRef,'ycdxbpibncqcchqiihfz');assert.equal(manifest.beforeLedger,477);assert.equal(manifest.targetLedger,478);
  const files=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).map(n=>[n,fs.readFileSync(root+'/supabase/migrations/'+n)]));
  const versions=validateReviewedReleaseInventory(files,manifest.migrationSources);
  assert.equal(manifest.runtimeHashMode,'git_lf_text');
  for(const [name,hash]of Object.entries(manifest.runtimeSources))assert.equal(sha(fs.readFileSync(root+'/'+name,'utf8').replaceAll('\r\n','\n')),hash,'Runtime source changed: '+name);
  for(const [name,hash]of Object.entries(manifest.proofFiles)){assert.equal(path.posix.normalize(name),name);assert.ok(!name.startsWith('../'));assert.equal(sha(fs.readFileSync(work+'/'+name)),hash,'Qualification proof changed: '+name);}
  const frozen=read(work+'/candidate-frozen.json');assert.equal(frozen.sha256,manifest.candidateSha256);
  for(const file of ['local-fresh-478/replay-result.json','retained-upgrade-v1/upgrade-result.json','retained-upgrade-v1/verify-result.json','runtime-qualification-v1/result.json','target-comparison-v1/result.json','guards-attempt-5.json','business-attempt-4.json'])assert.equal(read(work+'/'+file).pass,true,file);
  const runtime=read(work+'/runtime-qualification-v1/result.json');assert.equal(runtime.tests.length,9);assert.equal(runtime.actualSharedAuth,true);assert.equal(runtime.crossConnectionDurability,true);assert.equal(runtime.concurrency,true);assert.equal(runtime.writesOffAfter,true);
  assert.equal(read(work+'/local-fresh-478/replay-result.json').cliResetSucceeded,true);
  const require=createRequire(root+'/package.json');for(const name of ['schemainspect','migra','client'])assert.equal(require('@pgkit/'+name+'/package.json').version,'0.6.1');
  const {PostgreSQL}=require('@pgkit/schemainspect'),{Migration}=require('@pgkit/migra');
  const queries=Object.fromEntries(Object.entries(new PostgreSQL({},'17.6')).filter(([k])=>k.endsWith('_QUERY')));assert.equal(Object.keys(queries).length,15);
  async function inspect(snapshot){const map=new Map(Object.entries(queries).map(([k,q])=>[q,snapshot[k]]));const model=await PostgreSQL.create({oneFirst:async()=>snapshot.server_version,any:async q=>{assert.equal(q.values.length,0);assert.ok(map.has(q.sql));return map.get(q.sql);}});model.one_schema('public');for(const k of ['types','domains','materialized_views','composite_types'])model[k]=Object.fromEntries(Object.entries(model[k]).filter(([,v])=>v.schema==='public'));return model;}
  const query=fs.readFileSync(root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','utf8');assert.equal(sha(query),manifest.catalogQuerySha256);
  fs.mkdirSync(out);const snapshots=[],expectedObjects=read(root+'/docs/audits/reviewed_intake_release_20261028/object-fingerprints.json');
  for(const project of ['intake-ready-replay-476-v5-20261027','reviewed-intake-fresh-478-20261028','reviewed-intake-draft-477-20261028']){
    const info=JSON.parse(execFileSync('docker',['inspect','supabase_db_'+project],{encoding:'utf8'}))[0];assert.equal(info.State.Running,true);assert.equal(info.Image,manifest.postgresImage);assert.deepEqual(Object.keys(info.NetworkSettings.Networks),[project]);
    assert.equal(JSON.parse(execFileSync('docker',['network','inspect',project],{encoding:'utf8'}))[0].Internal,true);
    const sql=q=>execFileSync('docker',['exec','-i','supabase_db_'+project,'psql','-X','-qAt','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',timeout:120000,maxBuffer:64_000_000});
    assert.equal(sql("select current_setting('max_worker_processes')").trim(),'0');const snapshot=JSON.parse(sql(query));assert.equal(snapshot.read_only,'on');
    assert.deepEqual(snapshot.LEDGER.map(v=>v.version),snapshots.length===0?versions.slice(0,-1):versions);
    if(snapshots.length>0){assert.ok(isDeepStrictEqual(JSON.parse(sql('begin read only;set local search_path=pg_catalog,public,extensions;'+captureObjectsSql()+'rollback;')),expectedObjects));assert.equal(sql("select writes_enabled::text||':'||cardinality(canary_actor_ids)::text from public.collector_intake_controls_v1 where singleton").trim(),'false:0');}
    fs.writeFileSync(out+'/'+project+'-catalog.json',JSON.stringify(snapshot));snapshots.push(snapshot);
  }
  const remoteFd=fs.openSync(out+'/remote-envelope.json','wx');let response;
  try{response=spawnSync('supabase',['db','query','--linked','--workdir',root,'--file',root+'/scripts/schema/reviewed_intake_public_catalog_v1.sql','--output','json'],{encoding:'utf8',stdio:['ignore',remoteFd,'pipe'],timeout:180000});}finally{fs.closeSync(remoteFd);}
  fs.writeFileSync(out+'/remote-stderr.log',response.stderr??'');assert.ifError(response.error);assert.equal(response.status,0);
  const raw=fs.readFileSync(out+'/remote-envelope.json','utf8');const remote=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1)).rows[0].receipt;
  assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER.map(v=>v.version),versions.slice(0,-1));assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
  for(const [name,left,right,reconcile]of [['production-baseline',snapshots[0],remote,true],['fresh-retained-target',snapshots[1],snapshots[2],false]]){
    const l=await inspect(left),r=await inspect(right);if(reconcile)reconcileKnownTableColumnOrderV1(l,r);
    const diff=await Migration.create(l,r,{schema:'public'});diff.set_safety(false);diff.add_all_changes(true);fs.writeFileSync(out+'/'+name+'-diff-never-executed.sql',diff.sql);assert.equal(diff.sql.trim(),'');assert.ok(isDeepStrictEqual(left.SECURITY,right.SECURITY),name+' security differs');
  }
  const report={at:new Date().toISOString(),pass:true,phase,head,scope:'collector_reviewed_intake_v1_exact_477_to_478',pending:['20261028020000'],candidateSha256:frozen.sha256,productionBaselineExact:true,freshAndRetainedTargetExact:true,fullSchemaDiffBytes:0,securityExact:true,securityObjects:snapshots[1].SECURITY.length,governedIntakeObjects:expectedObjects.length,realRuntimeTests:9,writesRemainOff:true,productionWrites:0};
  fs.writeFileSync(out+'/qualification.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,phase,head,pending:report.pending,fullSchemaDiffBytes:0,productionWrites:0}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
