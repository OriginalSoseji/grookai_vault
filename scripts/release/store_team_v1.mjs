// One fixed production migration through the CLI. Never executes a generated
// schema diff, rewrites migration history, enables rollout or changes grants.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {root,fixture,guard,hash,sql} from '../schema/replay_store_team_v1.mjs';
import {hashes} from '../schema/storefront_production_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,3);const mode=process.argv[2];assert.ok(['prepare','dry-run','apply','readback'].includes(mode));
const target='ycdxbpibncqcchqiihfz',audit=path.join(root,'docs/audits/store_team_v1');
const dir=path.join(root,'.local/integration/store-team-apply-v2');
const read=n=>JSON.parse(fs.readFileSync(path.join(audit,n)));
const readGate=n=>JSON.parse(fs.readFileSync(path.join(root,'.local/integration/store-team-v1',n)));
const replay=read('replay.json');assert.equal(replay.status,'passed');const name='20260927060000_vendor_store_team_v1.sql';const plan={output:{name,sha256:replay.sourceHashes[name]}};
const expected=hashes(path.join(fixture,'supabase/migrations'));assert.equal(Object.keys(expected).length,403);
assert.deepEqual(hashes(path.join(root,'supabase/migrations')),expected);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const projectResponse=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(projectResponse.ok);assert.equal((await projectResponse.json()).id,target);
const query=async text=>{
  assert.ok(/^begin\b[^;]*\bread only;/i.test(text.replace(/^--[^\n]*\n/gm,'').trim()),'Read-only transaction required');
  for(let attempt=0;;attempt++){
    try{const r=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query:text}),signal:AbortSignal.timeout(180000)});assert.ok(r.ok,`Read-only verification HTTP ${r.status}`);return await r.json();}
    catch(error){if(attempt===2)throw error;await delay(1000*(attempt+1));}
  }
};
const save=(name,v)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(v,null,2),{flag:'wx'});
const cli=(args,name)=>{
  const env={...process.env,SUPABASE_ACCESS_TOKEN:token,DO_NOT_TRACK:'1',PGOPTIONS:'-c lock_timeout=5s -c statement_timeout=120s'};
  for(const key of Object.keys(env))if(/DATABASE_URL|POSTGRES_URL|SUPABASE_DB|SUPABASE_URL/.test(key))delete env[key];
  const result=spawnSync('supabase',[...args,'--workdir',dir],{cwd:dir,env,windowsHide:true,encoding:'utf8',timeout:240000,maxBuffer:16*1024*1024});
  const log=(result.stdout??'')+(result.stderr??'');fs.writeFileSync(path.join(dir,name+'.private.log'),log,{flag:'wx'});
  assert.equal(result.status,0,`Inspect ${name} private log; do not retry a mutation without readback`);return log;
};
const retainedSql=`begin isolation level repeatable read read only;set local statement_timeout='45s';
select jsonb_build_object(
 'cards',(select count(*) from card_prints),'sets',(select count(*) from sets),'traits',(select count(*) from card_print_traits),
 'copies',(select jsonb_build_object('count',count(*),'digest',md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),''))) from vault_item_instances t),
 'profiles',(select jsonb_build_object('count',count(*),'digest',md5(coalesce(string_agg(to_jsonb(t)::text,'' order by user_id),''))) from public_profiles t),
 'entitlements',(select jsonb_build_object('count',count(*),'digest',md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),''))) from user_entitlements t)
) as receipt;rollback;`;
const controlSql=`begin read only;select jsonb_build_object('stores',(select to_jsonb(r) from vendor_store_rollout r),'batch',(select enabled from vendor_batch_intake_control),'scan',(select enabled from vendor_scan_control),'seller',(select onboarding_enabled from vendor_seller_rollout),'stock',(select reservations_enabled from vendor_stock_rollout),'orders',(select orders_enabled from vendor_orders_rollout)) as receipt;rollback;`;
if(mode==='prepare'){
  guard();assert.equal(readGate('AuditLinkedSchema.json').status,'passed');assert.ok(!fs.existsSync(dir));
  fs.mkdirSync(path.join(dir,'supabase/migrations'),{recursive:true});
  for(const name of Object.keys(expected))fs.copyFileSync(path.join(root,'supabase/migrations',name),path.join(dir,'supabase/migrations',name),fs.constants.COPYFILE_EXCL);
  fs.writeFileSync(path.join(dir,'supabase/config.toml'),`project_id = "grookai-store-team-apply-20260927"\n[db]\nmajor_version = 17\n`,{flag:'wx'});
  save('prepare-intent.json',{at:new Date().toISOString(),target,sourceHashes:expected});
  cli(['link','--project-ref',target,'--yes'],'link');
  assert.equal(fs.readFileSync(path.join(dir,'supabase/.temp/project-ref'),'utf8').trim(),target);
  console.log(JSON.stringify({status:'linked',target,schemaChanges:0}));
}else{
  assert.equal(fs.readFileSync(path.join(dir,'supabase/.temp/project-ref'),'utf8').trim(),target);
  assert.deepEqual(hashes(path.join(dir,'supabase/migrations')),expected);
  if(mode==='dry-run'||mode==='apply'){
    guard();const gate=readGate('PrePush.json');assert.equal(gate.status,'passed');assert.equal(gate.target,target);assert.ok(Date.now()-Date.parse(gate.at)<3600000);
    for(const [file,digest] of Object.entries(gate.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,file);
    assert.equal(hash(fs.readFileSync('C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md')),gate.checkpointSha256);
    const footprint=(await query(fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8')))[0].receipt;
    assert.equal(footprint.transaction_read_only,'on');
    assert.equal(hash(JSON.stringify(footprint.objects)),gate.remoteFootprintSha256,'Production schema changed; new gate required');
    const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.LEDGER.length,402);assert.deepEqual(remote.LEDGER.map(r=>r.version),Object.keys(expected).filter(n=>n!==plan.output.name).map(n=>n.split('_')[0]).sort());
    if(mode==='dry-run'){
      const log=cli(['db','push','--linked','--dry-run','--yes'],'dry-run');
      const pending=[...new Set(log.match(/\d{14}_[a-z0-9_]+\.sql/g)??[])];assert.deepEqual(pending,[plan.output.name]);
      save('dry-run.json',{at:new Date().toISOString(),target,pending,payloadSha256:plan.output.sha256,gateSha256:hash(JSON.stringify(gate))});console.log(JSON.stringify({status:'dry_run_passed',target,pending}));
    }else{
      assert.ok(!fs.existsSync(path.join(dir,'apply-intent.json')),'Apply intent consumed: inspect ledger, do not repeat');
      const dry=JSON.parse(fs.readFileSync(path.join(dir,'dry-run.json')));assert.equal(dry.payloadSha256,plan.output.sha256);assert.equal(dry.gateSha256,hash(JSON.stringify(gate)));
      save('before-retained.private.json',(await query(retainedSql))[0].receipt);
      save('before-schema.private.json',remote);
      save('before-controls.private.json',(await query(controlSql))[0].receipt);
      save('apply-intent.json',{at:new Date().toISOString(),target,payloadSha256:plan.output.sha256,gateSha256:hash(JSON.stringify(gate)),scriptSha256:hash(fs.readFileSync(new URL(import.meta.url)))});
      cli(['db','push','--linked','--yes'],'apply');
      save('cli-applied.json',{at:new Date().toISOString(),target,migration:plan.output.name});console.log(JSON.stringify({status:'cli_applied_readback_required',target}));
    }
  }else{
    assert.ok(fs.existsSync(path.join(dir,'apply-intent.json')));guard();
    const remote=(await query(snapshotSql))[0].receipt,local=JSON.parse(sql(snapshotSql));
    assert.deepEqual(remote.LEDGER,local.LEDGER);assert.equal(remote.LEDGER.length,403);
    save('after-schema.private.json',remote);
    const comparison=await compareSnapshots(remote,local,{reconcile:true,output:path.join(dir,'after-parity')});
    const retained=(await query(retainedSql))[0].receipt;save('after-retained.private.json',retained);
    assert.deepEqual(retained,JSON.parse(fs.readFileSync(path.join(dir,'before-retained.private.json'))),'Retained data changed; investigate concurrent activity before activation');
    const controls=(await query(controlSql))[0].receipt;assert.deepEqual(controls,JSON.parse(fs.readFileSync(path.join(dir,'before-controls.private.json'))));
    const team=(await query("begin read only;select jsonb_build_object('enabled',(select enabled from vendor_store_team_control),'members',(select count(*) from vendor_store_team_members),'invites',(select count(*) from vendor_store_team_invites)) receipt;rollback;"))[0].receipt;
    assert.deepEqual(team,{enabled:false,members:0,invites:0});
    const report={at:new Date().toISOString(),status:'passed',target,migrations:403,source:plan.output,comparison,retainedDataUnchanged:true,controls,grantsChanged:0,paymentsEnabled:false};
    fs.writeFileSync(path.join(audit,'production-applied.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report));
  }
}
