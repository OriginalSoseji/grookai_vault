// Read-only release qualification. This module never applies migrations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync,spawnSync} from 'node:child_process';

const root=fileURLToPath(new URL('../../',import.meta.url));
const base='C:/grookai_vault_operator_artifacts/square_launch_readiness_20261122/hardening-v1/bulk-authority-v1';
const artifactRoot=base+'/current-main-1046-v1';
const sha=x=>createHash('sha256').update(x).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();

export function validateSquareReleaseInvocationV1(args){
 assert.equal(args.length,2);const [phase,arg]=args;
 assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
 assert.match(arg??'',/^--out-dir=C:\/grookai_vault_operator_artifacts\/square_launch_readiness_20261122\/hardening-v1\/bulk-authority-v1\/current-main-1046-v1\/release-gate-v1-v[1-9][0-9]*$/);
 return {phase,out:arg.slice(10)};
}
export function assertSquareReleaseInventoryV1(binding,actual){
 assert.equal(binding.baselineMigrations,524);assert.equal(binding.targetMigrations,530);
 assert.equal(Object.keys(binding.history).length,524);assert.equal(Object.keys(binding.candidates).length,6);
 assert.deepEqual(Object.keys(binding.candidates).map(f=>f.slice(0,14)),['20261124230000','20261124231000','20261124232000','20261124233000','20261124234000','20261124235000']);
 assert.deepEqual(actual,{...binding.history,...binding.candidates});
}
export function assertSquareReleaseSourceV1(proof,{head,tree,main}){
 assert.equal(proof.head,head);assert.equal(proof.tree,tree);assert.equal(proof.main,main);
 for(const name of ['preCommit','prePush']){
  assert.equal(proof.normal[name].pass,true);assert.equal(proof.normal[name].exitCode,0);
  assert.equal(proof.normal[name].tree,tree);assert.match(proof.normal[name].sha256,/^[a-f0-9]{64}$/);
 }
 assert.deepEqual(proof.hooks,{
  preCommit:'18c13d7ab2c2c402a9bdd42e303d5cd2e9967625be7c2c1e5c2e2528475419ff',
  prePush:'7f9bb8509eb0a6e805d26d35469df9fa8600b64c7c8d7944b81183ffe2aa9347'
 });
 assert.equal(proof.hosted.head,head);assert.equal(proof.hosted.tree,tree);assert.equal(proof.hosted.pass,true);
 assert.ok(proof.hosted.runs.length>=5);assert.equal(new Set(proof.hosted.runs.map(x=>x.id)).size,proof.hosted.runs.length);
 assert.ok(proof.hosted.jobs.length>=11);assert.equal(new Set(proof.hosted.jobs.map(x=>x.id)).size,proof.hosted.jobs.length);
 assert.ok(proof.hosted.jobs.every(x=>Number.isSafeInteger(x.id)&&x.id>0&&x.status==='completed'&&x.conclusion==='success'&&proof.hosted.runs.some(r=>r.id===x.run_id)));
 assert.ok(proof.hosted.runs.every(x=>Number.isSafeInteger(x.id)&&x.id>0&&x.head_sha===head&&x.status==='completed'&&x.conclusion==='success'));
 assert.equal(proof.previewDeployed,false);
}
export function assertSquareReleaseMarketV1(proof,{now=Date.now()}={}){
 assert.equal(proof.pass,true);assert.equal(proof.project,'ycdxbpibncqcchqiihfz');
 const age=now-Date.parse(proof.observedAt);assert.ok(Number.isFinite(age)&&age>=0&&age<=1800000);
 const sourceAge=now-Date.parse(proof.sourceObservedAt);assert.ok(Number.isFinite(sourceAge)&&sourceAge>=0&&sourceAge<=36*3600000);
 assert.equal(proof.regular29RepairClosed,true);assert.equal(proof.japaneseCoverageGuardUnchanged,true);
 assert.equal(proof.acceptedPublicationFresh,true);assert.equal(proof.consumerFreshPriceVerified,true);
 assert.equal(proof.naturalRefreshVerified,true);assert.equal(proof.knownWrongStampPrices,0);
 assert.match(proof.publicationId,/^[0-9a-f-]{36}$/i);assert.match(proof.sourceReadbackSha256,/^[0-9a-f]{64}$/);
}

export async function main(args=process.argv.slice(2)){
 const {phase,out}=validateSquareReleaseInvocationV1(args);assert.equal(fs.existsSync(out),false);
 const binding=read(root+'/scripts/schema/square_price_batch_candidate_v4.json');
 const actual=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(f=>/^\d+.*\.sql$/.test(f)).map(f=>[f,sha(fs.readFileSync(root+'/supabase/migrations/'+f))]));
 assertSquareReleaseInventoryV1(binding,actual);
 const release=read(root+'/scripts/schema/square_price_batch_release_v1.json');
 assert.equal(sha(fs.readFileSync(root+'/scripts/schema/square_price_batch_candidate_v4.json')),release.inventorySha256);
 assert.deepEqual(binding.candidates,release.candidates);
 for(const pin of release.proofs){assert.equal(sha(fs.readFileSync(pin.file)),pin.sha256);assert.equal(read(pin.file).pass,true,pin.file);}
 assert.equal(read(base+'/full-backlog-v1/ordinary-tail-recovery-v1/result.json').finalCounts.pending,0);
 assert.equal(read(base+'/full-backlog-v1/native-full-size-http-v1/result.json').finalCopies,100002);
 let source;
 if(phase==='PrePush'){
  source=read(artifactRoot+'/release-source-v1.json');const head=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}');
  assertSquareReleaseSourceV1(source,{head,tree,main:release.main});assert.equal(git('status','--porcelain'),'');
  assert.equal(git('ls-remote','origin','refs/heads/main').split(/\s+/)[0],release.main,'main advanced; reconcile source');
  assert.equal(git('ls-remote','origin','refs/heads/'+git('branch','--show-current')).split(/\s+/)[0],head);
  git('merge-base','--is-ancestor',release.main,head);
  const hookDir=path.resolve(root,git('rev-parse','--git-common-dir'),'hooks');
  for(const name of ['preCommit','prePush']){
   assert.equal(sha(fs.readFileSync(path.join(hookDir,name==='preCommit'?'pre-commit':'pre-push'))),source.hooks[name]);
   const p=source.normal[name],log=fs.readFileSync(p.log);assert.equal(sha(log),p.sha256);
   assert.match(log.toString(),/All tests passed!/);assert.doesNotMatch(log.toString(),/^not ok /m);
  }
  const market=read(artifactRoot+'/release-live-market-v1.json');assertSquareReleaseMarketV1(market);
  const readback=market.sourceReadback;assert.equal(sha(fs.readFileSync(readback)),market.sourceReadbackSha256);
 }
 const branch=git('branch','--show-current'),vercel=read(root+'/apps/web/vercel.json');
 assert.deepEqual(vercel.git?.deploymentEnabled,{[release.branch]:false});assert.equal(branch,release.branch);
 const baselineDir=base+'/current-main-524-v1/starting-gate-v'+String(1000+Number(out.match(/v([0-9]+)$/)[1]));
 assert.equal(fs.existsSync(baselineDir),false);
 execFileSync(process.execPath,['--use-system-ca',root+'/scripts/schema/verify_square_price_batch_baseline_v4.mjs','AuditLinkedSchema','--out-dir='+baselineDir],{cwd:root,stdio:'pipe',windowsHide:true,timeout:300000});
 const baseline=read(baselineDir+'/baseline.json');assert.equal(baseline.pass,true);assert.equal(baseline.currentLedger,524);
 fs.mkdirSync(out);const report={pass:false,phase,startedAt:new Date().toISOString(),baseline:524,target:530,productionWrites:0,productionApplyAuthority:false,baselineDir,baselineSha256:sha(fs.readFileSync(baselineDir+'/baseline.json')),candidates:binding.candidates};
 try{
  if(phase==='PrePush'){
   const require=createRequire(root+'/package.json'),env=require('dotenv').parse(fs.readFileSync('C:/grookai_best_of_game_repair_20261118/.env.local'));
   assert.equal(env.SUPABASE_URL,'https://ycdxbpibncqcchqiihfz.supabase.co');
   const url=new URL(env.SUPABASE_DB_URL);assert.equal(url.hostname,'db.ycdxbpibncqcchqiihfz.supabase.co');url.search='';
   const cli=fs.realpathSync('C:/Users/ccabr/scoop/apps/supabase/current/supabase.exe');assert.equal(sha(fs.readFileSync(cli)),release.cliSha256);
   const packet=out+'/packet';fs.mkdirSync(packet+'/supabase/migrations',{recursive:true});
   fs.copyFileSync(root+'/supabase/config.toml',packet+'/supabase/config.toml');for(const file of Object.keys(actual))fs.copyFileSync(root+'/supabase/migrations/'+file,packet+'/supabase/migrations/'+file);
   const cliEnv={...process.env};for(const k of Object.keys(cliEnv))if(/SUPABASE|^PG|DATABASE_URL|POSTGRES_URL|SECRET|TOKEN|PASSWORD|CREDENTIAL/i.test(k))delete cliEnv[k];
   Object.assign(cliEnv,{DO_NOT_TRACK:'1',PGOPTIONS:'-c default_transaction_read_only=on',PGSSLMODE:'verify-full',PGSSLROOTCERT:'C:/grookai_vault_operator_artifacts/square_sync_20261110/supabase-verified-ca-bundle.pem'});
   const result=spawnSync(cli,['db','push','--db-url',url.href,'--workdir',packet,'--dry-run','--yes'],{env:cliEnv,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:8000000});assert.ifError(result.error);
   let log=result.stdout+result.stderr;for(const secret of [env.SUPABASE_DB_URL,url.href,url.password,decodeURIComponent(url.password)].filter(Boolean))log=log.replaceAll(secret,'[REDACTED]');
   fs.writeFileSync(out+'/exact-six-dry-run.log',log,{flag:'wx'});assert.equal(result.status,0);assert.match(log,/DRY RUN/);
   report.pending=[...new Set(log.match(/\b\d{14}_[a-z0-9_]+\.sql\b/g)??[])].sort();assert.deepEqual(report.pending,Object.keys(binding.candidates));report.sourceHead=source.head;
  }
  report.pass=true;
 }catch(error){report.error=error.message;process.exitCode=1;}
 finally{report.finishedAt=new Date().toISOString();fs.writeFileSync(out+'/result.json',JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
