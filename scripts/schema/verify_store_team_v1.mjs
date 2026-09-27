// Fresh read-only production402 comparison and narrow manager release gate.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,fixture,audit,migration,guard,hash,sql} from './replay_store_team_v1.mjs';
import {hashes} from './storefront_production_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,3);const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
const target='ycdxbpibncqcchqiihfz',state=guard(),read=n=>JSON.parse(fs.readFileSync(path.join(audit,n)));
const replay=read('replay.json');assert.equal(replay.status,'passed');assert.equal(replay.comparison.rawBytes,0);
assert.deepEqual(hashes(path.join(root,'supabase/migrations')),replay.sourceHashes);assert.deepEqual(hashes(path.join(fixture,'supabase/migrations')),replay.sourceHashes);
const output=path.join(fixture,`gate-${phase}-${Date.now()}`);fs.mkdirSync(output);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const p=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(p.ok);assert.equal((await p.json()).id,target);
const query=async text=>{assert.ok(/^begin\b[^;]*\bread only;/i.test(text.replace(/^--[^\n]*\n/gm,'').trim()));const r=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query:text}),signal:AbortSignal.timeout(180000)});assert.ok(r.ok,`Read-only HTTP ${r.status}`);return r.json();};
const remote=(await query(snapshotSql))[0].receipt,baseline=JSON.parse(fs.readFileSync(path.join(JSON.parse(fs.readFileSync(path.join(root,'.local/integration/store-team-v1/baseline.json'))).output,'local.private.json')));
assert.equal(remote.LEDGER.length,402);assert.deepEqual(remote.LEDGER,baseline.LEDGER);
fs.writeFileSync(path.join(output,'remote.private.json'),JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(remote,baseline,{reconcile:true,output:path.join(output,'baseline')});
const current=JSON.parse(sql(snapshotSql)),expected=JSON.parse(fs.readFileSync(path.join(fixture,'replayed.private.json')));assert.deepEqual(current.LEDGER,expected.LEDGER);await compareSnapshots(expected,current,{output:path.join(output,'local')});
const footprint=(await query(fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8')))[0].receipt;assert.equal(footprint.transaction_read_only,'on');fs.writeFileSync(path.join(output,'footprint.private.json'),JSON.stringify(footprint),{flag:'wx'});
const sourceHashes={};
for(const folder of ['apps/web/src','lib']){const visit=p=>{for(const e of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const file=p+'/'+e.name;if(e.isDirectory())visit(file);else sourceHashes[file]=hash(fs.readFileSync(path.join(root,file)));}};visit(folder);}
for(const file of ['apps/web/package.json','apps/web/package-lock.json','apps/web/next.config.mjs','scripts/migration_preflight_strict.ps1','scripts/schema/verify_store_team_v1.mjs','scripts/schema/replay_store_team_v1.mjs','scripts/schema/store_team_lab_v1.mjs','scripts/release/store_team_v1.mjs'])sourceHashes[file]=hash(fs.readFileSync(path.join(root,file)));
const runtime=read('runtime-1790488654965.json');assert.equal(runtime.status,'passed');assert.equal(runtime.checks.length,11);assert.equal(runtime.migrationSha256,replay.sourceHashes[migration]);
const http=read('http-1790488907085.json');assert.equal(http.status,'passed');assert.equal(http.checks.length,6);for(const [file,digest] of Object.entries(http.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest);
if(phase==='PrePush'){
 const check=JSON.parse(fs.readFileSync(path.join(root,'.local/integration/store-team-v1/commit-latest.json')));
 assert.equal(check.status,'passed');assert.ok(Date.now()-Date.parse(check.at)<7200000);assert.equal(check.commit,execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim());
 for(const [file,digest] of Object.entries(check.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,file);
 const browser=read('browser.json');assert.equal(browser.status,'passed');
 for(const [file,digest] of Object.entries(browser.sourceHashes))assert.equal(hash(fs.readFileSync(path.join(root,file))),digest,file);
}
const checkpoint='C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md';assert.match(fs.readFileSync(checkpoint,'utf8'),/PAUSED At User Request/);
const report={at:new Date().toISOString(),status:'passed',phase,target,pending:['20260927060000'],migration,migrationSha256:replay.sourceHashes[migration],local:state,sourceHashes,remoteFootprintSha256:hash(JSON.stringify(footprint.objects)),checkpointSha256:hash(fs.readFileSync(checkpoint)),comparison,privateOutput:output,productionWrites:0};
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2),{flag:'wx'});fs.writeFileSync(path.join(audit,phase+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'passed',phase,target,pending:report.pending,productionWrites:0}));
