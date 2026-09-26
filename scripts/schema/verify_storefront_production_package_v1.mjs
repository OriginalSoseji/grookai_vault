// Fixed production read-only gate. It cannot apply SQL, change a ledger, reset
// a service, grant access, publish stores, or activate a payment feature.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root,fixture,guard,hash,sql} from './storefront_production_package_lab_v1.mjs';
import {hashes,fixture as priorFixture} from './storefront_production_lab_v1.mjs';
import {snapshotSql,compareSnapshots} from 'file:///C:/gv_store_billing_20260919/scripts/schema/vendor_billing_schema_v1.mjs';
assert.equal(process.argv.length,3);const phase=process.argv[2];assert.ok(['AuditLinkedSchema','PrePush'].includes(phase));
const target='ycdxbpibncqcchqiihfz',audit=path.join(root,'docs/audits/storefront_production_package_v1');
const read=n=>JSON.parse(fs.readFileSync(path.join(audit,n)));
const local=guard(),plan=read('consolidation.json'),replay=read('replay.json');
assert.equal(replay.status,'passed');assert.equal(replay.source.sha256,plan.output.sha256);assert.equal(replay.comparison.rawBytes,0);
assert.deepEqual(hashes(path.join(root,'supabase/migrations')),hashes(path.join(fixture,'supabase/migrations')));
const baseline=JSON.parse(fs.readFileSync(path.join(priorFixture,'preparation.json')));
const proofDirs=fs.readdirSync(priorFixture).filter(n=>n.startsWith('baseline-audit-')).map(n=>path.join(priorFixture,n)).filter(p=>fs.existsSync(path.join(p,'receipt.json')));
assert.equal(proofDirs.length,1);const original=JSON.parse(fs.readFileSync(path.join(proofDirs[0],'local.private.json')));
assert.equal(original.LEDGER.length,400);assert.deepEqual(original.LEDGER.map(r=>r.version),Object.keys(baseline.sourceHashes).map(n=>n.split('_')[0]).sort());
const output=path.join(fixture,`gate-${phase}-${new Date().toISOString().replaceAll(':','-')}`);fs.mkdirSync(output);
const token=execFileSync('pwsh',['-NoProfile','-File','C:/gv_store_billing_20260919/scripts/preview/collector_management_credential.ps1'],{encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}).trim();assert.match(token,/^sbp_/);
const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
const p=await fetch(`https://api.supabase.com/v1/projects/${target}`,{headers});assert.ok(p.ok);assert.equal((await p.json()).id,target);
const query=async text=>{const r=await fetch(`https://api.supabase.com/v1/projects/${target}/database/query`,{method:'POST',headers,body:JSON.stringify({query:text}),signal:AbortSignal.timeout(180000)});assert.ok(r.ok,`Read-only query HTTP ${r.status}`);return r.json();};
const remote=(await query(snapshotSql))[0].receipt;assert.equal(remote.read_only,'on');assert.deepEqual(remote.LEDGER,original.LEDGER);
fs.writeFileSync(path.join(output,'remote.private.json'),JSON.stringify(remote),{flag:'wx'});
const comparison=await compareSnapshots(remote,original,{reconcile:true,output:path.join(output,'baseline')});
const current=JSON.parse(sql(snapshotSql));
const expected=JSON.parse(fs.readFileSync(path.join(fixture,'after-401.private.json')));
assert.deepEqual(current.LEDGER,expected.LEDGER);await compareSnapshots(expected,current,{output:path.join(output,'local')});
const footprintSql=fs.readFileSync(path.join(root,'scripts/audits/storefront_schema_footprint_v1.sql'),'utf8');
const footprint=(await query(footprintSql))[0].receipt;
fs.writeFileSync(path.join(output,'footprint.private.json'),JSON.stringify(footprint),{flag:'wx'});
const checkpoint='C:/grookai_vault_operator_artifacts/master_index_executor_review_20260917/CHECKPOINT.md';
assert.match(fs.readFileSync(checkpoint,'utf8'),/PAUSED At User Request/);
const sourceHashes={};
for(const dir of ['apps/web/src','lib','backend/billing','backend/payments']){
  const visit=p=>{for(const e of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const n=p+'/'+e.name;if(e.isDirectory())visit(n);else sourceHashes[n]=hash(fs.readFileSync(path.join(root,n)));}};visit(dir);
}
for(const file of ['apps/web/package.json','apps/web/package-lock.json','apps/web/next.config.mjs','scripts/migration_preflight_strict.ps1','scripts/schema/verify_storefront_production_package_v1.mjs','scripts/schema/storefront_production_package_lab_v1.mjs'])sourceHashes[file]=hash(fs.readFileSync(path.join(root,file)));
if(phase==='PrePush'){
  const scan=read('scan-admission.json');assert.equal(scan.status,'passed');assert.equal(scan.checks.length,6);
  const http=fs.readdirSync(audit).filter(n=>/^http-.*\.json$/.test(n)).map(read).find(r=>r.status==='passed'&&r.emptyOffGuardPassed&&r.checks.length===18);assert.ok(http);
  const ship=fs.readdirSync(audit).filter(n=>/^shipcheck-.*\.json$/.test(n)).map(read).find(r=>r.status==='passed'&&Date.now()-Date.parse(r.at)<7200000);assert.ok(ship,'Final package normal shipcheck required');
}
assert.equal(footprint.transaction_read_only,'on');
const report={at:new Date().toISOString(),status:'passed',phase,target,pending:['20260926190000'],local,source:plan.output,sourceHashes,sourceDigest:hash(JSON.stringify(sourceHashes)),baselineSnapshotSha256:hash(JSON.stringify(remote)),remoteFootprintSha256:hash(JSON.stringify(footprint.objects)),checkpointSha256:hash(fs.readFileSync(checkpoint)),comparison,privateOutput:output,productionWrites:0};
fs.writeFileSync(path.join(output,'receipt.json'),JSON.stringify(report,null,2),{flag:'wx'});
fs.writeFileSync(path.join(audit,`${phase}.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'passed',phase,target,pending:report.pending,local:401,productionWrites:0}));
