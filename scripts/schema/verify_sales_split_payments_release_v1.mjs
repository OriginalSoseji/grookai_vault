// Read-only exact428 -> split-only429 qualification. Never apply or reset here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const splitRelease=Object.freeze({
 root:'C:/gv_sales_split_payments_20261006',
 evidence:'C:/grookai_vault_operator_artifacts/sales_split_payments_20261006',
 target:'ycdxbpibncqcchqiihfz',
 migration:'20261006140000_sales_split_payments_v1.sql',
 migrationSha256:'dd0a4d9c248cc4fd834d0e0c08fba98e0902fe1a2e236d508a812eb34f51c4d1',
 deferred:'20261005150000_vendor_receipt_delivery_v1.sql',
 deferredSha256:'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d',
 qualifiedCommit:'39a275d5ab0d212ac3203a10c1775ede375f16b2',
 upstreamCommit:'ddb7c764b3d39dd74bca424f6632f2c029019e26',
});
export function validateSplitReleaseArguments(args){
 assert.equal(args.length,1,'Use AuditLinkedSchema or PrePush only');
 assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'No apply or target overrides');
 return args[0];
}
export function splitReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,430);assert.equal(Object.keys(baseline).length,428);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,430);
 for(const [name,digest]of Object.entries(baseline))assert.equal(sources[name],digest,name);
 assert.deepEqual(Object.keys(sources).filter(n=>!Object.hasOwn(baseline,n)).sort(),[splitRelease.deferred,splitRelease.migration]);
 assert.equal(sources[splitRelease.migration],splitRelease.migrationSha256);
 assert.equal(sources[splitRelease.deferred],splitRelease.deferredSha256);
 // Only the inspection package omits deferred delivery. Source history is retained.
 return Object.fromEntries(Object.entries(sources).filter(([n])=>n!==splitRelease.deferred));
}
export async function verifySalesSplitRelease(phase){
 validateSplitReleaseArguments([phase]);
 const {root,evidence,target,migration,qualifiedCommit}=splitRelease;
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
 const baselineDir='C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005/full-428-v3';
 const baseline=read(baselineDir+'/freeze.json');
 const packageHashes=splitReleaseSources(sources,baseline.sourceHashes);
 // Preserve PR603's independently reviewed sealed-label correction. Split
 // product/native/SQL bytes still match the original qualified implementation.
 const integrated='supabase/functions/vault-import-collection-v2/sealed_identity.ts';
 assert.equal(git('diff','--name-only',qualifiedCommit,'--','apps','backend','lib','test','supabase'),integrated,'Unexpected product changes');
 assert.equal(hash(fs.readFileSync(root+'/'+integrated)),hash(execFileSync('git',['show',splitRelease.upstreamCommit+':'+integrated],{cwd:root})),integrated);
 const local=read(evidence+'/LOCAL_COMPLETE.json');assert.equal(local.status,'LOCAL_CANDIDATE_COMPLETE_NOT_DEPLOYED');
 assert.equal(local.implementationCommit,qualifiedCommit);assert.equal(local.normalChecks.status,'passed');
 for(const p of [local.authenticatedRpc,local.webRuntime,local.canonicalIntakeProof])assert.equal(read(evidence+'/'+p).status,'passed');
 const runtime=read(evidence+'/RELEASE_RPC.json');assert.equal(runtime.status,'passed');assert.equal(runtime.releasePackage,true);
 assert.equal(runtime.flagsRestoredOff,true);assert.equal(runtime.productionRequests,0);assert.equal(runtime.moneyMoved,0);
 assert.equal(runtime.checks.length,6);
 const full=read(evidence+'/full-429-release-v1/replay-result.json');
 const upgrade=read(evidence+'/upgrade-429-release-v1/upgrade-result.json');
 assert.equal(full.status,'passed');assert.equal(full.migrations,429);assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);
 assert.equal(upgrade.status,'passed');assert.equal(upgrade.migrations,429);assert.equal(upgrade.allFixtureRowsUnchanged,true);
 assert.equal(upgrade.retainedCopies,2);assert.equal(upgrade.retainedReceiptBooks,1);assert.equal(upgrade.priorReceiptFormatValidated,true);
 assert.equal(upgrade.comparison.rawBytes,0);assert.equal(upgrade.resetsAfterPopulation,0);
 if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'','Clean committed source required');
  const main=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];assert.match(main,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',main,'HEAD');
  const hook=read(evidence+'/release-normal-hook-v2.json');
  assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);assert.equal(hook.exitCode,0);assert.equal(hook.head,git('rev-parse','HEAD'));
  const age=Date.now()-Date.parse(hook.at);assert.ok(age>=0&&age<7200000,'Fresh normal hooks required');
  assert.equal(hash(fs.readFileSync(hook.log)),hook.logSha256);
 }
 const {snapshotSql,compareSnapshots}=await import('./vendor_billing_schema_v1.mjs');
 const out=evidence+'/split-release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
 const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
 const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:96*1024*1024});
 const clean=read(evidence+'/full-429-release-v1/replayed.private.json');
 for(const mode of ['full','upgrade']){
  const lab=evidence+'/'+mode+'-429-release-v1',project=mode==='full'?'sales-pay-full-429-release-v1-20261006':'pay-upgrade-429-r1-20261006';
  const container='supabase_db_'+project,freeze=read(lab+'/freeze.json');
  assert.deepEqual(freeze.sourceHashes,packageHashes);assert.equal(freeze.project,project);
  assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');
  assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
  const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);
  assert.equal(network.IPAM.Config[0].Subnet,mode==='full'?'10.246.50.0/24':'10.246.51.0/24');
  const sql=q=>JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
  const state=sql("begin read only;select json_build_object('workers',current_setting('max_worker_processes'),'jobs',(select count(*) from cron.job_run_details),'deliveryAbsent',to_regclass('public.vendor_receipt_delivery_control') is null,'enabled',(select enabled from vendor_sales_payment_control),'cart',(select enabled from vendor_sales_cart_control),'trade',(select enabled from vendor_sales_trade_control),'users',(select count(*) from auth.users));rollback;");
  assert.equal(state.workers,'0');assert.equal(state.jobs,0);assert.equal(state.deliveryAbsent,true);
  assert.equal(state.enabled,false);assert.equal(state.cart,false);assert.equal(state.trade,false);assert.equal(state.users,mode==='full'?2:1);
  const current=sql(snapshotSql);assert.equal(current.read_only,'on');assert.deepEqual(current.LEDGER,Object.keys(packageHashes).map(n=>({version:n.split('_')[0]})));
  save(mode+'-schema.private.json',current);await compareSnapshots(current,clean,{output:out+'/'+mode});
  if(mode==='upgrade'){
   const rows=sql("begin read only;select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(to_jsonb(t)-'search_code_lower' order by id) from sets t),'receiptBooks',(select json_agg(t order by owner_id) from vendor_receipt_books t));rollback;");
   assert.deepEqual(rows,read(lab+'/before-upgrade.private.json'),'Retained copies or receipt book changed');
   await compareSnapshots(read(lab+'/baseline.private.json'),read(baselineDir+'/replayed.private.json'),{output:out+'/upgrade-baseline'});
  }
 }
 const {query,ref,dbUrl}=await import('../release/storefront_production_live_common_v1.mjs');
 assert.equal(ref,target);assert.equal(new URL(dbUrl).hostname,target+'.supabase.co');
 assert.ok(fs.readFileSync(root+'/supabase/config.toml','utf8').includes('project_id = "'+target+'"'));
 const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');save('remote.private.json',remote);
 assert.deepEqual(remote.LEDGER,Object.keys(baseline.sourceHashes).map(n=>({version:n.split('_')[0]})));
 assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
 const comparison=await compareSnapshots(read(baselineDir+'/replayed.private.json'),remote,{reconcile:true,output:out+'/production'});
 const toolPaths=['scripts/schema/verify_sales_split_payments_release_v1.mjs','scripts/migration_preflight_strict.ps1','scripts/release/prepare_sales_split_payments_cli_v1.mjs'];
 const result={status:'passed',at:new Date().toISOString(),phase,target,migrations:428,candidateMigrations:429,sourceMigrations:430,pending:[migration.split('_')[0]],deferred:[splitRelease.deferred],sourceHashes:sources,packageHashes,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,hash(fs.readFileSync(root+'/'+p))])),comparison,baseline:out,baselineReceiptSha256:hash(fs.readFileSync(out+'/remote.private.json')),productionWrites:0,actualMessagesSent:0,retainedFixtureResets:0,applyAuthority:false,out};
 save('receipt.json',result);fs.writeFileSync(evidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:'passed',phase,migrations:428,candidateMigrations:429,securityObjects:comparison.securityObjects,out}));return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifySalesSplitRelease(validateSplitReleaseArguments(process.argv.slice(2)));
