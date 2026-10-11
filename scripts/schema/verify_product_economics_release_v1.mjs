// Read-only exact429 -> cost-only430 qualification. Never applies or resets.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const costRelease=Object.freeze({
 root:'C:/gv_product_release_20261007',
 evidence:'C:/grookai_vault_operator_artifacts/product_economics_20261007',
 releaseEvidence:'C:/grookai_vault_operator_artifacts/product_release_20261007',
 target:'ycdxbpibncqcchqiihfz',
 migration:'20261007180000_vendor_cost_evidence_v1.sql',
 migrationSha256:'7a64b0ec767e06a6c163b5184a8f95ce8acf795da4d15888635eb864c8830199',
 deferred:'20261005150000_vendor_receipt_delivery_v1.sql',
 deferredSha256:'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d',
 qualifiedCommit:'3f3a30e88ba35519514af1b7e3e65efcc8010032',
 qualifiedProductCommit:'469503b68253a0930e4238ce097478d02b290c0e',
});
export function validateCostReleaseArguments(args){
 assert.equal(args.length,1,'Use AuditLinkedSchema or PrePush only');
 assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'No apply or target overrides');return args[0];
}
export function costReleaseSources(sources,baseline){
 assert.equal(Object.keys(sources).length,431);assert.equal(Object.keys(baseline).length,429);
 assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,431);
 for(const [name,digest]of Object.entries(baseline))assert.equal(sources[name],digest,name);
 assert.deepEqual(Object.keys(sources).filter(n=>!Object.hasOwn(baseline,n)).sort(),[costRelease.deferred,costRelease.migration]);
 assert.equal(sources[costRelease.migration],costRelease.migrationSha256);assert.equal(sources[costRelease.deferred],costRelease.deferredSha256);
 return Object.fromEntries(Object.entries(sources).filter(([n])=>n!==costRelease.deferred));
}
export async function verifyProductEconomicsRelease(phase){
 validateCostReleaseArguments([phase]);
 const {root,evidence,releaseEvidence,target,migration,qualifiedCommit,qualifiedProductCommit}=costRelease;
 assert.match(qualifiedCommit,/^[a-f0-9]{40}$/,'Bind the actual passed backend commit before use');
 assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
 const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex');
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 assert.equal(git('diff','--name-only'),'','Stage the reviewed source before the audit');
 assert.equal(git('ls-files','--others','--exclude-standard'),'','Review and stage untracked source before the audit');
 const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
 const baselineDir='C:/grookai_vault_operator_artifacts/sales_split_payments_20261006/full-429-release-v1';
 const baseline=read(baselineDir+'/freeze.json'),packageHashes=costReleaseSources(sources,baseline.sourceHashes);
 git('merge-base','--is-ancestor',qualifiedCommit,qualifiedProductCommit);
 assert.equal(git('diff','--name-only',qualifiedProductCommit,'--','apps','backend','lib','test','supabase','pubspec.yaml','pubspec.lock'),'','Combined qualification does not admit changed product source');
 assert.equal(git('diff','--name-only',qualifiedCommit,'--','backend','supabase'),'','Qualified backend and schema must remain unchanged');
 const {verifyProductReleaseEvidence}=await import('./product_release_evidence_v1.mjs');
 const productEvidence=verifyProductReleaseEvidence(packageHashes);
 assert.equal(productEvidence.commit,qualifiedProductCommit);
 for(const p of ['scripts/receipts/prove_vendor_cost_evidence_v1.mjs','scripts/schema/product_economics_lab_v1.mjs','scripts/schema/product_economics_release_lab_v1.mjs']){
  assert.equal(hash(fs.readFileSync(root+'/'+p)),hash(execFileSync('git',['show',qualifiedCommit+':'+p],{cwd:root})),p);
 }
 const local=read(evidence+'/LOCAL_COMPLETE.json');assert.equal(local.status,'LOCAL_IMPLEMENTATION_TESTED_RELEASE_GATES_PENDING');
 assert.equal(local.implementationCommit,qualifiedCommit);assert.equal(local.normalChecks.status,'passed');
 const hook=read(evidence+'/'+local.normalChecks.receipt);assert.equal(hook.status,'passed');assert.equal(hook.finalHead,qualifiedCommit);
 for(const p of [local.authenticatedRpc,local.idempotency,local.releasePackageRpc])assert.equal(read(evidence+'/'+p).status,'passed');
 const runtime=read(evidence+'/'+local.releasePackageRpc);assert.equal(runtime.releasePackage,true);
 assert.equal(runtime.flagsRestoredOff,true);assert.equal(runtime.productionWrites,0);assert.equal(runtime.checks.length,9);
 assert.ok(runtime.checks.some(v=>v.startsWith('50 oversized legacy costs')));
 if(phase==='PrePush'){
  assert.equal(git('status','--porcelain'),'','Clean committed source required');
  const main=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];assert.match(main,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',main,'HEAD');
  const latest=read(releaseEvidence+'/latest-checks.json');assert.equal(latest.status,'passed');assert.equal(latest.mode,'commit');assert.equal(latest.finalHead,git('rev-parse','HEAD'));
  const age=Date.now()-Date.parse(latest.at);assert.ok(age>=0&&age<7200000,'Fresh ordinary hooks required');
  assert.equal(hash(fs.readFileSync(latest.out+'/checks.private.log')),latest.logSha256);
 }
 const {snapshotSql,compareSnapshots}=await import('./vendor_billing_schema_v1.mjs');
 const out=releaseEvidence+'/cost-release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
 const save=(n,v)=>fs.writeFileSync(out+'/'+n,JSON.stringify(v,null,2),{flag:'wx'});
 const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:96*1024*1024});
 for(const packaged of [false,true])for(const mode of ['full','upgrade']){
  const suffix=packaged?'430-release-v2':'431-v2';
  const project=packaged?`cost-${mode}-430-r2-20261007`:`product-cost-${mode}-431-v2-20261007`;
  const lab=evidence+'/'+mode+'-'+suffix,container='supabase_db_'+project,freeze=read(lab+'/freeze.json');
  const expected=packaged?packageHashes:sources,proof=read(lab+'/'+(mode==='full'?'replay-result.json':'upgrade-result.json'));
  assert.equal(proof.status,'passed');assert.equal(proof.migrations,packaged?430:431);
  if(mode==='full')assert.ok(proof.fullReplay&&proof.noOpPush);else{assert.equal(proof.allFixtureRowsUnchanged,true);assert.equal(proof.resetsAfterPopulation,0);assert.equal(proof.retainedCopies,2);assert.equal(proof.retainedReceiptBooks,1);}
  assert.deepEqual(freeze.sourceHashes,expected);assert.equal(freeze.project,project);
  assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'));
  const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.equal(db.Config.Image,'public.ecr.aws/supabase/postgres:17.6.1.113');assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
  const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);
  assert.equal(network.IPAM.Config[0].Subnet,`10.246.${packaged?(mode==='full'?60:61):(mode==='full'?56:57)}.0/24`);
  const sql=q=>JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
  const state=sql("begin read only;select json_build_object('workers',current_setting('max_worker_processes'),'jobs',(select count(*) from cron.job_run_details),'deliveryAbsent',to_regclass('public.vendor_receipt_delivery_control') is null,'edit',(select edit_enabled from vendor_cost_evidence_control),'capture',(select capture_enabled from vendor_cost_evidence_control),'cart',(select enabled from vendor_sales_cart_control),'trade',(select enabled from vendor_sales_trade_control),'payments',(select enabled from vendor_sales_payment_control),'owners',(select json_agg(id order by id) from auth.users));rollback;");
  assert.equal(state.workers,'0');assert.equal(state.jobs,0);assert.equal(state.deliveryAbsent,packaged);for(const k of ['edit','capture','cart','trade','payments'])assert.equal(state[k],false);
  const current=sql(snapshotSql);assert.deepEqual(current.LEDGER,Object.keys(expected).map(n=>({version:n.split('_')[0]})));
  save(mode+'-'+suffix+'-schema.private.json',current);await compareSnapshots(current,read(evidence+'/full-'+suffix+'/replayed.private.json'),{output:out+'/'+mode+'-'+suffix});
  if(mode==='upgrade'){
   const rows=sql("begin read only;select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(to_jsonb(t)-'search_code_lower' order by id) from sets t),'receiptBooks',(select json_agg(t order by owner_id) from vendor_receipt_books t));rollback;");
   assert.deepEqual(rows,read(lab+'/before-upgrade.private.json'));
   if(packaged)await compareSnapshots(read(lab+'/baseline.private.json'),read(baselineDir+'/replayed.private.json'),{output:out+'/upgrade-baseline'});
  }else{
   const proofRpc=read(evidence+'/'+(packaged?local.releasePackageRpc:local.authenticatedRpc));
   assert.deepEqual(state.owners,[...proofRpc.retainedOwners,...proofRpc.fixtureOwnerIds].sort());
  }
 }
 assert.ok(fs.readFileSync(root+'/supabase/config.toml','utf8').includes('project_id = "'+target+'"'));
 const {query,ref,dbUrl}=await import('../release/storefront_production_live_common_v1.mjs');assert.equal(ref,target);assert.equal(new URL(dbUrl).hostname,target+'.supabase.co');
 const remote=(await query(snapshotSql))[0].receipt;save('remote.private.json',remote);assert.deepEqual(remote.LEDGER,Object.keys(baseline.sourceHashes).map(n=>({version:n.split('_')[0]})));
 assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
 const comparison=await compareSnapshots(read(baselineDir+'/replayed.private.json'),remote,{reconcile:true,output:out+'/production'});
 const toolPaths=['scripts/schema/verify_product_economics_release_v1.mjs','scripts/schema/product_release_evidence_v1.mjs','scripts/migration_preflight_strict.ps1','scripts/release/prepare_product_economics_cli_v1.mjs'];
 const result={status:'passed',at:new Date().toISOString(),phase,target,migrations:429,candidateMigrations:430,sourceMigrations:431,pending:[migration.split('_')[0]],deferred:[costRelease.deferred],sourceHashes:sources,packageHashes,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,hash(fs.readFileSync(root+'/'+p))])),comparison,baseline:out,baselineReceiptSha256:hash(fs.readFileSync(out+'/remote.private.json')),productionWrites:0,retainedFixtureResets:0,applyAuthority:false,out};
 result.productEvidence=productEvidence;
 save('receipt.json',result);fs.writeFileSync(releaseEvidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:'passed',phase,out}));return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifyProductEconomicsRelease(validateCostReleaseArguments(process.argv.slice(2)));
