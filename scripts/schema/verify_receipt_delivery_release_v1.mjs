// Read-only qualification of the exact receipt 428 -> 429 migration.
// Reuse evidence, never reset a retained lab or apply remote SQL here.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const receiptRelease = Object.freeze({
  root:'C:/gv_receipt_delivery_20261005',
  evidence:'C:/grookai_vault_operator_artifacts/receipt_delivery_20261005',
  target:'ycdxbpibncqcchqiihfz',
  migration:'20261005150000_vendor_receipt_delivery_v1.sql',
  migrationSha256:'b23a47b9892a5a2ccfc65f9fb81b350496ba560baaaab0ac8cd961d6eb2da84d',
  qualifiedCommit:'312a28ed5fb402ffa1e734aa2a3971d8bcc32537',
});
export function validateReceiptReleaseArguments(args) {
  assert.equal(args.length,1,'Use AuditLinkedSchema or PrePush only');
  assert.ok(['AuditLinkedSchema','PrePush'].includes(args[0]),'No apply operation or target override');
  return args[0];
}
export function validateReceiptMigrationSources(sources,baseline) {
  assert.equal(Object.keys(sources).length,429);
  assert.equal(Object.keys(baseline).length,428);
  assert.equal(new Set(Object.keys(sources).map(n=>n.split('_')[0])).size,429,'Duplicate migration timestamp');
  for(const [name,digest] of Object.entries(baseline))assert.equal(sources[name],digest,name);
  assert.deepEqual(Object.keys(sources).filter(name=>!Object.hasOwn(baseline,name)),[receiptRelease.migration]);
  assert.equal(sources[receiptRelease.migration],receiptRelease.migrationSha256);
}
export async function verifyReceiptDeliveryRelease(phase) {
  validateReceiptReleaseArguments([phase]);
  const {root,evidence,target,migration,qualifiedCommit}=receiptRelease;
  assert.equal(fs.realpathSync('.').replaceAll('\\','/').toLowerCase(),root.toLowerCase());
  const read=p=>JSON.parse(fs.readFileSync(p));
  const hash=b=>createHash('sha256').update(b).digest('hex');
  const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',windowsHide:true}).trim();
  const sources=Object.fromEntries(fs.readdirSync(root+'/supabase/migrations').filter(n=>n.endsWith('.sql')).sort().map(n=>[n,hash(fs.readFileSync(root+'/supabase/migrations/'+n))]));
  const baseDir='C:/grookai_vault_operator_artifacts/collectr_sealed_save_20261005/full-428-v3';
  const baseline=read(baseDir+'/freeze.json');
  validateReceiptMigrationSources(sources,baseline.sourceHashes);
  // Freeze all application bytes to the already-qualified source, including
  // auth, deployment guards and native UI; release tooling/docs may evolve.
  assert.equal(git('diff',qualifiedCommit,'--','apps','backend','lib','test','supabase'),'','Application changed since local qualification');
  const runtime=read(evidence+'/runtime-1791214142285/receipt.json');
  assert.equal(runtime.status,'passed');assert.equal(runtime.actualAuth,true);assert.equal(runtime.actualRPC,true);
  assert.equal(runtime.providerMocked,true);assert.equal(runtime.checks.length,8);assert.equal(runtime.cleanup,true);assert.equal(runtime.productionWrites,0);
  for(const [p,h]of Object.entries(runtime.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/'+p)),h,p);
  const http=read(evidence+'/http-1791214816023/receipt.json');
  assert.equal(http.status,'passed');assert.equal(http.actualNext,true);assert.equal(http.actualAuth,true);
  assert.equal(http.cleanup,true);assert.equal(http.actualMessagesSent,0);assert.equal(http.productionWrites,0);
  assert.equal(hash(fs.readFileSync(root+'/apps/web/src/app/api/receipts/delivery/route.ts')),http.routeHash);
  const browser=read(evidence+'/browser-1791210270347/receipt.json');
  assert.equal(browser.status,'passed');assert.equal(browser.realDOM,true);assert.equal(browser.providerMocked,true);
  assert.deepEqual(browser.viewports,[1280,390]);assert.equal(browser.checks.length,6);assert.equal(browser.productionRequests,0);
  for(const [p,h]of Object.entries(browser.sourceHashes))assert.equal(hash(fs.readFileSync(root+'/apps/web/src/lib/receipts/'+p)),h,p);
  const full=read(evidence+'/full-429-v1/replay-result.json'),upgrade=read(evidence+'/upgrade-429-v1/upgrade-result.json');
  assert.equal(full.status,'passed');assert.equal(full.migrations,429);assert.equal(full.fullReplay,true);assert.equal(full.noOpPush,true);
  assert.equal(upgrade.status,'passed');assert.equal(upgrade.migrations,429);assert.equal(upgrade.allFixtureRowsUnchanged,true);
  assert.equal(upgrade.retainedCopies,2);assert.equal(upgrade.retainedReceiptBooks,1);assert.equal(upgrade.priorReceiptFormatValidated,true);
  assert.equal(upgrade.comparison.rawBytes,0);assert.equal(upgrade.comparison.securityObjects,1175);assert.equal(upgrade.resetsAfterPopulation,0);
  if(phase==='PrePush'){
    assert.equal(git('status','--porcelain'),'','Committed clean source required');
    const main=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];
    assert.match(main,/^[a-f0-9]{40}$/);git('merge-base','--is-ancestor',main,'HEAD');
    const hook=read(evidence+'/release-normal-hook-v1.json');
    assert.equal(hook.status,'passed');assert.equal(hook.normalHooks,true);assert.equal(hook.exitCode,0);assert.equal(hook.head,git('rev-parse','HEAD'));
    const age=Date.now()-Date.parse(hook.at);assert.ok(age>=0&&age<7200000,'Fresh normal hook receipt required');
    assert.equal(hash(fs.readFileSync(hook.log)),hook.logSha256);
  }
  // Pure argument/source validation remains portable in CI; workstation-bound
  // inspection code is loaded only after the scope checks above.
  const {snapshotSql,compareSnapshots}=await import('./vendor_billing_schema_v1.mjs');
  const out=evidence+'/release-gate-'+phase+'-'+Date.now();fs.mkdirSync(out);
  const save=(name,value)=>fs.writeFileSync(out+'/'+name,JSON.stringify(value,null,2),{flag:'wx'});
  const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',windowsHide:true,timeout:60000,maxBuffer:96*1024*1024});
  const clean=read(evidence+'/full-429-v1/replayed.private.json');
  for(const mode of ['full','upgrade']){
    const lab=evidence+'/'+mode+'-429-v1',project='receipt-delivery-'+mode+'-429-v1-20261005',container='supabase_db_'+project;
    const freeze=read(lab+'/freeze.json');assert.deepEqual(freeze.sourceHashes,sources);assert.equal(freeze.project,project);
    assert.equal(hash(fs.readFileSync(lab+'/supabase/config.toml')),freeze.configSha256);
    assert.ok(!fs.existsSync(lab+'/supabase/.temp/project-ref'),'Local proof must not be linked');
    const db=JSON.parse(docker('inspect',container))[0];assert.equal(db.State.Running,true);assert.deepEqual(Object.keys(db.NetworkSettings.Networks),[project]);
    const network=JSON.parse(docker('network','inspect',project))[0];assert.equal(network.Internal,true);
    assert.equal(network.IPAM.Config[0].Subnet,mode==='full'?'10.246.44.0/24':'10.246.45.0/24');
    const sql=q=>JSON.parse(execFileSync('docker',['exec','-i',container,'psql','-U','postgres','-d','postgres','-X','-qAt','-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:96*1024*1024}));
    const state=sql("begin read only;select json_build_object('workers',current_setting('max_worker_processes'),'jobs',(select count(*) from cron.job_run_details),'deliveries',(select count(*) from vendor_receipt_deliveries),'enabled',(select email_enabled or sms_enabled from vendor_receipt_delivery_control),'users',(select count(*) from auth.users),'books',(select count(*) from vendor_receipt_books),'copies',(select count(*) from vault_item_instances));commit;");
    assert.equal(state.workers,'0');assert.equal(state.jobs,0);assert.equal(state.deliveries,0);assert.equal(state.enabled,false);
    if(mode==='full'){assert.equal(state.users,0);assert.equal(state.books,0);assert.equal(state.copies,0);}
    const current=sql(snapshotSql);assert.equal(current.read_only,'on');assert.deepEqual(current.LEDGER,Object.keys(sources).map(n=>({version:n.split('_')[0]})));
    save(mode+'-schema.private.json',current);await compareSnapshots(current,clean,{output:out+'/'+mode});
    if(mode==='upgrade'){
      const rows=sql("begin read only;select json_build_object('copies',(select json_agg(t order by id) from vault_item_instances t),'anchors',(select json_agg(t order by id) from vault_items t),'owners',(select json_agg(t order by user_id) from vault_owners t),'cards',(select json_agg(t order by id) from card_prints t),'sets',(select json_agg(to_jsonb(t)-'search_code_lower' order by id) from sets t),'receiptBooks',(select json_agg(t order by owner_id) from vendor_receipt_books t));commit;");
      assert.deepEqual(rows,read(lab+'/before-upgrade.private.json'),'Retained inventory and receipt book changed');
      assert.equal(state.copies,2);assert.equal(state.books,1);
    }
  }
  const {query,ref,dbUrl}=await import('../release/storefront_production_live_common_v1.mjs');
  assert.equal(ref,target);assert.equal(new URL(dbUrl).hostname,target+'.supabase.co');
  assert.ok(fs.readFileSync(root+'/supabase/config.toml','utf8').includes('project_id = "'+target+'"'));
  const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');save('remote.private.json',remote);
  assert.deepEqual(remote.LEDGER,Object.keys(baseline.sourceHashes).map(n=>({version:n.split('_')[0]})));
  assert.ok(remote.sanity.cards>=40000&&remote.sanity.sets>=150&&remote.sanity.traits>=5000);
  const comparison=await compareSnapshots(read(baseDir+'/replayed.private.json'),remote,{reconcile:true,output:out+'/production'});
  const toolPaths=['scripts/schema/verify_receipt_delivery_release_v1.mjs','scripts/migration_preflight_strict.ps1','scripts/release/prepare_receipt_delivery_cli_v1.mjs'];
  const result={status:'passed',at:new Date().toISOString(),phase,target,migrations:428,candidateMigrations:429,pending:[migration.split('_')[0]],sourceHashes:sources,sourceTree:git('write-tree'),commit:git('rev-parse','HEAD'),toolHashes:Object.fromEntries(toolPaths.map(p=>[p,hash(fs.readFileSync(root+'/'+p))])),comparison,baseline:out,baselineReceiptSha256:hash(fs.readFileSync(out+'/remote.private.json')),productionWrites:0,actualMessagesSent:0,retainedFixtureResets:0,applyAuthority:false,out};
  save('receipt.json',result);fs.writeFileSync(evidence+'/Release-'+phase+'.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify({status:'passed',phase,migrations:428,candidateMigrations:429,securityObjects:comparison.securityObjects,out}));
  return result;
}
if(process.argv[1]&&fs.realpathSync(process.argv[1])===fs.realpathSync(fileURLToPath(import.meta.url)))await verifyReceiptDeliveryRelease(validateReceiptReleaseArguments(process.argv.slice(2)));
